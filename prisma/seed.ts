import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do GFlow ---');

  // 1. Criar ou atualizar Áreas
  const areaTV = await prisma.area.upsert({
    where: { key: 'tv' },
    update: {},
    create: {
      key: 'tv',
      name: 'TV',
      description: 'TV Guararapes (Canal 9.1 - Record PE)',
    },
  });

  const areaGPlus = await prisma.area.upsert({
    where: { key: 'gplus' },
    update: {},
    create: {
      key: 'gplus',
      name: 'GPlus',
      description: 'GPlus Mídia e Projetos Digitais / Multiplataforma',
    },
  });

  console.log('✓ Áreas criadas: TV e GPlus');

  // 2. Criar Roles
  const managerRole = await prisma.role.upsert({
    where: { key: 'manager' },
    update: { name: 'Gerente / Administrador' },
    create: {
      key: 'manager',
      name: 'Gerente / Administrador',
      description: 'Acesso total, gestão comercial, projetos, marketing, auditoria e lixeira',
    },
  });

  const executiveRole = await prisma.role.upsert({
    where: { key: 'executive' },
    update: { name: 'Executivo Comercial' },
    create: {
      key: 'executive',
      name: 'Executivo Comercial',
      description: 'Acesso à sua carteira de clientes, visitas, oportunidades, vendas, metas e biblioteca',
    },
  });

  console.log('✓ Roles criadas: manager e executive');

  // 3. Permissões
  const permissionsList = [
    // Gerente
    { key: 'FULL_ACCESS', name: 'Acesso Total' },
    { key: 'MANAGE_USERS', name: 'Gerenciar Utilizadores' },
    { key: 'MANAGE_PERMISSIONS', name: 'Gerenciar Permissões' },
    { key: 'ACCESS_ADMIN', name: 'Acessar Painel Administrativo' },
    { key: 'VIEW_RESTRICTED_AUDIT', name: 'Visualizar Auditoria' },
    { key: 'DELETE_OFFICIAL_PROJECT', name: 'Excluir Projetos Oficiais' },
    { key: 'DELETE_OFFICIAL_FILE', name: 'Excluir Arquivos Oficiais' },
    { key: 'EDIT_OFFICIAL_VALUATION', name: 'Editar Valorações Oficiais' },
    // Executivo
    { key: 'VIEW_OWN_DATA', name: 'Ver Próprios Dados' },
    { key: 'CREATE_CLIENT', name: 'Criar Clientes' },
    { key: 'EDIT_OWN_CLIENT', name: 'Editar Próprios Clientes' },
    { key: 'CREATE_VISIT', name: 'Criar Visitas' },
    { key: 'EDIT_OWN_VISIT', name: 'Editar Próprias Visitas' },
    { key: 'CREATE_OPPORTUNITY', name: 'Criar Oportunidades' },
    { key: 'EDIT_OWN_OPPORTUNITY', name: 'Editar Próprias Oportunidades' },
    { key: 'VIEW_PROJECTS', name: 'Visualizar Projetos' },
    { key: 'VIEW_LIBRARY', name: 'Visualizar Biblioteca' },
    { key: 'DOWNLOAD_FILES', name: 'Baixar Arquivos' },
    { key: 'FAVORITE_FILES', name: 'Favoritar Arquivos' },
    { key: 'VIEW_OWN_GOALS', name: 'Ver Próprias Metas' },
    { key: 'VIEW_OWN_SALES', name: 'Ver Próprias Vendas' },
  ];

  for (const perm of permissionsList) {
    const p = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name },
      create: { key: perm.key, name: perm.name },
    });

    // Vincular permissões a manager
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        permissionId: p.id,
      },
    });

    // Se for permissão de executivo, vincular também
    if (
      perm.key.startsWith('VIEW_') ||
      perm.key.startsWith('CREATE_') ||
      perm.key.startsWith('EDIT_OWN_') ||
      perm.key === 'DOWNLOAD_FILES' ||
      perm.key === 'FAVORITE_FILES'
    ) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: executiveRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: executiveRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  console.log('✓ Permissões configuradas e vinculadas aos perfis');

  // 4. Usuários
  const managerPasswordHash = await bcrypt.hash('admin123', 10);
  const execPasswordHash = await bcrypt.hash('exec123', 10);

  const managerUser = await prisma.user.upsert({
    where: { email: 'admin@tvguararapes.com.br' },
    update: {
      name: 'Carlos Eduardo (Gerente)',
      passwordHash: managerPasswordHash,
      roleId: managerRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Carlos Eduardo (Gerente)',
      email: 'admin@tvguararapes.com.br',
      passwordHash: managerPasswordHash,
      roleId: managerRole.id,
      status: 'ACTIVE',
    },
  });

  const execUser1 = await prisma.user.upsert({
    where: { email: 'joao.silva@tvguararapes.com.br' },
    update: {
      name: 'João Silva',
      passwordHash: execPasswordHash,
      roleId: executiveRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'João Silva',
      email: 'joao.silva@tvguararapes.com.br',
      passwordHash: execPasswordHash,
      roleId: executiveRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.executiveProfile.upsert({
    where: { userId: execUser1.id },
    update: {},
    create: {
      userId: execUser1.id,
      phone: '(81) 98877-6655',
      code: 'EXEC-01',
      hireDate: new Date('2024-01-15'),
      notes: 'Especialista em contas regionais e grandes redes de varejo.',
    },
  });

  const execUser2 = await prisma.user.upsert({
    where: { email: 'maria.santos@tvguararapes.com.br' },
    update: {
      name: 'Maria Santos',
      passwordHash: execPasswordHash,
      roleId: executiveRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Maria Santos',
      email: 'maria.santos@tvguararapes.com.br',
      passwordHash: execPasswordHash,
      roleId: executiveRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.executiveProfile.upsert({
    where: { userId: execUser2.id },
    update: {},
    create: {
      userId: execUser2.id,
      phone: '(81) 99911-2233',
      code: 'EXEC-02',
      hireDate: new Date('2024-03-01'),
      notes: 'Foco em agências de publicidade e contas digitais GPlus.',
    },
  });

  console.log('✓ Usuários criados: admin@tvguararapes.com.br, joao.silva@tvguararapes.com.br, maria.santos@tvguararapes.com.br');

  // 5. Dados de Exemplo para Validação do Dashboard (Clientes, Metas e Oportunidades)
  // Cliente 1: Compra TV + GPlus (João)
  const client1 = await prisma.client.upsert({
    where: { cnpj: '11.222.333/0001-44' },
    update: {},
    create: {
      legalName: 'Varejo Bom Preço Nordeste Ltda',
      tradeName: 'Supermercados Bom Preço',
      cnpj: '11.222.333/0001-44',
      segment: 'Supermercados / Varejo',
      city: 'Recife',
      state: 'PE',
      phone: '(81) 3456-7890',
      website: 'https://bompreco.com.br',
      status: 'ACTIVE',
      potential: 'STRATEGIC',
      responsibleUserId: execUser1.id,
      createdById: managerUser.id,
    },
  });

  await prisma.clientArea.upsert({
    where: { clientId_areaId: { clientId: client1.id, areaId: areaTV.id } },
    update: {},
    create: { clientId: client1.id, areaId: areaTV.id },
  });

  await prisma.clientArea.upsert({
    where: { clientId_areaId: { clientId: client1.id, areaId: areaGPlus.id } },
    update: {},
    create: { clientId: client1.id, areaId: areaGPlus.id },
  });

  // Cliente 2: Apenas TV (Maria) -> Oportunidade para TV+GPlus
  const client2 = await prisma.client.upsert({
    where: { cnpj: '22.333.444/0001-55' },
    update: {},
    create: {
      legalName: 'Construtora Boa Viagem S.A.',
      tradeName: 'Boa Viagem Empreendimentos',
      cnpj: '22.333.444/0001-55',
      segment: 'Construção Civil',
      city: 'Jaboatão dos Guararapes',
      state: 'PE',
      phone: '(81) 3322-1100',
      status: 'ACTIVE',
      potential: 'HIGH',
      responsibleUserId: execUser2.id,
      createdById: managerUser.id,
    },
  });

  await prisma.clientArea.upsert({
    where: { clientId_areaId: { clientId: client2.id, areaId: areaTV.id } },
    update: {},
    create: { clientId: client2.id, areaId: areaTV.id },
  });

  // Metas do Mês
  // Metas Históricas e do Mês Atual
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth();

  const startOfMonth = new Date(curYear, curMonth, 1);
  const endOfMonth = new Date(curYear, curMonth + 1, 0);

  await prisma.goal.createMany({
    data: [
      // Junho 2026
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 280000,
        periodStart: new Date(curYear, curMonth - 3, 1),
        periodEnd: new Date(curYear, curMonth - 2, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 70000,
        periodStart: new Date(curYear, curMonth - 3, 1),
        periodEnd: new Date(curYear, curMonth - 2, 0),
        createdById: managerUser.id,
      },
      // Julho 2026
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 320000,
        periodStart: new Date(curYear, curMonth - 2, 1),
        periodEnd: new Date(curYear, curMonth - 1, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 80000,
        periodStart: new Date(curYear, curMonth - 2, 1),
        periodEnd: new Date(curYear, curMonth - 1, 0),
        createdById: managerUser.id,
      },
      // Agosto 2026
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 360000,
        periodStart: new Date(curYear, curMonth - 1, 1),
        periodEnd: new Date(curYear, curMonth, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 90000,
        periodStart: new Date(curYear, curMonth - 1, 1),
        periodEnd: new Date(curYear, curMonth, 0),
        createdById: managerUser.id,
      },
      // Mês Atual (Setembro)
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 400000,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 100000,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        createdById: managerUser.id,
      },
      {
        executiveId: execUser2.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 350000,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        createdById: managerUser.id,
      },
      // Mês + 1 (Outubro)
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 420000,
        periodStart: new Date(curYear, curMonth + 1, 1),
        periodEnd: new Date(curYear, curMonth + 2, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 110000,
        periodStart: new Date(curYear, curMonth + 1, 1),
        periodEnd: new Date(curYear, curMonth + 2, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser2.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 380000,
        periodStart: new Date(curYear, curMonth + 1, 1),
        periodEnd: new Date(curYear, curMonth + 2, 0),
        createdById: managerUser.id,
      },
      // Mês + 2 (Novembro)
      {
        executiveId: execUser1.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 450000,
        periodStart: new Date(curYear, curMonth + 2, 1),
        periodEnd: new Date(curYear, curMonth + 3, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        metricType: 'REVENUE',
        targetValue: 120000,
        periodStart: new Date(curYear, curMonth + 2, 1),
        periodEnd: new Date(curYear, curMonth + 3, 0),
        createdById: managerUser.id,
      },
      {
        executiveId: execUser2.id,
        areaId: areaTV.id,
        metricType: 'REVENUE',
        targetValue: 400000,
        periodStart: new Date(curYear, curMonth + 2, 1),
        periodEnd: new Date(curYear, curMonth + 3, 0),
        createdById: managerUser.id,
      },
    ],
  });

  // Oportunidades & Vendas
  const opp1 = await prisma.opportunity.create({
    data: {
      clientId: client1.id,
      executiveId: execUser1.id,
      areaId: areaTV.id,
      stage: 'NEGOTIATION',
      estimatedValue: 120000,
      probability: 70,
      source: 'Carteira Ativa',
      nextStep: 'Apresentar contraproposta comercial',
      status: 'OPEN',
      createdById: execUser1.id,
    },
  });

  // Vendas Históricas e do Mês
  await prisma.sale.createMany({
    data: [
      // Junho 2026
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaTV.id,
        value: 210000,
        closedAt: new Date(curYear, curMonth - 3, 18),
        status: 'ACTIVE',
        reference: 'HIST-2026-06-TV',
        notes: 'Campanha Junina Especial TV',
        createdById: execUser1.id,
      },
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        value: 60000,
        closedAt: new Date(curYear, curMonth - 3, 25),
        status: 'ACTIVE',
        reference: 'HIST-2026-06-DIG',
        notes: 'Cobertura Digital São João GPlus',
        createdById: execUser1.id,
      },
      // Julho 2026
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaTV.id,
        value: 290000,
        closedAt: new Date(curYear, curMonth - 2, 15),
        status: 'ACTIVE',
        reference: 'HIST-2026-07-TV',
        notes: 'Patrocínio Férias TV Guararapes',
        createdById: execUser1.id,
      },
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        value: 75000,
        closedAt: new Date(curYear, curMonth - 2, 22),
        status: 'ACTIVE',
        reference: 'HIST-2026-07-DIG',
        notes: 'Pacote Banners e Stories Portal GPlus',
        createdById: execUser1.id,
      },
      // Agosto 2026
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaTV.id,
        value: 340000,
        closedAt: new Date(curYear, curMonth - 1, 16),
        status: 'ACTIVE',
        reference: 'HIST-2026-08-TV',
        notes: 'Campanha Dias dos Pais TV Guararapes',
        createdById: execUser1.id,
      },
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        value: 85000,
        closedAt: new Date(curYear, curMonth - 1, 28),
        status: 'ACTIVE',
        reference: 'HIST-2026-08-DIG',
        notes: 'Campanha Integrada Redes + Portal GPlus',
        createdById: execUser1.id,
      },
      // Setembro 2026 (Mês Atual)
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaTV.id,
        value: 185000,
        closedAt: new Date(),
        status: 'ACTIVE',
        reference: 'CONTRATO-2026-09-01',
        notes: 'Patrocínio programa Balanço Geral PE',
        createdById: execUser1.id,
      },
      {
        clientId: client1.id,
        executiveId: execUser1.id,
        areaId: areaGPlus.id,
        value: 45000,
        closedAt: new Date(),
        status: 'ACTIVE',
        reference: 'DIGITAL-2026-09-04',
        notes: 'Campanha de Reels e Stories Portal GPlus',
        createdById: execUser1.id,
      },
    ],
  });

  // Visita
  await prisma.visit.create({
    data: {
      clientId: client1.id,
      executiveId: execUser1.id,
      visitDate: new Date(),
      startTime: '10:00',
      visitType: 'IN_PERSON',
      objective: 'Apresentação de plano de mídia São João e GPlus',
      participants: 'João Silva, Diretor Comercial Bom Preço',
      discussion: 'Cliente interessado nas cotas integradas TV + Digital.',
      needs: 'Exige relatórios semanais de cliques e alcance consolidado.',
      hasOpportunity: true,
      potentialValue: 120000,
      nextStep: 'Enviar proposta revisada até sexta-feira',
      createdById: execUser1.id,
    },
  });

  // 6. Auditoria Inicial
  await prisma.auditLog.create({
    data: {
      actorUserId: managerUser.id,
      action: 'INIT_SYSTEM',
      entityType: 'SYSTEM',
      entityId: 'CORE',
      beforeData: null,
      afterData: JSON.stringify({ message: 'Sistema GFlow inicializado com seed padrão de produção' }),
    },
  });

  console.log('✓ Vendas, metas, clientes e auditoria inicial inseridos com sucesso');
  console.log('--- Seed Concluído! ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
