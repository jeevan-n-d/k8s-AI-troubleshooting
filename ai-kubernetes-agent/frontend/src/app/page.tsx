'use client';

import React, { useState, useEffect } from 'react';
import { useHealthCheck, useKubectlInvestigation, useAvailableClusters } from '../hooks/useInvestigation';
import { InvestigateResponse, DiagnosisInfo } from '../types';
import { insforge } from '../lib/insforge';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Verification code state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMsg, setVerificationMsg] = useState('');

  // Investigation state
  const { data: health, isLoading: healthLoading } = useHealthCheck();
  const investigateMutation = useKubectlInvestigation();
  const [result, setResult] = useState<InvestigateResponse | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Realtime progress state
  const [progress, setProgress] = useState<Record<string, 'pending' | 'running' | 'completed'>>({
    'Checking Pods': 'pending',
    'Reading Logs': 'pending',
    'Analyzing Events': 'pending',
    'Inspecting Deployments': 'pending',
    'Checking Networking': 'pending',
    'AI Reasoning': 'pending',
    'Root Cause Found': 'pending',
  });

  // Check user session on mount
  useEffect(() => {
    checkUser();
  }, []);

  // Fetch history when user changes
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (data?.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error('Error checking user session', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await insforge.database
        .from('investigations')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (data) {
        setHistory(data);
      }
    } catch (e) {
      console.error('Error fetching history', e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
          name,
        });
        
        if (error) {
          setAuthError(error.message);
        } else if (data?.requireEmailVerification) {
          setVerificationMsg('Please check your email. We have sent a 6-digit verification code.');
          setShowVerification(true);
        } else if (data?.user) {
          setUser(data.user);
        }
      } else {
        const { data, error } = await insforge.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          // If email verification is required, transition to the verification screen
          if (error.message?.toLowerCase().includes('verification') || error.statusCode === 403) {
            setVerificationMsg('Your email is not verified yet. Please enter the 6-digit verification code sent to your email.');
            setShowVerification(true);
          } else {
            setAuthError(error.message);
          }
        } else if (data?.user) {
          setUser(data.user);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { data, error } = await insforge.auth.verifyEmail({
        email,
        otp: verificationCode,
      });

      if (error) {
        setAuthError(error.message);
      } else if (data?.user) {
        setUser(data.user);
        setShowVerification(false);
        setVerificationCode('');
      } else {
        // Fallback check user session
        await checkUser();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
    setResult(null);
    setHistory([]);
    setShowVerification(false);
  };

  const handleInvestigate = async () => {
    if (!user) return;

    // Reset progress steps
    setProgress({
      'Checking Pods': 'pending',
      'Reading Logs': 'pending',
      'Analyzing Events': 'pending',
      'Inspecting Deployments': 'pending',
      'Checking Networking': 'pending',
      'AI Reasoning': 'pending',
      'Root Cause Found': 'pending',
    });

    const channelName = `investigation:${user.id}`;
    
    // Connect to InsForge Realtime and listen for progress events
    try {
      await insforge.realtime.connect();
      await insforge.realtime.subscribe(channelName);
      
      insforge.realtime.on('progress_changed', (payload: any) => {
        if (payload?.step) {
          setProgress((prev: any) => ({
            ...prev,
            [payload.step]: payload.status,
          }));
        }
      });
    } catch (re) {
      console.error('Error connecting to Realtime channel', re);
    }

    investigateMutation.mutate(
      { namespace: 'default', channel: channelName },
      {
        onSuccess: async (data: InvestigateResponse) => {
          setResult(data);
          
          // Save completed investigation to PostgreSQL database
          try {
            await insforge.database.from('investigations').insert({
              user_id: user.id,
              root_cause: data.diagnosis.root_cause,
              explanation: data.diagnosis.explanation,
              fix: data.diagnosis.fix,
              kubectl_command: data.diagnosis.kubectl_command,
              confidence: data.diagnosis.confidence,
              namespace: 'default',
              status: 'completed'
            });
            
            // Refresh history table
            fetchHistory();
          } catch (dbErr) {
            console.error('Failed to save investigation to DB:', dbErr);
          }
        },
        onSettled: () => {
          // Unsubscribe and disconnect from channel to save resources
          try {
            insforge.realtime.unsubscribe(channelName);
          } catch (e) {}
        }
      }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your session...</p>
        </div>
      </div>
    );
  }

  // 1. Authentication View
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400 mb-2">
              AI Kubernetes Agent
            </h1>
            <p className="text-sm text-slate-400">
              {showVerification ? 'Verify your email address' : 'Sign in to manage and troubleshoot your cluster'}
            </p>
          </header>

          {showVerification ? (
            /* OTP Verification Screen */
            <form onSubmit={handleVerifyCode} className="space-y-5">
              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg leading-relaxed">
                  {authError}
                </div>
              )}

              {verificationMsg && (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs p-3 rounded-lg leading-relaxed">
                  {verificationMsg}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-center text-xl font-bold tracking-widest text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md shadow-blue-900/30"
              >
                Verify & Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  setAuthError('');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                Cancel and return to sign in
              </button>
            </form>
          ) : (
            /* Main Sign In / Sign Up Screen */
            <form onSubmit={handleAuth} className="space-y-5">
              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg leading-relaxed">
                  {authError}
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md shadow-blue-900/30"
              >
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          {!showVerification && (
            <footer className="mt-6 text-center text-sm text-slate-400">
              {authMode === 'signin' ? (
                <p>
                  Don't have an account?{' '}
                  <button onClick={() => setAuthMode('signup')} className="text-blue-400 hover:underline">
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => setAuthMode('signin')} className="text-blue-400 hover:underline">
                    Sign In
                  </button>
                </p>
              )}
            </footer>
          )}
        </section>
      </main>
    );
  }

  // 2. Protected Dashboard View
  const inv = result?.investigation;
  const diag = result?.diagnosis;

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Dashboard Header */}
      <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400 mb-1">
            AI Kubernetes Agent
          </h1>
          <p className="text-sm text-slate-400">
            SRE Kubernetes Troubleshooting Console
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm bg-slate-800/50 p-2.5 rounded-lg border border-slate-800">
          <div className="text-right">
            <span className="text-slate-300 font-medium block">{user.profile?.name || user.email}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors text-xs font-semibold"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: CTA & Realtime Progress */}
        <div className="space-y-6">
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 text-center">Diagnostics</h2>

            <button
              onClick={handleInvestigate}
              disabled={investigateMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md shadow-blue-900/30"
            >
              {investigateMutation.isPending ? 'Investigating...' : 'Investigate Cluster'}
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

          {/* Realtime Progress List */}
          {investigateMutation.isPending && (
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
              
              {/* Beginner friendly loading header message */}
              <div className="mt-6 text-center text-xs text-slate-400 font-medium animate-pulse">
                Investigating Kubernetes Cluster...
              </div>
            </section>
          )}

          {/* Recent Investigations History */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Previous Investigations</h2>
            {history.length > 0 ? (
              <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                {history.map((hist) => (
                  <div key={hist.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs">
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
              <p className="text-slate-400 text-sm italic">No investigations found.</p>
            )}
          </section>
        </div>

        {/* Right Side: Analysis and Diagnostic Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Beginner-friendly general error banner on failed endpoint execution */}
          {investigateMutation.isError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-6 shadow-lg leading-relaxed text-sm">
              <h3 className="font-bold text-base text-rose-400 mb-2">Unable to connect to Kubernetes cluster.</h3>
              <p className="mb-3 text-xs text-rose-300/80">Please verify:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-rose-300/80">
                <li>Your local Kubeconfig file is correctly configured (default: /root/.kube/config)</li>
                <li>Your target cluster is currently active and reachable</li>
                <li>Your kubectl installation has sufficient cluster admin permissions</li>
              </ul>
            </div>
          )}

          {/* AI Diagnosis Summary Card */}
          {diag && (
            <section className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-slate-100 border-b border-slate-700 pb-3 flex items-center justify-between">
                <span>AI SRE Diagnosis</span>
                <span className="text-sm uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                  Confidence: {diag.confidence}%
                </span>
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">Root Cause Identified</h3>
                  <p className="text-lg font-bold text-slate-200">{diag.root_cause}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Technical Explanation</h3>
                  <p className="text-sm text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                    {diag.explanation}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Suggested Fix Steps</h3>
                  <p className="text-sm text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                    {diag.fix}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Kubectl Action Command</h3>
                  <pre className="text-xs bg-slate-950 p-4 rounded-lg text-emerald-400 border border-slate-900 font-mono select-all">
                    {diag.kubectl_command}
                  </pre>
                </div>
              </div>
            </section>
          )}

          {/* Diagnostic Evidence Details */}
          {inv && (
            <section className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-lg">
              <h2 className="text-xl font-bold mb-6 text-slate-200 border-b border-slate-700 pb-3">Collected Troubleshooting Evidence</h2>
              
              <div className="space-y-6">
                
                {/* Dynamic empty/healthy state message if cluster appears fully healthy */}
                {inv.pods.healthy && inv.pods.problematic_pods.length === 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-5 text-center text-sm font-medium">
                    No critical Kubernetes issues detected. Cluster appears healthy.
                  </div>
                )}

                {/* Pods Status */}
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Pods Inspection</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/50 p-3.5 rounded border border-slate-700">
                    <div>Healthy Pods Count: {inv.pods.healthy_pods_count} / {inv.pods.total_pods}</div>
                    <div className={inv.pods.healthy ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                      Status: {inv.pods.healthy ? 'All Pods Healthy' : 'Problematic Pods Detected'}
                    </div>
                  </div>
                  {inv.pods.problematic_pods.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {inv.pods.problematic_pods.map((pod: any, i: number) => (
                        <div key={i} className="flex justify-between bg-slate-900/20 p-2 rounded text-xs border border-slate-700/50">
                          <span className="font-mono text-slate-400">{pod.name}</span>
                          <span className="text-rose-400 font-semibold">{pod.status} ({pod.phase})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logs Collection */}
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Logs Collected</h4>
                  {inv.logs.critical_findings && inv.logs.critical_findings.length > 0 ? (
                    <div className="bg-slate-900/30 border border-slate-700 p-3.5 rounded">
                      <ul className="list-disc pl-4 text-xs text-rose-300 space-y-1">
                        {inv.logs.critical_findings.map((finding: string, i: number) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No critical errors logged.</p>
                  )}
                </div>

                {/* Services & Network */}
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Services & Networking</h4>
                  <div className="space-y-1.5">
                    {inv.network.services.map((svc: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-slate-900/30 p-3.5 rounded text-xs border border-slate-700">
                        <div>
                          <span className="font-semibold text-slate-300 block">{svc.service_name}</span>
                          <span className="text-slate-500 font-mono">Cluster IP: {svc.cluster_ip}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${svc.selector_configured ? 'bg-slate-800 text-slate-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {svc.selector_configured ? 'Selector OK' : 'No Selector'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${svc.has_active_endpoints ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {svc.has_active_endpoints ? 'Endpoints active' : '0 Endpoints active'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
