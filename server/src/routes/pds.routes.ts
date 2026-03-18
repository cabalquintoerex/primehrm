import { Router } from 'express';
import { getMyPds, saveMyPds, getMyWes, saveMyWes } from '../controllers/pds.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/pds', authenticate, requireRole('APPLICANT'), getMyPds);
router.post('/pds', authenticate, requireRole('APPLICANT'), saveMyPds);
router.get('/wes', authenticate, requireRole('APPLICANT'), getMyWes);
router.post('/wes', authenticate, requireRole('APPLICANT'), saveMyWes);

export default router;
