'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Palette,
  FileText,
  Megaphone,
  Layers,
  Upload,
  Download,
  Star,
  Search,
  Plus,
  Copy,
  Check,
  History,
  Trash2,
  ExternalLink,
  FolderTree,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface MarketingClientProps {
  section: string;
  initialFiles: any[];
  initialColors: any[];
  projects: any[];
  currentUser: AuthenticatedUser;
}

const BRAND_CATEGORIES = [
  'Logo principal',
  'Logo horizontal',
  'Logo vertical',
  'Logo negativa',
  'Logo positiva',
  'SVG',
  'PNG',
  'JPG',
  'Favicon',
  'Ícones',
  'Templates',
  'Manual de marca',
];

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MarketingSectionClient({
  section,
  initialFiles,
  initialColors,
  projects,
  currentUser,
}: MarketingClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [colors, setColors] = useState(initialColors);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'COLORS' | 'MANUAL'>('ASSETS');
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Upload Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState(BRAND_CATEGORIES[0]);
  const [fileDescription, setFileDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Color Form state
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [colorRgb, setColorRgb] = useState('');
  const [colorCmyk, setColorCmyk] = useState('');
  const [colorUsage, setColorUsage] = useState('');
  const [colorNotes, setColorNotes] = useState('');

  const isManager = currentUser.roleKey === 'manager';
  const brandKey = section === 'identidade-tv' ? 'tv' : section === 'identidade-gplus' ? 'gplus' : null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setSubmitting(true);
    setStatusError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', fileDescription);
      formData.append('category', fileCategory);
      if (brandKey) formData.append('brandKey', brandKey);

      let scope = 'MARKETING';
      if (section === 'identidade-tv' || section === 'identidade-gplus') scope = 'BRAND';
      else if (section === 'institucional') scope = 'INSTITUTIONAL';
      else if (section === 'campanhas') scope = 'CAMPAIGN';
      formData.append('scope', scope);

      if (selectedProjectId) formData.append('projectId', selectedProjectId);

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar arquivo.');

      setShowUploadModal(false);
      setSelectedFile(null);
      setFileDescription('');
      router.refresh();
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandKey) return;
    setSubmitting(true);
    setStatusError('');

    try {
      const res = await fetch('/api/marketing/brand-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandKey,
          name: colorName,
          hex: colorHex,
          rgb: colorRgb || null,
          cmyk: colorCmyk || null,
          usage: colorUsage || null,
          notes: colorNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cor oficial.');

      setColors([...colors, data.color]);
      setShowColorModal(false);
      setColorName('');
      setColorHex('');
      setColorRgb('');
      setColorCmyk('');
      setColorUsage('');
      setColorNotes('');
      router.refresh();
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, favorites: data.isFavorited ? [{ id: 'temp', userId: currentUser.id }] : [] }
              : f
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFiles = files.filter((f) => {
    const s = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(s) ||
      (f.category && f.category.toLowerCase().includes(s)) ||
      (f.description && f.description.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {section === 'identidade-tv' && 'Identidade Visual TV Guararapes (Canal 9.1)'}
            {section === 'identidade-gplus' && 'Identidade Visual Portal GPlus & Digital'}
            {section === 'institucional' && 'Arquivos Institucionais da Emissora'}
            {section === 'campanhas' && 'Campanhas Promocionais & Chamadas'}
            {section === 'projetos' && 'Projetos de Marketing & Ações Especiais'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {section === 'identidade-tv' && 'Assets oficiais da marca Record/Guararapes, logotipos, paleta de cores e manuais.'}
            {section === 'identidade-gplus' && 'Identidade da marca digital multiplataforma GPlus, ícones e aplicações.'}
            {section === 'institucional' && 'Apresentações da emissora, fotos de estúdio e materiais de relações públicas.'}
            {section === 'campanhas' && 'Peças gráficas, chamadas, spots de rádio/TV e vídeos promocionais.'}
            {section === 'projetos' && 'Iniciativas de marketing conectadas aos projetos comerciais sem duplicação de arquivos.'}
          </p>
        </div>

        {/* Manager Actions */}
        <div className="flex items-center gap-2">
          {isManager && (
            <>
              {brandKey && (
                <button
                  onClick={() => setShowColorModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Cor Oficial</span>
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar Asset Oficial</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs for Brand Identity sections */}
      {brandKey && (
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'ASSETS'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Logotipos & Assets ({filteredFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('COLORS')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'COLORS'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Paleta de Cores Oficial ({colors.length})
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar assets por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* TAB: COLORS (Regras 3 e 5) */}
      {brandKey && activeTab === 'COLORS' && (
        <div className="space-y-4">
          {colors.length === 0 ? (
            // REGRA 5: "Exemplo de estado vazio: 'Paleta ainda não cadastrada.' Não inserir cores inventadas."
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
              <Palette className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">Paleta ainda não cadastrada.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Nenhuma cor oficial foi inserida para esta marca. Os dados de HEX, RGB e CMYK devem ser cadastrados pelo administrador com base no manual oficial da TV Guararapes.
              </p>
              {isManager && (
                <button
                  onClick={() => setShowColorModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Primeira Cor Oficial
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <div
                  key={color.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
                >
                  <div
                    className="h-24 w-full flex items-end p-3"
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className="px-2 py-0.5 rounded bg-black/40 text-white text-[11px] font-mono font-bold backdrop-blur-xs">
                      {color.hex}
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{color.name}</div>
                      {color.usage && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <strong>Uso:</strong> {color.usage}
                        </div>
                      )}
                      {color.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 italic">
                          {color.notes}
                        </div>
                      )}
                    </div>

                    {/* Copiadores de Códigos (Regra 5: só aparecem quando cadastrados) */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      <button
                        onClick={() => handleCopy(color.hex)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 font-mono text-slate-700"
                        title="Copiar HEX"
                      >
                        {copiedCode === color.hex ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{color.hex}</span>
                      </button>

                      {color.rgb && (
                        <button
                          onClick={() => handleCopy(color.rgb)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 font-mono text-slate-700"
                          title="Copiar RGB"
                        >
                          {copiedCode === color.rgb ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>RGB</span>
                        </button>
                      )}

                      {color.cmyk && (
                        <button
                          onClick={() => handleCopy(color.cmyk)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 font-mono text-slate-700"
                          title="Copiar CMYK"
                        >
                          {copiedCode === color.cmyk ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>CMYK</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ASSETS TABLE / GALLERY (Regra 1, 3 e 4) */}
      {(!brandKey || activeTab === 'ASSETS') && (
        <div className="space-y-4">
          {filteredFiles.length === 0 ? (
            // REGRA 3: "Quando não houver informação cadastrada, apresentar estado vazio: 'Este conteúdo ainda não foi cadastrado.'"
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">Este conteúdo ainda não foi cadastrado.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Nenhum arquivo ou asset oficial foi disponibilizado nesta categoria até o momento.
              </p>
              {isManager && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Fazer Upload do Primeiro Arquivo
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">Fav</th>
                      <th className="py-3 px-4">Nome do Arquivo / Asset</th>
                      <th className="py-3 px-4">Categoria da Marca</th>
                      <th className="py-3 px-4">Formato / Tamanho</th>
                      <th className="py-3 px-4">Versão</th>
                      <th className="py-3 px-4">Enviado Por</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredFiles.map((f) => {
                      const isFav = f.favorites && f.favorites.length > 0;
                      const currentVersion = f.versions?.[0]?.versionNumber || 1;

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleFavorite(f.id)}
                              className="p-1 rounded hover:bg-slate-100"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  isFav
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300 hover:text-slate-400'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="truncate max-w-xs">{f.name}</span>
                            </div>
                            {f.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                                {f.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {f.category || 'Geral'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="uppercase font-bold text-[10px] text-slate-700 mr-1">
                              {f.extension}
                            </span>
                            <span className="text-slate-400">({formatBytes(f.size)})</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              <History className="w-3 h-3 text-slate-400" />
                              v{currentVersion}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {f.uploadedBy?.name || 'Sistema'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {formatDate(f.updatedAt || f.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`/api/files/${f.id}`}
                                download
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Baixar</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: UPLOAD DE NOVO ASSET (Centralizado em /api/files - Regra 1) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                Upload de Asset Oficial de Marketing
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {statusError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs">
                {statusError}
              </div>
            )}

            <form onSubmit={handleUploadAsset} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Arquivo do Asset *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoria Oficial *
                </label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {BRAND_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vincular a Projeto Comercial (Opcional - Regra 2)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Nenhum (Material Geral da Emissora)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição / Notas de Aplicação
                </label>
                <textarea
                  rows={2}
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="Ex: Versão vetorial SVG para grandes formatos e backdrop de estúdio..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedFile}
                  className="px-4 py-1.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Confirmar Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO DE COR OFICIAL (Regra 5) */}
      {showColorModal && brandKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                Cadastrar Cor Oficial da Marca ({brandKey.toUpperCase()})
              </h3>
              <button
                onClick={() => setShowColorModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {statusError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs">
                {statusError}
              </div>
            )}

            <form onSubmit={handleSaveColor} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome da Cor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Azul Guararapes Primário"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    HEX *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="#0047AB"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    RGB (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="0, 71, 171"
                    value={colorRgb}
                    onChange={(e) => setColorRgb(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CMYK (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="100, 58, 0, 33"
                    value={colorCmyk}
                    onChange={(e) => setColorCmyk(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Uso Recomendado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fundos institucionais, assinaturas digitais..."
                  value={colorUsage}
                  onChange={(e) => setColorUsage(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Não utilizar sobre fundos vermelhos ou com saturação inferior a 40%..."
                  value={colorNotes}
                  onChange={(e) => setColorNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowColorModal(false)}
                  className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !colorName || !colorHex}
                  className="px-4 py-1.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Cor Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
