'use client';

import React, { useState, useEffect } from 'react';
import { fetchNamespaces, fetchDeployments, fetchPods } from '../../services/api';

export type InvestigationScope = 'cluster' | 'namespace' | 'deployment' | 'pod';

export interface InvestigationConfigurationProps {
  onInvestigate: (namespace: string, cluster?: string) => void;
  isPending: boolean;
  selectedContext: string;
}

export default function InvestigationConfiguration({
  onInvestigate,
  isPending,
  selectedContext,
}: InvestigationConfigurationProps) {
  const [scope, setScope] = useState<InvestigationScope>('cluster');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedDeployment, setSelectedDeployment] = useState<string>('');
  const [selectedPod, setSelectedPod] = useState<string>('');

  // Dropdown live options lists
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [deployments, setDeployments] = useState<string[]>([]);
  const [pods, setPods] = useState<string[]>([]);

  // Loading states
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [loadingPods, setLoadingPods] = useState(false);

  // 1. Fetch namespaces on mount or context change
  useEffect(() => {
    if (!selectedContext) return;

    async function loadNamespaces() {
      try {
        setLoadingNamespaces(true);
        // Explicitly pass the selected cluster context to fetchNamespaces
        const res = await fetchNamespaces(selectedContext);
        if (res && res.status === 'success' && res.data?.items) {
          const list = res.data.items.map((item: any) => item.metadata?.name).filter(Boolean);
          setNamespaces(list);
        } else {
          setNamespaces([]);
        }
      } catch (err) {
        console.error('Failed to load namespaces:', err);
        setNamespaces([]);
      } finally {
        setLoadingNamespaces(false);
      }
    }
    loadNamespaces();
  }, [selectedContext]);

  // 2. Fetch deployments and pods when selected namespace changes
  useEffect(() => {
    if (!selectedNamespace) {
      setDeployments([]);
      setPods([]);
      return;
    }

    async function loadDeploymentsAndPods() {
      if (scope === 'deployment' || scope === 'pod') {
        try {
          setLoadingDeployments(true);
          // Explicitly pass the selected cluster context to fetchDeployments
          const res = await fetchDeployments(selectedNamespace, selectedContext);
          if (res && res.status === 'success' && res.data?.items) {
            const list = res.data.items.map((item: any) => item.metadata?.name).filter(Boolean);
            setDeployments(list);
          } else {
            setDeployments([]);
          }
        } catch (err) {
          console.error('Failed to load deployments:', err);
          setDeployments([]);
        } finally {
          setLoadingDeployments(false);
        }
      }

      if (scope === 'pod') {
        try {
          setLoadingPods(true);
          // Explicitly pass the selected cluster context to fetchPods
          const res = await fetchPods(selectedNamespace, selectedContext);
          if (res && res.status === 'success' && res.data?.items) {
            const list = res.data.items.map((item: any) => item.metadata?.name).filter(Boolean);
            setPods(list);
          } else {
            setPods([]);
          }
        } catch (err) {
          console.error('Failed to load pods:', err);
          setPods([]);
        } finally {
          setLoadingPods(false);
        }
      }
    }

    loadDeploymentsAndPods();
  }, [selectedNamespace, scope, selectedContext]);

  // Rules for disabling selectors
  const isNamespaceDisabled = scope === 'cluster';
  const isDeploymentDisabled = scope === 'cluster' || scope === 'namespace' || !selectedNamespace;
  const isPodDisabled = scope === 'cluster' || scope === 'namespace' || scope === 'deployment' || !selectedDeployment;

  // Validation rules for primary button
  const isButtonDisabled =
    !selectedContext ||
    isPending ||
    (scope === 'namespace' && !selectedNamespace) ||
    (scope === 'deployment' && (!selectedNamespace || !selectedDeployment)) ||
    (scope === 'pod' && (!selectedNamespace || !selectedDeployment || !selectedPod));

  const handleTriggerAction = () => {
    if (isButtonDisabled) return;
    // Pass the target namespace and context
    onInvestigate(selectedNamespace || 'default', selectedContext);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-10 shadow-2xl w-full space-y-8 text-left">
      <header className="border-b border-slate-800 pb-5">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span className="text-blue-500">⚙</span> SRE Investigation Planner
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Configure diagnostic scoping targets using live cluster APIs before execution.
        </p>
      </header>

      {/* Target scope radios */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Target Scope Selection
        </h4>
        <div className="bg-slate-950/85 p-1 rounded-xl grid grid-cols-4 gap-1.5 w-full border border-slate-850/40 overflow-hidden">
          {(['cluster', 'namespace', 'deployment', 'pod'] as InvestigationScope[]).map((option) => {
            const isSelected = scope === option;
            const labelMap: Record<InvestigationScope, string> = {
              cluster: 'Entire Cluster',
              namespace: 'Namespace',
              deployment: 'Deployment',
              pod: 'Pod',
            };

            return (
              <label
                key={option}
                className={`w-full flex items-center justify-center py-2.5 px-1 rounded-lg border text-center cursor-pointer transition-all duration-200 select-none min-w-0 ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm'
                    : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="investigation-scope"
                  value={option}
                  checked={isSelected}
                  onChange={() => {
                    setScope(option);
                    if (option === 'cluster') {
                      setSelectedNamespace('');
                      setSelectedDeployment('');
                      setSelectedPod('');
                    } else if (option === 'namespace') {
                      setSelectedDeployment('');
                      setSelectedPod('');
                    } else if (option === 'deployment') {
                      setSelectedPod('');
                    }
                  }}
                  className="sr-only"
                />
                <span className="text-[10px] sm:text-xs font-bold truncate leading-none">{labelMap[option]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Inputs selectors list */}
      <div className="space-y-6 pt-6 border-t border-slate-800/60">
        {/* Namespace Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Namespace Selector</span>
            {loadingNamespaces && <span className="text-[10px] text-blue-400 animate-pulse font-bold uppercase tracking-wider">Loading live list...</span>}
          </label>
          <select
            disabled={isNamespaceDisabled}
            value={selectedNamespace}
            onChange={(e) => {
              setSelectedNamespace(e.target.value);
              setSelectedDeployment('');
              setSelectedPod('');
            }}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">-- Select Target Namespace --</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        </div>

        {/* Deployment Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Deployment Selector</span>
            {loadingDeployments && <span className="text-[10px] text-blue-400 animate-pulse font-bold uppercase tracking-wider">Loading live list...</span>}
          </label>
          <select
            disabled={isDeploymentDisabled}
            value={selectedDeployment}
            onChange={(e) => {
              setSelectedDeployment(e.target.value);
              setSelectedPod('');
            }}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">-- Select Target Deployment --</option>
            {deployments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        {/* Pod Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Pod Selector</span>
            {loadingPods && <span className="text-[10px] text-blue-400 animate-pulse font-bold uppercase tracking-wider">Loading live list...</span>}
          </label>
          <select
            disabled={isPodDisabled}
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">-- Select Target Pod --</option>
            {pods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Investigation Action trigger button */}
      <div className="pt-6 border-t border-slate-800/60">
        <button
          type="button"
          onClick={handleTriggerAction}
          disabled={isButtonDisabled}
          className={`w-full font-bold py-4 px-6 rounded-xl transition-all shadow-md text-sm select-none ${
            isButtonDisabled
              ? 'bg-blue-800/10 text-blue-400/30 border border-blue-500/10 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white border border-transparent cursor-pointer active:scale-95'
          }`}
        >
          {isPending ? 'Investigation in progress...' : 'Investigate Cluster'}
        </button>
      </div>
    </section>
  );
}
