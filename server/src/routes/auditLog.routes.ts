import { Router } from 'express';
import { authenticate, requireRole, requireModule } from '../middleware/auth';
import { getAuditLogs, getAuditLogFilters } from '../controllers/auditLog.controller';

const router = Router();

// Audit logs live in the Administration module.
router.use(authenticate, requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN'), requireModule('ADMIN'));

router.get('/', getAuditLogs);
router.get('/filters', getAuditLogFilters);

export default router;
