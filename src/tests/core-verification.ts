import { prisma } from '../lib/prisma';
import { verifyPassword, hashPassword, createSessionToken, verifySessionToken, isManager, hasPermission } from '../lib/auth';
import { recordAuditLog } from '../lib/audit';

async function runVerification() {
  console.log('==================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES - GFLOW CORE');
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

  // TESTE 1: Áreas Estruturais (TV, GPlus)
  console.log('1. Testando Conceito Estrutural de Áreas (Seção 3)...');
  const tvArea = await prisma.area.findUnique({ where: { key: 'tv' } });
  const gplusArea = await prisma.area.findUnique({ where: { key: 'gplus' } });
  assert(!!tvArea && tvArea.name === 'TV', 'Área TV cadastrada corretamente');
  assert(!!gplusArea && gplusArea.name === 'GPlus', 'Área GPlus cadastrada corretamente');

  // TESTE 2: Papéis e Permissões (RBAC)
  console.log('\n2. Testando Perfis e Permissões (Seção 5)...');
  const managerRole = await prisma.role.findUnique({
    where: { key: 'manager' },
    include: { permissions: { include: { permission: true } } },
  });
  const execRole = await prisma.role.findUnique({
    where: { key: 'executive' },
    include: { permissions: { include: { permission: true } } },
  });

  assert(!!managerRole, 'Papel "manager" existente');
  assert(!!execRole, 'Papel "executive" existente');

  const managerPermKeys = managerRole!.permissions.map((p) => p.permission.key);
  const execPermKeys = execRole!.permissions.map((p) => p.permission.key);

  assert(managerPermKeys.includes('FULL_ACCESS'), 'Manager possui permissão FULL_ACCESS');
  assert(managerPermKeys.includes('MANAGE_USERS'), 'Manager possui permissão MANAGE_USERS');
  assert(!execPermKeys.includes('MANAGE_USERS'), 'Executivo NÃO possui MANAGE_USERS');
  assert(!execPermKeys.includes('ACCESS_ADMIN'), 'Executivo NÃO possui ACCESS_ADMIN');
  assert(execPermKeys.includes('VIEW_OWN_DATA'), 'Executivo possui VIEW_OWN_DATA');
  assert(execPermKeys.includes('CREATE_CLIENT'), 'Executivo possui CREATE_CLIENT');

  // TESTE 3: Usuários e Autenticação
  console.log('\n3. Testando Autenticação e Hash de Senha (Seção 4)...');
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@tvguararapes.com.br' },
    include: { role: true },
  });
  assert(!!adminUser, 'Usuário Admin localizado');

  const validAdminPass = await verifyPassword('admin123', adminUser!.passwordHash);
  assert(validAdminPass, 'Senha do Admin verificada com sucesso');

  const invalidAdminPass = await verifyPassword('senha_errada', adminUser!.passwordHash);
  assert(!invalidAdminPass, 'Senha incorreta devidamente rejeitada');

  // Sessão JWT
  const token = await createSessionToken({ userId: adminUser!.id });
  const verifiedPayload = await verifySessionToken(token);
  assert(verifiedPayload?.userId === adminUser!.id, 'Token de sessão JWT gerado e validado com sucesso');

  // TESTE 4: Controle de Acesso no Backend (Seção 39)
  console.log('\n4. Testando Autorização no Servidor (RBAC Backend)...');
  const execUser = await prisma.user.findUnique({
    where: { email: 'joao.silva@tvguararapes.com.br' },
    include: { role: true, executive: true },
  });
  assert(!!execUser, 'Usuário Executivo localizado');
  assert(execUser!.role.key === 'executive', 'Perfil do usuário é "executive"');
  assert(isManager({ roleKey: 'manager' } as any) === true, 'isManager retorna true para gerente');
  assert(isManager({ roleKey: 'executive' } as any) === false, 'isManager bloqueia executivo');

  // TESTE 5: Auditoria Completa com Diff (Seção 27 e 38)
  console.log('\n5. Testando Sistema de Auditoria com Snapshot JSON...');
  const auditTest = await recordAuditLog({
    actorUserId: adminUser!.id,
    action: 'TEST_VERIFICATION',
    entityType: 'VERIFICATION',
    entityId: 'TEST-001',
    beforeData: { status: 'OLD_STATUS', valor: 1000 },
    afterData: { status: 'NEW_STATUS', valor: 2500 },
    ipAddress: '127.0.0.1',
  });

  assert(!!auditTest, 'Registro de auditoria inserido no banco com sucesso');
  const fetchedAudit = await prisma.auditLog.findUnique({ where: { id: auditTest!.id } });
  const beforeJson = JSON.parse(fetchedAudit!.beforeData!);
  const afterJson = JSON.parse(fetchedAudit!.afterData!);
  assert(beforeJson.status === 'OLD_STATUS', 'Snapshot anterior (beforeData) preservado fielmente');
  assert(afterJson.valor === 2500, 'Snapshot posterior (afterData) preservado fielmente');

  // TESTE 6: Relacionamento Cliente com Múltiplas Áreas (TV + GPlus)
  console.log('\n6. Testando Cliente Multi-Área (TV + GPlus)...');
  const clientMultiArea = await prisma.client.findFirst({
    where: { cnpj: '11.222.333/0001-44' },
    include: { areas: { include: { area: true } } },
  });
  assert(!!clientMultiArea, 'Cliente Bom Preço encontrado');
  const clientAreas = clientMultiArea!.areas.map((a) => a.area.key);
  assert(clientAreas.includes('tv') && clientAreas.includes('gplus'), 'Cliente cadastrado simultaneamente em TV e GPlus');

  // TESTE 7: Indicadores Comerciais e Vendas
  console.log('\n7. Testando Vendas e Metas Integradas...');
  const salesCount = await prisma.sale.count();
  const goalsCount = await prisma.goal.count();
  const visitsCount = await prisma.visit.count();
  assert(salesCount >= 2, 'Vendas de teste ativas no banco');
  assert(goalsCount >= 2, 'Metas de teste ativas no banco');
  assert(visitsCount >= 1, 'Visita de teste ativa no banco');

  console.log('\n==================================================');
  console.log(`📊 RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
