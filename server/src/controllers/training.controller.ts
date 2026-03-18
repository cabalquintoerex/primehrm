import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const createTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, venue, conductedBy, startDate, endDate, numberOfHours } = req.body;

    if (!title || !type || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, type, start date, and end date are required' });
    }

    const lguId = req.user!.role === 'SUPER_ADMIN' ? (req.body.lguId || req.user!.lguId) : req.user!.lguId;

    if (!lguId) {
      return res.status(400).json({ message: 'LGU ID is required' });
    }

    const training = await prisma.training.create({
      data: {
        title,
        description: description || null,
        type,
        venue: venue || null,
        conductedBy: conductedBy || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        numberOfHours: numberOfHours != null && numberOfHours !== '' ? Number(numberOfHours) : null,
        lguId: Number(lguId),
        createdBy: req.user!.id,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_TRAINING',
      entity: 'training',
      entityId: training.id,
      newValues: { title, type, startDate, endDate },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: training });
  } catch (error: any) {
    console.error('Create training error:', error?.message || error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTrainings = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, type, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (req.user!.role !== 'SUPER_ADMIN') {
      where.lguId = req.user!.lguId;
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { venue: { contains: String(search) } },
        { conductedBy: { contains: String(search) } },
      ];
    }
    if (status && status !== 'ALL') where.status = String(status);
    if (type && type !== 'ALL') where.type = String(type);

    const [trainings, total] = await Promise.all([
      prisma.training.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { participants: true } },
        },
        orderBy: { startDate: 'desc' },
      }),
      prisma.training.count({ where }),
    ]);

    return res.json({
      data: trainings,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get trainings error:', error?.message || error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const training = await prisma.training.findUnique({
      where: { id: Number(id) },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          orderBy: { lastName: 'asc' },
        },
      },
    });

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && training.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({ data: training });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, type, venue, conductedBy, startDate, endDate, numberOfHours, status } = req.body;

    const existing = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (venue !== undefined) data.venue = venue;
    if (conductedBy !== undefined) data.conductedBy = conductedBy;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (numberOfHours !== undefined) data.numberOfHours = numberOfHours != null && numberOfHours !== '' ? Number(numberOfHours) : null;
    if (status !== undefined) data.status = status;

    const training = await prisma.training.update({
      where: { id: Number(id) },
      data,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_TRAINING',
      entity: 'training',
      entityId: training.id,
      oldValues: { title: existing.title, type: existing.type, status: existing.status },
      newValues: { title: training.title, type: training.type, status: training.status },
      ipAddress: req.ip,
    });

    return res.json({ data: training });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status !== 'UPCOMING') {
      return res.status(400).json({ message: 'Only upcoming trainings can be deleted' });
    }

    await prisma.training.delete({
      where: { id: Number(id) },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE_TRAINING',
      entity: 'training',
      entityId: existing.id,
      oldValues: { title: existing.title, type: existing.type },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Training deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addParticipants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { participants } = req.body; // [{ firstName, lastName, department }]

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }

    const training = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && training.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.trainingParticipant.createMany({
      data: participants.map((p: { firstName: string; lastName: string; department?: string }) => ({
        trainingId: Number(id),
        firstName: p.firstName,
        lastName: p.lastName,
        department: p.department || null,
      })),
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADD_TRAINING_PARTICIPANTS',
      entity: 'training',
      entityId: training.id,
      newValues: { participants },
      ipAddress: req.ip,
    });

    // Return updated training with participants
    const updated = await prisma.training.findUnique({
      where: { id: Number(id) },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        participants: { orderBy: { lastName: 'asc' } },
      },
    });

    return res.status(201).json({ data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { id, participantId } = req.params;

    const training = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && training.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const participant = await prisma.trainingParticipant.findFirst({
      where: {
        id: Number(participantId),
        trainingId: Number(id),
      },
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    await prisma.trainingParticipant.delete({
      where: { id: participant.id },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'REMOVE_TRAINING_PARTICIPANT',
      entity: 'training',
      entityId: training.id,
      oldValues: { firstName: participant.firstName, lastName: participant.lastName },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Participant removed' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Training is already completed or cancelled' });
    }

    const training = await prisma.training.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED' },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'COMPLETE_TRAINING',
      entity: 'training',
      entityId: training.id,
      oldValues: { status: existing.status },
      newValues: { status: 'COMPLETED' },
      ipAddress: req.ip,
    });

    return res.json({ data: training });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelTraining = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Training is already completed or cancelled' });
    }

    const training = await prisma.training.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CANCEL_TRAINING',
      entity: 'training',
      entityId: training.id,
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED' },
      ipAddress: req.ip,
    });

    return res.json({ data: training });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { attendance } = req.body; // [{ participantId: number, attended: boolean }]

    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ message: 'Attendance data is required' });
    }

    const training = await prisma.training.findUnique({
      where: { id: Number(id) },
    });

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && training.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await prisma.$transaction(
      attendance.map((record: { participantId: number; attended: boolean }) =>
        prisma.trainingParticipant.update({
          where: { id: Number(record.participantId) },
          data: {
            attended: record.attended,
            completedAt: record.attended ? new Date() : null,
          },
        })
      )
    );

    await createAuditLog({
      userId: req.user!.id,
      action: 'MARK_TRAINING_ATTENDANCE',
      entity: 'training',
      entityId: training.id,
      newValues: { attendance },
      ipAddress: req.ip,
    });

    // Return updated training
    const updated = await prisma.training.findUnique({
      where: { id: Number(id) },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        participants: { orderBy: { lastName: 'asc' } },
      },
    });

    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
