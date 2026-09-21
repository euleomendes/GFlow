import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const executiveId = searchParams.get('executiveId');
    const hasOpportunity = searchParams.get('hasOpportunity');

    const where: any = {};

    if (clientId) where.clientId = clientId;

    // If not manager and no specific executive queried, restrict to current user's visits
    if (!isManager(user)) {
      where.executiveId = user.id;
    } else if (executiveId) {
      where.executiveId = executiveId;
    }

    if (hasOpportunity !== null && hasOpportunity !== undefined && hasOpportunity !== '') {
      where.hasOpportunity = hasOpportunity === 'true';
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            city: true,
            state: true,
            areas: { include: { area: true } },
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { visitDate: 'desc' },
    });

    return NextResponse.json({ visits });
  } catch (error: any) {
    console.error('Erro ao listar visitas:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar visitas comerciais.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user, 'CREATE_VISIT')) {
      return NextResponse.json(
        { error: 'Você não possui permissão para registrar visitas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      visitDate,
      startTime,
      visitType = 'IN_PERSON',
      objective,
      participants,
      discussion,
      needs,
      hasOpportunity = false,
      potentialValue,
      nextStep,
      nextContactDate,
      notes,
      areaKey, // optional area to spawn opportunity if needed
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Selecione o cliente atendido.' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId, deletedAt: null },
      include: { areas: { include: { area: true } } },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente selecionado não foi encontrado.' },
        { status: 404 }
      );
    }

    // Optional: if hasOpportunity is true and potentialValue > 0, create linked opportunity
    let generatedOpportunityId: string | null = null;
    if (hasOpportunity && potentialValue && potentialValue > 0) {
      // Find area: use areaKey if supplied, else client's first area or TV default
      let area = client.areas[0]?.area;
      if (areaKey) {
        const found = await prisma.area.findUnique({ where: { key: areaKey } });
        if (found) area = found;
      }

      if (area) {
        const newOpp = await prisma.opportunity.create({
          data: {
            clientId: client.id,
            executiveId: user.id,
            areaId: area.id,
            stage: 'CONTACT',
            estimatedValue: parseFloat(potentialValue),
            probability: 20,
            source: 'Visita Comercial',
            nextStep: nextStep || 'Follow-up de reunião',
            notes: `Oportunidade gerada automaticamente a partir da visita em ${new Date(
              visitDate || Date.now()
            ).toLocaleDateString('pt-BR')}: ${objective || ''}`,
            status: 'OPEN',
            createdById: user.id,
          },
        });
        generatedOpportunityId = newOpp.id;
      }
    }

    const visit = await prisma.visit.create({
      data: {
        clientId,
        executiveId: user.id,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        startTime: startTime || null,
        visitType,
        objective: objective || null,
        participants: participants || null,
        discussion: discussion || null,
        needs: needs || null,
        hasOpportunity: !!hasOpportunity,
        opportunityId: generatedOpportunityId,
        potentialValue: potentialValue ? parseFloat(potentialValue) : null,
        nextStep: nextStep || null,
        nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
        notes: notes || null,
        createdById: user.id,
      },
      include: {
        client: true,
        executive: true,
      },
    });

    // Record audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_VISIT',
      entityType: 'VISIT',
      entityId: visit.id,
      beforeData: null,
      afterData: {
        clientId: visit.clientId,
        clientName: client.tradeName,
        visitType: visit.visitType,
        hasOpportunity: visit.hasOpportunity,
        potentialValue: visit.potentialValue,
        opportunityId: generatedOpportunityId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, visit }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar visita:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar visita comercial.' },
      { status: 500 }
    );
  }
}
