BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE membership_types
  ADD COLUMN IF NOT EXISTS dance_style_id INTEGER
  REFERENCES dance_styles(id) ON DELETE SET NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS class_start TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS class_end TIMESTAMP;
UPDATE bookings b
SET class_start = b.class_date + s.start_time,
    class_end = b.class_date + s.end_time
FROM schedule s
WHERE s.id = b.schedule_id
  AND (b.class_start IS NULL OR b.class_end IS NULL);
ALTER TABLE bookings ALTER COLUMN class_start SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN class_end SET NOT NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS uq_booking_client_schedule;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ex_booking_client_no_overlap;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_class_time;
ALTER TABLE bookings ADD CONSTRAINT chk_booking_class_time CHECK (class_end > class_start);

DROP INDEX IF EXISTS uq_booking_client_schedule_active;
CREATE UNIQUE INDEX uq_booking_client_schedule_active
  ON bookings(schedule_id, client_id, class_date)
  WHERE status <> 'cancelled';

ALTER TABLE bookings ADD CONSTRAINT ex_booking_client_no_overlap
  EXCLUDE USING gist (
    client_id WITH =,
    class_date WITH =,
    tsrange(class_start, class_end, '[)') WITH &&
  ) WHERE (status <> 'cancelled');

COMMIT;