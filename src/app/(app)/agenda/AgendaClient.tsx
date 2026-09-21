'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  Building2,
  CalendarCheck,
  AlertCircle,
  Phone,
  Video,
  FileText,
  Award,
  TrendingUp,
  Tv,
  Layers,
  Share2,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';
import ConvertToSaleModal from '@/components/common/ConvertToSaleModal';

interface AgendaClientProps {
  initialEvents: any[];
  upcomingVisits: any[];
  upcomingDeadlines?: any[];
  clients: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function getDeadlineStatus(expectedDateStr: string | Date) {
  const d = new Date(expectedDateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasado`, status: 'OVERDUE', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (diffDays === 0) return { label: 'Vence Hoje!', status: 'TODAY', badge: 'bg-amber-50 text-amber-700 border-amber-200 font-bold animate-pulse' };
  if (diffDays <= 7) return { label: `Vence em ${diffDays}d`, status: 'SOON', badge: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold' };
  return { label: `Em ${diffDays}d`, status: 'ON_TIME', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export default function AgendaClient({
  initialEvents,
  upcomingVisits,
  upcomingDeadlines = [],
  clients,
  currentUser,
}: AgendaClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [activeTab, setActiveTab] = useState<'ALL' | 'EVENTS' | 'DEADLINES'>('ALL');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selectedOppToConvert, setSelectedOppToConvert] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [eventType, setEventType] = useState('MEETING');
  const [clientId, setClientId] = useState('');

  const toggleDone = async (id: string, currentDone: boolean) => {
    try {
      const res = await fetch('/api/agenda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDone: !currentDone }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar status');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          eventDate,
          startTime,
          endTime,
          eventType,
          clientId: clientId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar compromisso');

      setShowModal(false);
      setTitle('');
      setDescription('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === 'PENDING') return !ev.isDone;
    if (filter === 'DONE') return ev.isDone;
    return true;
  });

  const totalDeadlinesValue = upcomingDeadlines.reduce(
    (acc, curr) => acc + curr.estimatedValue,
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Filter & Action */}
      <div className="bg-white p-4 border border-slate-300 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Main Section Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-ink-black shadow-xs'
                : 'text-slate-600 hover:text-ink-black'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'EVENTS'
                ? 'bg-white text-ink-black shadow-xs'
                : 'text-slate-600 hover:text-ink-black'
            }`}
          >
            Compromissos ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('DEADLINES')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'DEADLINES'
                ? 'bg-deep-space text-white shadow-xs'
                : 'text-slate-600 hover:text-deep-space'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-slate" />
            <span>Deadlines de Fechamento ({upcomingDeadlines.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'EVENTS' && (
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilter('DONE')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === 'DONE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Concluídos
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção Deadlines de Fechamento (se 'ALL' ou 'DEADLINES') */}
          {(activeTab === 'ALL' || activeTab === 'DEADLINES') && (
            <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-deep-space text-white flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-black flex items-center gap-2">
                      <span>Deadlines Críticos de Propostas & Projeções</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-slate/10 text-blue-slate border border-blue-slate/20">
                        {upcomingDeadlines.length} prazos
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Oportunidades em aberto com data de fechamento prevista para acompanhamento e conversão em venda.
                    </p>
                  </div>
                </div>

                <Link
                  href="/projecoes"
                  className="text-xs font-bold text-blue-slate hover:text-deep-space flex items-center gap-1 transition-colors"
                >
                  <span>Ver Projeções</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum deadline de negociação registrado no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingDeadlines.map((opp) => {
                    const deadlineInfo = getDeadlineStatus(opp.expectedCloseDate);

                    return (
                      <div
                        key={opp.id}
                        className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2.5 rounded-xl transition-all"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-ink-black">
                              {opp.client.tradeName || opp.client.legalName}
                            </span>

                            {/* Area Badge */}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                                opp.area?.key === 'tv'
                                  ? 'bg-deep-space/10 text-deep-space border-deep-space/20'
                                  : opp.area?.key === 'redes_sociais'
                                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-blue-slate/10 text-blue-slate border-blue-slate/20'
                              }`}
                            >
                              {opp.area?.name}
                            </span>

                            {/* Project Badge */}
                            {opp.project && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {opp.project.name}
                              </span>
                            )}

                            {/* Urgency Badge */}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${deadlineInfo.badge}`}
                            >
                              {deadlineInfo.label}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 truncate">
                            Próximo passo: <strong>{opp.nextStep || 'Aguardando retorno comercial'}</strong>
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>
                              Prazo: <strong>{new Date(opp.expectedCloseDate).toLocaleDateString('pt-BR')}</strong>
                            </span>
                            {opp.executive && (
                              <span>• Resp: <strong>{opp.executive.name}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Right Value & Conversion Action */}
                        <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-ink-black">
                              {formatCurrency(opp.estimatedValue)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Prob: {opp.probability}%
                            </div>
                          </div>

                          {/* Quick Convert Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOppToConvert(opp)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                            title="Converter esta negociação em Venda Oficial Fechada"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Converter</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Seção Compromissos (se 'ALL' ou 'EVENTS') */}
          {(activeTab === 'ALL' || activeTab === 'EVENTS') && (
            <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-ink-black flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-slate" />
                  <span>Compromissos & Tarefas Comerciais</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Nenhum compromisso encontrado nesta seleção.
                  </div>
                ) : (
                  filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="py-3.5 flex items-start gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDone(ev.id, ev.isDone)}
                        className="mt-0.5 text-slate-400 hover:text-blue-slate"
                      >
                        {ev.isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              ev.isDone ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {ev.title}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-slate-100 text-slate-600">
                            {ev.eventType}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ev.eventDate).toLocaleDateString('pt-BR')}
                          </span>
                          {ev.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.startTime} {ev.endTime && `- ${ev.endTime}`}
                            </span>
                          )}
                          {ev.client && (
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <Building2 className="w-3 h-3" />
                              {ev.client.tradeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Visitas Agendadas */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Visitas Agendadas
            </h3>
            <Link
              href="/visitas"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingVisits.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                Nenhuma visita agendada.
              </div>
            ) : (
              upcomingVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{v.client.tradeName}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(v.visitDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {v.objective || 'Visita comercial de acompanhamento'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Novo Compromisso */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Agendar Compromisso Comercial (Seção 16)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reunião, follow-up ou contato programado.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Título do Compromisso *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião de alinhamento com Diretor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Cliente Vinculado (Opcional)</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Sem vínculo com cliente específico</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.tradeName || c.legalName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Início</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Fim</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tipo de Evento</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="MEETING">Reunião Presencial / Online</option>
                  <option value="FOLLOW_UP">Follow-up de Proposta</option>
                  <option value="CALL">Ligação Telefônica</option>
                  <option value="TASK">Tarefa Interna</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Descrição / Detalhes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pauta ou lembrete..."
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
                  {submitting ? 'Salvando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Converter Negociação em Venda Fechada */}
      {selectedOppToConvert && (
        <ConvertToSaleModal
          isOpen={!!selectedOppToConvert}
          onClose={() => setSelectedOppToConvert(null)}
          opportunity={selectedOppToConvert}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
