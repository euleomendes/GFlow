'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Folder,
  File,
  Upload,
  Plus,
  Tv,
  Layers,
  Star,
  Download,
  History,
  MoreVertical,
  Trash2,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  TrendingUp,
  DollarSign,
  Users,
  ExternalLink,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';
import ConvertToSaleModal from '@/components/common/ConvertToSaleModal';

interface ProjectExplorerClientProps {
  project: any;
  currentUser: AuthenticatedUser;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProjectExplorerClient({
  project,
  currentUser,
}: ProjectExplorerClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'FILES' | 'COMMERCIAL'>('FILES');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedOppToConvert, setSelectedOppToConvert] = useState<any | null>(null);

  // Commercial Funnel Metrics
  const totalValuation = (project.valuations || []).reduce(
    (acc: number, v: any) => acc + (v.totalValue || 0),
    0
  );
  const salesTotal = (project.sales || []).reduce(
    (acc: number, s: any) => acc + (s.value || 0),
    0
  );
  const activeOpportunities = (project.opportunities || []).filter(
    (o: any) => o.status === 'OPEN'
  );
  const oppsTotal = activeOpportunities.reduce(
    (acc: number, o: any) => acc + (o.estimatedValue || 0),
    0
  );
  const oppsWeighted = activeOpportunities.reduce(
    (acc: number, o: any) =>
      acc + ((o.estimatedValue || 0) * (o.probability || 0)) / 100,
    0
  );
  const valuationProgress =
    totalValuation > 0
      ? Math.min(100, Math.round((salesTotal / totalValuation) * 100))
      : 0;

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<any | null>(null);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState<any | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [upgradeFile, setUpgradeFile] = useState<globalThis.File | null>(null);
  const [upgradeNote, setUpgradeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isManager = currentUser.roleKey === 'manager';

  // Folders and files at current level
  const currentFolders = project.folders.filter(
    (f: any) => f.parentFolderId === currentFolderId
  );
  const currentFiles = project.files.filter(
    (f: any) => f.folderId === currentFolderId
  );

  // Current folder object for breadcrumb
  const activeFolder = project.folders.find((f: any) => f.id === currentFolderId);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${project.id}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentFolderId: currentFolderId,
        }),
      });

      if (!res.ok) throw new Error('Erro ao criar pasta');
      setShowNewFolderModal(false);
      setNewFolderName('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('projectId', project.id);
      if (currentFolderId) formData.append('folderId', currentFolderId);
      if (uploadDesc) formData.append('description', uploadDesc);

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Erro no upload');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDesc('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgradeVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeFile || !showUpgradeModal) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', upgradeFile);
      formData.append('changeNote', upgradeNote || 'Nova versão substituída');

      const res = await fetch(`/api/files/${showUpgradeModal.id}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Erro ao substituir versão');
      setShowUpgradeModal(null);
      setUpgradeFile(null);
      setUpgradeNote('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}/favorite`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Deseja mover este arquivo para a lixeira?')) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/projetos"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {project.name}
                </h1>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {project.description || 'Biblioteca de apresentações, mídia kits e peças do projeto.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeTab === 'FILES' && (
              <>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Pasta</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Enviar Arquivo</span>
                </button>
              </>
            )}

            {activeTab === 'COMMERCIAL' && (
              <Link
                href={`/projecoes?projectId=${project.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Abrir no Calendário de Projeções</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('FILES')}
            className={`pb-2 font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'FILES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>1. Arquivos & Materiais ({project.files?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMMERCIAL')}
            className={`pb-2 font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'COMMERCIAL'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>2. Funil Comercial & Projeções ({activeOpportunities.length} no funil / {project.sales?.length || 0} fechadas)</span>
          </button>
        </div>

        {/* Breadcrumb Navigation (Apenas na aba de Arquivos) */}
        {activeTab === 'FILES' && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500 overflow-x-auto">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`font-semibold hover:text-blue-600 transition-colors ${
                currentFolderId === null ? 'text-slate-900 font-bold' : ''
              }`}
            >
              Raiz do Projeto
            </button>

            {activeFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">{activeFolder.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Explorer Content */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
        {/* Subpastas */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Pastas ({currentFolders.length})
          </h2>

          {currentFolders.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">
              Nenhuma pasta neste nível.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {currentFolders.map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="bg-white border border-slate-200/80 hover:border-blue-300 p-3.5 rounded-xl shadow-xs text-left transition-all group flex flex-col justify-between"
                >
                  <Folder className="w-7 h-7 text-amber-500 fill-amber-100 group-hover:scale-105 transition-transform" />
                  <div className="mt-2">
                    <span className="font-bold text-xs text-slate-900 line-clamp-1 block">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Abrir pasta
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arquivos */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Arquivos & Materiais ({currentFiles.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {currentFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum arquivo nesta pasta. Clique em "Enviar Arquivo" para adicionar.
              </div>
            ) : (
              currentFiles.map((f: any) => {
                const isFavorited = f.favorites && f.favorites.length > 0;
                const latestVersion = f.versions[0];
                const versionNumber = latestVersion ? latestVersion.versionNumber : 1;

                return (
                  <div
                    key={f.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {f.name}
                          </span>

                          {/* Version Badge (Seção 25) */}
                          <button
                            type="button"
                            onClick={() => setShowVersionHistoryModal(f)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 font-bold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1"
                            title="Ver histórico de versões"
                          >
                            <History className="w-2.5 h-2.5" />
                            <span>v{versionNumber} (ATUAL)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>{formatBytes(f.size)}</span>
                          <span>•</span>
                          <span>Enviado por {f.uploadedBy?.name || 'Sistema'}</span>
                          <span>•</span>
                          <span>{new Date(f.updatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(f.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          isFavorited
                            ? 'bg-amber-50 text-amber-500 border-amber-200'
                            : 'bg-white text-slate-400 border-slate-200 hover:text-amber-500'
                        }`}
                        title={isFavorited ? 'Remover dos favoritos' : 'Favoritar arquivo'}
                      >
                        <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400' : ''}`} />
                      </button>

                      {isManager && (
                        <button
                          type="button"
                          onClick={() => setShowUpgradeModal(f)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          title="Substituir arquivo (Gera nova versão)"
                        >
                          Nova Versão
                        </button>
                      )}

                      <a
                        href={`/api/files/${f.id}`}
                        download
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>

                      {isManager && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(f.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Mover para lixeira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>
      )}

      {/* Commercial Tab Content */}
      {activeTab === 'COMMERCIAL' && (
        <div className="space-y-6">
          {/* Top KPI Cards (alto contraste, tokens do design system) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dusty-denim">
                  Teto / Valoração Oficial
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(totalValuation)}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  <span>Atingimento da cota</span>
                  <span>{valuationProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${valuationProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dusty-denim">
                  Vendas / Cotas Fechadas
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(salesTotal)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {project.sales?.length || 0} cotas/contratos formalizados
              </p>
            </div>

            <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dusty-denim">
                  Em Negociação Ativa
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {formatCurrency(oppsTotal)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activeOpportunities.length} clientes em negociação no funil
              </p>
            </div>

            <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dusty-denim">
                  Projeção Ponderada
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                {formatCurrency(oppsWeighted)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Expectativa ponderada por probabilidade
              </p>
            </div>
          </div>

          {/* Seção 1: Funil de Oportunidades em Aberto do Projeto */}
          <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <span>Funil de Oportunidades & Cotas em Negociação</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Propostas em andamento vinculadas a este projeto ({activeOpportunities.length})
                </p>
              </div>

              <Link
                href={`/projecoes?projectId=${project.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              >
                <span>Ver no Calendário de Projeções</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {activeOpportunities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma negociação em aberto para este projeto no momento.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Vincule novas oportunidades a este projeto no módulo comercial ou no calendário.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Cliente</th>
                      <th className="py-3 px-4">Executivo</th>
                      <th className="py-3 px-4">Área</th>
                      <th className="py-3 px-4">Etapa</th>
                      <th className="py-3 px-4">Probab.</th>
                      <th className="py-3 px-4">Previsão / Deadline</th>
                      <th className="py-3 px-4 text-right">Valor Estimado</th>
                      <th className="py-3 px-4 text-right">Ponderado</th>
                      <th className="py-3 px-4 rounded-r-lg text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {activeOpportunities.map((opp: any) => {
                      const isOverdue =
                        opp.expectedCloseDate && new Date(opp.expectedCloseDate) < new Date();
                      return (
                        <tr
                          key={opp.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <Link
                              href={`/clientes/${opp.client?.id}`}
                              className="hover:text-blue-600 hover:underline"
                            >
                              {opp.client?.tradeName || opp.client?.legalName || 'Cliente'}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {opp.executive?.name || 'Não atribuído'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {opp.area?.name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                              {opp.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {opp.probability || 0}%
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span
                                className={
                                  isOverdue
                                    ? 'text-red-600 dark:text-red-400 font-bold'
                                    : 'text-slate-600 dark:text-slate-300 font-medium'
                                }
                              >
                                {formatDate(opp.expectedCloseDate)}
                              </span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400 border border-red-300 dark:border-red-800">
                                  Atrasado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">
                            {formatCurrency(opp.estimatedValue || 0)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-purple-600 dark:text-purple-400 text-right whitespace-nowrap">
                            {formatCurrency(
                              ((opp.estimatedValue || 0) * (opp.probability || 0)) / 100
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {opp.status !== 'WON' && opp.status !== 'LOST' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOppToConvert(opp)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors"
                                  title="Converter em Venda Oficial"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Converter</span>
                                </button>
                              )}
                              <Link
                                href={`/projecoes?projectId=${project.id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex transition-colors"
                                title="Ver projeções deste projeto"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 2: Cotas & Vendas Fechadas (Ativas) */}
          <div className="bg-white dark:bg-deep-space border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Vendas & Cotas Formalizadas</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Contratos ativos vinculados ao projeto ({project.sales?.length || 0})
                </p>
              </div>
            </div>

            {(!project.sales || project.sales.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma cota ou venda fechada para este projeto ainda.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  As vendas registradas aparecerão aqui e abaterão a valoração total.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Cliente</th>
                      <th className="py-3 px-4">Executivo</th>
                      <th className="py-3 px-4">Área</th>
                      <th className="py-3 px-4">Data Fechamento</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Valor Contratado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {project.sales.map((sale: any) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <Link
                            href={`/clientes/${sale.client?.id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {sale.client?.tradeName || sale.client?.legalName || 'Cliente'}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {sale.executive?.name || 'Não atribuído'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {sale.area?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(sale.closedAt)}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                          {formatCurrency(sale.value || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Criar Nova Pasta (Seção 18)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              A pasta será criada em {activeFolder ? activeFolder.name : 'Raiz do Projeto'}.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nome da Pasta *</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Instagram Stories"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enviar Arquivo */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Enviar Arquivo para o Projeto
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Destino: {activeFolder ? activeFolder.name : 'Raiz do Projeto'}.
            </p>

            <form onSubmit={handleUploadFile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Selecione o Arquivo *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Descrição / Finalidade</label>
                <input
                  type="text"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Ex: Media Kit atualizado para agências"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !uploadFile}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg"
                >
                  {submitting ? 'Enviando...' : 'Fazer Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Substituir Arquivo (Nova Versão) - Seção 25 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Substituir Arquivo — Nova Versão (Seção 25)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              O arquivo anterior não será apagado; ficará preservado no histórico de versões.
            </p>

            <form onSubmit={handleUpgradeVersion} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Novo Arquivo *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUpgradeFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nota da Alteração *</label>
                <input
                  type="text"
                  required
                  value={upgradeNote}
                  onChange={(e) => setUpgradeNote(e.target.value)}
                  placeholder="Ex: Atualização da tabela de preços e cotas ouro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !upgradeFile}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg"
                >
                  {submitting ? 'Gravando...' : 'Publicar Nova Versão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Versões - Seção 25 */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Versionamento de Arquivo (Seção 25)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {showVersionHistoryModal.name}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600">
                {showVersionHistoryModal.versions.length} versões registradas
              </span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {showVersionHistoryModal.versions.map((ver: any, index: number) => (
                <div
                  key={ver.id}
                  className={`p-3 rounded-xl border ${
                    index === 0
                      ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">v{ver.versionNumber}</span>
                      {index === 0 && (
                        <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                          Atual
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ver.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1">
                    {ver.changeNote || 'Sem notas adicionais'}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tamanho: {formatBytes(ver.size)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVersionHistoryModal(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conversão Rápida em Venda */}
      {selectedOppToConvert && (
        <ConvertToSaleModal
          isOpen={!!selectedOppToConvert}
          opportunity={selectedOppToConvert}
          onClose={() => setSelectedOppToConvert(null)}
          onSuccess={() => {
            setSelectedOppToConvert(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
