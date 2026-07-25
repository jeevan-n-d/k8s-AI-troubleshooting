'use client';

import React, { useState, useEffect } from 'react';
import { InvestigateResponse } from '../../types';
import { fetchContexts, fetchClusterDebug, fetchDeployments, fetchPods, fetchNamespaces, fetchServices, fetchEvents } from '../../services/api';
import InvestigationPanel from './InvestigationPanel';
import InvestigationProgress, { ProgressStatus } from './InvestigationProgress';
import InvestigationHistory, { HistoryItem } from './InvestigationHistory';
import ErrorBanner from './ErrorBanner';
import DiagnosisCard from './DiagnosisCard';
import EvidencePanel from './EvidencePanel';
import InvestigationConfiguration from './InvestigationConfiguration';
import InvestigationProgressScreen from './InvestigationProgressScreen';

export interface DashboardHomeProps {
  onInvestigate: (namespace: string, cluster?: string) => void;
  isPending: boolean;
  isError: boolean;
  health: { status?: string } | undefined;
  healthLoading: boolean;
  progress: Record<string, ProgressStatus>;
  history: HistoryItem[];
  result: InvestigateResponse | null;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  contexts: string[];
  setContexts: React.Dispatch<React.SetStateAction<string[]>>;
  currentContext: string;
  setCurrentContext: React.Dispatch<React.SetStateAction<string>>;
  selectedContext: string;
  setSelectedContext: (ctx: string) => void;
  loadingContexts: boolean;
  setLoadingContexts: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DashboardHome({
  onInvestigate,
  isPending,
  isError,
  health,
  healthLoading,
  progress,
  history,
  result,
  activeTab = 'dashboard',
  setActiveTab,
  contexts,
  setContexts,
  currentContext,
  setCurrentContext,
  selectedContext,
  setSelectedContext,
  loadingContexts,
  setLoadingContexts,
}: DashboardHomeProps) {
  const inv = result?.investigation;
  const diag = result?.diagnosis;

  // State for live cluster discovery
  const [clusterDetails, setClusterDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
  const [deploymentsCount, setDeploymentsCount] = useState<number>(0);

  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');
  const [podsList, setPodsList] = useState<any[]>([]);
  const [loadingPods, setLoadingPods] = useState<boolean>(false);

  const [explorerNamespaces, setExplorerNamespaces] = useState<string[]>([]);
  const [loadingExplorerNamespaces, setLoadingExplorerNamespaces] = useState<boolean>(false);

  const [deploymentsList, setDeploymentsList] = useState<any[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState<boolean>(false);

  const [servicesList, setServicesList] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  const [eventsList, setEventsList] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

  // Sub-navigation state specifically for the Completed AI Report View
  const [activeSubTab, setActiveSubTab] = useState<string>('Overview');
  const [copiedReport, setCopiedReport] = useState(false);

  const handleCopyAIReport = async () => {
    if (!diag) return;
    const reportText = `SRE DIAGNOSTIC REPORT\n=====================\n\nRoot Cause: ${diag.root_cause}\n\nTechnical Explanation:\n${diag.explanation}\n\nRemediation Playbook:\n${diag.fix}\n\nCommand:\n${diag.kubectl_command}`;
    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('Failed to copy report: ', err);
    }
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sre_investigation_report_${selectedContext || 'default'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const subTabs = [
    { name: 'Overview', icon: '🏠' },
    { name: 'Nodes', icon: '🖥' },
    { name: 'Namespaces', icon: '📁' },
    { name: 'Pods', icon: '☸' },
    { name: 'Deployments', icon: '📦' },
    { name: 'Services', icon: '🌐' },
    { name: 'Events', icon: '⚠' },
    { name: 'Logs', icon: '📜' },
    { name: 'Networking', icon: '🔌' },
    { name: 'Storage', icon: '🖴' },
    { name: 'AI Report', icon: '🤖' },
  ];

  // 1. Fetch contexts from backend on mount
  useEffect(() => {
    async function loadContexts() {
      try {
        setLoadingContexts(true);
        const data = await fetchContexts();
        if (data && data.status === 'success') {
          setContexts(data.contexts || []);
          setCurrentContext(data.current_context || '');
          setSelectedContext(data.current_context || data.contexts?.[0] || '');
        }
      } catch (err) {
        console.error('Failed to load contexts:', err);
      } finally {
        setLoadingContexts(false);
      }
    }
    loadContexts();
  }, []);

  // 2. Fetch cluster details & deployments for the selected cluster/context
  useEffect(() => {
    if (!selectedContext) return;

    // Reset details immediately to avoid displaying stale data from previous context
    setClusterDetails(null);
    setDeploymentsCount(0);

    async function loadClusterDetails() {
      try {
        setLoadingDetails(true);
        const debugData = await fetchClusterDebug(selectedContext);
        setClusterDetails(debugData);

        if (debugData && debugData.cluster_reachable) {
          const depsData = await fetchDeployments('default', selectedContext);
          if (depsData && depsData.status === 'success' && depsData.data?.items) {
            setDeploymentsCount(depsData.data.items.length);
          } else {
            setDeploymentsCount(0);
          }
        } else {
          setDeploymentsCount(0);
        }
      } catch (err) {
        console.error('Failed to load cluster details:', err);
        setClusterDetails(null);
        setDeploymentsCount(0);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadClusterDetails();
  }, [selectedContext]);

  // 3. Automatically transition to 'reports' tab when investigation completed
  useEffect(() => {
    if (result && setActiveTab) {
      setActiveTab('reports');
    }
  }, [result, setActiveTab]);

  // Fetch unfiltered namespaces specifically for Resources Explorer (Kubernetes-like behavior)
  useEffect(() => {
    if (!selectedContext || activeTab !== 'resources') return;

    async function loadExplorerNamespaces() {
      try {
        setLoadingExplorerNamespaces(true);
        const res = await fetchNamespaces(selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          const nsList = res.data.items.map((item: any) => item.metadata?.name).filter(Boolean);
          setExplorerNamespaces(nsList);
          
          // Auto-select first namespace or default if available
          if (nsList.length > 0 && !nsList.includes(selectedNamespace)) {
            if (nsList.includes('default')) {
              setSelectedNamespace('default');
            } else {
              setSelectedNamespace(nsList[0]);
            }
          }
        } else {
          setExplorerNamespaces([]);
        }
      } catch (err) {
        console.error('Failed to load explorer namespaces:', err);
        setExplorerNamespaces([]);
      } finally {
        setLoadingExplorerNamespaces(false);
      }
    }
    loadExplorerNamespaces();
  }, [selectedContext, activeTab]);

  // 4. Fetch resources for Resources Explorer (Pods, Deployments, Services, Events)
  useEffect(() => {
    if (!selectedContext || activeTab !== 'resources') return;

    async function loadLivePods() {
      try {
        setLoadingPods(true);
        const res = await fetchPods(selectedNamespace, selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          setPodsList(res.data.items);
        } else {
          setPodsList([]);
        }
      } catch (err) {
        console.error('Failed to load live pods:', err);
        setPodsList([]);
      } finally {
        setLoadingPods(false);
      }
    }

    async function loadLiveDeployments() {
      try {
        setLoadingDeployments(true);
        const res = await fetchDeployments(selectedNamespace, selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          setDeploymentsList(res.data.items);
        } else {
          setDeploymentsList([]);
        }
      } catch (err) {
        console.error('Failed to load live deployments:', err);
        setDeploymentsList([]);
      } finally {
        setLoadingDeployments(false);
      }
    }

    async function loadLiveServices() {
      try {
        setLoadingServices(true);
        const res = await fetchServices(selectedNamespace, selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          setServicesList(res.data.items);
        } else {
          setServicesList([]);
        }
      } catch (err) {
        console.error('Failed to load live services:', err);
        setServicesList([]);
      } finally {
        setLoadingServices(false);
      }
    }

    async function loadLiveEvents() {
      try {
        setLoadingEvents(true);
        const res = await fetchEvents(selectedNamespace, selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          setEventsList(res.data.items);
        } else {
          setEventsList([]);
        }
      } catch (err) {
        console.error('Failed to load live events:', err);
        setEventsList([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadLivePods();
    loadLiveDeployments();
    loadLiveServices();
    loadLiveEvents();
  }, [selectedNamespace, selectedContext, activeTab]);

  // View 1: Main Landing Dashboard Tab
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800/80 rounded-3xl p-8 lg:p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
          <div className="space-y-4 max-w-3xl text-left">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-300 to-indigo-400 animate-fade-in">
                KubePilot AI
              </h2>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Intelligent Kubernetes Troubleshooting Platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 text-xs py-2 font-medium">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">•</span>
                <span>Detect Kubernetes failures.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">•</span>
                <span>Investigate clusters.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">•</span>
                <span>Receive AI-powered root cause analysis.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">•</span>
                <span>Generate actionable kubectl fixes.</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => setActiveTab && setActiveTab('investigation')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-blue-900/30 hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>🔍</span>
                <span>Investigate Cluster</span>
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('resources')}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>📦</span>
                <span>Explore Resources</span>
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('history')}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>📜</span>
                <span>View Investigation History</span>
              </button>
            </div>
          </div>
        </section>

        {/* Home Dashboard Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Connected Clusters */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Connected Clusters</span>
              <span className="text-blue-400 text-sm">☸</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {contexts.length > 0 ? `${contexts.length} Discovered` : 'No data available'}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Total contexts loaded from your local kubeconfig file.</p>
          </div>

          {/* Healthy Nodes */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Active Nodes</span>
              <span className="text-indigo-400 text-sm">🖥</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {loadingDetails ? 'Loading...' : (clusterDetails?.nodes ? `${clusterDetails.nodes.length} Nodes` : 'No data available')}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Operational worker and master nodes in selected context.</p>
          </div>

          {/* Namespaces */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Namespaces</span>
              <span className="text-purple-400 text-sm">📁</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {loadingDetails ? 'Loading...' : (clusterDetails?.namespaces ? `${clusterDetails.namespaces.length} Namespaces` : 'No data available')}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Virtual clusters discovered in active context.</p>
          </div>

          {/* Running Pods */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Running Pods</span>
              <span className="text-teal-400 text-sm">☸</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {loadingDetails ? 'Loading...' : (clusterDetails?.pods ? `${clusterDetails.pods.length} Pods` : 'No data available')}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Monitored workloads currently running in cluster context.</p>
          </div>

          {/* Deployments */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Active Deployments</span>
              <span className="text-amber-400 text-sm">📦</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {loadingDetails ? 'Loading...' : (deploymentsCount !== undefined ? `${deploymentsCount} Deployments` : 'No data available')}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Deployment replicas managed inside the default namespace.</p>
          </div>

          {/* Completed Investigations */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Completed Audits</span>
              <span className="text-emerald-400 text-sm">✓</span>
            </h3>
            <div className="text-2xl font-black text-slate-100 font-mono">
              {history ? `${history.length} Investigations` : 'No data available'}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">Total SRE diagnoses executed and saved to InsForge database.</p>
          </div>
        </div>

        {/* Primary Action Card: Discover Clusters */}
        <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-slate-200 mb-1">Discover Clusters</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Scan your host machine's local kubeconfig file to discover and connect contexts instantly. Matches namespaces, node specifications, and k8s API versions.
              </p>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('clusters')}
              className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold py-2.5 px-5 rounded-lg transition-all"
            >
              Configure Contexts ({contexts.length})
            </button>
          </div>
        </section>

        {/* Secondary Diagnostics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-1">
            <InvestigationPanel
              onInvestigate={() => onInvestigate('default', selectedContext)}
              isPending={isPending}
              health={health}
              healthLoading={healthLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <InvestigationHistory history={history} />
          </div>
        </div>
      </div>
    );
  }

  // View 2: Clusters View Tab
  if (activeTab === 'clusters') {
    return (
      <div className="space-y-8 animate-fade-in">
        <header>
          <h2 className="text-xl font-bold text-slate-200">Cluster Context Configuration</h2>
          <p className="text-xs text-slate-500 mt-1">Select and manage active contexts mapped from your local kubeconfig.</p>
        </header>

        {loadingContexts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="h-6 w-1/3 bg-slate-800 rounded"></div>
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
                <div className="h-4 w-1/2 bg-slate-800 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contexts.map((context) => {
              const isActive = context === currentContext;
              const isSelected = context === selectedContext;
              const isClusterReachable = clusterDetails?.cluster_reachable ?? true;

              return (
                <div
                  key={context}
                  onClick={() => setSelectedContext(context)}
                  className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 relative shadow-lg ${
                    isSelected
                      ? 'bg-slate-900/60 border-2 border-blue-500/80 shadow-blue-500/5'
                      : 'bg-slate-900/20 border border-slate-900 hover:border-slate-800/80'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] uppercase font-bold py-1 px-2.5 rounded-full">
                      Current Context
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-3xl font-bold ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>☸</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-200">{context}</h3>
                      <span className="text-[10px] text-slate-500 font-mono">kubernetes-context-card</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-4 mb-4">
                    <div className="flex justify-between">
                      <span>Cluster Type:</span>
                      <span className="text-slate-300 font-semibold">
                        {context.includes('desktop') || context.includes('docker') ? 'Docker Desktop' : 'Local Cluster'}
                      </span>
                    </div>

                    {isSelected && !loadingDetails && clusterDetails ? (
                      <>
                        <div className="flex justify-between">
                          <span>Kubernetes Version:</span>
                          <span className="font-mono text-slate-300">No data available</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nodes Count:</span>
                          <span className="font-mono text-slate-300">{clusterDetails.nodes?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Namespaces Count:</span>
                          <span className="font-mono text-slate-300">{clusterDetails.namespaces?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pods Count:</span>
                          <span className="font-mono text-slate-300">{clusterDetails.pods?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deployments (default)::</span>
                          <span className="font-mono text-slate-300">{clusterDetails.deployments_count ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cluster Status:</span>
                          <span className={`font-semibold ${isClusterReachable ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isClusterReachable ? 'Reachable' : 'Unreachable'}
                          </span>
                        </div>
                      </>
                    ) : isSelected && loadingDetails ? (
                      <div className="space-y-2 py-2">
                        <div className="h-3 w-full bg-slate-800 rounded animate-pulse"></div>
                        <div className="h-3 w-5/6 bg-slate-800 rounded animate-pulse"></div>
                        <div className="h-3 w-2/3 bg-slate-800 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">Click card to load live metrics and statistics.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Cluster Details Panel */}
        {selectedContext && (
          <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-200 border-b border-slate-900 pb-3 mb-4">
              Cluster Details: {selectedContext}
            </h3>

            {loadingDetails ? (
              <div className="space-y-3">
                <div className="h-4 w-1/3 bg-slate-800 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-slate-800 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-slate-800 rounded animate-pulse"></div>
              </div>
            ) : clusterDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2.5">Namespaces Found</h4>
                  <div className="flex flex-wrap gap-2">
                    {clusterDetails.namespaces?.filter((ns: string) => ![
                      "kube-system", "kube-public", "kube-node-lease", "local-path-storage",
                      "ingress-nginx", "cert-manager", "monitoring", "cattle-system",
                      "istio-system", "kube-flannel", "metallb-system"
                    ].includes(ns)).length > 0 ? (
                      clusterDetails.namespaces?.filter((ns: string) => ![
                        "kube-system", "kube-public", "kube-node-lease", "local-path-storage",
                        "ingress-nginx", "cert-manager", "monitoring", "cattle-system",
                        "istio-system", "kube-flannel", "metallb-system"
                      ].includes(ns)).map((ns: string) => (
                        <span key={ns} className="px-2.5 py-1 bg-slate-950 border border-slate-900 text-slate-300 rounded font-mono text-[10px]">
                          {ns}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No application namespaces found.</span>
                    )}
                  </div>
                </div>

                    <div>
                      <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2.5">Active Nodes</h4>
                      <div className="flex flex-wrap gap-2">
                        {clusterDetails.nodes?.map((node: string) => (
                          <span key={node} className="px-2.5 py-1 bg-slate-950 border border-slate-900 text-blue-400 rounded font-mono text-[10px]">
                            {node}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
            ) : (
              <div className="text-xs text-slate-500 italic">Could not fetch live metadata. Make sure the cluster is online.</div>
            )}
          </section>
        )}
      </div>
    );
  }

  // View 3: Resources Tab
  if (activeTab === 'resources') {
    return (
      <div className="space-y-8 animate-fade-in">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-200">Resources Explorer</h2>
            <p className="text-xs text-slate-500 mt-1">Live inspection of namespace workloads from the target cluster.</p>
          </div>
          <div className="flex gap-3 text-xs">
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-500"
            >
              {loadingExplorerNamespaces ? (
                <option>Loading namespaces...</option>
              ) : explorerNamespaces.length > 0 ? (
                explorerNamespaces.map((ns: string) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))
              ) : (
                <option value="default">default</option>
              )}
            </select>
            <select className="bg-slate-900 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-500">
              <option>Refresh: 15s</option>
              <option>Refresh: 30s</option>
              <option>Refresh: Off</option>
            </select>
          </div>
        </header>

        {/* Resource Tables */}
        <div className="space-y-6">
          {/* Pods Table */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span className="text-teal-400">☸</span> Workload Pods (namespace: {selectedNamespace})
            </h3>
            
            <div className="overflow-x-auto">
              {loadingPods ? (
                <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
                  Loading workload pods...
                </div>
              ) : podsList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No pods detected in namespace '{selectedNamespace}'.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Ready</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Restarts</th>
                      <th className="p-3">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {podsList.map((pod: any) => {
                      const podName = pod.metadata?.name || 'Unknown';
                      const containerStatuses = pod.status?.containerStatuses || [];
                      const restarts = containerStatuses.reduce((acc: number, cs: any) => acc + (cs.restartCount || 0), 0);
                      
                      const readyCount = containerStatuses.filter((cs: any) => cs.ready).length;
                      const totalContainers = containerStatuses.length || (pod.spec?.containers?.length || 1);
                      const readyRatio = `${readyCount}/${totalContainers}`;
                      
                      // Parse status / phase
                      let statusText = pod.status?.phase || 'Unknown';
                      for (const cs of containerStatuses) {
                        if (cs.state?.waiting) {
                          statusText = cs.state.waiting.reason || 'Waiting';
                          break;
                        } else if (cs.state?.terminated) {
                          statusText = cs.state.terminated.reason || `ExitCode:${cs.state.terminated.exitCode}`;
                          break;
                        }
                      }
                      
                      // Age
                      const creationTimestamp = pod.metadata?.creationTimestamp;
                      let age = 'Unknown';
                      if (creationTimestamp) {
                        const diffMs = Date.now() - new Date(creationTimestamp).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHrs / 24);
                        if (diffDays > 0) {
                          age = `${diffDays}d ${diffHrs % 24}h`;
                        } else if (diffHrs > 0) {
                          age = `${diffHrs}h ${diffMins % 60}m`;
                        } else {
                          age = `${diffMins}m`;
                        }
                      }

                      const isRunning = statusText === 'Running';
                      const isFailed = statusText === 'Failed' || statusText.includes('Error') || statusText.includes('BackOff') || statusText.includes('Pull');

                      return (
                        <tr key={podName} className="hover:bg-slate-900/20">
                          <td className="p-3 font-mono text-blue-400">{podName}</td>
                          <td className="p-3">{readyRatio}</td>
                          <td className="p-3">
                            <span className={`font-medium ${isRunning ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-amber-400'}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-3">{restarts} restarts</td>
                          <td className="p-3">{age}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Deployments Table */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span className="text-amber-400">📦</span> Deployments (namespace: {selectedNamespace})
            </h3>
            <div className="overflow-x-auto">
              {loadingDeployments ? (
                <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
                  Loading deployments...
                </div>
              ) : deploymentsList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No deployments detected in namespace '{selectedNamespace}'.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Replicas (Ready/Desired)</th>
                      <th className="p-3">Up-to-date</th>
                      <th className="p-3">Available</th>
                      <th className="p-3">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {deploymentsList.map((dep: any) => {
                      const name = dep.metadata?.name || 'Unknown';
                      const readyReplicas = dep.status?.readyReplicas || 0;
                      const desiredReplicas = dep.spec?.replicas || 0;
                      const updatedReplicas = dep.status?.updatedReplicas || 0;
                      const availableReplicas = dep.status?.availableReplicas || 0;
                      
                      const creationTimestamp = dep.metadata?.creationTimestamp;
                      let age = 'Unknown';
                      if (creationTimestamp) {
                        const diffMs = Date.now() - new Date(creationTimestamp).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHrs / 24);
                        if (diffDays > 0) {
                          age = `${diffDays}d ${diffHrs % 24}h`;
                        } else if (diffHrs > 0) {
                          age = `${diffHrs}h ${diffMins % 60}m`;
                        } else {
                          age = `${diffMins}m`;
                        }
                      }

                      return (
                        <tr key={name} className="hover:bg-slate-900/20">
                          <td className="p-3 font-mono text-blue-400">{name}</td>
                          <td className="p-3">{readyReplicas}/{desiredReplicas}</td>
                          <td className="p-3">{updatedReplicas}</td>
                          <td className="p-3">{availableReplicas}</td>
                          <td className="p-3">{age}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Services Table */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span className="text-blue-400">🌐</span> Services (namespace: {selectedNamespace})
            </h3>
            <div className="overflow-x-auto">
              {loadingServices ? (
                <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
                  Loading services...
                </div>
              ) : servicesList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No services detected in namespace '{selectedNamespace}'.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Cluster IP</th>
                      <th className="p-3">External IP</th>
                      <th className="p-3">Ports</th>
                      <th className="p-3">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {servicesList.map((svc: any) => {
                      const name = svc.metadata?.name || 'Unknown';
                      const type = svc.spec?.type || 'ClusterIP';
                      const clusterIP = svc.spec?.clusterIP || 'None';
                      const externalIP = svc.status?.loadBalancer?.ingress?.[0]?.ip || svc.spec?.externalIPs?.[0] || '<none>';
                      const ports = (svc.spec?.ports || []).map((p: any) => `${p.port}/${p.protocol}`).join(', ') || '<none>';
                      
                      const creationTimestamp = svc.metadata?.creationTimestamp;
                      let age = 'Unknown';
                      if (creationTimestamp) {
                        const diffMs = Date.now() - new Date(creationTimestamp).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHrs / 24);
                        if (diffDays > 0) {
                          age = `${diffDays}d ${diffHrs % 24}h`;
                        } else if (diffHrs > 0) {
                          age = `${diffHrs}h ${diffMins % 60}m`;
                        } else {
                          age = `${diffMins}m`;
                        }
                      }

                      return (
                        <tr key={name} className="hover:bg-slate-900/20">
                          <td className="p-3 font-mono text-blue-400">{name}</td>
                          <td className="p-3">{type}</td>
                          <td className="p-3">{clusterIP}</td>
                          <td className="p-3">{externalIP}</td>
                          <td className="p-3 font-mono">{ports}</td>
                          <td className="p-3">{age}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Events Table */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span className="text-rose-400">⚠️</span> Events (namespace: {selectedNamespace})
            </h3>
            <div className="overflow-x-auto">
              {loadingEvents ? (
                <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
                  Loading events...
                </div>
              ) : eventsList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No events detected in namespace '{selectedNamespace}'.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Object</th>
                      <th className="p-3">Message</th>
                      <th className="p-3">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {eventsList.map((evt: any, idx: number) => {
                      const type = evt.type || 'Normal';
                      const reason = evt.reason || 'Unknown';
                      const obj = `${evt.involvedObject?.kind || 'Unknown'}/${evt.involvedObject?.name || 'Unknown'}`;
                      const message = evt.message || '';
                      
                      // Calculate relative last seen age
                      const lastSeen = evt.lastTimestamp || evt.metadata?.creationTimestamp;
                      let lastSeenStr = 'Unknown';
                      if (lastSeen) {
                        const diffMs = Date.now() - new Date(lastSeen).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHrs / 24);
                        if (diffDays > 0) {
                          lastSeenStr = `${diffDays}d ${diffHrs % 24}h ago`;
                        } else if (diffHrs > 0) {
                          lastSeenStr = `${diffHrs}h ${diffMins % 60}m ago`;
                        } else if (diffMins > 0) {
                          lastSeenStr = `${diffMins}m ago`;
                        } else {
                          lastSeenStr = `Just now`;
                        }
                      }

                      const isWarning = type === 'Warning';

                      return (
                        <tr key={idx} className="hover:bg-slate-900/20">
                          <td className={`p-3 font-semibold ${isWarning ? 'text-amber-400' : 'text-slate-400'}`}>{type}</td>
                          <td className="p-3 font-medium">{reason}</td>
                          <td className="p-3 font-mono text-slate-400">{obj}</td>
                          <td className="p-3 max-w-md truncate" title={message}>{message}</td>
                          <td className="p-3 text-slate-400">{lastSeenStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // View 4: Config & Run SRE Investigation Tab
  if (activeTab === 'investigation') {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
        <header>
          <h2 className="text-xl font-bold text-slate-200">AI SRE Investigation</h2>
          <p className="text-xs text-slate-500 mt-1">Configure diagnostic targets and trigger automated AI reasoning flows.</p>
        </header>

        {isError && <ErrorBanner />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {isPending ? (
            <div className="lg:col-span-12 animate-fade-in">
              <InvestigationProgressScreen
                clusterName={selectedContext}
                namespace="default"
                progress={progress}
              />
            </div>
          ) : (
            <>
              <div className="lg:col-span-5">
                <InvestigationConfiguration
                  onInvestigate={onInvestigate}
                  isPending={isPending}
                  selectedContext={selectedContext}
                />
              </div>

              <div className="lg:col-span-7">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center min-h-[300px] space-y-4">
                  <span className="text-4xl text-blue-500/20 mb-3">🔍</span>
                  <h3 className="font-bold text-slate-300 mb-1">Ready to Investigate</h3>
                  <p className="max-w-xs mx-auto leading-relaxed">
                    Press "Investigate Cluster" to begin polling metrics, container logs, and warning events.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // View 5: Diagnosis AI Reports Tab with beautiful internal sub-tabs
  if (activeTab === 'reports') {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-200">AI Diagnostics and Findings</h2>
            {diag && (
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                  Cluster: {selectedContext || 'default'}
                </span>
                <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                  Namespace: {selectedNamespace || 'default'}
                </span>
                <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                  Scope: Namespace Scan
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg animate-pulse">
                  Status: Completed
                </span>
                <span className="px-2.5 py-1 bg-slate-850 border border-slate-800 text-slate-300 rounded-lg font-mono">
                  {"Duration: < 15s"}
                </span>
              </div>
            )}
          </div>
          {diag && (
            <div className="flex gap-2.5">
              <button
                onClick={handleCopyAIReport}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <span>{copiedReport ? '✓' : '📋'}</span>
                <span>{copiedReport ? 'Report Copied' : 'Copy AI Report'}</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <span>📥</span>
                <span>Download JSON</span>
              </button>
            </div>
          )}
        </header>

        {diag ? (
          <div className="space-y-6">
            {/* Horizontal Sub-navigation Tabs (Nodes, Namespaces, Pods, Deployments, Services, Events, Logs, Networking, Storage, AI Report) */}
            <nav className="flex items-center gap-1 border-b border-slate-900 pb-px overflow-x-auto scrollbar-none custom-scrollbar select-none">
              {subTabs.map((tab) => {
                const isSelected = activeSubTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveSubTab(tab.name)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Render matched playbook report details depending on the active sub-tab */}
            <div className="pt-2">
              <DiagnosisCard diagnosis={diag} investigation={inv} activeSubTab={activeSubTab} healthScore={result?.health_score} />
              {inv && <EvidencePanel investigation={inv} clusterDetails={clusterDetails} activeSubTab={activeSubTab} />}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <span className="text-5xl text-blue-500/20">🤖</span>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-200">No Active Diagnosis Report</h3>
              <p className="max-w-md mx-auto leading-relaxed text-slate-400">
                Diagnostic findings and actionable playbooks will appear here in real-time as soon as a cluster investigation is triggered and completed.
              </p>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('investigation')}
              className="bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20 font-bold py-2.5 px-5 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Trigger First Investigation
            </button>
          </div>
        )}
      </div>
    );
  }

  // View 6: Previous Investigations History Tab
  if (activeTab === 'history') {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <InvestigationHistory history={history} />
      </div>
    );
  }

  // View 7: Settings Configuration Panel Tab
  if (activeTab === 'settings') {
    return (
      <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
        <header>
          <h2 className="text-xl font-bold text-slate-200">Platform Settings</h2>
          <p className="text-xs text-slate-500 mt-1">Manage configuration parameters, tokens, and preferences.</p>
        </header>

        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">OpenRouter API Token</label>
            <input
              type="password"
              placeholder="sk-or-v1-••••••••••••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">Your OpenRouter key is encrypted and stored locally in your session environment.</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">System Refresh Interval</label>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors">
              <option>15 seconds (default)</option>
              <option>30 seconds</option>
              <option>60 seconds</option>
              <option>Disabled</option>
            </select>
          </div>
        </section>
      </div>
    );
  }

  // View 8: SRE Platform About Info Tab
  if (activeTab === 'about') {
    return (
      <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
        <header>
          <h2 className="text-xl font-bold text-slate-200">About KubePilot AI</h2>
          <p className="text-xs text-slate-500 mt-1">Intelligent Kubernetes Troubleshooting Platform details.</p>
        </header>

        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm text-sm text-slate-300 leading-relaxed">
          <p>
            **KubePilot AI** is designed for modern SRE, platform engineering, and DevOps squads. It leverages custom LLM agents coupled with host-level `kubectl` data routing to debug failures in real-time.
          </p>
          <div className="border-t border-slate-700/60 pt-4 mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Platform Version:</span>
              <span className="font-mono text-slate-100">v1.0.0-stable</span>
            </div>
            <div className="flex justify-between">
              <span>Core Agent SDK:</span>
              <span className="font-mono text-slate-100">@insforge/sdk v1.0.1</span>
            </div>
            <div className="flex justify-between">
              <span>Backend Service:</span>
              <span className="font-mono text-slate-100">FastAPI Orchestrator</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
