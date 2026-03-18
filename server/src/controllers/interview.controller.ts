import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const createInterview = async (req: AuthRequest, res: Response) => {
  try {
    const { positionId, scheduleDate, venue, notes, applicationIds } = req.body;

    if (!positionId || !scheduleDate || !applicationIds?.length) {
      return res.status(400).json({ message: 'Position ID, schedule date, and at least one application ID are required' });
    }

    // Verify position exists and belongs to user's LGU
    const position = await prisma.position.findUnique({
      where: { id: Number(positionId) },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Verify all applications exist and belong to the position
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds.map(Number) },
        positionId: Number(positionId),
      },
    });

    if (applications.length !== applicationIds.length) {
      return res.status(400).json({ message: 'Some applications were not found or do not belong to this position' });
    }

    // Create interview schedule with applicants in a transaction
    const interview = await prisma.$transaction(async (tx) => {
      const schedule = await tx.interviewSchedule.create({
        data: {
          positionId: Number(positionId),
          scheduleDate: new Date(scheduleDate),
          venue: venue || null,
          notes: notes || null,
          createdBy: req.user!.id,
          applicants: {
            create: applicationIds.map((appId: number) => ({
              applicationId: Number(appId),
            })),
          },
        },
        include: {
          position: { select: { id: true, title: true, itemNumber: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          applicants: {
            include: {
              application: {
                include: {
                  applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
              },
            },
          },
        },
      });

      // Update application statuses to FOR_INTERVIEW
      await tx.application.updateMany({
        where: { id: { in: applicationIds.map(Number) } },
        data: { status: 'FOR_INTERVIEW' },
      });

      return schedule;
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_INTERVIEW',
      entity: 'interview_schedule',
      entityId: interview.id,
      newValues: { positionId, scheduleDate, venue, applicationIds },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: interview });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInterviews = async (req: AuthRequest, res: Response) => {
  try {
    const { positionId, status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Scope by LGU through position
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    if (positionId) where.positionId = Number(positionId);
    if (status) where.status = String(status);

    const [interviews, total] = await Promise.all([
      prisma.interviewSchedule.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          position: { select: { id: true, title: true, itemNumber: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { applicants: true } },
        },
        orderBy: { scheduleDate: 'desc' },
      }),
      prisma.interviewSchedule.count({ where }),
    ]);

    return res.json({
      data: interviews,
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

export const getInterview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const interview = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: {
          select: { id: true, title: true, itemNumber: true, lguId: true },
        },
        creator: { select: { id: true, firstName: true, lastName: true } },
        applicants: {
          include: {
            application: {
              include: {
                applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview schedule not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && interview.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({ data: interview });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateInterview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduleDate, venue, notes } = req.body;

    const existing = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Interview schedule not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Only scheduled interviews can be updated' });
    }

    const data: any = {};
    if (scheduleDate !== undefined) data.scheduleDate = new Date(scheduleDate);
    if (venue !== undefined) data.venue = venue;
    if (notes !== undefined) data.notes = notes;

    const interview = await prisma.interviewSchedule.update({
      where: { id: Number(id) },
      data,
      include: {
        position: { select: { id: true, title: true, itemNumber: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        applicants: {
          include: {
            application: {
              include: {
                applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_INTERVIEW',
      entity: 'interview_schedule',
      entityId: interview.id,
      oldValues: { scheduleDate: existing.scheduleDate, venue: existing.venue, notes: existing.notes },
      newValues: { scheduleDate: interview.scheduleDate, venue: interview.venue, notes: interview.notes },
      ipAddress: req.ip,
    });

    return res.json({ data: interview });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeInterview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { attendance } = req.body; // [{ applicationId: number, attended: boolean }]

    const existing = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
        applicants: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Interview schedule not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Only scheduled interviews can be completed' });
    }

    const interview = await prisma.$transaction(async (tx) => {
      // Update interview status
      const updated = await tx.interviewSchedule.update({
        where: { id: Number(id) },
        data: { status: 'COMPLETED' },
      });

      // Update attendance if provided
      if (attendance && Array.isArray(attendance)) {
        for (const record of attendance) {
          await tx.interviewScheduleApplicant.updateMany({
            where: {
              interviewScheduleId: Number(id),
              applicationId: Number(record.applicationId),
            },
            data: { attended: record.attended },
          });

          // Update application status to INTERVIEWED for those who attended
          if (record.attended) {
            await tx.application.update({
              where: { id: Number(record.applicationId) },
              data: { status: 'INTERVIEWED' },
            });
          }
        }
      }

      return updated;
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'COMPLETE_INTERVIEW',
      entity: 'interview_schedule',
      entityId: interview.id,
      oldValues: { status: existing.status },
      newValues: { status: 'COMPLETED', attendance },
      ipAddress: req.ip,
    });

    // Fetch the updated interview with all relations
    const result = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { id: true, title: true, itemNumber: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        applicants: {
          include: {
            application: {
              include: {
                applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    return res.json({ data: result });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelInterview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Interview schedule not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (existing.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Only scheduled interviews can be cancelled' });
    }

    const interview = await prisma.interviewSchedule.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CANCEL_INTERVIEW',
      entity: 'interview_schedule',
      entityId: interview.id,
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED' },
      ipAddress: req.ip,
    });

    return res.json({ data: interview });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { applicationId, attended } = req.body;

    if (!applicationId || attended === undefined) {
      return res.status(400).json({ message: 'Application ID and attendance status are required' });
    }

    const existing = await prisma.interviewSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Interview schedule not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const applicantRecord = await prisma.interviewScheduleApplicant.findFirst({
      where: {
        interviewScheduleId: Number(id),
        applicationId: Number(applicationId),
      },
    });

    if (!applicantRecord) {
      return res.status(404).json({ message: 'Applicant not found in this interview schedule' });
    }

    const updated = await prisma.interviewScheduleApplicant.update({
      where: { id: applicantRecord.id },
      data: { attended },
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'MARK_ATTENDANCE',
      entity: 'interview_schedule_applicant',
      entityId: updated.id,
      oldValues: { attended: applicantRecord.attended },
      newValues: { attended },
      ipAddress: req.ip,
    });

    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
