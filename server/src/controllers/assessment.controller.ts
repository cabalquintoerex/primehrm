import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { Decimal } from '@prisma/client/runtime/library';

const computeTotalScore = (scores: {
  educationScore?: number | null;
  trainingScore?: number | null;
  experienceScore?: number | null;
  performanceScore?: number | null;
  psychosocialScore?: number | null;
  potentialScore?: number | null;
  interviewScore?: number | null;
}): number => {
  const values = [
    scores.educationScore,
    scores.trainingScore,
    scores.experienceScore,
    scores.performanceScore,
    scores.psychosocialScore,
    scores.potentialScore,
    scores.interviewScore,
  ];
  return values.reduce((sum: number, val) => sum + (val ? Number(val) : 0), 0);
};

export const saveAssessmentScore = async (req: AuthRequest, res: Response) => {
  try {
    const {
      applicationId,
      educationScore,
      trainingScore,
      experienceScore,
      performanceScore,
      psychosocialScore,
      potentialScore,
      interviewScore,
      remarks,
    } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id: Number(applicationId) },
      include: {
        position: { select: { id: true, lguId: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && application.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const totalScore = computeTotalScore({
      educationScore,
      trainingScore,
      experienceScore,
      performanceScore,
      psychosocialScore,
      potentialScore,
      interviewScore,
    });

    const scoreData = {
      educationScore: educationScore != null ? new Decimal(educationScore) : null,
      trainingScore: trainingScore != null ? new Decimal(trainingScore) : null,
      experienceScore: experienceScore != null ? new Decimal(experienceScore) : null,
      performanceScore: performanceScore != null ? new Decimal(performanceScore) : null,
      psychosocialScore: psychosocialScore != null ? new Decimal(psychosocialScore) : null,
      potentialScore: potentialScore != null ? new Decimal(potentialScore) : null,
      interviewScore: interviewScore != null ? new Decimal(interviewScore) : null,
      totalScore: new Decimal(totalScore),
      remarks: remarks || null,
      scoredBy: req.user!.id,
    };

    const assessment = await prisma.assessmentScore.upsert({
      where: {
        applicationId: Number(applicationId),
      },
      create: {
        applicationId: Number(applicationId),
        positionId: application.position.id,
        ...scoreData,
      },
      update: scoreData,
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        position: { select: { id: true, title: true, itemNumber: true } },
        scorer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SAVE_ASSESSMENT_SCORE',
      entity: 'assessment_score',
      entityId: assessment.id,
      newValues: { applicationId, ...scoreData },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: assessment });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAssessmentsByPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify position exists and belongs to user's LGU
    const position = await prisma.position.findUnique({
      where: { id: Number(id) },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const assessments = await prisma.assessmentScore.findMany({
      where: { positionId: Number(id) },
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        scorer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { totalScore: 'desc' },
    });

    return res.json({ data: assessments });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAssessmentByApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && application.position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const assessment = await prisma.assessmentScore.findUnique({
      where: { applicationId: Number(id) },
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        position: { select: { id: true, title: true, itemNumber: true } },
        scorer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment score not found' });
    }

    return res.json({ data: assessment });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getQualifiedApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { positionId, departmentId } = req.query;

    const where: any = {
      application: {
        status: { in: ['QUALIFIED', 'SELECTED', 'APPOINTED'] },
      },
    };

    // LGU scope
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.position = { lguId: req.user!.lguId };
    }

    if (positionId) {
      where.positionId = Number(positionId);
    }

    if (departmentId) {
      where.position = { ...where.position, departmentId: Number(departmentId) };
    }

    const assessments = await prisma.assessmentScore.findMany({
      where,
      include: {
        application: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        position: {
          select: { id: true, title: true, itemNumber: true, slots: true, departmentId: true, department: { select: { id: true, name: true } } },
        },
        scorer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { totalScore: 'desc' },
    });

    return res.json({ data: assessments });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const qualifyApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationIds } = req.body;

    if (!applicationIds?.length) {
      return res.status(400).json({ message: 'At least one application ID is required' });
    }

    // Verify all applications exist and belong to user's LGU
    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds.map(Number) } },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (applications.length !== applicationIds.length) {
      return res.status(400).json({ message: 'Some applications were not found' });
    }

    // Check LGU scope
    if (req.user!.role !== 'SUPER_ADMIN') {
      const unauthorized = applications.some((app) => app.position.lguId !== req.user!.lguId);
      if (unauthorized) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    await prisma.application.updateMany({
      where: { id: { in: applicationIds.map(Number) } },
      data: { status: 'QUALIFIED' },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'QUALIFY_APPLICANTS',
      entity: 'application',
      newValues: { applicationIds, status: 'QUALIFIED' },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Applicants qualified successfully', data: { applicationIds } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const selectApplicant = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationIds } = req.body;

    if (!applicationIds?.length) {
      return res.status(400).json({ message: 'At least one application ID is required' });
    }

    // Verify all applications exist and belong to user's LGU
    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds.map(Number) } },
      include: {
        position: { select: { lguId: true } },
      },
    });

    if (applications.length !== applicationIds.length) {
      return res.status(400).json({ message: 'Some applications were not found' });
    }

    // Check LGU scope
    if (req.user!.role !== 'SUPER_ADMIN') {
      const unauthorized = applications.some((app) => app.position.lguId !== req.user!.lguId);
      if (unauthorized) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    await prisma.application.updateMany({
      where: { id: { in: applicationIds.map(Number) } },
      data: { status: 'SELECTED' },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SELECT_APPLICANTS',
      entity: 'application',
      newValues: { applicationIds, status: 'SELECTED' },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Applicants selected successfully', data: { applicationIds } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
