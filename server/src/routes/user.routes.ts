import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate, requireLguAdmin, requireModule } from '../middleware/auth';

const router = Router();

// User management lives in the Administration module.
router.use(authenticate, requireLguAdmin, requireModule('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
