'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AuthenticatedUser, AreaFilter } from '@/types';

interface AppShellProps {
  user: AuthenticatedUser;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaFilter>('all');

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentArea={selectedArea}
          onAreaChange={setSelectedArea}
        />

        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
