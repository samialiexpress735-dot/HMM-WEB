-- =====================================================================================
-- PER-YEAR MIGRATION, PHASE B  -  run ONLY after the new website code is live and the Phase A checks are clean.
--           Run it right after the deploy: until it runs, registered-but-waiting students have no roster row yet.
-- Replaces the old "one global student" rules with "one student per year" rules.
-- Still no DROP TABLE, TRUNCATE or DELETE. Safe to run more than once.
-- =====================================================================================

-- B0. A student who is registered but not yet placed has no class. The website saves that as an empty text; this also
--     lets a row added by hand in the Supabase table editor leave the class empty without an error.
ALTER TABLE students ALTER COLUMN section DROP NOT NULL;

-- B1. Marks can no longer be wiped by deleting or emptying students.
--     Old: student_marks.student_id -> students(student_id) ON DELETE CASCADE
ALTER TABLE student_marks DROP CONSTRAINT IF EXISTS student_marks_student_id_fkey;

-- B2. Drop the OLD "global" rules (the per-year rules were added in Phase A).
--     After this, a returning student keeps one school ID and registers again every year.
ALTER TABLE students        DROP CONSTRAINT IF EXISTS students_student_id_key;
ALTER TABLE student_marks   DROP CONSTRAINT IF EXISTS unique_student_subject_semester;
ALTER TABLE grade_sections  DROP CONSTRAINT IF EXISTS grade_sections_section_code_key;
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS unique_teacher_day_period;

-- B3. Marks must point at a student-year, and a student-year that has marks CANNOT be deleted
--     (ON DELETE RESTRICT). Clear the marks on purpose first if you really mean it.
UPDATE student_marks SET academic_year = current_academic_year() WHERE academic_year IS NULL;  -- safety net, expect 0 rows
ALTER TABLE student_marks ALTER COLUMN academic_year SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_marks_student_year_fkey') THEN
    ALTER TABLE student_marks ADD CONSTRAINT student_marks_student_year_fkey
      FOREIGN KEY (student_id, academic_year) REFERENCES students (student_id, academic_year)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- B4. Registered-but-waiting students get their roster row (no class yet).
--     Registrations that WERE placed but have no students row are skipped on purpose (see Phase A check 2).
INSERT INTO students (id, student_id, full_name, full_name_amharic, gender, grade, section, section_code, stream,
                      academic_year, conduct, guardian_name, guardian_phone, avatar, registration_id)
SELECT r.id, r.student_id, r.full_name, r.full_name_amharic, r.gender, r.target_grade, '', NULL, r.stream,
       r.academic_year, r.conduct, r.guardian_name, r.guardian_phone, '', r.id
  FROM registrations r
 WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = r.id)
   AND NOT EXISTS (SELECT 1 FROM registrations_2019 o WHERE o.id = r.id AND o.allocated_section IS NOT NULL);

-- B5. Live updates for the new tables (the others are already in enable_realtime.sql).
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['registrations', 'school_settings'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
