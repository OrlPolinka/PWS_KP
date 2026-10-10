import { Request, Response } from 'express';
import { NotificationService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { is_read } = req.query;
      const notifications = await NotificationService.getUserNotifications(userId, {
        is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
      });
      
      res.json(notifications);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getNotificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const notification = await NotificationService.getNotificationById(id);
      
      res.json(notification);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const notification = await NotificationService.markAsRead(id, userId);
      
      res.json(notification);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await NotificationService.markAllAsRead(userId);
      
      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await NotificationService.getUnreadCount(userId);
      
      res.json({ unread_count: count });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await NotificationService.deleteNotification(id, userId);
      
      res.json({ message: 'Notification deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
