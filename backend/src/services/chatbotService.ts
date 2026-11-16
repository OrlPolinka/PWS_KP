import { ChatbotRepository } from '../repositories/chatbotRepository';
import { ChatbotFaq } from '../repositories/chatbotRepository';

export class ChatbotService {
  static async getFaqs(search: string, includeInactive: boolean): Promise<ChatbotFaq[]> {
    return ChatbotRepository.getFaqs(search.trim().slice(0, 100), includeInactive);
  }

  static async createFaq(data: {
    question: unknown;
    answer: unknown;
    keywords?: unknown;
    createdBy: string;
  }): Promise<ChatbotFaq> {
    const normalized = this.validateFaq(data.question, data.answer, data.keywords, true);
    try {
      return await ChatbotRepository.createFaq({ ...normalized, createdBy: data.createdBy });
    } catch (error) {
      if (this.isDuplicateQuestion(error)) throw new Error('Вопрос с такой формулировкой уже существует');
      throw error;
    }
  }

  static async updateFaq(id: number, data: {
    question: unknown;
    answer: unknown;
    keywords?: unknown;
    is_active: unknown;
  }): Promise<ChatbotFaq> {
    this.validateId(id);
    if (typeof data.is_active !== 'boolean') {
      throw new Error('Укажите, должен ли вопрос отображаться клиентам');
    }

    let updated: ChatbotFaq | null;
    try {
      updated = await ChatbotRepository.updateFaq(id, {
        ...this.validateFaq(data.question, data.answer, data.keywords, false),
        isActive: data.is_active,
      });
    } catch (error) {
      if (this.isDuplicateQuestion(error)) throw new Error('Вопрос с такой формулировкой уже существует');
      throw error;
    }
    if (!updated) throw new Error('Вопрос не найден');
    return updated;
  }

  static async deleteFaq(id: number): Promise<void> {
    this.validateId(id);
    if (!await ChatbotRepository.deleteFaq(id)) throw new Error('Вопрос не найден');
  }

  private static validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Некорректный идентификатор вопроса');
  }

  private static isDuplicateQuestion(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }

  private static validateFaq(
    question: unknown,
    answer: unknown,
    keywords: unknown,
    includeActive: boolean
  ): { question: string; answer: string; keywords: string; isActive?: boolean } {
    if (typeof question !== 'string' || question.trim().length < 3 || question.trim().length > 250) {
      throw new Error('Вопрос должен содержать от 3 до 250 символов');
    }
    if (typeof answer !== 'string' || !answer.trim() || answer.trim().length > 5000) {
      throw new Error('Ответ должен содержать от 1 до 5000 символов');
    }
    if (keywords !== undefined && typeof keywords !== 'string') {
      throw new Error('Ключевые слова должны быть текстом');
    }
    if (typeof keywords === 'string' && keywords.trim().length > 500) {
      throw new Error('Ключевые слова не должны превышать 500 символов');
    }

    return {
      question: question.trim(),
      answer: answer.trim(),
      keywords: typeof keywords === 'string' ? keywords.trim() : '',
      ...(includeActive ? { isActive: true } : {}),
    };
  }
}
