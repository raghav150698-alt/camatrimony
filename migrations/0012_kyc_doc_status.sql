-- Per-document KYC review status on profiles (approve govt ID and degree separately).

ALTER TABLE profiles ADD COLUMN govt_id_status TEXT DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN degree_status TEXT DEFAULT 'pending';

-- Existing uploads awaiting review
UPDATE profiles SET govt_id_status = 'pending' WHERE govt_id_file IS NOT NULL AND (govt_id_status IS NULL OR govt_id_status = '');
UPDATE profiles SET degree_status = 'pending' WHERE degree_file IS NOT NULL AND (degree_status IS NULL OR degree_status = '');
