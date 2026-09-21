import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import SalesClient from './SalesClient';

export const dynamic = 'force-dynamic';

export default async function VendasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const manager = isManager(user);

  const sales = await prisma.sale.findMany({
    where: manager ? {} : { executiveId: user.id },
    include: {
      client: {
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          city: true,
        },
      },
      executive: {
        select: {
          id: true,
          name: true,
        },
      },
      area: true,
      opportunity: {
        select: {
          id: true,
          stage: true,
        },
      },
    },
    orderBy: { closedAt: 'desc' },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Contratos Comerciais & Gestão de Vendas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro oficial e imutável de faturamento fechado na TV Guararapes e Portal GPlus.
          </p>
        </div>
      </div>

      <SalesClient
        initialSales={sales}
        clients={clients}
        areas={areas}
        executives={executives}
        currentUser={user}
      />
    </div>
  );
}
