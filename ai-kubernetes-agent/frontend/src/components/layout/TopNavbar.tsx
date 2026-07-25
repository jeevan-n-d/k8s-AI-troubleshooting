'use client';

import React from 'react';

export interface TopNavbarProps {
  user: any;
  onSignOut: () => void;
  isSidebarCollapsed: boolean;
}

export default function TopNavbar({ user, onSignOut, isSidebarCollapsed }: TopNavbarProps) {
  return (
    <header
      className="flex justify-between items-center h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md px-6 fixed right-0 top-0 z-30 transition-all duration-300 left-0"
      style={{ left: isSidebarCollapsed ? '4rem' : '16rem' }}
    >
      {/* Brand title on left of TopNavbar */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-black tracking-wider text-slate-200">KubePilot AI</span>
      </div>

      {/* Action Tray & User Control */}
      <div className="flex items-center gap-4">
        {/* SRE profile card */}
        <div className="flex items-center gap-3">
          {/* User Profile Avatar with gradient border */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 font-extrabold text-xs text-blue-400 cursor-pointer shadow-sm hover:border-blue-400 transition-all">
            {user.profile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          {/* Text labels */}
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-200 tracking-tight leading-none">
              {user.profile?.name || user.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-slate-500 leading-none mt-1 truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
        </div>

        {/* SRE Console Exit button */}
        <button
          onClick={onSignOut}
          className="bg-slate-900/80 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/30 text-slate-300 hover:text-rose-400 px-3 py-1.5 rounded-lg transition-all text-xs font-bold shadow-sm"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
