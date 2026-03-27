import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const lguId = req.user!.lguId;

    // Super Admin: LGU-level overview
    if (role === 'SUPER_ADMIN') {
      const [totalLgus, totalUsers, totalDepartments, totalPositions] = await Promise.all([
        prisma.lgu.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.department.count({ where: { isActive: true } }),
        prisma.position.count(),
      ]);

      return res.json({
        data: {
          stats: { totalLgus, totalUsers, totalDepartments, totalPositions },
          recentPositions: [],
          recentApplications: [],
        },
      });
    }

    // LGU Admin: RSP-focused dashboard
    const userLguId = lguId!;
    const positionWhere: any = { lguId: userLguId };
    const applicationWhere: any = { position: { lguId: userLguId } };

    // Office admin: scope to department
    if (role === 'LGU_OFFICE_ADMIN') {
      positionWhere.departmentId = req.user!.departmentId;
      applicationWhere.position = { ...applicationWhere.position, departmentId: req.user!.departmentId };
      applicationWhere.status = { notIn: ['SUBMITTED'] };
    }

    const [
      openPositions,
      totalApplications,
      applicationsByStatus,
      pendingAppointments,
      completedAppointments,
      recentPositions,
      recentApplications,
      upcomingTrainings,
    ] = await Promise.all([
      prisma.position.count({ where: { ...positionWhere, status: 'OPEN' } }),
      prisma.application.count({ where: applicationWhere }),
      prisma.application.groupBy({
        by: ['status'],
        where: applicationWhere,
        _count: { id: true },
      }),
      prisma.appointment.count({
        where: { position: { lguId: userLguId }, status: 'PENDING' },
      }),
      prisma.appointment.count({
        where: { position: { lguId: userLguId }, status: 'COMPLETED' },
      }),
      prisma.position.findMany({
        where: { ...positionWhere, status: 'OPEN' },
        orderBy: { openDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          salaryGrade: true,
          slots: true,
          openDate: true,
          closeDate: true,
          status: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.application.findMany({
        where: applicationWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
          position: { select: { id: true, title: true } },
        },
      }),
      prisma.training.count({
        where: { lguId: userLguId, status: 'UPCOMING' },
      }),
    ]);

    const statusMap = applicationsByStatus.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    return res.json({
      data: {
        stats: {
          openPositions,
          totalApplications,
          pendingAppointments,
          completedAppointments,
          upcomingTrainings,
          applicationsByStatus: statusMap,
        },
        recentPositions,
        recentApplications,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
