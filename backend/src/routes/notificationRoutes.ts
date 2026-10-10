import { Router } from 'express';
import { NotificationController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, NotificationController.getUserNotifications);
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);
router.patch('/read-all', authenticate, NotificationController.markAllAsRead);
router.get('/:id', authenticate, NotificationController.getNotificationById);
router.patch('/:id/read', authenticate, NotificationController.markAsRead);
router.delete('/:id', authenticate, NotificationController.deleteNotification);

export default router;
