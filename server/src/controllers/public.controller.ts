import { Request, Response } from 'express';
import prisma from '../config/database';

export const getPublicCareers = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { search, departmentId, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Find LGU by slug
    const lgu = await prisma.lgu.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!lgu) {
      return res.status(404).json({ message: 'LGU not found' });
    }

    const where: any = {
      lguId: lgu.id,
      status: 'OPEN',
      cscBatch: { isPublished: true },
    };

    if (departmentId) where.departmentId = Number(departmentId);
    if (search) {
      where.title = { contains: String(search) };
    }

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          itemNumber: true,
          salaryGrade: true,
          monthlySalary: true,
          placeOfAssignment: true,
          closeDate: true,
          slots: true,
          openDate: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { openDate: 'desc' },
      }),
      prisma.position.count({ where }),
    ]);

    return res.json({
      data: positions,
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

export const getPublicPosition = async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;

    // Find LGU by slug
    const lgu = await prisma.lgu.findUnique({
      where: { slug },
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
        cscBatch: { isPublished: true },
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    return res.json({ data: position });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
