import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import AgendaClient from './AgendaClient';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const events = await prisma.agendaEvent.findMany({
    where: { userId: user.id },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          city: true,
        },
      },
    },
    orderBy: { eventDate: 'asc' },
  });

  // Also fetch upcoming visits for seamless schedule integration
  const upcomingVisits = await prisma.visit.findMany({
    where: { executiveId: user.id },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
        },
      },
    },
    orderBy: { visitDate: 'asc' },
  });

  // Fetch upcoming deadlines from pipeline opportunities
  const upcomingDeadlines = await prisma.opportunity.findMany({
    where: {
      status: 'OPEN',
      expectedCloseDate: { not: null },
      ...(user.roleKey === 'manager' ? {} : { executiveId: user.id }),
    },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      area: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
      executive: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { expectedCloseDate: 'asc' },
    take: 20,
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
            Agenda Comercial & Follow-ups
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compromissos, visitas agendadas, reuniões com clientes e prazos de fechamento de propostas e projeções.
          </p>
        </div>
      </div>

      <AgendaClient
        initialEvents={events}
        upcomingVisits={upcomingVisits}
        upcomingDeadlines={upcomingDeadlines}
        clients={clients}
        currentUser={user}
      />
    </div>
  );
}
