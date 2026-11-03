-- Migration 0010: Manual-ops parity (Google Form fields + payment proof + settings)
-- D1/SQLite does NOT support ADD COLUMN IF NOT EXISTS.
-- Ops: skip individual ALTER statements that fail with "duplicate column name".

-- Profile field parity with Google Form biodata
ALTER TABLE profiles ADD COLUMN full_name TEXT;
ALTER TABLE profiles ADD COLUMN mother_tongue TEXT;
ALTER TABLE profiles ADD COLUMN physical_status TEXT DEFAULT 'Normal';
ALTER TABLE profiles ADD COLUMN address TEXT;
ALTER TABLE profiles ADD COLUMN city TEXT;
ALTER TABLE profiles ADD COLUMN state TEXT;
ALTER TABLE profiles ADD COLUMN country TEXT DEFAULT 'India';
ALTER TABLE profiles ADD COLUMN family_values TEXT;
ALTER TABLE profiles ADD COLUMN payment_proof_url TEXT;

-- Manual payment proof tracking on payments
ALTER TABLE payments ADD COLUMN proof_url TEXT;
ALTER TABLE payments ADD COLUMN payment_method TEXT DEFAULT 'razorpay';
ALTER TABLE payments ADD COLUMN admin_notes TEXT;
ALTER TABLE payments ADD COLUMN verified_by TEXT;
ALTER TABLE payments ADD COLUMN verified_at TIMESTAMP;

-- Align packages with client Google Form pricing (₹999/6mo, ₹1800/1yr)
UPDATE packages SET
  name = '6 Months',
  price = 999,
  validity_days = 180,
  contact_limit = 30,
  features = '["View up to 30 contacts","Safe chat with accepted matches","Profile listing for 6 months","Standard support"]'
WHERE id = 1;

UPDATE packages SET
  name = '1 Year',
  price = 1800,
  validity_days = 365,
  contact_limit = 75,
  features = '["View up to 75 contacts","Safe chat with accepted matches","Featured profile priority","Profile listing for 12 months","Priority support"]'
WHERE id = 2;

UPDATE packages SET is_active = 0 WHERE id = 3;

-- Manual payment + astrology CMS defaults (razorpay OFF until live keys)
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('razorpay_enabled', '0');
UPDATE cms_settings SET setting_value = '0' WHERE setting_key = 'razorpay_enabled';

INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('manual_payment_enabled', '1');
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('upi_id', '');
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('upi_qr_url', '');
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('payment_instructions', 'Pay via UPI to the ID shown below. Upload your payment screenshot for admin verification. Your plan activates after confirmation.');
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('bank_account_details', '');
INSERT OR IGNORE INTO cms_settings (setting_key, setting_value) VALUES ('astrology_match_enabled', '1');
