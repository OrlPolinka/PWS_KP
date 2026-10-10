import { query } from '../config/database';
import { News } from '../types';

export class NewsRepository {
  static async findById(id: string): Promise<News | null> {
    const result = await query(
      `SELECT n.*, u.full_name as author_name
       FROM news n
       JOIN users u ON u.id = n.author_id
       WHERE n.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    title: string;
    content: string;
    image_url?: string;
    author_id: string;
  }): Promise<News> {
    const result = await query(
      `INSERT INTO news (title, content, image_url, author_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.title, data.content, data.image_url, data.author_id]
    );
    return result.rows[0];
  }

  static async update(id: string, data: Partial<News>): Promise<News | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'author_id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE news SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM news WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findAll(filters?: { is_published?: boolean }): Promise<News[]> {
    let queryText = `
      SELECT n.*, u.full_name as author_name
      FROM news n
      JOIN users u ON u.id = n.author_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.is_published !== undefined) {
      queryText += ` AND n.is_published = $${paramIndex}`;
      params.push(filters.is_published);
      paramIndex++;
    }

    queryText += ' ORDER BY n.created_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async setPublished(id: string, isPublished: boolean): Promise<News | null> {
    const result = await query(
      'UPDATE news SET is_published = $1 WHERE id = $2 RETURNING *',
      [isPublished, id]
    );
    return result.rows[0] || null;
  }
}
