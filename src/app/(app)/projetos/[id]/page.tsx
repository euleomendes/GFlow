import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ProjectExplorerClient from './ProjectExplorerClient';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
      opportunities: {
        where: { deletedAt: null },
        include: {
          client: { select: { id: true, tradeName: true, legalName: true } },
          executive: { select: { id: true, name: true } },
          area: true,
        },
        orderBy: { estimatedValue: 'desc' },
      },
      sales: {
        where: { status: 'ACTIVE' },
        include: {
          client: { select: { id: true, tradeName: true, legalName: true } },
          executive: { select: { id: true, name: true } },
          area: true,
        },
        orderBy: { closedAt: 'desc' },
      },
    },
  });

  if (!project) notFound();

  return (
    <ProjectExplorerClient
      project={project}
      currentUser={user}
    />
  );
}
