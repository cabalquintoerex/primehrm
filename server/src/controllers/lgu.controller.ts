import { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

export const getLgus = async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { slug: { contains: String(search) } },
      ];
    }

    const [lgus, total] = await Promise.all([
      prisma.lgu.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.lgu.count({ where }),
    ]);

    return res.json({
      data: lgus,
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

export const getPublicLgus = async (_req: Request, res: Response) => {
  try {
    const lgus = await prisma.lgu.findMany({
      select: { id: true, name: true, slug: true, logo: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ data: lgus });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLgu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lgu = await prisma.lgu.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { users: true, departments: true, positions: true } },
      },
    });

    if (!lgu) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    return res.json({ data: lgu });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLguBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const lgu = await prisma.lgu.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logo: true, headerBg: true, address: true, contactNumber: true, email: true },
    });

    if (!lgu) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    return res.json({ data: lgu });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createLgu = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, logo, address, contactNumber, email } = req.body;

    const lgu = await prisma.lgu.create({
      data: { name, slug, logo, address, contactNumber, email },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'lgu',
      entityId: lgu.id,
      newValues: lgu,
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: lgu });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'An LGU with this slug already exists' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateLgu = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, logo, address, contactNumber, email, isActive } = req.body;

    const existing = await prisma.lgu.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    const lgu = await prisma.lgu.update({
      where: { id: Number(id) },
      data: { name, slug, logo, address, contactNumber, email, isActive },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'lgu',
      entityId: lgu.id,
      oldValues: existing,
      newValues: lgu,
      ipAddress: req.ip,
    });

    return res.json({ data: lgu });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'An LGU with this slug already exists' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteLgu = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.lgu.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { users: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    if (existing._count.users > 0) {
      return res.status(400).json({ message: 'Cannot delete LGU with associated users' });
    }

    await prisma.lgu.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'lgu',
      entityId: Number(id),
      oldValues: existing,
      ipAddress: req.ip,
    });

    return res.json({ message: 'LGU deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadLguLogo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const lgu = await prisma.lgu.findUnique({ where: { id: Number(id) } });
    if (!lgu) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'LGU not found' });
    }

    // Compress and resize with Sharp
    const compressedFilename = `logo-${Date.now()}.webp`;
    const compressedPath = path.join(path.dirname(file.path), compressedFilename);

    await sharp(file.path)
      .resize(200, 200, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(compressedPath);

    // Remove the original uncompressed file
    fs.unlinkSync(file.path);

    // Remove old logo file if exists
    if (lgu.logo) {
      const oldLogoPath = path.join(__dirname, '../../uploads', lgu.logo.replace('/uploads/', ''));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    const logoUrl = `/uploads/logos/${compressedFilename}`;

    const updated = await prisma.lgu.update({
      where: { id: Number(id) },
      data: { logo: logoUrl },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'lgu',
      entityId: updated.id,
      oldValues: { logo: lgu.logo },
      newValues: { logo: logoUrl },
      ipAddress: req.ip,
    });

    return res.json({ data: updated });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Failed to upload logo' });
  }
};

export const uploadLguHeaderBg = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const lgu = await prisma.lgu.findUnique({ where: { id: Number(id) } });
    if (!lgu) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'LGU not found' });
    }

    // Optimize: resize to max 1920px wide, compress to WebP
    const compressedFilename = `header-${Date.now()}.webp`;
    const compressedPath = path.join(path.dirname(file.path), compressedFilename);

    await sharp(file.path)
      .resize(1920, 600, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(compressedPath);

    // Remove original uncompressed file
    fs.unlinkSync(file.path);

    // Remove old header bg if exists
    if (lgu.headerBg) {
      const oldPath = path.join(__dirname, '../../uploads', lgu.headerBg.replace('/uploads/', ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const headerBgUrl = `/uploads/headers/${compressedFilename}`;

    const updated = await prisma.lgu.update({
      where: { id: Number(id) },
      data: { headerBg: headerBgUrl },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'lgu',
      entityId: updated.id,
      oldValues: { headerBg: lgu.headerBg },
      newValues: { headerBg: headerBgUrl },
      ipAddress: req.ip,
    });

    return res.json({ data: updated });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Failed to upload header background' });
  }
};
