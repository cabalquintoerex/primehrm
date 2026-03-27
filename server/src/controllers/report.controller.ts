import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getPositionReports = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.lguId!;
    const where: any = lguId ? { lguId } : {};

    const [byStatus, byDepartment] = await Promise.all([
      prisma.position.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.position.findMany({
        where,
        select: {
          status: true,
          department: { select: { name: true } },
        },
      }),
    ]);

    // Positions by status
    const statusData = byStatus.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    // Positions by department
    const deptMap: Record<string, number> = {};
    byDepartment.forEach((pos) => {
      const dept = pos.department?.name ?? 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const departmentData = Object.entries(deptMap)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({ data: { byStatus: statusData, byDepartment: departmentData } });
  } catch (error) {
    console.error('Position reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getApplicationReports = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.lguId!;
    const where: any = lguId ? { position: { lguId } } : {};

    const [byStatus, monthlyData] = await Promise.all([
      prisma.application.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.application.findMany({
        where,
        select: { submittedAt: true, status: true },
        orderBy: { submittedAt: 'asc' },
      }),
    ]);

    // Applications by status (pipeline)
    const statusOrder = [
      'SUBMITTED', 'ENDORSED', 'SHORTLISTED', 'FOR_INTERVIEW',
      'INTERVIEWED', 'QUALIFIED', 'SELECTED', 'APPOINTED', 'REJECTED', 'WITHDRAWN',
    ];
    const statusData = statusOrder
      .map((status) => {
        const found = byStatus.find((s) => s.status === status);
        return { status, count: found?._count.id ?? 0 };
      })
      .filter((s) => s.count > 0);

    // Monthly application trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyMap: Record<string, number> = {};
    monthlyData.forEach((app) => {
      const date = new Date(app.submittedAt);
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + 1;
      }
    });
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    return res.json({ data: { byStatus: statusData, monthlyTrend } });
  } catch (error) {
    console.error('Application reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTrainingReports = async (req: AuthRequest, res: Response) => {
  try {
    const lguId = req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.lguId!;
    const where: any = lguId ? { lguId } : {};

    const [byType, byStatus] = await Promise.all([
      prisma.training.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      prisma.training.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
    ]);

    const typeData = byType.map((item) => ({
      type: item.type,
      count: item._count.id,
    }));

    const statusData = byStatus.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    return res.json({ data: { byType: typeData, byStatus: statusData } });
  } catch (error) {
    console.error('Training reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
