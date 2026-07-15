import { Router } from 'express';
import {
  getPublications,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication,
  publishPublication,
  unpublishPublication,
  addPositionsToPublication,
  removePositionFromPublication,
} from '../controllers/publication.controller';
import { authenticate, requireLguAdmin, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireLguAdmin, getPublications);
router.get('/:id', authenticate, requireLguAdmin, getPublication);
router.post('/', authenticate, requireLguAdmin, denySuperAdminWrite, createPublication);
router.put('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, updatePublication);
router.delete('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, deletePublication);
router.put('/:id/publish', authenticate, requireLguAdmin, denySuperAdminWrite, publishPublication);
router.put('/:id/unpublish', authenticate, requireLguAdmin, denySuperAdminWrite, unpublishPublication);
router.post('/:id/positions', authenticate, requireLguAdmin, denySuperAdminWrite, addPositionsToPublication);
router.delete('/:id/positions/:positionId', authenticate, requireLguAdmin, denySuperAdminWrite, removePositionFromPublication);

export default router;
