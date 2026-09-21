import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import VisitsClient from './VisitsClient';

export const dynamic = 'force-dynamic';

export default async function VisitasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const manager = isManager(user);

  // If not manager, show user's visits, otherwise show all
  const visits = await prisma.visit.findMany({
    where: manager ? {} : { executiveId: user.id },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          city: true,
          state: true,
          areas: { include: { area: true } },
        },
      },
      executive: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { visitDate: 'desc' },
  });

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, tradeName: true, legalName: true },
    orderBy: { tradeName: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Registro & Gestão de Visitas Comerciais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Relatórios de reuniões presenciais e virtuais, necessidades mapeadas e qualificação de oportunidades.
          </p>
        </div>
      </div>

      <VisitsClient
        initialVisits={visits}
        clients={clients}
        currentUser={user}
      />
    </div>
  );
}
