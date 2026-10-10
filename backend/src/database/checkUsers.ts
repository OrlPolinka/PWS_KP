import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function checkUsers() {
  console.log('Checking users in database...');
  
  const result = await pool.query('SELECT id, email, role, is_active, client_code FROM users');
  console.log('Users found:', result.rows.length);
  console.table(result.rows);
  
  await pool.end();
}

checkUsers().catch(console.error);
