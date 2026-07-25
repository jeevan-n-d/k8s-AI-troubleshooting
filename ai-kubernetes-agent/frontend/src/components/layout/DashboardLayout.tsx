'use client';

import React, { useState } from 'react';
import Sidebar, { SidebarTab } from './Sidebar';
import TopNavbar from './TopNavbar';

export interface DashboardLayoutProps {
  user: any;
  onSignOut: () => void;
  children: React.ReactNode;
  selectedContext?: string;
}

export default function DashboardLayout({ user, onSignOut, children, selectedContext }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');

  // Inject activeTab and setActiveTab to child components (e.g. DashboardHome)
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        activeTab,
        setActiveTab,
      });
    }
    return child;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        selectedContext={selectedContext}
      />

      {/* Main Content Layout Container */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ paddingLeft: isSidebarCollapsed ? '4rem' : '16rem' }}
      >
        {/* Fixed Top Navigation Bar */}
        <TopNavbar
          user={user}
          onSignOut={onSignOut}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Content canvas viewport */}
        <main className="flex-1 p-6 lg:p-8 mt-16 max-w-[1600px] w-full mx-auto animate-fade-in overflow-y-auto space-y-6">
          {/* Children Viewport content */}
          <div className="w-full">
            {childrenWithProps}
          </div>
        </main>
      </div>
    </div>
  );
}
