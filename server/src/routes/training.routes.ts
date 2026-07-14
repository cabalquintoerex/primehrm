import { Router } from 'express';
import {
  createTraining,
  getTrainings,
  getTraining,
  updateTraining,
  deleteTraining,
  addParticipants,
  removeParticipant,
  completeTraining,
  cancelTraining,
  markAttendance,
} from '../controllers/training.controller';
import { authenticate, requireRole, requireModule, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

const requireLguAdmin = requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN');

// All training endpoints belong to the L&D module; block LGUs that have not licensed it.
router.use(authenticate, requireModule('LND'));

router.post('/', requireLguAdmin, denySuperAdminWrite, createTraining);
router.get('/', requireLguAdmin, getTrainings);
router.get('/:id', requireLguAdmin, getTraining);
router.put('/:id', requireLguAdmin, denySuperAdminWrite, updateTraining);
router.delete('/:id', requireLguAdmin, denySuperAdminWrite, deleteTraining);
router.post('/:id/participants', requireLguAdmin, denySuperAdminWrite, addParticipants);
router.delete('/:id/participants/:participantId', requireLguAdmin, denySuperAdminWrite, removeParticipant);
router.put('/:id/complete', requireLguAdmin, denySuperAdminWrite, completeTraining);
router.put('/:id/cancel', requireLguAdmin, denySuperAdminWrite, cancelTraining);
router.put('/:id/attendance', requireLguAdmin, denySuperAdminWrite, markAttendance);

export default router;
