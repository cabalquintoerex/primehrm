import { Router } from 'express';
import {
  createInterview,
  getInterviews,
  getInterview,
  updateInterview,
  completeInterview,
  cancelInterview,
  markAttendance,
} from '../controllers/interview.controller';
import { authenticate, requireRole, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, createInterview);
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), getInterviews);
router.get('/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), getInterview);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, updateInterview);
router.put('/:id/complete', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, completeInterview);
router.put('/:id/cancel', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, cancelInterview);
router.put('/:id/attendance', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, markAttendance);

export default router;
