'use client';

import React from 'react';

export default function ErrorBanner() {
  return (
    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-6 shadow-lg leading-relaxed text-sm">
      <h3 className="font-bold text-base text-rose-400 mb-2">Unable to connect to Kubernetes cluster.</h3>
      <p className="mb-3 text-xs text-rose-300/80">Please verify:</p>
      <ul className="list-disc pl-5 space-y-1.5 text-xs text-rose-300/80">
        <li>Your local Kubeconfig file is correctly configured (default: /root/.kube/config)</li>
        <li>Your target cluster is currently active and reachable</li>
        <li>Your kubectl installation has sufficient cluster admin permissions</li>
      </ul>
    </div>
  );
}
