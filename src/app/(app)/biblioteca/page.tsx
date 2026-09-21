import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default async function BibliotecaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const files = await prisma.file.findMany({
    where: { deletedAt: null },
    include: {
      project: {
        include: { areas: { include: { area: true } } },
      },
      folder: true,
      versions: { orderBy: { versionNumber: 'desc' } },
      uploadedBy: { select: { id: true, name: true } },
      favorites: { where: { userId: user.id } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      areas: { include: { area: true } },
      _count: { select: { files: true, folders: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Biblioteca Comercial de Materiais & Mídia Kits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dois modos de navegação: Por Projetos e Pastas ou Tabela Unificada de Todos os Materiais.
          </p>
        </div>
      </div>

      <LibraryClient
        initialFiles={files}
        projects={projects}
        currentUser={user}
      />
    </div>
  );
}
