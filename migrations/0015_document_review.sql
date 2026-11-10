-- Replacing verification evidence must invalidate the previous approval atomically.
CREATE TRIGGER profile_government_document_changed AFTER UPDATE OF govt_id_file ON profiles
WHEN NEW.govt_id_file IS NOT OLD.govt_id_file
BEGIN
  UPDATE profiles SET govt_id_status=CASE WHEN NEW.govt_id_file IS NULL OR NEW.govt_id_file='' THEN NULL ELSE 'pending' END,
    is_verified=0 WHERE user_id=NEW.user_id;
END;

CREATE TRIGGER profile_degree_document_changed AFTER UPDATE OF degree_file ON profiles
WHEN NEW.degree_file IS NOT OLD.degree_file
BEGIN
  UPDATE profiles SET degree_status=CASE WHEN NEW.degree_file IS NULL OR NEW.degree_file='' THEN NULL ELSE 'pending' END,
    is_verified=0 WHERE user_id=NEW.user_id;
END;
