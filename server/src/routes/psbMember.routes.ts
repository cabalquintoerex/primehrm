import { Router } from 'express';
import {
  getPsbMembers,
  createPsbMember,
  updatePsbMember,
  deletePsbMember,
} from '../controllers/psbMember.controller';
import { authenticate, requireLguAdmin } from '../middleware/auth';

const router = Router();

// Reads stay open to any authenticated LGU admin — the assessment form needs the signatory
// block, and that lives in RSP. Writes are Administration-side.
router.get('/', authenticate, getPsbMembers);
router.post('/', authenticate, requireLguAdmin, createPsbMember);
router.put('/:id', authenticate, requireLguAdmin, updatePsbMember);
router.delete('/:id', authenticate, requireLguAdmin, deletePsbMember);

export default router;
