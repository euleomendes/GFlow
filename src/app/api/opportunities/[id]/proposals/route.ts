import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const proposals = await prisma.proposal.findMany({
      where: { opportunityId: params.id },
      orderBy: { versionNumber: 'desc' },
    });

    return NextResponse.json({ proposals });
  } catch (error: any) {
    console.error('Erro ao listar propostas:', error);
    return NextResponse.json({ error: 'Erro ao carregar propostas' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: params.id, deletedAt: null },
      include: { proposals: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { value, status = 'DRAFT', notes } = body;

    const lastVersion = opportunity.proposals[0]?.versionNumber || 0;
    const newVersionNumber = lastVersion + 1;
    const proposalValue = parseFloat(value) || opportunity.estimatedValue;

    const newProposal = await prisma.proposal.create({
      data: {
        opportunityId: opportunity.id,
        versionNumber: newVersionNumber,
        value: proposalValue,
        status,
        notes: notes || null,
        createdById: user.id,
      },
    });

    // Update opportunity estimated value to match proposal
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: {
        estimatedValue: proposalValue,
        stage: status === 'APPROVED' ? 'NEGOTIATION' : opportunity.stage,
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_PROPOSAL_VERSION',
      entityType: 'PROPOSAL',
      entityId: newProposal.id,
      beforeData: { lastVersion },
      afterData: {
        opportunityId: opportunity.id,
        versionNumber: newVersionNumber,
        value: proposalValue,
        status,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, proposal: newProposal }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar proposta:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar versão de proposta' }, { status: 500 });
  }
}
