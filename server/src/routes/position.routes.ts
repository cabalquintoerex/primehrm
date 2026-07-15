import { Router } from 'express';
import {
  getPositions,
  getPosition,
  updatePosition,
  deletePosition,
  updatePositionStatus,
} from '../controllers/position.controller';
import {
  getPositionRequirements,
  setPositionRequirements,
} from '../controllers/positionRequirement.controller';
import { authenticate, requireLguAdmin, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireLguAdmin, getPositions);
router.get('/:id', authenticate, getPosition);
router.put('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, updatePosition);
router.delete('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, deletePosition);
router.put('/:id/status', authenticate, requireLguAdmin, denySuperAdminWrite, updatePositionStatus);

// Position document requirements
router.get('/:id/requirements', authenticate, getPositionRequirements);
router.post('/:id/requirements', authenticate, requireLguAdmin, denySuperAdminWrite, setPositionRequirements);

export default router;
