-- Local dev: default super-admin account for the admin panel.
-- Login: username `admin` / password `admin123`
-- Re-runnable via INSERT OR REPLACE.

INSERT OR REPLACE INTO admin_accounts (id, username, password_hash, display_name, email, role, is_active)
VALUES (
  'super-admin-local',
  'admin',
  'pbkdf2:uDpz0f5B9t1pllDz/TbYpw==:3LlXCYcERHqqs2GX9TuUhWOMUVhTb2Mh2ci9M+tBzhI=',
  'Local Super Admin',
  'admin@camatrimonybncn.com',
  'super_admin',
  1
);

-- admin_audit_log.admin_id FK references users(id)
INSERT OR REPLACE INTO users (id, email, role, status)
VALUES (
  'super-admin-local',
  'admin@camatrimonybncn.com',
  'super_admin',
  'active'
);
