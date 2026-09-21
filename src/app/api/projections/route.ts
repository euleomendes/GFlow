import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const isMgr = isManager(user);
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('mode') || 'rolling'; // 'rolling' (3 meses a partir do atual) ou 'quarter' (Q1, Q2, Q3, Q4)
    const quarterParam = searchParams.get('quarter') || 'Q3';
    const yearParam = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const areaKey = searchParams.get('areaKey') || 'ALL';
    const reqExecutiveId = searchParams.get('executiveId');
    const selectedProjectId = searchParams.get('projectId') || 'ALL';

    // Scoping RBAC
    let targetExecutiveId: string | null = null;
    if (!isMgr) {
      targetExecutiveId = user.id;
    } else if (reqExecutiveId && reqExecutiveId !== 'ALL') {
      targetExecutiveId = reqExecutiveId;
    }

    // Definir os 3 meses da análise
    const now = new Date();
    interface MonthDef {
      year: number;
      monthIndex: number; // 0-11
      monthKey: string;   // "YYYY-MM"
      monthName: string;
      shortName: string;
      start: Date;
      end: Date;
    }

    const monthsDef: MonthDef[] = [];
    let quarterLabel = '';

    if (mode === 'quarter') {
      let startMonth = 0;
      if (quarterParam === 'Q1') startMonth = 0;
      else if (quarterParam === 'Q2') startMonth = 3;
      else if (quarterParam === 'Q3') startMonth = 6;
      else if (quarterParam === 'Q4') startMonth = 9;

      quarterLabel = `${quarterParam} / ${yearParam} (${MONTH_SHORT_NAMES[startMonth]} - ${MONTH_SHORT_NAMES[startMonth + 2]})`;

      for (let i = 0; i < 3; i++) {
        const mIdx = startMonth + i;
        const start = new Date(yearParam, mIdx, 1, 0, 0, 0);
        const end = new Date(yearParam, mIdx + 1, 0, 23, 59, 59);
        const mKey = `${yearParam}-${String(mIdx + 1).padStart(2, '0')}`;
        monthsDef.push({
          year: yearParam,
          monthIndex: mIdx,
          monthKey: mKey,
          monthName: MONTH_NAMES[mIdx],
          shortName: MONTH_SHORT_NAMES[mIdx],
          start,
          end,
        });
      }
    } else {
      // Rolling 3 months (Mês atual + 2 meses subsequentes)
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      quarterLabel = `Janela 3 Meses (${MONTH_SHORT_NAMES[curMonth]} - ${MONTH_SHORT_NAMES[(curMonth + 2) % 12]} ${curYear})`;

      for (let i = 0; i < 3; i++) {
        const targetDate = new Date(curYear, curMonth + i, 1);
        const y = targetDate.getFullYear();
        const mIdx = targetDate.getMonth();
        const start = new Date(y, mIdx, 1, 0, 0, 0);
        const end = new Date(y, mIdx + 1, 0, 23, 59, 59);
        const mKey = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
        monthsDef.push({
          year: y,
          monthIndex: mIdx,
          monthKey: mKey,
          monthName: MONTH_NAMES[mIdx],
          shortName: MONTH_SHORT_NAMES[mIdx],
          start,
          end,
        });
      }
    }

    const windowStart = monthsDef[0].start;
    const windowEnd = monthsDef[2].end;

    // Buscar Vendas no intervalo
    const salesWhere: any = {
      status: 'ACTIVE',
      closedAt: { gte: windowStart, lte: windowEnd },
    };
    if (targetExecutiveId) salesWhere.executiveId = targetExecutiveId;
    if (selectedProjectId !== 'ALL') salesWhere.projectId = selectedProjectId;
    if (areaKey !== 'ALL') salesWhere.area = { key: areaKey.toLowerCase() };

    // Buscar Metas no intervalo
    const goalsWhere: any = {
      metricType: 'REVENUE',
      periodStart: { lte: windowEnd },
      periodEnd: { gte: windowStart },
    };
    if (targetExecutiveId) goalsWhere.executiveId = targetExecutiveId;
    if (areaKey !== 'ALL') goalsWhere.area = { key: areaKey.toLowerCase() };

    // Buscar Oportunidades (abertas e ganhas com deadline no período ou criadas)
    const oppsWhere: any = {
      deletedAt: null,
    };
    if (targetExecutiveId) oppsWhere.executiveId = targetExecutiveId;
    if (selectedProjectId !== 'ALL') oppsWhere.projectId = selectedProjectId;
    if (areaKey !== 'ALL') oppsWhere.area = { key: areaKey.toLowerCase() };

    const [sales, goals, opportunities, allProjects, allClients, allExecutives] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          client: { select: { id: true, tradeName: true, legalName: true } },
          executive: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          area: { select: { id: true, key: true, name: true } },
        },
        orderBy: { closedAt: 'desc' },
      }),
      prisma.goal.findMany({
        where: goalsWhere,
        include: {
          executive: { select: { id: true, name: true } },
          area: { select: { id: true, key: true, name: true } },
        },
      }),
      prisma.opportunity.findMany({
        where: oppsWhere,
        include: {
          client: { select: { id: true, tradeName: true, legalName: true, segment: true } },
          executive: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          area: { select: { id: true, key: true, name: true } },
          proposals: { orderBy: { versionNumber: 'desc' } },
        },
        orderBy: [{ expectedCloseDate: 'asc' }, { updatedAt: 'desc' }],
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, totalValuation: true },
        orderBy: { name: 'asc' },
      }),
      prisma.client.findMany({
        where: { deletedAt: null },
        select: { id: true, tradeName: true, legalName: true },
        orderBy: { tradeName: 'asc' },
      }),
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: { select: { key: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Filtrar e enriquecer oportunidades
    const enrichedOpportunities = opportunities.map((opp) => {
      const expDate = opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null;
      let deadlineStatus = 'ON_TRACK';
      let monthKey = '';

      if (expDate) {
        const y = expDate.getFullYear();
        const m = String(expDate.getMonth() + 1).padStart(2, '0');
        monthKey = `${y}-${m}`;

        const diffTime = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (opp.stage === 'CLOSED_WON') {
          deadlineStatus = 'WON';
        } else if (opp.stage === 'CLOSED_LOST') {
          deadlineStatus = 'LOST';
        } else if (diffDays < 0) {
          deadlineStatus = 'OVERDUE';
        } else if (diffDays <= 7) {
          deadlineStatus = 'DUE_SOON';
        } else {
          deadlineStatus = 'ON_TRACK';
        }
      } else {
        // Se não tem deadline, atribuir provisoriamente ao primeiro mês para projeção aberta
        monthKey = monthsDef[0].monthKey;
        deadlineStatus = opp.stage === 'CLOSED_WON' ? 'WON' : 'SEM_DATA';
      }

      const weightedValue = Math.round((opp.estimatedValue * (opp.probability || 10)) / 100);

      return {
        ...opp,
        monthKey,
        deadlineStatus,
        weightedValue,
        formattedCloseDate: expDate ? expDate.toLocaleDateString('pt-BR') : 'Sem data definida',
      };
    });

    // Calcular Métricas Mês a Mês
    const monthlyBreakdown = monthsDef.map((mDef) => {
      // Vendas do mês
      const mSales = sales.filter((s) => {
        const d = new Date(s.closedAt);
        return d >= mDef.start && d <= mDef.end;
      });
      const realizedRevenue = mSales.reduce((acc, s) => acc + s.value, 0);

      // Metas do mês
      const mGoals = goals.filter((g) => {
        const gStart = new Date(g.periodStart);
        const gEnd = new Date(g.periodEnd);
        return gStart <= mDef.end && gEnd >= mDef.start;
      });
      const targetGoal = mGoals.reduce((acc, g) => acc + g.targetValue, 0);

      // Oportunidades projetadas com deadline neste mês (apenas abertas)
      const mOpps = enrichedOpportunities.filter((o) => {
        if (o.status !== 'OPEN' || o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST') return false;
        if (o.expectedCloseDate) {
          const d = new Date(o.expectedCloseDate);
          return d >= mDef.start && d <= mDef.end;
        }
        // Se sem data, contar no mês corrente se este for o mês corrente
        return mDef.monthIndex === now.getMonth() && mDef.year === now.getFullYear();
      });

      const projectedGross = mOpps.reduce((acc, o) => acc + o.estimatedValue, 0);
      const projectedWeighted = mOpps.reduce((acc, o) => acc + o.weightedValue, 0);
      const forecastTotal = realizedRevenue + projectedWeighted;
      const attainmentPercent = targetGoal > 0 ? Math.round((forecastTotal / targetGoal) * 100) : 0;
      const realizedPercent = targetGoal > 0 ? Math.round((realizedRevenue / targetGoal) * 100) : 0;
      const gapToGoal = Math.max(0, targetGoal - forecastTotal);

      return {
        monthKey: mDef.monthKey,
        monthName: mDef.monthName,
        shortName: mDef.shortName,
        year: mDef.year,
        periodStart: mDef.start.toISOString(),
        periodEnd: mDef.end.toISOString(),
        targetGoal,
        realizedRevenue,
        projectedGross,
        projectedWeighted,
        forecastTotal,
        attainmentPercent,
        realizedPercent,
        gapToGoal,
        salesCount: mSales.length,
        opportunitiesCount: mOpps.length,
        opportunities: mOpps,
        sales: mSales,
      };
    });

    // Consolidado do Trimestre
    const consolidatedQuarter = {
      label: quarterLabel,
      totalGoal: monthlyBreakdown.reduce((acc, m) => acc + m.targetGoal, 0),
      totalRealized: monthlyBreakdown.reduce((acc, m) => acc + m.realizedRevenue, 0),
      totalProjectedGross: monthlyBreakdown.reduce((acc, m) => acc + m.projectedGross, 0),
      totalProjectedWeighted: monthlyBreakdown.reduce((acc, m) => acc + m.projectedWeighted, 0),
      totalForecast: monthlyBreakdown.reduce((acc, m) => acc + m.forecastTotal, 0),
      totalSalesCount: monthlyBreakdown.reduce((acc, m) => acc + m.salesCount, 0),
      totalOppsCount: monthlyBreakdown.reduce((acc, m) => acc + m.opportunitiesCount, 0),
    };

    const quarterAttainmentPercent =
      consolidatedQuarter.totalGoal > 0
        ? Math.round((consolidatedQuarter.totalForecast / consolidatedQuarter.totalGoal) * 100)
        : 0;

    const quarterRealizedPercent =
      consolidatedQuarter.totalGoal > 0
        ? Math.round((consolidatedQuarter.totalRealized / consolidatedQuarter.totalGoal) * 100)
        : 0;

    // Funil por Projeto (especialmente útil para Projetos como Carnaval)
    const projectsMap = new Map<string, any>();

    // Inicializar projetos ativos
    allProjects.forEach((p) => {
      projectsMap.set(p.id, {
        id: p.id,
        name: p.name,
        status: p.status,
        totalValuation: p.totalValuation || 0,
        stages: {
          LEAD: { count: 0, value: 0 },
          CONTACT: { count: 0, value: 0 },
          MEETING: { count: 0, value: 0 },
          PROPOSAL: { count: 0, value: 0 },
          NEGOTIATION: { count: 0, value: 0 },
          CLOSED_WON: { count: 0, value: 0 },
        },
        totalRealized: 0,
        totalNegotiating: 0,
        totalWeighted: 0,
        clientsMap: new Map<string, any>(),
        executivesMap: new Map<string, any>(),
        deals: [],
      });
    });

    // Agregar Vendas nos projetos
    sales.forEach((s) => {
      if (s.projectId && projectsMap.has(s.projectId)) {
        const prj = projectsMap.get(s.projectId);
        prj.totalRealized += s.value;
        prj.stages.CLOSED_WON.count += 1;
        prj.stages.CLOSED_WON.value += s.value;

        // Cliente
        if (!prj.clientsMap.has(s.clientId)) {
          prj.clientsMap.set(s.clientId, {
            id: s.clientId,
            name: s.client.tradeName || s.client.legalName,
            realized: 0,
            negotiating: 0,
            dealsCount: 0,
          });
        }
        const cEntry = prj.clientsMap.get(s.clientId);
        cEntry.realized += s.value;
        cEntry.dealsCount += 1;

        // Executivo
        if (!prj.executivesMap.has(s.executiveId)) {
          prj.executivesMap.set(s.executiveId, {
            id: s.executiveId,
            name: s.executive.name,
            realized: 0,
            negotiating: 0,
          });
        }
        prj.executivesMap.get(s.executiveId).realized += s.value;
      }
    });

    // Agregar Oportunidades nos projetos
    enrichedOpportunities.forEach((opp) => {
      if (opp.projectId && projectsMap.has(opp.projectId)) {
        const prj = projectsMap.get(opp.projectId);
        prj.deals.push(opp);

        if (opp.status === 'OPEN' && prj.stages[opp.stage]) {
          prj.stages[opp.stage].count += 1;
          prj.stages[opp.stage].value += opp.estimatedValue;
          prj.totalNegotiating += opp.estimatedValue;
          prj.totalWeighted += opp.weightedValue;

          // Cliente
          if (!prj.clientsMap.has(opp.clientId)) {
            prj.clientsMap.set(opp.clientId, {
              id: opp.clientId,
              name: opp.client.tradeName || opp.client.legalName,
              realized: 0,
              negotiating: 0,
              dealsCount: 0,
            });
          }
          const cEntry = prj.clientsMap.get(opp.clientId);
          cEntry.negotiating += opp.estimatedValue;
          cEntry.dealsCount += 1;

          // Executivo
          if (!prj.executivesMap.has(opp.executiveId)) {
            prj.executivesMap.set(opp.executiveId, {
              id: opp.executiveId,
              name: opp.executive.name,
              realized: 0,
              negotiating: 0,
            });
          }
          prj.executivesMap.get(opp.executiveId).negotiating += opp.estimatedValue;
        }
      }
    });

    // Converter Maps de projetos para arrays
    const projectsList = Array.from(projectsMap.values()).map((p) => ({
      ...p,
      clients: Array.from(p.clientsMap.values()),
      executives: Array.from(p.executivesMap.values()),
      clientsMap: undefined,
      executivesMap: undefined,
    }));

    // Matriz de Clientes (O que cada cliente tem fechado vs negociando)
    const clientsSummaryMap = new Map<string, any>();
    allClients.forEach((c) => {
      clientsSummaryMap.set(c.id, {
        id: c.id,
        tradeName: c.tradeName,
        legalName: c.legalName,
        totalRealized: 0,
        totalNegotiating: 0,
        totalWeighted: 0,
        activeOpportunities: [],
        sales: [],
      });
    });

    sales.forEach((s) => {
      if (clientsSummaryMap.has(s.clientId)) {
        const entry = clientsSummaryMap.get(s.clientId);
        entry.totalRealized += s.value;
        entry.sales.push(s);
      }
    });

    enrichedOpportunities.forEach((opp) => {
      if (clientsSummaryMap.has(opp.clientId) && opp.status === 'OPEN') {
        const entry = clientsSummaryMap.get(opp.clientId);
        entry.totalNegotiating += opp.estimatedValue;
        entry.totalWeighted += opp.weightedValue;
        entry.activeOpportunities.push(opp);
      }
    });

    const activeClientsList = Array.from(clientsSummaryMap.values())
      .filter((c) => c.totalRealized > 0 || c.totalNegotiating > 0)
      .sort((a, b) => (b.totalRealized + b.totalNegotiating) - (a.totalRealized + a.totalNegotiating));

    // Matriz de Executivos
    const executivesSummary = allExecutives
      .filter((u) => u.role.key === 'executive' || isMgr)
      .map((exec) => {
        const execSales = sales.filter((s) => s.executiveId === exec.id);
        const execOpps = enrichedOpportunities.filter((o) => o.executiveId === exec.id && o.status === 'OPEN');
        const execGoals = goals.filter((g) => g.executiveId === exec.id);

        const realized = execSales.reduce((acc, s) => acc + s.value, 0);
        const negotiating = execOpps.reduce((acc, o) => acc + o.estimatedValue, 0);
        const weighted = execOpps.reduce((acc, o) => acc + o.weightedValue, 0);
        const goal = execGoals.reduce((acc, g) => acc + g.targetValue, 0);
        const forecast = realized + weighted;
        const attainment = goal > 0 ? Math.round((forecast / goal) * 100) : 0;

        return {
          id: exec.id,
          name: exec.name,
          goal,
          realized,
          negotiating,
          weighted,
          forecast,
          attainment,
          salesCount: execSales.length,
          oppsCount: execOpps.length,
        };
      })
      .filter((e) => e.realized > 0 || e.negotiating > 0 || e.goal > 0);

    // Eventos do Calendário
    const calendarEvents: any[] = [];

    // Deadlines de Oportunidades
    enrichedOpportunities.forEach((opp) => {
      if (opp.expectedCloseDate) {
        const dStr = new Date(opp.expectedCloseDate).toISOString().split('T')[0];
        calendarEvents.push({
          id: opp.id,
          type: 'DEADLINE',
          date: dStr,
          title: `${opp.client.tradeName || opp.client.legalName} • R$ ${opp.estimatedValue.toLocaleString('pt-BR')}`,
          value: opp.estimatedValue,
          probability: opp.probability,
          stage: opp.stage,
          clientName: opp.client.tradeName || opp.client.legalName,
          projectName: opp.project ? opp.project.name : null,
          executiveName: opp.executive.name,
          deadlineStatus: opp.deadlineStatus,
          nextStep: opp.nextStep,
        });
      }
    });

    // Vendas Fechadas no Calendário
    sales.forEach((s) => {
      const dStr = new Date(s.closedAt).toISOString().split('T')[0];
      calendarEvents.push({
        id: s.id,
        type: 'SALE_CLOSED',
        date: dStr,
        title: `Vendido: ${s.client.tradeName || s.client.legalName} • R$ ${s.value.toLocaleString('pt-BR')}`,
        value: s.value,
        stage: 'CLOSED_WON',
        clientName: s.client.tradeName || s.client.legalName,
        projectName: s.project ? s.project.name : null,
        executiveName: s.executive.name,
        deadlineStatus: 'WON',
      });
    });

    // Metas & "O que tem pra acontecer"
    const currentMonthData = monthlyBreakdown[0] || null;
    const highProbabilityDeals = enrichedOpportunities
      .filter((o) => o.status === 'OPEN' && o.probability >= 50)
      .sort((a, b) => b.weightedValue - a.weightedValue)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      mode,
      quarterLabel,
      window: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      },
      consolidatedQuarter: {
        ...consolidatedQuarter,
        quarterAttainmentPercent,
        quarterRealizedPercent,
      },
      monthlyBreakdown,
      allOpportunities: enrichedOpportunities,
      projectsList,
      activeClientsList,
      executivesSummary,
      calendarEvents,
      whatNeedsToHappen: {
        currentGoal: currentMonthData?.targetGoal || 0,
        realized: currentMonthData?.realizedRevenue || 0,
        negotiating: currentMonthData?.projectedGross || 0,
        weighted: currentMonthData?.projectedWeighted || 0,
        forecastFinal: currentMonthData?.forecastTotal || 0,
        gapRemaining: currentMonthData?.gapToGoal || 0,
        highProbabilityDeals,
      },
      availableProjects: allProjects,
      availableClients: allClients,
      availableExecutives: allExecutives,
    });
  } catch (error: any) {
    console.error('Erro na rota de projeções:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar dados de projeções e forecast.' },
      { status: 500 }
    );
  }
}
