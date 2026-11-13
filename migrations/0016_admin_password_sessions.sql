-- Password changes revoke all sessions for that dedicated admin account atomically.
CREATE TRIGGER admin_password_revoke_sessions
AFTER UPDATE OF password_hash ON admin_accounts
WHEN OLD.password_hash IS NOT NEW.password_hash
BEGIN
  DELETE FROM admin_sessions WHERE admin_id = NEW.id;
END;
