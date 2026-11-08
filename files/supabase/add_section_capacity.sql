-- ==============================================================================
-- Seats (capacity) per class on grade_sections (run once in the Supabase SQL Editor)
-- Lets the registrar change how many seats a class has after it was created.
-- Without this column the app still works, but the seat count is only kept on the
-- device that set it and falls back to 45 when sections are loaded from the cloud.
-- ==============================================================================

ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 45;
