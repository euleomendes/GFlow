'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { User, Users } from 'lucide-react';

interface ExecutiveSelectorProps {
  executives: { id: string; name: string }[];
  selectedExecutiveId: string;
  selectedAreaKey: string;
}

export default function ExecutiveSelector({
  executives,
  selectedExecutiveId,
  selectedAreaKey,
}: ExecutiveSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (val === 'all') {
      params.delete('executiveId');
    } else {
      params.set('executiveId', val);
    }

    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
      <div className="flex items-center gap-1 pl-2 text-deep-space/70 text-[11px]">
        {selectedExecutiveId === 'all' ? (
          <Users className="w-3.5 h-3.5 text-deep-space/60" />
        ) : (
          <User className="w-3.5 h-3.5 text-blue-slate" />
        )}
        <span>Visão:</span>
      </div>
      <select
        value={selectedExecutiveId}
        onChange={handleSelect}
        className="bg-white text-ink-black text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200/70 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-slate/20 focus:border-blue-slate cursor-pointer"
        aria-label="Selecionar visão de executivo comercial"
      >
        <option value="all">Todos os Executivos (Consolidado)</option>
        {executives.map((exec) => (
          <option key={exec.id} value={exec.id}>
            {exec.name}
          </option>
        ))}
      </select>
    </div>
  );
}
