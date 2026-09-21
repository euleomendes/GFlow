'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Target,
  Calendar,
  Layers,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Tv,
  ArrowRight,
  Edit3,
  CalendarCheck,
  Building2,
  Sparkles,
  Flame,
  Check,
  X,
  Search,
  ExternalLink,
  Printer,
  Download,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ProjectionsClientProps {
  currentUser: AuthenticatedUser;
  projects: any[];
  clients: any[];
  executives: any[];
  areas: any[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const STAGES = [
  { key: 'LEAD', label: '1. Lead', badgeBg: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'CONTACT', label: '2. Contato', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'MEETING', label: '3. Reunião', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'PROPOSAL', label: '4. Proposta', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'NEGOTIATION', label: '5. Negociação', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'CLOSED_WON', label: '6. Fechado', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
];

export default function ProjectionsClient({
  currentUser,
  projects,
  clients,
  executives,
  areas,
}: ProjectionsClientProps) {
  const router = useRouter();
  const isManager = currentUser.roleKey === 'manager';

  // Filters State
  const [mode, setMode] = useState<'rolling' | 'quarter'>('rolling');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [areaKey, setAreaKey] = useState('ALL');
  const [selectedExecutiveId, setSelectedExecutiveId] = useState(isManager ? 'ALL' : currentUser.id);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'CALENDAR' | 'PROJECT_FUNNEL' | 'CLIENTS' | 'GOALS'>('FORECAST');

  // Interactive Clickable Month Filter in FORECAST Tab
  // 'ALL' means consolidated 3 months, or specific monthKey e.g. "2026-09"
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');

  // Search filter for deals
  const [dealSearch, setDealSearch] = useState('');

  // Data State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Create Form State
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newProjectId, setNewProjectId] = useState('');
  const [newAreaKey, setNewAreaKey] = useState('tv');
  const [newStage, setNewStage] = useState('NEGOTIATION');
  const [newEstimatedValue, setNewEstimatedValue] = useState('');
  const [newProbability, setNewProbability] = useState('70');
  const [newExpectedCloseDate, setNewExpectedCloseDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newNextStep, setNewNextStep] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newExecutiveId, setNewExecutiveId] = useState(currentUser.id);

  // Edit Form State
  const [editStage, setEditStage] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editProbability, setEditProbability] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editNextStep, setEditNextStep] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Calendar State
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const fetchProjections = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams();
      params.set('mode', mode);
      params.set('quarter', quarter);
      params.set('year', String(year));
      params.set('areaKey', areaKey);
      if (selectedExecutiveId && selectedExecutiveId !== 'ALL') {
        params.set('executiveId', selectedExecutiveId);
      }
      if (selectedProjectId && selectedProjectId !== 'ALL') {
        params.set('projectId', selectedProjectId);
      }

      const res = await fetch(`/api/projections?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar projeções');

      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjections();
  }, [mode, quarter, year, areaKey, selectedExecutiveId, selectedProjectId]);

  // Handle Create Opportunity (Alimentação da Projeção)
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newClientId,
          projectId: newProjectId || null,
          areaKey: newAreaKey,
          stage: newStage,
          estimatedValue: parseFloat(newEstimatedValue) || 0,
          probability: parseInt(newProbability, 10) || 10,
          expectedCloseDate: newExpectedCloseDate || null,
          nextStep: newNextStep,
          notes: newNotes,
          executiveId: isManager ? newExecutiveId : currentUser.id,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao cadastrar negociação');

      setShowCreateModal(false);
      setNewEstimatedValue('');
      setNewNextStep('');
      setNewNotes('');
      fetchProjections();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (opp: any) => {
    setShowEditModal(opp);
    setEditStage(opp.stage);
    setEditValue(String(opp.estimatedValue));
    setEditProbability(String(opp.probability));
    setEditDeadline(
      opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split('T')[0] : ''
    );
    setEditProjectId(opp.projectId || '');
    setEditNextStep(opp.nextStep || '');
    setEditNotes(opp.notes || '');
    setModalError('');
  };

  // Save Edit (Alimentação / Atualização Rápida de Follow-up)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setSubmitting(true);
    setModalError('');

    try {
      const res = await fetch(`/api/opportunities/${showEditModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: editStage,
          estimatedValue: parseFloat(editValue) || 0,
          probability: parseInt(editProbability, 10) || 10,
          expectedCloseDate: editDeadline || null,
          projectId: editProjectId || null,
          nextStep: editNextStep,
          notes: editNotes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao atualizar negociação');

      setShowEditModal(null);
      fetchProjections();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Exportação CSV com compatibilidade nativa para Microsoft Excel no Brasil
   * UTF-8 com BOM (\uFEFF) e delimitador ';'
   */
  const handleExportCSV = () => {
    if (!data?.allOpportunities || data.allOpportunities.length === 0) {
      alert('Não há dados de negociações para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'Cliente',
      'Projeto Comercial',
      'Área',
      'Executivo Responsável',
      'Etapa Atual',
      'Valor Estimado (R$)',
      'Probabilidade (%)',
      'Valor Ponderado (R$)',
      'Prazo Previsto (Deadline)',
      'Status do Prazo',
      'Próximo Passo / Acompanhamento',
      'Status da Negociação',
    ];

    const rows = data.allOpportunities.map((opp: any) => [
      `"${(opp.client?.tradeName || opp.client?.legalName || '').replace(/"/g, '""')}"`,
      `"${(opp.project?.name || 'Sem Projeto').replace(/"/g, '""')}"`,
      `"${opp.area?.name || ''}"`,
      `"${(opp.executive?.name || '').replace(/"/g, '""')}"`,
      `"${opp.stage}"`,
      opp.estimatedValue || 0,
      `${opp.probability || 0}%`,
      opp.weightedValue || 0,
      `"${opp.formattedCloseDate || ''}"`,
      `"${opp.deadlineStatus}"`,
      `"${(opp.nextStep || '').replace(/"/g, '""')}"`,
      `"${opp.status}"`,
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map((r: any) => r.join(';')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gflow_projecoes_forecast_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered Opportunities for the Deals Section in Forecast Tab
  const displayedOpportunities = useMemo(() => {
    if (!data?.allOpportunities) return [];

    return data.allOpportunities.filter((opp: any) => {
      // Month filter
      if (selectedMonthFilter !== 'ALL') {
        if (opp.monthKey !== selectedMonthFilter) return false;
      }

      // Search
      if (dealSearch.trim()) {
        const q = dealSearch.toLowerCase();
        const clientName = (opp.client.tradeName || opp.client.legalName || '').toLowerCase();
        const projectName = (opp.project?.name || '').toLowerCase();
        const execName = (opp.executive?.name || '').toLowerCase();
        const nextStep = (opp.nextStep || '').toLowerCase();
        if (!clientName.includes(q) && !projectName.includes(q) && !execName.includes(q) && !nextStep.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedMonthFilter, dealSearch]);

  // Specific Project for Project Funnel Tab
  const activeProjectData = useMemo(() => {
    if (!data?.projectsList) return null;
    if (selectedProjectId !== 'ALL') {
      return data.projectsList.find((p: any) => p.id === selectedProjectId) || data.projectsList[0];
    }
    // Find Carnaval project if exists, otherwise first project
    const carnavalPrj = data.projectsList.find((p: any) => p.name.toLowerCase().includes('carnaval'));
    return carnavalPrj || data.projectsList[0] || null;
  }, [data, selectedProjectId]);

  // Calendar calculations
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean; events: any[] }> = [];

    // Empty previous days
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false, events: [] });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = (data?.calendarEvents || []).filter((evt: any) => evt.date === dateStr);
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true, events });
    }

    return days;
  }, [calendarMonthIndex, calendarYear, data?.calendarEvents]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-deep-space text-white shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-ink-black tracking-tight">
                Projeções Comerciais & Forecast
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Alimentação de negociações por executivo, projeção trimestral clicável, calendário e funil de projetos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Exportar, Imprimir PDF e Alimentar Projeção */}
        <div className="flex items-center flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors"
            title="Exportar dados para Excel / Planilha CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Planilha</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors"
            title="Imprimir relatório limpo ou Salvar como PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-slate hover:bg-deep-space text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Alimentar Negociação</span>
          </button>
        </div>
      </div>

      {/* BARRA DE CONTROLE & FILTROS GLOBAIS */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Selector: 3 Meses Deslizantes vs Trimestre Específico */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('rolling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'rolling'
                  ? 'bg-white text-ink-black shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Janela 3 Meses
            </button>
            <button
              type="button"
              onClick={() => setMode('quarter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'quarter'
                  ? 'bg-white text-ink-black shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre (Q1-Q4)
            </button>
          </div>

          {/* Quarter & Year Selectors (if mode === 'quarter') */}
          {mode === 'quarter' && (
            <div className="flex items-center gap-2">
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black focus:ring-2 focus:ring-blue-slate"
              >
                <option value="Q1">1º Trimestre (Jan - Mar)</option>
                <option value="Q2">2º Trimestre (Abr - Jun)</option>
                <option value="Q3">3º Trimestre (Jul - Set)</option>
                <option value="Q4">4º Trimestre (Out - Dez)</option>
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}

          {/* Area Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAreaKey('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                areaKey === 'ALL' ? 'bg-white text-ink-black shadow-xs' : 'text-slate-600'
              }`}
            >
              Todas Áreas
            </button>
            <button
              type="button"
              onClick={() => setAreaKey('tv')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                areaKey === 'tv' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              TV Guararapes
            </button>
            <button
              type="button"
              onClick={() => setAreaKey('gplus')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                areaKey === 'gplus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              GPlus Digital
            </button>
            <button
              type="button"
              onClick={() => setAreaKey('redes_sociais')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                areaKey === 'redes_sociais' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Redes Sociais
            </button>
          </div>

          {/* Executive Filter (Manager only) */}
          {isManager && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Executivo:</span>
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black max-w-[180px]"
              >
                <option value="ALL">Toda a Equipe</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Projeto:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black max-w-[200px]"
            >
              <option value="ALL">Todos os Projetos</option>
              {projects.map((prj) => (
                <option key={prj.id} value={prj.id}>
                  {prj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="border-t border-slate-200 pt-3 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('FORECAST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'FORECAST'
                ? 'bg-ink-black text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-black hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Trimestre & Mês a Mês (Clicável)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'CALENDAR'
                ? 'bg-ink-black text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-black hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Calendário de Prazos (Deadlines)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROJECT_FUNNEL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'PROJECT_FUNNEL'
                ? 'bg-ink-black text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-black hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>3. Funil por Projeto (Carnaval, etc.)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CLIENTS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'CLIENTS'
                ? 'bg-ink-black text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-black hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>4. Por Cliente & Executivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GOALS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'GOALS'
                ? 'bg-ink-black text-white shadow-xs'
                : 'text-slate-600 hover:text-ink-black hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>5. Metas: O Que Tem Pra Acontecer</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-300 rounded-xl p-12 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-blue-slate border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600">Calculando projeções e consolidando métricas comerciais...</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-medium">{errorMessage}</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ========================================================================= */}
          {/* ABA 1: TRIMESTRE & MÊS A MÊS (PROJEÇÃO CLICÁVEL) */}
          {/* ========================================================================= */}
          {activeTab === 'FORECAST' && (
            <div className="space-y-6">
              {/* Card Hero Consolidado do Trimestre */}
              <div className="bg-gradient-to-br from-deep-space via-ink-black to-slate-900 border border-slate-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-slate text-white mb-1.5">
                      {data.quarterLabel}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Projeção Consolidada dos 3 Meses
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Soma das vendas já realizadas e das negociações ponderadas por probabilidade.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-dusty-denim block">
                      Atingimento Estimado da Meta Trimestral
                    </span>
                    <div className="text-3xl font-black text-emerald-400 leading-tight">
                      {data.consolidatedQuarter.quarterAttainmentPercent}%
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Realizado: {data.consolidatedQuarter.quarterRealizedPercent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-dusty-denim block">Meta Trimestre</span>
                    <span className="text-lg font-black text-white">
                      {formatCurrency(data.consolidatedQuarter.totalGoal)}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Já Fechado (Realizado)</span>
                    <span className="text-lg font-black text-emerald-400">
                      {formatCurrency(data.consolidatedQuarter.totalRealized)}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-dusty-denim block">Em Negociação (Bruto)</span>
                    <span className="text-lg font-black text-slate-200">
                      {formatCurrency(data.consolidatedQuarter.totalProjectedGross)}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-400/30">
                    <span className="text-[10px] uppercase font-bold text-blue-300 block">Projeção Final Ponderada</span>
                    <span className="text-lg font-black text-blue-300">
                      {formatCurrency(data.consolidatedQuarter.totalForecast)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DOS 3 MESES (CLICÁVEL PARA VER CADA VEZ) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-black text-ink-black uppercase tracking-wider">
                      Projeção Individual dos 3 Meses (Clique para Detalhar)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Clique no card de um mês para listar instantaneamente apenas as negociações daquele período.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      selectedMonthFilter === 'ALL'
                        ? 'bg-blue-slate text-white border-blue-slate shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Ver Todos os 3 Meses
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.monthlyBreakdown.map((m: any) => {
                    const isSelected = selectedMonthFilter === m.monthKey;

                    return (
                      <div
                        key={m.monthKey}
                        onClick={() => setSelectedMonthFilter(isSelected ? 'ALL' : m.monthKey)}
                        className={`cursor-pointer bg-white rounded-2xl p-5 border transition-all duration-200 ${
                          isSelected
                            ? 'border-2 border-blue-slate ring-2 ring-blue-slate/20 shadow-md transform -translate-y-0.5'
                            : 'border-slate-300 shadow-sm hover:border-slate-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                              {m.year}
                            </span>
                            <h4 className="text-lg font-black text-ink-black">
                              {m.monthName}
                            </h4>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              m.attainmentPercent >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.attainmentPercent >= 70
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.attainmentPercent}%
                          </span>
                        </div>

                        <div className="mt-4 space-y-2.5 text-xs">
                          <div className="flex justify-between items-baseline">
                            <span className="text-slate-500 font-medium">Meta do Mês:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(m.targetGoal)}</span>
                          </div>

                          <div className="flex justify-between items-baseline">
                            <span className="text-slate-500 font-medium">Realizado (Fechado):</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(m.realizedRevenue)}</span>
                          </div>

                          <div className="flex justify-between items-baseline">
                            <span className="text-slate-500 font-medium">Em Negociação (Ponderado):</span>
                            <span className="font-bold text-blue-600">{formatCurrency(m.projectedWeighted)}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                            <span className="font-bold text-slate-800">Projeção Final:</span>
                            <span className="font-black text-base text-ink-black">{formatCurrency(m.forecastTotal)}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                m.attainmentPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(m.attainmentPercent, 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                            <span>{m.opportunitiesCount} negociações</span>
                            <span className="font-bold text-blue-slate">
                              {isSelected ? '✓ Filtrado' : 'Clique para ver negociações →'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LISTA DAS NEGOCIAÇÕES DO PERÍODO SELECIONADO */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-black text-ink-black flex items-center gap-2">
                      <span>Negociações Projetadas</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {displayedOpportunities.length} negócios
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedMonthFilter === 'ALL'
                        ? 'Exibindo todos os negócios da projeção trimestral.'
                        : `Exibindo apenas negociações previstas para o mês filtrado (${selectedMonthFilter}).`}
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72 print:hidden">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, projeto..."
                      value={dealSearch}
                      onChange={(e) => setDealSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black focus:outline-none focus:ring-2 focus:ring-blue-slate"
                    />
                  </div>
                </div>

                {displayedOpportunities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Nenhuma negociação encontrada para o filtro selecionado.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {displayedOpportunities.map((opp: any) => {
                      const stageObj = STAGES.find((s) => s.key === opp.stage) || STAGES[0];

                      return (
                        <div
                          key={opp.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-ink-black">
                                {opp.client.tradeName || opp.client.legalName}
                              </span>

                              {opp.project && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                  <Briefcase className="w-3 h-3" />
                                  {opp.project.name}
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stageObj.badgeBg}`}
                              >
                                {stageObj.label}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  opp.area.key === 'tv'
                                    ? 'bg-blue-50 text-blue-700'
                                    : opp.area.key === 'gplus'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-purple-50 text-purple-700'
                                }`}
                              >
                                {opp.area.name}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span>
                                Executivo: <strong className="text-slate-700">{opp.executive.name}</strong>
                              </span>
                              <span>
                                Deadline: <strong className={opp.deadlineStatus === 'OVERDUE' ? 'text-red-600' : 'text-slate-700'}>
                                  {opp.formattedCloseDate}
                                </strong>
                              </span>
                              {opp.nextStep && (
                                <span className="truncate max-w-xs text-slate-600">
                                  Acompanhamento: <em>{opp.nextStep}</em>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Values & Action */}
                          <div className="flex items-center justify-between md:justify-end gap-4 min-w-[220px]">
                            <div className="text-right">
                              <div className="text-sm font-black text-ink-black">
                                {formatCurrency(opp.estimatedValue)}
                              </div>
                              <div className="text-[11px] text-blue-600 font-bold">
                                {opp.probability}% conf. → {formatCurrency(opp.weightedValue)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(opp)}
                              className="p-2 text-slate-500 hover:text-blue-slate hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors print:hidden"
                              title="Atualizar Follow-up / Projeção"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: CALENDÁRIO COMERCIAL DE DEADLINES */}
          {/* ========================================================================= */}
          {activeTab === 'CALENDAR' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-black text-ink-black flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-slate" />
                      <span>Calendário Comercial de Fechamentos & Deadlines</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Acompanhe as datas previstas de fechamento das negociações para não perder prazos comerciais.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonthIndex === 0) {
                          setCalendarMonthIndex(11);
                          setCalendarYear((prev) => prev - 1);
                        } else {
                          setCalendarMonthIndex((prev) => prev - 1);
                        }
                      }}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black text-ink-black min-w-[140px] text-center">
                      {monthNames[calendarMonthIndex]} {calendarYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonthIndex === 11) {
                          setCalendarMonthIndex(0);
                          setCalendarYear((prev) => prev + 1);
                        } else {
                          setCalendarMonthIndex((prev) => prev + 1);
                        }
                      }}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex flex-wrap items-center gap-4 py-3 border-b border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 font-medium">Fechado / Ganho</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span className="text-slate-600 font-medium">Negociação Dentro do Prazo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 font-medium">Vence em até 7 Dias</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-600 font-medium">Prazo Vencido (Atrasado)</span>
                  </div>
                </div>

                {/* Grade do Calendário */}
                <div className="mt-4">
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 pb-2 border-b border-slate-200">
                    <div>Dom</div>
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mt-2">
                    {calendarGrid.map((day, idx) => {
                      if (!day.isCurrentMonth) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="min-h-[90px] p-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
                          />
                        );
                      }

                      return (
                        <div
                          key={`day-${day.dayNumber}`}
                          className="min-h-[90px] p-2 bg-white rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700">
                              {day.dayNumber}
                            </span>
                            {day.events.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-slate text-white">
                                {day.events.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 mt-1 overflow-y-auto max-h-[75px]">
                            {day.events.map((evt: any) => {
                              let bgBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                              if (evt.deadlineStatus === 'WON') bgBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                              else if (evt.deadlineStatus === 'OVERDUE') bgBadge = 'bg-red-50 text-red-800 border-red-300';
                              else if (evt.deadlineStatus === 'DUE_SOON') bgBadge = 'bg-amber-50 text-amber-800 border-amber-300';

                              return (
                                <div
                                  key={evt.id}
                                  className={`p-1 rounded text-[10px] font-bold border truncate ${bgBadge}`}
                                  title={`${evt.title} (${evt.executiveName})`}
                                >
                                  {evt.clientName} • {formatCurrency(evt.value)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: FUNIL POR PROJETO (EX: CARNAVAL GUARARAPES) */}
          {/* ========================================================================= */}
          {activeTab === 'PROJECT_FUNNEL' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Funil Comercial de Projetos Especiais
                    </span>
                    <h2 className="text-xl font-black text-ink-black mt-1">
                      {activeProjectData?.name || 'Selecione um Projeto'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visualização completa do que já está fechado vs o que está em negociação, por cliente e executivo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Mudar Projeto:</span>
                    <select
                      value={activeProjectData?.id || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeProjectData && (
                  <>
                    {/* KPIs do Projeto */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-300">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Valoração / Cota</span>
                        <div className="text-lg font-black text-slate-900 mt-1">
                          {formatCurrency(activeProjectData.totalValuation)}
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Já Fechado (Vendido)</span>
                        <div className="text-lg font-black text-emerald-800 mt-1">
                          {formatCurrency(activeProjectData.totalRealized)}
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-300">
                        <span className="text-[10px] font-bold uppercase text-blue-700 block">Em Negociação Ativa</span>
                        <div className="text-lg font-black text-blue-800 mt-1">
                          {formatCurrency(activeProjectData.totalNegotiating)}
                        </div>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-300">
                        <span className="text-[10px] font-bold uppercase text-purple-700 block">Projeção Ponderada</span>
                        <div className="text-lg font-black text-purple-800 mt-1">
                          {formatCurrency(activeProjectData.totalWeighted)}
                        </div>
                      </div>
                    </div>

                    {/* FUNIL VISUAL DAS ETAPAS DO PROJETO */}
                    <div className="my-6 p-5 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-ink-black">
                        Funil de Conversão do Projeto
                      </h4>

                      <div className="space-y-2">
                        {STAGES.map((s) => {
                          const stageData = activeProjectData.stages?.[s.key] || { count: 0, value: 0 };
                          const totalBase = (activeProjectData.totalRealized + activeProjectData.totalNegotiating) || 1;
                          const percent = Math.round((stageData.value / totalBase) * 100);

                          return (
                            <div key={s.key} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-slate-700">
                                  {s.label} ({stageData.count} negócios)
                                </span>
                                <span className="font-black text-ink-black">
                                  {formatCurrency(stageData.value)}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    s.key === 'CLOSED_WON' ? 'bg-emerald-500' : 'bg-blue-slate'
                                  }`}
                                  style={{ width: `${Math.max(percent, 2)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* TABELA DE CLIENTES NO PROJETO */}
                    <div className="space-y-3 mt-6">
                      <h4 className="text-xs font-black uppercase tracking-wider text-ink-black">
                        Clientes Negociando ou Fechados no Projeto
                      </h4>

                      {activeProjectData.clients?.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          Nenhum cliente com proposta ou venda ativa vinculada a este projeto.
                        </p>
                      ) : (
                        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-300">
                              <tr>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Já Fechado</th>
                                <th className="p-3">Em Negociação</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {activeProjectData.clients?.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-ink-black">{c.name}</td>
                                  <td className="p-3 font-bold text-emerald-600">{formatCurrency(c.realized)}</td>
                                  <td className="p-3 font-bold text-blue-600">{formatCurrency(c.negotiating)}</td>
                                  <td className="p-3">
                                    {c.realized > 0 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        Cota Garantida
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                        Em Negociação
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: POR CLIENTE & EXECUTIVO */}
          {/* ========================================================================= */}
          {activeTab === 'CLIENTS' && (
            <div className="space-y-6">
              {/* Raio-X por Cliente */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <h3 className="text-base font-black text-ink-black">
                    Carteira de Clientes: Fechado vs Em Negociação
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhamento do que cada cliente tem investido e quais negócios estão abertos na mesa.
                  </p>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-300">
                      <tr>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Vendas Fechadas</th>
                        <th className="p-3">Em Negociação</th>
                        <th className="p-3">Ponderado</th>
                        <th className="p-3">Negócios Ativos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.activeClientsList?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-ink-black">
                            {c.tradeName || c.legalName}
                          </td>
                          <td className="p-3 font-bold text-emerald-600">{formatCurrency(c.totalRealized)}</td>
                          <td className="p-3 font-bold text-blue-600">{formatCurrency(c.totalNegotiating)}</td>
                          <td className="p-3 font-bold text-purple-600">{formatCurrency(c.totalWeighted)}</td>
                          <td className="p-3 text-slate-600">
                            {c.activeOpportunities.length} negociações
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raio-X por Executivo (se gerente ou multi-executivos) */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <h3 className="text-base font-black text-ink-black">
                    Desempenho & Projeção por Executivo Comercial
                  </h3>
                  <p className="text-xs text-slate-500">
                    Metas, vendas fechadas e pipeline projetado por profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.executivesSummary?.map((exec: any) => (
                    <div
                      key={exec.id}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-slate text-white flex items-center justify-center font-bold text-xs">
                            {exec.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-ink-black block">{exec.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {exec.salesCount} vendas • {exec.oppsCount} negociações
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black ${
                            exec.attainment >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {exec.attainment}% Proj.
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-200">
                        <div>
                          <span className="text-slate-400 block">Meta</span>
                          <strong className="text-slate-800">{formatCurrency(exec.goal)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Fechado</span>
                          <strong className="text-emerald-600">{formatCurrency(exec.realized)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Projeção Final</span>
                          <strong className="text-blue-600">{formatCurrency(exec.forecast)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 5: METAS: O QUE TEM PRA ACONTECER */}
          {/* ========================================================================= */}
          {activeTab === 'GOALS' && (
            <div className="space-y-6">
              {/* Termômetro da Meta */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    Termômetro de Metas Comerciais
                  </span>
                  <h2 className="text-xl font-black text-ink-black mt-1">
                    Como Está a Meta e O Que Tem Pra Acontecer
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Análise preditiva do fechamento do mês: o que já é garantido vs as negociações que decidirão a meta.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-300">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Meta Estabelecida</span>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {formatCurrency(data.whatNeedsToHappen.currentGoal)}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Já Fechado (Garantido)</span>
                    <div className="text-xl font-black text-emerald-800 mt-1">
                      {formatCurrency(data.whatNeedsToHappen.realized)}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-300">
                    <span className="text-[10px] font-bold uppercase text-blue-700 block">Previsão Ponderada Aberta</span>
                    <div className="text-xl font-black text-blue-800 mt-1">
                      {formatCurrency(data.whatNeedsToHappen.weighted)}
                    </div>
                  </div>

                  <div className="p-4 bg-deep-space text-white rounded-xl border border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-dusty-denim block">Previsão de Fechamento</span>
                    <div className="text-xl font-black text-white mt-1">
                      {formatCurrency(data.whatNeedsToHappen.forecastFinal)}
                    </div>
                  </div>
                </div>

                {/* Termômetro visual amplo */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
                  <div className="flex justify-between items-baseline text-xs font-bold">
                    <span className="text-slate-700">Progresso Atual Rumo à Meta:</span>
                    <span className="text-ink-black">
                      {data.whatNeedsToHappen.currentGoal > 0
                        ? Math.round((data.whatNeedsToHappen.forecastFinal / data.whatNeedsToHappen.currentGoal) * 100)
                        : 0}% da meta projetada
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          data.whatNeedsToHappen.currentGoal > 0
                            ? (data.whatNeedsToHappen.realized / data.whatNeedsToHappen.currentGoal) * 100
                            : 0,
                          100
                        )}%`,
                      }}
                      title="Realizado"
                    />
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          data.whatNeedsToHappen.currentGoal > 0
                            ? (data.whatNeedsToHappen.weighted / data.whatNeedsToHappen.currentGoal) * 100
                            : 0,
                          100
                        )}%`,
                      }}
                      title="Ponderado Aberto"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Realizado
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> O que tem pra acontecer (Ponderado)
                    </span>
                    <span>
                      {data.whatNeedsToHappen.gapRemaining > 0 ? (
                        <strong className="text-amber-600">
                          Faltam {formatCurrency(data.whatNeedsToHappen.gapRemaining)}
                        </strong>
                      ) : (
                        <strong className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Meta Batida na Projeção!
                        </strong>
                      )}
                    </span>
                  </div>
                </div>

                {/* Negócios Decisivos para Bater a Meta */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-ink-black">
                      Negócios Decisivos: O Que Precisa Fechar Para Superar a Meta
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-300 rounded-xl overflow-hidden">
                    {data.whatNeedsToHappen.highProbabilityDeals?.map((deal: any) => (
                      <div
                        key={deal.id}
                        className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink-black">
                              {deal.client.tradeName || deal.client.legalName}
                            </span>
                            {deal.project && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700">
                                {deal.project.name}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {deal.probability}% de chance
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1">
                            Acompanhamento / Próximo Passo:{' '}
                            <strong className="text-slate-700">
                              {deal.nextStep || 'Aguardando retorno do cliente'}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-black text-ink-black block">
                              {formatCurrency(deal.estimatedValue)}
                            </span>
                            <span className="text-[11px] text-blue-600 font-bold">
                              Ponderado: {formatCurrency(deal.weightedValue)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(deal)}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="Atualizar Follow-up"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALIMENTAR / NOVA NEGOCIAÇÃO PROJETADA */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-ink-black">
                  Alimentar Nova Negociação / Projeção
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastre o negócio com valor, probabilidade, deadline e projeto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Projeto Especial (Opcional)
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  >
                    <option value="">Sem Projeto (Carteira Regular)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Área Comercial *
                  </label>
                  <select
                    value={newAreaKey}
                    onChange={(e) => setNewAreaKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  >
                    <option value="tv">TV Guararapes</option>
                    <option value="gplus">GPlus Digital</option>
                    <option value="redes_sociais">Redes Sociais</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Valor Estimado (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newEstimatedValue}
                    onChange={(e) => setNewEstimatedValue(e.target.value)}
                    placeholder="Ex: 85000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Probabilidade (% de Confiança) *
                  </label>
                  <select
                    value={newProbability}
                    onChange={(e) => setNewProbability(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                  >
                    <option value="10">10% — Prospecção Inicial</option>
                    <option value="30">30% — Contato / Briefing</option>
                    <option value="50">50% — Reunião Realizada</option>
                    <option value="70">70% — Proposta sob Análise</option>
                    <option value="90">90% — Em Negociação Final</option>
                    <option value="100">100% — Fechado Ganho</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Data Prevista (Deadline) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpectedCloseDate}
                    onChange={(e) => setNewExpectedCloseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Etapa Atual *
                  </label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isManager && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Executivo Responsável
                  </label>
                  <select
                    value={newExecutiveId}
                    onChange={(e) => setNewExecutiveId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  >
                    {executives.map((exec) => (
                      <option key={exec.id} value={exec.id}>
                        {exec.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Próximo Passo do Acompanhamento
                </label>
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="Ex: Apresentar cota de patrocínio na terça-feira"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-slate hover:bg-deep-space text-white font-bold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Negociação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ATUALIZAÇÃO RÁPIDA DE FOLLOW-UP / PROJEÇÃO */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-ink-black">
                  Atualizar Projeção & Follow-up
                </h3>
                <p className="text-xs text-slate-500">
                  {showEditModal.client.tradeName || showEditModal.client.legalName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Etapa Atual
                  </label>
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Probabilidade (% Confiança)
                  </label>
                  <select
                    value={editProbability}
                    onChange={(e) => setEditProbability(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                  >
                    <option value="10">10% — Lead Inicial</option>
                    <option value="30">30% — Contato</option>
                    <option value="50">50% — Reunião</option>
                    <option value="70">70% — Proposta</option>
                    <option value="90">90% — Negociação</option>
                    <option value="100">100% — Fechado Ganho</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-ink-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Data Prevista (Deadline)
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Projeto Vinculado
                </label>
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                >
                  <option value="">Sem Projeto (Regular)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Próximo Passo / Acompanhamento
                </label>
                <input
                  type="text"
                  value={editNextStep}
                  onChange={(e) => setEditNextStep(e.target.value)}
                  placeholder="Ex: Enviar minuta de contrato para jurídico"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-ink-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-slate hover:bg-deep-space text-white font-bold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
