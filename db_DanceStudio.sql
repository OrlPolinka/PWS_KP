
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

    requested_days  INTEGER CHECK (requested_days IS NULL OR requested_days > 0),
    requested_visits INTEGER CHECK (requested_visits IS NULL OR requested_visits > 0),
    requested_unit  VARCHAR(10) NOT NULL DEFAULT 'days'
                    CHECK (requested_unit IN ('days', 'visits')),
    reason          TEXT,

    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP,
    admin_comment   TEXT,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_extension_request_quantity CHECK (
        (requested_unit = 'days' AND requested_days > 0 AND requested_visits IS NULL)
        OR
        (requested_unit = 'visits' AND requested_visits > 0 AND requested_days IS NULL)
    )
);

CREATE INDEX idx_ext_req_status ON membership_extension_requests(status);
CREATE INDEX idx_ext_req_client ON membership_extension_requests(client_id);
CREATE INDEX idx_ext_req_membership_pending
    ON membership_extension_requests(membership_id)
    WHERE status = 'pending';


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
            CASE
              WHEN NEW.status = 'approved' AND NEW.requested_unit = 'visits'
                THEN 'К абонементу добавлено занятий: ' || NEW.requested_visits || '.'
              WHEN NEW.status = 'approved'
                THEN 'К абонементу добавлено дней: ' || NEW.requested_days || '.'
              ELSE 'Запрос на продление абонемента отклонён.'
            END ||
            CASE
              WHEN NEW.admin_comment IS NOT NULL AND NEW.admin_comment <> ''
                THEN ' Комментарий администратора: ' || NEW.admin_comment
              ELSE ''
            END,
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














select * from users





-- ============================================================
-- ЗАПОЛНЕНИЕ ТЕСТОВЫМИ ДАННЫМИ
-- ============================================================

-- ============================================================
-- 1. USERS: 1 админ, 3 тренера, 5 клиентов
-- ============================================================
INSERT INTO users (id, email, password_hash, role, full_name, phone, photo_url, is_active, created_at)
VALUES
    ('11111111-1111-4111-8111-111111111111', 'admin@studio.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin',   'Смирнова Ольга Петровна',    '+375291000001', NULL, TRUE, NOW() - INTERVAL '120 days'),

    ('22222222-2222-4222-8222-222222222221', 'anna@studio.com',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'trainer', 'Анна Зубарева',              '+375291000011', NULL, TRUE, NOW() - INTERVAL '100 days'),
    ('22222222-2222-4222-8222-222222222222', 'dmitry@studio.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'trainer', 'Дмитрий Смирнов',            '+375291000012', NULL, TRUE, NOW() - INTERVAL '90 days'),
    ('22222222-2222-4222-8222-222222222223', 'ekaterina@studio.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'trainer', 'Екатерина Иванова',          '+375291000013', NULL, TRUE, NOW() - INTERVAL '80 days'),

    ('33333333-3333-4333-8333-333333333331', 'veronika@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client',  'Шкиндер Вероника Валерьевна', '+3753333285371', NULL, TRUE, NOW() - INTERVAL '60 days'),
    ('33333333-3333-4333-8333-333333333332', 'ivan@mail.com',        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client',  'Иванов Иван Иванович',       '+375291000021', NULL, TRUE, NOW() - INTERVAL '45 days'),
    ('33333333-3333-4333-8333-333333333333', 'maria@mail.com',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client',  'Мария Иванова',              '+375291000022', NULL, TRUE, NOW() - INTERVAL '30 days'),
    ('33333333-3333-4333-8333-333333333334', 'pavel@mail.com',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client',  'Павел Орлов',                '+375291000023', NULL, TRUE, NOW() - INTERVAL '20 days'),
    ('33333333-3333-4333-8333-333333333335', 'olga@mail.com',        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client',  'Ольга Смирнова',             '+375291000024', NULL, FALSE, NOW() - INTERVAL '15 days');

-- вручную зададим client_code для клиентов (обычно генерируется триггером,
-- но при явном указании id триггер всё равно сработает; здесь — на случай отладки)
UPDATE users SET client_code = 'CL-000001' WHERE id = '33333333-3333-4333-8333-333333333331';
UPDATE users SET client_code = 'CL-000002' WHERE id = '33333333-3333-4333-8333-333333333332';
UPDATE users SET client_code = 'CL-000003' WHERE id = '33333333-3333-4333-8333-333333333333';
UPDATE users SET client_code = 'CL-000004' WHERE id = '33333333-3333-4333-8333-333333333334';
UPDATE users SET client_code = 'CL-000005' WHERE id = '33333333-3333-4333-8333-333333333335';

-- ============================================================
-- 2. TRAINERS
-- ============================================================
INSERT INTO trainers (id, user_id, specialization, bio, experience_years, education, achievements, photo_url, video_url, gallery, certificates, social_links, custom_page_title, custom_page_content, hired_at, is_published)
VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
     '22222222-2222-4222-8222-222222222221',
     'Зумба, Дэнсхолл, Тверк',
     'Сертифицированный инструктор Zumba с международным сертификатом. Веду группы всех уровней.',
     8, 'БГУФК, факультет оздоровительной физической культуры', 'Победительница всероссийских конкурсов по зумбе',
     'https://cdn.studio.com/trainers/anna.jpg', 'https://youtu.be/anna-promo',
     '[{"type":"image","url":"https://cdn.studio.com/trainers/anna-1.jpg"},{"type":"image","url":"https://cdn.studio.com/trainers/anna-2.jpg"}]'::jsonb,
     '[{"title":"Zumba Basic 1","year":2018},{"title":"Zumba Toning","year":2020}]'::jsonb,
     '[{"platform":"instagram","url":"https://instagram.com/anna"},{"platform":"telegram","url":"https://t.me/anna"}]'::jsonb,
     'Анна Зубарева — тренер по зумбе',
     'Анна работает с 2018 года, специализируется на групповых программах.',
     CURRENT_DATE - INTERVAL '100 days', TRUE),

    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
     '22222222-2222-4222-8222-222222222222',
     'Хип-хоп, K-Pop, Хай-хилс',
     'Участник команды Street Dance Crew. Выступал на международных фестивалях.',
     5, 'Минский колледж искусств', 'Финалист чемпионата Беларуси по хип-хопу',
     'https://cdn.studio.com/trainers/dmitry.jpg', NULL,
     '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
     NULL, NULL,
     CURRENT_DATE - INTERVAL '90 days', TRUE),

    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
     '22222222-2222-4222-8222-222222222223',
     'Контемпорари, Стрэтчинг, Балет-фитнес',
     'Профессиональный хореограф с образованием в Академии балета. 8 лет преподавательского опыта.',
     8, 'Академия русского балета им. А.Я. Вагановой', 'Лауреат международных конкурсов',
     'https://cdn.studio.com/trainers/ekaterina.jpg', 'https://youtu.be/ekaterina-promo',
     '[{"type":"video","url":"https://youtu.be/ekaterina-demo","thumbnail":"https://cdn.studio.com/trainers/ekaterina-thumb.jpg"}]'::jsonb,
     '[{"title":"Contemporary Advanced","year":2016}]'::jsonb,
     '[]'::jsonb,
     NULL, NULL,
     CURRENT_DATE - INTERVAL '80 days', TRUE);

-- ============================================================
-- 3. HALLS
-- ============================================================
INSERT INTO halls (id, name, capacity, description, is_active) VALUES
    (1, 'Большой танцевальный зал', 18, 'Зал 120 м², зеркала, профессиональный звук', TRUE),
    (2, 'Зал для растяжки и йоги',   12, 'Тёплый пол, мягкое освещение, инвентарь',  TRUE),
    (3, 'Хип-хоп студия',            15, 'Зал 90 м², покрытие для уличных стилей',    TRUE);

SELECT setval('halls_id_seq', (SELECT MAX(id) FROM halls));

-- ============================================================
-- 4. DANCE_STYLES
-- ============================================================
INSERT INTO dance_styles (id, name, description, cover, gallery, benefits, difficulty) VALUES
    (1, 'Хип-хоп',
        'Уличный стиль, энергичные связки, импровизация',
        '{"type":"video","url":"https://youtu.be/hiphop-promo","thumbnail":"https://cdn.studio.com/styles/hiphop.jpg"}'::jsonb,
        '[{"type":"image","url":"https://cdn.studio.com/styles/hiphop-1.jpg"},{"type":"video","url":"https://youtu.be/hiphop-lesson","thumbnail":"https://cdn.studio.com/styles/hiphop-thumb.jpg"}]'::jsonb,
        '["Развивает координацию","Сжигает до 600 ккал","Учит импровизации"]'::jsonb,
        'intermediate'),

    (2, 'Контемпорари',
        'Современная хореография, работа с телом и эмоцией',
        '{"type":"image","url":"https://cdn.studio.com/styles/contemporary.jpg"}'::jsonb,
        '[{"type":"image","url":"https://cdn.studio.com/styles/contemporary-1.jpg"}]'::jsonb,
        '["Развивает пластику","Учит выражать эмоции"]'::jsonb,
        'advanced'),

    (3, 'Зумба',
        'Энергичная фитнес-программа на основе латиноамериканских ритмов',
        '{"type":"image","url":"https://cdn.studio.com/styles/zumba.jpg"}'::jsonb,
        '[]'::jsonb,
        '["Сжигает до 800 ккал","Поднимает настроение"]'::jsonb,
        'beginner'),

    (4, 'Стрэтчинг',
        'Тренировка на растяжку и гибкость, шпагат',
        '{"type":"image","url":"https://cdn.studio.com/styles/stretching.jpg"}'::jsonb,
        '[]'::jsonb,
        '["Улучшает гибкость","Профилактика травм"]'::jsonb,
        'beginner'),

    (5, 'Балет-фитнес',
        'Фитнес на основе балетных упражнений',
        '{"type":"image","url":"https://cdn.studio.com/styles/ballet.jpg"}'::jsonb,
        '[]'::jsonb,
        '["Формирует осанку","Укрепляет мышцы кора"]'::jsonb,
        'beginner');

SELECT setval('dance_styles_id_seq', (SELECT MAX(id) FROM dance_styles));

-- ============================================================
-- 5. SCHEDULE: занятия в прошлом, настоящем, будущем
-- ============================================================
INSERT INTO schedule (id, trainer_id, hall_id, dance_style_id, date, start_time, end_time, max_capacity, status, created_by, created_at)
VALUES
    -- ПРОШЛЫЕ (status = completed)
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 3, 3, CURRENT_DATE - 7,  '18:00', '19:00', 15, 'completed', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '20 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 3, 1, CURRENT_DATE - 5,  '19:00', '20:30', 15, 'completed', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '20 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 1, 2, CURRENT_DATE - 3,  '18:00', '19:30', 18, 'completed', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '20 days'),

    -- ОТМЕНЁННОЕ
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 3, 3, CURRENT_DATE - 1,  '18:00', '19:00', 15, 'cancelled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '15 days'),

    -- СЕГОДНЯШНИЕ (scheduled)
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 1, 2, CURRENT_DATE,      '14:00', '15:30', 18, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '10 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 2, 4, CURRENT_DATE,      '18:00', '19:00', 12, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '10 days'),

    -- БУДУЩИЕ
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 3, 1, CURRENT_DATE + 1,  '19:00', '20:30', 15, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '5 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 3, 3, CURRENT_DATE + 2,  '18:00', '19:00', 15, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '5 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb009', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 1, 2, CURRENT_DATE + 3,  '18:00', '19:30', 18, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '5 days'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb010', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 2, 4, CURRENT_DATE + 4,  '11:00', '12:00', 12, 'scheduled', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '5 days');

-- обновим статус «прошедших» занятий
UPDATE schedule SET status = 'completed'
WHERE date < CURRENT_DATE AND status = 'scheduled';

-- ============================================================
-- 6. MEMBERSHIP_TYPES
-- ============================================================
INSERT INTO membership_types (id, name, description, price, visit_count, duration_days, is_active) VALUES
    (1, 'Пробное занятие',      'Одно занятие для знакомства',                     5.00,  1,   7,  TRUE),
    (2, '5 занятий',            '5 групповых занятий, срок 30 дней',             100.00,  5,  30,  TRUE),
    (3, '10 занятий',           '10 групповых занятий, срок 60 дней',            190.00, 10,  60,  TRUE),
    (4, '20 занятий',           '20 групповых занятий, срок 90 дней',            285.00, 20,  90,  TRUE),
    (5, 'Безлимит на месяц',    'Неограниченное число занятий, срок 30 дней',    350.00, NULL, 30, TRUE),
    (6, 'Персональная тренировка', 'Индивидуальное занятие с тренером',          45.00,  1,   7,  TRUE);

SELECT setval('membership_types_id_seq', (SELECT MAX(id) FROM membership_types));

-- ============================================================
-- 7. PAYMENTS (успешные, один pending)
-- ============================================================
INSERT INTO payments (id, user_id, amount, status, provider, provider_payment_id, description, metadata, created_at) VALUES
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '33333333-3333-4333-8333-333333333331', 100.00, 'succeeded', 'stripe', 'pi_test_001', 'Оплата абонемента «5 занятий»',  '{"card_last4":"4242","card_brand":"visa"}'::jsonb, NOW() - INTERVAL '20 days'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '33333333-3333-4333-8333-333333333331', 350.00, 'succeeded', 'stripe', 'pi_test_002', 'Оплата безлимита на месяц',     '{"card_last4":"4242","card_brand":"visa"}'::jsonb, NOW() - INTERVAL '5 days'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '33333333-3333-4333-8333-333333333332', 190.00, 'succeeded', 'stripe', 'pi_test_003', 'Оплата абонемента «10 занятий»', '{"card_last4":"5555","card_brand":"mastercard"}'::jsonb, NOW() - INTERVAL '10 days'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', '33333333-3333-4333-8333-333333333333', 100.00, 'succeeded', 'stripe', 'pi_test_004', 'Оплата абонемента «5 занятий»',  '{}'::jsonb, NOW() - INTERVAL '8 days'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', '33333333-3333-4333-8333-333333333334', 285.00, 'pending',   'stripe', 'pi_test_005', 'Оплата абонемента «20 занятий»', '{}'::jsonb, NOW() - INTERVAL '1 hour');

-- ============================================================
-- 8. MEMBERSHIPS
-- ============================================================
INSERT INTO memberships (id, client_id, membership_type_id, payment_id, purchase_date, start_date, end_date, remaining_visits, status, price_paid) VALUES
    -- Вероника: старый абонемент (5 занятий, почти закончился)
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd001', '33333333-3333-4333-8333-333333333331', 2, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', NOW() - INTERVAL '20 days', CURRENT_DATE - 20, CURRENT_DATE + 10, 2, 'active', 100.00),
    -- Вероника: новый безлимит
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd002', '33333333-3333-4333-8333-333333333331', 5, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', NOW() - INTERVAL '5 days',  CURRENT_DATE - 5,  CURRENT_DATE + 25, NULL, 'active', 350.00),
    -- Иван: 10 занятий
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd003', '33333333-3333-4333-8333-333333333332', 3, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', NOW() - INTERVAL '10 days', CURRENT_DATE - 10, CURRENT_DATE + 50, 7, 'active', 190.00),
    -- Мария: 5 занятий
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd004', '33333333-3333-4333-8333-333333333333', 2, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4', NOW() - INTERVAL '8 days',  CURRENT_DATE - 8,  CURRENT_DATE + 22, 3, 'active', 100.00),
    -- Павел: безлимит, но истёк
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd005', '33333333-3333-4333-8333-333333333334', 5, NULL,                                  NOW() - INTERVAL '60 days', CURRENT_DATE - 60, CURRENT_DATE - 30, NULL, 'expired', 350.00);

-- ============================================================
-- 9. MEMBERSHIP_EXTENSION_REQUESTS
-- ============================================================
INSERT INTO membership_extension_requests (id, membership_id, client_id, requested_days, reason, status, reviewed_by, reviewed_at, admin_comment, created_at) VALUES
    -- Вероника просит продлить старый абонемент — отклонено
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'dddddddd-dddd-4ddd-8ddd-ddddddddd001', '33333333-3333-4333-8333-333333333331', 14, 'Болела, не успела отходить', 'rejected', '11111111-1111-4111-8111-111111111111', NOW() - INTERVAL '3 days', 'К сожалению, продление по болезни не предусмотрено', NOW() - INTERVAL '5 days'),
    -- Иван просит продлить — pending
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'dddddddd-dddd-4ddd-8ddd-ddddddddd003', '33333333-3333-4333-8333-333333333332', 7,  'Уезжал в командировку',      'pending',  NULL, NULL, NULL, NOW() - INTERVAL '1 day');

-- ============================================================
-- 10. BOOKINGS
-- ============================================================
INSERT INTO bookings (id, schedule_id, client_id, membership_id, booked_at, status, checked_in, checked_in_at, checked_in_by) VALUES
    -- Прошлое занятие №1 (зумба, completed) — Вероника пришла
    ('ffffffff-ffff-4fff-8fff-fffffffffff1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', '33333333-3333-4333-8333-333333333331', 'dddddddd-dddd-4ddd-8ddd-ddddddddd001', NOW() - INTERVAL '10 days', 'attended', TRUE, NOW() - INTERVAL '7 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
    -- Прошлое занятие №1 — Мария пришла
    ('ffffffff-ffff-4fff-8fff-fffffffffff2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', '33333333-3333-4333-8333-333333333333', 'dddddddd-dddd-4ddd-8ddd-ddddddddd004', NOW() - INTERVAL '9 days',  'attended', TRUE, NOW() - INTERVAL '7 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),

    -- Прошлое занятие №2 (хип-хоп) — Иван пришёл
    ('ffffffff-ffff-4fff-8fff-fffffffffff3', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', '33333333-3333-4333-8333-333333333332', 'dddddddd-dddd-4ddd-8ddd-ddddddddd003', NOW() - INTERVAL '8 days',  'attended', TRUE, NOW() - INTERVAL '5 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),

    -- Прошлое занятие №3 (контемпорари) — Мария НЕ пришла
    ('ffffffff-ffff-4fff-8fff-fffffffffff4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', '33333333-3333-4333-8333-333333333333', 'dddddddd-dddd-4ddd-8ddd-ddddddddd004', NOW() - INTERVAL '6 days',  'no_show',  FALSE, NULL, NULL),

    -- Сегодняшнее занятие №5 (контемпорари) — Вероника, Иван записаны
    ('ffffffff-ffff-4fff-8fff-fffffffffff5', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005', '33333333-3333-4333-8333-333333333331', 'dddddddd-dddd-4ddd-8ddd-ddddddddd002', NOW() - INTERVAL '2 days',  'booked',   FALSE, NULL, NULL),
    ('ffffffff-ffff-4fff-8fff-fffffffffff6', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005', '33333333-3333-4333-8333-333333333332', 'dddddddd-dddd-4ddd-8ddd-ddddddddd003', NOW() - INTERVAL '1 day',   'booked',   FALSE, NULL, NULL),

    -- Будущее занятие №7 (хип-хоп) — Иван, Мария записаны
    ('ffffffff-ffff-4fff-8fff-fffffffffff7', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb007', '33333333-3333-4333-8333-333333333332', 'dddddddd-dddd-4ddd-8ddd-ddddddddd003', NOW() - INTERVAL '1 day',   'booked',   FALSE, NULL, NULL),
    ('ffffffff-ffff-4fff-8fff-fffffffffff8', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb007', '33333333-3333-4333-8333-333333333333', 'dddddddd-dddd-4ddd-8ddd-ddddddddd004', NOW(),                       'booked',   FALSE, NULL, NULL),

    -- Отменённая запись на отменённое занятие
    ('ffffffff-ffff-4fff-8fff-fffffffffff9', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004', '33333333-3333-4333-8333-333333333331', 'dddddddd-dddd-4ddd-8ddd-ddddddddd002', NOW() - INTERVAL '5 days',  'cancelled', FALSE, NULL, NULL);

UPDATE bookings SET cancelled_at = NOW() - INTERVAL '2 days', cancelled_by = '11111111-1111-4111-8111-111111111111'
WHERE id = 'ffffffff-ffff-4fff-8fff-fffffffffff9';

-- ============================================================
-- 11. ATTENDANCE (для attended и no_show)
-- ============================================================
INSERT INTO attendance (booking_id, trainer_id, is_present, marked_at, notes) VALUES
    ('ffffffff-ffff-4fff-8fff-fffffffffff1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', TRUE,  NOW() - INTERVAL '7 days', NULL),
    ('ffffffff-ffff-4fff-8fff-fffffffffff2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', TRUE,  NOW() - INTERVAL '7 days', NULL),
    ('ffffffff-ffff-4fff-8fff-fffffffffff3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', TRUE,  NOW() - INTERVAL '5 days', NULL),
    ('ffffffff-ffff-4fff-8fff-fffffffffff4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', FALSE, NOW() - INTERVAL '3 days', 'Клиент не предупредил');

-- Триггер decrement_membership_visits уже отработал и списал визиты.
-- Скорректируем remaining_visits вручную, чтобы данные выглядели аккуратно
UPDATE memberships SET remaining_visits = 2 WHERE id = 'dddddddd-dddd-4ddd-8ddd-ddddddddd001'; -- было 5, списали 2, оставим 2
UPDATE memberships SET remaining_visits = 7 WHERE id = 'dddddddd-dddd-4ddd-8ddd-ddddddddd003'; -- было 10, списали 1, оставим 7
UPDATE memberships SET remaining_visits = 3 WHERE id = 'dddddddd-dddd-4ddd-8ddd-ddddddddd004'; -- было 5, списали 1 attended + 1 no_show, оставим 3

-- ============================================================
-- 12. MESSAGES (диалоги)
-- ============================================================
INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at) VALUES
    -- Вероника ↔ Анна (тренер)
    ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'Здравствуйте! Подскажите, завтра занятие по зумбе в силе?', TRUE,  NOW() - INTERVAL '2 days'),
    ('22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333331', 'Да, всё в силе. Ждём вас в 18:00!',                          TRUE,  NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'Спасибо, буду!',                                              FALSE, NOW() - INTERVAL '1 day'),

    -- Иван ↔ Админ
    ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', 'Добрый день! Можно продлить абонемент на неделю?',   TRUE,  NOW() - INTERVAL '2 days'),
    ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', 'Здравствуйте! Оставьте запрос в личном кабинете.',    TRUE,  NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),

    -- Мария ↔ Екатерина
    ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222223', 'Извините, я не пришла на занятие. Можно перенести?',  TRUE,  NOW() - INTERVAL '3 days'),
    ('22222222-2222-4222-8222-222222222223', '33333333-3333-4333-8333-333333333333',
