BEGIN;

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

COMMIT;