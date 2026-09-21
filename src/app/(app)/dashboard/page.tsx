import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ExecutiveSelector from './ExecutiveSelector';
import {
  calculateExecutiveMonthlyEvolution,
  calculateExecutiveDistribution,
} from '@/lib/metrics';
import {
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarCheck,
  Briefcase,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Shield,
  Activity,
  Layers,
  Tv,
  PieChart,
  BarChart3,
  Award,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { area?: string; period?: string; executiveId?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isManager = user.roleKey === 'manager';
  const selectedAreaKey = searchParams?.area || 'all';
  const selectedExecutiveId = isManager ? (searchParams?.executiveId || 'all') : user.id;

  // Lista de executivos ativos cadastrados na emissora para o seletor do gerente
  const executives = isManager
    ? await prisma.user.findMany({
        where: {
          role: { key: 'executive' },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      })
    : [];

  const selectedExecutive = isManager && selectedExecutiveId !== 'all'
    ? executives.find((e) => e.id === selectedExecutiveId)
    : null;

  // Executivo efetivo para filtragem:
  // - Se usuário logado for executivo: somente seus próprios dados (user.id)
  // - Se gerente e escolheu um executivo específico: filtra por ele
  // - Se gerente e escolheu 'all': visão consolidada de toda a equipe
  const effectiveExecutiveId = !isManager
    ? user.id
    : selectedExecutive
    ? selectedExecutive.id
    : undefined;

  // 1. Áreas cadastradas
  const areas = await prisma.area.findMany();
  const tvArea = areas.find((a) => a.key === 'tv');
  const gplusArea = areas.find((a) => a.key === 'gplus');

  // Filtros aplicados baseados no perfil e query param
  const areaFilter =
    selectedAreaKey === 'tv' && tvArea
      ? { areaId: tvArea.id }
      : selectedAreaKey === 'gplus' && gplusArea
      ? { areaId: gplusArea.id }
      : {};

  const userFilter = effectiveExecutiveId ? { executiveId: effectiveExecutiveId } : {};
  const clientUserFilter = effectiveExecutiveId ? { responsibleUserId: effectiveExecutiveId } : {};

  // 2. Vendas Realizadas
  const sales = await prisma.sale.findMany({
    where: {
      ...areaFilter,
      ...userFilter,
    },
    include: {
      client: true,
      executive: true,
      area: true,
    },
    orderBy: { closedAt: 'desc' },
  });

  const totalSales = sales.reduce((acc, curr) => acc + curr.value, 0);

  // 3. Metas (atribuídas pelo gerente para cada executivo ou consolidadas)
  const goals = await prisma.goal.findMany({
    where: {
      ...(selectedAreaKey === 'tv' && tvArea
        ? { areaId: tvArea.id }
        : selectedAreaKey === 'gplus' && gplusArea
        ? { areaId: gplusArea.id }
        : {}),
      ...(effectiveExecutiveId ? { executiveId: effectiveExecutiveId } : {}),
    },
  });

  const totalGoal = goals.reduce((acc, curr) => acc + curr.targetValue, 0) || 500000;
  const goalProgress = totalGoal > 0 ? Math.min(Math.round((totalSales / totalGoal) * 100), 100) : 0;

  // 4. Oportunidades & Pipeline
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: 'OPEN',
      ...areaFilter,
      ...userFilter,
    },
    include: {
      client: true,
      area: true,
    },
    orderBy: { estimatedValue: 'desc' },
  });

  const pipelineTotal = opportunities.reduce((acc, curr) => acc + curr.estimatedValue, 0);
  const weightedPipeline = opportunities.reduce(
    (acc, curr) => acc + (curr.estimatedValue * curr.probability) / 100,
    0
  );

  // 5. Clientes
  const activeClientsCount = await prisma.client.count({
    where: {
      status: 'ACTIVE',
      ...clientUserFilter,
    },
  });

  // 6. Visitas
  const visits = await prisma.visit.findMany({
    where: {
      ...userFilter,
    },
    include: {
      client: true,
      executive: true,
    },
    orderBy: { visitDate: 'desc' },
    take: 5,
  });

  const totalVisitsCount = await prisma.visit.count({
    where: {
      ...userFilter,
    },
  });

  // 7. Auditoria recente (Gerente)
  const recentAuditLogs = isManager
    ? await prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { actorUser: true },
      })
    : [];

  // Vendas por Área (TV vs GPlus)
  const tvSales = sales.filter((s) => s.area?.key === 'tv').reduce((acc, curr) => acc + curr.value, 0);
  const gplusSales = sales.filter((s) => s.area?.key === 'gplus').reduce((acc, curr) => acc + curr.value, 0);

  // 8. Métricas de Evolução e Distribuição (Evolutivo e Pizza)
  const evolution = calculateExecutiveMonthlyEvolution(sales, goals, 4);
  const distribution = calculateExecutiveDistribution(sales);

  // Parâmetros do Gráfico de Pizza / Donut SVG
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const tvDistItem = distribution.items.find((i) => i.key === 'tv');
  const gplusDistItem = distribution.items.find((i) => i.key === 'gplus');
  const tvPercent = tvDistItem?.percentage || 0;
  const gplusPercent = gplusDistItem?.percentage || 0;

  const tvStrokeDash = (tvPercent / 100) * donutCircumference;
  const gplusStrokeDash = (gplusPercent / 100) * donutCircumference;
  const gplusStrokeOffset = -tvStrokeDash;

  // Valor máximo para escala das barras evolutivas
  const maxEvolutionValue = Math.max(
    ...evolution.monthlyData.map((m) => Math.max(m.realizedRevenue, m.targetGoal)),
    100000
  );

  function buildFilterUrl(areaKey: string, execId: string) {
    const params = new URLSearchParams();
    if (areaKey && areaKey !== 'all') params.set('area', areaKey);
    if (execId && execId !== 'all') params.set('executiveId', execId);
    const qs = params.toString();
    return `/dashboard${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="space-y-8">
      {/* Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isManager
                ? selectedExecutive
                  ? `Overview: ${selectedExecutive.name}`
                  : 'Dashboard Gerencial & Comercial'
                : `Olá, ${user.name}`}
            </h1>
            {isManager && selectedExecutive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Visão Individual
              </span>
            )}
            {isManager && !selectedExecutive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Consolidado da Emissora
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? selectedExecutive
                ? `Acompanhamento individual de metas atribuídas, pipeline, vendas e visitas de ${selectedExecutive.name}.`
                : 'Visão consolidada de performance comercial de toda a equipe, pipeline e metas da TV Guararapes.'
              : 'Seu painel individual de acompanhamento de metas, clientes e oportunidades.'}
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Executivos (Exclusivo Gerente) */}
          {isManager && executives.length > 0 && (
            <ExecutiveSelector
              executives={executives}
              selectedExecutiveId={selectedExecutiveId}
              selectedAreaKey={selectedAreaKey}
            />
          )}

          {/* Seletor de Área (TV / GPlus / Todas) */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
            <Link
              href={buildFilterUrl('all', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas Áreas
            </Link>
            <Link
              href={buildFilterUrl('tv', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'tv'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              TV
            </Link>
            <Link
              href={buildFilterUrl('gplus', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'gplus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              GPlus
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vendas Realizadas */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vendas Fechadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totalSales)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-emerald-600">{sales.length} vendas</span>
              <span>no período</span>
            </div>
          </div>
        </div>

        {/* Card 2: Meta e Atingimento */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meta do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totalGoal)}
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {goalProgress}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              />
            </div>
            {isManager && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Atribuída pelo Gerente</span>
                <Link
                  href="/metas"
                  className="text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-0.5"
                >
                  <span>Gerenciar metas</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Pipeline de Oportunidades */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pipeline Aberto
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(pipelineTotal)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Ponderado: {formatCurrency(weightedPipeline)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Clientes Ativos & Visitas */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Clientes Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {activeClientsCount}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-purple-700">{totalVisitsCount} visitas</span>
              <span>registradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: EVOLUÇÃO COMERCIAL & DISTRIBUIÇÃO (GRÁFICO EVOLUTIVO E PIZZA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Evolução Mensal de Vendas e Metas (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Evolução de Vendas & Metas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Acompanhamento histórico mensal de faturamento versus meta
                  </p>
                </div>
              </div>

              {/* Indicador de MoM (Crescimento sobre o mês anterior) */}
              {evolution.momGrowth !== null && (
                <div
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full self-start sm:self-auto ${
                    evolution.momGrowth >= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {evolution.momGrowth >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {evolution.momGrowth >= 0 ? `+${evolution.momGrowth}%` : `${evolution.momGrowth}%`}
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">MoM</span>
                </div>
              )}
            </div>

            {/* Gráfico de Barras Evolutivas */}
            <div className="mt-3 pt-2">
              {/* Legenda do Gráfico */}
              <div className="flex items-center justify-end gap-4 text-[11px] text-slate-500 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                  <span className="font-medium text-slate-700">Realizado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-300 border-dashed inline-block" />
                  <span className="font-medium text-slate-500">Meta</span>
                </div>
              </div>

              {/* Colunas dos Meses */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 pt-2 pb-1 border-b border-slate-100">
                {evolution.monthlyData.map((m) => {
                  const barHeightPercent = maxEvolutionValue > 0
                    ? Math.min(Math.round((m.realizedRevenue / maxEvolutionValue) * 100), 100)
                    : 0;
                  const goalHeightPercent = maxEvolutionValue > 0
                    ? Math.min(Math.round((m.targetGoal / maxEvolutionValue) * 100), 100)
                    : 0;

                  return (
                    <div key={m.monthKey} className="flex flex-col items-center">
                      {/* Badge de Atingimento */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-2 transition-all ${
                          m.attainmentPercent >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.attainmentPercent >= 80
                            ? 'bg-blue-100 text-blue-800'
                            : m.attainmentPercent > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {m.attainmentPercent > 0 ? `${m.attainmentPercent}%` : '0%'}
                      </span>

                      {/* Recipiente de Barras */}
                      <div className="h-32 w-full flex items-end justify-center gap-1 sm:gap-2 px-1 bg-slate-50/70 border border-slate-100 rounded-lg p-1.5">
                        {/* Barra Meta */}
                        <div className="w-1/2 flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-slate-200/90 border border-dashed border-slate-300 rounded-t transition-all duration-500 hover:bg-slate-300"
                            style={{ height: `${Math.max(goalHeightPercent, 4)}%` }}
                            title={`Meta: ${formatCurrency(m.targetGoal)}`}
                          />
                        </div>

                        {/* Barra Realizado */}
                        <div className="w-1/2 flex flex-col items-center justify-end h-full">
                          <div
                            className={`w-full rounded-t transition-all duration-500 ${
                              m.attainmentPercent >= 100
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                            }`}
                            style={{ height: `${Math.max(barHeightPercent, 4)}%` }}
                            title={`Realizado: ${formatCurrency(m.realizedRevenue)}`}
                          />
                        </div>
                      </div>

                      {/* Rótulo do Mês e Valores */}
                      <span className="text-xs font-bold text-slate-800 mt-2">{m.label}</span>
                      <span className="text-[10px] font-bold text-slate-900 mt-0.5">
                        {formatCurrency(m.realizedRevenue)}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Meta: {formatCurrency(m.targetGoal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mini Rodapé com KPIs de Evolução */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Acumulado
              </span>
              <span className="text-xs font-bold text-slate-800">
                {formatCurrency(evolution.totalRevenue)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Atingimento Médio
              </span>
              <span className="text-xs font-bold text-blue-700">
                {evolution.averageAttainment}%
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Ticket Médio
              </span>
              <span className="text-xs font-bold text-slate-800">
                {formatCurrency(evolution.averageTicketMedio)}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Pizza / Donut de Distribuição (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Distribuição de Faturamento
                </h2>
                <p className="text-xs text-slate-500">
                  Proporção de receitas entre TV Aberta e Portal Digital
                </p>
              </div>
            </div>

            {/* Gráfico Circular SVG Donut */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-36 h-36 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Trilha base de fundo */}
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />
                  {/* Arco TV Guararapes */}
                  {tvPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#0047AB"
                      strokeWidth="12"
                      strokeDasharray={`${tvStrokeDash} ${donutCircumference}`}
                      strokeDashoffset="0"
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Arco GPlus Digital */}
                  {gplusPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#059669"
                      strokeWidth="12"
                      strokeDasharray={`${gplusStrokeDash} ${donutCircumference}`}
                      strokeDashoffset={gplusStrokeOffset}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                </svg>

                {/* Texto Central do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {formatCurrency(distribution.totalRevenue)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {distribution.totalCount} vendas
                  </span>
                </div>
              </div>

              {/* Legenda rica ao lado */}
              <div className="space-y-3 w-full max-w-xs">
                {/* TV Guararapes */}
                <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0047AB] inline-block" />
                      <span className="text-xs font-bold text-slate-800">TV Guararapes</span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-800">
                      {tvPercent}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatCurrency(tvDistItem?.value || 0)}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                      Canal 9.1
                    </span>
                  </div>
                </div>

                {/* Portal GPlus */}
                <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block" />
                      <span className="text-xs font-bold text-slate-800">Portal GPlus</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-800">
                      {gplusPercent}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatCurrency(gplusDistItem?.value || 0)}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                      Digital
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dica Estratégica de Cross-selling */}
          <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              <strong>Cross-selling:</strong> Negócios multimídia (TV + Digital) apresentam retenção 35% superior.
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Oportunidades em Negociação / Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Oportunidades em Negociação
                </h2>
                <p className="text-xs text-slate-500">
                  Negócios abertos aguardando avanço de etapa ou fechamento
                </p>
              </div>
              <Link
                href="/oportunidades"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {opportunities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma oportunidade aberta com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {opp.client.tradeName || opp.client.legalName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            opp.area?.key === 'tv'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {opp.area?.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Próximo passo: {opp.nextStep || 'Não informado'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(opp.estimatedValue)}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500">
                        Prob: {opp.probability}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparativo de Área (TV vs GPlus) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Desempenho por Área de Negócio
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Distribuição do faturamento entre televisão aberta e plataformas digitais GPlus
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">TV Guararapes</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Canal 9.1
                  </span>
                </div>
                <div className="mt-3 text-xl font-black text-blue-900">
                  {formatCurrency(tvSales)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Vendas comerciais em grade de programação
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">GPlus Digital</span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                    Multiplataforma
                  </span>
                </div>
                <div className="mt-3 text-xl font-black text-emerald-900">
                  {formatCurrency(gplusSales)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Projetos digitais, redes sociais e portal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Visitas Recentes & Auditoria / Atividades */}
        <div className="space-y-6">
          {/* Visitas Recentes */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Últimas Visitas
              </h2>
              <Link
                href="/visitas"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Ver todas
              </Link>
            </div>

            {visits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma visita recente registrada.
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">
                        {v.client.tradeName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(v.visitDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {v.objective || v.discussion || 'Visita comercial de rotina'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Resp: {v.executive.name.split(' ')[0]}</span>
                      {v.hasOpportunity && (
                        <span className="text-emerald-600 font-semibold">Oportunidade gerada</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feed de Auditoria (Apenas para Gerente) */}
          {isManager && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Auditoria Recente
                  </h2>
                </div>
                <Link
                  href="/admin/audit"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Histórico completo
                </Link>
              </div>

              <div className="space-y-3">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {log.actorUser?.name || 'Sistema'}
                      </span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 font-medium mt-0.5">
                      <span className="text-blue-600 font-bold uppercase text-[9px] mr-1">
                        [{log.action}]
                      </span>
                      {log.entityType}: {log.entityId || 'Registro'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
