'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  CalendarCheck,
  Building2,
  User,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface VisitsClientProps {
  initialVisits: any[];
  clients: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function VisitsClient({
  initialVisits,
  clients,
  currentUser,
}: VisitsClientProps) {
  const router = useRouter();
  const [visits] = useState(initialVisits);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [opportunityFilter, setOpportunityFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState<any | null>(null);

  // Form
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [visitType, setVisitType] = useState('IN_PERSON');
  const [objective, setObjective] = useState('');
  const [participants, setParticipants] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [needs, setNeeds] = useState('');
  const [hasOpportunity, setHasOpportunity] = useState(false);
  const [potentialValue, setPotentialValue] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextContactDate, setNextContactDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredVisits = visits.filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch =
      v.client.tradeName.toLowerCase().includes(q) ||
      (v.client.legalName && v.client.legalName.toLowerCase().includes(q)) ||
      (v.objective && v.objective.toLowerCase().includes(q)) ||
      (v.executive.name && v.executive.name.toLowerCase().includes(q));

    const matchesType = typeFilter === 'ALL' || v.visitType === typeFilter;
    const matchesOpp =
      opportunityFilter === 'ALL' ||
      (opportunityFilter === 'YES' && v.hasOpportunity) ||
      (opportunityFilter === 'NO' && !v.hasOpportunity);

    return matchesSearch && matchesType && matchesOpp;
  });

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          visitDate,
          startTime,
          visitType,
          objective,
          participants,
          discussion,
          needs,
          hasOpportunity,
          potentialValue: hasOpportunity && potentialValue ? parseFloat(potentialValue) : null,
          nextStep,
          nextContactDate: nextContactDate || null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar visita.');

      setShowModal(false);
      // Reset form
      setObjective('');
      setParticipants('');
      setDiscussion('');
      setNeeds('');
      setNextStep('');
      setPotentialValue('');
      setHasOpportunity(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'IN_PERSON':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Presencial</span>;
      case 'ONLINE':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Online</span>;
      case 'PHONE':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Telefone</span>;
      case 'EVENT':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Evento</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{type}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Action Bar */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, executivo ou objetivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Visita</span>
          </button>
        </div>

        {/* Sub Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Tipo:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="IN_PERSON">Presencial</option>
            <option value="ONLINE">Online</option>
            <option value="PHONE">Telefone</option>
            <option value="EVENT">Evento</option>
          </select>

          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider ml-2">
            Oportunidade:
          </span>
          <select
            value={opportunityFilter}
            onChange={(e) => setOpportunityFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Todas</option>
            <option value="YES">Com Oportunidade</option>
            <option value="NO">Sem Oportunidade</option>
          </select>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Cliente Atendido</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Executivo</th>
                <th className="py-3 px-4">Objetivo / Discussão</th>
                <th className="py-3 px-4 text-center">Oportunidade</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhuma visita registrada com os critérios atuais.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div className="font-bold text-slate-800">
                        {new Date(v.visitDate).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-400">{v.startTime || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/clientes/${v.client.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 block"
                      >
                        {v.client.tradeName || v.client.legalName}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {v.client.city}/{v.client.state}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">{getVisitTypeBadge(v.visitType)}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {v.executive.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">
                        {v.objective || 'Visita comercial'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {v.discussion || v.needs || 'Sem anotações adicionais'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {v.hasOpportunity ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                            Identificada
                          </span>
                          {v.potentialValue && (
                            <span className="text-[10px] font-mono text-emerald-800 font-bold mt-0.5">
                              {formatCurrency(v.potentialValue)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Não gerou</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedVisitDetail(v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-100/60 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalhes da Visita */}
      {selectedVisitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Relatório da Visita Comercial
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedVisitDetail.client.tradeName}
                </h3>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-800 block">
                  {new Date(selectedVisitDetail.visitDate).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[11px] text-slate-400">{selectedVisitDetail.startTime || ''}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Executivo</span>
                <p className="text-slate-800 font-semibold">{selectedVisitDetail.executive.name}</p>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Objetivo</span>
                <p className="text-slate-800 font-semibold">{selectedVisitDetail.objective || '—'}</p>
              </div>

              {selectedVisitDetail.participants && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Participantes</span>
                  <p className="text-slate-800">{selectedVisitDetail.participants}</p>
                </div>
              )}

              {selectedVisitDetail.discussion && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">O que foi discutido</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    {selectedVisitDetail.discussion}
                  </p>
                </div>
              )}

              {selectedVisitDetail.needs && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Necessidades Identificadas</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    {selectedVisitDetail.needs}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Próximo Passo</span>
                  <p className="text-slate-800 font-semibold">{selectedVisitDetail.nextStep || 'Não informado'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Data Próximo Contato</span>
                  <p className="text-slate-800 font-semibold">
                    {selectedVisitDetail.nextContactDate
                      ? new Date(selectedVisitDetail.nextContactDate).toLocaleDateString('pt-BR')
                      : 'Não agendado'}
                  </p>
                </div>
              </div>

              {selectedVisitDetail.hasOpportunity && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Oportunidade Comercial Aberta</span>
                  <span className="font-bold font-mono">
                    {formatCurrency(selectedVisitDetail.potentialValue || 0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedVisitDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nova Visita (Seção 14) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Registrar Visita Comercial (Seção 14)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Preencha os detalhes da reunião e qualifique se gerou oportunidade.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateVisit} className="space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Horário</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tipo de Visita</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="IN_PERSON">Presencial</option>
                    <option value="ONLINE">Online (Videoconferência)</option>
                    <option value="PHONE">Telefone</option>
                    <option value="EVENT">Evento</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Participantes</label>
                  <input
                    type="text"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="Ex: Diretor de Mkt, Gerente"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Objetivo da Reunião *</label>
                <input
                  type="text"
                  required
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Apresentar cota de patrocínio São João 2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">O que foi discutido?</label>
                <textarea
                  rows={2}
                  value={discussion}
                  onChange={(e) => setDiscussion(e.target.value)}
                  placeholder="Principais pontos abordados..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Necessidades identificadas</label>
                <textarea
                  rows={2}
                  value={needs}
                  onChange={(e) => setNeeds(e.target.value)}
                  placeholder="Demandas do cliente, formato de inserção, prazo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Qualificação de Oportunidade */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOpportunity}
                    onChange={(e) => setHasOpportunity(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800">Existe oportunidade comercial identificada?</span>
                </label>

                {hasOpportunity && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Potencial Estimado (R$)</label>
                    <input
                      type="number"
                      value={potentialValue}
                      onChange={(e) => setPotentialValue(e.target.value)}
                      placeholder="Ex: 120000"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Próximo Passo</label>
                  <input
                    type="text"
                    value={nextStep}
                    onChange={(e) => setNextStep(e.target.value)}
                    placeholder="Ex: Enviar proposta comercial até terça"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data Próximo Contato</label>
                  <input
                    type="date"
                    value={nextContactDate}
                    onChange={(e) => setNextContactDate(e.target.value)}
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
                  {submitting ? 'Salvando...' : 'Registrar Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
