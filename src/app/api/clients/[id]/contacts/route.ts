import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const { name, roleTitle, email, phone, isPrimary, notes } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'O nome do contato é obrigatório.' },
        { status: 400 }
      );
    }

    // If marked as primary, unmark other contacts for this client
    if (isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId: client.id },
        data: { isPrimary: false },
      });
    }

    const newContact = await prisma.clientContact.create({
      data: {
        clientId: client.id,
        name,
        roleTitle: roleTitle || null,
        email: email || null,
        phone: phone || null,
        isPrimary: !!isPrimary,
        notes: notes || null,
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_CONTACT',
      entityType: 'CONTACT',
      entityId: newContact.id,
      beforeData: null,
      afterData: {
        clientId: client.id,
        name: newContact.name,
        roleTitle: newContact.roleTitle,
        email: newContact.email,
        phone: newContact.phone,
        isPrimary: newContact.isPrimary,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, contact: newContact }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar contato:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar contato.' },
      { status: 500 }
    );
  }
}
