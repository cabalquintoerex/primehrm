import { Router } from 'express';
import {
  saveAssessmentScore,
  getAssessmentsByPosition,
  getAssessmentByApplication,
  getQualifiedApplicants,
  qualifyApplicants,
  selectApplicant,
} from '../controllers/assessment.controller';
import { authenticate, requireRole, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, saveAssessmentScore);
router.get('/position/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAssessmentsByPosition);
router.get('/application/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAssessmentByApplication);
router.get('/qualified', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getQualifiedApplicants);
router.post('/qualify', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, qualifyApplicants);
router.post('/select', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, selectApplicant);

export default router;
