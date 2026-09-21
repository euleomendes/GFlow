import { prisma } from '../lib/prisma';
import { recordAuditLog } from '../lib/audit';

async function runProjectsVerification() {
  console.log('===========================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES - FASE 4: PROJETOS & ARQUIVOS');
  console.log('===========================================================\n');

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

  if (!adminUser || !execUser || !tvArea || !gplusArea) {
    console.error('❌ Falha nos dados prévios: admin, exec ou áreas ausentes.');
    process.exit(1);
  }

  // 1. Criação de Projeto Multi-área (Seção 22)
  console.log('1. Testando Criação de Projeto Multi-Área (TV + GPlus)...');
  const project = await prisma.project.create({
    data: {
      name: 'Verão Guararapes 2027',
      description: 'Cobertura especial de verão nas praias do litoral pernambucano',
      status: 'ACTIVE',
      totalValuation: 250000,
      createdById: adminUser.id,
      areas: {
        create: [
          { areaId: tvArea.id },
          { areaId: gplusArea.id },
        ],
      },
    },
    include: {
      areas: { include: { area: true } },
    },
  });

  assert(project.name === 'Verão Guararapes 2027', 'Projeto criado com sucesso');
  assert(project.areas.length === 2, 'Suporte multi-área (TV e GPlus associados)');
  assert(project.totalValuation === 250000, 'Valoração estimada gravada');

  // 2. Estrutura de Pastas e Subpastas Infinitas (Seção 23)
  console.log('\n2. Testando Pastas e Subpastas Infinitas (Nesting)...');
  const rootFolder = await prisma.projectFolder.create({
    data: {
      name: 'Comercial & Vendas',
      projectId: project.id,
      createdById: adminUser.id,
    },
  });

  const subFolder1 = await prisma.projectFolder.create({
    data: {
      name: 'Apresentações & Media Kit',
      projectId: project.id,
      parentFolderId: rootFolder.id,
      createdById: adminUser.id,
    },
  });

  const subFolder2 = await prisma.projectFolder.create({
    data: {
      name: 'Propostas Customizadas',
      projectId: project.id,
      parentFolderId: subFolder1.id,
      createdById: adminUser.id,
    },
  });

  assert(rootFolder.parentFolderId === null, 'Pasta raiz criada sem pasta pai');
  assert(subFolder1.parentFolderId === rootFolder.id, 'Subpasta nível 1 associada à pasta raiz');
  assert(subFolder2.parentFolderId === subFolder1.id, 'Subpasta nível 2 (nesting infinito) validada');

  // 3. Upload de Arquivo e Criação da Versão v1 (Seção 24 & 25)
  console.log('\n3. Testando Upload e Versionamento de Arquivo (v1)...');
  const file = await prisma.file.create({
    data: {
      name: 'MediaKit_Verao_2027.pdf',
      extension: 'pdf',
      mimeType: 'application/pdf',
      size: 1540000, // 1.54 MB
      storageKey: 'uploads/mock-mediakit-v1.pdf',
      projectId: project.id,
      folderId: subFolder1.id,
      uploadedById: adminUser.id,
    },
  });

  const version1 = await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      versionNumber: 1,
      storageKey: file.storageKey,
      size: file.size,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploadedById: adminUser.id,
      changeNote: 'Upload da versão inicial oficial do Media Kit',
    },
  });

  await prisma.file.update({
    where: { id: file.id },
    data: { currentVersionId: version1.id },
  });

  assert(version1.versionNumber === 1, 'Versão 1 criada com checksum e nota de alteração');

  // 4. Nova Versão v2 com Nota de Alteração e Substituição de Arquivo (Seção 25)
  console.log('\n4. Testando Upgrade para Versão v2 com Histórico Preservado...');
  const version2 = await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      versionNumber: 2,
      storageKey: 'uploads/mock-mediakit-v2.pdf',
      size: 1820000,
      checksum: 'a89c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
      uploadedById: adminUser.id,
      changeNote: 'Atualização de cotas comerciais e inclusão do pacote GPlus Digital',
    },
  });

  const updatedFile = await prisma.file.update({
    where: { id: file.id },
    data: {
      size: version2.size,
      storageKey: version2.storageKey,
      currentVersionId: version2.id,
    },
    include: {
      versions: { orderBy: { versionNumber: 'desc' } },
    },
  });

  assert(updatedFile.versions.length === 2, 'Histórico preserva ambas as versões (v1 e v2)');
  assert(updatedFile.versions[0].versionNumber === 2, 'Versão ativa é a v2');
  assert(updatedFile.versions[1].versionNumber === 1, 'Versão anterior v1 preservada intacta');

  // 5. Favoritos por Usuário (Seção 24 & Biblioteca)
  console.log('\n5. Testando Sistema de Favoritos por Usuário...');
  const fav = await prisma.favorite.create({
    data: {
      userId: execUser.id,
      fileId: file.id,
    },
  });
  assert(fav.id !== undefined, 'Arquivo favoritado com sucesso pelo Executivo');

  // Tentativa de duplicar favorito deve disparar erro de unicidade (@@unique([userId, fileId]))
  let duplicatePrevented = false;
  try {
    await prisma.favorite.create({
      data: {
        userId: execUser.id,
        fileId: file.id,
      },
    });
  } catch {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Unicidade de favorito garantida no banco de dados');

  // 6. Valoração Comercial Estruturada (Seção 21)
  console.log('\n6. Testando Valoração Comercial Estruturada (Itens e Total)...');
  const valuation = await prisma.valuation.create({
    data: {
      projectId: project.id,
      title: 'Tabela de Valoração Especial Verão 2027',
      totalValue: 350000,
      items: {
        create: [
          {
            product: 'Cota Master TV Guararapes (Canal 9.1)',
            quantity: 2,
            unitValue: 100000,
            totalValue: 200000,
          },
          {
            product: 'Pacote Digital Portal GPlus & Redes',
            quantity: 3,
            unitValue: 50000,
            totalValue: 150000,
          },
        ],
      },
    },
    include: { items: true },
  });

  const sumItems = valuation.items.reduce((acc, it) => acc + it.totalValue, 0);
  assert(valuation.items.length === 2, 'Valoração com 2 itens estruturados cadastrada');
  assert(sumItems === 350000, 'Soma dos itens bate exatamente com o total da valoração (R$ 350.000)');

  // 7. Exclusão Lógica e Envio para a Lixeira (Seção 26 & 47)
  console.log('\n7. Testando Exclusão Lógica e Envio para Lixeira (TrashItem)...');
  await prisma.file.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });

  const trashRecord = await prisma.trashItem.create({
    data: {
      entityType: 'FILE',
      entityId: file.id,
      name: file.name,
      deletedByUserId: adminUser.id,
      originalData: JSON.stringify({ name: file.name, size: file.size, versionsCount: 2 }),
    },
  });

  assert(trashRecord.id !== undefined, 'Item adicionado à Lixeira com snapshot JSON');

  const fileInActiveQuery = await prisma.file.findFirst({
    where: { id: file.id, deletedAt: null },
  });
  assert(fileInActiveQuery === null, 'Arquivo excluído não aparece mais em consultas ativas');

  // 8. Restauração a partir da Lixeira (Seção 26)
  console.log('\n8. Testando Restauração do Item da Lixeira...');
  await prisma.file.update({
    where: { id: file.id },
    data: { deletedAt: null },
  });
  await prisma.trashItem.delete({ where: { id: trashRecord.id } });

  const restoredFile = await prisma.file.findFirst({
    where: { id: file.id, deletedAt: null },
  });
  assert(restoredFile !== null, 'Arquivo restaurado com sucesso para o estado ativo');

  // 9. Registro de Auditoria (Seção 27)
  console.log('\n9. Testando Trilha de Auditoria...');
  const audit = await recordAuditLog({
    actorUserId: adminUser.id,
    action: 'TEST_PHASE4_VERIFICATION',
    entityType: 'PROJECT',
    entityId: project.id,
    beforeData: { status: 'PLANNING' },
    afterData: { status: 'ACTIVE', verified: true },
  });
  assert(audit?.id !== undefined, 'Log de auditoria registrado com sucesso');

  console.log('\n===========================================================');
  console.log(`📊 RESULTADO FASE 4: ${passed} PASSADOS | ${failed} FALHAS`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runProjectsVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
