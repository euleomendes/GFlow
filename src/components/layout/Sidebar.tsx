'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Target,
  Calendar,
  Briefcase,
  FileSpreadsheet,
  FolderTree,
  Star,
  Layers,
  Palette,
  FileText,
  Megaphone,
  BarChart3,
  UserCog,
  Shield,
  Trash2,
  History,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface SidebarProps {
  user: AuthenticatedUser;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ user, isOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const isManager = user.roleKey === 'manager';

  const commercialNav = [
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Oportunidades', href: '/oportunidades', icon: TrendingUp },
    { name: 'Vendas', href: '/vendas', icon: DollarSign },
    { name: 'Visitas', href: '/visitas', icon: CalendarCheck },
    { name: 'Metas', href: '/metas', icon: Target },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
  ];

  const projectsNav = [
    { name: 'Projetos', href: '/projetos', icon: Briefcase },
    { name: 'Valorações', href: '/valoracoes', icon: FileSpreadsheet },
  ];

  const libraryNav = [
    { name: 'Todos os materiais', href: '/biblioteca', icon: FolderTree },
    { name: 'Favoritos', href: '/biblioteca/favoritos', icon: Star },
  ];

  const marketingNav = [
    { name: 'Projetos MKT', href: '/marketing/projetos', icon: Layers },
    { name: 'Identidade TV', href: '/marketing/identidade-tv', icon: Palette },
    { name: 'Identidade GPlus', href: '/marketing/identidade-gplus', icon: Palette },
    { name: 'Institucional', href: '/marketing/institucional', icon: FileText },
    { name: 'Campanhas', href: '/marketing/campanhas', icon: Megaphone },
  ];

  const adminNav = [
    { name: 'Utilizadores & Executivos', href: '/admin/users', icon: UserCog },
    { name: 'Auditoria & Histórico', href: '/admin/audit', icon: History },
    { name: 'Lixeira', href: '/admin/trash', icon: Trash2 },
    { name: 'Configurações', href: '/admin/config', icon: Settings },
  ];

  const renderNavLink = (item: { name: string; href: string; icon: any }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onCloseMobile}
        className={`group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 rounded-l-none'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span className="truncate">{item.name}</span>
        </div>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
            GF
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              GFLOW
            </span>
            <span className="block text-[9px] font-semibold tracking-wider uppercase text-blue-600">
              TV Guararapes
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Dashboard */}
          <div>
            {renderNavLink({
              name: isManager ? 'Dashboard Executivo' : 'Meu Painel',
              href: '/dashboard',
              icon: LayoutDashboard,
            })}
          </div>

          {/* Comercial */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Comercial
            </div>
            <div className="space-y-0.5">{commercialNav.map(renderNavLink)}</div>
          </div>

          {/* Projetos */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Projetos
            </div>
            <div className="space-y-0.5">{projectsNav.map(renderNavLink)}</div>
          </div>

          {/* Biblioteca */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Biblioteca
            </div>
            <div className="space-y-0.5">{libraryNav.map(renderNavLink)}</div>
          </div>

          {/* Marketing - Apenas se Gerente ou perfil MKT */}
          {isManager && (
            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Marketing
              </div>
              <div className="space-y-0.5">{marketingNav.map(renderNavLink)}</div>
            </div>
          )}

          {/* Relatórios */}
          {isManager && (
            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Inteligência
              </div>
              <div className="space-y-0.5">
                {renderNavLink({
                  name: 'Relatórios Gerenciais',
                  href: '/relatorios',
                  icon: BarChart3,
                })}
              </div>
            </div>
          )}

          {/* Administração - Exclusivo Gerente / Admin */}
          {isManager && (
            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administração
              </div>
              <div className="space-y-0.5">{adminNav.map(renderNavLink)}</div>
            </div>
          )}
        </div>

        {/* User Card footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.name}
              </p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">
                {user.roleName}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
