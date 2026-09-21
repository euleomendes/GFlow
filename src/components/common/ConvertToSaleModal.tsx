'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  DollarSign,
  Calendar,
  Building2,
  Tv,
  Layers,
  Share2,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface ConvertToSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: any;
  onSuccess?: () => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function ConvertToSaleModal({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
}: ConvertToSaleModalProps) {
  const router = useRouter();

  const [value, setValue] = useState('');
  const [areaKey, setAreaKey] = useState('tv');
  const [closedAt, setClosedAt] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (opportunity && isOpen) {
      setValue(opportunity.estimatedValue ? String(opportunity.estimatedValue) : '');
      setAreaKey(opportunity.area?.key || 'tv');
      setClosedAt(new Date().toISOString().split('T')[0]);
      setReference(`CTR-${Date.now().toString().slice(-6)}`);
      setNotes(opportunity.notes || '');
      setError('');
      setSuccessMessage('');
    }
  }, [opportunity, isOpen]);

  if (!isOpen || !opportunity) return null;

  const clientName =
    opportunity.client?.tradeName || opportunity.client?.legalName || 'Cliente';
  const projectName = opportunity.project?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const parsedValue = parseFloat(value);
      if (!parsedValue || parsedValue <= 0) {
        throw new Error('Informe um valor de venda válido.');
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          clientId: opportunity.clientId || opportunity.client?.id,
          areaKey,
          projectId: opportunity.projectId || opportunity.project?.id || null,
          value: parsedValue,
          closedAt,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          executiveId: opportunity.executiveId || opportunity.executive?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar venda fechada.');
      }

      setSuccessMessage('Venda registrada com sucesso! A oportunidade foi marcada como Ganha.');
      setTimeout(() => {
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Falha ao converter em venda');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-black flex items-center gap-1.5">
                <span>Converter em Venda Fechada</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Ganho
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Gere o contrato de venda oficial e atualize o faturamento em tempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink-black hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo da Oportunidade */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-ink-black">{clientName}</span>
            </div>
            {projectName && (
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-slate/10 text-blue-slate">
                Projeto: {projectName}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Estimado no Funil</span>
            <span className="font-bold text-ink-black">
              {formatCurrency(opportunity.estimatedValue || 0)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor Final Fechado */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Valor Líquido Fechado (R$) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Área Comercial */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Área de Faturamento *
              </label>
              <select
                value={areaKey}
                onChange={(e) => setAreaKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-ink-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="tv">TV Guararapes (Canal 9.1)</option>
                <option value="gplus">Portal GPlus (Digital)</option>
                <option value="redes_sociais">Redes Sociais (Digital)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Data de Fechamento */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Data do Fechamento *
              </label>
              <input
                type="date"
                required
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-ink-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Referência / Código do Contrato */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Referência / Contrato
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: CTR-9842"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-ink-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Observações / Entregas Comerciais
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes sobre inserções, cotas ou condições acordadas..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-ink-black rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{submitting ? 'Registrando...' : 'Confirmar Fechamento e Venda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
