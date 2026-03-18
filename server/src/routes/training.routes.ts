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
import { authenticate, requireRole, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

const requireLguAdmin = requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN');

router.post('/', authenticate, requireLguAdmin, denySuperAdminWrite, createTraining);
router.get('/', authenticate, requireLguAdmin, getTrainings);
router.get('/:id', authenticate, requireLguAdmin, getTraining);
router.put('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, updateTraining);
router.delete('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, deleteTraining);
router.post('/:id/participants', authenticate, requireLguAdmin, denySuperAdminWrite, addParticipants);
router.delete('/:id/participants/:participantId', authenticate, requireLguAdmin, denySuperAdminWrite, removeParticipant);
router.put('/:id/complete', authenticate, requireLguAdmin, denySuperAdminWrite, completeTraining);
router.put('/:id/cancel', authenticate, requireLguAdmin, denySuperAdminWrite, cancelTraining);
router.put('/:id/attendance', authenticate, requireLguAdmin, denySuperAdminWrite, markAttendance);

export default router;
