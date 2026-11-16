import { Router } from 'express';
import { ChatbotController } from '../controllers/chatbotController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/faqs', authenticate, ChatbotController.getFaqs);
router.post('/faqs', authenticate, authorize('admin'), ChatbotController.createFaq);
router.put('/faqs/:id', authenticate, authorize('admin'), ChatbotController.updateFaq);
router.delete('/faqs/:id', authenticate, authorize('admin'), ChatbotController.deleteFaq);

export default router;
