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
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AuthenticatedUser, AreaFilter } from '@/types';

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
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (Section 29) */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar clientes, projetos, valorações ou arquivos..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
          />
        </form>
      </div>

      {/* Right side: Area Switcher + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Area Toggle Pills (TV / GPlus / Todos) */}
        <div className="hidden md:flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => onAreaChange?.('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onAreaChange?.('tv')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              currentArea === 'tv'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
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
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>GPlus</span>
          </button>
        </div>

        {/* Notifications Icon */}
        <button
          type="button"
          onClick={() => alert('Notificações internas: Nenhuma pendência crítica no momento.')}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user.name.split(' ')[0]}
            </div>
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                user.roleKey === 'manager'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
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
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sair do GFlow"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
