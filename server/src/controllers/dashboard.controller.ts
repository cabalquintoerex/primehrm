import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

/**
 * Administration dashboard — system-wide overview. SUPER_ADMIN only.
 * (LGU HR admins reach Administration for Departments/Users but have no system dashboard.)
 */
export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [totalLgus, totalUsers, totalDepartments, totalPositions] = await Promise.all([
      prisma.lgu.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.position.count(),
    ]);

    return res.json({
      data: { stats: { totalLgus, totalUsers, totalDepartments, totalPositions } },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * RSP dashboard — recruitment pipeline. SUPER_ADMIN sees all LGUs; LGU admins are scoped
 * to their LGU, and office admins additionally to their department.
 */
export const getRspDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { role, lguId, departmentId } = req.user!;

    // SUPER_ADMIN has no LGU → no filter (all LGUs). LGU admins scope to their own LGU.
    const positionWhere: any = role === 'SUPER_ADMIN' ? {} : { lguId };
    const applicationWhere: any = role === 'SUPER_ADMIN' ? {} : { position: { lguId } };
    const appointmentWhere: any = role === 'SUPER_ADMIN' ? {} : { position: { lguId } };

    // Office admin: scope to their department and hide un-endorsed applications.
    if (role === 'LGU_OFFICE_ADMIN') {
      positionWhere.departmentId = departmentId;
      applicationWhere.position = { lguId, departmentId };
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
    ] = await Promise.all([
      prisma.position.count({ where: { ...positionWhere, status: 'OPEN' } }),
      prisma.application.count({ where: applicationWhere }),
      prisma.application.groupBy({
        by: ['status'],
        where: applicationWhere,
        _count: { id: true },
      }),
      prisma.appointment.count({ where: { ...appointmentWhere, status: 'PENDING' } }),
      prisma.appointment.count({ where: { ...appointmentWhere, status: 'COMPLETED' } }),
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
          applicationsByStatus: statusMap,
        },
        recentPositions,
        recentApplications,
      },
    });
  } catch (error) {
    console.error('RSP dashboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * L&D dashboard — training program health. SUPER_ADMIN sees all LGUs; HR admins are scoped
 * to their LGU. (Office admins do not have the L&D module.)
 */
export const getLndDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { role, lguId } = req.user!;
    const where: any = role === 'SUPER_ADMIN' ? {} : { lguId };
    const participantWhere: any =
      role === 'SUPER_ADMIN' ? {} : { training: { lguId } };

    const [
      totalTrainings,
      upcomingTrainings,
      ongoingTrainings,
      completedTrainings,
      totalParticipants,
      participantsTrained,
      recentTrainings,
    ] = await Promise.all([
      prisma.training.count({ where }),
      prisma.training.count({ where: { ...where, status: 'UPCOMING' } }),
      prisma.training.count({ where: { ...where, status: 'ONGOING' } }),
      prisma.training.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.trainingParticipant.count({ where: participantWhere }),
      prisma.trainingParticipant.count({ where: { ...participantWhere, attended: true } }),
      prisma.training.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          numberOfHours: true,
          _count: { select: { participants: true } },
        },
      }),
    ]);

    // Share of participants who attended, across trainings that have started.
    const completionRate =
      totalParticipants > 0 ? Math.round((participantsTrained / totalParticipants) * 100) : 0;

    return res.json({
      data: {
        stats: {
          totalTrainings,
          upcomingTrainings,
          ongoingTrainings,
          completedTrainings,
          totalParticipants,
          participantsTrained,
          completionRate,
        },
        recentTrainings,
      },
    });
  } catch (error) {
    console.error('L&D dashboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
