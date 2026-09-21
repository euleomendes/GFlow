'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Target,
  Plus,
  Tv,
  Layers,
  Calendar,
  AlertCircle,
  TrendingUp,
  User,
  CheckCircle2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface GoalsClientProps {
  initialGoals: any[];
  executives: any[];
  areas: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function GoalsClient({
  initialGoals,
  executives,
  areas,
  currentUser,
}: GoalsClientProps) {
  const router = useRouter();
  const [goals] = useState(initialGoals);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [executiveId, setExecutiveId] = useState(executives[0]?.id || '');
  const [areaKey, setAreaKey] = useState('tv');
  const [metricType, setMetricType] = useState('REVENUE');
  const [targetValue, setTargetValue] = useState('');

  // Default to current month start and end
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const [periodStart, setPeriodStart] = useState(firstDay);
  const [periodEnd, setPeriodEnd] = useState(lastDay);

  const isManager = currentUser.roleKey === 'manager';

  const totalTarget = goals.reduce((acc, curr) => acc + curr.targetValue, 0);
  const totalRealized = goals.reduce((acc, curr) => acc + curr.realized, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalRealized / totalTarget) * 100) : 0;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executiveId,
          areaKey,
          metricType,
          targetValue: parseFloat(targetValue),
          periodStart,
          periodEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao definir meta');

      setShowModal(false);
      setTargetValue('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Meta Total Estabelecida
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalTarget)}
          </div>
          <p className="text-[11px] text-slate-500">período corrente consolidado</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Faturamento Realizado
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(totalRealized)}
          </div>
          <p className="text-[11px] text-slate-500">vendas fechadas no período</p>
        </div>

        <div className="bg-white border border-blue-100 bg-blue-50/30 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Atingimento Geral
          </span>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {overallPercentage}%
          </div>
          <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {isManager && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Definir Nova Meta</span>
          </button>
        </div>
      )}

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((g) => {
          const isRevenue = g.metricType === 'REVENUE';

          return (
            <div
              key={g.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {g.executive.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {g.executive.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isRevenue ? 'Meta de Faturamento' : 'Meta de Visitas'}
                      </span>
                    </div>
                  </div>

                  {/* Area badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      g.area?.key === 'tv'
                        ? 'bg-blue-50 text-blue-700'
                        : g.area?.key === 'gplus'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {g.area ? g.area.name : 'Geral'}
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900">
                      {isRevenue ? formatCurrency(g.realized) : `${g.realized} visitas`}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      de {isRevenue ? formatCurrency(g.targetValue) : `${g.targetValue}`}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        g.percentage >= 100
                          ? 'bg-emerald-500'
                          : g.percentage >= 70
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(g.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: Percentage and Difference */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  {g.percentage}% atingido
                </span>

                {g.difference > 0 ? (
                  <span className="text-[11px] text-slate-500">
                    Faltam {isRevenue ? formatCurrency(g.difference) : `${g.difference} visitas`}
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Meta Batida!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Definir Meta (Seção 15) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl text-xs space-y-3.5">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Definir Nova Meta Comercial (Seção 15)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Estabeleça metas por executivo, área e período.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Executivo *</label>
                <select
                  required
                  value={executiveId}
                  onChange={(e) => setExecutiveId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {executives.map((exec) => (
                    <option key={exec.id} value={exec.id}>{exec.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Área Comercial</label>
                  <select
                    value={areaKey}
                    onChange={(e) => setAreaKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="all">Geral (Todas)</option>
                    <option value="tv">TV Guararapes</option>
                    <option value="gplus">GPlus Digital</option>
                    <option value="redes_sociais">Redes Sociais</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tipo de Meta</label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="REVENUE">Faturamento (R$)</option>
                    <option value="VISITS_COUNT">Qtd de Visitas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Valor Alvo da Meta *</label>
                <input
                  type="number"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={metricType === 'REVENUE' ? 'Ex: 500000' : 'Ex: 30'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Início do Período *</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Fim do Período *</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
