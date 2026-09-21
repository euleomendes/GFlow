'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Users,
  Target,
  Tv,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  Share2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ReportsClientProps {
  currentUser: AuthenticatedUser;
  executives: any[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ReportsClient({ currentUser, executives }: ReportsClientProps) {
  const isManager = currentUser.roleKey === 'manager';

  // Filters State
  const [period, setPeriod] = useState('all');
  const [areaKey, setAreaKey] = useState('ALL');
  const [selectedExecutiveId, setSelectedExecutiveId] = useState(isManager ? 'ALL' : currentUser.id);
  const [activeTab, setActiveTab] = useState<'SALES' | 'EXECUTIVES' | 'FUNNEL' | 'CROSS_SELLING'>('SALES');

  // Data State
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      params.set('areaKey', areaKey);
      if (selectedExecutiveId && selectedExecutiveId !== 'ALL') {
        params.set('executiveId', selectedExecutiveId);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados do relatório');

      setReportData(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, areaKey, selectedExecutiveId]);

  /**
   * REGRA 17: EXPORTAÇÃO CSV
   * Respeita os filtros aplicados.
   * Utiliza UTF-8 com BOM (\uFEFF) para compatibilidade nativa com Microsoft Excel no Brasil.
   * Delimitador ';' e preservação de acentos (ã, ç, é, ê, ó).
   */
  const handleExportCSV = () => {
    if (!reportData || !reportData.sales || reportData.sales.length === 0) {
      alert('Não há dados de vendas no período selecionado para exportação.');
      return;
    }

    const headers = [
      'Data de Fechamento',
      'Código/Referência',
      'Cliente (Razão Social)',
      'Executivo Comercial',
      'Área de Negócio',
      'Projeto',
      'Valor (R$)',
    ];

    const rows = reportData.sales.map((sale: any) => [
      formatDate(sale.closedAt),
      sale.reference || sale.id.slice(0, 8),
      sale.client?.legalName || sale.client?.tradeName || 'Cliente',
      sale.executive?.name || 'Não informado',
      sale.area?.name || 'Geral',
      sale.project?.name || 'Sem Projeto Específico',
      sale.value.toFixed(2).replace('.', ','),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(';'))].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `GFlow_Relatorio_Vendas_${period}_${areaKey}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportData?.summary || {
    totalSalesValue: 0,
    totalSalesCount: 0,
    ticketMedio: 0,
    pipelinePonderado: 0,
    cicloMedio: { averageDays: null, message: 'Dados insuficientes para calcular o ciclo médio.' },
    totalVisits: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Inteligência Comercial & Relatórios BI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados factuais e consolidados de faturamento, metas, conversão e análise cruzada TV vs GPlus.
          </p>
        </div>

        {/* Export Button (Regra 17) */}
        <button
          onClick={handleExportCSV}
          disabled={loading || !reportData?.sales?.length}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV (Excel)</span>
        </button>
      </div>

      {/* FILTER BAR (Regras 8 e 23) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Período */}
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todo o Histórico</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Anterior</option>
              <option value="this_quarter">Este Trimestre</option>
              <option value="this_year">Este Ano</option>
            </select>
          </div>

          {/* Área Comercial */}
          <div>
            <select
              value={areaKey}
              onChange={(e) => setAreaKey(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Áreas (TV + GPlus + Redes Sociais)</option>
              <option value="tv">TV Guararapes (Canal 9.1)</option>
              <option value="gplus">Portal GPlus (Digital)</option>
              <option value="redes_sociais">Redes Sociais (Digital)</option>
            </select>
          </div>

          {/* Executivo (Somente Manager pode trocar - Regra 23) */}
          {isManager ? (
            <div>
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos os Executivos</option>
                {executives.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-semibold text-xs border border-slate-200">
              Executivo: {currentUser.name}
            </div>
          )}
        </div>

        {loading && <div className="text-xs text-blue-600 font-semibold animate-pulse">Atualizando métricas...</div>}
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SUMMARY KPI CARDS (Regras 9, 10, 12 e 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Faturamento Fechado (Vendas)
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(summary.totalSalesValue)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {summary.totalSalesCount} {summary.totalSalesCount === 1 ? 'contrato fechado' : 'contratos fechados'}
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Ticket Médio
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {formatCurrency(summary.ticketMedio)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total Vendas / Quantidade de Vendas
          </div>
        </div>

        {/* Pipeline Ponderado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pipeline Ponderado Aberto
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {formatCurrency(summary.pipelinePonderado)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Valor Estimado × Probabilidade %
          </div>
        </div>

        {/* Ciclo Médio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Ciclo Médio de Venda
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {summary.cicloMedio?.averageDays !== null ? `${summary.cicloMedio.averageDays} dias` : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {summary.cicloMedio?.message || 'Criação até fechamento da oportunidade'}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SALES')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'SALES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vendas & Faturamento ({reportData?.sales?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('EXECUTIVES')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'EXECUTIVES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Desempenho por Executivo ({reportData?.executivePerformance?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('FUNNEL')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'FUNNEL'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Funil Oficial & Conversão
        </button>

        <button
          onClick={() => setActiveTab('CROSS_SELLING')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'CROSS_SELLING'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Análise Multiplataforma & Cross-Selling
        </button>
      </div>

      {/* TAB 1: VENDAS DETALHADAS (Regras 9 e 10) */}
      {activeTab === 'SALES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Executivo</th>
                  <th className="py-2.5 px-3">Área</th>
                  <th className="py-2.5 px-3">Projeto</th>
                  <th className="py-2.5 px-3 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.sales?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhuma venda registrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  reportData?.sales?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 text-slate-600">{formatDate(s.closedAt)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {s.client?.tradeName || s.client?.legalName || 'Cliente'}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{s.executive?.name}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            s.area?.key === 'tv'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : s.area?.key === 'redes_sociais'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {s.area?.name || 'Geral'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {s.project?.name || 'Venda Avulsa'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PERFORMANCE POR EXECUTIVO (Regras 15 e 16) */}
      {activeTab === 'EXECUTIVES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Executivo Comercial</th>
                  <th className="py-2.5 px-3 text-right">Faturamento (R$)</th>
                  <th className="py-2.5 px-3 text-right">Meta (R$)</th>
                  <th className="py-2.5 px-3 text-right">% Atingimento</th>
                  <th className="py-2.5 px-3 text-right">Contratos</th>
                  <th className="py-2.5 px-3 text-right">Ticket Médio</th>
                  <th className="py-2.5 px-3 text-right">Visitas</th>
                  <th className="py-2.5 px-3 text-right">Taxa Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.executivePerformance?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum dado de executivo disponível para o período.
                    </td>
                  </tr>
                ) : (
                  reportData?.executivePerformance?.map((ep: any) => (
                    <tr key={ep.executive.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">{ep.executive.name}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(ep.totalSalesValue)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">
                        {ep.goalTarget > 0 ? formatCurrency(ep.goalTarget) : 'Não atribuída'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            ep.attainmentPercentage >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : ep.attainmentPercentage >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ep.attainmentPercentage}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        {ep.salesCount}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {formatCurrency(ep.ticketMedio)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">{ep.visitsCount}</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-700">
                        {ep.conversionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FUNIL & CONVERSÃO (Regras 11 e 12) */}
      {activeTab === 'FUNNEL' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Distribuição das Oportunidades no Funil</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Volume financeiro estimado e quantidade de negócios abertos em cada etapa do ciclo comercial.
            </p>
          </div>

          {/* Etapas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { stage: 'PROSPECTION', label: '1. Prospecção' },
              { stage: 'BRIEFING', label: '2. Briefing' },
              { stage: 'PROPOSAL', label: '3. Proposta' },
              { stage: 'NEGOTIATION', label: '4. Negociação' },
              { stage: 'CLOSED_WON', label: '5. Ganho / Fechado' },
            ].map((step) => {
              const count = reportData?.funnel?.stages?.[step.stage]?.count || 0;
              const value = reportData?.funnel?.stages?.[step.stage]?.value || 0;
              return (
                <div
                  key={step.stage}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-[11px] font-bold text-slate-600">{step.label}</div>
                    <div className="text-2xl font-black text-slate-900 mt-2">{count}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    Est: {formatCurrency(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ANÁLISE CROSS-SELLING (TV × GPLUS × REDES SOCIAIS) */}
      {activeTab === 'CROSS_SELLING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bloco 1: TV Somente */}
            <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-blue-600" />
                  TV Guararapes Somente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {reportData?.crossSelling?.tvOnly?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes que operam apenas na TV aberta (Canal 9.1). Potencial para expansão e cross-selling no Portal GPlus e Redes Sociais.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto space-y-1 text-xs">
                {reportData?.crossSelling?.tvOnly?.clients?.length === 0 ? (
                  <div className="text-slate-400 py-2 text-center">Nenhum cliente nesta condição.</div>
                ) : (
                  reportData.crossSelling.tvOnly.clients.map((c: any) => (
                    <div key={c.id} className="p-1.5 rounded bg-slate-50 text-slate-800 font-medium truncate">
                      {c.legalName || c.tradeName}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bloco 2: GPlus Somente */}
            <div className="bg-white p-5 rounded-xl border border-blue-slate/30 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-blue-slate/20">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-slate" />
                  Portal GPlus Somente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-slate/10 text-blue-slate">
                  {reportData?.crossSelling?.gplusOnly?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes que operam apenas no portal digital GPlus. Potencial para expansão em grade da TV aberta e Redes Sociais.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto space-y-1 text-xs">
                {reportData?.crossSelling?.gplusOnly?.clients?.length === 0 ? (
                  <div className="text-slate-400 py-2 text-center">Nenhum cliente nesta condição.</div>
                ) : (
                  reportData.crossSelling.gplusOnly.clients.map((c: any) => (
                    <div key={c.id} className="p-1.5 rounded bg-slate-50 text-slate-800 font-medium truncate">
                      {c.legalName || c.tradeName}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bloco 3: Redes Sociais Somente */}
            <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  Redes Sociais Somente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {reportData?.crossSelling?.socialOnly?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes que operam apenas no ecossistema de redes sociais (Instagram/TikTok/YouTube). Oportunidade para expansão em TV e Portal.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto space-y-1 text-xs">
                {reportData?.crossSelling?.socialOnly?.clients?.length === 0 ? (
                  <div className="text-slate-400 py-2 text-center">Nenhum cliente nesta condição.</div>
                ) : (
                  reportData.crossSelling.socialOnly.clients.map((c: any) => (
                    <div key={c.id} className="p-1.5 rounded bg-slate-50 text-slate-800 font-medium truncate">
                      {c.legalName || c.tradeName}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bloco 4: Multi-Área / Híbridos */}
            <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Híbridos (Multi-Área)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {reportData?.crossSelling?.hybrid?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes multiplataforma com presença simultânea em duas ou mais áreas comerciais (TV Guararapes, Portal GPlus e Redes Sociais).
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto space-y-1 text-xs">
                {reportData?.crossSelling?.hybrid?.clients?.length === 0 ? (
                  <div className="text-slate-400 py-2 text-center">Nenhum cliente nesta condição.</div>
                ) : (
                  reportData.crossSelling.hybrid.clients.map((c: any) => (
                    <div key={c.id} className="p-1.5 rounded bg-slate-50 text-slate-800 font-medium truncate">
                      {c.legalName || c.tradeName}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
