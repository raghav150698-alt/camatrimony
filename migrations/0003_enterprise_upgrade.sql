-- 1. Create Admin Roles Table for RBAC
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL, -- 'super_admin', 'moderator', 'support_agent'
  assigned_by TEXT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Create User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER NOT NULL,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  payment_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- 3. Create Interest Requests Table
CREATE TABLE IF NOT EXISTS interest_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'withdrawn'
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(sender_id, receiver_id)
);

-- 4. Create Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  favorited_user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, favorited_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (favorited_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'interest', 'message', 'kyc', 'system', 'payment'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER DEFAULT 0, -- 0 = False, 1 = True
  reference_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Create Mediation Requests Table
CREATE TABLE IF NOT EXISTS mediation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  preferred_date TEXT,
  preferred_time TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
  admin_notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Create Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Create Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'BAN', 'UNBAN', 'VERIFY_KYC', 'REJECT_KYC', 'PLAN_ASSIGN', 'REFUND'
  target_type TEXT NOT NULL, -- 'user', 'profile', 'payment', 'subscription', 'kyc', 'cms', 'settings'
  target_id TEXT,
  details TEXT, -- JSON string representation of diff or action details
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Billing', 'Profile Verification', 'Abuse/Harassment', 'Technical Issue', 'General'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  messages TEXT, -- JSON array of message objects: [{sender: 'user/admin', text: '...', sent_at: '...'}]
  assigned_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. ALTER Existing Tables with new columns
-- SQLite does not support adding multiple columns in one statement, so we use separate queries.
-- We wrap them in try-catch blocks or execute them directly during migrations.

-- Alter users table
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN notes TEXT;
ALTER TABLE users ADD COLUMN strikes INTEGER DEFAULT 0;

-- Alter profiles table
ALTER TABLE profiles ADD COLUMN about_me TEXT;
ALTER TABLE profiles ADD COLUMN profile_views_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMP;

-- Alter reports table
ALTER TABLE reports ADD COLUMN severity TEXT DEFAULT 'medium'; -- 'low', 'medium', 'high', 'critical'
ALTER TABLE reports ADD COLUMN admin_notes TEXT;
ALTER TABLE reports ADD COLUMN resolved_by TEXT;
ALTER TABLE reports ADD COLUMN resolved_at TIMESTAMP;

-- Alter packages table
ALTER TABLE packages ADD COLUMN is_active INTEGER DEFAULT 1; -- 0 = False, 1 = True
ALTER TABLE packages ADD COLUMN is_custom INTEGER DEFAULT 0; -- 0 = False, 1 = True
ALTER TABLE packages ADD COLUMN features TEXT DEFAULT '[]'; -- JSON array of feature descriptions
