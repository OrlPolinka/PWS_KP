import { Router } from 'express';
import { MessageController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, MessageController.sendMessage);
router.put('/:id', authenticate, MessageController.editMessage);
router.get('/dialog/:other_user_id', authenticate, MessageController.getDialog);
router.get('/conversations', authenticate, MessageController.getUserConversations);
router.patch('/:id/read', authenticate, MessageController.markMessageAsRead);
router.patch('/dialog/:other_user_id/read', authenticate, MessageController.markConversationAsRead);
router.get('/unread-count', authenticate, MessageController.getUnreadCount);

export default router;
