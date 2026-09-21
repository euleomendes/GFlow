import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import {
  calculateTicketMedio,
  calculatePipelinePonderado,
  calculateCicloMedio,
  calculateFunnelMetrics,
  calculateCrossSellingAnalysis,
  calculateGoalAttainment,
} from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const isUserMgr = isManager(user);
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') || 'all';
    const areaKey = searchParams.get('areaKey') || 'ALL';
    const reqExecId = searchParams.get('executiveId');
    const clientId = searchParams.get('clientId');

    // REGRA 23: SEGURANÇA E RBAC NO BACKEND
    // Executivo só pode consultar dados onde ele é o executivo responsável.
    let targetExecutiveId: string | null = null;
    if (!isUserMgr) {
      if (reqExecId && reqExecId !== user.id) {
        return NextResponse.json(
          { error: 'Acesso negado: Executivos só podem consultar seus próprios relatórios analíticos.' },
          { status: 403 }
        );
      }
      targetExecutiveId = user.id;
    } else {
      targetExecutiveId = reqExecId && reqExecId !== 'ALL' ? reqExecId : null;
    }

    // Date range calculation (Regra 8)
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    const now = new Date();
    if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'this_quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
      endDate = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59);
    } else if (period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
    }

    // Base filters for Sales
    const salesWhere: any = { status: 'ACTIVE' };
    if (targetExecutiveId) salesWhere.executiveId = targetExecutiveId;
    if (clientId) salesWhere.clientId = clientId;
    if (startDate && endDate) {
      salesWhere.closedAt = { gte: startDate, lte: endDate };
    }
    if (areaKey !== 'ALL') {
      salesWhere.area = { key: areaKey.toLowerCase() };
    }

    // Base filters for Opportunities
    const oppsWhere: any = { deletedAt: null };
    if (targetExecutiveId) oppsWhere.executiveId = targetExecutiveId;
    if (clientId) oppsWhere.clientId = clientId;
    if (startDate && endDate) {
      oppsWhere.createdAt = { gte: startDate, lte: endDate };
    }
    if (areaKey !== 'ALL') {
      oppsWhere.area = { key: areaKey.toLowerCase() };
    }

    // Query official records (Regra 7: sem dados fictícios)
    const [sales, opportunities, visits, goals, clients, executives] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          client: { select: { id: true, legalName: true, tradeName: true } },
          executive: { select: { id: true, name: true, email: true } },
          area: { select: { id: true, key: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { closedAt: 'desc' },
      }),
      prisma.opportunity.findMany({
        where: oppsWhere,
        include: {
          client: { select: { id: true, legalName: true } },
          executive: { select: { id: true, name: true } },
          area: { select: { key: true, name: true } },
          proposals: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.visit.findMany({
        where: {
          ...(targetExecutiveId ? { executiveId: targetExecutiveId } : {}),
          ...(startDate && endDate ? { visitDate: { gte: startDate, lte: endDate } } : {}),
        },
        select: { id: true, executiveId: true, hasOpportunity: true, visitDate: true },
      }),
      prisma.goal.findMany({
        where: {
          ...(targetExecutiveId ? { executiveId: targetExecutiveId } : {}),
        },
      }),
      prisma.client.findMany({
        where: {
          deletedAt: null,
          ...(targetExecutiveId ? { responsibleUserId: targetExecutiveId } : {}),
        },
        include: {
          areas: { include: { area: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          role: { key: 'executive' },
          status: 'ACTIVE',
          ...(targetExecutiveId ? { id: targetExecutiveId } : {}),
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // METRICS CALCULATIONS (Regras 9, 10, 11, 12, 13, 14, 15, 16)
    const totalSalesValue = sales.reduce((acc, s) => acc + s.value, 0);
    const totalSalesCount = sales.length;
    const ticketMedio = calculateTicketMedio(sales);
    const pipelinePonderado = calculatePipelinePonderado(opportunities);
    const cicloMedio = calculateCicloMedio(opportunities);
    const funnel = calculateFunnelMetrics(opportunities);

    // Cross-Selling Analysis (Regra 14)
    const clientAreaInputs = clients.map((c) => ({
      id: c.id,
      legalName: c.legalName,
      tradeName: c.tradeName,
      areaKeys: c.areas.map((a) => a.area.key),
    }));
    const crossSelling = calculateCrossSellingAnalysis(clientAreaInputs);

    // Executive Performance (Regra 15 & 16: factual sem rotulação qualitativa)
    const executivePerformance = executives.map((exec) => {
      const execSales = sales.filter((s) => s.executiveId === exec.id);
      const execSalesTotal = execSales.reduce((acc, s) => acc + s.value, 0);
      const execTicketMedio = calculateTicketMedio(execSales);
      const execVisits = visits.filter((v) => v.executiveId === exec.id);
      const execOpps = opportunities.filter((o) => o.executiveId === exec.id);

      const execRevenueGoal = goals.find(
        (g) => g.executiveId === exec.id && g.metricType === 'REVENUE'
      );
      const goalTarget = execRevenueGoal ? execRevenueGoal.targetValue : 0;
      const goalAttainment = calculateGoalAttainment(goalTarget, execSalesTotal);

      const conversion = execOpps.length > 0 ? (execSales.length / execOpps.length) * 100 : 0;

      return {
        executive: exec,
        totalSalesValue: execSalesTotal,
        salesCount: execSales.length,
        ticketMedio: execTicketMedio,
        visitsCount: execVisits.length,
        opportunitiesCount: execOpps.length,
        goalTarget,
        attainmentPercentage: goalAttainment.percentage,
        conversionRate: parseFloat(conversion.toFixed(1)),
      };
    });

    return NextResponse.json({
      summary: {
        totalSalesValue,
        totalSalesCount,
        ticketMedio,
        pipelinePonderado,
        cicloMedio,
        totalVisits: visits.length,
      },
      sales,
      funnel,
      executivePerformance,
      crossSelling,
      appliedFilters: {
        period,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        areaKey,
        targetExecutiveId,
      },
    });
  } catch (error: any) {
    console.error('Erro na API de relatórios:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar relatório' }, { status: 500 });
  }
}
