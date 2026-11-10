-- ==============================================================================
-- Hailemariam Mamo Secondary & Prep School - Supabase Database Schema
-- Run this in your Supabase Project: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (School Staff, Administrators, Students, Guardians)
-- NOTE: Add administrators manually in this table (or via Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_amharic TEXT,
  role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'SubAdmin', 'Teacher', 'Student', 'Parent')),
  role_title TEXT DEFAULT 'Principal & School Director',
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- For manual administrator entry in Supabase Table Editor
  phone TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password column exists on already-created tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. Teachers Table (Managed by School Director)
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_amharic TEXT,
  department TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  qualification TEXT,
  avatar TEXT,
  office_hours TEXT,
  is_online BOOLEAN DEFAULT false,
  sections_teaching TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure sections_teaching column exists on already-created teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS sections_teaching TEXT[];

-- 4. Grade Sections Table
CREATE TABLE IF NOT EXISTS grade_sections (
  id TEXT PRIMARY KEY,
  grade INT NOT NULL CHECK (grade BETWEEN 9 AND 12),
  section_code TEXT NOT NULL UNIQUE, -- e.g. '9A', '9B', '11-Nat-A'
  section_letter TEXT NOT NULL,       -- e.g. 'A', 'B'
  stream TEXT NOT NULL,               -- 'General Secondary', 'Natural Science', 'Social Science'
  stream_amharic TEXT,
  total_students INT DEFAULT 0,
  male_students INT DEFAULT 0,
  female_students INT DEFAULT 0,
  capacity INT DEFAULT 45,            -- seats in the classroom (editable by the registrar)
  homeroom_teacher_name TEXT,
  room_number TEXT,
  building_block TEXT,
  shift TEXT DEFAULT 'Morning Shift (ጧት)',
  subject_assignments JSONB DEFAULT '[]'::jsonb,
  student_monitors JSONB DEFAULT '{"classMonitor": "To be elected", "deputyMonitor": "To be elected"}'::jsonb,
  academic_year TEXT DEFAULT '2019 E.C.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 2019 E.C. Registered Students Table (Registrar Office)
CREATE TABLE IF NOT EXISTS registrations_2019 (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_amharic TEXT,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  target_grade INT NOT NULL CHECK (target_grade BETWEEN 9 AND 12),
  stream TEXT,
  academic_year TEXT DEFAULT '2019 E.C.',
  previous_school TEXT,
  previous_grade INT,
  previous_score NUMERIC(5,2),
  guardian_name TEXT,
  guardian_phone TEXT,
  conduct CHAR(1) DEFAULT 'A' CHECK (conduct IN ('A', 'B', 'C', 'D')),
  allocated_section TEXT,
  registration_date DATE DEFAULT CURRENT_DATE,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Weekly Timetable Slots Table
CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period INT NOT NULL CHECK (period BETWEEN 1 AND 7),
  section_code TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_teacher_day_period UNIQUE (teacher_id, day, period)
);

-- 7. Active Enrolled Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_amharic TEXT,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  grade INT NOT NULL,
  section TEXT NOT NULL,
  stream TEXT,
  academic_year TEXT DEFAULT '2018 E.C.',
  rank INT,
  attendance_rate NUMERIC(4,1) DEFAULT 95.0,
  conduct CHAR(1) DEFAULT 'A',
  homeroom_teacher TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Student Subject Marks & Assessments Table
CREATE TABLE IF NOT EXISTS student_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  continuous_assessment NUMERIC(4,1) DEFAULT 0 CHECK (continuous_assessment BETWEEN 0 AND 30),
  mid_exam NUMERIC(4,1) DEFAULT 0 CHECK (mid_exam BETWEEN 0 AND 20),
  final_exam NUMERIC(4,1) DEFAULT 0 CHECK (final_exam BETWEEN 0 AND 50),
  total_score NUMERIC(5,1) GENERATED ALWAYS AS (continuous_assessment + mid_exam + final_exam) STORED,
  letter_grade CHAR(1),
  custom_assessments JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_subject_semester UNIQUE (student_id, subject_id, semester)
);

-- ==============================================================================
-- 9. Row-Level Security (RLS) & Performance Policies
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations_2019 ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;

-- Allow read access
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read grade_sections" ON grade_sections;
CREATE POLICY "Public read grade_sections" ON grade_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read teachers" ON teachers;
CREATE POLICY "Public read teachers" ON teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read registrations_2019" ON registrations_2019;
CREATE POLICY "Public read registrations_2019" ON registrations_2019 FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read timetable_slots" ON timetable_slots;
CREATE POLICY "Public read timetable_slots" ON timetable_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read students" ON students;
CREATE POLICY "Public read students" ON students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read student_marks" ON student_marks;
CREATE POLICY "Public read student_marks" ON student_marks FOR SELECT USING (true);

-- Allow full write/upsert permissions for application operations
DROP POLICY IF EXISTS "Allow write profiles" ON profiles;
CREATE POLICY "Allow write profiles" ON profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write teachers" ON teachers;
CREATE POLICY "Allow write teachers" ON teachers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write registrations_2019" ON registrations_2019;
CREATE POLICY "Allow write registrations_2019" ON registrations_2019 FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write timetable_slots" ON timetable_slots;
CREATE POLICY "Allow write timetable_slots" ON timetable_slots FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write grade_sections" ON grade_sections;
CREATE POLICY "Allow write grade_sections" ON grade_sections FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write students" ON students;
CREATE POLICY "Allow write students" ON students FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write student_marks" ON student_marks;
CREATE POLICY "Allow write student_marks" ON student_marks FOR ALL USING (true);

-- Initial Administrator Seed (Can be replaced or customized in Supabase Table Editor)
INSERT INTO profiles (full_name, full_name_amharic, role, role_title, email, password, phone)
VALUES (
  'Berhanu Wolde Mengesha',
  'ብርሃኑ ወልደ መንገሻ',
  'Admin',
  'Principal & School Director',
  'director@hailemariammamo.edu.et',
  'debberhan2017',
  '+251 91 142 5566'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password = EXCLUDED.password;


-- ---------------------------------------------------------------
-- Attendance (also available alone as supabase/add_attendance.sql)
-- ---------------------------------------------------------------
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


-- CTE ranked choices (also available alone as supabase/add_cte_choices.sql)
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_choices        TEXT;  -- ranked, best first, separated by |
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_specialization TEXT;  -- track the student was placed in
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_rank           INT;   -- which choice was granted (1-4)
ALTER TABLE registrations_2019 ADD COLUMN IF NOT EXISTS cte_section        TEXT;  -- e.g. 11-CTE-WD

-- CTE sections (also available alone as supabase/add_cte_sections.sql)
ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS is_cte_section     BOOLEAN DEFAULT false;
ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS cte_specialization TEXT;  -- e.g. 'Web Design and Development'
UPDATE grade_sections SET is_cte_section = true WHERE section_code LIKE '%-CTE-%' AND is_cte_section IS NOT TRUE;


-- Live updates for every table the website listens to (also available alone as supabase/enable_realtime.sql)
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY[
      'teachers', 'grade_sections', 'registrations_2019', 'registrations', 'school_settings',
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
