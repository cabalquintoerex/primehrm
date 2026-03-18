import { Router } from 'express';
import { getPublicCareers, getPublicPosition } from '../controllers/public.controller';
import { getPublicPositionRequirements } from '../controllers/positionRequirement.controller';
import { getLguBySlug } from '../controllers/lgu.controller';

const router = Router();

router.get('/:slug/careers', getPublicCareers);
router.get('/:slug/careers/:id', getPublicPosition);
router.get('/:slug/careers/:id/requirements', getPublicPositionRequirements);
router.get('/:slug/info', getLguBySlug);

export default router;
