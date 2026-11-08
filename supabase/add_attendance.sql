-- =====================================================================
-- Attendance table (run once in Supabase: SQL Editor -> New query -> Run)
-- Safe to run more than once.
-- One row per student per school day. Saving the same student+day again
-- updates the existing row, so there are never duplicates.
-- =====================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
  student_id       TEXT        NOT NULL,   -- students.id (no foreign key: a student must not block saving attendance)
  attendance_date  DATE        NOT NULL,
  section          TEXT        NOT NULL,   -- e.g. '9A'
  status           TEXT        NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Permission')),
  note             TEXT,
  recorded_by      TEXT,                   -- teacher name
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_section_date
  ON attendance_records (section, attendance_date DESC);

CREATE OR REPLACE FUNCTION set_attendance_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance_records;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_attendance_updated_at();

-- Row Level Security: read, add and change records. Deleting is NOT allowed,
-- so attendance history cannot be wiped with the public key.
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read attendance"   ON attendance_records;
DROP POLICY IF EXISTS "Insert attendance" ON attendance_records;
DROP POLICY IF EXISTS "Update attendance" ON attendance_records;
CREATE POLICY "Read attendance"   ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Insert attendance" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Update attendance" ON attendance_records FOR UPDATE USING (true) WITH CHECK (true);

-- Live updates between devices (a teacher's phone and the office computer)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
  END IF;
END $$;
