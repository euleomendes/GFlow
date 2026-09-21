import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contact = await prisma.clientContact.findUnique({
      where: { id: params.contactId },
    });

    if (!contact || contact.clientId !== params.id) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    await prisma.clientContact.delete({
      where: { id: params.contactId },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_CONTACT',
      entityType: 'CONTACT',
      entityId: contact.id,
      beforeData: { name: contact.name, email: contact.email, clientId: contact.clientId },
      afterData: null,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir contato:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir contato.' },
      { status: 500 }
    );
  }
}
