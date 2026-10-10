import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function checkPasswords() {
  console.log('Checking user passwords...');
  
  const result = await pool.query('SELECT email, role, password_hash, LENGTH(password_hash) as hash_length FROM users');
  console.log('Users found:', result.rows.length);
  console.table(result.rows);
  
  await pool.end();
}

checkPasswords().catch(console.error);
