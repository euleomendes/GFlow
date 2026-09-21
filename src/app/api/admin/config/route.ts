import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIGS = [
  // GERAL
  { category: 'GERAL', key: 'COMPANY_NAME', value: 'TV Guararapes', description: 'Razão social / Nome oficial da emissora' },
  { category: 'GERAL', key: 'PLATFORM_NAME', value: 'GFlow', description: 'Nome da plataforma comercial e CRM' },
  { category: 'GERAL', key: 'INSTITUTIONAL_CHANNEL', value: 'Canal 9.1 (Afiliada Record PE)', description: 'Identificação institucional do canal' },
  { category: 'GERAL', key: 'SUPPORT_EMAIL', value: 'comercial@tvguararapes.com.br', description: 'E-mail de suporte comercial' },

  // ARQUIVOS
  { category: 'ARQUIVOS', key: 'MAX_UPLOAD_SIZE_MB', value: '100', description: 'Limite máximo de upload por arquivo em Megabytes' },
  { category: 'ARQUIVOS', key: 'ALLOWED_FILE_TYPES', value: 'pdf, docx, pptx, xlsx, mp4, mov, png, jpg, jpeg, svg, zip', description: 'Extensões de arquivos permitidas para upload' },
  { category: 'ARQUIVOS', key: 'STORAGE_PROVIDER', value: 'LOCAL_DISK', description: 'Provedor de armazenamento de arquivos físicos' },

  // AUDITORIA
  { category: 'AUDITORIA', key: 'LOG_IMMUTABILITY', value: 'ENABLED', description: 'Imutabilidade dos registros de auditoria' },
  { category: 'AUDITORIA', key: 'RETENTION_POLICY', value: 'Retenção não configurada.', description: 'Política de expiração automática de logs' },

  // LIXEIRA
  { category: 'LIXEIRA', key: 'TRASH_RETENTION_POLICY', value: 'Retenção não configurada.', description: 'Política de retenção de itens na lixeira' },
  { category: 'LIXEIRA', key: 'REQUIRE_MANAGER_CONFIRMATION', value: 'TRUE', description: 'Exigência de confirmação do Gerente para exclusão definitiva' },
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    // Regra 18: Protegida exclusivamente para Manager/Admin
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado às configurações do sistema.' }, { status: 403 });
    }

    // Ensure defaults exist
    for (const def of DEFAULT_CONFIGS) {
      await prisma.systemConfig.upsert({
        where: { key: def.key },
        update: {},
        create: def,
      });
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return NextResponse.json({ configs });
  } catch (error: any) {
    console.error('Erro ao listar configurações:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Regra 18: Protegida exclusivamente para Manager/Admin
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Chave e valor da configuração são obrigatórios.' }, { status: 400 });
    }

    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      return NextResponse.json({ error: 'Configuração não encontrada.' }, { status: 404 });
    }

    const previousValue = existing.value;

    const updated = await prisma.systemConfig.update({
      where: { key },
      data: {
        value: String(value),
        updatedById: user.id,
      },
    });

    // REGRA 19: Toda alteração em /admin/config gera audit log CONFIG_UPDATED
    await recordAuditLog({
      actorUserId: user.id,
      action: 'CONFIG_UPDATED',
      entityType: 'SYSTEM_CONFIG',
      entityId: existing.id,
      beforeData: { key, value: previousValue, category: existing.category },
      afterData: { key, value: String(value), category: existing.category },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}
