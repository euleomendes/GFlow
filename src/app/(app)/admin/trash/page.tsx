import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import TrashClient from './TrashClient';

export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) {
    redirect('/dashboard?error=unauthorized');
  }

  const trashItems = await prisma.trashItem.findMany({
    include: {
      deletedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { deletedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Lixeira do Sistema & Recuperação de Itens
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento seguro de itens excluídos com suporte a restauração e exclusão definitiva auditada (Acesso exclusivo Gerência).
          </p>
        </div>
      </div>

      <TrashClient initialItems={trashItems} currentUser={user} />
    </div>
  );
}
