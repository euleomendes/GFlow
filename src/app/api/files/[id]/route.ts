import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { saveUploadedFile, getFileStream } from '@/lib/storage';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const file = await prisma.file.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });

    const latestVersion = file.versions[0];
    const filePath = getFileStream(latestVersion ? latestVersion.storageKey : file.storageKey);

    try {
      const fileBuffer = await fs.readFile(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': file.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Arquivo físico não encontrado no disco de armazenamento.' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Erro ao baixar arquivo:', error);
    return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 });
  }
}

// POST: Substituir arquivo gerando NOVA VERSÃO (Seção 25 do blueprint)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existingFile = await prisma.file.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!existingFile) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const uploadedFile = formData.get('file') as globalThis.File | null;
    const changeNote = (formData.get('changeNote') as string) || 'Substituição de versão';

    if (!uploadedFile) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado para a nova versão.' }, { status: 400 });
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    const mimeType = uploadedFile.type || existingFile.mimeType;

    const { storageKey, size, checksum } = await saveUploadedFile(
      buffer,
      uploadedFile.name,
      mimeType
    );

    const nextVersionNumber = (existingFile.versions[0]?.versionNumber || 1) + 1;

    // Create FileVersion record (Seção 25)
    const newVersion = await prisma.fileVersion.create({
      data: {
        fileId: existingFile.id,
        versionNumber: nextVersionNumber,
        storageKey,
        size,
        checksum,
        uploadedById: user.id,
        changeNote,
      },
    });

    // Update File metadata
    const updatedFile = await prisma.file.update({
      where: { id: existingFile.id },
      data: {
        size,
        storageKey,
        currentVersionId: newVersion.id,
        name: uploadedFile.name || existingFile.name,
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    // Auditoria (Seção 27)
    await recordAuditLog({
      actorUserId: user.id,
      action: 'VERSION_UPGRADE',
      entityType: 'FILE',
      entityId: existingFile.id,
      beforeData: {
        version: existingFile.versions[0]?.versionNumber || 1,
        size: existingFile.size,
      },
      afterData: {
        version: nextVersionNumber,
        size,
        changeNote,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, file: updatedFile, newVersion });
  } catch (error: any) {
    console.error('Erro ao atualizar versão do arquivo:', error);
    return NextResponse.json({ error: error.message || 'Erro ao subir nova versão' }, { status: 500 });
  }
}

// DELETE: Mover arquivo para a lixeira (Seção 26)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const file = await prisma.file.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });

    await prisma.file.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await prisma.trashItem.create({
      data: {
        entityType: 'FILE',
        entityId: file.id,
        name: file.name,
        deletedByUserId: user.id,
        originalData: JSON.stringify(file),
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_FILE',
      entityType: 'FILE',
      entityId: file.id,
      beforeData: { name: file.name, size: file.size },
      afterData: { deletedAt: new Date() },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir arquivo:', error);
    return NextResponse.json({ error: 'Erro ao excluir arquivo' }, { status: 500 });
  }
}
