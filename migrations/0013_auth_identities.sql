-- Keep existing D1 member IDs and all their relationships when changing auth provider.
CREATE TABLE auth_identities (
  provider TEXT NOT NULL CHECK(provider = 'supabase'),
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(provider, subject),
  UNIQUE(provider, user_id)
);

-- Explicit allow-list; a matching email alone never grants administrator access.
ALTER TABLE admin_accounts ADD COLUMN supabase_subject TEXT;
CREATE UNIQUE INDEX idx_admin_supabase_subject ON admin_accounts(supabase_subject) WHERE supabase_subject IS NOT NULL;
