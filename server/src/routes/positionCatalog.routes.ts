import { Router } from 'express';
import {
  getCatalogPositions,
  getCatalogPosition,
  createCatalogPosition,
  updateCatalogPosition,
  deleteCatalogPosition,
} from '../controllers/positionCatalog.controller';
import { authenticate, requireLguAdmin, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireLguAdmin, getCatalogPositions);
router.get('/:id', authenticate, requireLguAdmin, getCatalogPosition);
router.post('/', authenticate, requireLguAdmin, denySuperAdminWrite, createCatalogPosition);
router.put('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, updateCatalogPosition);
router.delete('/:id', authenticate, requireLguAdmin, denySuperAdminWrite, deleteCatalogPosition);

export default router;
