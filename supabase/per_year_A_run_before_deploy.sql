-- =====================================================================================
-- PER-YEAR MIGRATION, PHASE A  -  run this FIRST, before the new website code is deployed.
-- Order: 1) back up  2) run THIS file  3) check the CHECK queries at the bottom  4) deploy the new code
--        5) run per_year_B_run_after_deploy.sql right after the deploy.
-- Purely additive. The CURRENT website keeps working while and after this runs.
-- Nothing is dropped, nothing is deleted, registrations_2019 is only read.
-- Safe to run more than once.
-- Take a Supabase backup/export first.
-- =====================================================================================

-- A1. The current academic year lives in the database, so a rollover reaches every device
--     at once and needs no code change or redeploy. Years are stored as E.C. digits: '2019'.
CREATE TABLE IF NOT EXISTS school_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO school_settings (key, value) VALUES ('current_academic_year', '2019')
ON CONFLICT (key) DO NOTHING;

-- Anything inserted without a year gets the CURRENT year, never a hard-coded one.
CREATE OR REPLACE FUNCTION current_academic_year() RETURNS TEXT
LANGUAGE sql STABLE AS $$ SELECT value FROM school_settings WHERE key = 'current_academic_year' $$;

-- A2. One permanent admission table for every year. The class is NOT stored here.
CREATE TABLE IF NOT EXISTS registrations (
  id                 TEXT PRIMARY KEY,
  academic_year      TEXT NOT NULL DEFAULT current_academic_year() CHECK (academic_year ~ '^[0-9]{4}$'),
  student_id         TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  full_name_amharic  TEXT,
  gender             CHAR(1) CHECK (gender IN ('M', 'F')),
  target_grade       INT NOT NULL CHECK (target_grade BETWEEN 9 AND 12),
  stream             TEXT,
  previous_school    TEXT,
  previous_grade     INT,
  previous_score     NUMERIC(5,2),
  guardian_name      TEXT,
  guardian_phone     TEXT,
  conduct            CHAR(1) DEFAULT 'A' CHECK (conduct IN ('A', 'B', 'C', 'D')),
  cte_choices        TEXT,                 -- ranked CTE wishes, separated by |  (the INPUT; the result lives on students)
  registration_date  DATE DEFAULT CURRENT_DATE,
  avatar             TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT registrations_year_student_unique UNIQUE (academic_year, student_id)
);

-- Copy 2019. registrations_2019 stays exactly as it is (it is only read).
INSERT INTO registrations (id, academic_year, student_id, full_name, full_name_amharic, gender, target_grade,
                           stream, previous_school, previous_grade, previous_score, guardian_name, guardian_phone,
                           conduct, cte_choices, registration_date, avatar, created_at, updated_at)
SELECT id, '2019', student_id, full_name, full_name_amharic, gender, target_grade,
       stream, previous_school, previous_grade, previous_score, guardian_name, guardian_phone,
       conduct, cte_choices, registration_date, avatar, created_at, updated_at
FROM registrations_2019
ON CONFLICT (id) DO NOTHING;

-- A3. Classes belong to a year too ('9A' exists every year).
UPDATE grade_sections
   SET academic_year = COALESCE(substring(academic_year from '([0-9]{4})[^0-9]*$'), '2019')
 WHERE academic_year IS NULL OR academic_year !~ '^[0-9]{4}$';
ALTER TABLE grade_sections ALTER COLUMN academic_year SET DEFAULT current_academic_year();

-- A4. students = the active roster of ONE year. New columns only.
ALTER TABLE students ADD COLUMN IF NOT EXISTS section_code       TEXT;  -- full class code, e.g. '9A', '11-Nat-A'. NULL = waiting
ALTER TABLE students ADD COLUMN IF NOT EXISTS cte_section        TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cte_specialization TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cte_rank           INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_id    TEXT;  -- link to the admission record (no cascade)
-- A student who leaves during the year is marked inactive, never deleted. Marks and record stay.
ALTER TABLE students ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS left_date   DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS left_reason TEXT;

-- Year as E.C. digits. Rule: a year written with "E.C" or "ዓ.ም" is read as it is; otherwise a student that
-- has a 2019 registration is 2019, everything else is 2018.  CHECK THE PREVIEW QUERY BELOW FIRST.
--   SELECT academic_year, count(*) FROM students GROUP BY 1;
UPDATE students s
   SET academic_year = COALESCE(
         CASE
           WHEN s.academic_year ~ '(E\.?C|ዓ)' THEN substring(s.academic_year from '([0-9]{4})[^0-9]*$')
           WHEN EXISTS (SELECT 1 FROM registrations_2019 r WHERE r.id = s.id) THEN '2019'
           ELSE '2018'
         END, '2018')
 WHERE s.academic_year IS NULL OR s.academic_year !~ '^[0-9]{4}$';
ALTER TABLE students ALTER COLUMN academic_year SET DEFAULT current_academic_year();

-- Move the placement result from the registration onto the student.
UPDATE students s SET section_code = r.allocated_section
  FROM registrations_2019 r
 WHERE r.id = s.id AND s.section_code IS NULL AND r.allocated_section IS NOT NULL;

UPDATE students s SET cte_section = r.cte_section, cte_specialization = r.cte_specialization, cte_rank = r.cte_rank
  FROM registrations_2019 r
 WHERE r.id = s.id AND s.cte_section IS NULL AND r.cte_section IS NOT NULL;

-- Students without a registration (last year's roster): work the code out from grade + letter (+ stream).
UPDATE students s SET section_code = g.section_code
  FROM grade_sections g
 WHERE s.section_code IS NULL AND s.section IS NOT NULL
   AND g.grade = s.grade AND g.section_letter = s.section AND g.academic_year = s.academic_year
   AND g.is_cte_section IS NOT TRUE
   AND (s.grade < 11 OR g.stream = s.stream);

UPDATE students s SET registration_id = s.id
 WHERE s.registration_id IS NULL AND EXISTS (SELECT 1 FROM registrations r WHERE r.id = s.id);

-- A5. Marks, attendance and timetable are tagged with their year (nothing removed).
ALTER TABLE student_marks ADD COLUMN IF NOT EXISTS academic_year TEXT;
UPDATE student_marks m SET academic_year = s.academic_year
  FROM students s WHERE s.student_id = m.student_id AND m.academic_year IS NULL;
ALTER TABLE student_marks ALTER COLUMN academic_year SET DEFAULT current_academic_year();

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS academic_year TEXT;
UPDATE attendance_records a SET academic_year = s.academic_year
  FROM students s WHERE s.id = a.student_id AND a.academic_year IS NULL;
ALTER TABLE attendance_records ALTER COLUMN academic_year SET DEFAULT current_academic_year();

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT current_academic_year();
-- (existing slots are taken to be the current year's timetable)

-- A5b. The NEW "per year" rules, added next to the old ones. Each is a superset of an old rule, so every existing row
--      already satisfies it and the current website keeps working. The new website needs them (it saves with
--      "on conflict (student_id, academic_year, subject_id, semester)"). The old rules are dropped in Phase B.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_year_student_unique') THEN
    ALTER TABLE students ADD CONSTRAINT students_year_student_unique UNIQUE (student_id, academic_year);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_marks_year_unique') THEN
    ALTER TABLE student_marks ADD CONSTRAINT student_marks_year_unique UNIQUE (student_id, academic_year, subject_id, semester);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_sections_year_code_unique') THEN
    ALTER TABLE grade_sections ADD CONSTRAINT grade_sections_year_code_unique UNIQUE (academic_year, section_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timetable_year_teacher_slot_unique') THEN
    ALTER TABLE timetable_slots ADD CONSTRAINT timetable_year_teacher_slot_unique UNIQUE (academic_year, teacher_id, day, period);
  END IF;
END $$;

-- A6. Same access pattern as the other tables (see the security note in the plan).
ALTER TABLE registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read registrations"   ON registrations;
DROP POLICY IF EXISTS "Allow write registrations"   ON registrations;
DROP POLICY IF EXISTS "Public read school_settings" ON school_settings;
DROP POLICY IF EXISTS "Allow write school_settings" ON school_settings;
CREATE POLICY "Public read registrations"   ON registrations   FOR SELECT USING (true);
CREATE POLICY "Allow write registrations"   ON registrations   FOR ALL    USING (true);
CREATE POLICY "Public read school_settings" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Allow write school_settings" ON school_settings FOR ALL    USING (true);

-- =====================================================================================
-- CHECKS to read after Phase A (they only SELECT):
--   -- 1. every 2019 registration was copied (expect 0 rows):
--   SELECT r.id FROM registrations_2019 r LEFT JOIN registrations n ON n.id = r.id WHERE n.id IS NULL;
--   -- 2. placed in registrations_2019 but with NO students row: needs a manual look (these are NOT auto-created):
--   SELECT r.id, r.full_name, r.allocated_section FROM registrations_2019 r
--     WHERE r.allocated_section IS NOT NULL AND NOT EXISTS (SELECT 1 FROM students s WHERE s.id = r.id);
--   -- 3. students that have a class letter but no class code could be derived (expect 0, or explain each):
--   SELECT id, full_name, grade, section, academic_year FROM students WHERE section IS NOT NULL AND section_code IS NULL;
--   -- 4. marks without a year (expect 0):
--   SELECT count(*) FROM student_marks WHERE academic_year IS NULL;
-- =====================================================================================
