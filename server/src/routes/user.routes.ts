import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate, requireLguAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireLguAdmin, getUsers);
router.post('/', authenticate, requireLguAdmin, createUser);
router.put('/:id', authenticate, requireLguAdmin, updateUser);
router.delete('/:id', authenticate, requireLguAdmin, deleteUser);

export default router;
