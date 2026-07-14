import { Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { parseModuleAccess, ROLE_MODULES, type ModuleKey } from '../config/modules';

/** Keep only module grants the target role can ever use (e.g. office admins get RSP only). */
function clampToRole(role: string, modules: ModuleKey[] | null): ModuleKey[] | null {
  if (!modules) return null;
  const allowed = ROLE_MODULES[role] ?? [];
  return modules.filter((m) => allowed.includes(m));
}

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, lguId, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Scope to LGU for non-super admins
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.lguId = req.user!.lguId;
    } else if (lguId) {
      where.lguId = Number(lguId);
    }

    if (role) where.role = String(role);
    if (search) {
      where.OR = [
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
        { email: { contains: String(search) } },
        { username: { contains: String(search) } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          moduleAccess: true,
          createdAt: true,
          lgu: { select: { id: true, name: true, slug: true, enabledModules: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, firstName, lastName, role, lguId, departmentId } = req.body;

    let moduleAccess;
    try {
      moduleAccess = clampToRole(role, parseModuleAccess(req.body.moduleAccess));
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Non-super admins can only create users for their own LGU
    const effectiveLguId = req.user!.role === 'SUPER_ADMIN' ? lguId : req.user!.lguId;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        lguId: effectiveLguId,
        departmentId,
        moduleAccess: moduleAccess ?? undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        moduleAccess: true,
        lguId: true,
        departmentId: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'user',
      entityId: user.id,
      newValues: { ...user, password: '[REDACTED]' },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A user with this email or username already exists' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, username, password, firstName, lastName, role, isActive, lguId, departmentId } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Non-super admins can only update users in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const data: any = { email, username, firstName, lastName, role, isActive, departmentId };
    if (req.user!.role === 'SUPER_ADMIN') data.lguId = lguId;
    if (password) data.password = await bcrypt.hash(password, 12);

    // Per-user module grant, clamped to what the (possibly changed) role allows.
    if (req.body.moduleAccess !== undefined) {
      let moduleAccess;
      try {
        moduleAccess = clampToRole(role ?? existing.role, parseModuleAccess(req.body.moduleAccess));
      } catch (e: any) {
        return res.status(400).json({ message: e.message });
      }

      // Self-lockout guard: you may not strip your own Administration access — that is the
      // module holding this very screen.
      if (existing.id === req.user!.id && !(moduleAccess ?? []).includes('ADMIN')) {
        return res
          .status(400)
          .json({ message: 'You cannot remove your own Administration access' });
      }

      data.moduleAccess = moduleAccess ?? Prisma.DbNull;
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        moduleAccess: true,
        lguId: true,
        departmentId: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'user',
      entityId: user.id,
      oldValues: { ...existing, password: '[REDACTED]' },
      newValues: { ...user, password: password ? '[CHANGED]' : '[UNCHANGED]' },
      ipAddress: req.ip,
    });

    return res.json({ data: user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A user with this email or username already exists' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.id === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'user',
      entityId: Number(id),
      oldValues: { ...existing, password: '[REDACTED]' },
      ipAddress: req.ip,
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
