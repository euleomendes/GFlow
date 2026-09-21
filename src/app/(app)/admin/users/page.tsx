import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import UsersManagerClient from './UsersManagerClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  // Rigorous backend check (Section 39)
  if (!currentUser || !isManager(currentUser)) {
    redirect('/dashboard?error=unauthorized');
  }

  const users = await prisma.user.findMany({
    include: {
      role: true,
      executive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const roles = await prisma.role.findMany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Gestão de Utilizadores e Executivos
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Controle de acesso, criação de contas, permissões e status dos colaboradores comerciais.
        </p>
      </div>

      <UsersManagerClient initialUsers={users} roles={roles} />
    </div>
  );
}
