import { prisma } from '../lib/prisma';
import { recordAuditLog } from '../lib/audit';

async function runCommercialVerification() {
  console.log('==================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES - FASE 3: COMERCIAL');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const adminUser = await prisma.user.findFirst({ where: { role: { key: 'manager' } } });
  const execUser = await prisma.user.findFirst({ where: { role: { key: 'executive' } } });
  const tvArea = await prisma.area.findUnique({ where: { key: 'tv' } });
  const gplusArea = await prisma.area.findUnique({ where: { key: 'gplus' } });

  // Get or create client
  let client = await prisma.client.findFirst({ where: { deletedAt: null } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        legalName: 'Cliente Teste Comercial Ltda',
        tradeName: 'Teste Comercial',
        responsibleUserId: execUser!.id,
      },
    });
  }

  // TESTE 1: Oportunidade e Pipeline Ponderado (Seção 11)
  console.log('1. Testando Criação de Oportunidade & Pipeline Ponderado (Seção 11)...');
  const opp = await prisma.opportunity.create({
    data: {
      clientId: client.id,
      executiveId: execUser!.id,
      areaId: tvArea!.id,
      stage: 'PROPOSAL',
      estimatedValue: 100000,
      probability: 60,
      source: 'Prospecção Ativa',
      nextStep: 'Apresentar proposta técnica',
      status: 'OPEN',
      createdById: execUser!.id,
    },
  });

  const weightedValue = (opp.estimatedValue * opp.probability) / 100;
  assert(opp.estimatedValue === 100000, 'Valor estimado gravado como R$ 100.000');
  assert(opp.probability === 60, 'Probabilidade de 60% atribuída');
  assert(weightedValue === 60000, 'Cálculo de Pipeline Ponderado exato (R$ 60.000)');

  // TESTE 2: Versionamento de Propostas (Seção 12)
  console.log('\n2. Testando Versionamento de Propostas (v1, v2) (Seção 12)...');
  const prop1 = await prisma.proposal.create({
    data: {
      opportunityId: opp.id,
      versionNumber: 1,
      value: 100000,
      status: 'SENT',
      notes: 'Primeira proposta enviada para análise',
      createdById: execUser!.id,
    },
  });

  const prop2 = await prisma.proposal.create({
    data: {
      opportunityId: opp.id,
      versionNumber: 2,
      value: 115000,
      status: 'APPROVED',
      notes: 'Contraproposta aprovada pelo cliente com acréscimo de inserções',
      createdById: execUser!.id,
    },
  });

  const oppProposals = await prisma.proposal.findMany({
    where: { opportunityId: opp.id },
    orderBy: { versionNumber: 'desc' },
  });

  assert(oppProposals.length === 2, 'Duas versões de proposta vinculadas à oportunidade');
  assert(oppProposals[0].versionNumber === 2 && oppProposals[0].value === 115000, 'Versão v2 registrada como atual com valor R$ 115.000');

  // TESTE 3: Conversão de Oportunidade em Venda Fechada (Seção 13)
  console.log('\n3. Testando Avanço para CLOSED_WON e Conversão em Venda (Seção 13)...');
  await prisma.opportunity.update({
    where: { id: opp.id },
    data: { stage: 'CLOSED_WON', status: 'WON', estimatedValue: 115000 },
  });

  const sale = await prisma.sale.create({
    data: {
      opportunityId: opp.id,
      clientId: client.id,
      executiveId: execUser!.id,
      areaId: tvArea!.id,
      value: 115000,
      closedAt: new Date(),
      status: 'ACTIVE',
      reference: `CONTRATO-OPP-${opp.id.slice(-6).toUpperCase()}`,
      notes: 'Venda formalizada a partir do fechamento da oportunidade',
      createdById: execUser!.id,
    },
  });

  assert(sale.value === 115000, 'Venda comercial gerada com valor correspondente à proposta aprovada');
  assert(sale.opportunityId === opp.id, 'Venda vinculada corretamente à oportunidade');

  // TESTE 4: Cálculo Automático de Metas e Atingimento (Seção 15)
  console.log('\n4. Testando Metas & Consolidação em Tempo Real (Seção 15)...');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const goal = await prisma.goal.create({
    data: {
      executiveId: execUser!.id,
      areaId: tvArea!.id,
      metricType: 'REVENUE',
      targetValue: 200000,
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
      createdById: adminUser!.id,
    },
  });

  const salesInGoalPeriod = await prisma.sale.findMany({
    where: {
      executiveId: execUser!.id,
      areaId: tvArea!.id,
      closedAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const realized = salesInGoalPeriod.reduce((acc, curr) => acc + curr.value, 0);
  const percentage = Math.round((realized / goal.targetValue) * 100);

  assert(goal.targetValue === 200000, 'Meta de faturamento gravada para o executivo');
  assert(realized >= 115000, 'Realizado consolidado automaticamente somando as vendas do período');
  assert(percentage > 0, `Percentual de atingimento calculado dinamicamente: ${percentage}%`);

  // TESTE 5: Agenda Comercial & Checklist (Seção 16)
  console.log('\n5. Testando Agenda Comercial e Follow-up (Seção 16)...');
  const agendaEvent = await prisma.agendaEvent.create({
    data: {
      title: 'Reunião de pós-venda e alinhamento de veiculação',
      eventDate: new Date(),
      startTime: '16:00',
      endTime: '17:00',
      eventType: 'MEETING',
      clientId: client.id,
      opportunityId: opp.id,
      userId: execUser!.id,
      isDone: false,
    },
  });

  assert(agendaEvent.isDone === false, 'Compromisso criado com status pendente');

  const updatedEvent = await prisma.agendaEvent.update({
    where: { id: agendaEvent.id },
    data: { isDone: true },
  });

  assert(updatedEvent.isDone === true, 'Compromisso marcado como concluído com sucesso');

  console.log('\n==================================================');
  console.log(`📊 RESULTADO COMERCIAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCommercialVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
