import { Router } from 'express';
import { login, logout, refreshToken, getMe, register, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
