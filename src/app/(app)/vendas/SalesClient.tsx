'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Search,
  Plus,
  Tv,
  Layers,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface SalesClientProps {
  initialSales: any[];
  clients: any[];
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

export default function SalesClient({
  initialSales,
  clients,
  areas,
  executives,
  currentUser,
}: SalesClientProps) {
  const router = useRouter();
  const [sales] = useState(initialSales);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [areaKey, setAreaKey] = useState('tv');
  const [value, setValue] = useState('');
  const [reference, setReference] = useState('');
  const [closedAt, setClosedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.client.tradeName.toLowerCase().includes(q) ||
      (s.client.legalName && s.client.legalName.toLowerCase().includes(q)) ||
      (s.reference && s.reference.toLowerCase().includes(q)) ||
      (s.executive.name && s.executive.name.toLowerCase().includes(q));

    const matchesArea = areaFilter === 'ALL' || s.area.key === areaFilter;
    return matchesSearch && matchesArea;
  });

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.value, 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const tvRevenue = filteredSales.filter((s) => s.area.key === 'tv').reduce((acc, curr) => acc + curr.value, 0);
  const gplusRevenue = filteredSales.filter((s) => s.area.key === 'gplus').reduce((acc, curr) => acc + curr.value, 0);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          areaKey,
          value: parseFloat(value),
          reference,
          closedAt,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda');

      setShowModal(false);
      setValue('');
      setReference('');
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Faturamento Fechado
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500">{filteredSales.length} contratos</p>
        </div>

        <div className="bg-white border border-blue-100 bg-blue-50/20 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Vendas TV Guararapes
          </span>
          <div className="text-xl font-black text-blue-900 mt-1">
            {formatCurrency(tvRevenue)}
          </div>
          <p className="text-[11px] text-blue-500">Televisão aberta</p>
        </div>

        <div className="bg-white border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Vendas GPlus Digital
          </span>
          <div className="text-xl font-black text-emerald-900 mt-1">
            {formatCurrency(gplusRevenue)}
          </div>
          <p className="text-[11px] text-emerald-500">Multiplataforma</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ticket Médio
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(avgTicket)}
          </div>
          <p className="text-[11px] text-slate-500">por contrato fechado</p>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, contrato ou executivo..."
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
              Todas
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
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Venda</span>
        </button>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Contrato / Ref.</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Área</th>
              <th className="py-3 px-4">Executivo</th>
              <th className="py-3 px-4">Data Fechamento</th>
              <th className="py-3 px-4 text-right">Valor do Contrato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma venda registrada com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {sale.reference}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <Link href={`/clientes/${sale.client.id}`} className="hover:text-blue-600">
                      {sale.client.tradeName || sale.client.legalName}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sale.area.key === 'tv'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {sale.area.name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {sale.executive.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {new Date(sale.closedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(sale.value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Venda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl my-8 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Registrar Contrato de Venda (Seção 13)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registro comercial definitivo e auditado para faturamento.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSale} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Cliente *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Área Comercial *</label>
                  <select
                    value={areaKey}
                    onChange={(e) => setAreaKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="tv">TV Guararapes</option>
                    <option value="gplus">GPlus Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Data Fechamento *</label>
                  <input
                    type="date"
                    required
                    value={closedAt}
                    onChange={(e) => setClosedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Valor do Contrato (R$) *</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ex: 150000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Código / Referência</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: CTR-2026-09"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Observações do Contrato</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes de inserções, programas patrocinados, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
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
                  {submitting ? 'Salvando...' : 'Formalizar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
