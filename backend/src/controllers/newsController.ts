import { Request, Response } from 'express';
import { NewsService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class NewsController {
  static async getAllNews(req: Request, res: Response) {
    try {
      const { is_published } = req.query;
      const news = await NewsService.getAllNews({
        is_published: req.user?.role === 'admin'
          ? is_published === 'true' ? true : is_published === 'false' ? false : undefined
          : true,
      });
      
      res.json(news);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getNewsById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const news = await NewsService.getNewsById(id);
      if (!news.is_published && req.user!.role !== 'admin') {
        throw new AppError(404, 'News not found');
      }
      
      res.json(news);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async createNews(req: Request, res: Response) {
    try {
      const author_id = req.user!.userId;
      const news = await NewsService.createNews({
        ...req.body,
        author_id,
      });
      
      res.status(201).json(news);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async updateNews(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const news = await NewsService.updateNews(id, req.body);
      
      res.json(news);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteNews(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await NewsService.deleteNews(id);
      
      res.json({ message: 'News deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async setNewsPublished(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { is_published } = req.body;
      const news = await NewsService.setNewsPublished(id, is_published);
      
      res.json(news);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
