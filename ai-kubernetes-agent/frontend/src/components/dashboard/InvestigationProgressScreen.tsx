'use client';

import React from 'react';

export type StepStatus = 'pending' | 'running' | 'completed';

export interface InvestigationStep {
  name: string;
  description: string;
  status: StepStatus;
}

export interface InvestigationProgressScreenProps {
  clusterName?: string;
  namespace?: string;
  progress?: Record<string, StepStatus>;
}

export default function InvestigationProgressScreen({
  clusterName = 'docker-desktop',
  namespace = 'default',
  progress,
}: InvestigationProgressScreenProps) {
  // Master steps list matching backend progress steps
  const stepsList = [
    { name: 'Checking Pods', description: 'Querying pod configurations, states, and restart intervals.' },
    { name: 'Reading Logs', description: 'Tailing and scanning the last 100 lines of error logs.' },
    { name: 'Analyzing Events', description: 'Processing warnings and high-severity cluster events.' },
    { name: 'Inspecting Deployments', description: 'Evaluating ReplicaSets and desired workload bounds.' },
    { name: 'Checking Networking', description: 'Checking endpoint mappings and cluster IP ingress.' },
    { name: 'AI Reasoning', description: 'Aggregating collected evidence for SRE LLM diagnosis.' },
    { name: 'Root Cause Found', description: 'Generating copyable kubectl commands and explanations.' },
  ];

  // Dynamically map current status from parent's realtime progress state
  const steps: InvestigationStep[] = stepsList.map((step) => ({
    ...step,
    status: progress ? progress[step.name] || 'pending' : 'pending',
  }));

  const runningStep = steps.find((s) => s.status === 'running');
  const currentStage = runningStep?.name || 'Initializing';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto space-y-8 shadow-2xl animate-fade-in text-slate-100">
      {/* Brand Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Kubernetes Cluster Investigation
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Cluster:</span>
            <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-blue-400 border border-slate-800">{clusterName}</span>
            {namespace && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                <span className="font-semibold text-slate-300">Namespace:</span>
                <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-indigo-400 border border-slate-800">{namespace}</span>
              </>
            )}
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 self-start md:self-center px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Running Diagnostics
        </div>
      </header>

      {/* Progress Stage and Spinner Container */}
      <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Stage</span>
          <div className="font-bold text-slate-200 flex items-center gap-2 text-base">
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
            {currentStage}
          </div>
        </div>
      </div>

      {/* Vertical Steps Timeline */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Investigation Milestones
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isRunning = step.status === 'running';

            return (
              <div
                key={step.name}
                className={`relative transition-all duration-300 ${
                  isCompleted ? 'opacity-80' : isRunning ? 'opacity-100 scale-100' : 'opacity-40'
                }`}
              >
                {/* Timeline status point */}
                <span className="absolute -left-6 top-1.5 flex items-center justify-center">
                  {isCompleted && (
                    <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 text-xs flex items-center justify-center font-black">
                      ✓
                    </span>
                  )}
                  {isRunning && (
                    <span className="w-5.5 h-5.5 rounded-full bg-blue-500/10 border border-blue-500 text-blue-400 text-xs flex items-center justify-center">
                      <span className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                    </span>
                  )}
                  {step.status === 'pending' && (
                    <span className="w-5.5 h-5.5 rounded-full bg-slate-950 border border-slate-800 text-slate-500 text-xs flex items-center justify-center">
                      ⚪
                    </span>
                  )}
                </span>

                <div className="pl-3 space-y-1">
                  <h5 className={`text-sm font-bold tracking-wide ${isRunning ? 'text-blue-400' : 'text-slate-200'}`}>
                    {step.name}
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
