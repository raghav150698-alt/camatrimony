-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0, -- 0 = False, 1 = True
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id TEXT NOT NULL,
  reported_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create CMS Settings Table
CREATE TABLE IF NOT EXISTS cms_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);

-- Seed Default Settings
INSERT INTO cms_settings (setting_key, setting_value)
VALUES 
  ('logo_url', '/logo.png'),
  ('support_phone', '+91 6281 369 478'),
  ('support_email', 'support@camatrimonybncn.com'),
  ('support_address', 'Hyderabad, Telangana, India.')
ON CONFLICT(setting_key) DO UPDATE SET
  setting_value = excluded.setting_value;
