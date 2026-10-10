import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function checkData() {
  console.log('Checking database data...\n');

  // Check halls
  const halls = await pool.query('SELECT * FROM halls');
  console.log('Halls:', halls.rows.length);
  console.table(halls.rows);

  // Check dance styles
  const styles = await pool.query('SELECT * FROM dance_styles');
  console.log('\nDance Styles:', styles.rows.length);
  console.table(styles.rows);

  // Check trainers
  const trainers = await pool.query(`
    SELECT t.id, u.email, u.full_name, t.specialization 
    FROM trainers t 
    JOIN users u ON u.id = t.user_id
  `);
  console.log('\nTrainers:', trainers.rows.length);
  console.table(trainers.rows);

  // Check schedule
  const schedule = await pool.query(`
    SELECT s.id, s.day_of_week, s.start_time, s.status,
           ds.name as style_name, h.name as hall_name,
           u.full_name as trainer_name
    FROM schedule s
    JOIN dance_styles ds ON ds.id = s.dance_style_id
    JOIN halls h ON h.id = s.hall_id
    JOIN trainers tr ON tr.id = s.trainer_id
    JOIN users u ON u.id = tr.user_id
  `);
  console.log('\nSchedule:', schedule.rows.length);
  console.table(schedule.rows);

  // Check membership types
  const memberships = await pool.query('SELECT * FROM membership_types');
  console.log('\nMembership Types:', memberships.rows.length);
  console.table(memberships.rows);

  await pool.end();
}

checkData().catch(console.error);
