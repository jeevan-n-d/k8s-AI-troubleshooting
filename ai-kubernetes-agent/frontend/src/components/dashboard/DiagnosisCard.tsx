'use client';

import React, { useState } from 'react';
import { DiagnosisInfo, InvestigateResponse } from '../../types';

export interface DiagnosisCardProps {
  diagnosis: DiagnosisInfo;
  investigation?: InvestigateResponse['investigation'];
  activeSubTab?: string;
  healthScore?: number | null;
}

export default function DiagnosisCard({ diagnosis, investigation, activeSubTab = 'Overview', healthScore: backendHealthScore }: DiagnosisCardProps) {
  const [copied, setCopied] = useState(false);

  // Dynamic calculations based on live diagnosis data
  const hasProblematicPods = investigation?.pods?.problematic_pods && investigation.pods.problematic_pods.length > 0;
  const totalPods = investigation?.pods?.total_pods || 0;
  const healthyPodsCount = investigation?.pods?.healthy_pods_count || 0;

  // Calculate Health Score: use backend provided score if available, otherwise pod health ratio if available, otherwise null
  let healthScore: number | null = null;
  if (backendHealthScore !== undefined && backendHealthScore !== null) {
    healthScore = backendHealthScore;
  } else if (totalPods > 0) {
    healthScore = Math.round((healthyPodsCount / totalPods) * 100);
  }

  // Determine Severity level based on root cause words or health score
  const rootCauseLower = diagnosis.root_cause.toLowerCase();
  let severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';
  if ((healthScore !== null && healthScore < 50) || rootCauseLower.includes('crashloopbackoff') || rootCauseLower.includes('failed') || rootCauseLower.includes('error')) {
    severity = 'CRITICAL';
  } else if ((healthScore !== null && healthScore < 85) || rootCauseLower.includes('warning') || rootCauseLower.includes('pending') || rootCauseLower.includes('unhealthy')) {
    severity = 'WARNING';
  }

  // Handle Kubectl Copy trigger
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnosis.kubectl_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Only render if activeSubTab is 'Overview' or 'AI Report'
  if (activeSubTab !== 'Overview' && activeSubTab !== 'AI Report') {
    return null;
  }

  return (
    <article className="space-y-8 animate-fade-in transition-all duration-300">
      {/* SECTION A: Overview Tab (Overall Health, Severity, Root Cause) */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score Circular Gauge with glowing rings */}
            {healthScore !== null ? (
              <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl flex items-center justify-between group hover:border-blue-500/30 hover:shadow-blue-500/5 transition-all duration-300 transform hover:scale-[1.01]">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Cluster Health</span>
                  <h4 className="text-lg font-extrabold text-slate-100">Index Score</h4>
                  <p className="text-[10px] text-slate-400">Ratio of operational workloads.</p>
                </div>
                <div className="relative flex items-center justify-center w-20 h-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-current text-slate-800/60"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className={`stroke-current ${
                        severity === 'CRITICAL'
                          ? 'text-rose-500 shadow-lg'
                          : severity === 'WARNING'
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      } transition-all duration-1000 ease-out`}
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - healthScore / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold font-mono text-slate-150">
                    {healthScore}%
                  </span>
                </div>
              </div>
            ) : null}

            {/* Severity Indicator Card */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300 transform hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Incident Severity</span>
                  <h4 className="text-lg font-extrabold text-slate-100">Impact Level</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed font-mono italic">
                No severity data available
              </p>
            </div>

            {/* AI Agent Reasoning Confidence Card */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300 transform hover:scale-[1.01]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Agent Assurance</span>
                <h4 className="text-lg font-extrabold text-slate-100 font-sans">Diagnosis Confidence</h4>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-black text-blue-400 font-mono tracking-tight">{diagnosis.confidence}%</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">accuracy rate</span>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-4 border border-slate-855">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  style={{ width: `${diagnosis.confidence}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* Root Cause Card */}
          <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden group hover:border-slate-750 transition-all duration-300">
            <div className="h-1.5 w-full bg-blue-500"></div>
            <div className="p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">SRE AI Root-Cause Statement</span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-200 mt-1 leading-snug">
                    {diagnosis.root_cause}
                  </h3>
                </div>
              </div>
            </div>
          </section>

          {/* Expanded AI SRE Reasoning Breakdown */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: SRE Explanations and Playbook */}
            <div className="space-y-6">
              {/* Technical Explanation */}
              {diagnosis.explanation && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="text-blue-400">🔍</span> Technical Explanation
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-850 whitespace-pre-wrap">
                    {diagnosis.explanation}
                  </div>
                </div>
              )}

              {/* Remediation Playbook */}
              {diagnosis.fix && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="text-emerald-400">⚡</span> Suggested SRE Remediation Playbook
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-850 whitespace-pre-wrap">
                    {diagnosis.fix}
                  </div>
                </div>
              )}

              {/* Terminal commands to execute */}
              {diagnosis.kubectl_command && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="text-teal-400">💻</span> SRE Command Execute
                    </h4>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1 border text-[10px] font-bold rounded-lg transition-all active:scale-95 ${
                        copied
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-slate-850 leading-relaxed">
                    {diagnosis.kubectl_command}
                  </pre>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Kubernetes Live Evidence Summary */}
            <div className="space-y-6">
              {/* Pods Status */}
              {investigation?.pods && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="text-teal-400">☸</span> Pod Workloads Evidence
                    </span>
                    <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      investigation.pods.healthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {investigation.pods.healthy ? 'Healthy' : 'Issues Found'}
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl font-mono text-slate-300">
                      Total: {investigation.pods.total_pods}
                    </div>
                    <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl font-mono text-slate-300">
                      Healthy: {investigation.pods.healthy_pods_count}
                    </div>
                  </div>
                  {investigation.pods.problematic_pods && investigation.pods.problematic_pods.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-850/60">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Problematic Pods</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {investigation.pods.problematic_pods.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-850/45 font-mono">
                            <span className="text-slate-300 truncate max-w-[150px]">{p.name}</span>
                            <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 text-[9px] font-bold font-sans">{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deployments Status */}
              {investigation?.deployments && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="text-amber-400">📦</span> Deployment Workloads
                    </span>
                    <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      investigation.deployments.healthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {investigation.deployments.healthy ? 'Healthy' : 'Issues Found'}
                    </span>
                  </h4>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl font-mono text-slate-300 text-[11px]">
                    Total Checked Deployments: {investigation.deployments.all_deployments_count}
                  </div>
                  {investigation.deployments.unhealthy_deployments && investigation.deployments.unhealthy_deployments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-850/60">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Unhealthy Deployments</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {investigation.deployments.unhealthy_deployments.map((d: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850/45 font-mono text-[11px] text-slate-300 flex justify-between">
                            <span>{d.name}</span>
                            <span className="text-rose-400 text-[10px]">Desired: {d.replicas_desired} / Avail: {d.replicas_available}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Events & Warning Log Summary */}
              {investigation?.events && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="text-rose-400">⚠️</span> Warning Events Log
                    </span>
                    <span className="font-mono text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {investigation.events.total_warnings_detected} warnings
                    </span>
                  </h4>
                  {investigation.events.warning_events && investigation.events.warning_events.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {investigation.events.warning_events.slice(0, 3).map((evt: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/40 font-mono text-[10px] text-slate-300 leading-relaxed">
                          <div className="flex justify-between font-bold text-amber-400 text-[9px] uppercase tracking-wider mb-1">
                            <span>{evt.reason}</span>
                            <span>{evt.object_kind}</span>
                          </div>
                          {evt.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No warning events logged in current context.</p>
                  )}
                </div>
              )}

              {/* Pod logs available snippet preview */}
              {investigation?.logs?.raw_logs_snippet && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="text-indigo-400">📜</span> Problematic Container Log Preview
                  </h4>
                  <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-[10px] rounded-xl overflow-x-auto border border-slate-850 max-h-36 leading-relaxed select-all">
                    {investigation.logs.raw_logs_snippet}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* SECTION B: AI Report Tab (Explanation, Fix, Kubectl Command) */}
      {activeSubTab === 'AI Report' && (
        <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
          {/* Technical Explanation */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Technical Explanation
            </h4>
            <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-850 rounded-xl p-5 leading-relaxed whitespace-pre-wrap font-mono">
              {diagnosis.explanation}
            </div>
          </div>

          {/* Recommended Action steps */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Suggested SRE Remediation Playbook
            </h4>
            <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-850 rounded-xl p-5 leading-relaxed whitespace-pre-wrap leading-relaxed">
              {diagnosis.fix}
            </div>
          </div>

          {/* Interactive Shell Terminal emulator */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <svg className="w-4.5 h-4.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Action Terminal Command
              </span>
            </h4>
            <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-slate-750">
              {/* Terminal top chrome bar */}
              <div className="bg-slate-900/80 px-4 py-2 flex items-center justify-between border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  <span className="text-[10px] text-slate-500 font-mono ml-2">sre-shell -- kubectl</span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1 border text-[10px] font-bold rounded-lg transition-all active:scale-95 ${
                    copied
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <span className="text-emerald-400">✓</span> Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {/* Command text block */}
              <pre className="p-5 overflow-x-auto text-[11px] text-emerald-400 font-mono leading-relaxed select-all">
                {diagnosis.kubectl_command}
              </pre>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
