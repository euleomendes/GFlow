import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import MarketingSectionClient from '../MarketingSectionClient';

export const dynamic = 'force-dynamic';

export default async function MarketingSectionPage({
  params,
}: {
  params: { section: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { section } = params;

  // Define database query filters according to section
  const whereFile: any = { deletedAt: null };
  let brandKeyForColors: string | null = null;

  if (section === 'identidade-tv') {
    whereFile.scope = 'BRAND';
    whereFile.brandKey = 'tv';
    brandKeyForColors = 'tv';
  } else if (section === 'identidade-gplus') {
    whereFile.scope = 'BRAND';
    whereFile.brandKey = 'gplus';
    brandKeyForColors = 'gplus';
  } else if (section === 'institucional') {
    whereFile.scope = 'INSTITUTIONAL';
  } else if (section === 'campanhas') {
    whereFile.scope = 'CAMPAIGN';
  } else if (section === 'projetos') {
    whereFile.scope = { in: ['MARKETING', 'COMMERCIAL'] };
  } else {
    whereFile.scope = 'MARKETING';
  }

  const [files, colors, projects] = await Promise.all([
    prisma.file.findMany({
      where: whereFile,
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
    }),
    brandKeyForColors
      ? prisma.brandColor.findMany({
          where: { brandKey: brandKeyForColors },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <MarketingSectionClient
        section={section}
        initialFiles={files}
        initialColors={colors}
        projects={projects}
        currentUser={user}
      />
    </div>
  );
}
