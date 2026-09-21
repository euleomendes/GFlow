import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ClientDetailsClient from './ClientDetailsClient';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const client = await prisma.client.findUnique({
    where: { id: params.id, deletedAt: null },
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
          role: true,
        },
      },
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      },
      visits: {
        orderBy: { visitDate: 'desc' },
        include: {
          executive: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      opportunities: {
        orderBy: { createdAt: 'desc' },
        include: {
          area: true,
          executive: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      sales: {
        orderBy: { closedAt: 'desc' },
        include: {
          area: true,
          executive: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  // Fetch client audit events for the timeline (Section 28)
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'CLIENT', entityId: client.id },
        { entityType: 'VISIT', afterData: { contains: client.id } },
        { entityType: 'CONTACT', afterData: { contains: client.id } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const allAreas = await prisma.area.findMany();
  const executives = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <ClientDetailsClient
      client={client}
      auditLogs={auditLogs}
      allAreas={allAreas}
      executives={executives}
      currentUser={user}
    />
  );
}
