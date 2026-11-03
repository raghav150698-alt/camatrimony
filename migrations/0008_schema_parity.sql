-- Migration 0008: Schema parity for columns that 0005_fixes.sql left as comments.
--
-- Remote/production D1 already has these columns (applied manually earlier).
-- Fresh local DBs need them. D1/SQLite does NOT support `ADD COLUMN IF NOT EXISTS`,
-- so re-applying this migration on an already-migrated database WILL fail with
-- "duplicate column name". Ops: skip 0008 on prod if columns already exist, or
-- apply statements individually after checking PRAGMA table_info.

-- user_subscriptions: remaining unlocks + mediation addon
ALTER TABLE user_subscriptions ADD COLUMN contact_limit_balance INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN has_mediation INTEGER DEFAULT 0;

-- profiles: time-limited featured status
ALTER TABLE profiles ADD COLUMN is_featured_until TIMESTAMP;

-- users: password auth + soft delete
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

-- support_tickets: admin-only notes
ALTER TABLE support_tickets ADD COLUMN admin_notes TEXT;
