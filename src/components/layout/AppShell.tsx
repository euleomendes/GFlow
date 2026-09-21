'use client';

import { useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AuthenticatedUser, AreaFilter } from '@/types';

interface AppShellProps {
  user: AuthenticatedUser;
  children: React.ReactNode;
}

function AppShellContent({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const areaParam = searchParams?.get('area') as AreaFilter;
  const selectedArea: AreaFilter =
    areaParam && ['tv', 'gplus', 'redes_sociais'].includes(areaParam)
      ? areaParam
      : 'all';

  const handleAreaChange = (newArea: AreaFilter) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (newArea === 'all') {
      params.delete('area');
    } else {
      params.set('area', newArea);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex print:bg-white">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Topbar
            user={user}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            currentArea={selectedArea}
            onAreaChange={handleAreaChange}
          />
        </div>

        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8 print:p-2 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <AppShellContent {...props} />
    </Suspense>
  );
}
