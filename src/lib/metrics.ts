/**
 * GFlow - Serviço Central de Métricas e Cálculos de Negócio
 * TV Guararapes (Afiliada Record PE)
 * 
 * Regra Arquitetural 21:
 * "O Dashboard principal e o módulo Relatórios devem utilizar as mesmas regras de cálculo.
 * Não criar uma fórmula para o Dashboard e outra para Relatórios."
 */

export interface SaleMetricInput {
  id: string;
  value: number;
  status: string;
  closedAt: Date | string;
  executiveId?: string;
  areaId?: string;
  clientId?: string;
}

export interface OpportunityMetricInput {
  id: string;
  stage: string;
  status: string;
  estimatedValue: number;
  probability: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  expectedCloseDate?: Date | string | null;
  executiveId?: string;
  areaId?: string;
  clientId?: string;
}

export interface GoalMetricInput {
  id: string;
  executiveId: string;
  metricType: string;
  targetValue: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}

export interface ClientAreaMetricInput {
  id: string;
  legalName: string;
  tradeName?: string | null;
  areaKeys: string[];
}

/**
 * REGRA 10 - TICKET MÉDIO
 * Ticket Médio = Valor Total das Vendas Válidas / Quantidade de Vendas
 * Considera apenas vendas efetivamente fechadas/ativas no período.
 */
export function calculateTicketMedio(sales: { value: number; status?: string }[]): number {
  const validSales = sales.filter((s) => !s.status || s.status === 'ACTIVE');
  if (validSales.length === 0) return 0;
  const totalRevenue = validSales.reduce((acc, s) => acc + (s.value || 0), 0);
  return totalRevenue / validSales.length;
}

/**
 * REGRA 12 - PIPELINE PONDERADO
 * Pipeline Ponderado = Soma de (Valor Estimado × Probabilidade %)
 * Considera APENAS oportunidades abertas (status === 'OPEN').
 * Vendas já fechadas não devem ser computadas no pipeline futuro.
 */
export function calculatePipelinePonderado(
  opportunities: { estimatedValue: number; probability: number; status?: string }[]
): number {
  const openOpps = opportunities.filter((o) => !o.status || o.status === 'OPEN');
  return openOpps.reduce((acc, opp) => {
    const val = opp.estimatedValue || 0;
    const prob = Math.min(Math.max(opp.probability || 0, 0), 100);
    return acc + (val * prob) / 100;
  }, 0);
}

/**
 * REGRA 13 - CICLO MÉDIO DE VENDA
 * Intervalo médio em dias entre a data de criação da oportunidade e o fechamento da venda.
 * Se não houver dados suficientes, retorna mensagem explícita sem estimar dados ausentes.
 */
export function calculateCicloMedio(
  opportunities: { createdAt: Date | string; updatedAt: Date | string; stage: string; status?: string }[]
): { averageDays: number | null; message: string | null } {
  const wonOpps = opportunities.filter(
    (o) => o.stage === 'CLOSED_WON' || o.status === 'WON'
  );

  if (wonOpps.length === 0) {
    return {
      averageDays: null,
      message: 'Dados insuficientes para calcular o ciclo médio.',
    };
  }

  let totalDays = 0;
  for (const opp of wonOpps) {
    const start = new Date(opp.createdAt).getTime();
    const end = new Date(opp.updatedAt).getTime();
    const diffDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    totalDays += diffDays;
  }

  const averageDays = Math.round(totalDays / wonOpps.length);
  return { averageDays, message: null };
}

/**
 * REGRA 11 - FUNIL OFICIAL DO GFLOW
 * Etapas Oficiais: LEAD -> CONTACT -> MEETING -> PROPOSAL -> NEGOTIATION -> CLOSED_WON
 * Calcula contagem por etapa e taxa de conversão oficial documentada.
 */
export const OFFICIAL_STAGES = [
  { key: 'LEAD', label: 'Lead', order: 1 },
  { key: 'CONTACT', label: 'Contato', order: 2 },
  { key: 'MEETING', label: 'Reunião', order: 3 },
  { key: 'PROPOSAL', label: 'Proposta', order: 4 },
  { key: 'NEGOTIATION', label: 'Negociação', order: 5 },
  { key: 'CLOSED_WON', label: 'Fechado Ganho', order: 6 },
] as const;

export function calculateFunnelMetrics(opportunities: { stage: string; estimatedValue: number }[]) {
  const stageCounts: Record<string, { count: number; totalEstimatedValue: number }> = {
    LEAD: { count: 0, totalEstimatedValue: 0 },
    CONTACT: { count: 0, totalEstimatedValue: 0 },
    MEETING: { count: 0, totalEstimatedValue: 0 },
    PROPOSAL: { count: 0, totalEstimatedValue: 0 },
    NEGOTIATION: { count: 0, totalEstimatedValue: 0 },
    CLOSED_WON: { count: 0, totalEstimatedValue: 0 },
    CLOSED_LOST: { count: 0, totalEstimatedValue: 0 },
  };

  for (const opp of opportunities) {
    if (stageCounts[opp.stage]) {
      stageCounts[opp.stage].count += 1;
      stageCounts[opp.stage].totalEstimatedValue += opp.estimatedValue || 0;
    }
  }

  const totalStarted = opportunities.length;
  const totalWon = stageCounts.CLOSED_WON.count;
  const overallConversionRate = totalStarted > 0 ? (totalWon / totalStarted) * 100 : 0;

  return {
    stageCounts,
    totalStarted,
    totalWon,
    overallConversionRate: parseFloat(overallConversionRate.toFixed(1)),
  };
}

/**
 * REGRA 14 - ANÁLISE TV × GPLUS (CROSS-SELLING)
 * Classificação factual de clientes:
 * - TV somente: clientes que operam apenas na TV Guararapes (Canal 9.1)
 * - GPlus somente: clientes que operam apenas no Digital GPlus
 * - TV + GPlus: clientes híbridos em ambas as frentes
 * Factual e informativo, sem classificações qualitativas de "bons" ou "ruins".
 */
export function calculateCrossSellingAnalysis(clients: ClientAreaMetricInput[]) {
  const tvOnly: ClientAreaMetricInput[] = [];
  const gplusOnly: ClientAreaMetricInput[] = [];
  const socialOnly: ClientAreaMetricInput[] = [];
  const hybrid: ClientAreaMetricInput[] = [];
  const noArea: ClientAreaMetricInput[] = [];

  for (const client of clients) {
    const keys = client.areaKeys.map((k) => k.toLowerCase());
    const hasTv = keys.includes('tv');
    const hasGPlus = keys.includes('gplus');
    const hasSocial = keys.includes('redes_sociais') || keys.includes('social');

    const activeAreaCount = [hasTv, hasGPlus, hasSocial].filter(Boolean).length;

    if (activeAreaCount > 1) {
      hybrid.push(client);
    } else if (hasTv) {
      tvOnly.push(client);
    } else if (hasGPlus) {
      gplusOnly.push(client);
    } else if (hasSocial) {
      socialOnly.push(client);
    } else {
      noArea.push(client);
    }
  }

  return {
    tvOnly: {
      count: tvOnly.length,
      clients: tvOnly,
      label: 'Clientes TV somente (Oportunidade para expansão GPlus e Redes)',
    },
    gplusOnly: {
      count: gplusOnly.length,
      clients: gplusOnly,
      label: 'Clientes GPlus somente (Oportunidade para expansão TV e Redes)',
    },
    socialOnly: {
      count: socialOnly.length,
      clients: socialOnly,
      label: 'Clientes Redes Sociais somente',
    },
    hybrid: {
      count: hybrid.length,
      clients: hybrid,
      label: 'Clientes Híbridos / Multi-Área (TV, GPlus e Redes)',
    },
    totalClients: clients.length,
  };
}

/**
 * REGRA 16 - ATINGIMENTO DE METAS
 * Atingimento = (Valor Realizado / Meta Cadastrada) * 100
 */
export function calculateGoalAttainment(targetValue: number, realizedValue: number) {
  if (!targetValue || targetValue <= 0) {
    return { percentage: 0, difference: realizedValue, targetValue: 0, realizedValue };
  }
  const percentage = (realizedValue / targetValue) * 100;
  const difference = realizedValue - targetValue;
  return {
    percentage: parseFloat(percentage.toFixed(1)),
    difference,
    targetValue,
    realizedValue,
  };
}

export interface MonthlyEvolutionItem {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  realizedRevenue: number;
  targetGoal: number;
  attainmentPercent: number;
  salesCount: number;
  ticketMedio: number;
}

export interface ExecutiveEvolutionSummary {
  monthlyData: MonthlyEvolutionItem[];
  momGrowth: number | null; // Crescimento em % do último mês sobre o penúltimo
  totalRevenue: number;
  totalGoal: number;
  averageAttainment: number;
  averageTicketMedio: number;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * EVOLUÇÃO MENSAL DO EXECUTIVO
 * Agrupa faturamento realizado e metas estipuladas ao longo dos meses.
 * Permite visualização em formato evolutivo (barras/tendência temporal).
 */
export function calculateExecutiveMonthlyEvolution(
  sales: { value: number; closedAt: Date | string; status?: string }[],
  goals: { targetValue: number; periodStart: Date | string }[],
  monthsCount: number = 4
): ExecutiveEvolutionSummary {
  const validSales = sales.filter((s) => !s.status || s.status === 'ACTIVE');

  // Determinar meses de referência (últimos N meses até o mês atual)
  const now = new Date();
  const months: { year: number; month: number; monthKey: string; label: string }[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-12
    const mKey = `${y}-${String(m).padStart(2, '0')}`;
    const lbl = `${MONTH_NAMES[m - 1]}/${String(y).slice(2)}`;
    months.push({ year: y, month: m, monthKey: mKey, label: lbl });
  }

function extractYearMonth(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  const d = new Date(dateInput);
  // Usa UTC se ISO ou local conforme coerência
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

  // Agrupar vendas por ano-mês
  const salesByMonth: Record<string, { total: number; count: number }> = {};
  for (const s of validSales) {
    const k = extractYearMonth(s.closedAt);
    if (!salesByMonth[k]) {
      salesByMonth[k] = { total: 0, count: 0 };
    }
    salesByMonth[k].total += s.value || 0;
    salesByMonth[k].count += 1;
  }

  // Agrupar metas por ano-mês
  const goalsByMonth: Record<string, number> = {};
  for (const g of goals) {
    const k = extractYearMonth(g.periodStart);
    goalsByMonth[k] = (goalsByMonth[k] || 0) + (g.targetValue || 0);
  }

  // Montar array consolidado
  const monthlyData: MonthlyEvolutionItem[] = months.map((m) => {
    const salesInfo = salesByMonth[m.monthKey] || { total: 0, count: 0 };
    const goalVal = goalsByMonth[m.monthKey] || 0;
    const attainment = goalVal > 0 ? (salesInfo.total / goalVal) * 100 : 0;
    const tm = salesInfo.count > 0 ? salesInfo.total / salesInfo.count : 0;

    return {
      year: m.year,
      month: m.month,
      monthKey: m.monthKey,
      label: m.label,
      realizedRevenue: salesInfo.total,
      targetGoal: goalVal,
      attainmentPercent: parseFloat(attainment.toFixed(1)),
      salesCount: salesInfo.count,
      ticketMedio: Math.round(tm),
    };
  });

  // Cálculo de variação MoM (Mês sobre Mês)
  let momGrowth: number | null = null;
  if (monthlyData.length >= 2) {
    const current = monthlyData[monthlyData.length - 1].realizedRevenue;
    const previous = monthlyData[monthlyData.length - 2].realizedRevenue;
    if (previous > 0) {
      momGrowth = parseFloat((((current - previous) / previous) * 100).toFixed(1));
    }
  }

  const totalRevenue = monthlyData.reduce((acc, curr) => acc + curr.realizedRevenue, 0);
  const totalGoal = monthlyData.reduce((acc, curr) => acc + curr.targetGoal, 0);
  const totalCount = monthlyData.reduce((acc, curr) => acc + curr.salesCount, 0);
  const averageAttainment = totalGoal > 0 ? parseFloat(((totalRevenue / totalGoal) * 100).toFixed(1)) : 0;
  const averageTicketMedio = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  return {
    monthlyData,
    momGrowth,
    totalRevenue,
    totalGoal,
    averageAttainment,
    averageTicketMedio,
  };
}

export interface AreaDistributionItem {
  key: string;
  name: string;
  value: number;
  percentage: number;
  count: number;
  color: string;
}

export interface ExecutiveDistributionResult {
  totalRevenue: number;
  totalCount: number;
  items: AreaDistributionItem[];
}

/**
 * DISTRIBUIÇÃO DE FATURAMENTO POR ÁREA (PIZZA / DONUT)
 * Calcula percentuais e valores de vendas entre TV Guararapes, Digital GPlus e Redes Sociais.
 */
export function calculateExecutiveDistribution(
  sales: { value: number; status?: string; area?: { key: string; name: string } | null }[]
): ExecutiveDistributionResult {
  const validSales = sales.filter((s) => !s.status || s.status === 'ACTIVE');
  const totalRevenue = validSales.reduce((acc, s) => acc + (s.value || 0), 0);
  const totalCount = validSales.length;

  let tvValue = 0;
  let tvCount = 0;
  let gplusValue = 0;
  let gplusCount = 0;
  let socialValue = 0;
  let socialCount = 0;

  for (const s of validSales) {
    const key = s.area?.key?.toLowerCase();
    if (key === 'gplus') {
      gplusValue += s.value || 0;
      gplusCount += 1;
    } else if (key === 'redes_sociais' || key === 'social') {
      socialValue += s.value || 0;
      socialCount += 1;
    } else {
      // Default to TV
      tvValue += s.value || 0;
      tvCount += 1;
    }
  }

  const tvPercentage = totalRevenue > 0 ? parseFloat(((tvValue / totalRevenue) * 100).toFixed(1)) : 0;
  const gplusPercentage = totalRevenue > 0 ? parseFloat(((gplusValue / totalRevenue) * 100).toFixed(1)) : 0;
  const socialPercentage = totalRevenue > 0 ? parseFloat(((socialValue / totalRevenue) * 100).toFixed(1)) : 0;

  const items: AreaDistributionItem[] = [
    {
      key: 'tv',
      name: 'TV Guararapes (Canal 9.1)',
      value: tvValue,
      percentage: tvPercentage,
      count: tvCount,
      color: '#0047AB', // Azul Oficial Record PE
    },
    {
      key: 'gplus',
      name: 'Portal GPlus Digital',
      value: gplusValue,
      percentage: gplusPercentage,
      count: gplusCount,
      color: '#059669', // Verde Esmeralda Multiplataforma
    },
    {
      key: 'redes_sociais',
      name: 'Redes Sociais',
      value: socialValue,
      percentage: socialPercentage,
      count: socialCount,
      color: '#9333EA', // Roxo / Violeta
    },
  ];

  return {
    totalRevenue,
    totalCount,
    items,
  };
}

