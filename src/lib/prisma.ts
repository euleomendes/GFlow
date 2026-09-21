import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string | undefined {
  const customUrl = process.env.DATABASE_URL;

  // Se for uma URL externa (PostgreSQL, MySQL, Supabase, Neon, etc.), usa direto
  if (customUrl && !customUrl.startsWith('file:')) {
    return customUrl;
  }

  // Se estiver na Vercel ou ambiente serverless AWS Lambda
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = '/tmp/dev.db';

    // Se o banco ainda não foi copiado para o /tmp desta instância serverless
    if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size === 0) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.resolve('./prisma/dev.db'),
        path.resolve('./dev.db'),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            console.log(`[GFlow Prisma] SQLite copiado com sucesso para ${tmpDbPath} a partir de ${candidate}`);
            break;
          } catch (e) {
            console.error(`[GFlow Prisma] Falha ao copiar SQLite de ${candidate}:`, e);
          }
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      return `file:${tmpDbPath}`;
    }
  }

  // Local ou fallback
  return customUrl;
}

const resolvedUrl = getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedUrl
      ? {
          datasources: {
            db: {
              url: resolvedUrl,
            },
          },
        }
      : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
