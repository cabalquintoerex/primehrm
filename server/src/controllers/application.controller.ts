import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import fs from 'fs';
import path from 'path';

export const submitApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { positionId, notes } = req.body;
    const applicantId = req.user!.id;

    if (!positionId) {
      return res.status(400).json({ message: 'Position ID is required' });
    }

    // Check position exists and is OPEN
    const position = await prisma.position.findUnique({
      where: { id: Number(positionId) },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (position.status !== 'OPEN') {
      return res.status(400).json({ message: 'Position is not open for applications' });
    }

    // Check if applicant already applied
    const existing = await prisma.application.findUnique({
      where: {
        positionId_applicantId: {
          positionId: Number(positionId),
          applicantId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'You have already applied for this position' });
    }

    const application = await prisma.application.create({
      data: {
        positionId: Number(positionId),
        applicantId,
        notes: notes || null,
      },
      include: {
        position: {
          select: { id: true, title: true, itemNumber: true },
        },
      },
    });

    await createAuditLog({
      userId: applicantId,
      action: 'SUBMIT_APPLICATION',
      entity: 'application',
      entityId: application.id,
      newValues: application,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: application });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user!.id;
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { applicantId };
    if (status) where.status = String(status);

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          position: {
            select: {
              id: true,
              title: true,
              itemNumber: true,
              salaryGrade: true,
              monthlySalary: true,
              placeOfAssignment: true,
              status: true,
              closeDate: true,
              lgu: { select: { id: true, name: true, slug: true } },
              department: { select: { id: true, name: true } },
            },
          },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return res.json({
      data: applications,
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

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { positionId, status, departmentId, search, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Scope to LGU through position relation
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    // LGU_OFFICE_ADMIN: scope to their department and only endorsed+ statuses
    if (req.user!.role === 'LGU_OFFICE_ADMIN') {
      where.position = {
        ...where.position,
        departmentId: req.user!.departmentId,
      };
      where.status = {
        notIn: ['SUBMITTED'],
      };
    }

    if (positionId) where.positionId = Number(positionId);
    if (status) where.status = String(status);
    if (departmentId) {
      where.position = {
        ...where.position,
        departmentId: Number(departmentId),
      };
    }
    if (search) {
      where.applicant = {
        OR: [
          { firstName: { contains: String(search) } },
          { lastName: { contains: String(search) } },
          { email: { contains: String(search) } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          position: {
            select: {
              id: true,
              title: true,
              itemNumber: true,
              salaryGrade: true,
              department: { select: { id: true, name: true } },
              lgu: { select: { id: true, name: true } },
            },
          },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return res.json({
      data: applications,
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

export const getApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
            itemNumber: true,
            salaryGrade: true,
            monthlySalary: true,
            education: true,
            training: true,
            experience: true,
            eligibility: true,
            competency: true,
            placeOfAssignment: true,
            description: true,
            status: true,
            lguId: true,
            department: { select: { id: true, name: true } },
            lgu: { select: { id: true, name: true, slug: true } },
          },
        },
        documents: {
          include: {
            requirement: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Applicants can only view their own applications
    if (req.user!.role === 'APPLICANT' && application.applicantId !== req.user!.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // LGU admins can only view applications for positions in their LGU
    if (req.user!.role === 'LGU_HR_ADMIN' && application.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // LGU office admins can only view endorsed+ applications for positions in their department
    if (req.user!.role === 'LGU_OFFICE_ADMIN') {
      if (application.position.lguId !== req.user!.lguId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      if (application.position.department?.id !== req.user!.departmentId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      if (application.status === 'SUBMITTED') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    // Fetch PDS and WES for the applicant
    const [pds, wes] = await Promise.all([
      prisma.personalDataSheet.findUnique({
        where: { userId: application.applicantId },
      }),
      prisma.workExperienceSheet.findUnique({
        where: { userId: application.applicantId },
      }),
    ]);

    return res.json({
      data: {
        ...application,
        personalDataSheet: pds,
        workExperienceSheet: wes,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const existing = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true, departmentId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // LGU admins can only update applications for positions in their LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Office admins can only update applications for their department
    if (req.user!.role === 'LGU_OFFICE_ADMIN') {
      if (existing.position.departmentId !== req.user!.departmentId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      // Office admins can only set SHORTLISTED or REJECTED
      const allowedStatuses = ['SHORTLISTED', 'REJECTED'];
      if (!allowedStatuses.includes(status)) {
        return res.status(403).json({ message: 'Insufficient permissions for this status change' });
      }
    }

    // HR admins cannot set SHORTLISTED (only office admin can)
    if (req.user!.role === 'LGU_HR_ADMIN' && status === 'SHORTLISTED') {
      return res.status(403).json({ message: 'Only the Office Admin can shortlist applicants' });
    }

    const data: any = { status };
    if (notes !== undefined) data.notes = notes;

    const application = await prisma.application.update({
      where: { id: Number(id) },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_APPLICATION_STATUS',
      entity: 'application',
      entityId: application.id,
      oldValues: { status: existing.status, notes: existing.notes },
      newValues: { status: application.status, notes: application.notes },
      ipAddress: req.ip,
    });

    return res.json({ data: application });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { requirementId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!requirementId) {
      return res.status(400).json({ message: 'Requirement ID is required' });
    }

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Applicant must own the application
    if (application.applicantId !== req.user!.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Verify the requirement exists and belongs to the position
    const requirement = await prisma.positionDocumentRequirement.findFirst({
      where: {
        id: Number(requirementId),
        positionId: application.positionId,
      },
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found for this position' });
    }

    // Delete existing document for this requirement if any
    const existingDoc = await prisma.applicationDocument.findFirst({
      where: {
        applicationId: Number(id),
        requirementId: Number(requirementId),
      },
    });

    if (existingDoc) {
      // Delete old file
      const oldFilePath = path.join(__dirname, '../../', existingDoc.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      await prisma.applicationDocument.delete({ where: { id: existingDoc.id } });
    }

    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: Number(id),
        requirementId: Number(requirementId),
        fileName: file.originalname,
        filePath: `uploads/documents/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      include: {
        requirement: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPLOAD_DOCUMENT',
      entity: 'application_document',
      entityId: document.id,
      newValues: { fileName: document.fileName, requirementId: document.requirementId },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: document });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id, docId } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Applicant must own the application
    if (application.applicantId !== req.user!.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Application must still be in SUBMITTED status
    if (application.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Documents can only be deleted while application is in SUBMITTED status' });
    }

    const document = await prisma.applicationDocument.findFirst({
      where: {
        id: Number(docId),
        applicationId: Number(id),
      },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete the file from disk
    const filePath = path.join(__dirname, '../../', document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.applicationDocument.delete({ where: { id: document.id } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE_DOCUMENT',
      entity: 'application_document',
      entityId: document.id,
      oldValues: { fileName: document.fileName, requirementId: document.requirementId },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const endorseApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const existing = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // LGU admins can only endorse applications for positions in their LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Application must be in SUBMITTED status to be endorsed
    if (existing.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Application must be in SUBMITTED status to be endorsed' });
    }

    const data: any = { status: 'ENDORSED' };
    if (notes !== undefined) data.notes = notes;

    const application = await prisma.application.update({
      where: { id: Number(id) },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'ENDORSE_APPLICATION',
      entity: 'application',
      entityId: application.id,
      oldValues: { status: existing.status, notes: existing.notes },
      newValues: { status: application.status, notes: application.notes },
      ipAddress: req.ip,
    });

    return res.json({ data: application });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const shortlistApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const existing = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true, departmentId: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // LGU admins can only shortlist applications for positions in their LGU
    if (req.user!.role !== 'SUPER_ADMIN' && existing.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // LGU_OFFICE_ADMIN can only shortlist applications for positions in their department
    if (req.user!.role === 'LGU_OFFICE_ADMIN' && existing.position.departmentId !== req.user!.departmentId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Application must be in ENDORSED status to be shortlisted
    if (existing.status !== 'ENDORSED') {
      return res.status(400).json({ message: 'Application must be in ENDORSED status to be shortlisted' });
    }

    const data: any = { status: 'SHORTLISTED' };
    if (notes !== undefined) data.notes = notes;

    const application = await prisma.application.update({
      where: { id: Number(id) },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SHORTLIST_APPLICATION',
      entity: 'application',
      entityId: application.id,
      oldValues: { status: existing.status, notes: existing.notes },
      newValues: { status: application.status, notes: application.notes },
      ipAddress: req.ip,
    });

    return res.json({ data: application });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getApplicationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = Number(req.params.id);

    // Verify the applicant owns this application
    if (req.user!.role === 'APPLICANT') {
      const app = await prisma.application.findFirst({
        where: { id: applicationId, applicantId: req.user!.id },
      });
      if (!app) {
        return res.status(404).json({ message: 'Application not found' });
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: 'application',
        entityId: applicationId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return res.json({ data: logs });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getApplicationStats = async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};

    // Scope to LGU through position relation
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    // LGU_OFFICE_ADMIN: scope to their department and only endorsed+ statuses
    if (req.user!.role === 'LGU_OFFICE_ADMIN') {
      where.position = {
        ...where.position,
        departmentId: req.user!.departmentId,
      };
      where.status = {
        notIn: ['SUBMITTED'],
      };
    }

    const applications = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const stats = applications.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    // Also include total count
    const total = Object.values(stats).reduce((sum: number, count: number) => sum + count, 0);

    return res.json({
      data: {
        ...stats,
        TOTAL: total,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
