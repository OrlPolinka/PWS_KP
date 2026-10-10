import { query } from '../config/database';

export class AttendanceRepository {
  static async create(data: {
    booking_id: string;
    trainer_id: string;
    is_present: boolean;
    notes?: string;
  }): Promise<any> {
    const result = await query(
      `INSERT INTO attendance (booking_id, trainer_id, is_present, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.booking_id, data.trainer_id, data.is_present, data.notes]
    );
    return result.rows[0];
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

  static async update(id: number, data: { is_present?: boolean; notes?: string }): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'marked_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `UPDATE attendance SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }
}
