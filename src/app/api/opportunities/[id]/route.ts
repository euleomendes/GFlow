import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        client: true,
        executive: true,
        area: true,
        proposals: {
          orderBy: { versionNumber: 'desc' },
        },
        sales: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error: any) {
    console.error('Erro ao buscar oportunidade:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existingOpp = await prisma.opportunity.findUnique({
      where: { id: params.id, deletedAt: null },
      include: { client: true, area: true },
    });

    if (!existingOpp) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    if (!isManager(user) && existingOpp.executiveId !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode alterar oportunidades das quais é o responsável.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      stage,
      projectId,
      estimatedValue,
      probability,
      expectedCloseDate,
      nextStep,
      notes,
      source,
      areaKey,
    } = body;

    let targetAreaId = existingOpp.areaId;
    if (areaKey) {
      const a = await prisma.area.findUnique({ where: { key: areaKey } });
      if (a) targetAreaId = a.id;
    }

    const finalStage = stage || existingOpp.stage;
    const finalValue = estimatedValue !== undefined ? parseFloat(estimatedValue) : existingOpp.estimatedValue;
    const finalProb = probability !== undefined ? parseInt(probability, 10) : existingOpp.probability;

    const newStatus =
      finalStage === 'CLOSED_WON' ? 'WON' : finalStage === 'CLOSED_LOST' ? 'LOST' : 'OPEN';

    const updatedOpp = await prisma.opportunity.update({
      where: { id: params.id },
      data: {
        stage: finalStage,
        estimatedValue: finalValue,
        probability: finalProb,
        projectId: projectId !== undefined ? (projectId || null) : existingOpp.projectId,
        expectedCloseDate: expectedCloseDate !== undefined ? (expectedCloseDate ? new Date(expectedCloseDate) : null) : existingOpp.expectedCloseDate,
        nextStep: nextStep !== undefined ? nextStep : existingOpp.nextStep,
        notes: notes !== undefined ? notes : existingOpp.notes,
        source: source !== undefined ? source : existingOpp.source,
        areaId: targetAreaId,
        status: newStatus,
      },
      include: {
        client: true,
        area: true,
        project: true,
        executive: true,
      },
    });

    // Se mudou para CLOSED_WON e ainda não gerou venda, criar registro em Sales (Seção 13)
    if (finalStage === 'CLOSED_WON' && existingOpp.stage !== 'CLOSED_WON') {
      const existingSale = await prisma.sale.findFirst({
        where: { opportunityId: updatedOpp.id },
      });

      if (!existingSale) {
        await prisma.sale.create({
          data: {
            opportunityId: updatedOpp.id,
            clientId: updatedOpp.clientId,
            executiveId: updatedOpp.executiveId,
            areaId: updatedOpp.areaId,
            projectId: updatedOpp.projectId || null,
            value: updatedOpp.estimatedValue,
            closedAt: new Date(),
            status: 'ACTIVE',
            reference: `VENDA-OPP-${updatedOpp.id.slice(-6).toUpperCase()}`,
            notes: `Venda gerada automaticamente ao fechar oportunidade como ganha. ${updatedOpp.notes || ''}`,
            createdById: user.id,
          },
        });
      }
    }

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'UPDATE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: updatedOpp.id,
      beforeData: {
        stage: existingOpp.stage,
        estimatedValue: existingOpp.estimatedValue,
        probability: existingOpp.probability,
      },
      afterData: {
        stage: updatedOpp.stage,
        estimatedValue: updatedOpp.estimatedValue,
        probability: updatedOpp.probability,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, opportunity: updatedOpp });
  } catch (error: any) {
    console.error('Erro ao atualizar oportunidade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar oportunidade.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const opp = await prisma.opportunity.findUnique({
      where: { id: params.id, deletedAt: null },
      include: { client: true },
    });

    if (!opp) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    if (!isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas gerentes podem excluir oportunidades.' },
        { status: 403 }
      );
    }

    await prisma.opportunity.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: opp.id,
      beforeData: { client: opp.client.tradeName, value: opp.estimatedValue },
      afterData: { deletedAt: new Date() },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir oportunidade:', error);
    return NextResponse.json({ error: 'Erro ao excluir oportunidade.' }, { status: 500 });
  }
}
