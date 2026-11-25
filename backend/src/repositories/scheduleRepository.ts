import { query } from '../config/database';
import { Schedule } from '../types';

export class ScheduleRepository {
  static async findById(id: string): Promise<Schedule | null> {
    const result = await query(
            `SELECT s.*, h.name as hall_name, h.capacity as hall_capacity,
              ds.name as dance_style_name, ds.description as dance_style_description,
              ds.difficulty as dance_style_difficulty,
              t.user_id as trainer_user_id, t.specialization as trainer_specialization,
              u.full_name as trainer_name
       FROM schedule s
       JOIN halls h ON h.id = s.hall_id
       JOIN dance_styles ds ON ds.id = s.dance_style_id
       JOIN trainers t ON t.id = s.trainer_id
       JOIN users u ON u.id = t.user_id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    trainer_id: string;
    hall_id: number;
    dance_style_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
    created_by: string;
  }): Promise<Schedule> {
    try {
      const result = await query(
        `INSERT INTO schedule (trainer_id, hall_id, dance_style_id, day_of_week, start_time, end_time, max_capacity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.trainer_id, data.hall_id, data.dance_style_id, data.day_of_week,
          data.start_time, data.end_time, data.max_capacity, data.created_by
        ]
      );
      return result.rows[0];
    } catch (error) {
      this.throwScheduleConstraintError(error);
    }
  }

  static async update(id: string, data: Partial<Schedule>): Promise<Schedule | null> {
    const allowedFields = ['trainer_id', 'hall_id', 'dance_style_id', 'day_of_week', 'start_time', 'end_time', 'max_capacity', 'status', 'cancel_reason'];
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
    const queryText = `UPDATE schedule SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    try {
      const result = await query(queryText, values);
      return result.rows[0] || null;
    } catch (error) {
      this.throwScheduleConstraintError(error);
    }
  }

  private static throwScheduleConstraintError(error: unknown): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23P01') throw new Error('Тренер или зал уже занят в это время.');
      if (error.code === 'P0001' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('Schedule capacity')) {
          throw new Error('Вместимость занятия превышает вместимость зала.');
        }
        if (message.includes('schedule with booking history')) {
          throw new Error('Нельзя менять тренера, зал, направление, день или время занятия, пока у него есть история записей. Создайте новое занятие и отмените старое.');
        }
        if (message.includes('Schedule capacity is below')) {
          throw new Error('Нельзя уменьшить вместимость ниже количества уже записанных клиентов.');
        }
      }
    }
    throw error;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM schedule WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  static async hasConflict(data: {
    trainer_id: string;
    hall_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }, exceptId?: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM schedule
       WHERE status <> 'cancelled'
         AND day_of_week = $1
         AND (trainer_id = $2 OR hall_id = $3)
         AND start_time < $5::time
         AND end_time > $4::time
         AND ($6::uuid IS NULL OR id <> $6::uuid)
       LIMIT 1`,
      [data.day_of_week, data.trainer_id, data.hall_id, data.start_time, data.end_time, exceptId || null]
    );
    return result.rowCount !== 0;
  }

  static async validateAssignments(data: {
    trainer_id: string;
    hall_id: number;
    dance_style_id: number;
    max_capacity: number;
  }): Promise<void> {
    const result = await query(
      `SELECT h.capacity AS hall_capacity, h.is_active AS hall_active,
              ds.name AS style_name, ds.is_active AS style_active,
              t.specialization, u.is_active AS trainer_active, u.role AS trainer_role
       FROM trainers t
       JOIN users u ON u.id = t.user_id
       JOIN halls h ON h.id = $2
       JOIN dance_styles ds ON ds.id = $3
       WHERE t.id = $1`,
      [data.trainer_id, data.hall_id, data.dance_style_id]
    );
    const assignment = result.rows[0];
    if (!assignment) throw new Error('Выберите существующие зал, тренера и направление.');
    if (!assignment.trainer_active || assignment.trainer_role !== 'trainer') {
      throw new Error('Нельзя назначить неактивного пользователя или пользователя без роли тренера.');
    }
    if (!assignment.hall_active) throw new Error('Нельзя назначить неактивный зал.');
    if (!assignment.style_active) throw new Error('Нельзя назначить архивное направление.');
    if (Number(data.max_capacity) > Number(assignment.hall_capacity)) {
      throw new Error(`Вместимость занятия не может превышать вместимость зала (${assignment.hall_capacity} мест).`);
    }

    if (!this.matchesSpecialization(assignment.specialization, assignment.style_name)) {
      throw new Error(`Тренер не ведёт направление «${assignment.style_name}».`);
    }
  }

  static async validateTrainerSpecialization(trainerId: string, specialization?: string | null): Promise<void> {
    const result = await query(
      `SELECT DISTINCT ds.name AS style_name
       FROM schedule s
       JOIN dance_styles ds ON ds.id = s.dance_style_id
       WHERE s.trainer_id = $1 AND s.status = 'scheduled'`,
      [trainerId]
    );
    const incompatibleStyles = result.rows
      .map((row: { style_name: string }) => row.style_name)
      .filter((styleName: string) => !this.matchesSpecialization(specialization, styleName));
    if (incompatibleStyles.length) {
      throw new Error(`Нельзя изменить направления тренера: в расписании уже есть занятия по направлениям ${incompatibleStyles.join(', ')}.`);
    }
  }

  private static matchesSpecialization(specialization: unknown, styleName: unknown): boolean {
    if (typeof specialization !== 'string' || !specialization.trim()) return true;
    const allowedStyles = specialization
      .split(/[,;\r\n]+/)
      .map((style) => style.trim().toLocaleLowerCase('ru'))
      .filter(Boolean);
    return allowedStyles.includes(String(styleName).trim().toLocaleLowerCase('ru'));
  }

  static async hasClassInRange(
    clientId: string,
    classDate: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
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

  static async findAll(filters?: {
    trainer_id?: string;
    day_of_week?: number;
    dance_style_id?: number;
    status?: string;
  }): Promise<Schedule[]> {
    let queryText = `
      SELECT s.*, h.name as hall_name, ds.name as dance_style_name,
             t.user_id as trainer_user_id, u.full_name as trainer_name
      FROM schedule s
      JOIN halls h ON h.id = s.hall_id
      JOIN dance_styles ds ON ds.id = s.dance_style_id
      JOIN trainers t ON t.id = s.trainer_id
      JOIN users u ON u.id = t.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.trainer_id) {
      queryText += ` AND s.trainer_id = $${paramIndex}`;
      params.push(filters.trainer_id);
      paramIndex++;
    }

    if (filters?.day_of_week) {
      queryText += ` AND s.day_of_week = $${paramIndex}`;
      params.push(filters.day_of_week);
      paramIndex++;
    }

    if (filters?.dance_style_id) {
      queryText += ` AND s.dance_style_id = $${paramIndex}`;
      params.push(filters.dance_style_id);
      paramIndex++;
    }

    if (filters?.status) {
      queryText += ` AND s.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    queryText += ' ORDER BY s.day_of_week, s.start_time';
    const result = await query(queryText, params);
    return result.rows;
  }

  static async getTrainerSchedule(trainerId: string): Promise<Schedule[]> {
    return this.findAll({ trainer_id: trainerId });
  }

  static async getOptions(): Promise<{ halls: unknown[]; dance_styles: unknown[] }> {
    const [halls, danceStyles] = await Promise.all([
      query('SELECT id, name, capacity FROM halls WHERE is_active = TRUE ORDER BY name'),
      query('SELECT id, name FROM dance_styles WHERE is_active = TRUE ORDER BY name'),
    ]);
    return { halls: halls.rows, dance_styles: danceStyles.rows };
  }

  static async checkCapacity(scheduleId: string, classDate: string): Promise<{ current: number; max: number }> {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM bookings WHERE schedule_id = $1 AND class_date = $2 AND status = 'booked') as current,
        max_capacity as max
       FROM schedule WHERE id = $1`,
      [scheduleId, classDate]
    );
    return result.rows[0];
  }
}
