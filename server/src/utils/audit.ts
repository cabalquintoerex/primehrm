import prisma from '../config/database';

interface AuditLogParams {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
}

export const createAuditLog = async (params: AuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValues: params.oldValues || undefined,
        newValues: params.newValues || undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
