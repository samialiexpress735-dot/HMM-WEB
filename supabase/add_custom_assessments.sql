-- ==============================================================================
-- Per-column marks (Quiz, Assignment, Mid, Final, ...) on student_marks.
-- Run ONCE in the Supabase SQL Editor. Safe to run more than once.
-- Without it the app still works, but the individual columns are only remembered on the
-- device that typed them; with it every device sees exactly the marks that were typed.
-- ==============================================================================

ALTER TABLE student_marks ADD COLUMN IF NOT EXISTS custom_assessments JSONB;
