import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function seed() {
  console.log('Seeding database...');

  // Update existing users with simple passwords
  const usersToUpdate = [
    { email: 'anna@studio.com', password: 'anna123' },
    { email: 'dmitry@studio.com', password: 'dmitry123' },
    { email: 'ekaterina@studio.com', password: 'ekaterina123' },
    { email: 'veronika@mail.com', password: 'veronika123' },
    { email: 'ivan@mail.com', password: 'ivan123' },
    { email: 'maria@mail.com', password: 'maria123' },
    { email: 'pavel@mail.com', password: 'pavel123' },
    { email: 'olga@mail.com', password: 'olga123' },
  ];

  for (const user of usersToUpdate) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2`,
      [passwordHash, user.email]
    );
    console.log(`Updated password for ${user.email} -> ${user.password}`);
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminResult = await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, phone, is_active, client_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['admin@studio.com', adminPassword, 'admin', 'Admin User', '+79001234567', true, 'ADM001']
  );
  console.log('Admin user created:', adminResult.rows[0].id);

  // Create trainer user
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  const trainerResult = await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, phone, is_active, client_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['trainer@studio.com', trainerPassword, 'trainer', 'Trainer User', '+79002345678', true, 'TRN001']
  );
  console.log('Trainer user created:', trainerResult.rows[0].id);

  // Create trainer profile
  await pool.query(
    `INSERT INTO trainers (user_id, specialization, bio, experience_years)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET specialization = EXCLUDED.specialization`,
    [trainerResult.rows[0].id, 'Hip Hop, Contemporary', 'Professional dancer with 10 years experience', 10]
  );

  // Create client user
  const clientPassword = await bcrypt.hash('client123', 10);
  const clientResult = await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, phone, is_active, client_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['client@studio.com', clientPassword, 'client', 'Client User', '+79003456789', true, 'CLI-' + Date.now().toString().slice(-6)]
  );
  console.log('Client user created:', clientResult.rows[0].id);


  console.log('Seeding completed!');
  await pool.end();
}

seed().catch(console.error);
