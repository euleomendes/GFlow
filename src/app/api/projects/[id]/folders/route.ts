import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const folders = await prisma.projectFolder.findMany({
      where: { projectId: params.id, deletedAt: null },
      include: {
        subFolders: { where: { deletedAt: null } },
        files: { where: { deletedAt: null } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('Erro ao listar pastas:', error);
    return NextResponse.json({ error: 'Erro ao carregar pastas' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Apenas gerentes podem criar pastas.' }, { status: 403 });
    }

    const { name, parentFolderId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });
    }

    const folder = await prisma.projectFolder.create({
      data: {
        projectId: params.id,
        parentFolderId: parentFolderId || null,
        name,
        createdById: user.id,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_FOLDER',
      entityType: 'FOLDER',
      entityId: folder.id,
      afterData: { name: folder.name, projectId: folder.projectId, parentFolderId: folder.parentFolderId },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, folder }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pasta:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar pasta' }, { status: 500 });
  }
}
