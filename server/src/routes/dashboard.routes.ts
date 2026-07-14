import { Router } from 'express';
import { authenticate, requireRole, requireModule } from '../middleware/auth';
import {
  getAdminDashboard,
  getRspDashboard,
  getLndDashboard,
} from '../controllers/dashboard.controller';

const router = Router();

router.get('/admin', authenticate, requireRole('SUPER_ADMIN'), getAdminDashboard);

router.get(
  '/rsp',
  authenticate,
  requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'),
  getRspDashboard
);

router.get(
  '/lnd',
  authenticate,
  requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'),
  requireModule('LND'),
  getLndDashboard
);

export default router;
