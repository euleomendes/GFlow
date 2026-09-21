import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const areaKey = searchParams.get('area') || '';
    const executiveId = searchParams.get('executiveId') || '';
    const clientId = searchParams.get('clientId') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { client: { tradeName: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    if (areaKey && areaKey !== 'all') {
      where.area = { key: areaKey };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (!isManager(user)) {
      where.executiveId = user.id;
    } else if (executiveId) {
      where.executiveId = executiveId;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        client: true,
        executive: true,
        area: true,
        opportunity: true,
      },
      orderBy: { closedAt: 'desc' },
    });

    const totalRevenue = sales.reduce((acc, curr) => acc + curr.value, 0);

    return NextResponse.json({
      sales,
      metrics: {
        count: sales.length,
        totalRevenue,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar vendas:', error);
    return NextResponse.json({ error: 'Erro ao carregar contratos de venda.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      clientId,
      areaKey = 'tv',
      value,
      closedAt,
      reference,
      notes,
      opportunityId,
      projectId,
      executiveId,
    } = body;

    if (!clientId || !value) {
      return NextResponse.json({ error: 'Cliente e valor são obrigatórios.' }, { status: 400 });
    }

    const area = await prisma.area.findUnique({ where: { key: areaKey } });
    if (!area) return NextResponse.json({ error: 'Área comercial inválida.' }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });

    const assignedExecutiveId = isManager(user) && executiveId ? executiveId : user.id;

    // Se houver oportunidade vinculada, verificar projeto se não fornecido
    let targetProjectId = projectId || null;
    if (!targetProjectId && opportunityId) {
      const opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { projectId: true },
      });
      if (opp?.projectId) targetProjectId = opp.projectId;
    }

    const sale = await prisma.sale.create({
      data: {
        clientId,
        executiveId: assignedExecutiveId,
        areaId: area.id,
        projectId: targetProjectId,
        value: parseFloat(value),
        closedAt: closedAt ? new Date(closedAt) : new Date(),
        reference: reference || `CONTRATO-${Date.now().toString().slice(-6)}`,
        notes: notes || null,
        opportunityId: opportunityId || null,
        createdById: user.id,
      },
      include: {
        client: true,
        area: true,
        executive: true,
        project: true,
      },
    });

    // Se vinculada a oportunidade, fechar oportunidade como WON
    if (opportunityId) {
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { stage: 'CLOSED_WON', status: 'WON' },
      });
    }

    // Auditoria
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_SALE',
      entityType: 'SALE',
      entityId: sale.id,
      beforeData: null,
      afterData: {
        clientName: client.tradeName,
        value: sale.value,
        reference: sale.reference,
        area: area.name,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar venda:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar venda.' }, { status: 500 });
  }
}
