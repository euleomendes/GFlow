import { calculateExecutiveMonthlyEvolution, calculateExecutiveDistribution } from '../lib/metrics';

console.log('Testing Evolution and Distribution Metrics...');

// Test 1: calculateExecutiveMonthlyEvolution
const mockSales = [
  { value: 100000, closedAt: '2026-06-15T10:00:00.000Z', status: 'ACTIVE' },
  { value: 150000, closedAt: '2026-07-20T10:00:00.000Z', status: 'ACTIVE' },
  { value: 180000, closedAt: '2026-08-10T10:00:00.000Z', status: 'ACTIVE' },
  { value: 240000, closedAt: '2026-09-05T10:00:00.000Z', status: 'ACTIVE' },
];

const mockGoals = [
  { targetValue: 120000, periodStart: '2026-06-01T00:00:00.000Z' },
  { targetValue: 160000, periodStart: '2026-07-01T00:00:00.000Z' },
  { targetValue: 200000, periodStart: '2026-08-01T00:00:00.000Z' },
  { targetValue: 250000, periodStart: '2026-09-01T00:00:00.000Z' },
];

const evolution = calculateExecutiveMonthlyEvolution(mockSales, mockGoals, 4);

console.log('Monthly Data count:', evolution.monthlyData.length);
if (evolution.monthlyData.length !== 4) {
  console.error('Expected 4 months, got', evolution.monthlyData.length);
  process.exit(1);
}

const sepMonth = evolution.monthlyData.find((m) => m.monthKey === '2026-09');
if (!sepMonth || sepMonth.realizedRevenue !== 240000 || sepMonth.targetGoal !== 250000) {
  console.error('September data mismatch:', sepMonth);
  process.exit(1);
}

console.log('September attainment:', sepMonth.attainmentPercent, '%');
console.log('MoM growth:', evolution.momGrowth);

// Test 2: calculateExecutiveDistribution
const dist = calculateExecutiveDistribution([
  { value: 150000, area: { key: 'tv', name: 'TV' } },
  { value: 50000, area: { key: 'gplus', name: 'GPlus' } },
]);

console.log('Total revenue:', dist.totalRevenue);
console.log('Distribution items:', dist.items);

if (dist.totalRevenue !== 200000) {
  console.error('Expected totalRevenue 200000, got', dist.totalRevenue);
  process.exit(1);
}

const tvItem = dist.items.find((i) => i.key === 'tv');
const gplusItem = dist.items.find((i) => i.key === 'gplus');

if (tvItem?.percentage !== 75 || gplusItem?.percentage !== 25) {
  console.error('Percentages mismatch:', tvItem?.percentage, gplusItem?.percentage);
  process.exit(1);
}

console.log('✅ ALL EVOLUTION AND DISTRIBUTION METRICS TESTS PASSED!');
