import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

const DEFAULT_FINAL_REQUIREMENTS = [
  { requirementName: 'Oath of Office (CS Form No. 32)', description: 'Signed Oath of Office form', sortOrder: 1 },
  { requirementName: 'Appointment Form (CS Form No. 33-B)', description: 'Signed Appointment form', sortOrder: 2 },
  { requirementName: 'Assumption to Duty', description: 'Certificate of Assumption to Duty', sortOrder: 3 },
  { requirementName: 'Certificate of Live Birth (PSA)', description: 'Authenticated copy from PSA', sortOrder: 4 },
  { requirementName: 'Marriage Certificate (if applicable)', description: 'PSA-authenticated copy', sortOrder: 5 },
  { requirementName: 'NBI Clearance', description: 'Valid NBI Clearance', sortOrder: 6 },
  { requirementName: 'Medical Certificate', description: 'Pre-employment medical certificate', sortOrder: 7 },
  { requirementName: 'Barangay Clearance', description: 'Valid Barangay Clearance', sortOrder: 8 },
];

export const createAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, appointmentDate, oathDate } = req.body;

    if (!applicationId || !appointmentDate) {
      return res.status(400).json({ message: 'Application ID and appointment date are required' });
    }

    const application = await prisma.application.findUnique({
      where: { id: Number(applicationId) },
      include: {
        position: { select: { id: true, lguId: true, title: true, slots: true } },
        appointment: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'SELECTED') {
      return res.status(400).json({ message: 'Only selected applicants can be appointed' });
    }

    if (application.appointment) {
      return res.status(400).json({ message: 'Appointment already exists for this application' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && application.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      // Create appointment
      const appt = await tx.appointment.create({
        data: {
          applicationId: Number(applicationId),
          positionId: application.position.id,
          appointmentDate: new Date(appointmentDate),
          oathDate: oathDate ? new Date(oathDate) : null,
          createdBy: req.user!.id,
        },
        include: {
          application: {
            include: {
              applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          position: {
            select: { id: true, title: true, itemNumber: true, department: { select: { id: true, name: true } } },
          },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update application status to APPOINTED
      await tx.application.update({
        where: { id: Number(applicationId) },
        data: { status: 'APPOINTED' },
      });

      // Create default final requirements
      await tx.finalRequirement.createMany({
        data: DEFAULT_FINAL_REQUIREMENTS.map((req) => ({
          appointmentId: appt.id,
          requirementName: req.requirementName,
          description: req.description,
        })),
      });

      // Check if all slots are filled — auto-close position
      const appointedCount = await tx.application.count({
        where: { positionId: application.position.id, status: 'APPOINTED' },
      });

      if (appointedCount >= application.position.slots) {
        await tx.position.update({
          where: { id: application.position.id },
          data: { status: 'FILLED' },
        });
      }

      return appt;
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_APPOINTMENT',
      entity: 'appointment',
      entityId: appointment.id,
      newValues: { applicationId, appointmentDate, oathDate },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: appointment });
  } catch (error) {
    console.error('Create appointment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const { status, positionId, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (positionId) {
      where.positionId = Number(positionId);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          application: {
            include: {
              applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          position: {
            select: {
              id: true, title: true, itemNumber: true, salaryGrade: true, monthlySalary: true,
              department: { select: { id: true, name: true } },
            },
          },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { finalRequirements: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.appointment.count({ where }),
    ]);

    return res.json({
      data: appointments,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        application: {
          include: {
            applicant: {
              select: { id: true, firstName: true, lastName: true, email: true, username: true },
            },
            assessmentScore: true,
            documents: { include: { requirement: true } },
          },
        },
        position: {
          select: {
            id: true, title: true, itemNumber: true, salaryGrade: true, monthlySalary: true,
            placeOfAssignment: true, slots: true,
            department: { select: { id: true, name: true } },
            lgu: { select: { id: true, name: true, slug: true, logo: true, address: true } },
          },
        },
        creator: { select: { id: true, firstName: true, lastName: true } },
        finalRequirements: {
          include: {
            verifier: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && appointment.position.lgu?.id !== undefined) {
      const lguId = appointment.position.lgu?.id;
      if (lguId && lguId !== req.user!.lguId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    // Fetch PDS for form generation
    const pds = await prisma.personalDataSheet.findUnique({
      where: { userId: appointment.application.applicant.id },
    });

    return res.json({ data: { ...appointment, pds } });
  } catch (error) {
    console.error('Get appointment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, oathDate, status } = req.body;

    const existing = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: { position: { select: { lguId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const data: any = {};
    if (appointmentDate) data.appointmentDate = new Date(appointmentDate);
    if (oathDate) data.oathDate = new Date(oathDate);
    if (status) data.status = status;

    const appointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data,
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        position: {
          select: { id: true, title: true, itemNumber: true, department: { select: { id: true, name: true } } },
        },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_APPOINTMENT',
      entity: 'appointment',
      entityId: appointment.id,
      oldValues: { appointmentDate: existing.appointmentDate, oathDate: existing.oathDate, status: existing.status },
      newValues: data,
      ipAddress: req.ip,
    });

    return res.json({ data: appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addFinalRequirement = async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { requirementName, description } = req.body;

    if (!requirementName) {
      return res.status(400).json({ message: 'Requirement name is required' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(appointmentId) },
      include: { position: { select: { lguId: true } } },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && appointment.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const requirement = await prisma.finalRequirement.create({
      data: {
        appointmentId: Number(appointmentId),
        requirementName,
        description: description || null,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADD_FINAL_REQUIREMENT',
      entity: 'final_requirement',
      entityId: requirement.id,
      newValues: { appointmentId, requirementName, description },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: requirement });
  } catch (error) {
    console.error('Add final requirement error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteFinalRequirement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requirement = await prisma.finalRequirement.findUnique({
      where: { id: Number(id) },
      include: { appointment: { include: { position: { select: { lguId: true } } } } },
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && requirement.appointment.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (requirement.isVerified) {
      return res.status(400).json({ message: 'Cannot delete a verified requirement' });
    }

    await prisma.finalRequirement.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE_FINAL_REQUIREMENT',
      entity: 'final_requirement',
      entityId: requirement.id,
      oldValues: { requirementName: requirement.requirementName },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Requirement deleted' });
  } catch (error) {
    console.error('Delete final requirement error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyRequirement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requirement = await prisma.finalRequirement.findUnique({
      where: { id: Number(id) },
      include: { appointment: { include: { position: { select: { lguId: true } } } } },
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && requirement.appointment.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const updated = await prisma.finalRequirement.update({
      where: { id: Number(id) },
      data: {
        isSubmitted: true,
        isVerified: true,
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
      },
      include: {
        verifier: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Check if all requirements verified → mark appointment COMPLETED
    const allRequirements = await prisma.finalRequirement.findMany({
      where: { appointmentId: requirement.appointmentId },
    });
    const allVerified = allRequirements.every((r) => r.id === Number(id) || r.isVerified);

    if (allVerified) {
      await prisma.appointment.update({
        where: { id: requirement.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'VERIFY_REQUIREMENT',
      entity: 'final_requirement',
      entityId: requirement.id,
      newValues: { isVerified: true, verifiedBy: req.user!.id },
      ipAddress: req.ip,
    });

    return res.json({ data: updated, appointmentCompleted: allVerified });
  } catch (error) {
    console.error('Verify requirement error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const unverifyRequirement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requirement = await prisma.finalRequirement.findUnique({
      where: { id: Number(id) },
      include: { appointment: { include: { position: { select: { lguId: true } } } } },
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && requirement.appointment.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const updated = await prisma.finalRequirement.update({
      where: { id: Number(id) },
      data: {
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
      },
    });

    // If appointment was COMPLETED, revert to PENDING
    if (requirement.appointment.status === 'COMPLETED') {
      await prisma.appointment.update({
        where: { id: requirement.appointmentId },
        data: { status: 'PENDING' },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'UNVERIFY_REQUIREMENT',
      entity: 'final_requirement',
      entityId: requirement.id,
      ipAddress: req.ip,
    });

    return res.json({ data: updated });
  } catch (error) {
    console.error('Unverify requirement error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAppointmentStats = async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    const [total, pending, completed] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.count({ where: { ...where, status: 'PENDING' } }),
      prisma.appointment.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);

    return res.json({ data: { total, pending, completed } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
