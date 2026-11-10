-- =====================================================================================
-- DEMO DATA SEED  -  Hailemariam Mamo School Portal
-- Run in Supabase -> SQL Editor -> New query -> paste everything -> Run.
--
-- WHAT IT ADDS (for the CURRENT academic year in school_settings, e.g. 2019 E.C.)
--   * 40 teachers
--       Natural Sciences (18): Mathematics 5, Physics 3, Chemistry 3, Biology 3, Agriculture 2, ICT 2
--       Social Sciences   (8): Geography 2, History 2, Civics 2, Economics 2
--       Languages         (8): English Language 5, Amharic 3
--       Physical Education(2)
--       CTE               (4): one teacher for each track (Web Design and Development, Marketing, Accounting, Construction)
--   * 2 Grade 11 classes:  11-NatA (Natural Science)  and  11-SocA (Social Science)
--   * 30 students in each class (15 boys + 15 girls)  = 60 students
--   * 4 CTE sections:  11-CTE-WD, 11-CTE-MKT, 11-CTE-ACC, 11-CTE-CST  (one per CTE track)
--   * Every student has 4 ranked CTE wishes (stored in registrations.cte_choices) and is placed the same way the
--     Registrar does it: best marks first, each student gets the highest wish that still has a seat.
--     Natural Science students mostly wish for Web Design / Construction, Social Science students for
--     Marketing / Accounting, so a few students end up with their 2nd or 3rd choice because Web Design fills up.
--   * Teachers are assigned to their subjects in each class, and homeroom teachers are set
--     (switch off with v_assign_teachers := FALSE below).
--   * Zero-mark rows for every student/subject/semester, so the teacher mark sheets open ready to type in.
--
-- REQUIRES the per-year database (supabase/per_year_A_run_before_deploy.sql already run). The script checks this.
-- SAFE TO RE-RUN: every demo row has an id that starts with "demo-" and existing rows are never overwritten.
-- TO REMOVE EVERYTHING it created: run the DELETE block at the very bottom of this file.
-- Teacher sign-in for the demo teachers: the staff passcode  debberhan2017  (or  <firstname>2017!  in lower case).
-- =====================================================================================


-- STEP 0 - make sure the database is ready ------------------------------------------------------------
DO $$
DECLARE
  v_missing TEXT;
BEGIN
  IF to_regclass('public.registrations') IS NULL OR to_regclass('public.school_settings') IS NULL THEN
    RAISE EXCEPTION 'Run supabase/per_year_A_run_before_deploy.sql first (tables "registrations" / "school_settings" are missing).';
  END IF;

  SELECT string_agg(v.t || '.' || v.c, ', ') INTO v_missing
    FROM (VALUES
      ('students', 'section_code'), ('students', 'cte_section'), ('students', 'cte_specialization'),
      ('students', 'cte_rank'), ('students', 'registration_id'), ('students', 'status'),
      ('grade_sections', 'is_cte_section'), ('grade_sections', 'cte_specialization'), ('grade_sections', 'capacity'),
      ('teachers', 'grades_teaching'), ('student_marks', 'academic_year')
    ) AS v(t, c)
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns k
                      WHERE k.table_schema = 'public' AND k.table_name = v.t AND k.column_name = v.c);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing columns: %. Run per_year_A_run_before_deploy.sql, add_cte_sections.sql, add_section_capacity.sql and fix_teachers_and_permissions.sql first.', v_missing;
  END IF;

  IF EXISTS (SELECT 1 FROM grade_sections
              WHERE academic_year = current_academic_year()
                AND section_code IN ('11-NatA', '11-SocA', '11-CTE-WD', '11-CTE-MKT', '11-CTE-ACC', '11-CTE-CST')
                AND id NOT LIKE 'demo-sec-%') THEN
    RAISE EXCEPTION 'This year already has a real section with one of the codes 11-NatA, 11-SocA, 11-CTE-WD, 11-CTE-MKT, 11-CTE-ACC or 11-CTE-CST. Nothing was added.';
  END IF;
END $$;


-- STEP 1 - 40 teachers ----------------------------------------------------------------------------------
INSERT INTO teachers (id, name, name_amharic, department, subject, email, phone, qualification, avatar,
                      office_hours, is_online, sections_teaching, grades_teaching)
SELECT 'demo-t-' || lpad(v.n::text, 2, '0'),
       v.name,
       v.name_am,
       v.dept,
       v.subj,
       lower(replace(v.name, ' ', '.')) || '@hailemariammamo.edu.et',
       '+251 91 ' || lpad(((v.n * 379 + 123) % 1000)::text, 3, '0') || ' ' || lpad(((v.n * 7919 + 4321) % 10000)::text, 4, '0'),
       CASE v.dept
         WHEN 'CTE' THEN 'Diploma / B.Sc. (TVET & industry experience)'
         WHEN 'Physical Education' THEN 'B.Ed. in Sport Science (Ethiopian University)'
         ELSE 'B.Ed. / B.Sc. (Ethiopian University)'
       END,
       '',
       'Mon & Thu: 2:00 PM - 4:00 PM',
       FALSE,
       ARRAY[]::TEXT[],
       CASE WHEN v.dept = 'CTE' THEN ARRAY[11, 12] ELSE ARRAY[9, 10, 11, 12] END
  FROM (VALUES
    -- Natural Sciences (18)
    (1,  'Abebe Kebede',        'አበበ ከበደ',        'Natural Sciences', 'Mathematics'),
    (2,  'Tigist Haile',        'ትግስት ኃይሌ',       'Natural Sciences', 'Mathematics'),
    (3,  'Getachew Bekele',     'ጌታቸው በቀለ',       'Natural Sciences', 'Mathematics'),
    (4,  'Hiwot Alemu',         'ህይወት አለሙ',       'Natural Sciences', 'Mathematics'),
    (5,  'Yohannes Mekonnen',   'ዮሐንስ መኮንን',      'Natural Sciences', 'Mathematics'),
    (6,  'Solomon Assefa',      'ሰለሞን አሰፋ',       'Natural Sciences', 'Physics'),
    (7,  'Mulugeta Desta',      'ሙሉጌታ ደስታ',       'Natural Sciences', 'Physics'),
    (8,  'Selam Tadesse',       'ሰላም ታደሰ',        'Natural Sciences', 'Physics'),
    (9,  'Tewodros Haile',      'ቴዎድሮስ ኃይሌ',      'Natural Sciences', 'Chemistry'),
    (10, 'Meron Worku',         'ሜሮን ወርቁ',        'Natural Sciences', 'Chemistry'),
    (11, 'Zerihun Alemayehu',   'ዘሪሁን አለማየሁ',     'Natural Sciences', 'Chemistry'),
    (12, 'Almaz Kebede',        'አልማዝ ከበደ',       'Natural Sciences', 'Biology'),
    (13, 'Habtamu Worku',       'ሃብታሙ ወርቁ',       'Natural Sciences', 'Biology'),
    (14, 'Birtukan Desta',      'ብርቱካን ደስታ',      'Natural Sciences', 'Biology'),
    (15, 'Fikru Negash',        'ፍቅሩ ነጋሽ',        'Natural Sciences', 'Agriculture'),
    (16, 'Mulu Gebremariam',    'ሙሉ ገብረማርያም',     'Natural Sciences', 'Agriculture'),
    (17, 'Nahom Bogale',        'ናሆም ቦጋለ',        'Natural Sciences', 'ICT'),
    (18, 'Rahel Tefera',        'ራሔል ተፈራ',        'Natural Sciences', 'ICT'),
    -- Social Sciences (8)
    (19, 'Mesfin Tilahun',      'መስፍን ጥላሁን',      'Social Sciences',  'Geography'),
    (20, 'Senait Mesfin',       'ሰናይት መስፍን',      'Social Sciences',  'Geography'),
    (21, 'Kidus Wolde',         'ቅዱስ ወልዴ',        'Social Sciences',  'History'),
    (22, 'Lidya Getachew',      'ሊዲያ ጌታቸው',       'Social Sciences',  'History'),
    (23, 'Tsegaye Abera',       'ጸጋዬ አበራ',        'Social Sciences',  'Civics'),
    (24, 'Bethlehem Assefa',    'ቤተልሔም አሰፋ',      'Social Sciences',  'Civics'),
    (25, 'Berhanu Lakew',       'ብርሃኑ ላቀው',       'Social Sciences',  'Economics'),
    (26, 'Frehiwot Negash',     'ፍሬህይወት ነጋሽ',     'Social Sciences',  'Economics'),
    -- Languages (8)
    (27, 'Daniel Yilma',        'ዳንኤል ይልማ',       'Languages',        'English Language'),
    (28, 'Mahlet Worku',        'ማህሌት ወርቁ',       'Languages',        'English Language'),
    (29, 'Eyob Lemma',          'ኢዮብ ለማ',         'Languages',        'English Language'),
    (30, 'Genet Tilahun',       'ገነት ጥላሁን',       'Languages',        'English Language'),
    (31, 'Girma Wondimu',       'ግርማ ወንዲሙ',       'Languages',        'English Language'),
    (32, 'Aster Wolde',         'አስቴር ወልዴ',       'Languages',        'Amharic'),
    (33, 'Bekele Tadesse',      'በቀለ ታደሰ',        'Languages',        'Amharic'),
    (34, 'Hanna Kebede',        'ሃና ከበደ',         'Languages',        'Amharic'),
    -- Physical Education (2)
    (35, 'Samuel Tesfaye',      'ሳሙኤል ተስፋዬ',      'Physical Education', 'Physical Education'),
    (36, 'Biniam Teshome',      'ብንያም ተሾመ',       'Physical Education', 'Physical Education'),
    -- CTE (4): one teacher per track
    (37, 'Dawit Alemu',         'ዳዊት አለሙ',        'CTE', 'CTE: Web Design and Development'),
    (38, 'Yonas Girma',         'ዮናስ ግርማ',        'CTE', 'CTE: Marketing'),
    (39, 'Ephrem Shiferaw',     'ኤፍሬም ሽፈራው',      'CTE', 'CTE: Accounting'),
    (40, 'Amanuel Gebre',       'አማኑኤል ገብሬ',      'CTE', 'CTE: Construction')
  ) AS v(n, name, name_am, dept, subj)
ON CONFLICT (id) DO NOTHING;


-- STEP 2 - sections, students, CTE placement, marks ------------------------------------------------------
DO $$
DECLARE
  -- ---- settings you can change ---------------------------------------------------------------------
  v_per_section     INT     := 30;     -- students in each of the 2 classes
  v_cte_capacity    INT     := 16;     -- seats in each CTE section (4 x 16 = 64 seats for 60 students)
  v_class_capacity  INT     := 45;     -- seats in each class
  v_assign_teachers BOOLEAN := TRUE;   -- fill in subject teachers and homeroom teachers
  -- --------------------------------------------------------------------------------------------------
  v_year   TEXT := current_academic_year();

  male_first    TEXT[] := ARRAY['Abel','Dawit','Yonas','Samuel','Henok','Biniam','Nahom','Eyob','Amanuel','Daniel',
                                'Ephrem','Kaleb','Natnael','Robel','Surafel','Mikias','Yididya','Fitsum','Tamirat','Bereket'];
  male_first_am TEXT[] := ARRAY['አቤል','ዳዊት','ዮናስ','ሳሙኤል','ሄኖክ','ብንያም','ናሆም','ኢዮብ','አማኑኤል','ዳንኤል',
                                'ኤፍሬም','ካሌብ','ናትናኤል','ሮቤል','ሱራፌል','ሚኪያስ','ይዲድያ','ፍጹም','ታምራት','በረከት'];
  fem_first     TEXT[] := ARRAY['Selam','Hiwot','Meron','Tigist','Rahel','Senait','Lidya','Bethlehem','Mahlet','Genet',
                                'Aster','Hanna','Eden','Blen','Saron','Mekdes','Kidist','Tsion','Helen','Nardos'];
  fem_first_am  TEXT[] := ARRAY['ሰላም','ህይወት','ሜሮን','ትግስት','ራሔል','ሰናይት','ሊዲያ','ቤተልሔም','ማህሌት','ገነት',
                                'አስቴር','ሃና','ኤደን','ብሌን','ሳሮን','መቅደስ','ቅድስት','ጽዮን','ሄለን','ናርዶስ'];
  fathers       TEXT[] := ARRAY['Kebede','Tadesse','Alemu','Haile','Desta','Bekele','Girma','Tesfaye','Mengistu','Wolde',
                                'Negash','Worku','Assefa','Tilahun','Gebre','Mekonnen','Teshome','Lemma','Shiferaw','Abera',
                                'Lakew','Wondimu','Yilma','Bogale','Tefera'];
  fathers_am    TEXT[] := ARRAY['ከበደ','ታደሰ','አለሙ','ኃይሌ','ደስታ','በቀለ','ግርማ','ተስፋዬ','መንግስቱ','ወልዴ',
                                'ነጋሽ','ወርቁ','አሰፋ','ጥላሁን','ገብሬ','መኮንን','ተሾመ','ለማ','ሽፈራው','አበራ',
                                'ላቀው','ወንዲሙ','ይልማ','ቦጋለ','ተፈራ'];

  tracks        TEXT[] := ARRAY['Web Design and Development', 'Marketing', 'Accounting', 'Construction'];
  track_codes   TEXT[] := ARRAY['WD', 'MKT', 'ACC', 'CST'];
  track_am      TEXT[] := ARRAY['ድረ-ገጽ ንድፍና ልማት', 'ማርኬቲንግ', 'አካውንቲንግ', 'ኮንስትራክሽን'];
  seats         INT[]  := ARRAY[0, 0, 0, 0];

  -- the subjects of each class (same lists the app uses for Grade 11-12)
  v_nat JSONB := '[
    {"subjectId":"eng","subjectName":"English Language","subjectAmharic":"እንግሊዝኛ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"bio","subjectName":"Biology","subjectAmharic":"ባዮሎጂ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"chem","subjectName":"Chemistry","subjectAmharic":"ኬሚስትሪ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"phys","subjectName":"Physics","subjectAmharic":"ፊዚክስ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"math","subjectName":"Mathematics","subjectAmharic":"ሒሳብ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":5},
    {"subjectId":"amh","subjectName":"Amharic Language","subjectAmharic":"አማርኛ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3},
    {"subjectId":"agri","subjectName":"Agriculture","subjectAmharic":"ግብርና","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3},
    {"subjectId":"it","subjectName":"Information Technology (IT)","subjectAmharic":"ኢንፎርሜሽን ቴክኖሎጂ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3},
    {"subjectId":"cte","subjectName":"Career & Technical Education (CTE)","subjectAmharic":"የስራና ቴክኒክ (CTE)","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3}
  ]'::jsonb;
  v_soc JSONB := '[
    {"subjectId":"eng","subjectName":"English Language","subjectAmharic":"እንግሊዝኛ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"math","subjectName":"Mathematics","subjectAmharic":"ሒሳብ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"geo","subjectName":"Geography","subjectAmharic":"ጂኦግራፊ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"hist","subjectName":"History","subjectAmharic":"ታሪክ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"econ","subjectName":"Economics","subjectAmharic":"ኢኮኖሚክስ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":4},
    {"subjectId":"it","subjectName":"Information Technology (IT)","subjectAmharic":"ኢንፎርሜሽን ቴክኖሎጂ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3},
    {"subjectId":"civ","subjectName":"Citizenship Education","subjectAmharic":"ስነ-ዜጋ","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3},
    {"subjectId":"cte","subjectName":"Career & Technical Education (CTE)","subjectAmharic":"የስራና ቴክኒክ (CTE)","teacherId":"","teacherName":"Unassigned","periodsPerWeek":3}
  ]'::jsonb;

  v_stream   TEXT;
  v_code     TEXT;
  v_subjects JSONB;
  v_out      JSONB;
  v_el       JSONB;
  v_tsub     TEXT;
  v_tid      TEXT;
  v_tname    TEXT;
  v_hr_nat   TEXT := 'To be assigned';
  v_hr_soc   TEXT := 'To be assigned';
  v_offset   INT;
  k INT; i INT := 0; idx INT; j INT; t INT; r INT;
  v_gender   CHAR(1);
  v_first TEXT; v_first_am TEXT; v_father TEXT; v_father_am TEXT; v_grand TEXT; v_grand_am TEXT;
  v_pattern  TEXT;
  v_choices  TEXT[];
  v_sid      TEXT;
  rec        RECORD;
BEGIN
  -- Staging table for the 60 students (dropped at the end)
  CREATE TEMP TABLE _demo_stu (
    id TEXT PRIMARY KEY, student_id TEXT, full_name TEXT, full_name_am TEXT, gender CHAR(1),
    stream TEXT, section_code TEXT, score NUMERIC(5,2), conduct CHAR(1), guardian TEXT, phone TEXT,
    attendance NUMERIC(4,1), choices TEXT[], cte_track TEXT, cte_rank INT, cte_section TEXT, rnk INT
  ) ON COMMIT DROP;

  -- ---- A. build the students -----------------------------------------------------------------------
  FOREACH v_stream IN ARRAY ARRAY['Natural Science', 'Social Science'] LOOP
    v_code := CASE WHEN v_stream = 'Natural Science' THEN '11-NatA' ELSE '11-SocA' END;
    FOR k IN 1..v_per_section LOOP
      i := i + 1;
      v_gender := CASE WHEN k % 2 = 1 THEN 'M' ELSE 'F' END;
      -- a running number per gender, shifted for the second class so the two classes do not repeat names
      idx := ((k - 1) / 2) + CASE WHEN v_stream = 'Social Science' THEN (v_per_section + 1) / 2 ELSE 0 END;
      v_father    := fathers[(idx * 3 + idx / 20) % 25 + 1];
      v_father_am := fathers_am[(idx * 3 + idx / 20) % 25 + 1];
      v_grand     := fathers[(idx + 11) % 25 + 1];
      v_grand_am  := fathers_am[(idx + 11) % 25 + 1];
      IF v_gender = 'M' THEN
        v_first := male_first[idx % 20 + 1];  v_first_am := male_first_am[idx % 20 + 1];
      ELSE
        v_first := fem_first[idx % 20 + 1];   v_first_am := fem_first_am[idx % 20 + 1];
      END IF;
      v_sid := 'HMM-' || v_year || '-D' || lpad(i::text, 3, '0');

      -- Ranked CTE wishes. Natural Science leans to Web Design / Construction, Social Science to Marketing / Accounting.
      r := abs(hashtext(v_sid)) % 100;
      IF v_stream = 'Natural Science' THEN
        v_pattern := CASE WHEN r < 40 THEN 'WD,CST,ACC,MKT' WHEN r < 65 THEN 'WD,ACC,MKT,CST'
                          WHEN r < 85 THEN 'CST,WD,ACC,MKT' ELSE 'ACC,WD,CST,MKT' END;
      ELSE
        v_pattern := CASE WHEN r < 40 THEN 'MKT,ACC,WD,CST' WHEN r < 70 THEN 'ACC,MKT,WD,CST'
                          WHEN r < 90 THEN 'WD,MKT,ACC,CST' ELSE 'MKT,WD,ACC,CST' END;
      END IF;
      SELECT array_agg(tracks[array_position(track_codes, c)] ORDER BY o) INTO v_choices
        FROM unnest(string_to_array(v_pattern, ',')) WITH ORDINALITY AS u(c, o);

      INSERT INTO _demo_stu (id, student_id, full_name, full_name_am, gender, stream, section_code, score, conduct,
                             guardian, phone, attendance, choices)
      VALUES (
        'demo-s-' || v_year || '-' || lpad(i::text, 3, '0'),
        v_sid,
        v_first || ' ' || v_father || ' ' || v_grand,
        v_first_am || ' ' || v_father_am || ' ' || v_grand_am,
        v_gender, v_stream, v_code,
        round((55 + (abs(hashtext(v_sid || 'score')) % 4100) / 100.0)::numeric, 2),   -- 55.00 .. 95.99
        CASE WHEN abs(hashtext(v_sid || 'c')) % 100 < 85 THEN 'A' ELSE 'B' END,
        'Ato ' || v_father || ' ' || v_grand,
        '+251 91 ' || lpad((abs(hashtext(v_sid || 'p1')) % 1000)::text, 3, '0') || ' ' || lpad((abs(hashtext(v_sid || 'p2')) % 10000)::text, 4, '0'),
        round((90 + (abs(hashtext(v_sid || 'a')) % 100) / 12.5)::numeric, 1),            -- 90.0 .. 97.9
        v_choices
      );
    END LOOP;
  END LOOP;

  -- ---- B. CTE placement: best marks first, each student gets the highest wish that still has a seat ---
  FOR rec IN SELECT * FROM _demo_stu ORDER BY score DESC, id LOOP
    FOR j IN 1..array_length(rec.choices, 1) LOOP
      t := array_position(tracks, rec.choices[j]);
      IF seats[t] < v_cte_capacity THEN
        seats[t] := seats[t] + 1;
        UPDATE _demo_stu SET cte_track = tracks[t], cte_rank = j, cte_section = '11-CTE-' || track_codes[t]
         WHERE id = rec.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
  IF EXISTS (SELECT 1 FROM _demo_stu WHERE cte_track IS NULL) THEN
    RAISE NOTICE 'Some students got no CTE seat: raise v_cte_capacity.';
  END IF;

  UPDATE _demo_stu u SET rnk = x.rn
    FROM (SELECT id, row_number() OVER (PARTITION BY section_code ORDER BY score DESC, id) AS rn FROM _demo_stu) x
   WHERE x.id = u.id;

  -- ---- C. homeroom teachers: Mathematics teacher for the Natural class, English teacher for the Social class
  IF v_assign_teachers THEN
    SELECT name INTO v_hr_nat FROM teachers WHERE id LIKE 'demo-t-%' AND subject = 'Mathematics'      ORDER BY id LIMIT 1;
    SELECT name INTO v_hr_soc FROM teachers WHERE id LIKE 'demo-t-%' AND subject = 'English Language' ORDER BY id LIMIT 1;
    v_hr_nat := COALESCE(v_hr_nat, 'To be assigned');
    v_hr_soc := COALESCE(v_hr_soc, 'To be assigned');
  END IF;

  -- ---- D. the 2 classes ------------------------------------------------------------------------------
  FOREACH v_stream IN ARRAY ARRAY['Natural Science', 'Social Science'] LOOP
    v_code     := CASE WHEN v_stream = 'Natural Science' THEN '11-NatA' ELSE '11-SocA' END;
    v_subjects := CASE WHEN v_stream = 'Natural Science' THEN v_nat ELSE v_soc END;
    v_offset   := CASE WHEN v_stream = 'Social Science' THEN 1 ELSE 0 END;   -- second teacher for subjects both classes share
    v_out := '[]'::jsonb;
    FOR v_el IN SELECT value FROM jsonb_array_elements(v_subjects) LOOP
      v_tsub := CASE v_el->>'subjectId'
        WHEN 'math' THEN 'Mathematics'  WHEN 'phys' THEN 'Physics'   WHEN 'chem' THEN 'Chemistry'
        WHEN 'bio'  THEN 'Biology'      WHEN 'eng'  THEN 'English Language' WHEN 'amh' THEN 'Amharic'
        WHEN 'agri' THEN 'Agriculture'  WHEN 'it'   THEN 'ICT'       WHEN 'geo'  THEN 'Geography'
        WHEN 'hist' THEN 'History'      WHEN 'civ'  THEN 'Civics'    WHEN 'econ' THEN 'Economics'
        ELSE NULL END;
      IF v_assign_teachers AND v_tsub IS NOT NULL THEN
        SELECT id, name INTO v_tid, v_tname FROM teachers
         WHERE id LIKE 'demo-t-%' AND subject = v_tsub
         ORDER BY id LIMIT 1
         OFFSET CASE WHEN (v_el->>'subjectId') IN ('math', 'eng', 'it') THEN v_offset ELSE 0 END;
        IF v_tid IS NOT NULL THEN
          v_el := v_el || jsonb_build_object('teacherId', v_tid, 'teacherName', v_tname);
        END IF;
        v_tid := NULL; v_tname := NULL;
      END IF;
      v_out := v_out || jsonb_build_array(v_el);
    END LOOP;

    INSERT INTO grade_sections (id, grade, section_code, section_letter, stream, stream_amharic, total_students,
        male_students, female_students, capacity, homeroom_teacher_name, room_number, building_block, shift,
        subject_assignments, student_monitors, academic_year, is_cte_section, cte_specialization)
    VALUES ('demo-sec-' || v_year || '-' || lower(v_code), 11, v_code, 'A', v_stream,
        CASE WHEN v_stream = 'Natural Science' THEN 'የተፈጥሮ ሳይንስ' ELSE 'የማህበራዊ ሳይንስ' END,
        0, 0, 0, v_class_capacity,
        CASE WHEN v_stream = 'Natural Science' THEN v_hr_nat ELSE v_hr_soc END,
        CASE WHEN v_stream = 'Natural Science' THEN 'Block A - Room 101' ELSE 'Block A - Room 102' END,
        'Block A',
        CASE WHEN v_stream = 'Natural Science' THEN 'Morning Shift (ጧት)' ELSE 'Afternoon Shift (ከሰዓት)' END,
        v_out, '{"classMonitor":"To be elected","deputyMonitor":"To be elected"}'::jsonb, v_year, FALSE, NULL)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ---- E. the 4 CTE sections (one per track, taught by that track's teacher) --------------------------
  FOR t IN 1..4 LOOP
    v_tid := NULL; v_tname := NULL;
    IF v_assign_teachers THEN
      SELECT id, name INTO v_tid, v_tname FROM teachers
       WHERE id LIKE 'demo-t-%' AND subject = 'CTE: ' || tracks[t] ORDER BY id LIMIT 1;
    END IF;
    INSERT INTO grade_sections (id, grade, section_code, section_letter, stream, stream_amharic, total_students,
        male_students, female_students, capacity, homeroom_teacher_name, room_number, building_block, shift,
        subject_assignments, student_monitors, academic_year, is_cte_section, cte_specialization)
    VALUES ('demo-sec-' || v_year || '-11-cte-' || lower(track_codes[t]), 11, '11-CTE-' || track_codes[t],
        'CTE-' || track_codes[t],
        'CTE Vocational: ' || tracks[t], 'የስራና ቴክኒክ፡ ' || tracks[t],
        0, 0, 0, v_cte_capacity,
        COALESCE(v_tname, 'To be assigned'),
        'Tech Lab ' || t, 'Block ' || 'CTE-' || track_codes[t],
        CASE WHEN t % 2 = 1 THEN 'Morning Shift (ጧት)' ELSE 'Afternoon Shift (ከሰዓት)' END,
        jsonb_build_array(jsonb_build_object(
          'subjectId', 'cte',
          'subjectName', 'Career & Technical Education: ' || tracks[t],
          'subjectAmharic', 'የስራና ቴክኒክ፡ ' || tracks[t],
          'teacherId', COALESCE(v_tid, ''),
          'teacherName', COALESCE(v_tname, 'Unassigned'),
          'periodsPerWeek', 4)),
        '{"classMonitor":"To be elected","deputyMonitor":"To be elected"}'::jsonb,
        v_year, TRUE, tracks[t])
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ---- F. admission records (they hold the ranked CTE wishes) -----------------------------------------
  INSERT INTO registrations (id, academic_year, student_id, full_name, full_name_amharic, gender, target_grade, stream,
      previous_school, previous_grade, previous_score, guardian_name, guardian_phone, conduct, cte_choices, registration_date)
  SELECT id, v_year, student_id, full_name, full_name_am, gender, 11, stream,
         'Hailemariam Mamo Secondary & Prep School', 10, score, guardian, phone, conduct,
         array_to_string(choices, '|'), CURRENT_DATE
    FROM _demo_stu
  ON CONFLICT DO NOTHING;

  -- ---- G. the students (class + CTE placement) --------------------------------------------------------
  INSERT INTO students (id, student_id, full_name, full_name_amharic, gender, grade, section, section_code, stream,
      cte_section, cte_specialization, cte_rank, status, registration_id, academic_year, rank, attendance_rate,
      conduct, homeroom_teacher, guardian_name, guardian_phone, avatar)
  SELECT id, student_id, full_name, full_name_am, gender, 11, 'A', section_code, stream,
         cte_section, cte_track, cte_rank, 'active', id, v_year, rnk, attendance,
         conduct, CASE WHEN stream = 'Natural Science' THEN v_hr_nat ELSE v_hr_soc END, guardian, phone, ''
    FROM _demo_stu
  ON CONFLICT DO NOTHING;

  -- ---- H. empty mark rows (both semesters, every subject of the class) ------------------------------------
  INSERT INTO student_marks (student_id, academic_year, subject_id, subject_name, semester,
                             continuous_assessment, mid_exam, final_exam)
  SELECT s.student_id, v_year, e.value->>'subjectId',
         CASE WHEN e.value->>'subjectId' = 'cte' AND s.cte_track IS NOT NULL
              THEN 'Career & Technical: ' || s.cte_track ELSE e.value->>'subjectName' END,
         sem, 0, 0, 0
    FROM _demo_stu s
   CROSS JOIN generate_series(1, 2) AS sem
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN s.stream = 'Natural Science' THEN v_nat ELSE v_soc END) AS e(value)
  ON CONFLICT DO NOTHING;

  -- ---- I. head counts and class monitors (top two students of each class / CTE group) -------------------------
  UPDATE grade_sections g
     SET total_students = c.total, male_students = c.males, female_students = c.total - c.males,
         student_monitors = jsonb_build_object('classMonitor', COALESCE(c.first_name, 'To be elected'),
                                               'deputyMonitor', COALESCE(c.second_name, 'To be elected'))
    FROM (
      SELECT code, count(*)::int AS total, (count(*) FILTER (WHERE gender = 'M'))::int AS males,
             (array_agg(full_name ORDER BY score DESC, id))[1] AS first_name,
             (array_agg(full_name ORDER BY score DESC, id))[2] AS second_name
        FROM (SELECT section_code AS code, gender, full_name, score, id FROM _demo_stu
              UNION ALL
              SELECT cte_section, gender, full_name, score, id FROM _demo_stu WHERE cte_section IS NOT NULL) x
       GROUP BY code
    ) c
   WHERE g.id LIKE 'demo-sec-%' AND g.academic_year = v_year AND g.section_code = c.code;

  RAISE NOTICE 'Demo data added for % E.C.: % students, 2 classes, 4 CTE sections.', v_year, (SELECT count(*) FROM _demo_stu);
END $$;


-- STEP 3 - check what was created (this is the table you will see after Run) -------------------------------------
SELECT section_code        AS section,
       stream,
       total_students      AS students,
       male_students       AS boys,
       female_students     AS girls,
       capacity            AS seats,
       homeroom_teacher_name AS homeroom_or_cte_teacher
  FROM grade_sections
 WHERE id LIKE 'demo-sec-%' AND academic_year = current_academic_year()
 ORDER BY is_cte_section, section_code;

-- Extra checks (select one and run it alone):
--   -- how many students got their 1st / 2nd / 3rd / 4th CTE wish
--   SELECT cte_rank AS wish_granted, count(*) FROM students WHERE id LIKE 'demo-s-%' GROUP BY 1 ORDER BY 1;
--   -- who teaches what
--   SELECT department, subject, count(*) FROM teachers WHERE id LIKE 'demo-t-%' GROUP BY 1, 2 ORDER BY 1, 2;


-- =====================================================================================
-- REMOVE ALL DEMO DATA (un-comment the lines below and run them when you want a clean database again)
-- =====================================================================================
-- DELETE FROM attendance_records WHERE student_id LIKE 'demo-s-%';
-- DELETE FROM student_marks      WHERE student_id IN (SELECT student_id FROM students WHERE id LIKE 'demo-s-%');
-- DELETE FROM students           WHERE id LIKE 'demo-s-%';
-- DELETE FROM registrations      WHERE id LIKE 'demo-s-%';
-- DELETE FROM grade_sections     WHERE id LIKE 'demo-sec-%';
-- DELETE FROM timetable_slots    WHERE teacher_id LIKE 'demo-t-%';
-- DELETE FROM teachers           WHERE id LIKE 'demo-t-%';
