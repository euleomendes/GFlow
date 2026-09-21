'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Check,
  X,
  Trophy,
  Target,
} from 'lucide-react';

export default function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error('Erro ao buscar notificações', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Sino Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-deep-space/80 hover:text-ink-black hover:bg-slate-100 transition-colors"
        title="Notificações & Alertas de Prazos"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-300 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-slate" />
              <span className="font-bold text-ink-black">Central de Alertas & Deadlines</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                  {unreadCount} novos
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-blue-slate hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Marcar lidos
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 text-emerald-400 opacity-60" />
                <p className="font-medium text-xs">Tudo em dia! Sem alertas no momento.</p>
              </div>
            ) : (
              notifications.map((n) => {
                let icon = <Bell className="w-4 h-4 text-blue-500" />;
                let bgBadge = 'bg-blue-50 text-blue-700';

                if (n.type === 'OVERDUE') {
                  icon = <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
                  bgBadge = 'bg-red-50 text-red-700';
                } else if (n.type === 'DUE_SOON') {
                  icon = <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
                  bgBadge = 'bg-amber-50 text-amber-700';
                } else if (n.type === 'GOAL_WON') {
                  icon = <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />;
                  bgBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                } else if (n.type === 'GOAL_80') {
                  icon = <Target className="w-4 h-4 text-purple-600 flex-shrink-0" />;
                  bgBadge = 'bg-purple-50 text-purple-800 border border-purple-200';
                }

                return (
                  <Link
                    key={n.id}
                    href={n.link || '/projecoes'}
                    onClick={() => setIsOpen(false)}
                    className="p-3 block hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${bgBadge}`}>
                            {n.title}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-snug">{n.message}</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/projecoes"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-blue-slate hover:text-ink-black flex items-center justify-center gap-1"
            >
              <span>Ver painel completo de Projeções & Deadlines</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
