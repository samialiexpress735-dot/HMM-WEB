-- =====================================================================
-- CTE ranked choices for registrations (run once in the Supabase SQL Editor)
-- Safe to run more than once.
-- =====================================================================
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_choices        TEXT;  -- ranked, best first, separated by |
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_specialization TEXT;  -- track the student was placed in
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_rank           INT;   -- which choice was granted (1-4)
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_section        TEXT;  -- e.g. 11-CTE-WD
