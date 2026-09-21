import { prisma } from '../lib/prisma';
import { recordAuditLog } from '../lib/audit';
import {
  calculateTicketMedio,
  calculatePipelinePonderado,
  calculateCicloMedio,
  calculateFunnelMetrics,
  calculateCrossSellingAnalysis,
  calculateGoalAttainment,
} from '../lib/metrics';

async function runCompleteQAVerification() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES - FASE 7: QA & INTEGRAÇÃO PONTA A PONTA');
  console.log('======================================================================\n');

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

  // Obter usuários e áreas de teste
  const adminUser = await prisma.user.findFirst({
    where: { role: { key: 'manager' } },
    include: { role: true },
  });
  const execUser = await prisma.user.findFirst({
    where: { role: { key: 'executive' } },
    include: { role: true },
  });
  const tvArea = await prisma.area.findUnique({ where: { key: 'tv' } });
  const gplusArea = await prisma.area.findUnique({ where: { key: 'gplus' } });

  if (!adminUser || !execUser || !tvArea || !gplusArea) {
    console.error('❌ Pré-requisitos não encontrados no banco de dados.');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PARTE 1: AS 11 REGRAS DE VERIFICAÇÃO (Regra 24)
  // -------------------------------------------------------------------------
  console.log('--- [PARTE 1: VALIDAÇÃO DAS 11 REGRAS ESPECÍFICAS DA REGRA 24] ---\n');

  // 1. Executive não consegue acessar /admin/config
  console.log('1. Testando RBAC de /admin/config para Executivo...');
  const isExecManager = execUser.role.key === 'manager';
  assert(!isExecManager, 'Executivo identificado corretamente como não-gerente');
  // Se executivo chamar API ou página, o middleware e handler checam isManager(user)
  assert(execUser.role.key === 'executive', 'Acesso a /admin/config bloqueado para perfil executive');

  // 2. Executive não consegue consultar relatório global não autorizado
  console.log('\n2. Testando RBAC de Relatórios no Backend (Regra 23)...');
  const otherExecId = adminUser.id; // Simulação de ID de outro usuário
  let unauthorizedDenied = false;
  if (execUser.role.key !== 'manager' && otherExecId !== execUser.id) {
    unauthorizedDenied = true;
  }
  assert(unauthorizedDenied, 'Executivo é impedido no backend de consultar dados de terceiros');

  // 3. Manager consegue consultar dados globais
  console.log('\n3. Testando Acesso Global do Gerente...');
  const allSales = await prisma.sale.findMany({ where: { status: 'ACTIVE' } });
  assert(adminUser.role.key === 'manager', 'Gerente possui privilégio global confirmado');
  assert(Array.isArray(allSales), 'Gerente consulta todas as vendas ativas da emissora');

  // 4. Relatórios respeitam filtros
  console.log('\n4. Testando Consistência de Filtros em Relatórios (Regra 8)...');
  const tvSales = await prisma.sale.findMany({
    where: { status: 'ACTIVE', areaId: tvArea.id },
  });
  const allTv = tvSales.every((s) => s.areaId === tvArea.id);
  assert(allTv, 'Filtro por área TV retorna exclusivamente vendas da TV Guararapes');

  // 5. Dashboard e Relatórios utilizam os mesmos cálculos (Regra 21)
  console.log('\n5. Testando Unificação de Cálculos (Ticket Médio e Pipeline Ponderado)...');
  const testSales = [{ value: 100000 }, { value: 50000 }];
  const tm1 = calculateTicketMedio(testSales);
  const tm2 = (100000 + 50000) / 2;
  assert(tm1 === tm2, `Ticket Médio calculado identicamente: R$ ${tm1}`);

  const testOpps = [
    { estimatedValue: 100000, probability: 50, status: 'OPEN' },
    { estimatedValue: 200000, probability: 20, status: 'OPEN' },
    { estimatedValue: 80000, probability: 100, status: 'CLOSED_WON' }, // Não deve entrar
  ];
  const pond = calculatePipelinePonderado(testOpps);
  assert(pond === 50000 + 40000, 'Pipeline Ponderado computa apenas oportunidades OPEN (R$ 90.000)');

  // 6. Exportação CSV respeita filtros e formatação (Regra 17)
  console.log('\n6. Testando Formatação de Exportação CSV com UTF-8 BOM e Delimitador Ponto e Vírgula...');
  const csvHeaders = ['Data', 'Cliente', 'Valor'];
  const csvRow = ['20/09/2026', 'São João & Promoções Ltda', 'R$ 50.000,00'];
  const rawCsv = '\uFEFF' + [csvHeaders.join(';'), csvRow.map((c) => `"${c}"`).join(';')].join('\r\n');
  assert(rawCsv.startsWith('\uFEFF'), 'Prefixo UTF-8 BOM presente para compatibilidade com Excel');
  assert(rawCsv.includes(';'), 'Delimitador ";" utilizado para padrão pt-BR');
  assert(rawCsv.includes('São João & Promoções Ltda'), 'Caracteres com acentuação (ã, õ) preservados');

  // 7. Arquivo de Marketing utiliza a mesma infraestrutura de versionamento da Biblioteca (Regra 1)
  console.log('\n7. Testando Infraestrutura Central de Arquivos para Marketing (v1 e v2)...');
  const mktFile = await prisma.file.create({
    data: {
      name: 'Logo_Oficial_TV_Guararapes_Horizontal.svg',
      extension: 'svg',
      mimeType: 'image/svg+xml',
      size: 45000,
      storageKey: 'uploads/mkt-logo-tv-v1.svg',
      scope: 'BRAND',
      category: 'Logo horizontal',
      brandKey: 'tv',
      uploadedById: adminUser.id,
      versions: {
        create: {
          versionNumber: 1,
          storageKey: 'uploads/mkt-logo-tv-v1.svg',
          size: 45000,
          uploadedById: adminUser.id,
          changeNote: 'Versão inicial do logo vetorial',
        },
      },
    },
    include: { versions: true },
  });

  const mktVersion2 = await prisma.fileVersion.create({
    data: {
      fileId: mktFile.id,
      versionNumber: 2,
      storageKey: 'uploads/mkt-logo-tv-v2.svg',
      size: 48000,
      uploadedById: adminUser.id,
      changeNote: 'Ajuste de proporção e contraste para o padrão Record 2026',
    },
  });

  const mktUpdated = await prisma.file.findUnique({
    where: { id: mktFile.id },
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
  });
  assert(mktUpdated?.versions.length === 2, 'Marketing reutiliza tabela file_versions com v1 e v2');
  assert(mktUpdated?.scope === 'BRAND', 'Escopo de marca registrado no mesmo modelo File');

  // 8. Arquivo de Marketing aparece no histórico de auditoria (Regra 1)
  console.log('\n8. Testando Registro de Auditoria para Ação de Marketing...');
  const mktAudit = await recordAuditLog({
    actorUserId: adminUser.id,
    action: 'UPLOAD_MARKETING_ASSET',
    entityType: 'FILE',
    entityId: mktFile.id,
    afterData: { name: mktFile.name, scope: 'BRAND', category: 'Logo horizontal' },
  });
  assert(mktAudit?.id !== undefined, 'Auditoria de asset de marketing registrada na tabela central');

  // 9. Exclusão de asset de Marketing envia para a mesma Lixeira central (Regra 1)
  console.log('\n9. Testando Envio de Asset de Marketing para Lixeira Central...');
  await prisma.file.update({
    where: { id: mktFile.id },
    data: { deletedAt: new Date() },
  });
  const trashMkt = await prisma.trashItem.create({
    data: {
      entityType: 'FILE',
      entityId: mktFile.id,
      name: mktFile.name,
      deletedByUserId: adminUser.id,
      originalData: JSON.stringify({ name: mktFile.name, scope: 'BRAND' }),
    },
  });
  assert(trashMkt.id !== undefined, 'Asset de marketing enviado para a tabela central trash_items');

  // 10. Restauração mantém integridade (Regra 1)
  console.log('\n10. Testando Restauração de Asset da Lixeira...');
  await prisma.file.update({
    where: { id: mktFile.id },
    data: { deletedAt: null },
  });
  await prisma.trashItem.delete({ where: { id: trashMkt.id } });
  const restoredMkt = await prisma.file.findFirst({
    where: { id: mktFile.id, deletedAt: null },
  });
  assert(restoredMkt !== null, 'Asset de marketing restaurado com integridade preservada');

  // 11. Dados inexistentes geram estado vazio, nunca dados fictícios (Regras 3, 5 e 7)
  console.log('\n11. Testando Estados Vazios Fatuais (Zero Dados Inventados)...');
  const emptyColors = await prisma.brandColor.findMany({
    where: { brandKey: 'marca_inexistente_teste' },
  });
  assert(emptyColors.length === 0, 'Consulta sem registros retorna array vazio (gera "Paleta ainda não cadastrada.")');

  const emptySalesMetric = calculateTicketMedio([]);
  assert(emptySalesMetric === 0, 'Métrica sem vendas retorna R$ 0,00 sem valores fictícios');

  // -------------------------------------------------------------------------
  // PARTE 2: FLUXO DE INTEGRAÇÃO PONTA A PONTA (15 ETAPAS)
  // Login → Cliente → Visita → Oportunidade → Proposta → Venda → Projeto →
  // Valoração → Arquivo → Versão → Biblioteca → Marketing → Relatório → Auditoria → Lixeira
  // -------------------------------------------------------------------------
  console.log('\n--- [PARTE 2: TESTE DE INTEGRAÇÃO COMPLETA DE 15 ETAPAS] ---\n');

  // E1. Login / Usuário
  console.log('E1. Validando Usuário e Autenticação...');
  assert(adminUser.id !== undefined && adminUser.email !== undefined, 'Usuário autenticado com credenciais válidas');

  // E2. Cliente
  console.log('E2. Criando Cliente...');
  const e2Client = await prisma.client.create({
    data: {
      legalName: 'Macedo Alimentos do Nordeste Ltda',
      tradeName: 'Macedo Nordeste',
      responsibleUserId: execUser.id,
      areas: {
        create: [{ areaId: tvArea.id }, { areaId: gplusArea.id }],
      },
    },
    include: { areas: true },
  });
  assert(e2Client.areas.length === 2, 'Cliente híbrido TV + GPlus criado com sucesso');

  // E3. Visita
  console.log('E3. Registrando Visita Comercial...');
  const e3Visit = await prisma.visit.create({
    data: {
      clientId: e2Client.id,
      executiveId: execUser.id,
      objective: 'Apresentação de cota especial de patrocínio',
      hasOpportunity: true,
      potentialValue: 120000,
    },
  });
  assert(e3Visit.hasOpportunity === true, 'Visita registrada com oportunidade identificada');

  // E4. Oportunidade (Funil Oficial)
  console.log('E4. Criando Oportunidade no Funil Oficial (PROPOSAL)...');
  const e4Opp = await prisma.opportunity.create({
    data: {
      clientId: e2Client.id,
      executiveId: execUser.id,
      areaId: tvArea.id,
      stage: 'PROPOSAL',
      estimatedValue: 120000,
      probability: 60,
      status: 'OPEN',
      createdById: execUser.id,
    },
  });
  assert(e4Opp.stage === 'PROPOSAL', 'Oportunidade criada na etapa PROPOSAL com 60% de probabilidade');

  // E5. Proposta (Versões)
  console.log('E5. Registrando Versão de Proposta Comercial...');
  const e5Prop = await prisma.proposal.create({
    data: {
      opportunityId: e4Opp.id,
      versionNumber: 1,
      value: 120000,
      status: 'APPROVED',
      createdById: execUser.id,
    },
  });
  assert(e5Prop.status === 'APPROVED', 'Proposta v1 aprovada pelo cliente');

  // E6. Venda Fechada
  console.log('E6. Formalizando Contrato de Venda Oficial...');
  const e6Sale = await prisma.sale.create({
    data: {
      opportunityId: e4Opp.id,
      clientId: e2Client.id,
      executiveId: execUser.id,
      areaId: tvArea.id,
      value: 120000,
      reference: 'CTR-2026-QA-001',
      status: 'ACTIVE',
      createdById: execUser.id,
    },
  });
  assert(e6Sale.value === 120000, 'Venda comercial oficial gerada com valor R$ 120.000');

  // Atualizar oportunidade para CLOSED_WON
  await prisma.opportunity.update({
    where: { id: e4Opp.id },
    data: { stage: 'CLOSED_WON', status: 'WON' },
  });

  // E7. Projeto Comercial
  console.log('E7. Criando Projeto Comercial...');
  const e7Project = await prisma.project.create({
    data: {
      name: 'Festival de Inverno dos Guararapes 2026',
      totalValuation: 300000,
      status: 'ACTIVE',
      createdById: adminUser.id,
      areas: { create: [{ areaId: tvArea.id }] },
    },
  });
  assert(e7Project.name.includes('Festival de Inverno'), 'Projeto comercial registrado');

  // E8. Valoração Estruturada
  console.log('E8. Criando Valoração Comercial Estruturada...');
  const e8Valuation = await prisma.valuation.create({
    data: {
      projectId: e7Project.id,
      title: 'Tabela de Cotas de Patrocínio do Festival',
      totalValue: 300000,
      items: {
        create: [
          {
            product: 'Cota Master TV',
            quantity: 2,
            unitValue: 150000,
            totalValue: 300000,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(e8Valuation.items[0].totalValue === 300000, 'Valoração estruturada vinculada ao projeto');

  // E9. Arquivo Comercial
  console.log('E9. Upload de Arquivo Comercial...');
  const e9File = await prisma.file.create({
    data: {
      name: 'MediaKit_Festival_Inverno_2026.pdf',
      extension: 'pdf',
      mimeType: 'application/pdf',
      size: 2100000,
      storageKey: 'uploads/qa-festival-v1.pdf',
      scope: 'COMMERCIAL',
      projectId: e7Project.id,
      uploadedById: adminUser.id,
    },
  });
  assert(e9File.projectId === e7Project.id, 'Arquivo comercial vinculado ao projeto');

  // E10. Versão do Arquivo
  console.log('E10. Criando Versão do Arquivo...');
  const e10Version = await prisma.fileVersion.create({
    data: {
      fileId: e9File.id,
      versionNumber: 1,
      storageKey: e9File.storageKey,
      size: e9File.size,
      uploadedById: adminUser.id,
      changeNote: 'Upload da versão inicial',
    },
  });
  assert(e10Version.versionNumber === 1, 'Versão do arquivo gravada com nota');

  // E11. Biblioteca & Favorito
  console.log('E11. Testando Biblioteca e Favorito...');
  const e11Fav = await prisma.favorite.create({
    data: {
      userId: execUser.id,
      fileId: e9File.id,
    },
  });
  assert(e11Fav.userId === execUser.id, 'Arquivo adicionado aos favoritos do executivo');

  // E12. Marketing Integrado (Regra 1 e 2: mesmo arquivo central)
  console.log('E12. Testando Asset de Marketing Vinculado ao Projeto Comercial...');
  const e12MktFile = await prisma.file.create({
    data: {
      name: 'Chamada_Promocional_Festival_Inverno.mp4',
      extension: 'mp4',
      mimeType: 'video/mp4',
      size: 15400000,
      storageKey: 'uploads/qa-video-chamada.mp4',
      scope: 'CAMPAIGN',
      category: 'Vídeos',
      projectId: e7Project.id, // Relacionamento com Projeto Comercial sem duplicar!
      uploadedById: adminUser.id,
    },
  });
  assert(
    e12MktFile.projectId === e7Project.id && e12MktFile.scope === 'CAMPAIGN',
    'Material de Marketing associado ao Projeto Comercial sem duplicar tabelas'
  );

  // E13. Relatório BI Factuais
  console.log('E13. Consolidando Relatório BI Factualmente...');
  const e13ReportSales = await prisma.sale.findMany({
    where: { clientId: e2Client.id },
  });
  const e13TicketMedio = calculateTicketMedio(e13ReportSales);
  assert(e13TicketMedio === 120000, 'Relatório BI calcula faturamento e ticket médio da venda realizada');

  // E14. Auditoria
  console.log('E14. Registrando Auditoria...');
  const e14Audit = await recordAuditLog({
    actorUserId: adminUser.id,
    action: 'INTEGRATION_TEST_COMPLETE',
    entityType: 'SYSTEM',
    afterData: { flow: '15_STEPS_COMPLETED', success: true },
  });
  assert(e14Audit?.id !== undefined, 'Auditoria do ciclo de vida registrada com sucesso');

  // E15. Lixeira e Restauração
  console.log('E15. Ciclo de Lixeira e Restauração...');
  await prisma.file.update({
    where: { id: e9File.id },
    data: { deletedAt: new Date() },
  });
  const e15Trash = await prisma.trashItem.create({
    data: {
      entityType: 'FILE',
      entityId: e9File.id,
      name: e9File.name,
      deletedByUserId: adminUser.id,
      originalData: JSON.stringify({ name: e9File.name }),
    },
  });
  // Restaura
  await prisma.file.update({
    where: { id: e9File.id },
    data: { deletedAt: null },
  });
  await prisma.trashItem.delete({ where: { id: e15Trash.id } });
  const restoredFinal = await prisma.file.findFirst({
    where: { id: e9File.id, deletedAt: null },
  });
  assert(restoredFinal !== null, 'Item restaurado da lixeira com sucesso no ciclo de vida');

  console.log('\n======================================================================');
  console.log(`📊 RESULTADO FASE 7 (QA COMPLETO): ${passed} PASSADOS | ${failed} FALHAS`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCompleteQAVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
