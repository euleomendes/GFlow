import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
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
            role: true,
          },
        },
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        visits: {
          orderBy: { visitDate: 'desc' },
          include: {
            executive: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        opportunities: {
          orderBy: { createdAt: 'desc' },
          include: {
            area: true,
            executive: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sales: {
          orderBy: { closedAt: 'desc' },
          include: {
            area: true,
            executive: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Fetch audit history for this client (Section 28)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'CLIENT',
        entityId: client.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ client, auditLogs });
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dados do cliente.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const existingClient = await prisma.client.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        areas: { include: { area: true } },
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Authorization check: only manager or responsible executive can edit
    const canEdit =
      isManager(user) ||
      (hasPermission(user, 'EDIT_OWN_CLIENT') && existingClient.responsibleUserId === user.id);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Você só pode editar clientes dos quais é o responsável.' },
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
      status,
      potential,
      responsibleUserId,
      areaKeys, // e.g. ['tv', 'gplus']
      notes,
    } = body;

    // Only manager can reassign responsible user to someone else
    const finalResponsibleUserId =
      isManager(user) && responsibleUserId ? responsibleUserId : existingClient.responsibleUserId;

    // Update Client fields
    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        legalName: legalName || existingClient.legalName,
        tradeName: tradeName || existingClient.tradeName,
        cnpj: cnpj !== undefined ? (cnpj ? cnpj.trim() : null) : existingClient.cnpj,
        segment: segment !== undefined ? segment : existingClient.segment,
        city: city !== undefined ? city : existingClient.city,
        state: state !== undefined ? state : existingClient.state,
        address: address !== undefined ? address : existingClient.address,
        phone: phone !== undefined ? phone : existingClient.phone,
        website: website !== undefined ? website : existingClient.website,
        status: status || existingClient.status,
        potential: potential || existingClient.potential,
        responsibleUserId: finalResponsibleUserId,
        notes: notes !== undefined ? notes : existingClient.notes,
      },
    });

    // Update Area links if provided
    if (areaKeys && Array.isArray(areaKeys)) {
      await prisma.clientArea.deleteMany({
        where: { clientId: params.id },
      });

      const areasFound = await prisma.area.findMany({
        where: { key: { in: areaKeys } },
      });

      for (const a of areasFound) {
        await prisma.clientArea.create({
          data: {
            clientId: params.id,
            areaId: a.id,
          },
        });
      }
    }

    // Record Audit Log with Before and After diff (Section 27 & 28)
    const beforeData = {
      legalName: existingClient.legalName,
      tradeName: existingClient.tradeName,
      cnpj: existingClient.cnpj,
      status: existingClient.status,
      potential: existingClient.potential,
      responsibleUserId: existingClient.responsibleUserId,
      areas: existingClient.areas.map((a) => a.area.key),
    };

    const afterData = {
      legalName: updatedClient.legalName,
      tradeName: updatedClient.tradeName,
      cnpj: updatedClient.cnpj,
      status: updatedClient.status,
      potential: updatedClient.potential,
      responsibleUserId: finalResponsibleUserId,
      areas: areaKeys || beforeData.areas,
    };

    await recordAuditLog({
      actorUserId: user.id,
      action: 'UPDATE_CLIENT',
      entityType: 'CLIENT',
      entityId: updatedClient.id,
      beforeData,
      afterData,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar dados do cliente.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only manager can soft-delete clients
    if (!isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas gerentes podem excluir clientes da base.' },
        { status: 403 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    // Soft delete (Section 26 & 39)
    await prisma.client.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    // Create trash entry
    await prisma.trashItem.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.id,
        name: client.tradeName || client.legalName,
        deletedByUserId: user.id,
        originalData: JSON.stringify(client),
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_CLIENT',
      entityType: 'CLIENT',
      entityId: client.id,
      beforeData: { name: client.tradeName, cnpj: client.cnpj },
      afterData: { deletedAt: new Date() },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cliente.' },
      { status: 500 }
    );
  }
}
