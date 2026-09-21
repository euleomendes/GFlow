import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

export default async function FavoritosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
      file: { deletedAt: null },
    },
    include: {
      file: {
        include: {
          project: {
            include: { areas: { include: { area: true } } },
          },
          folder: true,
          versions: { orderBy: { versionNumber: 'desc' } },
          uploadedBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <FavoritesClient initialFavorites={favorites} currentUser={user} />
    </div>
  );
}
