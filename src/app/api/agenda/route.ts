import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');

    const where: any = {
      userId: user.id,
    };

    if (completed !== null && completed !== undefined && completed !== '') {
      where.isDone = completed === 'true';
    }

    const events = await prisma.agendaEvent.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            city: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Erro ao listar agenda:', error);
    return NextResponse.json({ error: 'Erro ao carregar agenda' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      eventType = 'MEETING',
      clientId,
      opportunityId,
    } = body;

    if (!title || !eventDate) {
      return NextResponse.json({ error: 'Título e data são obrigatórios.' }, { status: 400 });
    }

    const event = await prisma.agendaEvent.create({
      data: {
        title,
        description: description || null,
        eventDate: new Date(eventDate),
        startTime: startTime || null,
        endTime: endTime || null,
        eventType,
        clientId: clientId || null,
        opportunityId: opportunityId || null,
        userId: user.id,
      },
      include: {
        client: true,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_AGENDA_EVENT',
      entityType: 'AGENDA_EVENT',
      entityId: event.id,
      afterData: { title: event.title, eventDate: event.eventDate },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar evento na agenda:', error);
    return NextResponse.json({ error: error.message || 'Erro ao agendar compromisso' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id, isDone } = await request.json();

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
    });

    if (!event || event.userId !== user.id) {
      return NextResponse.json({ error: 'Compromisso não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.agendaEvent.update({
      where: { id },
      data: { isDone: !!isDone },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar status da agenda:', error);
    return NextResponse.json({ error: 'Erro ao atualizar compromisso' }, { status: 500 });
  }
}
