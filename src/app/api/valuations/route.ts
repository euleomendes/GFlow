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
    const projectId = searchParams.get('projectId');

    const where: any = { deletedAt: null };
    if (projectId) where.projectId = projectId;

    const valuations = await prisma.valuation.findMany({
      where,
      include: {
        project: {
          include: { areas: { include: { area: true } } },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ valuations });
  } catch (error: any) {
    console.error('Erro ao listar valorações:', error);
    return NextResponse.json({ error: 'Erro ao carregar valorações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas gerentes podem cadastrar valorações estruturadas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      title,
      validFrom,
      validTo,
      notes,
      items = [], // array of { product, quantity, unitValue, deliverables, notes }
    } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Projeto e título da valoração são obrigatórios.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });

    // Calculate total valuation
    const totalValue = items.reduce(
      (acc: number, item: any) => acc + (parseFloat(item.unitValue) || 0) * (parseInt(item.quantity, 10) || 1),
      0
    );

    const valuation = await prisma.valuation.create({
      data: {
        projectId,
        title,
        totalValue,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        notes: notes || null,
        createdById: user.id,
        items: {
          create: items.map((item: any) => ({
            product: item.product,
            quantity: parseInt(item.quantity, 10) || 1,
            unitValue: parseFloat(item.unitValue) || 0,
            totalValue: (parseFloat(item.unitValue) || 0) * (parseInt(item.quantity, 10) || 1),
            deliverables: item.deliverables || null,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        items: true,
        project: true,
      },
    });

    // Update Project totalValuation
    await prisma.project.update({
      where: { id: projectId },
      data: { totalValuation: (project.totalValuation || 0) + totalValue },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_VALUATION',
      entityType: 'VALUATION',
      entityId: valuation.id,
      afterData: {
        title: valuation.title,
        projectName: project.name,
        totalValue: valuation.totalValue,
        itemsCount: items.length,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, valuation }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar valoração:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar valoração' }, { status: 500 });
  }
}
