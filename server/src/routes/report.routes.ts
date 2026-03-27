import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getPositionReports,
  getApplicationReports,
  getTrainingReports,
} from '../controllers/report.controller';

const router = Router();

const access = [authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN')];

router.get('/positions', ...access, getPositionReports);
router.get('/applications', ...access, getApplicationReports);
router.get('/trainings', ...access, getTrainingReports);

export default router;
