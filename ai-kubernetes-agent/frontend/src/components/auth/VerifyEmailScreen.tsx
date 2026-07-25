'use client';

import React from 'react';

export interface VerifyEmailScreenProps {
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  verificationMsg: string;
  authError: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function VerifyEmailScreen({
  verificationCode,
  setVerificationCode,
  verificationMsg,
  authError,
  onSubmit,
  onCancel,
}: VerifyEmailScreenProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
        onClick={onCancel}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        Cancel and return to sign in
      </button>
    </form>
  );
}
