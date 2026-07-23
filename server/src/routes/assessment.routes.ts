import { Router } from 'express';
import {
  saveAssessmentScore,
  getAssessmentsByPosition,
  getAssessmentByApplication,
  getQualifiedApplicants,
  qualifyApplicants,
  selectApplicant,
} from '../controllers/assessment.controller';
import {
  getLguTemplate,
  saveLguTemplate,
  getPositionTemplate,
  savePositionTemplate,
} from '../controllers/assessmentTemplate.controller';
import { authenticate, requireRole, denySuperAdminWrite } from '../middleware/auth';

const router = Router();

// Assessment template — LGU default and the per-position snapshot.
// Registered before the score routes so /template/* can never be shadowed.
router.get('/template/lgu', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getLguTemplate);
router.put('/template/lgu', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, saveLguTemplate);
router.get('/template/position/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getPositionTemplate);
router.put('/template/position/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, savePositionTemplate);

router.post('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, saveAssessmentScore);
router.get('/position/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAssessmentsByPosition);
router.get('/application/:id', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getAssessmentByApplication);
router.get('/qualified', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), getQualifiedApplicants);
router.post('/qualify', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, qualifyApplicants);
router.post('/select', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), denySuperAdminWrite, selectApplicant);

export default router;
