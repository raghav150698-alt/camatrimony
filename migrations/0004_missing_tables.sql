-- 1. Success Stories table (referenced by CMS API but doesn't exist)
CREATE TABLE IF NOT EXISTS success_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date TEXT,
  location TEXT,
  description TEXT NOT NULL,
  image_url TEXT,
  is_featured INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Admin Accounts table (referenced by admin auth but doesn't exist)
-- NOTE: Use bcryptjs or PBKDF2/Argon2id via Web Crypto. Native bcrypt cannot run in Workers.
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'moderator',
  is_active INTEGER DEFAULT 1,
  two_factor_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- 2a. Admin Sessions table (server-side token validation)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

-- 3. Photos table (for photo approval workflow)
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'profile', -- 'profile', 'govt_id', 'degree'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  visibility TEXT DEFAULT 'public', -- 'public', 'matches_only', 'password_protected'
  password_hash TEXT,
  rejection_reason TEXT,
  is_watermarked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Settings table (for privacy/notification preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  hide_profile INTEGER DEFAULT 0,
  hide_contact INTEGER DEFAULT 0,
  hide_income INTEGER DEFAULT 0,
  photo_visibility TEXT DEFAULT 'public',
  notify_interests INTEGER DEFAULT 1,
  notify_messages INTEGER DEFAULT 1,
  notify_kyc INTEGER DEFAULT 1,
  notify_payments INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Contact Submissions table (for contact form)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'read', 'responded', 'closed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Promo Codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
