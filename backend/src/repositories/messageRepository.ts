import { query } from '../config/database';
import { Message } from '../types';

export class MessageRepository {
  static async getContacts(userId: string, search: string, role?: string): Promise<Array<{
    id: string;
    full_name: string;
    role: string;
    photo_url?: string;
  }>> {
    const result = await query(
      `SELECT id, full_name, role, photo_url
       FROM users
       WHERE id <> $1
         AND is_active = true
         AND full_name ILIKE $2
         AND ($3::text IS NULL OR role = $3)
       ORDER BY full_name
       LIMIT 50`,
      [userId, `%${search}%`, role || null]
    );
    return result.rows;
  }

  static async findById(id: number): Promise<Message | null> {
    const result = await query(
      `SELECT m.*, 
              sender.full_name as sender_name, sender.role as sender_role,
              receiver.full_name as receiver_name, receiver.role as receiver_role
       FROM messages m
       JOIN users sender ON sender.id = m.sender_id
       JOIN users receiver ON receiver.id = m.receiver_id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    sender_id: string;
    receiver_id: string;
    content: string;
  }): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.sender_id, data.receiver_id, data.content]
    );
    return result.rows[0];
  }

  static async update(id: number, data: { content?: string; is_read?: boolean }): Promise<Message | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex}, edited = true`);
      values.push(data.content);
      paramIndex++;
    }

    if (data.is_read !== undefined) {
      fields.push(`is_read = $${paramIndex}`);
      values.push(data.is_read);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);
    const queryText = `UPDATE messages SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async getDialog(userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    const result = await query(
      `SELECT m.*, 
              sender.full_name as sender_name, sender.role as sender_role,
              receiver.full_name as receiver_name, receiver.role as receiver_role
       FROM messages m
       JOIN users sender ON sender.id = m.sender_id
       JOIN users receiver ON receiver.id = m.receiver_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [userId1, userId2, limit]
    );
    return result.rows.reverse();
  }

  static async getUserConversations(userId: string): Promise<any[]> {
    const result = await query(
      `WITH conversation_list AS (
         SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
                MAX(created_at) AS last_message_time
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
         GROUP BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
       )
      SELECT conversations.other_user_id AS id,
        other_user.full_name,
        other_user.role,
        other_user.photo_url,
        conversations.last_message_time,
        last_message.content AS last_message,
        last_message.is_read AS last_message_is_read,
        last_message.sender_id AS last_message_sender_id,
        COALESCE(unread.unread_count, 0)::int AS unread_count
       FROM conversation_list conversations
       JOIN users other_user ON other_user.id = conversations.other_user_id
       LEFT JOIN LATERAL (
         SELECT content, is_read, sender_id FROM messages
         WHERE (sender_id = $1 AND receiver_id = conversations.other_user_id)
            OR (sender_id = conversations.other_user_id AND receiver_id = $1)
         ORDER BY created_at DESC
         LIMIT 1
       ) last_message ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS unread_count
         FROM messages
         WHERE sender_id = conversations.other_user_id
           AND receiver_id = $1
           AND is_read = false
       ) unread ON TRUE
       ORDER BY conversations.last_message_time DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(messageId: number): Promise<Message | null> {
    return this.update(messageId, { is_read: true });
  }

  static async markConversationAsRead(userId1: string, userId2: string): Promise<void> {
    await query(
      `UPDATE messages
       SET is_read = true
       WHERE sender_id = $2 AND receiver_id = $1 AND is_read = false`,
      [userId1, userId2]
    );
  }

  static async delete(id: number, senderId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
      [id, senderId]
    );
    return (result.rowCount || 0) > 0;
  }
}
