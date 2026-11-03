-- Migration: Add missing columns/indexes and seed default settings.
-- NOTE: This is an idempotent run. Columns that already exist from earlier
-- partial migrations are omitted here so the remote DB applies cleanly.

-- support_tickets: updated-at timestamp (other missing columns already exist)
ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_interests_sender ON interest_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver ON interest_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_user ON contact_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_unlocked ON contact_unlocks(unlocked_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON profiles(is_featured);

-- Seed default system settings used by the admin panel
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('razorpay_enabled', '1');
