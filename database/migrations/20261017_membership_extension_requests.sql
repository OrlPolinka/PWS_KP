ALTER TABLE membership_extension_requests
  ALTER COLUMN requested_days DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS requested_visits INTEGER,
  ADD COLUMN IF NOT EXISTS requested_unit VARCHAR(10) NOT NULL DEFAULT 'days';

ALTER TABLE membership_extension_requests
  DROP CONSTRAINT IF EXISTS membership_extension_requests_requested_days_check,
  ADD CONSTRAINT chk_extension_request_quantity CHECK (
    (requested_unit = 'days' AND requested_days > 0 AND requested_visits IS NULL)
    OR
    (requested_unit = 'visits' AND requested_visits > 0 AND requested_days IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_ext_req_membership_pending
  ON membership_extension_requests(membership_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION notify_on_extension_decision()
RETURNS TRIGGER AS $$
DECLARE
  decision_message TEXT;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    IF NEW.status = 'approved' THEN
      decision_message := CASE
        WHEN NEW.requested_unit = 'visits'
          THEN 'К абонементу добавлено занятий: ' || NEW.requested_visits || '.'
        ELSE 'К абонементу добавлено дней: ' || NEW.requested_days || '.'
      END;
    ELSE
      decision_message := 'Запрос на продление абонемента отклонён.';
    END IF;

    IF NEW.admin_comment IS NOT NULL AND NEW.admin_comment <> '' THEN
      decision_message := decision_message || ' Комментарий администратора: ' || NEW.admin_comment;
    END IF;

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.client_id,
      CASE WHEN NEW.status = 'approved' THEN 'extension_approved' ELSE 'extension_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'Продление одобрено' ELSE 'Продление отклонено' END,
      decision_message,
      jsonb_build_object('requestId', NEW.id, 'membershipId', NEW.membership_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_extension_notify ON membership_extension_requests;
CREATE TRIGGER trg_extension_notify
  AFTER UPDATE OF status ON membership_extension_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_extension_decision();
