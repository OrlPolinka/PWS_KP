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
    const result = await query(
      `INSERT INTO bookings (schedule_id, client_id, membership_id, class_date, class_start, class_end)
       SELECT s.id, $2, $3, $4, $4::date + s.start_time, $4::date + s.end_time
       FROM schedule s WHERE s.id = $1
       RETURNING *`,
      [data.schedule_id, data.client_id, data.membership_id, data.class_date]
    );
    return result.rows[0];
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
