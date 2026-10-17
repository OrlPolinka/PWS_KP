import { Request, Response } from 'express';
import { MessageService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class MessageController {
  static async getContacts(req: Request, res: Response) {
    try {
      const contacts = await MessageService.getContacts(
        req.user!.userId,
        typeof req.query.search === 'string' ? req.query.search : '',
        typeof req.query.role === 'string' ? req.query.role : undefined
      );
      res.json(contacts);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const sender_id = req.user!.userId;
      const { receiver_id, content } = req.body;
      const message = await MessageService.sendMessage({
        sender_id,
        receiver_id,
        content,
      });
      
      res.status(201).json(message);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async editMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const senderId = req.user!.userId;
      const { content } = req.body;
      const message = await MessageService.editMessage(parseInt(id), senderId, content);
      
      res.json(message);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      await MessageService.deleteMessage(Number(req.params.id), req.user!.userId);
      res.json({ message: 'Message deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getDialog(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { other_user_id } = req.params;
      const { limit } = req.query;
      const messages = await MessageService.getDialog(
        userId,
        other_user_id,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(messages);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getUserConversations(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const conversations = await MessageService.getUserConversations(userId);
      
      res.json(conversations);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async markMessageAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const message = await MessageService.markMessageAsRead(parseInt(id), userId);
      
      res.json(message);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async markConversationAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { other_user_id } = req.params;
      await MessageService.markConversationAsRead(userId, other_user_id);
      
      res.json({ message: 'Conversation marked as read' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await MessageService.getUnreadCount(userId);
      
      res.json({ unread_count: count });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
