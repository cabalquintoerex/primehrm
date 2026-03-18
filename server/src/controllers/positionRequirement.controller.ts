import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getDefaultRequirements = () => [
  {
    label: 'Letter of Intent',
    description: 'Addressed to the appropriate director/head. Indicate the Position Title and Plantilla Item Number of the position(s) of choice.',
    isRequired: true,
    sortOrder: 1,
  },
  {
    label: 'Personal Data Sheet with Work Experience Sheet',
    description: 'Fully accomplished PDS with Work Experience Sheet and recent passport-sized photo (CS Form No. 212, Revised 2025). Digitally signed or electronically signed. PDS and WES should be converted into a single PDF file.',
    isRequired: true,
    sortOrder: 2,
  },
  {
    label: 'Performance Rating',
    description: 'Performance rating in the last rating period (if applicable)',
    isRequired: false,
    sortOrder: 3,
  },
  {
    label: 'Certificate of Eligibility/Rating/License',
    description: 'Copy of Certificate of Eligibility, Rating, or License',
    isRequired: true,
    sortOrder: 4,
  },
  {
    label: 'Transcript of Records',
    description: 'Copy of Transcript of Records',
    isRequired: true,
    sortOrder: 5,
  },
  {
    label: 'Training Certificates',
    description: 'For positions with training requirements. All submitted certificates should be converted into a single PDF file.',
    isRequired: false,
    sortOrder: 6,
  },
  {
    label: 'Designation Orders',
    description: 'If applicable',
    isRequired: false,
    sortOrder: 7,
  },
];

export const getPositionRequirements = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const position = await prisma.position.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    const requirements = await prisma.positionDocumentRequirement.findMany({
      where: { positionId: Number(id) },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ data: requirements });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setPositionRequirements = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { requirements } = req.body;

    if (!Array.isArray(requirements)) {
      return res.status(400).json({ message: 'Requirements must be an array' });
    }

    const position = await prisma.position.findUnique({
      where: { id: Number(id) },
      select: { id: true, lguId: true },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Non-super admins can only update positions in their own LGU
    if (req.user!.role !== 'SUPER_ADMIN' && position.lguId !== req.user!.lguId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Delete existing requirements and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.positionDocumentRequirement.deleteMany({
        where: { positionId: Number(id) },
      });

      const created = await Promise.all(
        requirements.map((req: any, index: number) =>
          tx.positionDocumentRequirement.create({
            data: {
              positionId: Number(id),
              label: req.label,
              description: req.description || null,
              isRequired: req.isRequired ?? true,
              sortOrder: req.sortOrder ?? index + 1,
            },
          })
        )
      );

      return created;
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'SET_REQUIREMENTS',
      entity: 'position',
      entityId: Number(id),
      newValues: { requirements: result },
      ipAddress: req.ip,
    });

    return res.json({ data: result });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPublicPositionRequirements = async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;

    const lgu = await prisma.lgu.findUnique({
      where: { slug: String(slug) },
      select: { id: true },
    });

    if (!lgu) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    const position = await prisma.position.findFirst({
      where: {
        id: Number(id),
        lguId: lgu.id,
        status: 'OPEN',
      },
      select: { id: true },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    const requirements = await prisma.positionDocumentRequirement.findMany({
      where: { positionId: Number(id) },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ data: requirements });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
