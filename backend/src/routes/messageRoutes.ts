import { Router } from 'express';
import { MessageController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/contacts', authenticate, MessageController.getContacts);
router.get('/conversations', authenticate, MessageController.getUserConversations);
router.get('/unread-count', authenticate, MessageController.getUnreadCount);
router.post('/', authenticate, MessageController.sendMessage);
router.put('/:id', authenticate, MessageController.editMessage);
router.delete('/:id', authenticate, MessageController.deleteMessage);
router.get('/dialog/:other_user_id', authenticate, MessageController.getDialog);
router.patch('/:id/read', authenticate, MessageController.markMessageAsRead);
router.patch('/dialog/:other_user_id/read', authenticate, MessageController.markConversationAsRead);

export default router;
