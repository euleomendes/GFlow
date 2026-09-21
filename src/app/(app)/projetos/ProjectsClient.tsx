'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  Plus,
  Tv,
  Layers,
  Calendar,
  FolderTree,
  FileText,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ProjectsClientProps {
  initialProjects: any[];
  areas: any[];
  executives: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function ProjectsClient({
  initialProjects,
  areas,
  executives,
  currentUser,
}: ProjectsClientProps) {
  const router = useRouter();
  const [projects] = useState(initialProjects);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalValuation, setTotalValuation] = useState('');
  const [areaKeys, setAreaKeys] = useState<string[]>(['tv']);

  const isManager = currentUser.roleKey === 'manager';

  const toggleAreaKey = (key: string) => {
    if (areaKeys.includes(key)) {
      if (areaKeys.length > 1) setAreaKeys(areaKeys.filter((k) => k !== key));
    } else {
      setAreaKeys([...areaKeys, key]);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          totalValuation: parseFloat(totalValuation) || 0,
          areaKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar projeto');

      setShowModal(false);
      setName('');
      setDescription('');
      setTotalValuation('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));

    const projectAreas = p.areas.map((a: any) => a.area.key);
    let matchesArea = true;
    if (areaFilter === 'tv') matchesArea = projectAreas.includes('tv');
    if (areaFilter === 'gplus') matchesArea = projectAreas.includes('gplus');
    if (areaFilter === 'redes_sociais') matchesArea = projectAreas.includes('redes_sociais');

    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por projeto ou cobertura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setAreaFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setAreaFilter('tv')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'tv' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              TV
            </button>
            <button
              onClick={() => setAreaFilter('gplus')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'gplus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              GPlus
            </button>
            <button
              onClick={() => setAreaFilter('redes_sociais')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                areaFilter === 'redes_sociais' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Redes Sociais
            </button>
          </div>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((p) => {
          const hasTV = p.areas.some((a: any) => a.area.key === 'tv');
          const hasGPlus = p.areas.some((a: any) => a.area.key === 'gplus');
          const hasSocial = p.areas.some((a: any) => a.area.key === 'redes_sociais');

          return (
            <div
              key={p.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {hasTV && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        <Tv className="w-2.5 h-2.5" />
                        <span>TV</span>
                      </span>
                    )}
                    {hasGPlus && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Layers className="w-2.5 h-2.5" />
                        <span>GPlus</span>
                      </span>
                    )}
                    {hasSocial && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                        <Share2 className="w-2.5 h-2.5" />
                        <span>Redes</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {p.status}
                  </span>
                </div>

                <Link
                  href={`/projetos/${p.id}`}
                  className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors block"
                >
                  {p.name}
                </Link>

                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {p.description || 'Sem descrição cadastrada'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valoração Total</span>
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(p.totalValuation || 0)}
                    </span>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div>{p.folders.length} pastas</div>
                    <div>{p.files.length} arquivos</div>
                  </div>
                </div>
              </div>

              <Link
                href={`/projetos/${p.id}`}
                className="w-full py-2 bg-slate-50 group-hover:bg-blue-50/60 text-slate-700 group-hover:text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <span>Explorar Pastas e Arquivos</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Modal: Novo Projeto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl my-8 text-xs space-y-3.5">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Criar Novo Projeto Comercial (Seção 17)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Projetos especiais, cotas comemorativas e coberturas jornalísticas.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: São João 2027 da Guararapes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cobertura integrada Caruaru e Região Metropolitana..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Áreas */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-700">Áreas Comerciais</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('tv')}
                      onChange={() => toggleAreaKey('tv')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">TV Guararapes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('gplus')}
                      onChange={() => toggleAreaKey('gplus')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">GPlus Digital</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('redes_sociais')}
                      onChange={() => toggleAreaKey('redes_sociais')}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Redes Sociais</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Valoração Estimada (R$)</label>
                  <input
                    type="number"
                    value={totalValuation}
                    onChange={(e) => setTotalValuation(e.target.value)}
                    placeholder="Ex: 250000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="PLANNING">Planejamento</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="COMPLETED">Encerrado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data Término</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Criando...' : 'Criar Projeto & Estrutura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
