'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Download,
  FileText,
  FolderTree,
  Tv,
  ArrowLeft,
  Search,
  ExternalLink,
  History,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface FavoritesClientProps {
  initialFavorites: any[];
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

export default function FavoritesClient({
  initialFavorites,
  currentUser,
}: FavoritesClientProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const removeFavorite = async (fileId: string) => {
    setRemovingId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/favorite`, { method: 'POST' });
      if (res.ok) {
        setFavorites((prev) => prev.filter((fav) => fav.fileId !== fileId));
      }
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const filteredFavorites = favorites.filter((fav) => {
    const file = fav.file;
    if (!file) return false;
    const s = search.toLowerCase();
    return (
      file.name.toLowerCase().includes(s) ||
      file.project?.name.toLowerCase().includes(s) ||
      file.folder?.name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/biblioteca"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para a Biblioteca
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            Meus Materiais Favoritos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acesso rápido aos seus arquivos, propostas e apresentações marcados como favoritos.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar favoritos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-10 text-center">Fav</th>
                <th className="py-3 px-4">Material / Arquivo</th>
                <th className="py-3 px-4">Projeto & Pasta</th>
                <th className="py-3 px-4">Área Comercial</th>
                <th className="py-3 px-4">Tamanho</th>
                <th className="py-3 px-4">Versão</th>
                <th className="py-3 px-4">Favoritado em</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredFavorites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum material favorito encontrado.
                  </td>
                </tr>
              ) : (
                filteredFavorites.map((fav) => {
                  const file = fav.file;
                  const currentVersion = file.versions?.[0]?.versionNumber || 1;
                  const areaNames = file.project?.areas?.map((a: any) => a.area?.name).join(', ') || 'Geral';

                  return (
                    <tr key={fav.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeFavorite(file.id)}
                          disabled={removingId === file.id}
                          className="p-1 rounded hover:bg-slate-100 transition-colors"
                          title="Remover dos favoritos"
                        >
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500 hover:text-slate-400" />
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
                      <td className="py-3 px-4 text-slate-500">{formatBytes(file.size)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <History className="w-3 h-3 text-slate-500" />
                          v{currentVersion}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(fav.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/files/${file.id}`}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
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
    </div>
  );
}
