import { query, getTransactionClient } from '../config/database';
import { User, UserRole } from '../types';
import bcrypt from 'bcryptjs';

export class UserRepository {
  static async findById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findByClientCode(clientCode: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE client_code = $1', [clientCode]);
    return result.rows[0] || null;
  }

  static async findByQrToken(qrToken: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE qr_token = $1', [qrToken]);
    return result.rows[0] || null;
  }

  static async create(data: {
    email: string;
    password_hash: string;
    role: UserRole;
    full_name: string;
    phone?: string;
    photo_url?: string;
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.email, data.password_hash, data.role, data.full_name, data.phone, data.photo_url]
    );
    return result.rows[0];
  }

  static async createGoogleUser(data: {
    email: string;
    role: UserRole;
    full_name: string;
    photo_url?: string;
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, role, full_name, photo_url)
       VALUES ($1, '', $2, $3, $4)
       RETURNING *`,
      [data.email, data.role, data.full_name, data.photo_url]
    );
    return result.rows[0];
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findAll(filters?: { role?: UserRole; is_active?: boolean }): Promise<User[]> {
    let queryText = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.role) {
      queryText += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.is_active !== undefined) {
      queryText += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async updatePassword(id: string, newPasswordHash: string): Promise<User | null> {
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *',
      [newPasswordHash, id]
    );
    return result.rows[0] || null;
  }

  static async deactivate(id: string): Promise<User | null> {
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  static async activate(id: string): Promise<User | null> {
    const result = await query(
      'UPDATE users SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}
