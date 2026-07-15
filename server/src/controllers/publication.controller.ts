import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getPublications = async (req: AuthRequest, res: Response) => {
  try {
    const { search, published, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (req.user!.role !== 'SUPER_ADMIN') {
      where.lguId = req.user!.lguId;
    }

    if (published === 'true') where.isPublished = true;
    if (published === 'false') where.isPublished = false;

    if (search) {
      where.OR = [
        { publicationNumber: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const [publications, total] = await Promise.all([
      prisma.publication.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { positions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.publication.count({ where }),
    ]);

    return res.json({
      data: publications,
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

export const getPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const publication = await prisma.publication.findUnique({
      where: { id: Number(id) },
      include: {
        lgu: { select: { id: true, name: true, slug: true, address: true, contactNumber: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        positions: {
          include: {
            department: { select: { id: true, name: true } },
            catalog: {
              select: {
                id: true, education: true, training: true, experience: true,
                eligibility: true, competency: true, description: true,
              },
            },
            _count: { select: { applications: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!publication) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && publication.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({ data: publication });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { publicationNumber, description, openDate } = req.body;

    if (!publicationNumber) {
      return res.status(400).json({ message: 'Publication number is required' });
    }

    if (!openDate) {
      return res.status(400).json({ message: 'Posting date is required' });
    }

    const lguId = req.user!.role === 'SUPER_ADMIN' ? req.body.lguId : req.user!.lguId;

    if (!lguId) {
      return res.status(400).json({ message: 'LGU ID is required' });
    }

    const postingDate = new Date(openDate);
    const closingDate = new Date(postingDate);
    closingDate.setDate(closingDate.getDate() + 15);

    const publication = await prisma.publication.create({
      data: {
        publicationNumber,
        description: description || null,
        openDate: postingDate,
        closeDate: closingDate,
        lguId,
        createdBy: req.user!.id,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'publication',
      entityId: publication.id,
      newValues: publication,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: publication });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Publication number already exists for this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { publicationNumber, description, openDate } = req.body;

    const existing = await prisma.publication.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Cannot update a published publication' });
    }

    const updateData: any = {
      publicationNumber: publicationNumber ?? existing.publicationNumber,
      description: description !== undefined ? (description || null) : existing.description,
    };

    if (openDate) {
      const postingDate = new Date(openDate);
      const closingDate = new Date(postingDate);
      closingDate.setDate(closingDate.getDate() + 15);
      updateData.openDate = postingDate;
      updateData.closeDate = closingDate;
    }

    const publication = await prisma.publication.update({
      where: { id: Number(id) },
      data: updateData,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'publication',
      entityId: publication.id,
      oldValues: existing,
      newValues: publication,
      ipAddress: req.ip,
    });

    return res.json({ data: publication });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Publication number already exists for this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.publication.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { positions: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Cannot delete a published publication' });
    }

    if (existing._count.positions > 0) {
      return res.status(400).json({ message: 'Cannot delete a publication with positions. Remove all positions first.' });
    }

    await prisma.publication.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'publication',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Publication deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const publishPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.publication.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Publication is already published' });
    }

    const publication = await prisma.publication.update({
      where: { id: Number(id) },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Auto-open all DRAFT positions in this publication
    await prisma.position.updateMany({
      where: {
        publicationId: publication.id,
        status: 'DRAFT',
      },
      data: {
        status: 'OPEN',
        openDate: publication.openDate,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'PUBLISH',
      entity: 'publication',
      entityId: publication.id,
      oldValues: { isPublished: false },
      newValues: { isPublished: true },
      ipAddress: req.ip,
    });

    return res.json({ data: publication });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const unpublishPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.publication.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (!existing.isPublished) {
      return res.status(400).json({ message: 'Publication is not published' });
    }

    const publication = await prisma.publication.update({
      where: { id: Number(id) },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });

    // Revert OPEN positions back to DRAFT
    await prisma.position.updateMany({
      where: {
        publicationId: publication.id,
        status: 'OPEN',
      },
      data: {
        status: 'DRAFT',
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UNPUBLISH',
      entity: 'publication',
      entityId: publication.id,
      oldValues: { isPublished: true },
      newValues: { isPublished: false },
      ipAddress: req.ip,
    });

    return res.json({ data: publication });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add catalog positions to a publication. Each selected PositionCatalog entry is snapshotted into a
 * new Position instance (definition + document-requirement template copied), so the published record
 * is frozen even if the catalog master changes later.
 */
export const addPositionsToPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { catalogIds, positions: positionSpecs } = req.body;

    // Accept either a plain array of catalog ids or [{ catalogId, slots }] specs.
    const specs: { catalogId: number; slots: number }[] = Array.isArray(positionSpecs)
      ? positionSpecs.map((p: any) => ({ catalogId: Number(p.catalogId), slots: Number(p.slots) || 1 }))
      : Array.isArray(catalogIds)
        ? catalogIds.map((c: any) => ({ catalogId: Number(c), slots: 1 }))
        : [];

    if (specs.length === 0) {
      return res.status(400).json({ message: 'catalogIds array is required' });
    }

    const publication = await prisma.publication.findUnique({ where: { id: Number(id) } });
    if (!publication) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && publication.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const catalogEntries = await prisma.positionCatalog.findMany({
      where: {
        id: { in: specs.map((s) => s.catalogId) },
        lguId: publication.lguId,
      },
      include: { documentRequirements: { orderBy: { sortOrder: 'asc' } } },
    });

    const created = await prisma.$transaction(
      catalogEntries.map((catalog) => {
        const slots = specs.find((s) => s.catalogId === catalog.id)?.slots ?? 1;
        return prisma.position.create({
          data: {
            title: catalog.title,
            itemNumber: catalog.itemNumber,
            salaryGrade: catalog.salaryGrade,
            monthlySalary: catalog.monthlySalary,
            education: catalog.education,
            training: catalog.training,
            experience: catalog.experience,
            eligibility: catalog.eligibility,
            competency: catalog.competency,
            placeOfAssignment: catalog.placeOfAssignment,
            description: catalog.description,
            status: 'DRAFT',
            slots,
            lguId: catalog.lguId,
            departmentId: catalog.departmentId,
            catalogId: catalog.id,
            publicationId: publication.id,
            createdBy: req.user!.id,
            documentRequirements: {
              create: catalog.documentRequirements.map((r) => ({
                label: r.label,
                description: r.description,
                isRequired: r.isRequired,
                sortOrder: r.sortOrder,
              })),
            },
          },
        });
      })
    );

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADD_POSITIONS',
      entity: 'publication',
      entityId: publication.id,
      newValues: { catalogIds: specs.map((s) => s.catalogId), created: created.map((p) => p.id) },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: created });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const removePositionFromPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { id, positionId } = req.params;

    const publication = await prisma.publication.findUnique({ where: { id: Number(id) } });
    if (!publication) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && publication.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const position = await prisma.position.findFirst({
      where: { id: Number(positionId), publicationId: publication.id },
      include: { _count: { select: { applications: true } } },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found in this publication' });
    }

    if (position._count.applications > 0) {
      return res.status(400).json({ message: 'Cannot remove a position that has applications' });
    }

    // Removing an instance deletes it (and its snapshotted document requirements via cascade).
    await prisma.position.delete({ where: { id: position.id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'REMOVE_POSITION',
      entity: 'publication',
      entityId: publication.id,
      oldValues: { positionId: Number(positionId) },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Position removed from publication' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
