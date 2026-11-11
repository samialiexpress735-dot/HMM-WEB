-- ==============================================================================
-- Student bans (run once in the Supabase SQL Editor; safe to run more than once)
-- Lets the administrator ban a student. A banned student keeps their class and marks
-- but is blocked from the public grade portal. Without these columns the app still
-- works, but a ban is only kept on the device that set it.
-- ==============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS banned        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS banned_date   DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS banned_until  DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS banned_reason TEXT;
