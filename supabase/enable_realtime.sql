-- Live updates between the website and the database.
-- The website listens for changes on these tables, but Supabase only sends changes for tables that are
-- in the "supabase_realtime" publication. Run this once in Supabase -> SQL Editor. It is safe to re-run.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY[
      'teachers', 'grade_sections', 'registrations_2019',
      'students', 'student_marks', 'timetable_slots', 'attendance_records'
    ]
    LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
         AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
