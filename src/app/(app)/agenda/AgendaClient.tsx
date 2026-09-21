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
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface AgendaClientProps {
  initialEvents: any[];
  upcomingVisits: any[];
  clients: any[];
  currentUser: AuthenticatedUser;
}

export default function AgendaClient({
  initialEvents,
  upcomingVisits,
  clients,
  currentUser,
}: AgendaClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [showModal, setShowModal] = useState(false);
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

  return (
    <div className="space-y-4">
      {/* Top Filter & Action */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs flex items-center justify-between gap-3">
        <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Todos ({events.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Pendentes ({events.filter((e) => !e.isDone).length})
          </button>
          <button
            onClick={() => setFilter('DONE')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'DONE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Concluídos ({events.filter((e) => e.isDone).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Compromisso</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Checklist de Compromissos */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Compromissos & Tarefas Comerciais
          </h3>

          <div className="divide-y divide-slate-100">
            {filteredEvents.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
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
                    className="mt-0.5 text-slate-400 hover:text-blue-600"
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
    </div>
  );
}
