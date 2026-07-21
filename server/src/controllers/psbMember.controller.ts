import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

const TYPES = ['PSB_MEMBER', 'PREPARED_BY'] as const;
type SignatoryType = (typeof TYPES)[number];

/** Super admins may target any LGU via ?lguId=; everyone else is pinned to their own. */
function resolveLguId(req: AuthRequest): number | null {
  if (req.user!.role === 'SUPER_ADMIN') {
    const q = req.query.lguId ?? req.body?.lguId;
    return q ? Number(q) : null;
  }
  return req.user!.lguId ?? null;
}

export const getPsbMembers = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = resolveLguId(req);

    const where: any = {};
    if (lguId) where.lguId = lguId;
    if (req.query.type && TYPES.includes(String(req.query.type) as SignatoryType)) {
      where.type = String(req.query.type);
    }

    const members = await prisma.psbMember.findMany({
      where,
      include: { lgu: { select: { id: true, name: true } } },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    return res.json({ data: members });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPsbMember = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = resolveLguId(req);
    if (!lguId) {
      return res.status(400).json({ message: 'LGU is required' });
    }

    const { name, designation, psbRole, type, sortOrder, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (type && !TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid signatory type' });
    }

    const member = await prisma.psbMember.create({
      data: {
        lguId,
        name: name.trim(),
        designation: designation?.trim() || null,
        psbRole: psbRole?.trim() || null,
        type: type || 'PSB_MEMBER',
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'psb_member',
      entityId: member.id,
      newValues: { name: member.name, psbRole: member.psbRole, type: member.type },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: member });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePsbMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.psbMember.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Signatory not found' });
    }
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { name, designation, psbRole, type, sortOrder, isActive } = req.body;
    if (name !== undefined && !name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (type && !TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid signatory type' });
    }

    const member = await prisma.psbMember.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(designation !== undefined && { designation: designation?.trim() || null }),
        ...(psbRole !== undefined && { psbRole: psbRole?.trim() || null }),
        ...(type !== undefined && { type }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'psb_member',
      entityId: member.id,
      oldValues: { name: existing.name, psbRole: existing.psbRole, isActive: existing.isActive },
      newValues: { name: member.name, psbRole: member.psbRole, isActive: member.isActive },
      ipAddress: req.ip,
    });

    return res.json({ data: member });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePsbMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.psbMember.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Signatory not found' });
    }
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.psbMember.delete({ where: { id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'psb_member',
      entityId: id,
      oldValues: { name: existing.name, psbRole: existing.psbRole },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Signatory deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
