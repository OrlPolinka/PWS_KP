import { Router } from 'express';
import { PaymentController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/checkout', authenticate, authorize('client'), PaymentController.createMembershipCheckout);
router.post('/:id/test/:outcome', authenticate, authorize('client'), PaymentController.completeLocalTestPayment);
router.get('/:id', authenticate, authorize('client'), PaymentController.getStatus);

export default router;
