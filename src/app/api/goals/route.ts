import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const executiveId = searchParams.get('executiveId');
    const areaKey = searchParams.get('area');

    const where: any = {};
    if (!isManager(user)) {
      where.executiveId = user.id;
    } else if (executiveId) {
      where.executiveId = executiveId;
    }

    if (areaKey && areaKey !== 'all') {
      where.area = { key: areaKey };
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: true,
      },
      orderBy: { periodStart: 'desc' },
    });

    // Calculate dynamic attainment for each goal
    const goalsWithAttainment = await Promise.all(
      goals.map(async (goal) => {
        let realized = 0;

        if (goal.metricType === 'REVENUE') {
          const salesInPeriod = await prisma.sale.findMany({
            where: {
              executiveId: goal.executiveId,
              ...(goal.areaId ? { areaId: goal.areaId } : {}),
              closedAt: {
                gte: goal.periodStart,
                lte: goal.periodEnd,
              },
            },
          });
          realized = salesInPeriod.reduce((acc, curr) => acc + curr.value, 0);
        } else if (goal.metricType === 'VISITS_COUNT') {
          realized = await prisma.visit.count({
            where: {
              executiveId: goal.executiveId,
              visitDate: {
                gte: goal.periodStart,
                lte: goal.periodEnd,
              },
            },
          });
        }

        const percentage = goal.targetValue > 0 ? Math.round((realized / goal.targetValue) * 100) : 0;
        const diff = goal.targetValue - realized;

        return {
          ...goal,
          realized,
          percentage,
          difference: diff > 0 ? diff : 0,
        };
      })
    );

    return NextResponse.json({ goals: goalsWithAttainment });
  } catch (error: any) {
    console.error('Erro ao listar metas:', error);
    return NextResponse.json({ error: 'Erro ao carregar metas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas gerentes podem cadastrar ou alterar metas comerciais.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      executiveId,
      areaKey,
      metricType = 'REVENUE',
      targetValue,
      periodStart,
      periodEnd,
    } = body;

    if (!executiveId || !targetValue || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Executivo, valor alvo, data inicial e final são obrigatórios.' },
        { status: 400 }
      );
    }

    let areaId: string | null = null;
    if (areaKey && areaKey !== 'all') {
      const a = await prisma.area.findUnique({ where: { key: areaKey } });
      if (a) areaId = a.id;
    }

    const goal = await prisma.goal.create({
      data: {
        executiveId,
        areaId,
        metricType,
        targetValue: parseFloat(targetValue),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        createdById: user.id,
      },
      include: {
        executive: true,
        area: true,
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_GOAL',
      entityType: 'GOAL',
      entityId: goal.id,
      beforeData: null,
      afterData: {
        executive: goal.executive.name,
        targetValue: goal.targetValue,
        metricType: goal.metricType,
        area: goal.area?.name || 'Geral',
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar meta:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar meta.' }, { status: 500 });
  }
}
