import { NotificationRepository, UserRepository } from '../repositories';
import { Notification } from '../types';

export class NotificationService {
  static async getNotificationById(id: string): Promise<Notification> {
    const notification = await NotificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  static async getUserNotifications(userId: string, filters?: { is_read?: boolean }): Promise<Notification[]> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return NotificationRepository.findByUserId(userId, filters);
  }

  static async createNotification(data: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<Notification> {
    const user = await UserRepository.findById(data.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    if (!data.title || data.title.trim() === '') {
      throw new Error('Title cannot be empty');
    }

    if (!data.message || data.message.trim() === '') {
      throw new Error('Message cannot be empty');
    }

    const notification = await NotificationRepository.create(data);
    return notification;
  }

  static async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await NotificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new Error('User can only mark their own notifications as read');
    }

    const updated = await NotificationRepository.markAsRead(id);
    if (!updated) {
      throw new Error('Failed to mark notification as read');
    }

    return updated;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await NotificationRepository.markAllAsRead(userId);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return NotificationRepository.getUnreadCount(userId);
  }

  static async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await NotificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new Error('User can only delete their own notifications');
    }

    const deleted = await NotificationRepository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete notification');
    }
  }
}
