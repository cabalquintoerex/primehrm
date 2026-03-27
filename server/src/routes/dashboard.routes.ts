import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getDashboardStats } from '../controllers/dashboard.controller';

const router = Router();

router.get(
  '/stats',
  authenticate,
  requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'),
  getDashboardStats
);

export default router;
