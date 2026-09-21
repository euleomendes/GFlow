'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Tv,
  Layers,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  User,
  Filter,
  AlertCircle,
  Briefcase,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Share2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ClientsTableClientProps {
  initialClients: any[];
  areas: any[];
  executives: any[];
  currentUser: AuthenticatedUser;
}

export default function ClientsTableClient({
  initialClients,
  areas,
  executives,
  currentUser,
}: ClientsTableClientProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPotential, setSelectedPotential] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('Recife');
  const [state, setState] = useState('PE');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('PROSPECT');
  const [potential, setPotential] = useState('MEDIUM');
  const [responsibleUserId, setResponsibleUserId] = useState(currentUser.id);
  const [areaKeys, setAreaKeys] = useState<string[]>(['tv']);
  const [notes, setNotes] = useState('');

  // Primary contact
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const toggleAreaKey = (key: string) => {
    if (areaKeys.includes(key)) {
      if (areaKeys.length > 1) {
        setAreaKeys(areaKeys.filter((k) => k !== key));
      }
    } else {
      setAreaKeys([...areaKeys, key]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          tradeName: tradeName || legalName,
          cnpj,
          segment,
          city,
          state,
          phone,
          website,
          status,
          potential,
          responsibleUserId,
          areaKeys,
          notes,
          primaryContact: contactName
            ? {
                name: contactName,
                roleTitle: contactRole,
                email: contactEmail,
                phone: contactPhone,
              }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente.');

      setShowModal(false);
      // Reset form
      setLegalName('');
      setTradeName('');
      setCnpj('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.legalName.toLowerCase().includes(q) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
      (c.cnpj && c.cnpj.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.segment && c.segment.toLowerCase().includes(q));

    const clientAreaKeys = c.areas.map((a: any) => a.area.key);
    let matchesArea = true;
    if (selectedArea === 'tv') {
      matchesArea = clientAreaKeys.includes('tv');
    } else if (selectedArea === 'gplus') {
      matchesArea = clientAreaKeys.includes('gplus');
    } else if (selectedArea === 'redes_sociais') {
      matchesArea = clientAreaKeys.includes('redes_sociais');
    } else if (selectedArea === 'both') {
      matchesArea = clientAreaKeys.length > 1;
    }

    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
    const matchesPotential = selectedPotential === 'ALL' || c.potential === selectedPotential;

    return matchesSearch && matchesArea && matchesStatus && matchesPotential;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Ativo</span>;
      case 'PROSPECT':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Prospect</span>;
      case 'INACTIVE':
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">Inativo</span>;
      case 'LOST':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Perdido</span>;
      default:
        return <span className="text-slate-500 text-[10px]">{status}</span>;
    }
  };

  const getPotentialBadge = (potential: string) => {
    switch (potential) {
      case 'STRATEGIC':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Estratégico</span>;
      case 'HIGH':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded text-[10px] font-bold">Alto</span>;
      case 'MEDIUM':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">Médio</span>;
      case 'LOW':
        return <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">Baixo</span>;
      default:
        return <span className="text-slate-500 text-[10px]">{potential}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Action Bar */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por razão, fantasia, CNPJ ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>

        {/* Category Pills & Selects */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Área:
          </span>
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedArea('ALL')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedArea === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedArea('tv')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedArea === 'tv'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              TV
            </button>
            <button
              onClick={() => setSelectedArea('gplus')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedArea === 'gplus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              GPlus
            </button>
            <button
              onClick={() => setSelectedArea('redes_sociais')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedArea === 'redes_sociais'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              Redes Sociais
            </button>
            <button
              onClick={() => setSelectedArea('both')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedArea === 'both'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Multi-Área
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Todos Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="PROSPECT">Prospect</option>
            <option value="INACTIVE">Inativo</option>
            <option value="LOST">Perdido</option>
          </select>

          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Potencial:
          </span>
          <select
            value={selectedPotential}
            onChange={(e) => setSelectedPotential(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Todos Potenciais</option>
            <option value="STRATEGIC">Estratégico</option>
            <option value="HIGH">Alto</option>
            <option value="MEDIUM">Médio</option>
            <option value="LOW">Baixo</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Cliente / Razão Social</th>
                <th className="py-3 px-4">Áreas Atendidas</th>
                <th className="py-3 px-4">Segmento & Local</th>
                <th className="py-3 px-4">Executivo Resp.</th>
                <th className="py-3 px-4">Status & Potencial</th>
                <th className="py-3 px-4 text-center">Interações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const hasTV = client.areas.some((a: any) => a.area.key === 'tv');
                  const hasGPlus = client.areas.some((a: any) => a.area.key === 'gplus');
                  const hasSocial = client.areas.some((a: any) => a.area.key === 'redes_sociais');

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 block text-xs"
                        >
                          {client.tradeName || client.legalName}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {client.legalName}
                          {client.cnpj && ` • CNPJ: ${client.cnpj}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasTV && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              <Tv className="w-2.5 h-2.5" />
                              <span>TV</span>
                            </span>
                          )}
                          {hasGPlus && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <Layers className="w-2.5 h-2.5" />
                              <span>GPlus</span>
                            </span>
                          )}
                          {hasSocial && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <Share2 className="w-2.5 h-2.5" />
                              <span>Redes</span>
                            </span>
                          )}
                          {!hasTV && !hasGPlus && !hasSocial && (
                            <span className="text-[10px] text-slate-400 italic">Não definida</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium text-[11px]">
                          {client.segment || 'Geral'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>
                            {client.city ? `${client.city}/${client.state}` : 'Pernambuco'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[9px]">
                            {client.responsibleUser?.name?.slice(0, 2).toUpperCase() || 'EX'}
                          </div>
                          <span className="text-xs text-slate-800 font-medium truncate max-w-[120px]">
                            {client.responsibleUser?.name || 'Não atribuído'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(client.status)}
                          {getPotentialBadge(client.potential)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span title="Visitas">{client._count?.visits || 0} visitas</span>
                          <span>•</span>
                          <span title="Oportunidades">{client._count?.opportunities || 0} opps</span>
                          <span>•</span>
                          <span title="Vendas">{client._count?.sales || 0} vendas</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-100/60 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>Histórico 360°</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar Novo Cliente
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Preencha os dados cadastrais da empresa e selecione a área de atendimento (TV, GPlus ou ambas).
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Supermercados Bom Preço"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ex: Bom Preço Nordeste Ltda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Segmento
                  </label>
                  <input
                    type="text"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Varejo, Automotivo, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Telefone Principal
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(81) 3333-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Conceito de Área: Checkboxes múltiplos TV e GPlus (Seção 3) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-700">
                  Área Comercial Atendida * (Seção 3)
                </label>
                <div className="flex items-center gap-6 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('tv')}
                      onChange={() => toggleAreaKey('tv')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Tv className="w-3.5 h-3.5 text-blue-600" />
                      <span>TV Guararapes (Canal 9.1)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('gplus')}
                      onChange={() => toggleAreaKey('gplus')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>GPlus Digital</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areaKeys.includes('redes_sociais')}
                      onChange={() => toggleAreaKey('redes_sociais')}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Redes Sociais</span>
                    </span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Um cliente pode comprar simultaneamente na TV, no GPlus e nas Redes Sociais.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="PROSPECT">Prospect</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="LOST">Cliente Perdido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Potencial
                  </label>
                  <select
                    value={potential}
                    onChange={(e) => setPotential(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="STRATEGIC">Estratégico</option>
                    <option value="HIGH">Alto</option>
                    <option value="MEDIUM">Médio</option>
                    <option value="LOW">Baixo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Executivo Responsável
                  </label>
                  <select
                    value={responsibleUserId}
                    onChange={(e) => setResponsibleUserId(e.target.value)}
                    disabled={currentUser.roleKey !== 'manager'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none disabled:bg-slate-100"
                  >
                    {executives.map((exec) => (
                      <option key={exec.id} value={exec.id}>
                        {exec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contato Principal Inicial (Seção 10) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                <div className="text-[11px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Contato Principal Inicial (Opcional)</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Contato #1</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome da pessoa (Ex: Maria Silva)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Cargo (Ex: Diretora de Marketing)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="E-mail (maria@empresa.com.br)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="WhatsApp / Telefone ((81) 99999-9999)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {submitting ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
