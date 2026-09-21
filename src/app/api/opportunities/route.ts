import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const stage = searchParams.get('stage') || '';
    const areaKey = searchParams.get('area') || '';
    const executiveId = searchParams.get('executiveId') || '';
    const clientId = searchParams.get('clientId') || '';
    const projectId = searchParams.get('projectId') || '';

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { client: { tradeName: { contains: search } } },
        { client: { legalName: { contains: search } } },
        { nextStep: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }

    if (areaKey && areaKey !== 'all') {
      where.area = { key: areaKey };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (projectId && projectId !== 'ALL') {
      where.projectId = projectId;
    }

    // Role-based scoping: If executive, restrict to their own unless manager
    if (!isManager(user)) {
      where.executiveId = user.id;
    } else if (executiveId) {
      where.executiveId = executiveId;
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            city: true,
            state: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        proposals: {
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalValue = opportunities.reduce((acc, curr) => acc + curr.estimatedValue, 0);
    const weightedTotal = opportunities.reduce(
      (acc, curr) => acc + (curr.estimatedValue * curr.probability) / 100,
      0
    );

    return NextResponse.json({
      opportunities,
      metrics: {
        count: opportunities.length,
        totalValue,
        weightedTotal,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar oportunidades:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar oportunidades comerciais.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user, 'CREATE_OPPORTUNITY')) {
      return NextResponse.json(
        { error: 'Você não tem permissão para cadastrar oportunidades.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      projectId,
      areaKey = 'tv',
      stage = 'LEAD',
      estimatedValue = 0,
      probability = 10,
      expectedCloseDate,
      source = 'Prospecção Ativa',
      nextStep,
      notes,
      executiveId,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Selecione o cliente.' }, { status: 400 });
    }

    const area = await prisma.area.findUnique({ where: { key: areaKey } });
    if (!area) {
      return NextResponse.json({ error: 'Área comercial inválida.' }, { status: 400 });
    }

    const assignedExecutiveId =
      isManager(user) && executiveId ? executiveId : user.id;

    const opportunity = await prisma.opportunity.create({
      data: {
        clientId,
        projectId: projectId || null,
        executiveId: assignedExecutiveId,
        areaId: area.id,
        stage,
        estimatedValue: parseFloat(estimatedValue) || 0,
        probability: parseInt(probability, 10) || 10,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        source,
        nextStep: nextStep || null,
        notes: notes || null,
        status: stage === 'CLOSED_WON' ? 'WON' : stage === 'CLOSED_LOST' ? 'LOST' : 'OPEN',
        createdById: user.id,
      },
      include: {
        client: true,
        executive: true,
        area: true,
        project: true,
      },
    });

    // Se criada já como proposta inicial com valor, registrar versão de proposta v1
    if (parseFloat(estimatedValue) > 0) {
      await prisma.proposal.create({
        data: {
          opportunityId: opportunity.id,
          versionNumber: 1,
          value: parseFloat(estimatedValue),
          status: 'DRAFT',
          notes: 'Versão inicial gerada no cadastro da oportunidade',
          createdById: user.id,
        },
      });
    }

    // Se marcada como CLOSED_WON, gerar automaticamente a venda
    if (stage === 'CLOSED_WON') {
      await prisma.sale.create({
        data: {
          opportunityId: opportunity.id,
          clientId: opportunity.clientId,
          executiveId: opportunity.executiveId,
          areaId: opportunity.areaId,
          projectId: opportunity.projectId || null,
          value: opportunity.estimatedValue,
          closedAt: new Date(),
          status: 'ACTIVE',
          reference: `VENDA-OPP-${opportunity.id.slice(-6).toUpperCase()}`,
          notes: opportunity.notes || 'Venda originada de oportunidade ganha',
          createdById: user.id,
        },
      });
    }

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: opportunity.id,
      beforeData: null,
      afterData: {
        clientName: opportunity.client.tradeName,
        area: area.name,
        estimatedValue: opportunity.estimatedValue,
        stage: opportunity.stage,
        probability: opportunity.probability,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, opportunity }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar oportunidade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar oportunidade comercial.' },
      { status: 500 }
    );
  }
}
