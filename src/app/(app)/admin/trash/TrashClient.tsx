'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Briefcase,
  FileText,
  Building2,
  Target,
  UserCheck,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface TrashClientProps {
  initialItems: any[];
  currentUser: AuthenticatedUser;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEntityIcon(type: string) {
  switch (type) {
    case 'PROJECT':
      return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
    case 'FILE':
      return <FileText className="w-3.5 h-3.5 text-blue-600" />;
    case 'CLIENT':
      return <Building2 className="w-3.5 h-3.5 text-emerald-600" />;
    case 'OPPORTUNITY':
      return <Target className="w-3.5 h-3.5 text-purple-600" />;
    default:
      return <Layers className="w-3.5 h-3.5 text-slate-600" />;
  }
}

function getEntityBadge(type: string) {
  switch (type) {
    case 'PROJECT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Briefcase className="w-2.5 h-2.5" /> Projeto
        </span>
      );
    case 'FILE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <FileText className="w-2.5 h-2.5" /> Arquivo
        </span>
      );
    case 'CLIENT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Building2 className="w-2.5 h-2.5" /> Cliente
        </span>
      );
    case 'OPPORTUNITY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Target className="w-2.5 h-2.5" /> Oportunidade
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {type}
        </span>
      );
  }
}

export default function TrashClient({ initialItems, currentUser }: TrashClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [snapshotItem, setSnapshotItem] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleRestore = async (trashId: string) => {
    setLoadingActionId(trashId);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar item');

      setItems((prev) => prev.filter((i) => i.id !== trashId));
      setStatusMessage({ type: 'success', text: 'Item restaurado com sucesso!' });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  const handlePermanentDelete = async (trashId: string) => {
    setLoadingActionId(trashId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/trash?trashId=${trashId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir definitivamente');

      setItems((prev) => prev.filter((i) => i.id !== trashId));
      setConfirmDeleteId(null);
      setStatusMessage({ type: 'success', text: 'Item excluído definitivamente.' });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const s = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(s) ||
      (item.deletedByUser?.name && item.deletedByUser.name.toLowerCase().includes(s));

    if (!matchesSearch) return false;
    if (typeFilter !== 'ALL' && item.entityType !== typeFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setTypeFilter('PROJECT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === 'PROJECT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Projetos ({items.filter((i) => i.entityType === 'PROJECT').length})
          </button>
          <button
            onClick={() => setTypeFilter('FILE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === 'FILE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Arquivos ({items.filter((i) => i.entityType === 'FILE').length})
          </button>
          <button
            onClick={() => setTypeFilter('CLIENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === 'CLIENT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Clientes ({items.filter((i) => i.entityType === 'CLIENT').length})
          </button>
          <button
            onClick={() => setTypeFilter('OPPORTUNITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === 'OPPORTUNITY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Oportunidades ({items.filter((i) => i.entityType === 'OPPORTUNITY').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Trash Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Nome do Item</th>
                <th className="py-3 px-4">Excluído Por</th>
                <th className="py-3 px-4">Data da Exclusão</th>
                <th className="py-3 px-4">Snapshot</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Trash2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    A lixeira está vazia para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">{getEntityBadge(item.entityType)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(item.entityType)}
                        <span className="truncate max-w-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {item.deletedByUser?.name || 'Sistema'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.deletedByUser?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(item.deletedAt)}
                    </td>
                    <td className="py-3 px-4">
                      {item.originalData ? (
                        <button
                          onClick={() => setSnapshotItem(item)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver dados</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          disabled={loadingActionId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>

                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          disabled={loadingActionId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Definitivo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM PERMANENT DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Excluir Definitivamente?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Esta ação é <strong>irreversível</strong>. Todos os registros associados serão apagados do banco de dados de forma definitiva, gerando registro na auditoria.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDeleteId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Sim, Excluir Definitivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNAPSHOT VIEWER MODAL */}
      {snapshotItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Snapshot Original — {snapshotItem.name}
              </h3>
              <button
                onClick={() => setSnapshotItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-2">
                Dados capturados no momento da exclusão:
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(snapshotItem.originalData), null, 2);
                  } catch {
                    return snapshotItem.originalData || 'Nenhum dado disponível.';
                  }
                })()}
              </pre>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSnapshotItem(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
