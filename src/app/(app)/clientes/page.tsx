import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ClientsTableClient from './ClientsTableClient';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    include: {
      areas: {
        include: {
          area: true,
        },
      },
      responsibleUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      contacts: {
        where: { isPrimary: true },
      },
      _count: {
        select: {
          opportunities: true,
          sales: true,
          visits: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const areas = await prisma.area.findMany();
  const executives = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Carteira de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão unificada de clientes TV Guararapes e GPlus Digital, histórico de atendimento e contatos.
          </p>
        </div>
      </div>

      <ClientsTableClient
        initialClients={clients}
        areas={areas}
        executives={executives}
        currentUser={user}
      />
    </div>
  );
}
