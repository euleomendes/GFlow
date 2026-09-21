import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import ValuationsClient from './ValuationsClient';

export const dynamic = 'force-dynamic';

export default async function ValoracoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const valuations = await prisma.valuation.findMany({
    where: { deletedAt: null },
    include: {
      project: {
        include: { areas: { include: { area: true } } },
      },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Valorações Comerciais Estruturadas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tabelas de preços, cotas de patrocínio e entregas detalhadas por projeto da emissora.
          </p>
        </div>
      </div>

      <ValuationsClient
        initialValuations={valuations}
        projects={projects}
        currentUser={user}
      />
    </div>
  );
}
