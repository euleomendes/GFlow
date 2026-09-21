'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  Tv,
  Layers,
  Share2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AuthenticatedUser, AreaFilter } from '@/types';
import NotificationsPopover from './NotificationsPopover';

interface TopbarProps {
  user: AuthenticatedUser;
  onToggleSidebar: () => void;
  currentArea?: AreaFilter;
  onAreaChange?: (area: AreaFilter) => void;
}

export default function Topbar({
  user,
  onToggleSidebar,
  currentArea = 'all',
  onAreaChange,
}: TopbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair do GFlow?')) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    alert(`Busca global por: "${searchQuery}" (Funcionalidade integrada no módulo CRM & Biblioteca)`);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-300 px-6 sm:px-8 flex items-center justify-between gap-4">
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-deep-space/70 hover:text-ink-black hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (Section 29) */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-deep-space/50">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar clientes, projetos, valorações ou arquivos..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-slate-300 focus:border-blue-slate rounded-lg text-xs text-ink-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-slate/20 transition-all"
          />
        </form>
      </div>

      {/* Right side: Area Switcher + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Area Toggle Pills (TV / GPlus / Todos) */}
        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onAreaChange?.('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'all'
                ? 'bg-white text-ink-black shadow-xs'
                : 'text-deep-space/70 hover:text-ink-black'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onAreaChange?.('tv')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'tv'
                ? 'bg-deep-space text-white shadow-xs'
                : 'text-deep-space/70 hover:text-deep-space'
            }`}
          >
            <Tv className="w-3 h-3" />
            <span>TV</span>
          </button>
          <button
            type="button"
            onClick={() => onAreaChange?.('gplus')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'gplus'
                ? 'bg-blue-slate text-white shadow-xs'
                : 'text-deep-space/70 hover:text-blue-slate'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>GPlus</span>
          </button>
          <button
            type="button"
            onClick={() => onAreaChange?.('redes_sociais')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'redes_sociais'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-deep-space/70 hover:text-purple-600'
            }`}
          >
            <Share2 className="w-3 h-3" />
            <span>Redes Sociais</span>
          </button>
        </div>

        {/* Notifications Popover */}
        <NotificationsPopover />

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-300">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-ink-black leading-tight">
              {user.name.split(' ')[0]}
            </div>
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                user.roleKey === 'manager'
                  ? 'bg-deep-space/10 text-deep-space border-deep-space/20'
                  : 'bg-blue-slate/10 text-blue-slate border-blue-slate/20'
              }`}
            >
              {user.roleKey === 'manager' ? 'Gerente' : 'Executivo'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 rounded-lg text-deep-space/60 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sair do GFlow"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
