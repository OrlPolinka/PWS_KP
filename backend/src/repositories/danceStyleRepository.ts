import { getTransactionClient, query } from '../config/database';

export interface DanceStyleRecord {
  id: number;
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_active: boolean;
}

export class DanceStyleRepository {
  static async findById(id: number): Promise<DanceStyleRecord | null> {
    const result = await query('SELECT id, name, description, difficulty, is_active FROM dance_styles WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<DanceStyleRecord[]> {
    const result = await query(
      `SELECT id, name, description, difficulty, is_active
       FROM dance_styles WHERE is_active = TRUE
       ORDER BY name`
    );
    return result.rows;
  }

  static async create(data: Pick<DanceStyleRecord, 'name' | 'description' | 'difficulty'>): Promise<DanceStyleRecord> {
    const result = await query(
      `INSERT INTO dance_styles (name, description, difficulty)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, difficulty, is_active`,
      [data.name, data.description, data.difficulty]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<Pick<DanceStyleRecord, 'name' | 'description' | 'difficulty'>>): Promise<DanceStyleRecord | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['name', 'description', 'difficulty'] as const) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }
    if (!fields.length) return this.findById(id);
    values.push(id);
    const result = await query(
      `UPDATE dance_styles SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, description, difficulty, is_active`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM attendance WHERE booking_id IN (
           SELECT b.id FROM bookings b
           JOIN schedule s ON s.id = b.schedule_id
           WHERE s.dance_style_id = $1
         )`,
        [id]
      );
      await client.query('DELETE FROM schedule WHERE dance_style_id = $1', [id]);
      const result = await client.query('DELETE FROM dance_styles WHERE id = $1', [id]);
      if (!result.rowCount) throw new Error('Стиль танца не найден');
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}