import { NewsRepository, UserRepository } from '../repositories';
import { News } from '../types';

export class NewsService {
  static async getNewsById(id: string): Promise<News> {
    const news = await NewsRepository.findById(id);
    if (!news) {
      throw new Error('News not found');
    }
    return news;
  }

  static async getAllNews(filters?: { is_published?: boolean }): Promise<News[]> {
    return NewsRepository.findAll(filters);
  }

  static async createNews(data: {
    title: string;
    content: string;
    image_url?: string;
    author_id: string;
  }): Promise<News> {
    const user = await UserRepository.findById(data.author_id);
    if (!user) {
      throw new Error('Author not found');
    }

    if (user.role !== 'admin') {
      throw new Error('Only admins can create news');
    }

    if (!data.title || data.title.trim() === '') {
      throw new Error('Title cannot be empty');
    }

    if (!data.content || data.content.trim() === '') {
      throw new Error('Content cannot be empty');
    }

    const news = await NewsRepository.create(data);
    return news;
  }

  static async updateNews(id: string, data: Partial<News>): Promise<News> {
    const news = await NewsRepository.findById(id);
    if (!news) {
      throw new Error('News not found');
    }

    const updated = await NewsRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update news');
    }

    return updated;
  }

  static async deleteNews(id: string): Promise<void> {
    const news = await NewsRepository.findById(id);
    if (!news) {
      throw new Error('News not found');
    }

    const deleted = await NewsRepository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete news');
    }
  }

  static async setNewsPublished(id: string, isPublished: boolean): Promise<News> {
    const news = await NewsRepository.findById(id);
    if (!news) {
      throw new Error('News not found');
    }

    const updated = await NewsRepository.setPublished(id, isPublished);
    if (!updated) {
      throw new Error('Failed to update news publication status');
    }

    return updated;
  }
}
