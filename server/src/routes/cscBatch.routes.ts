import { Router } from 'express';
import {
  getCscBatches,
  getCscBatch,
  createCscBatch,
  updateCscBatch,
  deleteCscBatch,
  publishCscBatch,
  unpublishCscBatch,
  addPositionsToBatch,
  removePositionFromBatch,
} from '../controllers/cscBatch.controller';
import { authenticate, requireLguAdmin, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireLguAdmin, getCscBatches);
router.get('/:id', authenticate, requireLguAdmin, getCscBatch);
router.post('/', authenticate, requireLguAdmin, denySuperAdminWrite, createCscBatch);
router.put('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, updateCscBatch);
router.delete('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, deleteCscBatch);
router.put('/:id/publish', authenticate, requireLguAdmin, denySuperAdminWrite, publishCscBatch);
router.put('/:id/unpublish', authenticate, requireLguAdmin, denySuperAdminWrite, unpublishCscBatch);
router.post('/:id/positions', authenticate, requireLguAdmin, denySuperAdminWrite, addPositionsToBatch);
router.delete('/:id/positions/:positionId', authenticate, requireLguAdmin, denySuperAdminWrite, removePositionFromBatch);

export default router;
