'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  Search,
  Tv,
  Layers,
  Building2,
  DollarSign,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Kanban,
  List,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface OpportunitiesClientProps {
  initialOpportunities: any[];
  clients: any[];
  areas: any[];
  executives: any[];
  projects?: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

const STAGES = [
  { key: 'LEAD', label: '1. Lead', color: 'border-slate-300' },
  { key: 'CONTACT', label: '2. Contato', color: 'border-blue-300' },
  { key: 'MEETING', label: '3. Reunião', color: 'border-indigo-300' },
  { key: 'PROPOSAL', label: '4. Proposta', color: 'border-amber-300' },
  { key: 'NEGOTIATION', label: '5. Negociação', color: 'border-purple-300' },
  { key: 'CLOSED_WON', label: '6. Fechado', color: 'border-emerald-400' },
];

export default function OpportunitiesClient({
  initialOpportunities,
  clients,
  areas,
  executives,
  projects = [],
  currentUser,
}: OpportunitiesClientProps) {
  const router = useRouter();
  const [opportunities] = useState(initialOpportunities);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [projectId, setProjectId] = useState('');
  const [areaKey, setAreaKey] = useState('tv');
  const [stage, setStage] = useState('LEAD');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [probability, setProbability] = useState('20');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [notes, setNotes] = useState('');

  // New Proposal Form State
  const [newProposalValue, setNewProposalValue] = useState('');
  const [newProposalStatus, setNewProposalStatus] = useState('DRAFT');
  const [newProposalNotes, setNewProposalNotes] = useState('');

  const filteredOpportunities = opportunities.filter((opp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      opp.client.tradeName.toLowerCase().includes(q) ||
      (opp.client.legalName && opp.client.legalName.toLowerCase().includes(q)) ||
      (opp.nextStep && opp.nextStep.toLowerCase().includes(q)) ||
      (opp.notes && opp.notes.toLowerCase().includes(q));

    const matchesArea = areaFilter === 'ALL' || opp.area.key === areaFilter;
    return matchesSearch && matchesArea;
  });

  const totalPipeline = filteredOpportunities.reduce((acc, curr) => acc + curr.estimatedValue, 0);
  const weightedPipeline = filteredOpportunities.reduce(
    (acc, curr) => acc + (curr.estimatedValue * curr.probability) / 100,
    0
  );

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          projectId: projectId || null,
          areaKey,
          stage,
          estimatedValue: parseFloat(estimatedValue) || 0,
          probability: parseInt(probability, 10) || 10,
          expectedCloseDate: expectedCloseDate || null,
          nextStep,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar oportunidade');

      setShowModal(false);
      setProjectId('');
      setEstimatedValue('');
      setNextStep('');
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceStage = async (oppId: string, currentStage: string) => {
    const stageKeys = STAGES.map((s) => s.key);
    const currentIndex = stageKeys.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= stageKeys.length - 1) return;

    const nextStage = stageKeys[currentIndex + 1];
    const newProbability = nextStage === 'CLOSED_WON' ? 100 : Math.min(10 + (currentIndex + 1) * 18, 90);

    try {
      const res = await fetch(`/api/opportunities/${oppId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          probability: newProbability,
        }),
      });

      if (!res.ok) throw new Error('Erro ao avançar etapa');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showProposalsModal) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/opportunities/${showProposalsModal.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseFloat(newProposalValue) || showProposalsModal.estimatedValue,
          status: newProposalStatus,
          notes: newProposalNotes,
        }),
      });

      if (!res.ok) throw new Error('Erro ao adicionar proposta');
      setShowProposalsModal(null);
      setNewProposalValue('');
      setNewProposalNotes('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total em Oportunidades
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {filteredOpportunities.length} negócios
          </div>
          <p className="text-[11px] text-slate-500">no funil comercial ativo</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pipeline Bruto Aberto
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(totalPipeline)}
          </div>
          <p className="text-[11px] text-slate-500">soma total das negociações</p>
        </div>

        <div className="bg-white border border-blue-100 bg-blue-50/30 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Pipeline Ponderado (Seção 11)
          </span>
          <div className="text-xl font-black text-blue-900 mt-1">
            {formatCurrency(weightedPipeline)}
          </div>
          <p className="text-[11px] text-blue-600 font-medium">Valor × Probabilidade</p>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, próximo passo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setAreaFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setAreaFilter('tv')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'tv' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              TV
            </button>
            <button
              onClick={() => setAreaFilter('gplus')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'gplus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              GPlus
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* View Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Visualização Kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const oppsInStage = filteredOpportunities.filter((o) => o.stage === s.key);
            const stageValue = oppsInStage.reduce((acc, curr) => acc + curr.estimatedValue, 0);

            return (
              <div
                key={s.key}
                className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{s.label}</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                      {oppsInStage.length}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {formatCurrency(stageValue)}
                  </div>
                </div>

                {/* Cards in stage */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {oppsInStage.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-blue-400 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            opp.area.key === 'tv'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {opp.area.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {opp.probability}%
                        </span>
                      </div>

                      <Link
                        href={`/clientes/${opp.client.id}`}
                        className="font-bold text-xs text-slate-900 hover:text-blue-600 block line-clamp-1"
                      >
                        {opp.client.tradeName || opp.client.legalName}
                      </Link>

                      {opp.project && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {opp.project.name}
                        </span>
                      )}

                      <div className="text-sm font-black text-slate-900 mt-2">
                        {formatCurrency(opp.estimatedValue)}
                      </div>

                      {opp.nextStep && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded">
                          {opp.nextStep}
                        </p>
                      )}

                      {/* Card Footer Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <button
                          type="button"
                          onClick={() => setShowProposalsModal(opp)}
                          className="text-slate-500 hover:text-blue-600 flex items-center gap-1 font-semibold"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Propostas ({opp.proposals.length})</span>
                        </button>

                        {s.key !== 'CLOSED_WON' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(opp.id, opp.stage)}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                            title="Avançar para a próxima etapa"
                          >
                            <span>Avançar</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Área</th>
                <th className="py-3 px-4">Etapa</th>
                <th className="py-3 px-4">Valor Estimado</th>
                <th className="py-3 px-4">Probabilidade</th>
                <th className="py-3 px-4">Valor Ponderado</th>
                <th className="py-3 px-4">Próximo Passo</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOpportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <Link href={`/clientes/${opp.client.id}`} className="hover:text-blue-600">
                      {opp.client.tradeName}
                    </Link>
                    {opp.project && (
                      <span className="block text-[9px] font-bold text-purple-700">
                        {opp.project.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-[10px] uppercase text-blue-600">
                    {opp.area.name}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{opp.stage}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {formatCurrency(opp.estimatedValue)}
                  </td>
                  <td className="py-3 px-4">{opp.probability}%</td>
                  <td className="py-3 px-4 font-bold text-blue-900">
                    {formatCurrency((opp.estimatedValue * opp.probability) / 100)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                    {opp.nextStep || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setShowProposalsModal(opp)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                    >
                      Propostas
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova Oportunidade */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar Nova Oportunidade
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Defina o cliente, o valor estimado e a probabilidade de fechamento.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Cliente *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Projeto Comercial (Opcional)</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Sem Projeto (Carteira Regular)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Área Comercial *</label>
                  <select
                    value={areaKey}
                    onChange={(e) => setAreaKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="tv">TV Guararapes</option>
                    <option value="gplus">GPlus Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Etapa Inicial</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Valor Estimado (R$) *</label>
                  <input
                    type="number"
                    required
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="Ex: 95000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Probabilidade (%)</label>
                  <select
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="40">40%</option>
                    <option value="60">60%</option>
                    <option value="80">80%</option>
                    <option value="100">100%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Previsão de Fechamento</label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Próximo Passo</label>
                <input
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="Ex: Apresentar contraproposta na quinta-feira"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
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
                  {submitting ? 'Salvando...' : 'Salvar Oportunidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Versionamento de Propostas (Seção 12) */}
      {showProposalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl my-8 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Versionamento de Propostas (Seção 12)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {showProposalsModal.client.tradeName}
                </h3>
              </div>
              <span className="text-sm font-black text-blue-600">
                {formatCurrency(showProposalsModal.estimatedValue)}
              </span>
            </div>

            {/* List of existing versions */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {showProposalsModal.proposals.length === 0 ? (
                <p className="text-slate-400 text-center py-4">Nenhuma proposta formal anexada ainda.</p>
              ) : (
                showProposalsModal.proposals.map((p: any) => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Versão #{p.versionNumber} ({p.status})
                      </span>
                      <span className="text-slate-500 text-[11px]">{p.notes || 'Sem observações'}</span>
                    </div>
                    <span className="font-bold font-mono text-slate-800 text-sm">
                      {formatCurrency(p.value)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Form: Add new version */}
            <form onSubmit={handleAddProposal} className="pt-3 border-t border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 block">Gerar Nova Versão (v{showProposalsModal.proposals.length + 1})</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  placeholder="Novo Valor (R$)"
                  value={newProposalValue}
                  onChange={(e) => setNewProposalValue(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <select
                  value={newProposalStatus}
                  onChange={(e) => setNewProposalStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="DRAFT">Rascunho</option>
                  <option value="SENT">Enviada</option>
                  <option value="UNDER_NEGOTIATION">Em Negociação</option>
                  <option value="APPROVED">Aprovada</option>
                  <option value="REJECTED">Recusada</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Observações da versão (ex: desconto de 10% no pacote)"
                value={newProposalNotes}
                onChange={(e) => setNewProposalNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProposalsModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Salvar Nova Versão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
