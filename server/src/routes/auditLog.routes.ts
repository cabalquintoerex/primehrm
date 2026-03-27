import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getAuditLogs, getAuditLogFilters } from '../controllers/auditLog.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'),
  getAuditLogs
);

router.get(
  '/filters',
  authenticate,
  requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'),
  getAuditLogFilters
);

export default router;
