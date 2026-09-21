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
              <option value="ALL">Todas as Áreas (TV + GPlus)</option>
              <option value="tv">TV Guararapes (Canal 9.1)</option>
              <option value="gplus">Portal GPlus (Digital)</option>
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
          Análise TV × GPlus (Cross-Selling)
        </button>
      </div>

      {/* TAB 1: VENDAS DETALHADAS (Regras 9 e 10) */}
      {activeTab === 'SALES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data Fechamento</th>
                  <th className="py-3 px-4">Referência</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Executivo</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Projeto</th>
                  <th className="py-3 px-4 text-right">Valor Oficial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!reportData?.sales || reportData.sales.length === 0 ? (
                  // REGRA 7: Estado vazio factual sem dados fictícios
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhuma venda registrada no período selecionado.
                    </td>
                  </tr>
                ) : (
                  reportData.sales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600">{formatDate(sale.closedAt)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {sale.reference || sale.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sale.client?.legalName || sale.client?.tradeName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{sale.executive?.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {sale.area?.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {sale.project?.name || <span className="text-slate-400">Geral</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(sale.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DESEMPENHO POR EXECUTIVO (Regras 15 e 16) */}
      {activeTab === 'EXECUTIVES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Executivo Comercial</th>
                  <th className="py-3 px-4 text-right">Faturamento Fechado</th>
                  <th className="py-3 px-4 text-center">Vendas</th>
                  <th className="py-3 px-4 text-right">Ticket Médio</th>
                  <th className="py-3 px-4 text-center">Visitas</th>
                  <th className="py-3 px-4 text-center">Oportunidades</th>
                  <th className="py-3 px-4 text-right">Meta (R$)</th>
                  <th className="py-3 px-4 text-center">% Atingimento</th>
                  <th className="py-3 px-4 text-right">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!reportData?.executivePerformance || reportData.executivePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum executivo com dados no período selecionado.
                    </td>
                  </tr>
                ) : (
                  reportData.executivePerformance.map((item: any) => (
                    <tr key={item.executive.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.executive.name}</div>
                        <div className="text-[11px] text-slate-400">{item.executive.email}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(item.totalSalesValue)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {item.salesCount}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {formatCurrency(item.ticketMedio)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700">{item.visitsCount}</td>
                      <td className="py-3 px-4 text-center text-slate-700">
                        {item.opportunitiesCount}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {item.goalTarget > 0 ? formatCurrency(item.goalTarget) : 'Não cadastrada'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.goalTarget > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.attainmentPercentage >= 100
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.attainmentPercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {item.conversionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FUNIL OFICIAL & CONVERSÃO (Regra 11) */}
      {activeTab === 'FUNNEL' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Funil Oficial do GFlow (6 Etapas Padronizadas)
              </h3>
              <div className="text-xs font-semibold text-slate-600">
                Taxa de Conversão Global:{' '}
                <strong className="text-emerald-600">
                  {reportData?.funnel?.overallConversionRate || 0}%
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
              {[
                { stage: 'LEAD', label: '1. Lead' },
                { stage: 'CONTACT', label: '2. Contato' },
                { stage: 'MEETING', label: '3. Reunião' },
                { stage: 'PROPOSAL', label: '4. Proposta' },
                { stage: 'NEGOTIATION', label: '5. Negociação' },
                { stage: 'CLOSED_WON', label: '6. Fechado Ganho' },
              ].map((step) => {
                const count = reportData?.funnel?.stageCounts?.[step.stage]?.count || 0;
                const value =
                  reportData?.funnel?.stageCounts?.[step.stage]?.totalEstimatedValue || 0;

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
        </div>
      )}

      {/* TAB 4: ANÁLISE TV × GPLUS (Regra 14) */}
      {activeTab === 'CROSS_SELLING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Clientes que operam apenas na TV aberta (Canal 9.1). Potencial para expansão e cross-selling no Portal GPlus Digital.
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
            <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Portal GPlus Somente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {reportData?.crossSelling?.gplusOnly?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes que operam apenas no ecossistema digital GPlus. Potencial para expansão em grade da TV aberta.
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

            {/* Bloco 3: TV + GPlus (Híbridos) */}
            <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Híbridos (TV + GPlus)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {reportData?.crossSelling?.hybrid?.count || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">
                Clientes multiplataforma com presença simultânea na TV Guararapes e no Portal GPlus.
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
