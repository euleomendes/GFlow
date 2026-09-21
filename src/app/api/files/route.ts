import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile, ALLOWED_MIME_TYPES } from '@/lib/storage';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const projectId = searchParams.get('projectId');
    const folderId = searchParams.get('folderId');
    const extension = searchParams.get('extension');
    const areaKey = searchParams.get('area');
    const scope = searchParams.get('scope');
    const brandKey = searchParams.get('brandKey');
    const category = searchParams.get('category');

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (projectId) where.projectId = projectId;
    if (folderId) where.folderId = folderId;
    if (extension) where.extension = extension.toLowerCase();
    if (scope && scope !== 'ALL') where.scope = scope;
    if (brandKey && brandKey !== 'ALL') where.brandKey = brandKey;
    if (category && category !== 'ALL') where.category = category;

    if (areaKey && areaKey !== 'all') {
      where.project = {
        areas: { some: { area: { key: areaKey } } },
      };
    }

    const files = await prisma.file.findMany({
      where,
      include: {
        project: {
          include: { areas: { include: { area: true } } },
        },
        folder: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        favorites: { where: { userId: user.id } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Erro ao listar arquivos:', error);
    return NextResponse.json({ error: 'Erro ao carregar arquivos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as globalThis.File | null;
    const projectId = (formData.get('projectId') as string) || null;
    const folderId = (formData.get('folderId') as string) || null;
    const description = (formData.get('description') as string) || null;
    const scope = (formData.get('scope') as string) || 'COMMERCIAL';
    const category = (formData.get('category') as string) || null;
    const brandKey = (formData.get('brandKey') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const ext = path.extname(file.name).toLowerCase().replace('.', '');

    const buffer = Buffer.from(await file.arrayBuffer());

    const { storageKey, size, checksum } = await saveUploadedFile(
      buffer,
      file.name,
      mimeType
    );

    // Create File and initial Version 1 (Seção 25)
    const newFile = await prisma.file.create({
      data: {
        name: file.name,
        description,
        mimeType,
        extension: ext,
        size,
        storageKey,
        scope,
        category,
        brandKey,
        projectId,
        folderId,
        uploadedById: user.id,
        versions: {
          create: {
            versionNumber: 1,
            storageKey,
            size,
            checksum,
            uploadedById: user.id,
            changeNote: 'Upload da versão inicial (v1)',
          },
        },
      },
      include: {
        versions: true,
        project: true,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'UPLOAD_FILE',
      entityType: 'FILE',
      entityId: newFile.id,
      afterData: {
        name: newFile.name,
        size: newFile.size,
        version: 1,
        projectName: newFile.project?.name || null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, file: newFile }, { status: 201 });
  } catch (error: any) {
    console.error('Erro no upload de arquivo:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar arquivo' }, { status: 500 });
  }
}
