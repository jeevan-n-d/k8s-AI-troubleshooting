'use client';

import React from 'react';

export type ProgressStatus = 'pending' | 'running' | 'completed';

export interface InvestigationProgressProps {
  progress: Record<string, ProgressStatus>;
}

export default function InvestigationProgress({ progress }: InvestigationProgressProps) {
  return (
    <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Investigation Progress</h2>
      <ul className="space-y-3.5 text-sm">
        {Object.entries(progress).map(([step, status]) => (
          <li key={step} className="flex items-center justify-between">
            <span className={status === 'completed' ? 'text-slate-300 font-medium' : 'text-slate-400'}>
              {step}
            </span>
            <span className="flex items-center">
              {status === 'completed' && (
                <span className="text-emerald-400 font-bold">✓</span>
              )}
              {status === 'running' && (
                <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              )}
              {status === 'pending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-center text-xs text-slate-400 font-medium animate-pulse">
        Investigating Kubernetes Cluster...
      </div>
    </section>
  );
}
