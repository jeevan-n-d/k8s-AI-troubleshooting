// Test by Cline
'use client';

import React, { useState, useEffect } from 'react';
import { useHealthCheck, useKubectlInvestigation } from '../hooks/useInvestigation';
import { InvestigateResponse } from '../types';
import { insforge } from '../lib/insforge';
import { fetchContexts } from '../services/api';
import AuthScreen from '../components/auth/AuthScreen';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardHome from '../components/dashboard/DashboardHome';

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

  // Hoisted cluster contexts state
  const [contexts, setContexts] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [loadingContexts, setLoadingContexts] = useState<boolean>(true);

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

  // Fetch contexts from backend on mount
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

  const handleInvestigate = async (targetNamespace: string = 'default', targetCluster?: string) => {
    if (!user) return;

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
      { namespace: targetNamespace, channel: channelName, cluster: targetCluster },
      {
        onSuccess: async (data: InvestigateResponse) => {
          setResult(data);

          try {
            await insforge.database.from('investigations').insert({
              user_id: user.id,
              root_cause: data.diagnosis.root_cause,
              explanation: data.diagnosis.explanation,
              fix: data.diagnosis.fix,
              kubectl_command: data.diagnosis.kubectl_command,
              confidence: data.diagnosis.confidence,
              namespace: targetNamespace,
              status: 'completed',
              cluster: targetCluster || 'default',
              context: targetCluster || 'default',
              evidence: { ...data.investigation, health_score: data.health_score },
            });

            fetchHistory();
          } catch (dbErr) {
            console.error('Failed to save investigation to DB:', dbErr);
          }
        },
        onSettled: () => {
          try {
            insforge.realtime.unsubscribe(channelName);
          } catch (e) {}
        },
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
      <AuthScreen
        showVerification={showVerification}
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        name={name}
        setName={setName}
        authError={authError}
        verificationMsg={verificationMsg}
        verificationCode={verificationCode}
        setVerificationCode={setVerificationCode}
        onAuthSubmit={handleAuth}
        onVerifySubmit={handleVerifyCode}
        onCancelVerification={() => {
          setShowVerification(false);
          setAuthError('');
        }}
      />
    );
  }

  // 2. Protected Dashboard View
  return (
    <DashboardLayout user={user} onSignOut={handleSignOut} selectedContext={selectedContext}>
      <DashboardHome
        onInvestigate={handleInvestigate}
        isPending={investigateMutation.isPending}
        isError={investigateMutation.isError}
        health={health}
        healthLoading={healthLoading}
        progress={progress}
        history={history}
        result={result}
        contexts={contexts}
        setContexts={setContexts}
        currentContext={currentContext}
        setCurrentContext={setCurrentContext}
        selectedContext={selectedContext}
        setSelectedContext={setSelectedContext}
        loadingContexts={loadingContexts}
        setLoadingContexts={setLoadingContexts}
      />
    </DashboardLayout>
  );
}
