import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const isMgr = isManager(user);
    const now = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Notificações persistidas no banco
    const dbNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // 2. Alertas dinâmicos operacionais de Deadlines
    const oppsWhere: any = {
      deletedAt: null,
      status: 'OPEN',
      expectedCloseDate: { not: null },
    };
    if (!isMgr) {
      oppsWhere.executiveId = user.id;
    }

    const activeOpportunities = await prisma.opportunity.findMany({
      where: oppsWhere,
      include: {
        client: { select: { id: true, tradeName: true, legalName: true } },
        project: { select: { id: true, name: true } },
        executive: { select: { id: true, name: true } },
      },
      orderBy: { expectedCloseDate: 'asc' },
    });

    const dynamicAlerts: any[] = [];

    activeOpportunities.forEach((opp) => {
      if (!opp.expectedCloseDate) return;
      const d = new Date(opp.expectedCloseDate);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const clientName = opp.client.tradeName || opp.client.legalName;
      const projectSuffix = opp.project ? ` (${opp.project.name})` : '';

      if (diffDays < 0) {
        dynamicAlerts.push({
          id: `alert-overdue-${opp.id}`,
          type: 'OVERDUE',
          title: 'Prazo Vencido (Atraso)',
          message: `${clientName}${projectSuffix}: Negociação de ${formatCurrency(opp.estimatedValue)} atrasada há ${Math.abs(diffDays)} dia(s).`,
          link: `/projecoes`,
          createdAt: opp.expectedCloseDate,
          priority: 'HIGH',
          isRead: false,
        });
      } else if (diffDays <= 7) {
        dynamicAlerts.push({
          id: `alert-duesoon-${opp.id}`,
          type: 'DUE_SOON',
          title: diffDays === 0 ? 'Vence Hoje!' : `Vence em ${diffDays} dia(s)`,
          message: `${clientName}${projectSuffix}: Fechamento previsto de ${formatCurrency(opp.estimatedValue)}.`,
          link: `/projecoes`,
          createdAt: opp.expectedCloseDate,
          priority: 'MEDIUM',
          isRead: false,
        });
      }
    });

    // 3. Alertas inteligentes de Metas (80% e 100% Batida)
    const goalsWhere: any = {
      periodStart: { lte: now },
      periodEnd: { gte: now },
    };
    if (!isMgr) {
      goalsWhere.executiveId = user.id;
    }

    const currentGoals = await prisma.goal.findMany({
      where: goalsWhere,
      include: {
        area: true,
        executive: { select: { id: true, name: true } },
      },
    });

    for (const g of currentGoals) {
      if (g.metricType !== 'REVENUE' || g.targetValue <= 0) continue;

      const sales = await prisma.sale.findMany({
        where: {
          executiveId: g.executiveId,
          ...(g.areaId ? { areaId: g.areaId } : {}),
          closedAt: {
            gte: g.periodStart,
            lte: g.periodEnd,
          },
        },
      });

      const realized = sales.reduce((acc, s) => acc + s.value, 0);
      const percent = Math.round((realized / g.targetValue) * 100);
      const areaName = g.area?.name || 'Geral';
      const execPrefix = isMgr ? `${g.executive.name}: ` : '';

      if (percent >= 100) {
        dynamicAlerts.unshift({
          id: `alert-goal-won-${g.id}`,
          type: 'GOAL_WON',
          title: 'Meta Batida! 🏆',
          message: `${execPrefix}Atingiu ${percent}% da meta de ${areaName} (${formatCurrency(realized)} de ${formatCurrency(g.targetValue)}).`,
          link: '/metas',
          createdAt: new Date(),
          priority: 'HIGH',
          isRead: false,
        });
      } else if (percent >= 80) {
        dynamicAlerts.push({
          id: `alert-goal-80-${g.id}`,
          type: 'GOAL_80',
          title: 'Quase lá! (≥80% da Meta) 🎯',
          message: `${execPrefix}Atingiu ${percent}% da meta de ${areaName}. Faltam apenas ${formatCurrency(g.targetValue - realized)}.`,
          link: '/metas',
          createdAt: new Date(),
          priority: 'MEDIUM',
          isRead: false,
        });
      }
    }

    // Consolidar alertas
    const allItems = [
      ...dynamicAlerts,
      ...dbNotifications.map((n) => ({
        ...n,
        type: 'SYSTEM',
        priority: 'NORMAL',
      })),
    ];

    const unreadCount = allItems.filter((i) => !i.isRead).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: allItems.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar notificações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
    }

    if (notificationId && !notificationId.startsWith('alert-')) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar.' }, { status: 500 });
  }
}
