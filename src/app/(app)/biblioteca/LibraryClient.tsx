'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderTree,
  FileText,
  Search,
  Star,
  Download,
  Filter,
  Grid,
  List,
  Layers,
  Tv,
  Calendar,
  Eye,
  History,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface LibraryClientProps {
  initialFiles: any[];
  projects: any[];
  currentUser: AuthenticatedUser;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getFormatCategory(mimeType: string = '', name: string = '') {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';

  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  if (mime.includes('video') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'VÍDEO';
  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'IMAGEM';
  if (mime.includes('sheet') || mime.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) return 'PLANILHA';
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['pptx', 'ppt', 'key'].includes(ext)) return 'APRESENTAÇÃO';
  return 'DOCUMENTO';
}

function getFormatBadgeColor(category: string) {
  switch (category) {
    case 'PDF':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'VÍDEO':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'IMAGEM':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PLANILHA':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'APRESENTAÇÃO':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export default function LibraryClient({
  initialFiles,
  projects,
  currentUser,
}: LibraryClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'PROJECTS' | 'FILES'>('FILES');
  const [files, setFiles] = useState(initialFiles);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [selectedFileForHistory, setSelectedFileForHistory] = useState<any | null>(null);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  const toggleFavorite = async (fileId: string) => {
    setTogglingFavoriteId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              const isFav = data.isFavorited;
              return {
                ...f,
                favorites: isFav ? [{ id: 'temp', userId: currentUser.id }] : [],
              };
            }
            return f;
          })
        );
      }
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    } finally {
      setTogglingFavoriteId(null);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.project?.name.toLowerCase().includes(search.toLowerCase()) ||
      file.folder?.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (formatFilter !== 'ALL') {
      const cat = getFormatCategory(file.mimeType, file.name);
      if (cat !== formatFilter) return false;
    }

    return true;
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const totalFilesCount = files.length;
  const totalFavoritesCount = files.filter((f) => f.favorites && f.favorites.length > 0).length;
  const totalProjectsCount = projects.length;

  return (
    <div className="space-y-6">
      {/* Top action bar: Tabs, Favorites link, View switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('FILES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'FILES'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Todos os Materiais ({files.length})
            </button>
            <button
              onClick={() => setViewMode('PROJECTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'PROJECTS'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Por Projetos & Pastas ({projects.length})
            </button>
          </div>

          <Link
            href="/biblioteca/favoritos"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors ml-2"
          >
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Meus Favoritos</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-200/70 text-[10px] text-amber-900">
              {totalFavoritesCount}
            </span>
          </Link>
        </div>

        {/* Global Search & Format Filter */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar materiais, propostas, mídia kits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {viewMode === 'FILES' && (
            <div className="relative">
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos Formatos</option>
                <option value="PDF">PDF</option>
                <option value="VÍDEO">Vídeos</option>
                <option value="IMAGEM">Imagens</option>
                <option value="PLANILHA">Planilhas</option>
                <option value="APRESENTAÇÃO">Apresentações</option>
                <option value="DOCUMENTO">Outros</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalFilesCount}</div>
            <div className="text-xs text-slate-500">Materiais Cadastrados</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalProjectsCount}</div>
            <div className="text-xs text-slate-500">Projetos Comerciais</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalFavoritesCount}</div>
            <div className="text-xs text-slate-500">Materiais Favoritados por Você</div>
          </div>
        </div>
      </div>

      {/* VIEW MODE: FILES TABLE */}
      {viewMode === 'FILES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-10 text-center">Fav</th>
                  <th className="py-3 px-4">Material / Nome do Arquivo</th>
                  <th className="py-3 px-4">Projeto & Pasta</th>
                  <th className="py-3 px-4">Área Comercial</th>
                  <th className="py-3 px-4">Formato / Tamanho</th>
                  <th className="py-3 px-4">Versão</th>
                  <th className="py-3 px-4">Atualizado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum arquivo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => {
                    const isFav = file.favorites && file.favorites.length > 0;
                    const formatCat = getFormatCategory(file.mimeType, file.name);
                    const currentVersion = file.versions?.[0]?.versionNumber || 1;
                    const areaNames = file.project?.areas?.map((a: any) => a.area?.name).join(', ') || 'Geral';

                    return (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleFavorite(file.id)}
                            disabled={togglingFavoriteId === file.id}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                isFav
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300 hover:text-slate-500'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate max-w-xs">{file.name}</span>
                          </div>
                          {file.uploadedBy && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Por {file.uploadedBy.name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {file.project ? (
                            <div>
                              <Link
                                href={`/projetos/${file.project.id}`}
                                className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {file.project.name}
                              </Link>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <FolderTree className="w-3 h-3 text-slate-400" />
                                <span>{file.folder?.name || 'Raiz do Projeto'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Geral</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Tv className="w-2.5 h-2.5" />
                            {areaNames}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getFormatBadgeColor(
                                formatCat
                              )}`}
                            >
                              {formatCat}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedFileForHistory(file)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                            title="Ver histórico de versões"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>v{currentVersion}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatDate(file.updatedAt || file.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/api/files/${file.id}`}
                              download
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Baixar arquivo"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar</span>
                            </a>
                            {file.project && (
                              <Link
                                href={`/projetos/${file.project.id}`}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                title="Abrir no Projeto"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: PROJECTS CARDS */}
      {viewMode === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
              Nenhum projeto encontrado.
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const fileCount = proj._count?.files || 0;
              const folderCount = proj._count?.folders || 0;

              return (
                <div
                  key={proj.id}
                  className="bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col p-5 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {proj.areas?.map((a: any) => (
                        <span
                          key={a.areaId}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {a.area?.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link href={`/projetos/${proj.id}`} className="block">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 flex-1">
                    {proj.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3 font-medium">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {fileCount} arquivos
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                        {folderCount} pastas
                      </span>
                    </div>

                    <Link
                      href={`/projetos/${proj.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 font-semibold text-xs hover:text-blue-800"
                    >
                      Explorar
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VERSION HISTORY MODAL (Seção 25 do blueprint) */}
      {selectedFileForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Histórico de Versões — {selectedFileForHistory.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFileForHistory(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedFileForHistory.versions && selectedFileForHistory.versions.length > 0 ? (
                selectedFileForHistory.versions.map((ver: any, index: number) => (
                  <div
                    key={ver.id}
                    className={`p-3 rounded-lg border text-xs ${
                      index === 0
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                          v{ver.versionNumber}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                            (Versão Atual)
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-normal">
                        {formatDate(ver.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1.5 text-slate-600">
                      <strong>Nota de alteração:</strong> {ver.changeNote || 'Nenhuma nota informada.'}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Tamanho: {formatBytes(ver.size)}</span>
                      {ver.checksum && (
                        <span className="font-mono text-[9px] text-slate-400 truncate max-w-[120px]">
                          Hash: {ver.checksum.slice(0, 10)}...
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Apenas a versão inicial v1 cadastrada.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedFileForHistory(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
