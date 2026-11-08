-- ==============================================================================
-- Previous-year student matching: optional date of birth + link to previous record
-- Safe to run more than once. Run in Supabase -> SQL Editor.
-- ==============================================================================

ALTER TABLE students            ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE registrations_2019  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
-- Student ID of the previous-year record the administrator confirmed on registration
ALTER TABLE registrations_2019  ADD COLUMN IF NOT EXISTS previous_student_id TEXT;
