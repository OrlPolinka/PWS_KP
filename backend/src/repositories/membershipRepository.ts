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
      SELECT m.*, mt.name AS membership_type_name, mt.price AS original_price,
             mt.visit_count AS membership_visit_count,
             mt.duration_days AS membership_duration_days,
             extension.status AS extension_request_status,
             CASE
               WHEN m.end_date < CURRENT_DATE AND extension.status = 'pending' THEN 'pending_extension'
               WHEN m.end_date < CURRENT_DATE THEN 'expired'
               ELSE m.status
             END AS display_status
      FROM memberships m
      JOIN membership_types mt ON mt.id = m.membership_type_id
      LEFT JOIN LATERAL (
        SELECT mer.status
        FROM membership_extension_requests mer
        WHERE mer.membership_id = m.id
        ORDER BY mer.created_at DESC
        LIMIT 1
      ) extension ON TRUE
      WHERE m.client_id = $1
        AND m.status <> 'cancelled'
        AND (
          m.end_date >= CURRENT_DATE
          OR (
            m.end_date >= CURRENT_DATE - INTERVAL '10 days'
            AND COALESCE(extension.status, '') <> 'rejected'
          )
        )
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (filters?.status) {
      queryText += ` AND (
        CASE
          WHEN m.end_date < CURRENT_DATE AND extension.status = 'pending' THEN 'pending_extension'
          WHEN m.end_date < CURRENT_DATE THEN 'expired'
          ELSE m.status
        END
      ) = $${paramIndex}`;
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

  static async requestExtension(
    membershipId: string,
    clientId: string,
    quantity: number,
    unit: 'days' | 'visits',
    reason: string
  ): Promise<any> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      const membershipResult = await client.query(
        `SELECT m.id, m.client_id, m.end_date, m.status, mt.visit_count,
                (m.end_date < CURRENT_DATE
                 AND m.end_date >= CURRENT_DATE - INTERVAL '10 days'
                 AND m.status <> 'cancelled') AS extension_open
         FROM memberships m
         JOIN membership_types mt ON mt.id = m.membership_type_id
         WHERE m.id = $1 AND m.client_id = $2
         FOR UPDATE OF m`,
        [membershipId, clientId]
      );
      const membership = membershipResult.rows[0];
      if (!membership) throw new Error('Абонемент не найден.');
      if (!membership.extension_open) {
        throw new Error('Запрос можно отправить только в течение 10 дней после окончания абонемента.');
      }

      const expectedUnit = membership.visit_count === null ? 'days' : 'visits';
      if (unit !== expectedUnit) {
        throw new Error(unit === 'days'
          ? 'Для этого абонемента нужно указать количество занятий.'
          : 'Для этого абонемента нужно указать количество дней.');
      }

      const pendingResult = await client.query(
        `SELECT id FROM membership_extension_requests
         WHERE membership_id = $1 AND status = 'pending'
         LIMIT 1`,
        [membershipId]
      );
      if (pendingResult.rowCount) throw new Error('Запрос на продление уже ожидает рассмотрения.');
      const rejectedResult = await client.query(
        `SELECT id FROM membership_extension_requests
         WHERE membership_id = $1 AND status = 'rejected'
         LIMIT 1`,
        [membershipId]
      );
      if (rejectedResult.rowCount) {
        throw new Error('После отклонения запроса продлить этот абонемент нельзя.');
      }

      const result = await client.query(
        `INSERT INTO membership_extension_requests (
           membership_id, client_id, requested_days, requested_visits, requested_unit, reason
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          membershipId,
          clientId,
          unit === 'days' ? quantity : null,
          unit === 'visits' ? quantity : null,
          unit,
          reason.trim(),
        ]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findExtensionRequests(filters?: { status?: string; client_id?: string }): Promise<any[]> {
    let queryText = `
      SELECT mer.*, m.client_id, m.end_date, m.remaining_visits,
             u.full_name AS client_name, mt.name AS membership_type_name,
             mt.duration_days AS membership_duration_days
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

    queryText += ` AND (
      mer.status <> 'pending'
      OR (
        m.end_date < CURRENT_DATE
        AND m.end_date >= CURRENT_DATE - INTERVAL '10 days'
        AND m.status <> 'cancelled'
      )
    )`;
    queryText += ' ORDER BY mer.created_at DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async updateExtensionRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    adminComment?: string
  ): Promise<any> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `SELECT mer.*, m.end_date, m.status AS membership_status, mt.duration_days
         FROM membership_extension_requests mer
         JOIN memberships m ON m.id = mer.membership_id
         JOIN membership_types mt ON mt.id = m.membership_type_id
         WHERE mer.id = $1
         FOR UPDATE OF mer, m`,
        [requestId]
      );
      const request = requestResult.rows[0];
      if (!request) throw new Error('Запрос на продление не найден.');
      if (request.status !== 'pending') throw new Error('Запрос уже рассмотрен.');

      if (status === 'approved') {
        const eligibleResult = await client.query(
          `SELECT (end_date < CURRENT_DATE
                   AND end_date >= CURRENT_DATE - INTERVAL '10 days'
                   AND status <> 'cancelled') AS eligible
           FROM memberships WHERE id = $1`,
          [request.membership_id]
        );
        if (!eligibleResult.rows[0]?.eligible) {
          throw new Error('Срок для продления этого абонемента истёк.');
        }

        if (request.requested_unit === 'visits') {
          await client.query(
            `UPDATE memberships
             SET remaining_visits = COALESCE(remaining_visits, 0) + $1,
                 end_date = GREATEST(end_date, CURRENT_DATE) + $2::integer,
                 status = 'active'
             WHERE id = $3`,
            [request.requested_visits, request.duration_days, request.membership_id]
          );
        } else {
          await client.query(
            `UPDATE memberships
             SET end_date = GREATEST(end_date, CURRENT_DATE) + $1::integer,
                 status = 'active'
             WHERE id = $2`,
            [request.requested_days, request.membership_id]
          );
        }
      }

      const result = await client.query(
        `UPDATE membership_extension_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_comment = $3
         WHERE id = $4
         RETURNING *`,
        [status, reviewedBy, adminComment || null, requestId]
      );
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
