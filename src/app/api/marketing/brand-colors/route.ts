import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const brandKey = searchParams.get('brandKey');

    const where: any = {};
    if (brandKey && brandKey !== 'ALL') {
      where.brandKey = brandKey.toLowerCase();
    }

    const colors = await prisma.brandColor.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ colors });
  } catch (error: any) {
    console.error('Erro ao listar cores da marca:', error);
    return NextResponse.json({ error: 'Erro ao carregar cores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // Regra 6: Apenas Manager/Admin pode cadastrar/alterar identidade oficial da marca
    if (!isManager(user)) {
      return NextResponse.json(
        { error: 'Apenas Gerentes/Administradores podem cadastrar dados de identidade visual.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { brandKey, name, hex, rgb, cmyk, usage, notes } = body;

    if (!brandKey || !name || !hex) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: Marca (brandKey), Nome da cor e Código HEX.' },
        { status: 400 }
      );
    }

    const newColor = await prisma.brandColor.create({
      data: {
        brandKey: brandKey.toLowerCase(),
        name,
        hex: hex.toUpperCase(),
        rgb: rgb || null,
        cmyk: cmyk || null,
        usage: usage || null,
        notes: notes || null,
        createdById: user.id,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'CREATE_BRAND_COLOR',
      entityType: 'BRAND_COLOR',
      entityId: newColor.id,
      afterData: { brandKey, name, hex, rgb, cmyk },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, color: newColor }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar cor oficial:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar cor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID da cor obrigatório' }, { status: 400 });

    const existingColor = await prisma.brandColor.findUnique({ where: { id } });
    if (!existingColor) return NextResponse.json({ error: 'Cor não encontrada' }, { status: 404 });

    await prisma.brandColor.delete({ where: { id } });

    await recordAuditLog({
      actorUserId: user.id,
      action: 'DELETE_BRAND_COLOR',
      entityType: 'BRAND_COLOR',
      entityId: id,
      beforeData: existingColor,
      afterData: null,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir cor oficial:', error);
    return NextResponse.json({ error: 'Erro ao excluir cor' }, { status: 500 });
  }
}
