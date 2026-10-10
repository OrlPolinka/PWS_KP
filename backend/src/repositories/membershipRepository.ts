import { query, getTransactionClient } from '../config/database';
import { Membership } from '../types';

export class MembershipRepository {
  static async findById(id: string): Promise<Membership | null> {
    const result = await query(
            `SELECT m.*, mt.name as membership_type_name, mt.price as original_price,
              mt.dance_style_id AS membership_dance_style_id,
              u.full_name as client_name, u.email as client_email
       FROM memberships m
       JOIN membership_types mt ON mt.id = m.membership_type_id
       JOIN users u ON u.id = m.client_id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    client_id: string;
    membership_type_id: number;
    payment_id?: string;
    start_date: Date;
    end_date: Date;
    remaining_visits?: number | null;
    price_paid: number;
  }): Promise<Membership> {
    const result = await query(
      `INSERT INTO memberships (client_id, membership_type_id, payment_id, start_date, end_date, remaining_visits, price_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.client_id, data.membership_type_id, data.payment_id,
        data.start_date, data.end_date, data.remaining_visits, data.price_paid
      ]
    );
    return result.rows[0];
  }

  static async update(id: string, data: Partial<Membership>): Promise<Membership | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'purchase_date') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE memberships SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM memberships WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findByClientId(clientId: string, filters?: { status?: string }): Promise<Membership[]> {
    let queryText = `
            SELECT m.*, mt.name as membership_type_name, mt.price as original_price,
              mt.dance_style_id AS membership_dance_style_id
      FROM memberships m
      JOIN membership_types mt ON mt.id = m.membership_type_id
      WHERE m.client_id = $1
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (filters?.status) {
      queryText += ` AND m.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    queryText += ' ORDER BY m.purchase_date DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async findActiveByClientId(clientId: string): Promise<Membership[]> {
    return this.findByClientId(clientId, { status: 'active' });
  }

  static async findForBooking(id: string, clientId: string, classDate: string, danceStyleId: number): Promise<any | null> {
    const result = await query(
      `SELECT m.*, mt.dance_style_id AS membership_dance_style_id,
              (m.start_date <= $3::date AND m.end_date >= $3::date) AS date_valid,
              (m.remaining_visits IS NULL OR m.remaining_visits > 0) AS visits_valid,
              (mt.dance_style_id IS NULL OR mt.dance_style_id = $4) AS style_valid
       FROM memberships m
       JOIN membership_types mt ON mt.id = m.membership_type_id
       WHERE m.id = $1 AND m.client_id = $2`,
      [id, clientId, classDate, danceStyleId]
    );
    return result.rows[0] || null;
  }

  static async decrementVisits(id: string): Promise<Membership | null> {
    const result = await query(
      `UPDATE memberships
       SET remaining_visits = GREATEST(remaining_visits - 1, 0)
       WHERE id = $1 AND remaining_visits IS NOT NULL
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async extendMembership(id: string, days: number): Promise<Membership | null> {
    const result = await query(
      `UPDATE memberships
       SET end_date = end_date + INTERVAL '1 day' * $1,
           status = 'active'
       WHERE id = $2
       RETURNING *`,
      [days, id]
    );
    return result.rows[0] || null;
  }

  static async requestExtension(id: string, requestedDays: number, reason?: string): Promise<any> {
    const membership = await this.findById(id);
    if (!membership) return null;

    const result = await query(
      `INSERT INTO membership_extension_requests (membership_id, client_id, requested_days, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, membership.client_id, requestedDays, reason]
    );
    return result.rows[0];
  }

  static async findExtensionRequests(filters?: { status?: string; client_id?: string }): Promise<any[]> {
    let queryText = `
      SELECT mer.*, m.client_id, u.full_name as client_name, mt.name as membership_type_name
      FROM membership_extension_requests mer
      JOIN memberships m ON m.id = mer.membership_id
      JOIN users u ON u.id = m.client_id
      JOIN membership_types mt ON mt.id = m.membership_type_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      queryText += ` AND mer.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.client_id) {
      queryText += ` AND mer.client_id = $${paramIndex}`;
      params.push(filters.client_id);
      paramIndex++;
    }

    queryText += ' ORDER BY mer.created_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async updateExtensionRequest(requestId: string, status: string, reviewedBy: string, adminComment?: string): Promise<any> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE membership_extension_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_comment = $3
         WHERE id = $4
         RETURNING *`,
        [status, reviewedBy, adminComment, requestId]
      );

      if (status === 'approved') {
        const request = result.rows[0];
        await client.query(
          `UPDATE memberships
           SET end_date = end_date + INTERVAL '1 day' * $1, status = 'active'
           WHERE id = $2`,
          [request.requested_days, request.membership_id]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
