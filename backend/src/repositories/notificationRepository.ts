import { query } from '../config/database';
import { Notification } from '../types';

export class NotificationRepository {
  static async findById(id: string): Promise<Notification | null> {
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<Notification> {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.type, data.title, data.message, JSON.stringify(data.data || {})]
    );
    return result.rows[0];
  }

  static async findByUserId(userId: string, filters?: { is_read?: boolean }): Promise<Notification[]> {
    let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.is_read !== undefined) {
      queryText += ` AND is_read = $${paramIndex}`;
      params.push(filters.is_read);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async markAsRead(id: string): Promise<Notification | null> {
    const result = await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM notifications WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}
