import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager } from '@/lib/auth';
import ConfigClient from './ConfigClient';

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

export default async function ConfigPage() {
  const user = await getCurrentUser();
  // Regra 18: Proteção estrita Manager/Admin
  if (!user || !isManager(user)) {
    redirect('/dashboard?error=unauthorized');
  }

  // Ensure default configuration records exist
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Configurações Gerais da Plataforma
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Parâmetros institucionais, políticas de armazenamento, retenção e auditoria (Acesso restrito Gerência).
          </p>
        </div>
      </div>

      <ConfigClient initialConfigs={configs} currentUser={user} />
    </div>
  );
}
