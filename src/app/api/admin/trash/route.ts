import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado à lixeira.' }, { status: 403 });
    }

    const items = await prisma.trashItem.findMany({
      include: {
        deletedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Erro ao listar lixeira:', error);
    return NextResponse.json({ error: 'Erro ao carregar lixeira' }, { status: 500 });
  }
}

// POST: Restaurar item (Seção 26 & 47)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { trashId } = await request.json();

    const item = await prisma.trashItem.findUnique({
      where: { id: trashId },
    });

    if (!item) return NextResponse.json({ error: 'Item não encontrado na lixeira.' }, { status: 404 });

    // Restore based on entityType
    if (item.entityType === 'PROJECT') {
      await prisma.project.update({ where: { id: item.entityId }, data: { deletedAt: null } });
    } else if (item.entityType === 'FILE') {
      await prisma.file.update({ where: { id: item.entityId }, data: { deletedAt: null } });
    } else if (item.entityType === 'CLIENT') {
      await prisma.client.update({ where: { id: item.entityId }, data: { deletedAt: null } });
    } else if (item.entityType === 'OPPORTUNITY') {
      await prisma.opportunity.update({ where: { id: item.entityId }, data: { deletedAt: null } });
    }

    // Remove from trash table
    await prisma.trashItem.delete({ where: { id: trashId } });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'RESTORE_ITEM',
      entityType: item.entityType,
      entityId: item.entityId,
      afterData: { name: item.name, restoredAt: new Date() },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao restaurar item:', error);
    return NextResponse.json({ error: error.message || 'Erro ao restaurar item' }, { status: 500 });
  }
}

// DELETE: Excluir definitivamente (Seção 26)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trashId = searchParams.get('trashId');

    if (!trashId) return NextResponse.json({ error: 'ID do item obrigatório' }, { status: 400 });

    const item = await prisma.trashItem.findUnique({ where: { id: trashId } });
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    // Permanent deletion on respective table
    if (item.entityType === 'PROJECT') {
      await prisma.project.delete({ where: { id: item.entityId } }).catch(() => {});
    } else if (item.entityType === 'FILE') {
      await prisma.file.delete({ where: { id: item.entityId } }).catch(() => {});
    } else if (item.entityType === 'CLIENT') {
      await prisma.client.delete({ where: { id: item.entityId } }).catch(() => {});
    } else if (item.entityType === 'OPPORTUNITY') {
      await prisma.opportunity.delete({ where: { id: item.entityId } }).catch(() => {});
    }

    await prisma.trashItem.delete({ where: { id: trashId } });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'PERMANENT_DELETE',
      entityType: item.entityType,
      entityId: item.entityId,
      beforeData: { name: item.name, originalData: item.originalData },
      afterData: null,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir definitivamente:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir' }, { status: 500 });
  }
}
