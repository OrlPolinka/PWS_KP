import { Request, Response } from 'express';
import { ChatbotService } from '../services/chatbotService';
import { AppError } from '../middleware/errorHandler';

export class ChatbotController {
  static async getFaqs(req: Request, res: Response) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const faqs = await ChatbotService.getFaqs(search, req.user?.role === 'admin');
      res.json(faqs);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async createFaq(req: Request, res: Response) {
    try {
      const faq = await ChatbotService.createFaq({ ...req.body, createdBy: req.user!.userId });
      res.status(201).json(faq);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async updateFaq(req: Request, res: Response) {
    try {
      const faq = await ChatbotService.updateFaq(Number(req.params.id), req.body);
      res.json(faq);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteFaq(req: Request, res: Response) {
    try {
      await ChatbotService.deleteFaq(Number(req.params.id));
      res.json({ message: 'Вопрос удалён' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
