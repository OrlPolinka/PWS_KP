BEGIN;

ALTER TABLE schedule ADD COLUMN day_of_week SMALLINT;
UPDATE schedule SET day_of_week = EXTRACT(ISODOW FROM date)::SMALLINT;
ALTER TABLE schedule ALTER COLUMN day_of_week SET NOT NULL;
ALTER TABLE schedule ADD CONSTRAINT chk_schedule_day_of_week CHECK (day_of_week BETWEEN 1 AND 7);

ALTER TABLE bookings ADD COLUMN class_date DATE;
UPDATE bookings b SET class_date = s.date
FROM schedule s WHERE s.id = b.schedule_id;
ALTER TABLE bookings ALTER COLUMN class_date SET NOT NULL;

ALTER TABLE bookings DROP CONSTRAINT uq_booking_client_schedule;
ALTER TABLE bookings ADD CONSTRAINT uq_booking_client_schedule
  UNIQUE (schedule_id, client_id, class_date);

DROP INDEX IF EXISTS uq_schedule_hall_time;
DROP INDEX IF EXISTS uq_schedule_trainer_time;
DROP INDEX IF EXISTS idx_schedule_date;
CREATE INDEX idx_schedule_day ON schedule(day_of_week);
CREATE UNIQUE INDEX uq_schedule_hall_time
  ON schedule(hall_id, day_of_week, start_time) WHERE status NOT IN ('cancelled');
CREATE UNIQUE INDEX uq_schedule_trainer_time
  ON schedule(trainer_id, day_of_week, start_time) WHERE status NOT IN ('cancelled');

DROP VIEW IF EXISTS v_client_visit_history;
ALTER TABLE schedule DROP COLUMN date;

CREATE OR REPLACE FUNCTION check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_max INTEGER;
    v_current INTEGER;
BEGIN
    IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
    SELECT max_capacity INTO v_max FROM schedule WHERE id = NEW.schedule_id;
    SELECT COUNT(*) INTO v_current
    FROM bookings
    WHERE schedule_id = NEW.schedule_id
      AND class_date = NEW.class_date
      AND status <> 'cancelled'
      AND id <> NEW.id;
    IF v_current >= v_max THEN
        RAISE EXCEPTION 'Занятие заполнено: максимум % мест', v_max;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_schedule_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT b.client_id, 'class_cancelled', 'Занятие отменено',
               'Занятие ' || ds.name || ' по ' ||
               CASE NEW.day_of_week
                 WHEN 1 THEN 'понедельникам' WHEN 2 THEN 'вторникам'
                 WHEN 3 THEN 'средам' WHEN 4 THEN 'четвергам'
                 WHEN 5 THEN 'пятницам' WHEN 6 THEN 'субботам'
                 ELSE 'воскресеньям' END || ' ' || NEW.start_time ||
               ' отменено. Причина: ' || COALESCE(NEW.cancel_reason, 'не указана'),
               jsonb_build_object('scheduleId', NEW.id, 'bookingId', b.id,
                                  'classDate', b.class_date, 'startTime', NEW.start_time)
        FROM bookings b
        JOIN dance_styles ds ON ds.id = NEW.dance_style_id
        WHERE b.schedule_id = NEW.id AND b.status = 'booked';
    END IF;
    IF NEW.status = 'rescheduled' AND OLD.status <> 'rescheduled' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT b.client_id, 'class_rescheduled', 'Занятие перенесено',
               'Занятие ' || ds.name || ' перенесено. Проверьте новое расписание.',
               jsonb_build_object('oldScheduleId', NEW.id, 'newScheduleId', NEW.rescheduled_to)
        FROM bookings b
        JOIN dance_styles ds ON ds.id = NEW.dance_style_id
        WHERE b.schedule_id = NEW.id AND b.status = 'booked';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE VIEW v_client_visit_history AS
SELECT b.id AS booking_id, b.client_id, u.full_name AS client_name,
       s.id AS schedule_id, b.class_date AS date, s.start_time, s.end_time,
       ds.name AS dance_style, h.name AS hall, tu.full_name AS trainer_name,
       b.status AS booking_status, a.is_present, a.marked_at, b.checked_in_at
FROM bookings b
JOIN users u ON u.id = b.client_id
JOIN schedule s ON s.id = b.schedule_id
JOIN dance_styles ds ON ds.id = s.dance_style_id
JOIN halls h ON h.id = s.hall_id
JOIN trainers t ON t.id = s.trainer_id
JOIN users tu ON tu.id = t.user_id
LEFT JOIN attendance a ON a.booking_id = b.id;

COMMIT;