import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { getDefaultRequirements } from './positionRequirement.controller';

/**
 * Position catalog — the master list of reusable position definitions (the "Positions" module).
 * A catalog entry holds the qualification standards and document-requirement template but no
 * recruitment status or slots. It is snapshotted into a Position instance when added to a
 * Publication.
 */
export const getCatalogPositions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, departmentId, lguId, active, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (req.user!.role !== 'SUPER_ADMIN') {
      where.lguId = req.user!.lguId;
    } else if (lguId) {
      where.lguId = Number(lguId);
    }

    if (departmentId) where.departmentId = Number(departmentId);
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { itemNumber: { contains: String(search) } },
      ];
    }

    const [positions, total] = await Promise.all([
      prisma.positionCatalog.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          department: { select: { id: true, name: true } },
          lgu: { select: { id: true, name: true } },
          _count: { select: { positions: true, documentRequirements: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.positionCatalog.count({ where }),
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

export const getCatalogPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const position = await prisma.positionCatalog.findUnique({
      where: { id: Number(id) },
      include: {
        department: { select: { id: true, name: true } },
        lgu: { select: { id: true, name: true, slug: true } },
        documentRequirements: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!position) {
      return res.status(404).json({ message: 'Catalog position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCatalogPosition = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, itemNumber, salaryGrade, monthlySalary, education, training,
      experience, eligibility, competency, placeOfAssignment, description,
      departmentId, documentRequirements,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Position title is required' });
    }

    const lguId = req.user!.role === 'SUPER_ADMIN' ? req.body.lguId : req.user!.lguId;
    if (!lguId) {
      return res.status(400).json({ message: 'LGU ID is required' });
    }

    // Use provided document requirements, otherwise seed the CSC defaults.
    const reqs: any[] = Array.isArray(documentRequirements) && documentRequirements.length > 0
      ? documentRequirements.map((r: any, i: number) => ({
          label: r.label,
          description: r.description || null,
          isRequired: r.isRequired ?? true,
          sortOrder: r.sortOrder ?? i + 1,
        }))
      : getDefaultRequirements();

    const position = await prisma.positionCatalog.create({
      data: {
        title,
        itemNumber: itemNumber || null,
        salaryGrade: salaryGrade ?? null,
        monthlySalary: monthlySalary ?? null,
        education: education || null,
        training: training || null,
        experience: experience || null,
        eligibility: eligibility || null,
        competency: competency || null,
        placeOfAssignment: placeOfAssignment || null,
        description: description || null,
        lguId,
        departmentId: departmentId ?? null,
        createdBy: req.user!.id,
        documentRequirements: { create: reqs },
      },
      include: { documentRequirements: { orderBy: { sortOrder: 'asc' } } },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'position_catalog',
      entityId: position.id,
      newValues: position,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCatalogPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, itemNumber, salaryGrade, monthlySalary, education, training,
      experience, eligibility, competency, placeOfAssignment, description,
      departmentId, isActive, documentRequirements,
    } = req.body;

    const existing = await prisma.positionCatalog.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Catalog position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const position = await prisma.$transaction(async (tx) => {
      const updated = await tx.positionCatalog.update({
        where: { id: Number(id) },
        data: {
          title: title ?? existing.title,
          itemNumber: itemNumber !== undefined ? (itemNumber || null) : existing.itemNumber,
          salaryGrade: salaryGrade !== undefined ? salaryGrade : existing.salaryGrade,
          monthlySalary: monthlySalary !== undefined ? monthlySalary : existing.monthlySalary,
          education: education !== undefined ? (education || null) : existing.education,
          training: training !== undefined ? (training || null) : existing.training,
          experience: experience !== undefined ? (experience || null) : existing.experience,
          eligibility: eligibility !== undefined ? (eligibility || null) : existing.eligibility,
          competency: competency !== undefined ? (competency || null) : existing.competency,
          placeOfAssignment: placeOfAssignment !== undefined ? (placeOfAssignment || null) : existing.placeOfAssignment,
          description: description !== undefined ? (description || null) : existing.description,
          departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      });

      // Replace the document-requirement template if a new one is supplied.
      if (Array.isArray(documentRequirements)) {
        await tx.positionCatalogRequirement.deleteMany({ where: { catalogId: Number(id) } });
        await tx.positionCatalogRequirement.createMany({
          data: documentRequirements.map((r: any, i: number) => ({
            catalogId: Number(id),
            label: r.label,
            description: r.description || null,
            isRequired: r.isRequired ?? true,
            sortOrder: r.sortOrder ?? i + 1,
          })),
        });
      }

      return tx.positionCatalog.findUnique({
        where: { id: Number(id) },
        include: { documentRequirements: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'position_catalog',
      entityId: Number(id),
      oldValues: existing,
      newValues: position,
      ipAddress: req.ip,
    });

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCatalogPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.positionCatalog.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { positions: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Catalog position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing._count.positions > 0) {
      return res.status(400).json({
        message: 'This position is used in one or more publications. Deactivate it instead of deleting.',
      });
    }

    await prisma.positionCatalog.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'position_catalog',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Catalog position deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
