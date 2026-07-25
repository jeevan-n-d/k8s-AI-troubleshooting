'use client';

import React from 'react';
import VerifyEmailScreen from './VerifyEmailScreen';

export interface AuthScreenProps {
  showVerification: boolean;
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  authError: string;
  verificationMsg: string;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  onAuthSubmit: (e: React.FormEvent) => void;
  onVerifySubmit: (e: React.FormEvent) => void;
  onCancelVerification: () => void;
}

export default function AuthScreen({
  showVerification,
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  authError,
  verificationMsg,
  verificationCode,
  setVerificationCode,
  onAuthSubmit,
  onVerifySubmit,
  onCancelVerification,
}: AuthScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400 mb-2">
            KubePilot AI
          </h1>
          <p className="text-sm text-slate-400">
            {showVerification ? 'Verify your email address' : 'Intelligent Kubernetes Troubleshooting Platform'}
          </p>
        </header>

        {showVerification ? (
          <VerifyEmailScreen
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            verificationMsg={verificationMsg}
            authError={authError}
            onSubmit={onVerifySubmit}
            onCancel={onCancelVerification}
          />
        ) : (
          <form onSubmit={onAuthSubmit} className="space-y-5">
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
