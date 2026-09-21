import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const executives = await prisma.user.findMany({
    where: { role: { key: 'executive' }, status: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <ReportsClient currentUser={user} executives={executives} />
    </div>
  );
}
