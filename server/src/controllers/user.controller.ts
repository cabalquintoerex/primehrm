import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

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
          createdAt: true,
          lgu: { select: { id: true, name: true, slug: true } },
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
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
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
