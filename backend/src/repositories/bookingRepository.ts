import { query, getTransactionClient } from '../config/database';
import { Booking } from '../types';

export class BookingRepository {
  static async findById(id: string): Promise<Booking | null> {
    const result = await query(
      `SELECT b.*, b.class_date, s.day_of_week, s.start_time, s.end_time, ds.name as dance_style_name,
              h.name as hall_name, u.full_name as client_name
       FROM bookings b
       JOIN schedule s ON s.id = b.schedule_id
       JOIN dance_styles ds ON ds.id = s.dance_style_id
       JOIN halls h ON h.id = s.hall_id
       JOIN users u ON u.id = b.client_id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    schedule_id: string;
    client_id: string;
    membership_id: string;
    class_date: string;
  }): Promise<Booking> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [data.client_id]);

      const scheduleResult = await client.query(
        `SELECT id, dance_style_id, day_of_week, start_time, end_time, max_capacity, status
         FROM schedule WHERE id = $1 FOR UPDATE`,
        [data.schedule_id]
      );
      const schedule = scheduleResult.rows[0];
      if (!schedule) throw new Error('Schedule not found');
      if (schedule.status !== 'scheduled') throw new Error('Cannot book a cancelled or completed class');
      const requestedDate = new Date(`${data.class_date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.class_date) ||
          Number.isNaN(requestedDate.getTime()) ||
          requestedDate.toISOString().slice(0, 10) !== data.class_date) {
        throw new Error('A valid class date is required');
      }
      if ((requestedDate.getUTCDay() || 7) !== schedule.day_of_week) {
        throw new Error('Selected date does not match the weekly class day');
      }
      if (new Date(`${data.class_date}T${schedule.start_time}`).getTime() <= Date.now()) {
        throw new Error('Cannot book a class in the past');
      }
      const overlappingBooking = await client.query(
        `SELECT 1 FROM bookings
         WHERE client_id = $1 AND class_date = $2::date AND status <> 'cancelled'
           AND class_start < ($2::date + $4::time)
           AND class_end > ($2::date + $3::time)
         LIMIT 1`,
        [data.client_id, data.class_date, schedule.start_time, schedule.end_time]
      );
      if (overlappingBooking.rowCount) {
        throw new Error('You already have a booking that overlaps this class');
      }

      const membershipResult = await client.query(
        `SELECT m.id, m.client_id, m.status, m.start_date, m.end_date, m.remaining_visits,
                (m.start_date <= $3::date AND m.end_date >= $3::date) AS date_valid,
                (mt.dance_style_id IS NULL OR mt.dance_style_id = $4) AS style_valid
         FROM memberships m
         JOIN membership_types mt ON mt.id = m.membership_type_id
         WHERE m.id = $1 AND m.client_id = $2
         FOR UPDATE OF m`,
        [data.membership_id, data.client_id, data.class_date, schedule.dance_style_id]
      );
      const membership = membershipResult.rows[0];
      if (!membership) throw new Error('Membership not found');
      if (membership.status !== 'active') throw new Error('Membership is not active');
      if (!membership.date_valid) throw new Error('Membership is not valid on the selected class date');
      if (!membership.style_valid) throw new Error('Membership does not cover this dance style');

      const [reservedVisitsResult, capacityResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS count FROM bookings
           WHERE membership_id = $1 AND status = 'booked'`,
          [data.membership_id]
        ),
        client.query(
          `SELECT COUNT(*)::int AS count FROM bookings
           WHERE schedule_id = $1 AND class_date = $2::date AND status <> 'cancelled'`,
          [data.schedule_id, data.class_date]
        ),
      ]);

      const reservedVisits = reservedVisitsResult.rows[0].count as number;
      if (membership.remaining_visits !== null && reservedVisits >= Number(membership.remaining_visits)) {
        throw new Error('No remaining visits on this membership');
      }
      if (Number(capacityResult.rows[0].count) >= Number(schedule.max_capacity)) {
        throw new Error('Class is fully booked');
      }

      const result = await client.query(
        `INSERT INTO bookings (schedule_id, client_id, membership_id, class_date, class_start, class_end)
         VALUES ($1, $2, $3, $4::date, $4::date + $5::time, $4::date + $6::time)
         RETURNING *`,
        [data.schedule_id, data.client_id, data.membership_id, data.class_date, schedule.start_time, schedule.end_time]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      const databaseError = error as { code?: string; constraint?: string };
      if (databaseError.code === '23P01') {
        throw new Error('You already have a booking that overlaps this class');
      }
      if (databaseError.code === '23505' && databaseError.constraint === 'uq_booking_client_schedule_active') {
        throw new Error('Already booked for this class');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async hasOverlappingBooking(clientId: string, classDate: string, startTime: string, endTime: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM bookings
       WHERE client_id = $1 AND class_date = $2::date AND status <> 'cancelled'
         AND class_start < ($2::date + $4::time)
         AND class_end > ($2::date + $3::time)
       LIMIT 1`,
      [clientId, classDate, startTime, endTime]
    );
    return result.rowCount !== 0;
  }

  static async update(id: string, data: Partial<Booking>): Promise<Booking | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'booked_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM bookings WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findByClientId(clientId: string, filters?: { status?: string }): Promise<Booking[]> {
    let queryText = `
      SELECT b.*, b.class_date, s.day_of_week, s.start_time, s.end_time, ds.name as dance_style_name,
             h.name as hall_name, t.user_id as trainer_user_id, tu.full_name as trainer_name
      FROM bookings b
      JOIN schedule s ON s.id = b.schedule_id
      JOIN dance_styles ds ON ds.id = s.dance_style_id
      JOIN halls h ON h.id = s.hall_id
      JOIN trainers t ON t.id = s.trainer_id
      JOIN users tu ON tu.id = t.user_id
      WHERE b.client_id = $1
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (filters?.status) {
      queryText += ` AND b.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    queryText += ' ORDER BY b.class_date DESC, s.start_time DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async findByScheduleId(scheduleId: string): Promise<Booking[]> {
    const result = await query(
      `SELECT b.*, u.full_name as client_name, u.phone as client_phone,
              u.client_code, u.qr_token as client_qr_token
       FROM bookings b
       JOIN users u ON u.id = b.client_id
       WHERE b.schedule_id = $1 AND b.status = 'booked'
       ORDER BY b.booked_at`,
      [scheduleId]
    );
    return result.rows;
  }

  static async cancel(id: string, cancelledBy: string): Promise<Booking | null> {
    const result = await query(
      `UPDATE bookings
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1
       WHERE id = $2
       RETURNING *`,
      [cancelledBy, id]
    );
    return result.rows[0] || null;
  }

  static async checkIn(id: string, checkedInBy: string): Promise<Booking | null> {
    const result = await query(
      `UPDATE bookings
       SET checked_in = true, checked_in_at = NOW(), checked_in_by = $1
       WHERE id = $2
       RETURNING *`,
      [checkedInBy, id]
    );
    return result.rows[0] || null;
  }

  static async findByClientAndSchedule(clientId: string, scheduleId: string, classDate: string): Promise<Booking | null> {
    const result = await query(
      'SELECT * FROM bookings WHERE client_id = $1 AND schedule_id = $2 AND class_date = $3',
      [clientId, scheduleId, classDate]
    );
    return result.rows[0] || null;
  }

  static async getClientVisitHistory(clientId: string, limit: number = 50): Promise<any[]> {
    const result = await query(
      `SELECT * FROM v_client_visit_history
       WHERE client_id = $1
       ORDER BY date DESC, start_time DESC
       LIMIT $2`,
      [clientId, limit]
    );
    return result.rows;
  }
}
