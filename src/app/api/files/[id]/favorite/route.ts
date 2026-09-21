import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_fileId: {
          userId: user.id,
          fileId: params.id,
        },
      },
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });
      return NextResponse.json({ success: true, isFavorited: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          fileId: params.id,
        },
      });
      return NextResponse.json({ success: true, isFavorited: true });
    }
  } catch (error: any) {
    console.error('Erro ao alternar favorito:', error);
    return NextResponse.json({ error: 'Erro ao processar favorito' }, { status: 500 });
  }
}
