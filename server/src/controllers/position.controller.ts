import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { getDefaultRequirements } from './positionRequirement.controller';

export const getPositions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, departmentId, lguId, page = '1', limit = '20' } = req.query;
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
          cscBatch: { select: { id: true, batchNumber: true, isPublished: true } },
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
        cscBatch: { select: { id: true, batchNumber: true, isPublished: true } },
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

export const createPosition = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, itemNumber, salaryGrade, monthlySalary, education, training,
      experience, eligibility, competency, placeOfAssignment, description,
      requirements, status, openDate, closeDate, slots, lguId, departmentId,
      cscBatchId,
    } = req.body;

    if (!cscBatchId) {
      return res.status(400).json({ message: 'CSC Publication Batch is required' });
    }

    // Non-super admins can only create positions for their own LGU
    const effectiveLguId = req.user!.role === 'SUPER_ADMIN' ? lguId : req.user!.lguId;

    const position = await prisma.position.create({
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
        status,
        openDate: openDate ? new Date(openDate) : undefined,
        closeDate: closeDate ? new Date(closeDate) : undefined,
        slots,
        lguId: effectiveLguId,
        departmentId,
        cscBatchId: cscBatchId ? Number(cscBatchId) : null,
        createdBy: req.user!.id,
      },
    });

    // Auto-create default document requirements
    const defaultRequirements = getDefaultRequirements();
    await Promise.all(
      defaultRequirements.map((req) =>
        prisma.positionDocumentRequirement.create({
          data: {
            positionId: position.id,
            ...req,
          },
        })
      )
    );

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'position',
      entityId: position.id,
      newValues: position,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, itemNumber, salaryGrade, monthlySalary, education, training,
      experience, eligibility, competency, placeOfAssignment, description,
      requirements, openDate, closeDate, slots, departmentId, cscBatchId,
    } = req.body;

    const existing = await prisma.position.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only update positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
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
        cscBatchId: cscBatchId !== undefined ? (cscBatchId ? Number(cscBatchId) : null) : undefined,
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

    const existing = await prisma.position.findUnique({ where: { id: Number(id) } });
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

export const updatePositionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.position.findUnique({
      where: { id: Number(id) },
      include: { cscBatch: { select: { isPublished: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only update positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Cannot publish a position if its CSC batch is not published
    if (existing.status === 'DRAFT' && status === 'OPEN' && !existing.cscBatch?.isPublished) {
      return res.status(400).json({ message: 'Cannot publish position: CSC batch must be published first' });
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
