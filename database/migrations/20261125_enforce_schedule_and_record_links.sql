BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM schedule first_schedule
        JOIN schedule second_schedule
          ON first_schedule.id < second_schedule.id
         AND first_schedule.day_of_week = second_schedule.day_of_week
         AND first_schedule.status <> 'cancelled'
         AND second_schedule.status <> 'cancelled'
         AND (
             first_schedule.trainer_id = second_schedule.trainer_id
             OR first_schedule.hall_id = second_schedule.hall_id
         )
         AND tsrange(
               DATE '2000-01-03' + first_schedule.start_time,
               DATE '2000-01-03' + first_schedule.end_time,
               '[)'
             ) && tsrange(
               DATE '2000-01-03' + second_schedule.start_time,
               DATE '2000-01-03' + second_schedule.end_time,
               '[)'
             )
    ) THEN
        RAISE EXCEPTION 'Overlapping active schedules exist; resolve trainer/hall conflicts before applying this migration';
    END IF;
END;
$$;

DROP INDEX IF EXISTS uq_schedule_hall_time;
DROP INDEX IF EXISTS uq_schedule_trainer_time;

ALTER TABLE schedule
    ADD CONSTRAINT ex_schedule_trainer_no_overlap
    EXCLUDE USING gist (
        trainer_id WITH =,
        day_of_week WITH =,
        tsrange(DATE '2000-01-03' + start_time, DATE '2000-01-03' + end_time, '[)') WITH &&
    ) WHERE (status <> 'cancelled');

ALTER TABLE schedule
    ADD CONSTRAINT ex_schedule_hall_no_overlap
    EXCLUDE USING gist (
        hall_id WITH =,
        day_of_week WITH =,
        tsrange(DATE '2000-01-03' + start_time, DATE '2000-01-03' + end_time, '[)') WITH &&
    ) WHERE (status <> 'cancelled');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM schedule s
        JOIN halls h ON h.id = s.hall_id
        WHERE s.max_capacity > h.capacity
    ) THEN
        RAISE EXCEPTION 'A schedule capacity exceeds its hall capacity; correct those schedules before applying this migration';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_schedule_hall_capacity()
RETURNS TRIGGER AS $$
DECLARE
    hall_capacity INTEGER;
BEGIN
    SELECT capacity INTO hall_capacity
    FROM halls
    WHERE id = NEW.hall_id
    FOR KEY SHARE;

    IF hall_capacity IS NULL THEN
        RAISE EXCEPTION 'Selected hall does not exist';
    END IF;
    IF NEW.max_capacity > hall_capacity THEN
        RAISE EXCEPTION 'Schedule capacity (%) exceeds hall capacity (%)', NEW.max_capacity, hall_capacity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_hall_capacity
    BEFORE INSERT OR UPDATE OF hall_id, max_capacity ON schedule
    FOR EACH ROW EXECUTE FUNCTION enforce_schedule_hall_capacity();

CREATE OR REPLACE FUNCTION prevent_hall_capacity_reduction_below_schedules()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.capacity < OLD.capacity AND EXISTS (
        SELECT 1 FROM schedule
        WHERE hall_id = OLD.id AND max_capacity > NEW.capacity
    ) THEN
        RAISE EXCEPTION 'Hall capacity cannot be reduced below a linked schedule capacity';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hall_capacity_schedule_guard
    BEFORE UPDATE OF capacity ON halls
    FOR EACH ROW EXECUTE FUNCTION prevent_hall_capacity_reduction_below_schedules();

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_schedule_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_schedule_id_fkey
    FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE RESTRICT;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_client_id_fkey;
ALTER TABLE memberships ADD CONSTRAINT memberships_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_payment_id_fkey;
ALTER TABLE memberships ADD CONSTRAINT memberships_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT;

ALTER TABLE membership_types DROP CONSTRAINT IF EXISTS membership_types_dance_style_id_fkey;
ALTER TABLE membership_types ADD CONSTRAINT membership_types_dance_style_id_fkey
    FOREIGN KEY (dance_style_id) REFERENCES dance_styles(id) ON DELETE RESTRICT;

ALTER TABLE membership_extension_requests DROP CONSTRAINT IF EXISTS membership_extension_requests_membership_id_fkey;
ALTER TABLE membership_extension_requests ADD CONSTRAINT membership_extension_requests_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE RESTRICT;

ALTER TABLE membership_extension_requests DROP CONSTRAINT IF EXISTS membership_extension_requests_client_id_fkey;
ALTER TABLE membership_extension_requests ADD CONSTRAINT membership_extension_requests_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_booking_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE RESTRICT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM bookings b
        JOIN memberships m ON m.id = b.membership_id
        WHERE b.client_id <> m.client_id
    ) OR EXISTS (
        SELECT 1
        FROM membership_extension_requests mer
        JOIN memberships m ON m.id = mer.membership_id
        WHERE mer.client_id <> m.client_id
    ) OR EXISTS (
        SELECT 1
        FROM memberships m
        JOIN payments p ON p.id = m.payment_id
        WHERE p.user_id <> m.client_id
    ) THEN
        RAISE EXCEPTION 'A booking, extension request, or membership payment references another client; correct ownership before applying this migration';
    END IF;
END;
$$;

ALTER TABLE memberships
    ADD CONSTRAINT uq_membership_id_client UNIQUE (id, client_id);

ALTER TABLE payments
    ADD CONSTRAINT uq_payment_id_user UNIQUE (id, user_id);

ALTER TABLE memberships
    ADD CONSTRAINT fk_membership_payment_owner
    FOREIGN KEY (payment_id, client_id)
    REFERENCES payments(id, user_id) ON DELETE RESTRICT;

ALTER TABLE bookings
    ADD CONSTRAINT fk_booking_membership_owner
    FOREIGN KEY (membership_id, client_id)
    REFERENCES memberships(id, client_id) ON DELETE RESTRICT;

ALTER TABLE membership_extension_requests
    ADD CONSTRAINT fk_extension_membership_owner
    FOREIGN KEY (membership_id, client_id)
    REFERENCES memberships(id, client_id) ON DELETE RESTRICT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM attendance a
        JOIN bookings b ON b.id = a.booking_id
        JOIN schedule s ON s.id = b.schedule_id
        WHERE a.trainer_id <> s.trainer_id
    ) THEN
        RAISE EXCEPTION 'Attendance trainer differs from the current schedule trainer; review historical attendance before applying this migration';
    END IF;
END;
$$;

DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT count(*) INTO mismatch_count
    FROM schedule s
    JOIN trainers t ON t.id = s.trainer_id
    JOIN dance_styles ds ON ds.id = s.dance_style_id
    WHERE s.status = 'scheduled'
      AND COALESCE(BTRIM(t.specialization), '') <> ''
      AND NOT EXISTS (
          SELECT 1
          FROM regexp_split_to_table(t.specialization, '[,;]') AS specialty
          WHERE LOWER(BTRIM(specialty)) = LOWER(ds.name)
      );
    IF mismatch_count > 0 THEN
        RAISE NOTICE '% active schedule(s) do not match the trainer''s listed specialization; review them manually', mismatch_count;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_booking_identity_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_id IS DISTINCT FROM OLD.schedule_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.membership_id IS DISTINCT FROM OLD.membership_id
       OR NEW.class_date IS DISTINCT FROM OLD.class_date
       OR NEW.class_start IS DISTINCT FROM OLD.class_start
       OR NEW.class_end IS DISTINCT FROM OLD.class_end THEN
        RAISE EXCEPTION 'Booking ownership and class references cannot be changed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_identity_immutable
    BEFORE UPDATE OF schedule_id, client_id, membership_id, class_date, class_start, class_end
    ON bookings
    FOR EACH ROW EXECUTE FUNCTION prevent_booking_identity_changes();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM bookings b
        JOIN schedule s ON s.id = b.schedule_id
        WHERE b.status <> 'cancelled'
          AND (
              EXTRACT(ISODOW FROM b.class_date)::SMALLINT <> s.day_of_week
              OR b.class_start <> b.class_date + s.start_time
              OR b.class_end <> b.class_date + s.end_time
          )
    ) THEN
        RAISE EXCEPTION 'An active booking does not match its schedule date/time; correct it before applying this migration';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_booking_matches_schedule()
RETURNS TRIGGER AS $$
DECLARE
    schedule_day SMALLINT;
    schedule_start TIME;
    schedule_end TIME;
BEGIN
    SELECT day_of_week, start_time, end_time
    INTO schedule_day, schedule_start, schedule_end
    FROM schedule
    WHERE id = NEW.schedule_id;

    IF schedule_day IS NULL
       OR EXTRACT(ISODOW FROM NEW.class_date)::SMALLINT <> schedule_day
       OR NEW.class_start <> NEW.class_date + schedule_start
       OR NEW.class_end <> NEW.class_date + schedule_end THEN
        RAISE EXCEPTION 'Booking date or class time does not match the selected schedule';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_matches_schedule
    BEFORE INSERT OR UPDATE OF schedule_id, class_date, class_start, class_end
    ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_booking_matches_schedule();

CREATE OR REPLACE FUNCTION prevent_schedule_identity_changes_with_bookings()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
        OR NEW.hall_id IS DISTINCT FROM OLD.hall_id
        OR NEW.dance_style_id IS DISTINCT FROM OLD.dance_style_id
        OR NEW.day_of_week IS DISTINCT FROM OLD.day_of_week
        OR NEW.start_time IS DISTINCT FROM OLD.start_time
        OR NEW.end_time IS DISTINCT FROM OLD.end_time
    ) AND EXISTS (
        SELECT 1 FROM bookings WHERE schedule_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'A schedule with booking history cannot change its trainer, hall, style, day, or time';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_identity_immutable_with_bookings
    BEFORE UPDATE OF trainer_id, hall_id, dance_style_id, day_of_week, start_time, end_time
    ON schedule
    FOR EACH ROW EXECUTE FUNCTION prevent_schedule_identity_changes_with_bookings();

CREATE OR REPLACE FUNCTION prevent_schedule_capacity_below_bookings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_capacity < OLD.max_capacity AND EXISTS (
        SELECT 1
        FROM bookings
        WHERE schedule_id = OLD.id AND status <> 'cancelled'
        GROUP BY class_date
        HAVING COUNT(*) > NEW.max_capacity
    ) THEN
        RAISE EXCEPTION 'Schedule capacity is below the number of linked bookings';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_capacity_booking_guard
    BEFORE UPDATE OF max_capacity ON schedule
    FOR EACH ROW EXECUTE FUNCTION prevent_schedule_capacity_below_bookings();

CREATE OR REPLACE FUNCTION enforce_attendance_trainer_matches_schedule()
RETURNS TRIGGER AS $$
DECLARE
    assigned_trainer UUID;
BEGIN
    SELECT s.trainer_id INTO assigned_trainer
    FROM bookings b
    JOIN schedule s ON s.id = b.schedule_id
    WHERE b.id = NEW.booking_id;

    IF assigned_trainer IS DISTINCT FROM NEW.trainer_id THEN
        RAISE EXCEPTION 'Attendance trainer must match the trainer assigned to the booking';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_trainer_matches_schedule
    BEFORE INSERT OR UPDATE OF booking_id, trainer_id ON attendance
    FOR EACH ROW EXECUTE FUNCTION enforce_attendance_trainer_matches_schedule();

COMMIT;
