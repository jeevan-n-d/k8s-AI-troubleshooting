'use client';

import React, { useState } from 'react';
import DiagnosisCard from './DiagnosisCard';
import EvidencePanel from './EvidencePanel';

export interface HistoryItem {
  id: string | number;
  root_cause: string;
  confidence: number;
  namespace: string;
  timestamp: string;
  [key: string]: any;
}

export interface InvestigationHistoryProps {
  history: HistoryItem[];
}

export default function InvestigationHistory({ history }: InvestigationHistoryProps) {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('Overview');

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

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Previous Investigations</h2>
      {history.length > 0 ? (
        <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
          {history.map((hist) => (
            <div
              key={hist.id}
              onClick={() => {
                setSelectedReport(hist);
                setActiveSubTab('Overview');
              }}
              className="p-3 bg-slate-900/50 hover:bg-slate-900/80 rounded-lg border border-slate-700/50 hover:border-blue-500/30 cursor-pointer text-xs transition-all duration-200"
            >
              <div className="flex justify-between font-bold text-slate-200 mb-1">
                <span className="text-rose-400 truncate max-w-[150px]">{hist.root_cause}</span>
                <span>{hist.confidence}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Namespace: {hist.namespace}</span>
                <span>{new Date(hist.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-slate-900/35 border border-slate-700/40 rounded-xl space-y-2">
          <span className="text-2xl block text-slate-600">📜</span>
          <h4 className="text-xs font-bold text-slate-400">No Audits Recorded</h4>
          <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto">
            No investigations available. Run your first Kubernetes investigation to generate AI-powered SRE diagnostics.
          </p>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-scale-up text-left">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-blue-500">📜</span> Archived SRE Diagnostic Report
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Cluster: {selectedReport.cluster || 'Unknown'} | Context: {selectedReport.context || 'Unknown'} | Namespace: {selectedReport.namespace}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl hover:bg-slate-800 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="px-6 border-b border-slate-800 bg-slate-950/10 flex items-center gap-1 overflow-x-auto scrollbar-none">
              {subTabs.map((tab) => {
                const isSelected = activeSubTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveSubTab(tab.name)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Report Canvas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <DiagnosisCard
                diagnosis={{
                  root_cause: selectedReport.root_cause,
                  explanation: selectedReport.explanation,
                  fix: selectedReport.fix,
                  kubectl_command: selectedReport.kubectl_command,
                  confidence: selectedReport.confidence,
                }}
                investigation={selectedReport.evidence}
                activeSubTab={activeSubTab}
                healthScore={selectedReport.evidence?.health_score}
              />
              {selectedReport.evidence && (
                <EvidencePanel
                  investigation={selectedReport.evidence}
                  activeSubTab={activeSubTab}
                  clusterDetails={{
                    namespaces: [selectedReport.namespace],
                    nodes: [selectedReport.cluster].filter(Boolean),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
