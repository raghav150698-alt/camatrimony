-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Firebase UID
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role TEXT DEFAULT 'user', -- 'user', 'admin'
  status TEXT DEFAULT 'pending_verification', -- 'pending_verification', 'active', 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  profile_created_by TEXT NOT NULL DEFAULT 'Self',
  gender TEXT NOT NULL,
  diet TEXT DEFAULT 'Vegetarian',
  age INTEGER NOT NULL,
  height TEXT NOT NULL,
  weight INTEGER,
  marital_status TEXT DEFAULT 'Never Married',
  religion TEXT DEFAULT 'Hindu',
  caste TEXT NOT NULL,
  subcaste TEXT,
  gothram TEXT,
  birth_date TEXT,
  birth_time TEXT,
  birth_place TEXT,
  rasi TEXT,
  nakshatram TEXT,
  kuja_dosham TEXT DEFAULT 'No',
  highest_degree TEXT NOT NULL,
  employed_in TEXT DEFAULT 'Private Sector',
  occupation TEXT NOT NULL,
  annual_income TEXT NOT NULL,
  work_location TEXT NOT NULL,
  is_nri INTEGER DEFAULT 0, -- 0 = False, 1 = True
  family_status TEXT DEFAULT 'Upper-Middle Class',
  family_type TEXT DEFAULT 'Nuclear',
  father_occupation TEXT,
  mother_occupation TEXT,
  sibling_count INTEGER DEFAULT 0,
  partner_age_range TEXT,
  partner_caste TEXT,
  partner_education TEXT,
  partner_income_min TEXT,
  completion_percentage INTEGER DEFAULT 0,
  govt_id_file TEXT,
  degree_file TEXT,
  photos TEXT, -- JSON array of file strings
  is_verified INTEGER DEFAULT 0, -- 0 = False, 1 = True
  is_featured INTEGER DEFAULT 0, -- 0 = False, 1 = True
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create Packages Table
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  contact_limit INTEGER NOT NULL,
  chat_allowed INTEGER DEFAULT 1 -- 0 = False, 1 = True
);

-- 4. Create Contact Unlocks Table
CREATE TABLE IF NOT EXISTS contact_unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  unlocked_user_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unlocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, unlocked_user_id) -- Avoid duplicate deduct unlocks
);

-- 5. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, -- Razorpay Payment ID
  user_id TEXT NOT NULL,
  package_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'captured', 'failed', 'refunded'
  order_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- Seed Initial Default Packages
INSERT INTO packages (id, name, price, validity_days, contact_limit, chat_allowed)
VALUES 
  (1, 'Gold', 2999, 90, 20, 1),
  (2, 'Diamond', 4999, 180, 50, 1),
  (3, 'Platinum', 7999, 365, 9999, 1)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  price = excluded.price,
  validity_days = excluded.validity_days,
  contact_limit = excluded.contact_limit,
  chat_allowed = excluded.chat_allowed;
