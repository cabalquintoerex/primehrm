import { Router } from 'express';
import { authenticate, requireRole, denySuperAdminWrite } from '../middleware/auth';
import {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  addFinalRequirement,
  deleteFinalRequirement,
  verifyRequirement,
  unverifyRequirement,
  getAppointmentStats,
} from '../controllers/appointment.controller';

const router = Router();

router.get('/stats', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAppointmentStats);
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAppointments);
router.get('/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAppointment);
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, createAppointment);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, updateAppointment);

// Final requirements
router.post('/:appointmentId/requirements', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, addFinalRequirement);
router.delete('/requirements/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, deleteFinalRequirement);
router.put('/requirements/:id/verify', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, verifyRequirement);
router.put('/requirements/:id/unverify', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, unverifyRequirement);

export default router;
