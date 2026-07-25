'use client';

import React from 'react';

export interface InvestigationPanelProps {
  onInvestigate: () => void;
  isPending: boolean;
  health: { status?: string } | undefined;
  healthLoading: boolean;
}

export default function InvestigationPanel({
  onInvestigate,
  isPending,
  health,
  healthLoading,
}: InvestigationPanelProps) {
  return (
    <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 text-center">Diagnostics</h2>

      <button
        onClick={onInvestigate}
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md shadow-blue-900/30"
      >
        {isPending ? 'Investigating...' : 'Investigate Cluster'}
      </button>

      <div className="flex items-center justify-center gap-2 text-sm mt-4">
        <span className="text-slate-400">System Status:</span>
        {healthLoading ? (
          <span className="text-yellow-400 animate-pulse">Checking...</span>
        ) : health?.status === 'healthy' ? (
          <span className="text-emerald-400 font-medium">Ready</span>
        ) : (
          <span className="text-rose-400 font-medium">Offline</span>
        )}
      </div>
    </section>
  );
}
