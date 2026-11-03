-- Add contact_limit_balance to user_subscriptions for tracking remaining unlocks
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE user_subscriptions ADD COLUMN contact_limit_balance INTEGER DEFAULT 0;

-- Add mediation_addon flag to user_subscriptions
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE user_subscriptions ADD COLUMN has_mediation INTEGER DEFAULT 0;

-- Add is_featured_until to profiles for time-limited featured status
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE profiles ADD COLUMN is_featured_until TIMESTAMP;

-- Add password_hash to users for future password-based auth
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Add deleted_at to users for soft delete
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

-- Add admin_notes to support_tickets
-- NOTE: skipped idempotently if the column already exists in the remote DB.
-- ALTER TABLE support_tickets ADD COLUMN admin_notes TEXT;

