import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';
import { authenticate, requireLguAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getDepartments);
router.post('/', authenticate, requireLguAdmin, createDepartment);
router.put('/:id', authenticate, requireLguAdmin, updateDepartment);
router.delete('/:id', authenticate, requireLguAdmin, deleteDepartment);

export default router;
