-- Migration 0011: Onboarding / partner prefs parity (NO-OP on current prod).
--
-- Verified remote D1 `camatrimony-db` already has:
--   partner_age_range, partner_caste, partner_education, partner_income_min (0001_init)
--   govt_id_file, degree_file (0001_init)
--   is_onboarding_completed (0009_onboarding_completed)
--
-- D1/SQLite does NOT support `ADD COLUMN IF NOT EXISTS`. Re-applying ALTER TABLE
-- for any of the above WILL fail with "duplicate column name".
--
-- This file intentionally contains no schema changes. Keep it so local migration
-- history documents that onboarding parity was checked (2026-07-19).
--
-- Ops: do NOT run destructive ALTERs here. If a fresh environment is missing
-- columns, apply 0001_init + 0009_onboarding_completed instead.

SELECT 1 AS onboarding_schema_parity_ok;
