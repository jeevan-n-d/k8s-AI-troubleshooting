'use client';

import React from 'react';

export type SidebarTab =
  | 'dashboard'
  | 'clusters'
  | 'resources'
  | 'investigation'
  | 'reports'
  | 'history'
  | 'settings'
  | 'about';

export interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  selectedContext?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  selectedContext,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard' as SidebarTab,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
          />
        </svg>
      ),
    },
    {
      id: 'clusters' as SidebarTab,
      label: 'Clusters',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: 'resources' as SidebarTab,
      label: 'Resources',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      id: 'investigation' as SidebarTab,
      label: 'Investigation',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
      ),
    },
    {
      id: 'reports' as SidebarTab,
      label: 'AI Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      id: 'history' as SidebarTab,
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'settings' as SidebarTab,
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      id: 'about' as SidebarTab,
      label: 'About',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-900 flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-900/60 h-16">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-xs tracking-widest">KP</span>
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-slate-100 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
                KubePilot
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-widest mt-0.5 uppercase">
                AI
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto">
            <span className="text-white font-black text-xs">KP</span>
            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full animate-pulse"></span>
          </div>
        )}

        {/* Collapse Toggle Trigger */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-500 hover:text-slate-300 hover:bg-slate-900 p-1.5 rounded-lg transition-colors hidden md:block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
            >
              {/* Active Glow Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-blue-500 rounded-r-md"></div>
              )}

              <div
                className={`transition-colors duration-200 ${
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {item.icon}
              </div>

              {!isCollapsed && (
                <span className="truncate tracking-wide">{item.label}</span>
              )}

              {/* Tooltip for Collapsed Menu */}
              {isCollapsed && (
                <div className="absolute left-14 invisible group-hover:visible opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-800 text-slate-100 text-xs py-1.5 px-3 rounded-md transition-all duration-200 whitespace-nowrap z-50 shadow-xl ml-1">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="p-4 border-t border-slate-900/80 bg-slate-950 text-left space-y-2.5">
        {!isCollapsed ? (
          <div className="space-y-2 text-[10px] text-slate-500 font-medium">
            <div className="flex justify-between items-center">
              <span>Version:</span>
              <span className="font-mono text-slate-300 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">v1.0.0</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="shrink-0">Cluster:</span>
              <span className="font-mono text-slate-300 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[120px]" title={selectedContext || "No Context Selected"}>
                {selectedContext || "No Context Selected"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>AI Provider:</span>
              <span className="font-mono text-blue-400 font-semibold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">OpenRouter</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-[9px] text-slate-600 font-mono">
            <span title="v1.0.0">v1.0</span>
            <span title={`Cluster: ${selectedContext || "No Context Selected"}`}>☸</span>
            <span title="AI: OpenRouter" className="text-blue-500">🤖</span>
          </div>
        )}
      </div>
    </aside>
  );
}
