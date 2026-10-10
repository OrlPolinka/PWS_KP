import { getTransactionClient, query } from '../config/database';
import { TrainerProfile } from '../types';

export class TrainerRepository {
  static async findById(id: string): Promise<TrainerProfile | null> {
    const result = await query(
      `SELECT t.*, u.full_name, u.email, u.photo_url AS user_photo_url, u.is_active
       FROM trainers t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<TrainerProfile | null> {
    const result = await query(
      `SELECT t.*, u.full_name, u.email, u.photo_url AS user_photo_url, u.is_active
       FROM trainers t JOIN users u ON u.id = t.user_id WHERE t.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    user_id: string;
    specialization?: string;
    bio?: string;
    experience_years?: number;
    education?: string;
    achievements?: string;
    photo_url?: string;
    video_url?: string;
    gallery?: any[];
    certificates?: any[];
    social_links?: any[];
    custom_page_title?: string;
    custom_page_content?: string;
  }): Promise<TrainerProfile> {
    const result = await query(
      `INSERT INTO trainers (
        user_id, specialization, bio, experience_years, education, achievements,
        photo_url, video_url, gallery, certificates, social_links,
        custom_page_title, custom_page_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.user_id, data.specialization, data.bio, data.experience_years,
        data.education, data.achievements, data.photo_url, data.video_url,
        JSON.stringify(data.gallery || []), JSON.stringify(data.certificates || []),
        JSON.stringify(data.social_links || []), data.custom_page_title, data.custom_page_content
      ]
    );
    return result.rows[0];
  }

  static async update(id: string, data: Partial<TrainerProfile>): Promise<TrainerProfile | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'hired_at') {
        if (['gallery', 'certificates', 'social_links'].includes(key)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE trainers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM attendance
         WHERE trainer_id = $1
            OR booking_id IN (
              SELECT b.id FROM bookings b
              JOIN schedule s ON s.id = b.schedule_id
              WHERE s.trainer_id = $1
            )`,
        [id]
      );
      await client.query('DELETE FROM schedule WHERE trainer_id = $1', [id]);
      const result = await client.query(
        'DELETE FROM users WHERE id = (SELECT user_id FROM trainers WHERE id = $1)',
        [id]
      );
      if (!result.rowCount) throw new Error('Trainer not found');
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findAll(filters?: { is_published?: boolean }): Promise<TrainerProfile[]> {
    let queryText = `
            SELECT t.*, u.email, u.full_name, u.phone,
              COALESCE(t.photo_url, u.photo_url) AS photo_url, u.is_active
      FROM trainers t
      JOIN users u ON u.id = t.user_id
      WHERE u.is_active = TRUE
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.is_published !== undefined) {
      queryText += ` AND t.is_published = $${paramIndex}`;
      params.push(filters.is_published);
      paramIndex++;
    }

    queryText += ' ORDER BY t.hired_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async setPublished(id: string, isPublished: boolean): Promise<TrainerProfile | null> {
    const result = await query(
      'UPDATE trainers SET is_published = $1 WHERE id = $2 RETURNING *',
      [isPublished, id]
    );
    return result.rows[0] || null;
  }

}
