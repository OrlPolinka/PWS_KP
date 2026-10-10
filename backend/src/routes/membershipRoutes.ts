import { Router } from 'express';
import { MembershipController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/my', authenticate, MembershipController.getMyMemberships);
router.post('/purchase', authenticate, authorize('client'), MembershipController.purchaseMembership);
router.post('/:membership_id/extension', authenticate, authorize('client'), MembershipController.requestExtension);
router.get('/extension-requests', authenticate, authorize('admin'), MembershipController.getExtensionRequests);
router.patch('/extension-requests/:id/approve', authenticate, authorize('admin'), MembershipController.approveExtensionRequest);
router.patch('/extension-requests/:id/reject', authenticate, authorize('admin'), MembershipController.rejectExtensionRequest);
router.patch('/:id/cancel', authenticate, authorize('client'), MembershipController.cancelMembership);

router.get('/client/:client_id', authenticate, authorize('admin'), MembershipController.getClientMemberships);

export default router;
