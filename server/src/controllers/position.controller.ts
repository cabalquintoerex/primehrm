import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

/**
 * Position instances. A Position is a snapshot of a PositionCatalog definition placed inside a
 * Publication. It carries the recruitment status (DRAFT/OPEN/CLOSED/FILLED), slots and dates, and
 * owns the whole applicant pipeline. Instances are created by adding catalog positions to a
 * publication (see publication.controller.addPositionsToPublication).
 */
export const getPositions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, departmentId, lguId, publicationId, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Scope to LGU for non-super admins
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.lguId = req.user!.lguId;
    } else if (lguId) {
      where.lguId = Number(lguId);
    }

    if (status) where.status = String(status);
    if (departmentId) where.departmentId = Number(departmentId);
    if (publicationId) where.publicationId = Number(publicationId);
    if (search) {
      where.title = { contains: String(search) };
    }

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          department: { select: { id: true, name: true } },
          lgu: { select: { id: true, name: true } },
          publication: { select: { id: true, publicationNumber: true, isPublished: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.position.count({ where }),
    ]);

    return res.json({
      data: positions,
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

export const getPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const position = await prisma.position.findUnique({
      where: { id: Number(id) },
      include: {
        department: { select: { id: true, name: true } },
        lgu: { select: { id: true, name: true, slug: true } },
        publication: { select: { id: true, publicationNumber: true, isPublished: true } },
      },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Edit a position instance inside a publication (slots, dates, department, and any per-publication
 * tweak to the snapshotted definition). The reusable definition lives in the catalog; changes here
 * only affect this instance.
 */
export const updatePosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, itemNumber, salaryGrade, monthlySalary, education, training,
      experience, eligibility, competency, placeOfAssignment, description,
      requirements, openDate, closeDate, slots, departmentId,
    } = req.body;

    const existing = await prisma.position.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only update positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // A published (non-DRAFT) posting is frozen. Unpublish it first to edit.
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft positions can be edited. Unpublish it first.' });
    }

    const position = await prisma.position.update({
      where: { id: Number(id) },
      data: {
        title,
        itemNumber,
        salaryGrade,
        monthlySalary,
        education,
        training,
        experience,
        eligibility,
        competency,
        placeOfAssignment,
        description,
        requirements,
        openDate: openDate ? new Date(openDate) : undefined,
        closeDate: closeDate ? new Date(closeDate) : undefined,
        slots,
        departmentId,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'position',
      entityId: position.id,
      oldValues: existing,
      newValues: position,
      ipAddress: req.ip,
    });

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.position.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { applications: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only delete positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Can only delete DRAFT positions
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT positions can be deleted' });
    }

    if (existing._count.applications > 0) {
      return res.status(400).json({ message: 'Cannot delete a position with applications' });
    }

    await prisma.position.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'position',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Publish (OPEN) / unpublish (DRAFT) / close (CLOSED) a single position instance. Managed from the
 * Publication detail page. A position can only be opened once its publication is published.
 */
export const updatePositionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.position.findUnique({
      where: { id: Number(id) },
      include: { publication: { select: { isPublished: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only update positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Cannot open a position if its publication is not published
    if (existing.status === 'DRAFT' && status === 'OPEN' && !existing.publication?.isPublished) {
      return res.status(400).json({ message: 'Cannot open position: its publication must be published first' });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['OPEN'],
      OPEN: ['DRAFT', 'CLOSED'],
      CLOSED: ['OPEN', 'FILLED'],
      FILLED: [],
    };

    if (!validTransitions[existing.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${existing.status} to ${status}`,
      });
    }

    const data: any = { status };
    if (status === 'OPEN' && !existing.openDate) {
      data.openDate = new Date();
    }
    if (status === 'CLOSED' && !existing.closeDate) {
      data.closeDate = new Date();
    }

    const position = await prisma.position.update({
      where: { id: Number(id) },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'STATUS_CHANGE',
      entity: 'position',
      entityId: position.id,
      oldValues: { status: existing.status },
      newValues: { status: position.status },
      ipAddress: req.ip,
    });

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
