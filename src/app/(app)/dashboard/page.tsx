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
  LineChart,
  Calendar,
  CheckCircle2,
  Flame,
  Share2,
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
  const socialArea = areas.find((a) => a.key === 'redes_sociais');

  // Filtros aplicados baseados no perfil e query param
  const areaFilter =
    selectedAreaKey === 'tv' && tvArea
      ? { areaId: tvArea.id }
      : selectedAreaKey === 'gplus' && gplusArea
      ? { areaId: gplusArea.id }
      : selectedAreaKey === 'redes_sociais' && socialArea
      ? { areaId: socialArea.id }
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
        : selectedAreaKey === 'redes_sociais' && socialArea
        ? { areaId: socialArea.id }
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

  const totalForecastRevenue = totalSales + weightedPipeline;
  const forecastAttainment = totalGoal > 0 ? Math.round((totalForecastRevenue / totalGoal) * 100) : 0;

  const now = new Date();
  const upcomingDeadlines = await prisma.opportunity.findMany({
    where: {
      status: 'OPEN',
      expectedCloseDate: { not: null },
      ...areaFilter,
      ...userFilter,
    },
    include: {
      client: true,
      project: true,
      executive: true,
    },
    orderBy: { expectedCloseDate: 'asc' },
    take: 4,
  });

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

  // Vendas por Área (TV vs GPlus vs Redes Sociais)
  const tvSales = sales.filter((s) => s.area?.key === 'tv').reduce((acc, curr) => acc + curr.value, 0);
  const gplusSales = sales.filter((s) => s.area?.key === 'gplus').reduce((acc, curr) => acc + curr.value, 0);
  const socialSales = sales.filter((s) => s.area?.key === 'redes_sociais').reduce((acc, curr) => acc + curr.value, 0);

  // 8. Métricas de Evolução e Distribuição (Evolutivo e Pizza)
  const evolution = calculateExecutiveMonthlyEvolution(sales, goals, 4);
  const distribution = calculateExecutiveDistribution(sales);

  // Parâmetros do Gráfico de Pizza / Donut SVG
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const tvDistItem = distribution.items.find((i) => i.key === 'tv');
  const gplusDistItem = distribution.items.find((i) => i.key === 'gplus');
  const socialDistItem = distribution.items.find((i) => i.key === 'redes_sociais');
  const tvPercent = tvDistItem?.percentage || 0;
  const gplusPercent = gplusDistItem?.percentage || 0;
  const socialPercent = socialDistItem?.percentage || 0;

  const tvStrokeDash = (tvPercent / 100) * donutCircumference;
  const gplusStrokeDash = (gplusPercent / 100) * donutCircumference;
  const socialStrokeDash = (socialPercent / 100) * donutCircumference;
  const gplusStrokeOffset = -tvStrokeDash;
  const socialStrokeOffset = -(tvStrokeDash + gplusStrokeDash);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink-black">
              {isManager
                ? selectedExecutive
                  ? `Overview: ${selectedExecutive.name}`
                  : 'Dashboard Gerencial & Comercial'
                : `Olá, ${user.name}`}
            </h1>
            {isManager && selectedExecutive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-slate/10 text-blue-slate border border-blue-slate/25">
                Visão Individual
              </span>
            )}
            {isManager && !selectedExecutive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-deep-space/10 text-deep-space border border-deep-space/25">
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Executivos (Exclusivo Gerente) */}
          {isManager && executives.length > 0 && (
            <ExecutiveSelector
              executives={executives}
              selectedExecutiveId={selectedExecutiveId}
              selectedAreaKey={selectedAreaKey}
            />
          )}

          {/* Seletor de Área (TV / GPlus / Redes Sociais / Todas) */}
          <div className="inline-flex bg-white p-1 rounded-lg border border-slate-300 shadow-sm text-xs font-semibold">
            <Link
              href={buildFilterUrl('all', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'all'
                  ? 'bg-slate-100 text-ink-black shadow-xs font-bold'
                  : 'text-deep-space/70 hover:text-ink-black'
              }`}
            >
              Todas Áreas
            </Link>
            <Link
              href={buildFilterUrl('tv', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'tv'
                  ? 'bg-deep-space text-white shadow-xs'
                  : 'text-deep-space/70 hover:text-deep-space'
              }`}
            >
              TV
            </Link>
            <Link
              href={buildFilterUrl('gplus', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'gplus'
                  ? 'bg-blue-slate text-white shadow-xs'
                  : 'text-deep-space/70 hover:text-blue-slate'
              }`}
            >
              GPlus
            </Link>
            <Link
              href={buildFilterUrl('redes_sociais', selectedExecutiveId)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedAreaKey === 'redes_sociais'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-deep-space/70 hover:text-purple-600'
              }`}
            >
              Redes Sociais
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Vendas Realizadas */}
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vendas Fechadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-slate/10 text-blue-slate flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-ink-black">
              {formatCurrency(totalSales)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-blue-slate">{sales.length} vendas</span>
              <span>no período</span>
            </div>
          </div>
        </div>

        {/* Card 2: Meta e Atingimento */}
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meta do Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-deep-space/10 text-deep-space flex items-center justify-center">
              <Target className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-ink-black">
                {formatCurrency(totalGoal)}
              </span>
              <span className="text-xs font-bold text-blue-slate bg-blue-slate/10 border border-blue-slate/20 px-2 py-0.5 rounded-full">
                {goalProgress}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-blue-slate h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              />
            </div>
            {isManager && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Atribuída pelo Gerente</span>
                <Link
                  href="/metas"
                  className="text-blue-slate font-semibold hover:text-deep-space flex items-center gap-0.5"
                >
                  <span>Gerenciar metas</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Pipeline de Oportunidades */}
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pipeline Aberto
            </span>
            <div className="w-9 h-9 rounded-xl bg-dusty-denim/20 text-deep-space flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-ink-black">
              {formatCurrency(pipelineTotal)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-deep-space/80">
                Ponderado: {formatCurrency(weightedPipeline)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Clientes Ativos & Visitas */}
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Clientes Ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-deep-space/10 text-deep-space flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-ink-black">
              {activeClientsCount}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-deep-space">{totalVisitsCount} visitas</span>
              <span>registradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* NOVO WIDGET: FORECAST COMERCIAL, TERMÔMETRO DE METAS & DEADLINES DA SEMANA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco Forecast & Termômetro (7 colunas) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-deep-space via-ink-black to-slate-900 border border-slate-700 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-slate flex items-center justify-center text-white">
                  <LineChart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white">
                    Forecast Comercial & Termômetro da Meta
                  </h2>
                  <p className="text-xs text-dusty-denim">
                    Previsão preditiva considerando vendas realizadas + pipeline ponderado
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-dusty-denim block">Atingimento Projetado</span>
                <span className="text-2xl font-black text-emerald-400">
                  {forecastAttainment}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-dusty-denim block">Meta</span>
                <span className="text-sm font-bold text-white">{formatCurrency(totalGoal)}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Já Fechado</span>
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalSales)}</span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-400/30">
                <span className="text-[10px] uppercase font-bold text-blue-300 block">Previsão Final</span>
                <span className="text-sm font-bold text-blue-300">{formatCurrency(totalForecastRevenue)}</span>
              </div>
            </div>

            {/* Termômetro bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(totalGoal > 0 ? (totalSales / totalGoal) * 100 : 0, 100)}%` }}
                  title="Realizado"
                />
                <div
                  className="bg-blue-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(totalGoal > 0 ? (weightedPipeline / totalGoal) * 100 : 0, 100)}%` }}
                  title="Ponderado Aberto"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Realizado: {goalProgress}%</span>
                <span>Ponderado em Aberto: {totalGoal > 0 ? Math.round((weightedPipeline / totalGoal) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-dusty-denim">
              {opportunities.length} negociações ativas alimentadas pela equipe
            </span>
            <Link
              href="/projecoes"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-dusty-denim transition-colors"
            >
              <span>Ver Forecast Trimestral & Meses Clicáveis</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Bloco Deadlines Críticos da Semana (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-black">Deadlines Críticos</h3>
                  <p className="text-[11px] text-slate-500">Prazos de fechamento desta semana</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {upcomingDeadlines.length} próximos
              </span>
            </div>

            <div className="divide-y divide-slate-200 mt-2">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500 opacity-60" />
                  Nenhum deadline pendente para esta semana.
                </div>
              ) : (
                upcomingDeadlines.map((opp) => {
                  const d = opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null;
                  const isOverdue = d && d < now;

                  return (
                    <div key={opp.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-ink-black block truncate">
                          {opp.client.tradeName || opp.client.legalName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          {opp.project && (
                            <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                              {opp.project.name}
                            </span>
                          )}
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}>
                            {d ? d.toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-ink-black block">
                          {formatCurrency(opp.estimatedValue)}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          {opp.probability}% conf.
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-right">
            <Link
              href="/projecoes"
              className="text-xs font-bold text-blue-slate hover:text-deep-space inline-flex items-center gap-1"
            >
              <span>Abrir Calendário Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SEÇÃO: EVOLUÇÃO COMERCIAL & DISTRIBUIÇÃO (GRÁFICO EVOLUTIVO E PIZZA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Evolução Mensal de Vendas e Metas (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-deep-space/10 text-deep-space flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink-black">
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
                  className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
                    evolution.momGrowth >= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
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
            <div className="mt-4 pt-2">
              {/* Legenda do Gráfico */}
              <div className="flex items-center justify-end gap-4 text-[11px] text-slate-500 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-slate inline-block" />
                  <span className="font-semibold text-deep-space">Realizado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-300 border-dashed inline-block" />
                  <span className="font-medium text-slate-500">Meta</span>
                </div>
              </div>

              {/* Colunas dos Meses */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 pt-2 pb-2 border-b border-slate-200">
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 transition-all ${
                          m.attainmentPercent >= 100
                            ? 'bg-deep-space text-white'
                            : m.attainmentPercent >= 80
                            ? 'bg-blue-slate/15 text-blue-slate font-bold'
                            : m.attainmentPercent > 0
                            ? 'bg-dusty-denim/25 text-deep-space font-bold'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {m.attainmentPercent > 0 ? `${m.attainmentPercent}%` : '0%'}
                      </span>

                      {/* Recipiente de Barras */}
                      <div className="h-36 w-full flex items-end justify-center gap-1.5 sm:gap-2 px-1 bg-slate-50 border border-slate-200 rounded-xl p-2">
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
                                ? 'bg-deep-space hover:bg-ink-black shadow-xs'
                                : 'bg-blue-slate hover:bg-deep-space shadow-xs'
                            }`}
                            style={{ height: `${Math.max(barHeightPercent, 4)}%` }}
                            title={`Realizado: ${formatCurrency(m.realizedRevenue)}`}
                          />
                        </div>
                      </div>

                      {/* Rótulo do Mês e Valores */}
                      <span className="text-xs font-bold text-ink-black mt-2.5">{m.label}</span>
                      <span className="text-[10px] font-bold text-ink-black mt-0.5">
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
          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Acumulado
              </span>
              <span className="text-xs font-bold text-ink-black">
                {formatCurrency(evolution.totalRevenue)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Atingimento Médio
              </span>
              <span className="text-xs font-bold text-blue-slate">
                {evolution.averageAttainment}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Ticket Médio
              </span>
              <span className="text-xs font-bold text-ink-black">
                {formatCurrency(evolution.averageTicketMedio)}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Pizza / Donut de Distribuição (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-slate/10 text-blue-slate flex items-center justify-center">
                <PieChart className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink-black">
                  Distribuição de Faturamento
                </h2>
                <p className="text-xs text-slate-500">
                  Proporção de receitas entre TV Aberta, Portal Digital e Redes Sociais
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
                  {/* Arco TV Guararapes (#1D2D44 deep-space) */}
                  {tvPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#1D2D44"
                      strokeWidth="12"
                      strokeDasharray={`${tvStrokeDash} ${donutCircumference}`}
                      strokeDashoffset="0"
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Arco GPlus Digital (#3E5C76 blue-slate) */}
                  {gplusPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#3E5C76"
                      strokeWidth="12"
                      strokeDasharray={`${gplusStrokeDash} ${donutCircumference}`}
                      strokeDashoffset={gplusStrokeOffset}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Arco Redes Sociais (#9333EA purple-600) */}
                  {socialPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#9333EA"
                      strokeWidth="12"
                      strokeDasharray={`${socialStrokeDash} ${donutCircumference}`}
                      strokeDashoffset={socialStrokeOffset}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                </svg>

                {/* Texto Central do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total
                  </span>
                  <span className="text-xs font-black text-ink-black">
                    {formatCurrency(distribution.totalRevenue)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {distribution.totalCount} vendas
                  </span>
                </div>
              </div>

              {/* Legenda rica ao lado */}
              <div className="space-y-2.5 w-full max-w-xs">
                {/* TV Guararapes */}
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1D2D44] inline-block" />
                      <span className="text-xs font-bold text-ink-black">TV Guararapes</span>
                    </div>
                    <span className="text-xs font-extrabold text-deep-space">
                      {tvPercent}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatCurrency(tvDistItem?.value || 0)}</span>
                    <span className="text-[10px] bg-deep-space/10 text-deep-space px-2 py-0.5 rounded font-semibold border border-deep-space/20">
                      Canal 9.1
                    </span>
                  </div>
                </div>

                {/* Portal GPlus */}
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3E5C76] inline-block" />
                      <span className="text-xs font-bold text-ink-black">Portal GPlus</span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-slate">
                      {gplusPercent}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatCurrency(gplusDistItem?.value || 0)}</span>
                    <span className="text-[10px] bg-blue-slate/10 text-blue-slate px-2 py-0.5 rounded font-semibold border border-blue-slate/20">
                      Digital
                    </span>
                  </div>
                </div>

                {/* Redes Sociais */}
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA] inline-block" />
                      <span className="text-xs font-bold text-ink-black">Redes Sociais</span>
                    </div>
                    <span className="text-xs font-extrabold text-purple-600">
                      {socialPercent}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatCurrency(socialDistItem?.value || 0)}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold border border-purple-200">
                      Social Media
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dica Estratégica de Cross-selling */}
          <div className="mt-6 p-3.5 bg-slate-50 rounded-xl text-[11px] text-deep-space border border-slate-300 flex items-center gap-2.5">
            <Award className="w-4 h-4 text-dusty-denim flex-shrink-0" />
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
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-ink-black">
                  Oportunidades em Negociação
                </h2>
                <p className="text-xs text-slate-500">
                  Negócios abertos aguardando avanço de etapa ou fechamento
                </p>
              </div>
              <Link
                href="/oportunidades"
                className="text-xs font-semibold text-blue-slate hover:text-deep-space flex items-center gap-1 transition-colors"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {opportunities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma oportunidade aberta com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-black truncate">
                          {opp.client.tradeName || opp.client.legalName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                            opp.area?.key === 'tv'
                              ? 'bg-deep-space/10 text-deep-space border-deep-space/30'
                              : opp.area?.key === 'redes_sociais'
                              ? 'bg-purple-100 text-purple-700 border-purple-300'
                              : 'bg-blue-slate/10 text-blue-slate border-blue-slate/30'
                          }`}
                        >
                          {opp.area?.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        Próximo passo: {opp.nextStep || 'Não informado'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-ink-black">
                        {formatCurrency(opp.estimatedValue)}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                        Prob: {opp.probability}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparativo de Área (TV vs GPlus vs Redes Sociais) */}
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-ink-black mb-1">
              Desempenho por Área de Negócio
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Distribuição do faturamento entre televisão aberta, plataformas digitais GPlus e redes sociais
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-slate-300 bg-slate-50/60 shadow-xs hover:border-deep-space/60 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-deep-space" />
                    <span className="text-xs font-bold text-ink-black">TV Guararapes</span>
                  </div>
                  <span className="text-[10px] font-bold bg-deep-space/10 text-deep-space px-2 py-0.5 rounded border border-deep-space/30">
                    Canal 9.1
                  </span>
                </div>
                <div className="mt-4 text-xl sm:text-2xl font-black text-deep-space">
                  {formatCurrency(tvSales)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Vendas comerciais em grade de programação
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-300 bg-slate-50/60 shadow-xs hover:border-blue-slate/60 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-slate" />
                    <span className="text-xs font-bold text-ink-black">GPlus Digital</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-slate/10 text-blue-slate px-2 py-0.5 rounded border border-blue-slate/30">
                    Portal Web
                  </span>
                </div>
                <div className="mt-4 text-xl sm:text-2xl font-black text-blue-slate">
                  {formatCurrency(gplusSales)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Banners, branded content e portal
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-300 bg-slate-50/60 shadow-xs hover:border-purple-500/60 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-ink-black">Redes Sociais</span>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-300">
                    Social Media
                  </span>
                </div>
                <div className="mt-4 text-xl sm:text-2xl font-black text-purple-600">
                  {formatCurrency(socialSales)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Instagram, TikTok, YouTube e Reels
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Visitas Recentes & Auditoria / Atividades */}
        <div className="space-y-6">
          {/* Visitas Recentes */}
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-ink-black">
                Últimas Visitas
              </h2>
              <Link
                href="/visitas"
                className="text-xs font-semibold text-blue-slate hover:text-deep-space transition-colors"
              >
                Ver todas
              </Link>
            </div>

            {visits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma visita recente registrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {visits.map((v) => (
                  <div key={v.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink-black truncate">
                        {v.client.tradeName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(v.visitDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {v.objective || v.discussion || 'Visita comercial de rotina'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Resp: {v.executive.name.split(' ')[0]}</span>
                      {v.hasOpportunity && (
                        <span className="text-blue-slate font-semibold">Oportunidade gerada</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feed de Auditoria (Apenas para Gerente) */}
          {isManager && (
            <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-deep-space" />
                  <h2 className="text-sm font-bold text-ink-black">
                    Auditoria Recente
                  </h2>
                </div>
                <Link
                  href="/admin/audit"
                  className="text-xs font-semibold text-blue-slate hover:text-deep-space transition-colors"
                >
                  Histórico completo
                </Link>
              </div>

              <div className="divide-y divide-slate-200">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-deep-space">
                        {log.actorUser?.name || 'Sistema'}
                      </span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 font-medium mt-1">
                      <span className="text-blue-slate font-bold uppercase text-[9px] mr-1.5 px-1.5 py-0.5 rounded bg-blue-slate/10 border border-blue-slate/20">
                        {log.action}
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
