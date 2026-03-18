import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getMyPds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const pds = await prisma.personalDataSheet.findUnique({
      where: { userId },
    });

    if (!pds) {
      return res.status(404).json({ message: 'Personal Data Sheet not found' });
    }

    return res.json({ data: pds });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const saveMyPds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ message: 'PDS data is required' });
    }

    const existing = await prisma.personalDataSheet.findUnique({
      where: { userId },
    });

    let pds;
    if (existing) {
      pds = await prisma.personalDataSheet.update({
        where: { userId },
        data: {
          data,
          version: existing.version + 1,
        },
      });
    } else {
      pds = await prisma.personalDataSheet.create({
        data: {
          userId,
          data,
        },
      });
    }

    await createAuditLog({
      userId,
      action: existing ? 'UPDATE_PDS' : 'CREATE_PDS',
      entity: 'personal_data_sheet',
      entityId: pds.id,
      newValues: { version: pds.version },
      ipAddress: req.ip,
    });

    return res.json({ data: pds });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyWes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const wes = await prisma.workExperienceSheet.findUnique({
      where: { userId },
    });

    if (!wes) {
      return res.status(404).json({ message: 'Work Experience Sheet not found' });
    }

    return res.json({ data: wes });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const saveMyWes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ message: 'WES data is required' });
    }

    const existing = await prisma.workExperienceSheet.findUnique({
      where: { userId },
    });

    let wes;
    if (existing) {
      wes = await prisma.workExperienceSheet.update({
        where: { userId },
        data: {
          data,
          version: existing.version + 1,
        },
      });
    } else {
      wes = await prisma.workExperienceSheet.create({
        data: {
          userId,
          data,
        },
      });
    }

    await createAuditLog({
      userId,
      action: existing ? 'UPDATE_WES' : 'CREATE_WES',
      entity: 'work_experience_sheet',
      entityId: wes.id,
      newValues: { version: wes.version },
      ipAddress: req.ip,
    });

    return res.json({ data: wes });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
