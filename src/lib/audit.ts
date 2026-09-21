import { prisma } from './prisma';
import { AuditLogData } from '@/types';

export async function recordAuditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        beforeData: data.beforeData ? JSON.stringify(data.beforeData) : null,
        afterData: data.afterData ? JSON.stringify(data.afterData) : null,
        ipAddress: data.ipAddress,
      },
    });
  } catch (error) {
    console.error('Falha ao registrar auditoria:', error);
    return null;
  }
}
