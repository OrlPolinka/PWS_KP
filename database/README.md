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

For a new database, use only `database/db_DanceStudio.sql` as the schema source.
The similarly named SQL file in the repository root is an obsolete demo copy and
must not be run: it references the removed `schedule.date` column and contains
booking inserts that omit required class date/time columns.

In pgAdmin, create an empty `dance_studio` database, select it, open **Tools →
Query Tool**, open `database/db_DanceStudio.sql`, and execute the whole file.
This creates the schema but does not insert demo users or other test data.

For an existing database, apply migrations in order. The weekly schedule migration preserves each existing booking date as its class occurrence:
```bash
psql -U postgres -d dance_studio -f migrations/20261010_weekly_schedule.sql
psql -U postgres -d dance_studio -f migrations/20261010_manage_dance_styles.sql
psql -U postgres -d dance_studio -f migrations/20261010_harden_news_notifications.sql
psql -U postgres -d dance_studio -f migrations/20261010_booking_rules.sql
psql -U postgres -d dance_studio -f migrations/20261017_membership_prices_byn.sql
psql -U postgres -d dance_studio -f migrations/20261017_stripe_payment_currency.sql
psql -U postgres -d dance_studio -f migrations/20261017_membership_extension_requests.sql
psql -U postgres -d dance_studio -f migrations/20261017_client_checkin_codes.sql
psql -U postgres -d dance_studio -f migrations/20261116_chatbot_faq.sql
psql -U postgres -d dance_studio -f migrations/20261122_publish_trainer_profiles.sql
```

The Docker Compose database service persists PostgreSQL files in the `postgres_data`
named volume and mounts the initial schema plus the chatbot FAQ migration read-only
under `/docker-entrypoint-initdb.d/`. These init scripts run automatically only when
PostgreSQL initializes an empty data volume. For an existing Compose database, apply
the migration once with:

```powershell
docker compose exec -T database psql -U postgres -d dance_studio -f /docker-entrypoint-initdb.d/002-chatbot-faq.sql
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
- chatbot_faqs (вопросы и ответы чат-бота)
- notifications
- news
