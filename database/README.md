# Database

This folder contains the database schema and migration files.

## Setup

1. Create the database:
```bash
createdb dance_studio
```

2. Run the schema script:
```bash
psql -U postgres -d dance_studio -f db_DanceStudio.sql
```

For an existing database, apply migrations in order. The weekly schedule migration preserves each existing booking date as its class occurrence:
```bash
psql -U postgres -d dance_studio -f migrations/20261010_weekly_schedule.sql
psql -U postgres -d dance_studio -f migrations/20261010_manage_dance_styles.sql
psql -U postgres -d dance_studio -f migrations/20261010_harden_news_notifications.sql
psql -U postgres -d dance_studio -f migrations/20261010_booking_rules.sql
```

## Schema

The schema includes tables for:
- users (with roles: admin, trainer, client)
- trainers
- halls
- dance_styles
- schedule
- membership_types
- memberships
- payments
- bookings
- attendance
- messages
- notifications
- news
