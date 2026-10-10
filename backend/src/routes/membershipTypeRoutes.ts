import { Router } from 'express';
import { MembershipTypeController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, MembershipTypeController.getAllMembershipTypes);
router.get('/:id', authenticate, MembershipTypeController.getMembershipTypeById);
router.post('/', authenticate, authorize('admin'), MembershipTypeController.createMembershipType);
router.put('/:id', authenticate, authorize('admin'), MembershipTypeController.updateMembershipType);
router.delete('/:id', authenticate, authorize('admin'), MembershipTypeController.deleteMembershipType);
router.patch('/:id/active', authenticate, authorize('admin'), MembershipTypeController.setMembershipTypeActive);

export default router;
