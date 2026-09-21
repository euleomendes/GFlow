'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Tv,
  Layers,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  User,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Plus,
  Clock,
  History,
  Shield,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Share2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';
import ConvertToSaleModal from '@/components/common/ConvertToSaleModal';

interface ClientDetailsClientProps {
  client: any;
  auditLogs: any[];
  allAreas: any[];
  executives: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function ClientDetailsClient({
  client,
  auditLogs,
  allAreas,
  executives,
  currentUser,
}: ClientDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contacts' | 'visits' | 'opportunities' | 'sales' | 'timeline'
  >('overview');

  // Modals state
  const [selectedOppToConvert, setSelectedOppToConvert] = useState<any | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Contact Form
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);

  // Visit Form
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [visitType, setVisitType] = useState('IN_PERSON');
  const [visitObjective, setVisitObjective] = useState('');
  const [participants, setParticipants] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [needs, setNeeds] = useState('');
  const [hasOpportunity, setHasOpportunity] = useState(false);
  const [potentialValue, setPotentialValue] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextContactDate, setNextContactDate] = useState('');

  // Edit Client Form
  const [editTradeName, setEditTradeName] = useState(client.tradeName || '');
  const [editLegalName, setEditLegalName] = useState(client.legalName || '');
  const [editCnpj, setEditCnpj] = useState(client.cnpj || '');
  const [editSegment, setEditSegment] = useState(client.segment || '');
  const [editCity, setEditCity] = useState(client.city || '');
  const [editState, setEditState] = useState(client.state || 'PE');
  const [editPhone, setEditPhone] = useState(client.phone || '');
  const [editWebsite, setEditWebsite] = useState(client.website || '');
  const [editStatus, setEditStatus] = useState(client.status);
  const [editPotential, setEditPotential] = useState(client.potential);
  const [editResponsibleId, setEditResponsibleId] = useState(client.responsibleUserId || currentUser.id);
  const [editAreaKeys, setEditAreaKeys] = useState<string[]>(
    client.areas.map((a: any) => a.area.key)
  );

  const hasTV = client.areas.some((a: any) => a.area.key === 'tv');
  const hasGPlus = client.areas.some((a: any) => a.area.key === 'gplus');
  const hasSocial = client.areas.some((a: any) => a.area.key === 'redes_sociais');

  const totalSales = client.sales.reduce((acc: number, curr: any) => acc + curr.value, 0);
  const totalPipeline = client.opportunities
    .filter((o: any) => o.status === 'OPEN')
    .reduce((acc: number, curr: any) => acc + curr.estimatedValue, 0);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/clients/${client.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          roleTitle: contactRole,
          email: contactEmail,
          phone: contactPhone,
          isPrimary: isPrimaryContact,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar contato');

      setShowContactModal(false);
      setContactName('');
      setContactRole('');
      setContactEmail('');
      setContactPhone('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Deseja excluir este contato?')) return;
    try {
      const res = await fetch(`/api/clients/${client.id}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir contato');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          visitDate,
          startTime,
          visitType,
          objective: visitObjective,
          participants,
          discussion,
          needs,
          hasOpportunity,
          potentialValue: hasOpportunity && potentialValue ? parseFloat(potentialValue) : null,
          nextStep,
          nextContactDate: nextContactDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar visita');

      setShowVisitModal(false);
      setVisitObjective('');
      setDiscussion('');
      setNeeds('');
      setNextStep('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeName: editTradeName,
          legalName: editLegalName,
          cnpj: editCnpj,
          segment: editSegment,
          city: editCity,
          state: editState,
          phone: editPhone,
          website: editWebsite,
          status: editStatus,
          potential: editPotential,
          responsibleUserId: editResponsibleId,
          areaKeys: editAreaKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar dados');

      setShowEditModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEditAreaKey = (k: string) => {
    if (editAreaKeys.includes(k)) {
      if (editAreaKeys.length > 1) {
        setEditAreaKeys(editAreaKeys.filter((item) => item !== k));
      }
    } else {
      setEditAreaKeys([...editAreaKeys, k]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/clientes"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {client.tradeName || client.legalName}
                </h1>

                {/* Area Badges (Seção 3) */}
                <div className="flex items-center gap-1">
                  {hasTV && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <Tv className="w-3 h-3" />
                      <span>TV</span>
                    </span>
                  )}
                  {hasGPlus && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Layers className="w-3 h-3" />
                      <span>GPlus</span>
                    </span>
                  )}
                  {hasSocial && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      <Share2 className="w-3 h-3" />
                      <span>Redes Sociais</span>
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {client.status}
                </span>

                {/* Potencial */}
                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Potencial: {client.potential}
                </span>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">{client.legalName}</span>
                {client.cnpj && <span>• CNPJ: {client.cnpj}</span>}
                <span>• Responsável: <strong className="text-slate-800">{client.responsibleUser?.name || 'Não atribuído'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVisitModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Registrar Visita</span>
            </button>

            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Contato</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation (Seção 9) */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto text-xs">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'contacts', label: `Contatos (${client.contacts.length})` },
            { id: 'visits', label: `Visitas (${client.visits.length})` },
            { id: 'opportunities', label: `Oportunidades (${client.opportunities.length})` },
            { id: 'sales', label: `Vendas (${client.sales.length})` },
            { id: 'timeline', label: `Linha do Tempo (${auditLogs.length + client.visits.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Visão Geral */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Metrics */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Faturamento Fechado
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalSales)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {client.sales.length} contratos fechados
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pipeline Aberto
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalPipeline)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {client.opportunities.filter((o: any) => o.status === 'OPEN').length} negociações
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reuniões & Visitas
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {client.visits.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                registros comerciais de campo
              </p>
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Informações Cadastrais & Contato
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Segmento</span>
                <p className="text-slate-800 font-bold mt-0.5">{client.segment || 'Não informado'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Localização</span>
                <p className="text-slate-800 font-bold mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{client.city ? `${client.city}, ${client.state}` : 'Pernambuco'}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Telefone Principal</span>
                <p className="text-slate-800 font-bold mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{client.phone || 'Não informado'}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Website</span>
                <p className="text-slate-800 font-bold mt-0.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {client.website}
                    </a>
                  ) : (
                    'Não informado'
                  )}
                </p>
              </div>
            </div>

            {client.notes && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400">Observações Comerciais</span>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Contato Principal Destaque */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contato Principal
                </h3>
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              </div>

              {client.contacts.find((c: any) => c.isPrimary) ? (
                (() => {
                  const p = client.contacts.find((c: any) => c.isPrimary);
                  return (
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-slate-900">{p.name}</div>
                      <div className="text-xs text-blue-600 font-medium">{p.roleTitle || 'Representante'}</div>
                      <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                        {p.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.email}</span>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  Nenhum contato marcado como principal.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contatos */}
      {activeTab === 'contacts' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Lista de Contatos Cadastrados
              </h3>
              <p className="text-xs text-slate-500">
                Interlocutores, diretores, marketing e equipe de compras da empresa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Contato</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {client.contacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum contato adicional cadastrado para este cliente.
              </div>
            ) : (
              client.contacts.map((contact: any) => (
                <div key={contact.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                      {contact.isPrimary && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{contact.roleTitle || 'Sem cargo'}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Excluir contato"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Visitas */}
      {activeTab === 'visits' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Visitas & Reuniões Registradas
              </h3>
              <p className="text-xs text-slate-500">
                Histórico de conversas comerciais, pautas tratadas e follow-ups
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVisitModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Registrar Nova Visita</span>
            </button>
          </div>

          <div className="space-y-3">
            {client.visits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma visita registrada com este cliente ainda.
              </div>
            ) : (
              client.visits.map((v: any) => (
                <div key={v.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {new Date(v.visitDate).toLocaleDateString('pt-BR')} {v.startTime && `às ${v.startTime}`}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded uppercase">
                        {v.visitType}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      Executivo: <strong className="text-slate-800">{v.executive.name}</strong>
                    </span>
                  </div>

                  <div className="text-xs text-slate-800 font-semibold">{v.objective || 'Visita comercial'}</div>

                  {v.discussion && (
                    <div className="text-xs text-slate-600">
                      <strong>O que foi discutido:</strong> {v.discussion}
                    </div>
                  )}

                  {v.needs && (
                    <div className="text-xs text-slate-600">
                      <strong>Necessidades identificadas:</strong> {v.needs}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <div className="text-slate-500">
                      <strong>Próximo passo:</strong> {v.nextStep || 'Não definido'}
                    </div>
                    {v.hasOpportunity && (
                      <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Oportunidade de {formatCurrency(v.potentialValue || 0)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Oportunidades & Projeções */}
      {activeTab === 'opportunities' && (
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Oportunidades em Aberto & Projeções</h3>
              <p className="text-xs text-slate-500">Negociações ativas com prazos e probabilidades</p>
            </div>
            <Link
              href="/projecoes"
              className="text-xs font-bold text-blue-slate hover:text-deep-space flex items-center gap-1"
            >
              <span>Ver no Painel de Forecast →</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-200 text-xs">
            {client.opportunities.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Nenhuma oportunidade aberta para este cliente.
              </div>
            ) : (
              client.opportunities.map((opp: any) => {
                const d = opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null;
                const isOverdue = d && d < new Date();

                return (
                  <div key={opp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Etapa: {opp.stage}
                        </span>

                        {opp.project && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            {opp.project.name}
                          </span>
                        )}

                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {opp.area?.name}
                        </span>

                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                          {opp.probability}% de chance
                        </span>
                      </div>

                      <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-3">
                        <span>
                          Prazo: <strong className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                            {d ? d.toLocaleDateString('pt-BR') : 'Sem data definida'}
                          </strong>
                        </span>
                        {opp.nextStep && (
                          <span>
                            Próximo passo: <em className="text-slate-700">{opp.nextStep}</em>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <div className="font-black text-ink-black text-sm">
                        {formatCurrency(opp.estimatedValue)}
                      </div>
                      <span className="text-[10px] font-bold text-blue-600">
                        Ponderado: {formatCurrency((opp.estimatedValue * (opp.probability || 10)) / 100)}
                      </span>
                      {opp.status !== 'WON' && opp.status !== 'LOST' && (
                        <button
                          type="button"
                          onClick={() => setSelectedOppToConvert(opp)}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md shadow-2xs transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Converter em Venda</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Vendas */}
      {activeTab === 'sales' && (
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200">
            Vendas & Contratos Fechados
          </h3>
          <div className="divide-y divide-slate-200 text-xs">
            {client.sales.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Nenhum contrato de venda registrado para este cliente.
              </div>
            ) : (
              client.sales.map((sale: any) => (
                <div key={sale.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 p-2 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 block">
                        Ref: {sale.reference || 'CONTRATO'} • {new Date(sale.closedAt).toLocaleDateString('pt-BR')}
                      </span>
                      {sale.project && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700">
                          {sale.project.name}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {sale.notes || 'Venda comercial formalizada'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">
                      {formatCurrency(sale.value)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {sale.area?.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Linha do Tempo & Histórico (Seção 9 e 28) */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Memória Comercial & Linha do Tempo
            </h3>
            <p className="text-xs text-slate-500">
              Histórico cronológico de todos os eventos, visitas, contatos e alterações realizadas no cliente.
            </p>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
            {/* Evento inicial de criação */}
            <div className="relative pl-6">
              <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-slate-900 ring-4 ring-white" />
              <div className="text-xs">
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <p className="font-bold text-slate-900 mt-0.5">Cliente cadastrado no GFlow</p>
                <p className="text-slate-500 text-[11px]">
                  Cadastro inicial por {client.responsibleUser?.name || 'Sistema'}.
                </p>
              </div>
            </div>

            {/* Visitas na timeline */}
            {client.visits.map((v: any) => (
              <div key={v.id} className="relative pl-6">
                <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-blue-600">
                    {new Date(v.visitDate).toLocaleDateString('pt-BR')}
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {v.executive.name} realizou visita comercial ({v.visitType})
                  </p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {v.objective || v.discussion || 'Reunião com cliente'}
                  </p>
                </div>
              </div>
            ))}

            {/* Logs de auditoria do cliente */}
            {auditLogs.map((log: any) => (
              <div key={log.id} className="relative pl-6">
                <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white" />
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-purple-600">
                    {new Date(log.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {log.actorUser?.name || 'Sistema'}: {log.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Novo Contato */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adicionar Contato para {client.tradeName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cadastre um novo interlocutor na empresa.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Carlos Albuquerque"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="Ex: Gerente de Compras"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="carlos@empresa.com.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(81) 98888-7777"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimaryContact}
                  onChange={(e) => setIsPrimaryContact(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">Definir como contato principal</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  {submitting ? 'Salvando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Visita Rápida (Seção 14) */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Registrar Visita Comercial (Seção 14)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registre a pauta da reunião com {client.tradeName}.
            </p>

            <form onSubmit={handleCreateVisit} className="space-y-3 text-xs">
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
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tipo</label>
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
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Objetivo da Visita *</label>
                <input
                  type="text"
                  required
                  value={visitObjective}
                  onChange={(e) => setVisitObjective(e.target.value)}
                  placeholder="Ex: Apresentação de cotas São João 2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">O que foi discutido?</label>
                <textarea
                  rows={2}
                  value={discussion}
                  onChange={(e) => setDiscussion(e.target.value)}
                  placeholder="Pontos tratados na reunião..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Necessidades identificadas</label>
                <textarea
                  rows={2}
                  value={needs}
                  onChange={(e) => setNeeds(e.target.value)}
                  placeholder="Demandas específicas do cliente..."
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
                  <span className="font-bold text-slate-800">Existe oportunidade de negócio identificada?</span>
                </label>

                {hasOpportunity && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Potencial Estimado (R$)</label>
                    <input
                      type="number"
                      value={potentialValue}
                      onChange={(e) => setPotentialValue(e.target.value)}
                      placeholder="Ex: 80000"
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
                    placeholder="Ex: Enviar proposta v1"
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
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xl shadow-xl my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Editar Dados do Cliente
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atualize as informações cadastrais e comerciais. Toda alteração ficará registrada na auditoria.
            </p>

            <form onSubmit={handleUpdateClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={editTradeName}
                    onChange={(e) => setEditTradeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={editLegalName}
                    onChange={(e) => setEditLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={editCnpj}
                    onChange={(e) => setEditCnpj(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Segmento</label>
                  <input
                    type="text"
                    value={editSegment}
                    onChange={(e) => setEditSegment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Áreas */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-700">Áreas Comerciais</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAreaKeys.includes('tv')}
                      onChange={() => toggleEditAreaKey('tv')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">TV Guararapes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAreaKeys.includes('gplus')}
                      onChange={() => toggleEditAreaKey('gplus')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">GPlus Digital</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAreaKeys.includes('redes_sociais')}
                      onChange={() => toggleEditAreaKey('redes_sociais')}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Redes Sociais</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="LOST">Cliente Perdido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Potencial</label>
                  <select
                    value={editPotential}
                    onChange={(e) => setEditPotential(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="STRATEGIC">Estratégico</option>
                    <option value="HIGH">Alto</option>
                    <option value="MEDIUM">Médio</option>
                    <option value="LOW">Baixo</option>
                  </select>
                </div>
              </div>

              {currentUser.roleKey === 'manager' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Executivo Responsável</label>
                  <select
                    value={editResponsibleId}
                    onChange={(e) => setEditResponsibleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {executives.map((exec) => (
                      <option key={exec.id} value={exec.id}>{exec.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Conversão Rápida em Venda */}
      {selectedOppToConvert && (
        <ConvertToSaleModal
          isOpen={!!selectedOppToConvert}
          opportunity={selectedOppToConvert}
          onClose={() => setSelectedOppToConvert(null)}
          onSuccess={() => {
            setSelectedOppToConvert(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
