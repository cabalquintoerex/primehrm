import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { search, action, entity, page = '1', limit = '20', dateFrom, dateTo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // LGU-scoped: only show logs from users in the same LGU
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.user = { lguId: req.user!.lguId };
    }

    if (action && action !== 'ALL') {
      where.action = String(action);
    }

    if (entity && entity !== 'ALL') {
      where.entity = String(entity);
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) {
        const to = new Date(String(dateTo));
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: String(search) } } },
        { user: { lastName: { contains: String(search) } } },
        { action: { contains: String(search) } },
        { entity: { contains: String(search) } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAuditLogFilters = async (req: AuthRequest, res: Response) => {
  try {
    const userWhere: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      userWhere.user = { lguId: req.user!.lguId };
    }

    const [actions, entities] = await Promise.all([
      prisma.auditLog.findMany({
        where: userWhere,
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: userWhere,
        select: { entity: true },
        distinct: ['entity'],
        orderBy: { entity: 'asc' },
      }),
    ]);

    return res.json({
      data: {
        actions: actions.map((a) => a.action),
        entities: entities.map((e) => e.entity),
      },
    });
  } catch (error) {
    console.error('Audit log filters error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
