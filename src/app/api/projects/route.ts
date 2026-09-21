import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const areaKey = searchParams.get('area') || '';

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (areaKey && areaKey !== 'all') {
      where.areas = {
        some: { area: { key: areaKey } },
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        areas: { include: { area: true } },
        folders: { where: { deletedAt: null } },
        files: { where: { deletedAt: null } },
        valuations: { where: { deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Erro ao listar projetos:', error);
    return NextResponse.json({ error: 'Erro ao carregar projetos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas gerentes podem cadastrar novos projetos comerciais.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      status = 'PLANNING',
      startDate,
      endDate,
      responsibleUserId,
      totalValuation = 0,
      areaKeys = ['tv'],
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'O nome do projeto é obrigatório.' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        responsibleUserId: responsibleUserId || user.id,
        totalValuation: parseFloat(totalValuation) || 0,
        createdById: user.id,
      },
    });

    // Link areas (TV, GPlus)
    if (areaKeys && areaKeys.length > 0) {
      const areasFound = await prisma.area.findMany({
        where: { key: { in: areaKeys } },
      });

      for (const a of areasFound) {
        await prisma.projectArea.create({
          data: {
            projectId: project.id,
            areaId: a.id,
          },
        });
      }
    }

    // Criar pastas padrão essenciais (Seção 18)
    const defaultFolders = [
      'Apresentação',
      'Media Kit',
      'Valoração',
      'Cotas de Patrocínio',
      'Peças & Criativos',
      'Documentos Oficiais',
    ];

    for (const folderName of defaultFolders) {
      await prisma.projectFolder.create({
        data: {
          projectId: project.id,
          name: folderName,
          createdById: user.id,
        },
      });
    }

    // Auditoria
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_PROJECT',
      entityType: 'PROJECT',
      entityId: project.id,
      beforeData: null,
      afterData: {
        name: project.name,
        status: project.status,
        totalValuation: project.totalValuation,
        areas: areaKeys,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar projeto:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar projeto' }, { status: 500 });
  }
}
