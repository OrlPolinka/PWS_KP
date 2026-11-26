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

## Explicit demo data reset

The demo seed is separate from the regular `backend/src/database/seed.ts` seed
and is never run automatically. It truncates all application data and reloads a
large linked dataset (clients, trainers, styles, halls, a full weekly schedule,
memberships, payments, bookings, attendance, news, training tips, messages,
notifications, extension requests, and chatbot FAQs). The operation is wrapped
in a transaction and rolls back if any insert fails. It does not remove uploaded
files.

From the repository root in PowerShell, rebuild the backend image so the new
script is included, then run it explicitly:

```powershell
docker compose up --build -d backend
$DbName = (docker compose exec -T backend printenv DB_NAME).Trim()
docker compose exec backend npm run seed:demo -- "--confirm-reset=$DbName"
```

The confirmation value must match the target database name. This replaces all
existing application data in that database. Demo logins all use
`dance123!`: `admin@studio.demo`, `trainer01@studio.demo` through
`trainer12@studio.demo`, and `client01@studio.demo` through
`client60@studio.demo`.

The seed stores media URLs under `/uploads/demo/`; the corresponding files are
read from `backend/uploads/demo/` on the host (mounted into the backend
container). The seed creates these folders on its first explicit run:

- `backend/uploads/demo/admin/` — `studio-admin.jpg`
- `backend/uploads/demo/trainers/` — one portrait `{slug}.jpg`, class photo
  `{slug}-class.jpg`, rehearsal video `{slug}-rehearsal.mp4`, and certificate
  `{slug}-certificate.jpg` for each trainer. Slugs: `anna-kovaleva`,
  `mark-sokolov`, `polina-orlova`, `elena-mironova`, `denis-levchenko`,
  `victoria-belova`, `sofia-chernysh`, `artem-gonchar`, `maria-fomina`,
  `ilya-romanov`, `ksenia-pavlova`, and `roman-vasiliev`.
- `backend/uploads/demo/clients/` — `client-01.jpg` through `client-60.jpg`.
- `backend/uploads/demo/styles/` — for each style slug (`hip-hop`,
  `contemporary`, `jazz-funk`, `bachata`, `salsa`, `ballet`, `k-pop`,
  `dancehall`, `stretching`): `{slug}-cover.jpg`, `{slug}-class-01.jpg`, and
  `{slug}-class-02.jpg`.
- `backend/uploads/demo/news/` — `season-kickoff.jpg`, `open-day.jpg`,
  `k-pop-course.jpg`, `social-dance-evening.jpg`, `contemporary-workshop.jpg`,
  `morning-stretch.jpg`, `studio-showcase.jpg`, `holiday-schedule.jpg`,
  `hip-hop-musicality.jpg`, `renovated-studio.jpg`, `jazz-funk-open-class.jpg`,
  and `first-class-tips.jpg`.
- `backend/uploads/demo/training/` — `first-class.jpg`, `dancewear.jpg`,
  `dance-bag.jpg`, `studio-rules.jpg`, `warm-up.jpg`, `dance-styles.jpg`,
  `choreography-practice.jpg`, `partner-dance.jpg`, `dance-shoes.jpg`,
  `recovery.jpg`, `class-comfort.jpg`, and `stage-rehearsal.jpg`.

Use JPEG photos and MP4 videos. Missing photos automatically fall back to the
dance-themed `frontend/public/media-placeholder.svg`; videos show that same
image as their poster until a real video is present. The placeholder is an
intentional UI fallback, not a real media file.

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
psql -U postgres -d dance_studio -f migrations/20261125_enforce_schedule_and_record_links.sql
```
The integrity migration stops without changing data if it finds overlapping active schedules, class capacity above a room's capacity, mismatched client/membership ownership, or active booking date/time mismatches. It reports existing trainer-specialization mismatches as notices for manual review.

The Docker Compose database service persists PostgreSQL files in the `postgres_data`
named volume and mounts the initial schema plus the chatbot FAQ migration read-only
under `/docker-entrypoint-initdb.d/`. These init scripts run automatically only when
PostgreSQL initializes an empty data volume. For an existing Compose database, apply each pending migration once from the
repository root. For the latest migration:

```powershell
Get-Content database\migrations\20261125_enforce_schedule_and_record_links.sql | docker compose exec -T database psql -U postgres -d dance_studio
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
