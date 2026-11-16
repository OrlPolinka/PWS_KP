import { query } from '../config/database';

export interface ChatbotFaq {
  id: number;
  question: string;
  answer: string;
  keywords: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export class ChatbotRepository {
  static async getFaqs(search: string, includeInactive: boolean): Promise<ChatbotFaq[]> {
    const result = await query(
      `SELECT id, question, answer, keywords, is_active, sort_order, created_at, updated_at
       FROM chatbot_faqs
       WHERE ($2::boolean OR is_active = true)
         AND (
           $1 = ''
           OR question ILIKE '%' || $1 || '%'
           OR answer ILIKE '%' || $1 || '%'
           OR EXISTS (
             SELECT 1
             FROM regexp_split_to_table(lower($1), '[[:space:]]+') AS terms(term)
             WHERE length(term) >= 2
               AND (
                 lower(question) LIKE '%' || term || '%'
                 OR lower(keywords) LIKE '%' || term || '%'
               )
           )
         )
       ORDER BY
         CASE WHEN lower(question) = lower($1) AND $1 <> '' THEN 0
              WHEN lower(question) LIKE lower($1) || '%' AND $1 <> '' THEN 1
              ELSE 2 END,
         sort_order, question
       LIMIT 50`,
      [search, includeInactive]
    );
    return result.rows;
  }

  static async createFaq(data: {
    question: string;
    answer: string;
    keywords: string;
    createdBy: string;
  }): Promise<ChatbotFaq> {
    const result = await query(
      `INSERT INTO chatbot_faqs (question, answer, keywords, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, question, answer, keywords, is_active, sort_order, created_at, updated_at`,
      [data.question, data.answer, data.keywords, data.createdBy]
    );
    return result.rows[0];
  }

  static async updateFaq(id: number, data: {
    question: string;
    answer: string;
    keywords: string;
    isActive: boolean;
  }): Promise<ChatbotFaq | null> {
    const result = await query(
      `UPDATE chatbot_faqs
       SET question = $2, answer = $3, keywords = $4, is_active = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING id, question, answer, keywords, is_active, sort_order, created_at, updated_at`,
      [id, data.question, data.answer, data.keywords, data.isActive]
    );
    return result.rows[0] || null;
  }

  static async deleteFaq(id: number): Promise<boolean> {
    const result = await query('DELETE FROM chatbot_faqs WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}
