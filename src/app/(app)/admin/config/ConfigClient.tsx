'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  ShieldCheck,
  HardDrive,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Lock,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ConfigClientProps {
  initialConfigs: any[];
  currentUser: AuthenticatedUser;
}

const CATEGORY_TABS = [
  { key: 'GERAL', label: 'Geral & Emissora', icon: Settings },
  { key: 'ARQUIVOS', label: 'Arquivos & Upload', icon: HardDrive },
  { key: 'AUDITORIA', label: 'Auditoria & Logs', icon: ShieldCheck },
  { key: 'LIXEIRA', label: 'Lixeira & Retenção', icon: Trash2 },
];

export default function ConfigClient({ initialConfigs, currentUser }: ConfigClientProps) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [activeTab, setActiveTab] = useState('GERAL');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Critical Confirmation Modal State (Regra 18)
  const [confirmConfig, setConfirmConfig] = useState<any | null>(null);

  const handleStartEdit = (cfg: any) => {
    setEditingKey(cfg.key);
    setTempValue(cfg.value);
    setStatusMessage(null);
  };

  const handleConfirmSave = async () => {
    if (!confirmConfig) return;
    const { key, newValue } = confirmConfig;
    setSavingKey(key);
    setStatusMessage(null);
    setConfirmConfig(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar configuração.');

      setConfigs((prev) =>
        prev.map((c) => (c.key === key ? { ...c, value: newValue } : c))
      );
      setEditingKey(null);
      setStatusMessage({ type: 'success', text: `Configuração [${key}] atualizada com sucesso e registrada na auditoria.` });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSavingKey(null);
    }
  };

  const triggerSave = (cfg: any) => {
    // If setting is in LIXEIRA or AUDITORIA, trigger confirmation modal (Regra 18)
    if (cfg.category === 'LIXEIRA' || cfg.category === 'AUDITORIA' || cfg.key === 'STORAGE_PROVIDER') {
      setConfirmConfig({ key: cfg.key, newValue: tempValue, description: cfg.description });
    } else {
      setConfirmConfig({ key: cfg.key, newValue: tempValue, description: cfg.description });
    }
  };

  const filteredConfigs = configs.filter((c) => c.category === activeTab);

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
          <button onClick={() => setStatusMessage(null)} className="font-semibold underline">
            Fechar
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setEditingKey(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Configs List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100">
        {filteredConfigs.map((cfg) => {
          const isEditing = editingKey === cfg.key;
          const isUnset = cfg.value === 'Retenção não configurada.';

          return (
            <div key={cfg.key} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800">{cfg.key}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {cfg.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{cfg.description}</p>
                <div className="text-xs font-semibold text-slate-800 pt-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full sm:w-80 px-2.5 py-1 text-xs border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  ) : (
                    <span
                      className={`font-mono px-2 py-0.5 rounded ${
                        isUnset
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-50 text-slate-900 border border-slate-200'
                      }`}
                    >
                      {cfg.value}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => triggerSave(cfg)}
                      disabled={savingKey === cfg.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStartEdit(cfg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CRITICAL CONFIRMATION MODAL (Regra 18 & 19) */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Confirmar Alteração de Parâmetro?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Você está alterando o parâmetro <code className="font-mono font-bold text-slate-800">{confirmConfig.key}</code> para:
            </p>
            <div className="mt-3 p-2.5 bg-slate-900 text-white rounded-lg font-mono text-xs truncate">
              {confirmConfig.newValue}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Esta ação será auditada permanentemente em <strong>CONFIG_UPDATED</strong> com seu usuário e endereço IP.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Sim, Atualizar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
