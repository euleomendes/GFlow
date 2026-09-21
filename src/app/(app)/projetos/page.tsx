import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ProjectsClient from './ProjectsClient';

export const dynamic = 'force-dynamic';

export default async function ProjetosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      areas: { include: { area: true } },
      folders: { where: { deletedAt: null } },
      files: { where: { deletedAt: null } },
      valuations: { where: { deletedAt: null } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const areas = await prisma.area.findMany();
  const executives = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Projetos Comerciais & Mídia Kits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Grandes coberturas, especiais de programação, pacotes comerciais e biblioteca de arquivos.
          </p>
        </div>
      </div>

      <ProjectsClient
        initialProjects={projects}
        areas={areas}
        executives={executives}
        currentUser={user}
      />
    </div>
  );
}
