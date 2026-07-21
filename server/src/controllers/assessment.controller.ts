import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { Decimal } from '@prisma/client/runtime/library';
import { computeAssessment } from '../config/assessmentDefaults';

export const saveAssessmentScore = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, factorScores, remarks } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    if (factorScores && typeof factorScores !== 'object') {
      return res.status(400).json({ message: 'factorScores must be an object keyed by factor id' });
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

    // The total is always computed server-side from the position's own template — the client
    // never gets to assert a total, and a stale client template can't corrupt the ranking.
    const groups = await prisma.assessmentGroup.findMany({
      where: { positionId: application.position.id },
      include: { factors: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    if (groups.length === 0) {
      return res.status(400).json({
        message: 'This position has no assessment template yet. Open the assessment page first.',
      });
    }

    const ratings: Record<string, number> = {};
    const validIds = new Set(groups.flatMap((g) => g.factors.map((f) => String(f.id))));
    for (const [key, value] of Object.entries((factorScores ?? {}) as Record<string, unknown>)) {
      if (!validIds.has(key)) continue; // ignore factors that don't belong to this position
      const rating = Number(value);
      if (!Number.isFinite(rating) || rating < 0 || rating > 100) {
        return res.status(400).json({ message: 'Each rating must be between 0 and 100' });
      }
      ratings[key] = rating;
    }

    const { total } = computeAssessment(
      groups.map((g) => ({ id: g.id, points: Number(g.points), factors: g.factors.map((f) => ({ id: f.id, maxWeight: Number(f.maxWeight) })) })),
      ratings
    );

    const scoreData = {
      factorScores: ratings,
      totalScore: new Decimal(total.toFixed(2)),
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
