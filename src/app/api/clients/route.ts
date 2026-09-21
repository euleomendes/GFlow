import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const potential = searchParams.get('potential') || '';
    const areaKey = searchParams.get('area') || '';
    const executiveId = searchParams.get('executiveId') || '';

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { legalName: { contains: search } },
        { tradeName: { contains: search } },
        { cnpj: { contains: search } },
        { segment: { contains: search } },
        { city: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (potential) {
      where.potential = potential;
    }

    if (executiveId) {
      where.responsibleUserId = executiveId;
    }

    if (areaKey && areaKey !== 'all') {
      where.areas = {
        some: {
          area: {
            key: areaKey,
          },
        },
      };
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        areas: {
          include: {
            area: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contacts: true,
        _count: {
          select: {
            opportunities: true,
            sales: true,
            visits: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar lista de clientes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user, 'CREATE_CLIENT')) {
      return NextResponse.json(
        { error: 'Você não tem permissão para cadastrar novos clientes.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      legalName,
      tradeName,
      cnpj,
      segment,
      city,
      state,
      address,
      phone,
      website,
      status = 'PROSPECT',
      potential = 'MEDIUM',
      responsibleUserId,
      areaKeys = [], // array like ['tv', 'gplus']
      notes,
      primaryContact, // optional: { name, roleTitle, email, phone }
    } = body;

    if (!legalName && !tradeName) {
      return NextResponse.json(
        { error: 'Razão social ou Nome fantasia é obrigatório.' },
        { status: 400 }
      );
    }

    // Check CNPJ uniqueness if provided
    if (cnpj && cnpj.trim()) {
      const existing = await prisma.client.findFirst({
        where: { cnpj: cnpj.trim(), deletedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Já existe um cliente ativo cadastrado com este CNPJ.' },
          { status: 400 }
        );
      }
    }

    // Determine responsible user: if not provided, assign to current user
    const assignedResponsibleId = responsibleUserId || user.id;

    // Create client
    const newClient = await prisma.client.create({
      data: {
        legalName: legalName || tradeName,
        tradeName: tradeName || legalName,
        cnpj: cnpj?.trim() || null,
        segment: segment || null,
        city: city || null,
        state: state || 'PE',
        address: address || null,
        phone: phone || null,
        website: website || null,
        status,
        potential,
        responsibleUserId: assignedResponsibleId,
        notes: notes || null,
        createdById: user.id,
      },
    });

    // Link areas
    if (areaKeys && areaKeys.length > 0) {
      const areasFound = await prisma.area.findMany({
        where: { key: { in: areaKeys } },
      });

      for (const a of areasFound) {
        await prisma.clientArea.create({
          data: {
            clientId: newClient.id,
            areaId: a.id,
          },
        });
      }
    }

    // Add primary contact if provided
    if (primaryContact && primaryContact.name) {
      await prisma.clientContact.create({
        data: {
          clientId: newClient.id,
          name: primaryContact.name,
          roleTitle: primaryContact.roleTitle || null,
          email: primaryContact.email || null,
          phone: primaryContact.phone || null,
          isPrimary: true,
        },
      });
    }

    // Fetch full created client
    const fullClient = await prisma.client.findUnique({
      where: { id: newClient.id },
      include: {
        areas: { include: { area: true } },
        responsibleUser: true,
        contacts: true,
      },
    });

    // Audit log (Section 27)
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_CLIENT',
      entityType: 'CLIENT',
      entityId: newClient.id,
      beforeData: null,
      afterData: {
        legalName: newClient.legalName,
        tradeName: newClient.tradeName,
        cnpj: newClient.cnpj,
        areas: areaKeys,
        responsibleUserId: assignedResponsibleId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, client: fullClient }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cadastro do cliente.' },
      { status: 500 }
    );
  }
}
