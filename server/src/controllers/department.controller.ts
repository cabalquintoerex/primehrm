import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const { lguId, search } = req.query;
    const effectiveLguId = req.user!.role === 'SUPER_ADMIN' ? (lguId ? Number(lguId) : undefined) : req.user!.lguId;

    const where: any = {};
    if (effectiveLguId) where.lguId = effectiveLguId;
    if (search) where.name = { contains: String(search) };

    const departments = await prisma.department.findMany({
      where,
      include: {
        _count: { select: { users: true } },
        lgu: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ data: departments });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, lguId } = req.body;
    const effectiveLguId = req.user!.role === 'SUPER_ADMIN' ? lguId : req.user!.lguId;

    const department = await prisma.department.create({
      data: { name, code, lguId: effectiveLguId },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'department',
      entityId: department.id,
      newValues: department,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: department });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A department with this name already exists in this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const existing = await prisma.department.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: { name, code, isActive },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'department',
      entityId: department.id,
      oldValues: existing,
      newValues: department,
      ipAddress: req.ip,
    });

    return res.json({ data: department });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A department with this name already exists in this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { users: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing._count.users > 0) {
      return res.status(400).json({ message: 'Cannot delete department with associated users' });
    }

    await prisma.department.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'department',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
