
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL
                    CHECK (role IN ('admin', 'trainer', 'client')),
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    photo_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    client_code     VARCHAR(20) UNIQUE,
    qr_token        UUID UNIQUE DEFAULT gen_random_uuid(),

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);


CREATE TABLE trainers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE
                        REFERENCES users(id) ON DELETE CASCADE,

    specialization      VARCHAR(255),
    bio                 TEXT,
    experience_years    INTEGER CHECK (experience_years >= 0),
    education           TEXT,
    achievements        TEXT,

    photo_url           TEXT,
    video_url           TEXT,
    gallery             JSONB DEFAULT '[]'::jsonb,  
    certificates        JSONB DEFAULT '[]'::jsonb, 
    social_links        JSONB DEFAULT '[]'::jsonb,
    custom_page_title   VARCHAR(255),
    custom_page_content TEXT,

    hired_at            DATE NOT NULL DEFAULT CURRENT_DATE,
    is_published        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_trainers_user ON trainers(user_id);


CREATE TABLE halls (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    capacity    INTEGER NOT NULL CHECK (capacity > 0),
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE dance_styles (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL UNIQUE,
    description       TEXT,

    cover             JSONB,

    gallery           JSONB NOT NULL DEFAULT '[]'::jsonb,

    benefits          JSONB NOT NULL DEFAULT '[]'::jsonb,

    difficulty        VARCHAR(20) NOT NULL DEFAULT 'beginner'
                      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE schedule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id      UUID NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
    hall_id         INTEGER NOT NULL REFERENCES halls(id) ON DELETE RESTRICT,
    dance_style_id  INTEGER NOT NULL REFERENCES dance_styles(id) ON DELETE RESTRICT,

    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    max_capacity    INTEGER NOT NULL CHECK (max_capacity > 0),

    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'cancelled', 'completed', 'rescheduled')),
    cancel_reason   TEXT,
    rescheduled_to  UUID REFERENCES schedule(id) ON DELETE SET NULL,

    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);

CREATE INDEX idx_schedule_day     ON schedule(day_of_week);
CREATE INDEX idx_schedule_trainer ON schedule(trainer_id);
CREATE INDEX idx_schedule_status  ON schedule(status);

CREATE UNIQUE INDEX uq_schedule_hall_time
    ON schedule(hall_id, day_of_week, start_time)
    WHERE status NOT IN ('cancelled');

CREATE UNIQUE INDEX uq_schedule_trainer_time
    ON schedule(trainer_id, day_of_week, start_time)
    WHERE status NOT IN ('cancelled');


CREATE TABLE membership_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    visit_count     INTEGER CHECK (visit_count IS NULL OR visit_count > 0), -- NULL = безлимит
    duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
    dance_style_id  INTEGER REFERENCES dance_styles(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    amount              NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'BYN',

    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),

    provider            VARCHAR(50),                       -- payment provider
    provider_payment_id VARCHAR(255),
    description         TEXT,
    metadata            JSONB DEFAULT '{}'::jsonb,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user   ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);


CREATE TABLE memberships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_type_id  INTEGER NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
    payment_id          UUID REFERENCES payments(id) ON DELETE SET NULL,

    purchase_date       TIMESTAMP NOT NULL DEFAULT NOW(),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,

    remaining_visits    INTEGER CHECK (remaining_visits IS NULL OR remaining_visits >= 0),

    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'paused', 'pending_extension', 'cancelled')),
    price_paid          NUMERIC(10, 2) NOT NULL CHECK (price_paid >= 0),

    paused_at           DATE,
    paused_until        DATE,

    CONSTRAINT chk_membership_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_memberships_client ON memberships(client_id);
CREATE INDEX idx_memberships_status ON memberships(status);


CREATE TABLE membership_extension_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id   UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    requested_days  INTEGER NOT NULL CHECK (requested_days > 0),
    reason          TEXT,

    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP,
    admin_comment   TEXT,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ext_req_status ON membership_extension_requests(status);
CREATE INDEX idx_ext_req_client ON membership_extension_requests(client_id);


CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id     UUID NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
    class_date      DATE NOT NULL,
    class_start     TIMESTAMP NOT NULL,
    class_end       TIMESTAMP NOT NULL,
    client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id   UUID NOT NULL REFERENCES memberships(id) ON DELETE RESTRICT,

    booked_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'booked'
                    CHECK (status IN ('booked', 'cancelled', 'attended', 'no_show')),
    cancelled_at    TIMESTAMP,
    cancelled_by    UUID REFERENCES users(id) ON DELETE SET NULL,

    checked_in          BOOLEAN NOT NULL DEFAULT FALSE,
	checked_in_at       TIMESTAMP,
	checked_in_by       UUID REFERENCES trainers(id) ON DELETE SET NULL,

    CONSTRAINT chk_booking_class_time CHECK (class_end > class_start)
);

CREATE INDEX idx_bookings_client   ON bookings(client_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_bookings_status   ON bookings(status);
CREATE UNIQUE INDEX uq_booking_client_schedule_active
    ON bookings(schedule_id, client_id, class_date)
    WHERE status <> 'cancelled';
ALTER TABLE bookings ADD CONSTRAINT ex_booking_client_no_overlap
    EXCLUDE USING gist (
        client_id WITH =,
        class_date WITH =,
        tsrange(class_start, class_end, '[)') WITH &&
    ) WHERE (status <> 'cancelled');


CREATE TABLE attendance (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
    is_present  BOOLEAN NOT NULL,
    marked_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    notes       TEXT
);

CREATE INDEX idx_attendance_trainer ON attendance(trainer_id);


CREATE TABLE messages (
    id          BIGSERIAL PRIMARY KEY,
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    edited      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_message_not_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_messages_dialog   ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, is_read);
CREATE INDEX idx_messages_created  ON messages(created_at DESC);


CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type        VARCHAR(50) NOT NULL,
    -- booking_cancelled, class_cancelled, class_rescheduled, membership_expiring,
    -- extension_approved, extension_rejected, new_message, news_published, ...
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    data        JSONB DEFAULT '{}'::jsonb,   -- {bookingId, scheduleId, ...}

    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);


CREATE TABLE training_info (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    category    VARCHAR(50) NOT NULL
                CHECK (category IN ('preparation', 'what_to_bring', 'rules', 'tips')),
    video_url   TEXT,
    image_url   TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_info_cat ON training_info(category, is_active);


CREATE TABLE news (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    image_url    TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    author_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_news_published ON news(is_published, created_at DESC);

-- ============================================================
-- ТРИГГЕРЫ: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schedule_updated       BEFORE UPDATE ON schedule       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_messages_updated       BEFORE UPDATE ON messages       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_news_updated           BEFORE UPDATE ON news           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_training_info_updated  BEFORE UPDATE ON training_info  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated       BEFORE UPDATE ON payments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ТРИГГЕР: автосписание визита при отметке посещения
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_membership_visits()
RETURNS TRIGGER AS $$
DECLARE
    v_membership_id UUID;
    v_remaining     INTEGER;
BEGIN
    SELECT membership_id INTO v_membership_id
    FROM bookings WHERE id = NEW.booking_id;

    IF v_membership_id IS NULL THEN RETURN NEW; END IF;

    SELECT remaining_visits INTO v_remaining
    FROM memberships WHERE id = v_membership_id;

    IF v_remaining IS NOT NULL AND NEW.is_present = TRUE THEN
        UPDATE memberships
        SET remaining_visits = GREATEST(remaining_visits - 1, 0)
        WHERE id = v_membership_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_decrement
    AFTER INSERT ON attendance
    FOR EACH ROW EXECUTE FUNCTION decrement_membership_visits();

-- ============================================================
-- ТРИГГЕР: проверка вместимости при записи
-- ============================================================
CREATE OR REPLACE FUNCTION check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_max     INTEGER;
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

CREATE TRIGGER trg_booking_capacity
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_capacity();


-- ============================================================
-- ТРИГГЕР: уведомления клиентам при отмене занятия
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_schedule_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- срабатывает, когда статус занятия меняется на cancelled
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT
            b.client_id,
            'class_cancelled',
            'Занятие отменено',
            'Занятие ' || ds.name || ' по ' ||
                CASE NEW.day_of_week
                    WHEN 1 THEN 'понедельникам'
                    WHEN 2 THEN 'вторникам'
                    WHEN 3 THEN 'средам'
                    WHEN 4 THEN 'четвергам'
                    WHEN 5 THEN 'пятницам'
                    WHEN 6 THEN 'субботам'
                    ELSE 'воскресеньям'
                END || ' ' || NEW.start_time ||
            ' отменено. Причина: ' || COALESCE(NEW.cancel_reason, 'не указана'),
            jsonb_build_object(
                'scheduleId', NEW.id,
                'bookingId',  b.id,
                'dayOfWeek',  NEW.day_of_week,
                'startTime',  NEW.start_time
            )
        FROM bookings b
        JOIN dance_styles ds ON ds.id = NEW.dance_style_id
        WHERE b.schedule_id = NEW.id
          AND b.status = 'booked';
    END IF;

    -- при переносе
    IF NEW.status = 'rescheduled' AND OLD.status <> 'rescheduled' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT
            b.client_id,
            'class_rescheduled',
            'Занятие перенесено',
            'Занятие ' || ds.name || ' перенесено. Проверьте новое расписание.',
            jsonb_build_object(
                'oldScheduleId', NEW.id,
                'newScheduleId', NEW.rescheduled_to
            )
        FROM bookings b
        JOIN dance_styles ds ON ds.id = NEW.dance_style_id
        WHERE b.schedule_id = NEW.id
          AND b.status = 'booked';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_cancel_notify
    AFTER UPDATE OF status ON schedule
    FOR EACH ROW EXECUTE FUNCTION notify_on_schedule_cancel();

-- ============================================================
-- ТРИГГЕР: уведомление клиенту при решении по продлению
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_extension_decision()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            NEW.client_id,
            CASE WHEN NEW.status = 'approved'
                 THEN 'extension_approved'
                 ELSE 'extension_rejected' END,
            CASE WHEN NEW.status = 'approved'
                 THEN 'Продление одобрено'
                 ELSE 'Продление отклонено' END,
            COALESCE(NEW.admin_comment, ''),
            jsonb_build_object('requestId', NEW.id, 'membershipId', NEW.membership_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_extension_notify
    AFTER UPDATE OF status ON membership_extension_requests
    FOR EACH ROW EXECUTE FUNCTION notify_on_extension_decision();

-- ============================================================
-- ТРИГГЕР: уведомление получателю о новом сообщении в чате
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        NEW.receiver_id,
        'new_message',
        'Новое сообщение',
        LEFT(NEW.content, 100),
        jsonb_build_object('messageId', NEW.id, 'senderId', NEW.sender_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_notify
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ============================================================
-- ТРИГГЕР: уведомление всем клиентам при публикации новости
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_news_publish()
RETURNS TRIGGER AS $$
DECLARE
    v_should_notify BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_should_notify := NEW.is_published;
    ELSE
        v_should_notify := NEW.is_published AND NOT OLD.is_published;
    END IF;

    IF v_should_notify THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT id, 'news_published', 'Новость студии', NEW.title,
               jsonb_build_object('newsId', NEW.id)
        FROM users WHERE role = 'client' AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_news_notify
    AFTER INSERT OR UPDATE OF is_published ON news
    FOR EACH ROW EXECUTE FUNCTION notify_on_news_publish();

-- ============================================================
-- АВТОГЕНЕРАЦИЯ client_code для клиентов
-- (формат: CL-000001)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

CREATE OR REPLACE FUNCTION assign_client_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'client' AND (NEW.client_code IS NULL OR NEW.client_code = '') THEN
        NEW.client_code := 'CL-' || LPAD(nextval('client_code_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_client_code
    BEFORE INSERT OR UPDATE OF role ON users
    FOR EACH ROW EXECUTE FUNCTION assign_client_code();

-- ============================================================
-- VIEW: история посещений клиента
-- ============================================================
CREATE OR REPLACE VIEW v_client_visit_history AS
SELECT
    b.id              AS booking_id,
    b.client_id,
    u.full_name       AS client_name,
    s.id              AS schedule_id,
    b.class_date AS date,
    s.start_time,
    s.end_time,
    ds.name           AS dance_style,
    h.name            AS hall,
    tu.full_name      AS trainer_name,
    b.status          AS booking_status,
    a.is_present,
    a.marked_at,
    b.checked_in_at
FROM bookings b
JOIN users u              ON u.id = b.client_id
JOIN schedule s           ON s.id = b.schedule_id
JOIN dance_styles ds      ON ds.id = s.dance_style_id
JOIN halls h              ON h.id = s.hall_id
JOIN trainers t           ON t.id = s.trainer_id
JOIN users tu             ON tu.id = t.user_id
LEFT JOIN attendance a    ON a.booking_id = b.id;

-- ============================================================
-- VIEW: актуальные абонементы клиентов
-- ============================================================
CREATE OR REPLACE VIEW v_client_memberships AS
SELECT
    m.id,
    m.client_id,
    u.full_name      AS client_name,
    mt.name          AS membership_type,
    m.start_date,
    m.end_date,
    m.remaining_visits,
    m.status,
    (m.end_date - CURRENT_DATE) AS days_left
FROM memberships m
JOIN users u              ON u.id = m.client_id
JOIN membership_types mt  ON mt.id = m.membership_type_id;

-- ============================================================
-- VIEW: список записавшихся на занятие (для тренера)
-- ============================================================
CREATE OR REPLACE VIEW v_schedule_clients AS
SELECT
    b.id              AS booking_id,
    b.schedule_id,
    b.client_id,
    u.full_name       AS client_name,
    u.phone           AS client_phone,
    u.client_code,
    u.qr_token        AS client_qr_token,
    b.status          AS booking_status,
    a.is_present,
    a.marked_at
FROM bookings b
JOIN users u              ON u.id = b.client_id
LEFT JOIN attendance a    ON a.booking_id = b.id;
