-- ==============================================================================
-- Hailemariam Mamo Secondary & Prep School (Debre Berhan)
-- ONE-CLICK SUPABASE DATABASE FIX SCRIPT
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project ("HMM")
-- 3. In the left sidebar, click "SQL Editor"
-- 4. Click "+ New query"
-- 5. Paste this entire script and click "RUN" (or Ctrl+Enter)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Teachers Table exists with correct primary key and columns
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_amharic TEXT,
  department TEXT NOT NULL DEFAULT 'Secondary Faculty',
  subject TEXT NOT NULL DEFAULT 'General',
  email TEXT,
  phone TEXT,
  qualification TEXT DEFAULT 'B.Ed. (Ethiopian University)',
  avatar TEXT DEFAULT '',
  office_hours TEXT DEFAULT 'Mon & Thu: 2:00 PM - 4:00 PM',
  is_online BOOLEAN DEFAULT false,
  sections_teaching TEXT[] DEFAULT ARRAY[]::TEXT[],
  grades_teaching INT[] DEFAULT ARRAY[9, 10, 11, 12]::INT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. If teachers table was already created, ensure ALL columns exist:
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS name_amharic TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Secondary Faculty';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT 'B.Ed. (Ethiopian University)';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS office_hours TEXT DEFAULT 'Mon & Thu: 2:00 PM - 4:00 PM';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS sections_teaching TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS grades_teaching INT[] DEFAULT ARRAY[9, 10, 11, 12]::INT[];

-- 4. In case 'id' column was created as BIGINT or UUID by default Supabase UI, convert it to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'id' AND data_type != 'text'
  ) THEN
    ALTER TABLE teachers ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
END $$;

-- 5. Grant Table Privileges to anon and authenticated roles
GRANT ALL ON TABLE teachers TO anon, authenticated, service_role;

-- 6. Configure Row Level Security (RLS) on Teachers Table
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Allow reading teachers
DROP POLICY IF EXISTS "Public read teachers" ON teachers;
CREATE POLICY "Public read teachers" ON teachers FOR SELECT USING (true);

-- Allow inserting new teachers from Web Portal (Fixes RLS write rejection error 42501)
DROP POLICY IF EXISTS "Allow write teachers" ON teachers;
CREATE POLICY "Allow write teachers" ON teachers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow insert teachers" ON teachers;
CREATE POLICY "Allow insert teachers" ON teachers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update teachers" ON teachers;
CREATE POLICY "Allow update teachers" ON teachers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete teachers" ON teachers;
CREATE POLICY "Allow delete teachers" ON teachers FOR DELETE USING (true);

-- ==============================================================================
-- 7. Fix Profiles Table (For Administrator Login & Verification)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_amharic TEXT,
  role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'SubAdmin', 'Teacher', 'Student', 'Parent')),
  role_title TEXT DEFAULT 'Principal & School Director',
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- Stores admin password for manual table management
  phone TEXT,
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password column exists on profiles table (Fixes ERROR 42703)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name_amharic TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_title TEXT DEFAULT 'Principal & School Director';

GRANT ALL ON TABLE profiles TO anon, authenticated, service_role;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write profiles" ON profiles;
CREATE POLICY "Allow write profiles" ON profiles FOR ALL USING (true);

-- ==============================================================================
-- 8. Force PostgREST schema cache to immediately recognize changes
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
