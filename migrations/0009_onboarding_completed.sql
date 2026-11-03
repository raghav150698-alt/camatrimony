-- Migration 0009: Persist onboarding completion on profiles.
--
-- Remote/production D1 may already have this column if applied manually.
-- D1/SQLite does NOT support `ADD COLUMN IF NOT EXISTS`, so re-applying
-- this migration on an already-migrated database WILL fail with
-- "duplicate column name". Ops: skip 0009 on prod if the column exists
-- (check with PRAGMA table_info(profiles)), or apply after verifying.

ALTER TABLE profiles ADD COLUMN is_onboarding_completed INTEGER DEFAULT 0;
