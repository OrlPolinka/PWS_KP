import { query } from '../config/database';
import { UserRole } from '../types';

export interface DashboardStat {
  key: string;
  value: number | string;
}

export interface DashboardClass {
  id: string;
  dance_style_name: string;
  trainer_name: string;
  hall_name: string;
  class_date: string;
  start_time: string;
}

export interface DashboardNews {
  id: string;
  title: string;
  created_at: Date;
}

export class DashboardRepository {
  static async getStats(userId: string, role: UserRole): Promise<DashboardStat[]> {
    if (role === 'admin') {
      const [users, classes, extensions, news] = await Promise.all([
        query(`SELECT COUNT(*)::int AS value FROM users WHERE is_active = TRUE`),
        query(
          `SELECT COUNT(*)::int AS value
           FROM schedule
           WHERE status = 'scheduled'
             AND day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)::int
             AND start_time > LOCALTIME`
        ),
        query(`SELECT COUNT(*)::int AS value FROM membership_extension_requests WHERE status = 'pending'`),
        query(`SELECT COUNT(*)::int AS value FROM news WHERE is_published = TRUE`),
      ]);
      return [
        { key: 'users', value: users.rows[0].value },
        { key: 'classes_today', value: classes.rows[0].value },
        { key: 'extension_requests', value: extensions.rows[0].value },
        { key: 'published_news', value: news.rows[0].value },
      ];
    }

    if (role === 'trainer') {
      const [classes, clients, messages, notifications] = await Promise.all([
        query(
          `SELECT COUNT(*)::int AS value
           FROM schedule s
           JOIN trainers t ON t.id = s.trainer_id
           CROSS JOIN LATERAL generate_series(
             CURRENT_DATE, CURRENT_DATE + 6, INTERVAL '1 day'
           ) AS occurrence(class_date)
           WHERE t.user_id = $1 AND s.status = 'scheduled'
             AND EXTRACT(ISODOW FROM occurrence.class_date) = s.day_of_week
             AND occurrence.class_date::date + s.start_time > NOW()`,
          [userId]
        ),
        query(
          `SELECT COUNT(DISTINCT b.client_id)::int AS value
           FROM bookings b
           JOIN schedule s ON s.id = b.schedule_id
           JOIN trainers t ON t.id = s.trainer_id
           WHERE t.user_id = $1 AND b.status = 'booked'
             AND b.class_start >= NOW()
             AND b.class_start < NOW() + INTERVAL '30 days'`,
          [userId]
        ),
        query(
          `SELECT COUNT(*)::int AS value FROM messages
           WHERE receiver_id = $1 AND is_read = FALSE`,
          [userId]
        ),
        query(
          `SELECT COUNT(*)::int AS value FROM notifications
           WHERE user_id = $1 AND is_read = FALSE`,
          [userId]
        ),
      ]);
      return [
        { key: 'classes_week', value: classes.rows[0].value },
        { key: 'active_clients', value: clients.rows[0].value },
        { key: 'unread_messages', value: messages.rows[0].value },
        { key: 'unread_notifications', value: notifications.rows[0].value },
      ];
    }

    const [classes, visits, messages, notifications] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS value FROM bookings
         WHERE client_id = $1 AND status = 'booked'
           AND class_start >= NOW()`,
        [userId]
      ),
      query(
        `SELECT CASE
           WHEN BOOL_OR(m.remaining_visits IS NULL) THEN 'Безлимит'
           ELSE COALESCE(SUM(m.remaining_visits), 0)::text
         END AS value
         FROM memberships m
         WHERE m.client_id = $1 AND m.status = 'active'
           AND m.start_date <= CURRENT_DATE AND m.end_date >= CURRENT_DATE`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int AS value FROM messages
         WHERE receiver_id = $1 AND is_read = FALSE`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int AS value FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      ),
    ]);
    return [
      { key: 'upcoming_classes', value: classes.rows[0].value },
      { key: 'remaining_visits', value: visits.rows[0].value },
      { key: 'unread_messages', value: messages.rows[0].value },
      { key: 'unread_notifications', value: notifications.rows[0].value },
    ];
  }

  static async getUpcomingClasses(userId: string, role: UserRole): Promise<DashboardClass[]> {
    if (role === 'client') {
      const result = await query(
        `SELECT b.id, ds.name AS dance_style_name, u.full_name AS trainer_name,
                h.name AS hall_name, b.class_date::text, s.start_time
         FROM bookings b
         JOIN schedule s ON s.id = b.schedule_id
         JOIN dance_styles ds ON ds.id = s.dance_style_id
         JOIN halls h ON h.id = s.hall_id
         JOIN trainers t ON t.id = s.trainer_id
         JOIN users u ON u.id = t.user_id
         WHERE b.client_id = $1 AND b.status = 'booked'
           AND b.class_start >= NOW()
         ORDER BY b.class_start
         LIMIT 3`,
        [userId]
      );
      return result.rows;
    }

    const trainerFilter = role === 'trainer' ? 'AND t.user_id = $1' : '';
    const params = role === 'trainer' ? [userId] : [];
    const result = await query(
      `SELECT s.id, ds.name AS dance_style_name, u.full_name AS trainer_name,
              h.name AS hall_name, occurrence.class_date::date::text AS class_date,
              s.start_time
       FROM schedule s
       JOIN trainers t ON t.id = s.trainer_id
       JOIN users u ON u.id = t.user_id
       JOIN dance_styles ds ON ds.id = s.dance_style_id
       JOIN halls h ON h.id = s.hall_id
       CROSS JOIN LATERAL generate_series(
         CURRENT_DATE, CURRENT_DATE + 6, INTERVAL '1 day'
       ) AS occurrence(class_date)
       WHERE s.status = 'scheduled'
         AND EXTRACT(ISODOW FROM occurrence.class_date) = s.day_of_week
         AND occurrence.class_date::date + s.start_time > NOW()
         ${trainerFilter}
       ORDER BY occurrence.class_date, s.start_time
       LIMIT 3`,
      params
    );
    return result.rows;
  }

  static async getLatestNews(): Promise<DashboardNews[]> {
    const result = await query(
      `SELECT id, title, created_at
       FROM news
       WHERE is_published = TRUE
       ORDER BY created_at DESC
       LIMIT 3`
    );
    return result.rows;
  }
}
