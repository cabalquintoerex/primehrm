import { Router } from 'express';
import { getLgus, getLgu, getLguBySlug, getPublicLgus, createLgu, updateLgu, deleteLgu, uploadLguLogo, uploadLguHeaderBg } from '../controllers/lgu.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { uploadLogo, uploadHeader } from '../config/upload';

const router = Router();

// Public routes
router.get('/public', getPublicLgus);
router.get('/slug/:slug', getLguBySlug);

// Protected routes
router.get('/', authenticate, getLgus);
router.get('/:id', authenticate, getLgu);
router.post('/', authenticate, requireSuperAdmin, createLgu);
router.put('/:id', authenticate, requireSuperAdmin, updateLgu);
router.delete('/:id', authenticate, requireSuperAdmin, deleteLgu);
router.post('/:id/logo', authenticate, requireSuperAdmin, uploadLogo.single('logo'), uploadLguLogo);
router.post('/:id/header-bg', authenticate, requireSuperAdmin, uploadHeader.single('headerBg'), uploadLguHeaderBg);

export default router;
