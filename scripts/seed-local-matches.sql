-- Local dev seed: demo candidates for the Matches (/dashboard) catalog.
-- Re-runnable — removes prior seed-* rows first.
-- Only users with status = 'active' appear in GET /v1/profiles.

DELETE FROM user_subscriptions WHERE user_id LIKE 'seed-match-%';
DELETE FROM profiles WHERE user_id LIKE 'seed-match-%';
DELETE FROM users WHERE id LIKE 'seed-match-%';

-- ── Users ────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, phone, role, status, login_count, last_login_at, created_at, updated_at)
VALUES
  ('seed-match-sriya',  'sriya.k@example.com',   '+91 88888 77777', 'user', 'active', 8,  datetime('now', '-1 hour'),  datetime('now', '-90 days'), datetime('now')),
  ('seed-match-rohit',  'rohit.m@example.com',   '+91 99999 44444', 'user', 'active', 12, datetime('now', '-3 hours'), datetime('now', '-120 days'), datetime('now')),
  ('seed-match-neha',   'neha.cs@example.com',   '+91 77777 12345', 'user', 'active', 9,  datetime('now', '-6 hours'), datetime('now', '-60 days'), datetime('now')),
  ('seed-match-rohan',  'rohan.cfa@example.com', '+91 66666 12345', 'user', 'active', 4,  datetime('now', '-1 day'),   datetime('now', '-150 days'), datetime('now')),
  ('seed-match-aditya', 'aditya.ca@example.com', '+91 91234 56789', 'user', 'active', 6,  datetime('now', '-2 days'),  datetime('now', '-45 days'), datetime('now')),
  ('seed-match-kavya',  'kavya.cma@example.com', '+91 98765 43210', 'user', 'active', 3,  datetime('now', '-4 days'),  datetime('now', '-30 days'), datetime('now'));

-- ── Profiles (active, verified catalog entries) ─────────────────────────────
INSERT INTO profiles (
  user_id, full_name, profile_created_by, gender, diet, age, height, weight,
  marital_status, mother_tongue, religion, caste, subcaste, gothram,
  birth_date, birth_time, birth_place, rasi, nakshatram, kuja_dosham, physical_status,
  highest_degree, employed_in, occupation, annual_income, work_location,
  address, city, state, country, is_nri,
  family_status, family_type, family_values,
  father_occupation, mother_occupation, sibling_count,
  partner_age_range, partner_caste, partner_education, partner_income_min,
  completion_percentage, govt_id_file, degree_file, photos, payment_proof_url,
  is_verified, is_featured, about_me, last_active_at, is_onboarding_completed,
  created_at
) VALUES
(
  'seed-match-sriya', 'Sriya K.', 'Self', 'Female', 'Vegetarian', 27, '5ft 4in', 52,
  'Never Married', 'Telugu', 'Hindu', 'Brahmin', 'Smartha', 'Srivatsa',
  '1999-09-21', '08:30', 'Mumbai, MH', 'Mesha (Aries)', 'Ashwini', 'No', 'Normal',
  'Company Secretary (CS)', 'Private Sector', 'CFO, Tech firm', '₹20 - ₹30 LPA', 'Mumbai, MH',
  NULL, 'Mumbai', 'Maharashtra', 'India', 0,
  'Upper-Middle Class', 'Nuclear', 'Moderate',
  'Retired Bank Officer', 'Homemaker', 1,
  '28 - 32 Yrs', 'Open to All', 'CA / CS / MBA', '₹15 - ₹20 LPA',
  95, NULL, NULL, '["https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=600&fit=crop&crop=face","https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 1,
  'Dynamic Company Secretary and CFO at a thriving technology startup in Mumbai. Loves classical music and light travel.',
  datetime('now', '-1 hour'), 1, datetime('now', '-90 days')
),
(
  'seed-match-rohit', 'Rohit M.', 'Self', 'Male', 'Vegetarian', 29, '5ft 10in', 72,
  'Never Married', 'Telugu', 'Hindu', 'Reddy', 'Gudati', 'Siva',
  '1997-03-12', '06:15', 'Hyderabad, TS', 'Meena (Pisces)', 'Revati', 'No', 'Normal',
  'Chartered Accountant (CA)', 'Private Sector', 'Senior Investment Advisor', '₹20 - ₹30 LPA', 'Bangalore, KA',
  NULL, 'Bangalore', 'Karnataka', 'India', 0,
  'Upper-Middle Class', 'Nuclear', 'Traditional',
  'Business Owner', 'Teacher', 0,
  '24 - 28 Yrs', 'Reddy / Brahmin', 'CA / CFA', '₹15 - ₹20 LPA',
  92, NULL, NULL, '["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 1,
  'Investment professional qualified as CA and CFA. Based in Bangalore; enjoys running and reading.',
  datetime('now', '-3 hours'), 1, datetime('now', '-120 days')
),
(
  'seed-match-neha', 'Neha S.', 'Self', 'Female', 'Non-Veg', 26, '5ft 3in', 50,
  'Never Married', 'Hindi', 'Hindu', 'Khatri', 'Sarin', 'Vatsa',
  '2000-01-05', '14:20', 'Delhi', 'Makara (Capricorn)', 'Shravana', 'No', 'Normal',
  'Company Secretary (CS)', 'Private Sector', 'Compliance Officer', '₹10 - ₹15 LPA', 'Delhi NCR',
  NULL, 'Delhi', 'Delhi', 'India', 0,
  'Middle Class', 'Nuclear', 'Liberal',
  'Government Employee', 'Homemaker', 2,
  '27 - 31 Yrs', 'Open to All', 'CS / CA', '₹10 - ₹15 LPA',
  88, NULL, NULL, '["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 0,
  'CS professional working with corporate listings. Energetic, optimistic, and family-centric.',
  datetime('now', '-6 hours'), 1, datetime('now', '-60 days')
),
(
  'seed-match-rohan', 'Rohan V.', 'Self', 'Male', 'Vegetarian', 31, '5ft 11in', 78,
  'Never Married', 'Telugu', 'Hindu', 'Vaishya', 'Arya', 'Bharadwaja',
  '1995-11-20', '05:45', 'Hyderabad, TS', 'Dhanu (Sagittarius)', 'Purva Ashadha', 'No', 'Normal',
  'CFA L3 / Chartered Analyst', 'Private Sector', 'Investment Banker', '₹30 LPA+', 'London, UK',
  NULL, 'London', NULL, 'United Kingdom', 1,
  'Rich / Business Family', 'Joint', 'Traditional',
  'Industrialist', 'Social Worker', 1,
  '25 - 30 Yrs', 'Open to All', 'CA / CFA / MBA', '₹20 - ₹30 LPA',
  90, NULL, NULL, '["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=600&fit=crop&crop=face","https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 1,
  'Investment banker in London. Travel enthusiast, foodie, and chess lover seeking a like-minded partner.',
  datetime('now', '-1 day'), 1, datetime('now', '-150 days')
),
(
  'seed-match-aditya', 'Aditya R.', 'Parent', 'Male', 'Vegetarian', 28, '5ft 9in', 70,
  'Never Married', 'Telugu', 'Hindu', 'Brahmin', 'Niyogi', 'Kasyapa',
  '1998-07-04', '07:00', 'Hyderabad, TS', 'Karka (Cancer)', 'Pushya', 'No', 'Normal',
  'Chartered Accountant (CA)', 'Private Sector', 'Senior Consultant, Big 4', '₹15 - ₹20 LPA', 'Hyderabad, Telangana',
  NULL, 'Hyderabad', 'Telangana', 'India', 0,
  'Upper-Middle Class', 'Nuclear', 'Moderate',
  'Chartered Accountant', 'Doctor', 1,
  '24 - 27 Yrs', 'Brahmin', 'CA / CS', '₹10 - ₹15 LPA',
  94, NULL, NULL, '["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 0,
  'Senior consultant at a Big 4 firm in Hyderabad. Values tradition with a modern professional outlook.',
  datetime('now', '-2 days'), 1, datetime('now', '-45 days')
),
(
  'seed-match-kavya', 'Kavya P.', 'Self', 'Female', 'Vegetarian', 25, '5ft 5in', 54,
  'Never Married', 'Telugu', 'Hindu', 'Kapu', NULL, NULL,
  '2001-02-14', '09:30', 'Visakhapatnam, AP', 'Kumbha (Aquarius)', 'Dhanishta', 'Don''t Know', 'Normal',
  'Cost Accountant (CMA)', 'Govt Sector', 'Finance Manager, PSU', '₹10 - ₹15 LPA', 'Visakhapatnam, AP',
  NULL, 'Visakhapatnam', 'Andhra Pradesh', 'India', 0,
  'Middle Class', 'Joint', 'Traditional',
  'Farmer', 'Teacher', 3,
  '26 - 30 Yrs', 'Kapu / Reddy', 'CA / CMA', '₹10 - ₹15 LPA',
  86, NULL, NULL, '["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=600&fit=crop&crop=face"]', NULL,
  1, 0,
  'CMA working with a PSU in Vizag. Grounded, family-oriented, and passionate about community service.',
  datetime('now', '-4 days'), 1, datetime('now', '-30 days')
);
