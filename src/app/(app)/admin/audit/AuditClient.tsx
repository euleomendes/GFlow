'use client';

import { useState } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileCode,
} from 'lucide-react';

interface AuditClientProps {
  initialLogs: any[];
}

export default function AuditClient({ initialLogs }: AuditClientProps) {
  const [logs] = useState(initialLogs);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.actorUser?.name || 'Sistema').toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'CREATE_USER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
      case 'VERSION_UPGRADE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOGIN':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'LOGOUT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INIT_SYSTEM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const formatJson = (dataString: string | null) => {
    if (!dataString) return null;
    try {
      const parsed = JSON.parse(dataString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return dataString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ator, ação, entidade ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Ação:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            <option value="ALL">Todas as Ações</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE_USER">CREATE_USER</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="INIT_SYSTEM">INIT_SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Responsável (Ator)</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">ID Referência</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDetails = log.beforeData || log.afterData;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDetails && toggleExpand(log.id)}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          hasDetails ? 'cursor-pointer' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          {hasDetails ? (
                            isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )
                          ) : (
                            <span className="w-3.5 h-3.5 inline-block text-slate-300">•</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {log.actorUser ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.actorUser.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sistema Interno</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-700 text-[11px]">
                          {log.entityType}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px] truncate max-w-xs">
                          {log.entityId || '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {hasDetails ? (
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-1"
                            >
                              <FileCode className="w-3 h-3" />
                              <span>{isExpanded ? 'Ocultar diff' : 'Ver diff'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Sem payload</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Before / After JSON Viewer */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-100">
                          <td colSpan={7} className="p-4 border-y border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Before Data */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                                  <span>Antes da alteração (Before)</span>
                                </div>
                                <pre className="bg-slate-950 p-3 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-52 border border-slate-800">
                                  {formatJson(log.beforeData) || 'null (Nenhum dado anterior)'}
                                </pre>
                              </div>

                              {/* After Data */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                                  <span>Após a alteração (After)</span>
                                </div>
                                <pre className="bg-slate-950 p-3 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-52 border border-slate-800">
                                  {formatJson(log.afterData) || 'null (Sem dados posteriores)'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// React import for React.Fragment
import React from 'react';
