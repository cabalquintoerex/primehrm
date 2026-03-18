import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getCscBatches = async (req: AuthRequest, res: Response) => {
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
        { batchNumber: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const [batches, total] = await Promise.all([
      prisma.cscPublicationBatch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { positions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cscPublicationBatch.count({ where }),
    ]);

    return res.json({
      data: batches,
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

export const getCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.cscPublicationBatch.findUnique({
      where: { id: Number(id) },
      include: {
        lgu: { select: { id: true, name: true, slug: true, address: true, contactNumber: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        positions: {
          include: {
            department: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && batch.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({ data: batch });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { batchNumber, description, openDate } = req.body;

    if (!batchNumber) {
      return res.status(400).json({ message: 'Batch number is required' });
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

    const batch = await prisma.cscPublicationBatch.create({
      data: {
        batchNumber,
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
      entity: 'csc_publication_batch',
      entityId: batch.id,
      newValues: batch,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: batch });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Batch number already exists for this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { batchNumber, description, openDate } = req.body;

    const existing = await prisma.cscPublicationBatch.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Cannot update a published batch' });
    }

    const updateData: any = {
      batchNumber: batchNumber ?? existing.batchNumber,
      description: description !== undefined ? (description || null) : existing.description,
    };

    if (openDate) {
      const postingDate = new Date(openDate);
      const closingDate = new Date(postingDate);
      closingDate.setDate(closingDate.getDate() + 15);
      updateData.openDate = postingDate;
      updateData.closeDate = closingDate;
    }

    const batch = await prisma.cscPublicationBatch.update({
      where: { id: Number(id) },
      data: updateData,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'csc_publication_batch',
      entityId: batch.id,
      oldValues: existing,
      newValues: batch,
      ipAddress: req.ip,
    });

    return res.json({ data: batch });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Batch number already exists for this LGU' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cscPublicationBatch.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { positions: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Cannot delete a published batch' });
    }

    if (existing._count.positions > 0) {
      return res.status(400).json({ message: 'Cannot delete a batch with positions. Remove all positions first.' });
    }

    await prisma.cscPublicationBatch.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'csc_publication_batch',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'CSC Batch deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const publishCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cscPublicationBatch.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.isPublished) {
      return res.status(400).json({ message: 'Batch is already published' });
    }

    const batch = await prisma.cscPublicationBatch.update({
      where: { id: Number(id) },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Auto-open all DRAFT positions in this batch
    await prisma.position.updateMany({
      where: {
        cscBatchId: batch.id,
        status: 'DRAFT',
      },
      data: {
        status: 'OPEN',
        openDate: batch.openDate,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'PUBLISH',
      entity: 'csc_publication_batch',
      entityId: batch.id,
      oldValues: { isPublished: false },
      newValues: { isPublished: true },
      ipAddress: req.ip,
    });

    return res.json({ data: batch });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const unpublishCscBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cscPublicationBatch.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (!existing.isPublished) {
      return res.status(400).json({ message: 'Batch is not published' });
    }

    const batch = await prisma.cscPublicationBatch.update({
      where: { id: Number(id) },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });

    // Revert OPEN positions back to DRAFT
    await prisma.position.updateMany({
      where: {
        cscBatchId: batch.id,
        status: 'OPEN',
      },
      data: {
        status: 'DRAFT',
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UNPUBLISH',
      entity: 'csc_publication_batch',
      entityId: batch.id,
      oldValues: { isPublished: true },
      newValues: { isPublished: false },
      ipAddress: req.ip,
    });

    return res.json({ data: batch });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addPositionsToBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { positionIds } = req.body;

    if (!Array.isArray(positionIds) || positionIds.length === 0) {
      return res.status(400).json({ message: 'positionIds array is required' });
    }

    const batch = await prisma.cscPublicationBatch.findUnique({ where: { id: Number(id) } });
    if (!batch) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && batch.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.position.updateMany({
      where: {
        id: { in: positionIds.map(Number) },
        lguId: batch.lguId,
      },
      data: { cscBatchId: batch.id },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADD_POSITIONS',
      entity: 'csc_publication_batch',
      entityId: batch.id,
      newValues: { positionIds },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Positions added to batch' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const removePositionFromBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id, positionId } = req.params;

    const batch = await prisma.cscPublicationBatch.findUnique({ where: { id: Number(id) } });
    if (!batch) {
      return res.status(404).json({ message: 'CSC Batch not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && batch.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.position.update({
      where: { id: Number(positionId) },
      data: { cscBatchId: null },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'REMOVE_POSITION',
      entity: 'csc_publication_batch',
      entityId: batch.id,
      oldValues: { positionId: Number(positionId) },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Position removed from batch' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
