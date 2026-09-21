import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import GoalsClient from './GoalsClient';

export const dynamic = 'force-dynamic';

export default async function MetasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const manager = isManager(user);

  const goals = await prisma.goal.findMany({
    where: manager ? {} : { executiveId: user.id },
    include: {
      executive: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      area: true,
    },
    orderBy: { periodStart: 'desc' },
  });

  // Calculate dynamic attainment
  const goalsWithAttainment = await Promise.all(
    goals.map(async (goal) => {
      let realized = 0;

      if (goal.metricType === 'REVENUE') {
        const salesInPeriod = await prisma.sale.findMany({
          where: {
            executiveId: goal.executiveId,
            ...(goal.areaId ? { areaId: goal.areaId } : {}),
            closedAt: {
              gte: goal.periodStart,
              lte: goal.periodEnd,
            },
          },
        });
        realized = salesInPeriod.reduce((acc, curr) => acc + curr.value, 0);
      } else if (goal.metricType === 'VISITS_COUNT') {
        realized = await prisma.visit.count({
          where: {
            executiveId: goal.executiveId,
            visitDate: {
              gte: goal.periodStart,
              lte: goal.periodEnd,
            },
          },
        });
      }

      const percentage = goal.targetValue > 0 ? Math.round((realized / goal.targetValue) * 100) : 0;
      const diff = goal.targetValue - realized;

      return {
        ...goal,
        realized,
        percentage,
        difference: diff > 0 ? diff : 0,
      };
    })
  );

  const executives = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const areas = await prisma.area.findMany();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Metas Comerciais & Acompanhamento de Atingimento
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Metas de faturamento e visitas por executivo e área de negócio (TV Guararapes, GPlus Digital e Redes Sociais).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/projecoes"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-deep-space text-white text-xs font-bold shadow-xs hover:bg-ink-black transition-colors"
          >
            <span>Ver Projeções & Forecast (3 Meses) →</span>
          </a>
        </div>
      </div>

      <GoalsClient
        initialGoals={goalsWithAttainment}
        executives={executives}
        areas={areas}
        currentUser={user}
      />
    </div>
  );
}
