import { prisma } from '../lib/prisma';
import { recordAuditLog } from '../lib/audit';

async function runCrmVerification() {
  console.log('==================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES - FASE 2: CRM');
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

  // Obter referências de usuário e áreas
  const adminUser = await prisma.user.findFirst({ where: { role: { key: 'manager' } } });
  const execUser = await prisma.user.findFirst({ where: { role: { key: 'executive' } } });
  const tvArea = await prisma.area.findUnique({ where: { key: 'tv' } });
  const gplusArea = await prisma.area.findUnique({ where: { key: 'gplus' } });

  assert(!!adminUser && !!execUser, 'Usuários Gerente e Executivo disponíveis para testes');
  assert(!!tvArea && !!gplusArea, 'Áreas TV e GPlus disponíveis');

  // TESTE 1: Criação de Cliente Multi-Área (TV + GPlus)
  console.log('\n1. Testando Cadastro de Cliente com Áreas Múltiplas (Seção 3 & 8)...');
  const testCnpj = `99.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-99`;
  const testClient = await prisma.client.create({
    data: {
      legalName: 'Grupo Varejista Pernambucano S.A.',
      tradeName: 'Lojas Guararapes Express',
      cnpj: testCnpj,
      segment: 'Eletrodomésticos e Varejo',
      city: 'Recife',
      state: 'PE',
      phone: '(81) 3211-9900',
      status: 'ACTIVE',
      potential: 'STRATEGIC',
      responsibleUserId: execUser!.id,
      createdById: adminUser!.id,
      notes: 'Cliente estratégico com alto volume de inserção no Balanço Geral e Portal GPlus.',
    },
  });

  // Vincular TV e GPlus
  await prisma.clientArea.create({
    data: { clientId: testClient.id, areaId: tvArea!.id },
  });
  await prisma.clientArea.create({
    data: { clientId: testClient.id, areaId: gplusArea!.id },
  });

  await recordAuditLog({
    actorUserId: adminUser!.id,
    action: 'CREATE_CLIENT',
    entityType: 'CLIENT',
    entityId: testClient.id,
    afterData: { tradeName: testClient.tradeName, cnpj: testClient.cnpj, areas: ['tv', 'gplus'] },
  });

  const reloadedClient = await prisma.client.findUnique({
    where: { id: testClient.id },
    include: { areas: { include: { area: true } } },
  });

  const areasKeys = reloadedClient!.areas.map((a) => a.area.key);
  assert(areasKeys.includes('tv') && areasKeys.includes('gplus'), 'Cliente criado vinculado simultaneamente a TV e GPlus');
  assert(reloadedClient!.responsibleUserId === execUser!.id, 'Executivo responsável atribuído corretamente');

  // TESTE 2: Gestão de Múltiplos Contatos (Seção 10)
  console.log('\n2. Testando Múltiplos Contatos e Contato Principal (Seção 10)...');
  const contact1 = await prisma.clientContact.create({
    data: {
      clientId: testClient.id,
      name: 'Mariana Medeiros',
      roleTitle: 'Head de Mídia e Aquisição',
      email: 'mariana.medeiros@guararapesexpress.com.br',
      phone: '(81) 99123-4567',
      isPrimary: true,
    },
  });

  const contact2 = await prisma.clientContact.create({
    data: {
      clientId: testClient.id,
      name: 'Roberto Dantas',
      roleTitle: 'Coordenador Comercial',
      email: 'roberto@guararapesexpress.com.br',
      phone: '(81) 98765-4321',
      isPrimary: false,
    },
  });

  const clientContacts = await prisma.clientContact.findMany({
    where: { clientId: testClient.id },
    orderBy: { isPrimary: 'desc' },
  });

  assert(clientContacts.length === 2, 'Dois contatos vinculados ao cliente');
  assert(clientContacts[0].isPrimary === true && clientContacts[0].name === 'Mariana Medeiros', 'Contato principal destacado corretamente');

  // TESTE 3: Registro de Visita com Qualificação de Oportunidade (Seção 14)
  console.log('\n3. Testando Registro de Visita Comercial & Qualificação (Seção 14)...');
  const visit = await prisma.visit.create({
    data: {
      clientId: testClient.id,
      executiveId: execUser!.id,
      visitDate: new Date(),
      startTime: '14:30',
      visitType: 'IN_PERSON',
      objective: 'Apresentação comercial das Cotas São João 2027 e Portal GPlus',
      participants: 'João Silva (Executivo), Mariana Medeiros (Head de Mídia)',
      discussion: 'Apresentada grade de programação e números de audiência da TV Guararapes.',
      needs: 'Cliente quer pacote com presença na TV aberta e ativação de reels com influenciadores.',
      hasOpportunity: true,
      potentialValue: 150000,
      nextStep: 'Montar proposta comercial customizada com TV + Digital',
      nextContactDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: 'Mariana tem autonomia de decisão para a verba regional de São João.',
      createdById: execUser!.id,
    },
  });

  // Criar oportunidade decorrente da qualificação
  const opportunity = await prisma.opportunity.create({
    data: {
      clientId: testClient.id,
      executiveId: execUser!.id,
      areaId: tvArea!.id,
      stage: 'CONTACT',
      estimatedValue: 150000,
      probability: 30,
      source: 'Visita Comercial',
      nextStep: 'Montar proposta comercial customizada com TV + Digital',
      status: 'OPEN',
      createdById: execUser!.id,
    },
  });

  assert(visit.hasOpportunity === true, 'Visita sinalizada com oportunidade identificada');
  assert(visit.potentialValue === 150000, 'Valor de potencial da visita gravado');
  assert(opportunity.estimatedValue === 150000, 'Oportunidade correspondente criada com sucesso');

  // TESTE 4: Memória Comercial & Histórico de Auditoria (Seção 9 & 28)
  console.log('\n4. Testando Histórico 360° e Auditoria Cronológica (Seção 9 & 28)...');
  await recordAuditLog({
    actorUserId: execUser!.id,
    action: 'CREATE_VISIT',
    entityType: 'VISIT',
    entityId: visit.id,
    afterData: { clientId: testClient.id, potentialValue: 150000 },
  });

  // Atualização cadastral simulada
  const beforeUpdate = { potential: testClient.potential };
  await prisma.client.update({
    where: { id: testClient.id },
    data: { potential: 'STRATEGIC', notes: 'Observações atualizadas após reunião presencial.' },
  });

  await recordAuditLog({
    actorUserId: execUser!.id,
    action: 'UPDATE_CLIENT',
    entityType: 'CLIENT',
    entityId: testClient.id,
    beforeData: beforeUpdate,
    afterData: { potential: 'STRATEGIC' },
  });

  const auditEvents = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'CLIENT', entityId: testClient.id },
        { entityType: 'VISIT', afterData: { contains: testClient.id } },
      ],
    },
  });

  assert(auditEvents.length >= 2, 'Eventos de criação e visita registrados na auditoria do cliente');

  // TESTE 5: Soft-delete (Lixeira)
  console.log('\n5. Testando Exclusão Lógica e Segurança (Seção 26)...');
  await prisma.client.update({
    where: { id: testClient.id },
    data: { deletedAt: new Date() },
  });

  const activeClientQuery = await prisma.client.findFirst({
    where: { id: testClient.id, deletedAt: null },
  });

  assert(activeClientQuery === null, 'Cliente excluído logicamente não aparece em consultas ativas');

  console.log('\n==================================================');
  console.log(`📊 RESULTADO CRM: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCrmVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
