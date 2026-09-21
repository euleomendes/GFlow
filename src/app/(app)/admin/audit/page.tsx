import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const currentUser = await getCurrentUser();

  // Strict backend check (Section 39)
  if (!currentUser || !isManager(currentUser)) {
    redirect('/dashboard?error=unauthorized');
  }

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Auditoria Global e Histórico de Ações
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Registro imutável de todas as modificações, acessos, exclusões e alterações no sistema.
        </p>
      </div>

      <AuditClient initialLogs={logs} />
    </div>
  );
}
