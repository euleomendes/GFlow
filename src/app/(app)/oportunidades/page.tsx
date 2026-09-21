import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import OpportunitiesClient from './OpportunitiesClient';

export const dynamic = 'force-dynamic';

export default async function OportunidadesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const manager = isManager(user);

  const opportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      ...(manager ? {} : { executiveId: user.id }),
    },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          city: true,
          state: true,
        },
      },
      executive: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      area: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      proposals: {
        orderBy: { versionNumber: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, tradeName: true, legalName: true },
    orderBy: { tradeName: 'asc' },
  });

  const areas = await prisma.area.findMany();
  const executives = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
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
            Funil Comercial & Pipeline de Oportunidades
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento das etapas comerciais: Lead, Contato, Reunião, Proposta, Negociação e Fechado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/projecoes"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-deep-space text-white text-xs font-bold shadow-xs hover:bg-ink-black transition-colors"
          >
            <span>Ver Projeções & Forecast (3 Meses) →</span>
          </a>
        </div>
      </div>

      <OpportunitiesClient
        initialOpportunities={opportunities}
        clients={clients}
        areas={areas}
        executives={executives}
        projects={projects}
        currentUser={user}
      />
    </div>
  );
}
