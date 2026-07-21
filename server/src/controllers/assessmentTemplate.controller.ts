import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import {
  DEFAULT_ASSESSMENT_TEMPLATE,
  DefaultGroup,
  computeAssessment,
} from '../config/assessmentDefaults';

const groupInclude = { factors: { orderBy: { sortOrder: 'asc' as const } } };

/** Creates template rows (LGU default when positionId is null, otherwise a position snapshot). */
async function createGroups(lguId: number, positionId: number | null, groups: DefaultGroup[]) {
  for (const [index, group] of groups.entries()) {
    await prisma.assessmentGroup.create({
      data: {
        lguId,
        positionId,
        code: group.code,
        label: group.label,
        points: group.points,
        sortOrder: index,
        factors: {
          create: group.factors.map((factor, fIndex) => ({
            label: factor.label,
            maxWeight: factor.maxWeight,
            sortOrder: fIndex,
          })),
        },
      },
    });
  }
}

/** The LGU's reusable default template, seeded from the CSC default on first read. */
export const getLguTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(400).json({ message: 'No LGU context' });
    }

    let groups = await prisma.assessmentGroup.findMany({
      where: { lguId, positionId: null },
      include: groupInclude,
      orderBy: { sortOrder: 'asc' },
    });

    if (groups.length === 0) {
      await createGroups(lguId, null, DEFAULT_ASSESSMENT_TEMPLATE);
      groups = await prisma.assessmentGroup.findMany({
        where: { lguId, positionId: null },
        include: groupInclude,
        orderBy: { sortOrder: 'asc' },
      });
    }

    return res.json({ data: groups });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * A position's template. Snapshotted from the LGU default the first time it is requested, so
 * later edits to the LGU default never alter an assessment already in progress.
 */
export const getPositionTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const positionId = Number(req.params.id);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, lguId: true },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    let groups = await prisma.assessmentGroup.findMany({
      where: { positionId },
      include: groupInclude,
      orderBy: { sortOrder: 'asc' },
    });

    if (groups.length === 0) {
      // Snapshot the LGU default (falling back to the CSC default if the LGU has none yet).
      const lguGroups = await prisma.assessmentGroup.findMany({
        where: { lguId: position.lguId, positionId: null },
        include: groupInclude,
        orderBy: { sortOrder: 'asc' },
      });

      const source: DefaultGroup[] = lguGroups.length
        ? lguGroups.map((g) => ({
            code: g.code,
            label: g.label,
            points: Number(g.points),
            factors: g.factors.map((f) => ({ label: f.label, maxWeight: Number(f.maxWeight) })),
          }))
        : DEFAULT_ASSESSMENT_TEMPLATE;

      await createGroups(position.lguId, positionId, source);
      groups = await prisma.assessmentGroup.findMany({
        where: { positionId },
        include: groupInclude,
        orderBy: { sortOrder: 'asc' },
      });
    }

    return res.json({ data: groups });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

interface IncomingGroup {
  code: string;
  label?: string | null;
  points: number;
  factors: Array<{ label: string; maxWeight: number }>;
}

function validateGroups(groups: any): { ok: true; groups: IncomingGroup[] } | { ok: false; message: string } {
  if (!Array.isArray(groups) || groups.length === 0) {
    return { ok: false, message: 'At least one factor group is required' };
  }

  for (const group of groups) {
    if (!group?.code?.trim()) return { ok: false, message: 'Every group needs a code' };
    if (!Number.isFinite(Number(group.points)) || Number(group.points) < 0) {
      return { ok: false, message: `Group ${group.code}: points must be a positive number` };
    }
    if (!Array.isArray(group.factors) || group.factors.length === 0) {
      return { ok: false, message: `Group ${group.code}: at least one factor is required` };
    }
    for (const factor of group.factors) {
      if (!factor?.label?.trim()) {
        return { ok: false, message: `Group ${group.code}: every factor needs a label` };
      }
      const weight = Number(factor.maxWeight);
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
        return { ok: false, message: `Group ${group.code}: max weight must be between 0 and 1` };
      }
    }
  }

  return { ok: true, groups: groups as IncomingGroup[] };
}

/** Replaces a template wholesale (simplest correct approach — the editor sends the full tree). */
async function replaceTemplate(lguId: number, positionId: number | null, groups: IncomingGroup[]) {
  await prisma.assessmentGroup.deleteMany({
    where: positionId === null ? { lguId, positionId: null } : { positionId },
  });
  await createGroups(lguId, positionId, groups.map((g) => ({
    code: g.code,
    label: g.label ?? null,
    points: Number(g.points),
    factors: g.factors.map((f) => ({ label: f.label, maxWeight: Number(f.maxWeight) })),
  })));
}

export const saveLguTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(400).json({ message: 'No LGU context' });
    }

    const result = validateGroups(req.body?.groups);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    await replaceTemplate(lguId, null, result.groups);

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_ASSESSMENT_TEMPLATE',
      entity: 'assessment_template',
      entityId: lguId,
      newValues: { scope: 'lgu', groups: result.groups.length },
      ipAddress: req.ip,
    });

    const groups = await prisma.assessmentGroup.findMany({
      where: { lguId, positionId: null },
      include: groupInclude,
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ data: groups });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const savePositionTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const positionId = Number(req.params.id);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, lguId: true },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = validateGroups(req.body?.groups);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    // Ratings are keyed by factor id, and replacing the template mints new ids. Carry the
    // ratings across by factor label so editing a template (e.g. adding a factor) doesn't
    // silently wipe scores that were already encoded.
    const oldGroups = await prisma.assessmentGroup.findMany({
      where: { positionId },
      include: groupInclude,
    });
    const labelByOldId = new Map<string, string>();
    oldGroups.forEach((g) => g.factors.forEach((f) => labelByOldId.set(String(f.id), f.label)));

    await replaceTemplate(position.lguId, positionId, result.groups);

    const newGroups = await prisma.assessmentGroup.findMany({
      where: { positionId },
      include: groupInclude,
      orderBy: { sortOrder: 'asc' },
    });
    const idByLabel = new Map<string, number>();
    newGroups.forEach((g) => g.factors.forEach((f) => idByLabel.set(f.label, f.id)));

    const existingScores = await prisma.assessmentScore.findMany({ where: { positionId } });
    for (const score of existingScores) {
      const oldRatings = (score.factorScores as Record<string, number> | null) ?? {};
      const remapped: Record<string, number> = {};
      for (const [oldId, rating] of Object.entries(oldRatings)) {
        const label = labelByOldId.get(oldId);
        const newId = label ? idByLabel.get(label) : undefined;
        if (newId !== undefined) remapped[String(newId)] = rating;
      }
      const { total } = computeAssessment(
        newGroups.map((g) => ({ id: g.id, points: Number(g.points), factors: g.factors.map((f) => ({ id: f.id, maxWeight: Number(f.maxWeight) })) })),
        remapped
      );
      await prisma.assessmentScore.update({
        where: { id: score.id },
        data: { factorScores: remapped, totalScore: total },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_ASSESSMENT_TEMPLATE',
      entity: 'assessment_template',
      entityId: positionId,
      newValues: { scope: 'position', groups: result.groups.length },
      ipAddress: req.ip,
    });

    const groups = await prisma.assessmentGroup.findMany({
      where: { positionId },
      include: groupInclude,
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ data: groups });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
