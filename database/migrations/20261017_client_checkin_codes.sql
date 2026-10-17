CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

SELECT setval(
  'client_code_seq',
  COALESCE(MAX(substring(client_code FROM 4)::BIGINT), 1),
  MAX(substring(client_code FROM 4)::BIGINT) IS NOT NULL
)
FROM users
WHERE client_code ~ '^CL-[0-9]+$';

CREATE OR REPLACE FUNCTION assign_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' AND (NEW.client_code IS NULL OR NEW.client_code = '') THEN
    NEW.client_code := 'CL-' || LPAD(nextval('client_code_seq')::TEXT, 6, '0');
  END IF;
  IF NEW.role = 'client' AND NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_client_code ON users;
CREATE TRIGGER trg_user_client_code
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION assign_client_code();

UPDATE users
SET role = role
WHERE role = 'client' AND (client_code IS NULL OR qr_token IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_client_code
  ON users(client_code)
  WHERE client_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_qr_token
  ON users(qr_token)
  WHERE qr_token IS NOT NULL;
