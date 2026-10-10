import { query } from '../config/database';
import { MembershipType } from '../types';

export class MembershipTypeRepository {
  static async findById(id: number): Promise<MembershipType | null> {
    const result = await query('SELECT * FROM membership_types WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data: {
    name: string;
    description?: string;
    price: number;
    visit_count?: number | null;
    duration_days: number;
    dance_style_id?: number | null;
  }): Promise<MembershipType> {
    const result = await query(
      `INSERT INTO membership_types (name, description, price, visit_count, duration_days, dance_style_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.description, data.price, data.visit_count, data.duration_days, data.dance_style_id]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<MembershipType>): Promise<MembershipType | null> {
    const allowedFields = ['name', 'description', 'price', 'visit_count', 'duration_days', 'dance_style_id', 'is_active'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE membership_types SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM membership_types WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findAll(filters?: { is_active?: boolean }): Promise<MembershipType[]> {
    let queryText = 'SELECT * FROM membership_types WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.is_active !== undefined) {
      queryText += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    queryText += ' ORDER BY id';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async setActive(id: number, isActive: boolean): Promise<MembershipType | null> {
    const result = await query(
      'UPDATE membership_types SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return result.rows[0] || null;
  }
}
