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

    const project = await prisma.project.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        areas: { include: { area: true } },
        folders: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
        files: {
          where: { deletedAt: null },
          include: {
            versions: { orderBy: { versionNumber: 'desc' } },
            uploadedBy: { select: { id: true, name: true } },
            favorites: { where: { userId: user.id } },
          },
          orderBy: { updatedAt: 'desc' },
        },
        valuations: {
          where: { deletedAt: null },
          include: { items: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Erro ao buscar projeto:', error);
    return NextResponse.json({ error: 'Erro ao carregar projeto' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Apenas gerentes podem editar projetos.' }, { status: 403 });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: params.id, deletedAt: null },
      include: { areas: { include: { area: true } } },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, status, startDate, endDate, totalValuation, areaKeys } = body;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: name || existingProject.name,
        description: description !== undefined ? description : existingProject.description,
        status: status || existingProject.status,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existingProject.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingProject.endDate,
        totalValuation: totalValuation !== undefined ? parseFloat(totalValuation) : existingProject.totalValuation,
      },
    });

    // Update areas if provided
    if (areaKeys && Array.isArray(areaKeys)) {
      await prisma.projectArea.deleteMany({ where: { projectId: params.id } });
      const areasFound = await prisma.area.findMany({ where: { key: { in: areaKeys } } });
      for (const a of areasFound) {
        await prisma.projectArea.create({
          data: { projectId: params.id, areaId: a.id },
        });
      }
    }

    await recordAuditLog({
      actorUserId: user.id,
      action: 'UPDATE_PROJECT',
      entityType: 'PROJECT',
      entityId: updated.id,
      beforeData: { name: existingProject.name, status: existingProject.status },
      afterData: { name: updated.name, status: updated.status },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar projeto' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Apenas gerentes podem excluir projetos.' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });

    await prisma.project.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await prisma.trashItem.create({
      data: {
        entityType: 'PROJECT',
        entityId: project.id,
        name: project.name,
        deletedByUserId: user.id,
        originalData: JSON.stringify(project),
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_PROJECT',
      entityType: 'PROJECT',
      entityId: project.id,
      beforeData: { name: project.name },
      afterData: { deletedAt: new Date() },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir projeto:', error);
    return NextResponse.json({ error: 'Erro ao excluir projeto' }, { status: 500 });
  }
}
