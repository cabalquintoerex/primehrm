import { Router } from 'express';
import {
  submitApplication,
  getMyApplications,
  getApplications,
  getApplication,
  getApplicationHistory,
  updateApplicationStatus,
  endorseApplication,
  shortlistApplication,
  getApplicationStats,
  uploadDocument,
  deleteDocument,
} from '../controllers/application.controller';
import { authenticate, requireRole, requireLguAdmin, denySuperAdminWrite } from '../middleware/auth';
import { uploadDocument as uploadDocumentMiddleware } from '../config/upload';

const router = Router();

// Applicant routes
router.post('/', authenticate, requireRole('APPLICANT'), submitApplication);
router.get('/my', authenticate, requireRole('APPLICANT'), getMyApplications);

// Stats route (must be before /:id to avoid matching)
router.get('/stats', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), getApplicationStats);

// HR Admin + Office Admin routes
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), getApplications);
router.put('/:id/status', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), denySuperAdminWrite, updateApplicationStatus);
router.put('/:id/endorse', authenticate, requireLguAdmin, denySuperAdminWrite, endorseApplication);
router.put('/:id/shortlist', authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'), denySuperAdminWrite, shortlistApplication);

// Authenticated routes (both applicant and admin)
router.get('/:id', authenticate, getApplication);
router.get('/:id/history', authenticate, getApplicationHistory);

// Document routes (applicant only)
router.post('/:id/documents', authenticate, requireRole('APPLICANT'), uploadDocumentMiddleware.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', authenticate, requireRole('APPLICANT'), deleteDocument);

export default router;
