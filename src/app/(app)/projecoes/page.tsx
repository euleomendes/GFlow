import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ProjectionsClient from './ProjectionsClient';

export const dynamic = 'force-dynamic';

export default async function ProjecoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [projects, clients, executives, areas] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, status: true, totalValuation: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, tradeName: true, legalName: true, segment: true },
      orderBy: { tradeName: 'asc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: { select: { key: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.area.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <ProjectionsClient
        currentUser={user}
        projects={projects}
        clients={clients}
        executives={executives}
        areas={areas}
      />
    </div>
  );
}
