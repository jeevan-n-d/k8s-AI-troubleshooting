'use client';

import React, { useState } from 'react';
import { InvestigateResponse } from '../../types';

export interface EvidencePanelProps {
  investigation: InvestigateResponse['investigation'];
  clusterDetails?: any;
  activeSubTab?: string;
}

export default function EvidencePanel({ investigation: inv, clusterDetails, activeSubTab = 'Overview' }: EvidencePanelProps) {
  // Collapsible state for sections
  const [isCollapsed, setIsCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (section: string) => {
    setIsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Log syntax highlighter parser function
  const renderHighlightedLogs = (rawLogs: string | undefined) => {
    if (!rawLogs) {
      return <p className="text-slate-500 italic text-xs">No container logs collected or available.</p>;
    }

    const lines = rawLogs.split('\n');
    return (
      <pre className="text-[11px] font-mono leading-relaxed bg-slate-950 p-4 rounded-xl overflow-x-auto select-all h-80 max-h-80 custom-scrollbar text-slate-300">
        {lines.map((line, idx) => {
          const lowerLine = line.toLowerCase();
          let lineClass = 'text-slate-300';
          if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('fatal') || lowerLine.includes('fail') || lowerLine.includes('back-off') || lowerLine.includes('crashloop')) {
            lineClass = 'text-rose-400 font-semibold bg-rose-950/20 px-1 rounded';
          } else if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
            lineClass = 'text-amber-400 bg-amber-950/20 px-1 rounded';
          } else if (lowerLine.includes('info') || lowerLine.includes('success') || lowerLine.includes('ready')) {
            lineClass = 'text-emerald-400/95';
          }
          return (
            <div key={idx} className={`${lineClass} py-0.5 border-l-2 border-slate-900 pl-2`}>
              <span className="text-slate-600 select-none mr-3 text-right inline-block w-6">{idx + 1}</span>
              {line}
            </div>
          );
        })}
      </pre>
    );
  };

  return (
    <section className="space-y-4 animate-fade-in">
      {/* Dynamic Tab Rendering of sections */}

      {/* 1. Nodes Tab */}
      {activeSubTab === 'Nodes' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Nodes')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🖥</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Cluster Nodes List</h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">{isCollapsed['Nodes'] ? '▲ Expand' : '▼ Collapse'}</span>
          </button>
          {!isCollapsed['Nodes'] && (
            clusterDetails?.nodes && clusterDetails.nodes.length > 0 ? (
              <div className="space-y-2">
                {clusterDetails.nodes.map((node: string) => (
                  <div key={node} className="flex justify-between items-center bg-slate-950/85 border border-slate-850 p-4 rounded-xl text-xs font-mono">
                    <span className="text-slate-200">{node}</span>
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-0.5 rounded-full font-sans uppercase font-bold text-[10px]">
                      Active Node
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic text-center py-4">No active nodes discovered or loaded in SRE context.</div>
            )
          )}
        </div>
      )}

      {/* 2. Namespaces Tab */}
      {activeSubTab === 'Namespaces' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Namespaces')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">📁</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Cluster Namespaces</h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">{isCollapsed['Namespaces'] ? '▲ Expand' : '▼ Collapse'}</span>
          </button>
          {!isCollapsed['Namespaces'] && (
            clusterDetails?.namespaces && clusterDetails.namespaces.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {clusterDetails.namespaces.map((ns: string) => (
                  <span key={ns} className="px-3 py-1.5 bg-slate-950 border border-slate-855 text-slate-300 rounded-lg font-mono text-[11px]">
                    {ns}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic text-center py-4">No namespaces loaded in context.</div>
            )
          )}
        </div>
      )}

      {/* 3. Pods Tab */}
      {activeSubTab === 'Pods' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Pods')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-teal-400">☸</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Pods Inspection</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full ${
                inv.pods.healthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {inv.pods.healthy ? 'All Healthy' : 'Problematic Pods'}
              </span>
              <span className="text-xs text-slate-500 font-bold">{isCollapsed['Pods'] ? '▲' : '▼'}</span>
            </div>
          </button>
          {!isCollapsed['Pods'] && (
            <>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 border border-slate-855 rounded-lg p-3">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Total Mapped Pods</span>
                  <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">{inv.pods.total_pods} pods</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-855 rounded-lg p-3">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Healthy Status Ratio</span>
                  <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">
                    {inv.pods.healthy_pods_count} / {inv.pods.total_pods} OK
                  </span>
                </div>
              </div>

              {inv.pods.problematic_pods && inv.pods.problematic_pods.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Unhealthy Pod Specifications</span>
                  {inv.pods.problematic_pods.map((pod: any, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl text-xs hover:border-slate-800 transition-colors space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          <span className="font-bold font-mono text-slate-200">{pod.name}</span>
                        </div>
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                          {pod.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950 p-2.5 rounded border border-slate-900 text-slate-400">
                        <div>Phase: <span className="text-slate-200 font-mono font-bold">{pod.phase}</span></div>
                        <div>Restarts: <span className="text-rose-400 font-mono font-bold">{pod.restarts ?? 0}</span></div>
                        <div className="truncate">Node: <span className="text-blue-400 font-mono font-bold">{pod.node || 'Unknown'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center text-xs">
                  All active workloads and pods in the selected context are running healthy.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 4. Deployments Tab */}
      {activeSubTab === 'Deployments' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Deployments')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400">📦</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Deployments Check</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full ${
                inv.deployments.healthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {inv.deployments.healthy ? 'Healthy' : 'Issues Found'}
              </span>
              <span className="text-xs text-slate-500 font-bold">{isCollapsed['Deployments'] ? '▲' : '▼'}</span>
            </div>
          </button>
          {!isCollapsed['Deployments'] && (
            <>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 border border-slate-855 rounded-lg p-3">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Deployments Checked</span>
                  <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">{inv.deployments.all_deployments_count} Total</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-855 rounded-lg p-3">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Unhealthy Deployments</span>
                  <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">
                    {inv.deployments.unhealthy_deployments?.length || 0} discovered
                  </span>
                </div>
              </div>

              {inv.deployments.unhealthy_deployments && inv.deployments.unhealthy_deployments.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {inv.deployments.unhealthy_deployments.map((dep: any, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-lg text-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300 font-mono text-sm">{dep.name}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full">Replica Mismatch</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950 p-2.5 rounded border border-slate-900 text-slate-400 font-mono">
                        <div>Desired: <span className="text-slate-200 font-bold">{dep.replicas_desired}</span></div>
                        <div>Available: <span className="text-slate-200 font-bold">{dep.replicas_available}</span></div>
                        <div>Unavailable: <span className="text-rose-400 font-bold">{dep.replicas_unavailable}</span></div>
                      </div>
                      <div className="text-[11px] bg-slate-950 p-2.5 rounded border border-slate-900 text-slate-400 truncate">
                        Image: <span className="text-blue-400 font-mono font-semibold">{dep.image || 'Unknown'}</span>
                      </div>
                      {dep.failures && dep.failures.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-900">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block mb-1">Failure Exceptions</span>
                          <ul className="list-disc pl-4 text-[10px] text-rose-300 space-y-1 font-mono">
                            {dep.failures.map((f: string, idx: number) => (
                              <li key={idx}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center text-xs">
                  All active deployments have desired replica counts satisfying availability checks.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 5. Services Tab */}
      {activeSubTab === 'Services' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Services')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🌐</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Services Details</h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">{isCollapsed['Services'] ? '▲ Expand' : '▼ Collapse'}</span>
          </button>
          {!isCollapsed['Services'] && (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {inv.network.services && inv.network.services.length > 0 ? (
                inv.network.services.map((svc, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-300 font-mono block text-sm">{svc.service_name}</span>
                      <span className="text-slate-500 font-mono text-[10px]">Cluster IP: {svc.cluster_ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${svc.selector_configured ? 'bg-slate-900 border border-slate-850 text-slate-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {svc.selector_configured ? 'Selector OK' : 'No Selector'}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${svc.has_active_endpoints ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {svc.has_active_endpoints ? 'Endpoints Ready' : '0 Endpoints'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic p-2 text-center">No active cluster services discovered.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Networking Tab */}
      {activeSubTab === 'Networking' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Networking')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-teal-400">🔌</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Networking & Monitored Ports</h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">{isCollapsed['Networking'] ? '▲ Expand' : '▼ Collapse'}</span>
          </button>
          {!isCollapsed['Networking'] && (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {inv.network.services && inv.network.services.length > 0 ? (
                inv.network.services.map((svc, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/80 border border-slate-850/60 p-3.5 rounded-lg text-xs">
                    <span className="font-mono text-slate-300 font-bold">{svc.service_name}</span>
                    <div className="flex gap-2">
                      {svc.ports?.map((p: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-850 text-blue-400 rounded-md font-mono text-[10px] font-bold">
                          Port: {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic p-2 text-center">No service endpoints found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. Storage Tab */}
      {activeSubTab === 'Storage' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Storage')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">🖴</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Storage Volumes Analysis</h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">{isCollapsed['Storage'] ? '▲ Expand' : '▼ Collapse'}</span>
          </button>
          {!isCollapsed['Storage'] && (
            <div className="bg-slate-950 border border-slate-855 p-6 rounded-xl text-center text-xs py-8 text-slate-400">
              No storage data collected during this SRE investigation session.
            </div>
          )}
        </div>
      )}

      {/* 8. Events Tab */}
      {activeSubTab === 'Events' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Events')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-rose-400">⚠</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Events Analysis</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full ${
                inv.events.total_warnings_detected > 0 ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)]' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {inv.events.total_warnings_detected} Warnings
              </span>
              <span className="text-xs text-slate-500 font-bold">{isCollapsed['Events'] ? '▲' : '▼'}</span>
            </div>
          </button>
          {!isCollapsed['Events'] && (
            inv.events.warning_events && inv.events.warning_events.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {inv.events.warning_events.map((evt: any, i) => (
                  <div key={i} className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="font-bold text-slate-300 font-mono">{evt.object_name}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({evt.object_kind})</span>
                      </div>
                      <span className="font-bold font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-855">
                        Count: {evt.count}
                      </span>
                    </div>
                    <div className="text-slate-400 leading-relaxed font-semibold pl-4 border-l border-amber-500/30">
                      Reason: <span className="text-amber-400">{evt.reason}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px] font-mono pl-4">{evt.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center text-xs">
                SRE scan reports 0 warning or critical events in the specified cluster context namespace.
              </div>
            )
          )}
        </div>
      )}

      {/* 9. Logs Tab */}
      {activeSubTab === 'Logs' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <button
            onClick={() => toggleCollapse('Logs')}
            className="w-full flex items-center justify-between border-b border-slate-800 pb-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400">📜</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Container Logs</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full ${
                inv.logs.critical_findings && inv.logs.critical_findings.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {inv.logs.critical_findings?.length || 0} Findings
              </span>
              <span className="text-xs text-slate-500 font-bold">{isCollapsed['Logs'] ? '▲' : '▼'}</span>
            </div>
          </button>
          {!isCollapsed['Logs'] && (
            <>
              {/* Critical Findings overview if any exist */}
              {inv.logs.critical_findings && inv.logs.critical_findings.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">Critical Findings Scan</span>
                  <ul className="list-disc pl-4 text-xs text-rose-300 space-y-1 leading-relaxed">
                    {inv.logs.critical_findings.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Logs terminal box */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Tail Stream: {inv.logs.pod_name || 'Unavailable'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Lines collected: {inv.logs.lines_collected || 0}</span>
                </div>
                {renderHighlightedLogs(inv.logs.raw_logs_snippet || inv.logs.error)}
              </div>
            </>
          )}
        </div>
      )}

    </section>
  );
}
