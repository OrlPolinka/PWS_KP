import { getTransactionClient, query } from '../config/database';

export class AttendanceRepository {
  static async create(data: {
    booking_id: string;
    trainer_id: string;
    is_present: boolean;
    notes?: string;
  }): Promise<any> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      const bookingResult = await client.query(
        `SELECT b.id, b.status, m.remaining_visits
         FROM bookings b
         JOIN schedule s ON s.id = b.schedule_id
         JOIN memberships m ON m.id = b.membership_id
         WHERE b.id = $1 AND s.trainer_id = $2
         FOR UPDATE OF b, m`,
        [data.booking_id, data.trainer_id]
      );
      const booking = bookingResult.rows[0];
      if (!booking) throw new Error('Booking not found for this trainer');
      if (booking.status !== 'booked') throw new Error('Cannot mark attendance for non-booked classes');
      if (data.is_present && booking.remaining_visits !== null && booking.remaining_visits <= 0) {
        throw new Error('No remaining visits on this membership');
      }

      const result = await client.query(
        `INSERT INTO attendance (booking_id, trainer_id, is_present, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.booking_id, data.trainer_id, data.is_present, data.notes]
      );
      await client.query(
        `UPDATE bookings
         SET status = $1,
             checked_in = $2,
             checked_in_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
             checked_in_by = CASE WHEN $2 THEN $3::uuid ELSE NULL::uuid END
         WHERE id = $4`,
        [data.is_present ? 'attended' : 'no_show', data.is_present, data.trainer_id, data.booking_id]
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

  static async findById(id: number): Promise<any> {
    const result = await query('SELECT * FROM attendance WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByBookingId(bookingId: string): Promise<any> {
    const result = await query('SELECT * FROM attendance WHERE booking_id = $1', [bookingId]);
    return result.rows[0] || null;
  }

  static async findByTrainerId(trainerId: string, filters?: { date_from?: Date; date_to?: Date }): Promise<any[]> {
    let queryText = `
      SELECT a.*, b.client_id, u.full_name as client_name, b.class_date, s.start_time
      FROM attendance a
      JOIN bookings b ON b.id = a.booking_id
      JOIN users u ON u.id = b.client_id
      JOIN schedule s ON s.id = b.schedule_id
      WHERE a.trainer_id = $1
    `;
    const params: any[] = [trainerId];
    let paramIndex = 2;

    if (filters?.date_from) {
      queryText += ` AND b.class_date >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters?.date_to) {
      queryText += ` AND b.class_date <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    queryText += ' ORDER BY b.class_date DESC, s.start_time DESC';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async update(
    id: number,
    trainerId: string,
    data: { is_present?: boolean; notes?: string }
  ): Promise<any> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      const attendanceResult = await client.query(
        `SELECT a.*, b.id AS booking_id, b.membership_id, b.status AS booking_status,
                m.remaining_visits, mt.visit_count
         FROM attendance a
         JOIN bookings b ON b.id = a.booking_id
         JOIN schedule s ON s.id = b.schedule_id
         JOIN memberships m ON m.id = b.membership_id
         JOIN membership_types mt ON mt.id = m.membership_type_id
         WHERE a.id = $1 AND a.trainer_id = $2 AND s.trainer_id = $2
         FOR UPDATE OF a, b, m`,
        [id, trainerId]
      );
      const attendance = attendanceResult.rows[0];
      if (!attendance) throw new Error('Attendance record not found');

      const nextPresent = data.is_present ?? attendance.is_present;
      if (!attendance.is_present && nextPresent && attendance.remaining_visits !== null) {
        const debitResult = await client.query(
          `UPDATE memberships
           SET remaining_visits = remaining_visits - 1
           WHERE id = $1 AND remaining_visits > 0`,
          [attendance.membership_id]
        );
        if (!debitResult.rowCount) throw new Error('No remaining visits on this membership');
      } else if (attendance.is_present && !nextPresent && attendance.remaining_visits !== null) {
        await client.query(
          `UPDATE memberships
           SET remaining_visits = LEAST(remaining_visits + 1, $2)
           WHERE id = $1`,
          [attendance.membership_id, attendance.visit_count]
        );
      }

      const updatedResult = await client.query(
        `UPDATE attendance
         SET is_present = $1, notes = COALESCE($2, notes)
         WHERE id = $3
         RETURNING *`,
        [nextPresent, data.notes, id]
      );
      await client.query(
        `UPDATE bookings
         SET status = $1,
             checked_in = $2,
             checked_in_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
             checked_in_by = CASE WHEN $2 THEN $3::uuid ELSE NULL::uuid END
         WHERE id = $4`,
        [nextPresent ? 'attended' : 'no_show', nextPresent, trainerId, attendance.booking_id]
      );
      await client.query('COMMIT');
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
