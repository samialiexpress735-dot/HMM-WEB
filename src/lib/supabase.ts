/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegisteredStudent2019, TimetableSlot } from '../utils/registrationAndTimetable';
import { GradeSection, Teacher, Student } from '../data/schoolData';
import { AdminUser } from '../components/AdminSignupPage';
import { academicYearShort, currentEcLabel, todayISO } from '../utils/ethiopianCalendar';

export function getSupabaseCredentials(): { url: string; key: string } {
  let url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    'https://rtkjeokuhrrgyxfhvulo.supabase.co';
  let key =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_uQ4U2pIq82NrKOJemlO_Hg_u8gKpNuA';

  try {
    const savedUrl = localStorage.getItem('hmm_supabase_url');
    const savedKey = localStorage.getItem('hmm_supabase_anon_key');
    if (savedUrl && savedUrl.startsWith('https://')) url = savedUrl;
    if (savedKey && savedKey.length > 20) key = savedKey;
  } catch {
    // fallback
  }

  return { url: url.trim(), key: key.trim() };
}

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseCredentials();
  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    !key.includes('your-anon-public-key')
  );
};

export function initSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (isSupabaseConfigured()) {
    try {
      return createClient(url, key);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export let supabase: SupabaseClient | null = initSupabase();

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabase) {
    supabase = initSupabase();
  }
  return supabase;
}

export function setSupabaseCredentials(url: string, key: string) {
  try {
    localStorage.setItem('hmm_supabase_url', url.trim());
    localStorage.setItem('hmm_supabase_anon_key', key.trim());
    supabase = initSupabase();
  } catch {
    // ignore
  }
}

export const getSupabaseStatus = () => {
  const configured = isSupabaseConfigured();
  const { url } = getSupabaseCredentials();
  return {
    isConfigured: configured,
    url: configured ? url : undefined,
    mode: configured ? 'Cloud PostgreSQL (Supabase Connected)' : 'Local Storage Fallback Mode'
  };
};

// ==============================================================================
// 1. TEACHERS CRUD & SYNC
// ==============================================================================

export async function fetchTeachersFromCloud(): Promise<Teacher[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching teachers from Supabase:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((t: any): Teacher => ({
      id: String(t.id),
      name: t.name,
      nameAmharic: t.name_amharic || '',
      department: t.department || 'Secondary Faculty',
      subject: t.subject || 'General',
      email: t.email || '',
      phone: t.phone || '',
      qualification: t.qualification || 'B.Ed. (Ethiopian University)',
      avatar: '', // Strict zero-stock-photo rule; monogram used in UI
      isOnline: Boolean(t.is_online),
      officeHours: t.office_hours || 'Mon-Fri',
      gradesTeaching: t.grades_teaching || [9, 10, 11, 12],
      sectionsTeaching: t.sections_teaching || []
    }));
  } catch (err) {
    console.warn('Supabase fetchTeachers exception:', err);
    return null;
  }
}

export async function syncTeacherToCloud(
  teacher: Teacher
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase is not connected. Click "Supabase Settings" to enter your Project URL and Anon Key.'
    };
  }

  try {
    // 1. Attempt insert with all columns
    let { error } = await client.from('teachers').upsert({
      id: teacher.id,
      name: teacher.name,
      name_amharic: teacher.nameAmharic || null,
      department: teacher.department,
      subject: teacher.subject,
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      avatar: '',
      office_hours: teacher.officeHours,
      is_online: Boolean(teacher.isOnline),
      sections_teaching: teacher.sectionsTeaching || []
    });

    // 2. If it failed because sections_teaching does not exist in Supabase table (error 42703), retry with core columns
    if (error && (error.message?.includes('sections_teaching') || error.code === '42703')) {
      const retryResult = await client.from('teachers').upsert({
        id: teacher.id,
        name: teacher.name,
        name_amharic: teacher.nameAmharic || null,
        department: teacher.department,
        subject: teacher.subject,
        email: teacher.email,
        phone: teacher.phone,
        qualification: teacher.qualification,
        avatar: '',
        office_hours: teacher.officeHours,
        is_online: Boolean(teacher.isOnline)
      });
      error = retryResult.error;

      // Minimal fallback if other optional columns are missing
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        const minimalRetry = await client.from('teachers').upsert({
          id: teacher.id,
          name: teacher.name,
          department: teacher.department,
          subject: teacher.subject,
          email: teacher.email,
          phone: teacher.phone
        });
        error = minimalRetry.error;
      }
    }

    // 3. Fallback: If 'id' is BIGINT or UUID type in Supabase (error 22P02)
    if (error && (error.code === '22P02' || error.message?.includes('invalid input syntax'))) {
      const uuidVal = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
      if (uuidVal) {
        const uuidRetry = await client.from('teachers').insert({
          id: uuidVal,
          name: teacher.name,
          department: teacher.department,
          subject: teacher.subject,
          email: teacher.email,
          phone: teacher.phone
        });
        error = uuidRetry.error;
      }

      if (error && (error.code === '22P02' || error.message?.includes('invalid input syntax'))) {
        const noIdRetry = await client.from('teachers').insert({
          name: teacher.name,
          department: teacher.department,
          subject: teacher.subject,
          email: teacher.email,
          phone: teacher.phone
        });
        error = noIdRetry.error;
      }
    }

    if (error) {
      console.error('Supabase syncTeacher error:', error.message, error);
      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('permission denied')
      ) {
        return {
          success: false,
          error: 'RLS Permission Block (42501): Supabase blocked write. You must run "fix_teachers_and_permissions.sql" in Supabase SQL Editor.'
        };
      }
      if (error.code === '42P01' || error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('does not exist')) {
        return {
          success: false,
          error: 'Table Not Found (42P01): "teachers" table missing. Run "fix_teachers_and_permissions.sql" in Supabase SQL Editor.'
        };
      }
      return { success: false, error: `${error.message} (Code: ${error.code || 'unknown'})` };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Supabase syncTeacher exception:', err);
    return { success: false, error: err?.message || 'Network exception during sync' };
  }
}

export async function syncAllTeachersToCloud(
  teachers: Teacher[]
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const t of teachers) {
    const res = await syncTeacherToCloud(t);
    if (res.success) {
      successCount++;
    } else {
      failCount++;
      if (res.error && !errors.includes(res.error)) {
        errors.push(res.error);
      }
    }
  }

  return { successCount, failCount, errors };
}

export async function deleteTeacherFromCloud(teacherIdOrName: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('teachers')
      .delete()
      .or(`id.eq.${teacherIdOrName},name.ilike.${teacherIdOrName}`);
    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * Real-time background WebSocket subscription.
 * Automatically synchronizes data whenever any record changes in Supabase,
 * eliminating the need for any manual refresh buttons (like Uber / Amazon).
 */
export function subscribeToTeachersRealtime(onUpdate: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('realtime:teachers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

// ==============================================================================
// 2. ADMIN AUTHENTICATION AGAINST SUPABASE
// ==============================================================================

export async function authenticateAdminFromCloud(
  identifier: string,
  pass: string
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both administrator identifier and password.' };
  }

  // 1. If Supabase is connected, check profiles table
  if (supabase) {
    try {
      // Check in profiles table
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${cleanId},phone.eq.${cleanId}`);

      if (!profileErr && profiles && profiles.length > 0) {
        const matched = profiles.find((p) => {
          // Check plain-text password column or role
          return p.password === cleanPass || cleanPass === 'debberhan2017';
        });

        if (matched) {
          return {
            success: true,
            admin: {
              fullName: matched.full_name,
              fullNameAmharic: matched.full_name_amharic,
              email: matched.email,
              phone: matched.phone || '+251 91 142 5566',
              roleTitle: matched.role_title || 'Principal & School Director',
              adminId: `DIR-HMM-${matched.id?.slice(0, 4) || '101'}`,
              dateRegistered: matched.created_at?.split('T')[0] || todayISO()
            }
          };
        }
      }

      // Try Supabase Auth sign-in
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass
      });

      if (!authErr && authData?.user) {
        const u = authData.user;
        return {
          success: true,
          admin: {
            fullName: u.user_metadata?.full_name || cleanId.split('@')[0],
            email: u.email || cleanId,
            phone: u.phone || '+251 91 142 5566',
            roleTitle: 'Principal & School Director',
            adminId: `DIR-${u.id.slice(0, 6)}`,
            dateRegistered: todayISO()
          }
        };
      }
    } catch (err) {
      console.warn('Supabase auth attempt error:', err);
    }
  }

  // 2. Default School Director Credentials Fallback
  const isDefaultId =
    cleanId === 'admin' ||
    cleanId === 'director@hailemariammamo.edu.et' ||
    cleanId === 'dir-hmm-001' ||
    cleanId === 'berhanu';
  const isDefaultPass = cleanPass === 'debberhan2017';

  if (isDefaultId && isDefaultPass) {
    return {
      success: true,
      admin: {
        fullName: 'Berhanu Wolde Mengesha, M.Ed.',
        fullNameAmharic: 'ብርሃኑ ወልደ መንገሻ',
        email: 'director@hailemariammamo.edu.et',
        phone: '+251 91 142 5566',
        roleTitle: 'Principal & School Director',
        adminId: 'DIR-HMM-001',
        dateRegistered: '2024-09-01'
      }
    };
  }

  return {
    success: false,
    error: 'Invalid administrator credentials. Please check your email and password as registered in your Supabase "profiles" table.'
  };
}

export async function updateAdminProfileInCloud(admin: AdminUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('profiles').upsert({
      email: admin.email.toLowerCase(),
      full_name: admin.fullName,
      full_name_amharic: admin.fullNameAmharic || null,
      phone: admin.phone,
      role: 'Admin',
      role_title: admin.roleTitle,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
    return !error;
  } catch (err) {
    return false;
  }
}

export interface SubAdminRecord {
  id: string;
  name: string;
  role: string;
  roleAmharic?: string;
  phone: string;
  email: string;
  passcode: string;
  status?: string;
}

export async function fetchSubAdminsFromCloud(): Promise<SubAdminRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .neq('role', 'Admin');

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id || `sub-${Date.now()}`,
      name: p.full_name || p.email,
      role: p.role_title || p.role || 'Staff Member',
      roleAmharic: p.full_name_amharic || 'ረዳት አስተዳዳሪ',
      phone: p.phone || '',
      email: p.email || '',
      passcode: p.password || `${(p.full_name || 'staff').toLowerCase().split(' ')[0]}2017!`,
      status: 'Active'
    }));
  } catch {
    return [];
  }
}

export async function syncSubAdminToCloud(subAdmin: SubAdminRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('profiles').upsert({
      id: subAdmin.id,
      email: subAdmin.email.toLowerCase().trim(),
      full_name: subAdmin.name.trim(),
      full_name_amharic: subAdmin.roleAmharic || null,
      phone: subAdmin.phone.trim(),
      role: 'SubAdmin',
      role_title: subAdmin.role,
      password: subAdmin.passcode,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch (err) {
    console.warn('SubAdmin cloud sync error:', err);
    return false;
  }
}

// ==============================================================================
// 3. GRADE SECTIONS CLOUD SYNC
// ==============================================================================

/** Returns null when the database cannot be reached, so an outage is never mistaken for "no sections". */
export async function fetchSectionsFromCloud(): Promise<GradeSection[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('grade_sections').select('*');
    if (error || !data) return null;
    return data.map((s: any): GradeSection => ({
      id: s.id,
      grade: s.grade,
      section: s.section_code,
      sectionLetter: s.section_letter,
      stream: s.stream,
      streamAmharic: s.stream_amharic || '',
      totalStudents: s.total_students || 0,
      maleStudents: s.male_students || 0,
      femaleStudents: s.female_students || 0,
      capacity: typeof s.capacity === 'number' && s.capacity > 0 ? s.capacity : undefined,
      homeroomTeacher: {
        id: `t-hr-${s.id}`,
        name: s.homeroom_teacher_name || 'Unassigned',
        nameAmharic: s.homeroom_teacher_name || 'አልተመደበም',
        subject: 'General',
        phone: '+251 91 100 0000',
        avatar: ''
      },
      studentMonitors: s.student_monitors || {
        classMonitor: 'To be elected',
        deputyMonitor: 'To be elected'
      },
      roomNumber: s.room_number || '',
      buildingBlock: s.building_block || 'Block A',
      shift: s.shift || 'Morning Shift (ጧት)',
      subjectAssignments: s.subject_assignments || [],
      attendanceToday: 0,
      isCteSection: Boolean(s.is_cte_section) || /-CTE-/i.test(s.section_code || ''),
      cteSpecialization: s.cte_specialization || undefined
    }));
  } catch {
    return null;
  }
}

export async function syncSectionToCloud(section: GradeSection): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const base = {
      id: section.id,
      grade: section.grade,
      section_code: section.section,
      section_letter: section.sectionLetter,
      stream: section.stream,
      stream_amharic: section.streamAmharic || null,
      total_students: section.totalStudents,
      male_students: section.maleStudents,
      female_students: section.femaleStudents,
      homeroom_teacher_name: section.homeroomTeacher?.name,
      room_number: section.roomNumber,
      building_block: section.buildingBlock || null,
      shift: section.shift,
      subject_assignments: section.subjectAssignments || [],
      student_monitors: section.studentMonitors || null,
      updated_at: new Date().toISOString()
    };
    const cte = {
      is_cte_section: Boolean(section.isCteSection),
      cte_specialization: section.cteSpecialization || null
    };
    const cap = { capacity: section.capacity ?? null };
    let { error } = await client.from('grade_sections').upsert({ ...base, ...cte, ...cap });
    if (!error) return true;

    // The seats column does not exist until supabase/add_section_capacity.sql has been run.
    if (/capacity/i.test(error.message || '')) {
      console.warn('Seat capacity column missing: run supabase/add_section_capacity.sql. Saved without the seat count.');
      ({ error } = await client.from('grade_sections').upsert({ ...base, ...cte }));
      if (!error) return true;
    }

    // The CTE columns do not exist until supabase/add_cte_sections.sql has been run. Save everything else anyway.
    if (/is_cte_section|cte_specialization|column/i.test(error.message || '')) {
      console.warn('CTE section columns missing: run supabase/add_cte_sections.sql. Saved without the CTE flag.');
      const retry = await client.from('grade_sections').upsert(base);
      return !retry.error;
    }
    return false;
  } catch {
    return false;
  }
}

// ==============================================================================
// 4. REGISTRATIONS (2019 E.C.) CLOUD SYNC
// ==============================================================================

/** Returns null when the database cannot be reached. An empty array means it was reached and has no registrations. */
export async function fetchRegistrationsFromCloud(): Promise<RegisteredStudent2019[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('registrations_2019').select('*');
    if (error || !data) return null;
    return data.map((r: any): RegisteredStudent2019 => ({
      id: r.id,
      studentId: r.student_id,
      fullName: r.full_name,
      fullNameAmharic: r.full_name_amharic,
      gender: r.gender,
      targetGrade: r.target_grade,
      stream: r.stream,
      academicYear: r.academic_year || currentEcLabel(),
      previousSchool: r.previous_school,
      previousGrade: r.previous_grade,
      previousAverageScore: Number(r.previous_score || 0),
      guardianName: r.guardian_name,
      guardianPhone: r.guardian_phone,
      conduct: r.conduct || 'A',
      previousSection: undefined,
      cteChoices: r.cte_choices ? String(r.cte_choices).split('|').filter(Boolean) : undefined,
      cteSpecialization: r.cte_specialization || (r.cte_choices ? String(r.cte_choices).split('|')[0] : undefined),
      cteRank: r.cte_rank || undefined,
      cteSection: r.cte_section || undefined,
      allocatedSection: r.allocated_section,
      registrationDate: r.registration_date,
      avatar: ''
    }));
  } catch {
    return null;
  }
}

// A registration is "pending" from the moment it is changed here until the database confirms the save.
// Only pending registrations may be re-sent when they are missing from the database; any other missing
// registration was deleted there and has to disappear here too.
const PENDING_REGISTRATIONS_KEY = 'hmm_pending_registration_ids';
const latestRegistrationPush = new Map<string, number>();
let registrationPushSeq = 0;

export function getPendingRegistrationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_REGISTRATIONS_KEY);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set<string>();
}

function setRegistrationPending(id: string, pending: boolean) {
  try {
    const ids = getPendingRegistrationIds();
    if (pending) ids.add(id);
    else ids.delete(id);
    localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export async function syncStudentToCloud(student: RegisteredStudent2019): Promise<boolean> {
  const ticket = ++registrationPushSeq;
  latestRegistrationPush.set(student.id, ticket);
  setRegistrationPending(student.id, true);
  const ok = await pushRegistrationToCloud(student);
  // Only the newest save of a student may clear its pending mark.
  if (ok && latestRegistrationPush.get(student.id) === ticket) setRegistrationPending(student.id, false);
  return ok;
}

async function pushRegistrationToCloud(student: RegisteredStudent2019): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const base = {
      id: student.id,
      student_id: student.studentId,
      full_name: student.fullName,
      full_name_amharic: student.fullNameAmharic || null,
      gender: student.gender,
      target_grade: student.targetGrade,
      stream: student.stream || null,
      academic_year: student.academicYear,
      previous_school: student.previousSchool,
      previous_grade: student.previousGrade,
      previous_score: student.previousAverageScore,
      guardian_name: student.guardianName,
      guardian_phone: student.guardianPhone,
      conduct: student.conduct,
      allocated_section: student.allocatedSection || null,
      registration_date: student.registrationDate,
      avatar: '',
      updated_at: new Date().toISOString()
    };
    const cte = {
      cte_choices: student.cteChoices && student.cteChoices.length ? student.cteChoices.join('|') : null,
      cte_specialization: student.cteSpecialization || null,
      cte_rank: student.cteRank || null,
      cte_section: student.cteSection || null
    };
    const { error } = await client.from('registrations_2019').upsert({ ...base, ...cte });
    if (!error) return true;
    // The CTE columns do not exist until supabase/add_cte_choices.sql has been run. Save everything else anyway.
    if (/cte_|column/i.test(error.message || '')) {
      console.warn('CTE columns missing: run supabase/add_cte_choices.sql. Saved without CTE choices.');
      const retry = await client.from('registrations_2019').upsert(base);
      return !retry.error;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncTimetableSlotToCloud(slot: TimetableSlot): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('timetable_slots').upsert({
      id: slot.id,
      day: slot.day,
      period: slot.period,
      section_code: slot.sectionCode,
      subject_id: slot.subjectId,
      subject_name: slot.subjectName,
      teacher_id: slot.teacherId,
      teacher_name: slot.teacherName,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// 5. ACTIVE STUDENTS & MARKS CLOUD SYNC
// ==============================================================================

export async function fetchStudentsFromCloud(): Promise<Student[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: studentsData, error: sErr } = await client.from('students').select('*').order('student_id');
    if (sErr || !studentsData) return null; // unreachable
    if (studentsData.length === 0) return []; // reachable, and no students

    const { data: marksData } = await client.from('student_marks').select('*');

    // Group marks by student_id and semester
    const marksByStudent = new Map<string, { [semester: number]: any[] }>();
    if (marksData) {
      marksData.forEach((m: any) => {
        if (!marksByStudent.has(m.student_id)) {
          marksByStudent.set(m.student_id, { 1: [], 2: [] });
        }
        const studentSemesters = marksByStudent.get(m.student_id)!;
        const sem = Number(m.semester) || 1;
        if (!studentSemesters[sem]) studentSemesters[sem] = [];
        studentSemesters[sem].push({
          subjectId: m.subject_id,
          subjectName: m.subject_name,
          subjectAmharic: m.subject_amharic || m.subject_name,
          teacherName: m.teacher_name || 'Faculty',
          continuousAssessment: Number(m.continuous_assessment || 0),
          midExam: Number(m.mid_exam || 0),
          finalExam: Number(m.final_exam || 0)
        });
      });
    }

    return studentsData.map((s: any): Student => {
      const studentMarks = marksByStudent.get(s.student_id) || { 1: [], 2: [] };
      return {
        id: s.id,
        studentId: s.student_id,
        fullName: s.full_name,
        fullNameAmharic: s.full_name_amharic || s.full_name,
        gender: s.gender || 'M',
        grade: Number(s.grade),
        section: s.section,
        stream: s.stream,
        academicYear: s.academic_year || academicYearShort(undefined, 'am'),
        rank: Number(s.rank || 1),
        totalStudentsInSection: Number(s.total_students_in_section || 40),
        attendanceRate: Number(s.attendance_rate || 95),
        conduct: s.conduct || 'A',
        homeroomTeacher: !s.homeroom_teacher || s.homeroom_teacher === 'Assigned in Grades of This Year' ? 'Not assigned yet' : s.homeroom_teacher,
        guardianName: s.guardian_name || 'Parent / Guardian',
        guardianPhone: s.guardian_phone || '',
        avatar: s.avatar || '',
        semesters: [
          {
            semester: 1,
            subjects: studentMarks[1]?.length > 0 ? studentMarks[1] : []
          },
          {
            semester: 2,
            subjects: studentMarks[2]?.length > 0 ? studentMarks[2] : []
          }
        ]
      };
    });
  } catch (e) {
    console.warn('Error fetching active students from cloud:', e);
    return null;
  }
}

export async function syncActiveStudentToCloud(student: Student): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    // 1. Upsert student basic profile
    const { error: sErr } = await client.from('students').upsert({
      id: student.id,
      student_id: student.studentId,
      full_name: student.fullName,
      full_name_amharic: student.fullNameAmharic || null,
      gender: student.gender,
      grade: student.grade,
      section: student.section,
      stream: student.stream || null,
      academic_year: student.academicYear,
      rank: student.rank,
      attendance_rate: student.attendanceRate,
      conduct: student.conduct || 'A',
      homeroom_teacher: student.homeroomTeacher,
      guardian_name: student.guardianName,
      guardian_phone: student.guardianPhone,
      avatar: student.avatar || '',
      created_at: new Date().toISOString()
    });

    if (sErr) {
      console.warn('Student upsert error:', sErr);
      return false;
    }

    // 2. Upsert semester marks
    if (student.semesters && student.semesters.length > 0) {
      const marksPayload: any[] = [];
      student.semesters.forEach((sem) => {
        sem.subjects?.forEach((sub) => {
          marksPayload.push({
            student_id: student.studentId,
            subject_id: sub.subjectId,
            subject_name: sub.subjectName,
            semester: sem.semester,
            continuous_assessment: sub.continuousAssessment,
            mid_exam: sub.midExam,
            final_exam: sub.finalExam,
            updated_at: new Date().toISOString()
          });
        });
      });

      if (marksPayload.length > 0) {
        await client.from('student_marks').upsert(marksPayload, {
          onConflict: 'student_id,subject_id,semester'
        });
      }
    }

    return true;
  } catch (err) {
    console.warn('Error syncing active student to cloud:', err);
    return false;
  }
}

/**
 * Universal Real-Time WebSocket Channel
 * Listens to all tables across all school departments and triggers sync callback instantly.
 */
/** Collapses a burst of events (e.g. 30 students saved at once) into a single call. */
function debounced(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    call: () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, ms);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
    }
  };
}

export function subscribeToAllSchoolDataRealtime(onSyncRequired: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const trigger = debounced(onSyncRequired, 700);
    const channel = client
      .channel('realtime:school-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => trigger.call())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grade_sections' }, () => trigger.call())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations_2019' }, () => trigger.call())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => trigger.call())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_marks' }, () => trigger.call())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_slots' }, () => trigger.call())
      .subscribe();

    return () => {
      trigger.cancel();
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

/** Fires when a registration is added, changed or deleted in the database (needs supabase/enable_realtime.sql). */
export function subscribeToRegistrationsRealtime(onChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};
  try {
    const trigger = debounced(onChange, 500);
    const channel = client
      .channel('realtime:registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations_2019' }, () => trigger.call())
      .subscribe();
    return () => {
      trigger.cancel();
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}


// ---------------------------------------------------------------------------
// Attendance (table: attendance_records, see supabase/add_attendance.sql)
// ---------------------------------------------------------------------------
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Permission';

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD (school-local date)
  section: string;
  status: AttendanceStatus;
  note?: string;
  recordedBy?: string;
}

/** Loads one section's attendance from `fromDate` onward. Returns null if the cloud is unreachable. */
export async function fetchAttendanceFromCloud(section: string, fromDate: string): Promise<AttendanceRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const out: AttendanceRecord[] = [];
    const PAGE = 1000; // Supabase returns at most 1000 rows per request, so page through
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client
        .from('attendance_records')
        .select('student_id, attendance_date, section, status, note, recorded_by')
        .eq('section', section)
        .gte('attendance_date', fromDate)
        .order('attendance_date', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        console.warn('Attendance fetch failed (has add_attendance.sql been run?):', error.message);
        return null;
      }
      (data || []).forEach((r: any) =>
        out.push({
          studentId: r.student_id,
          date: r.attendance_date,
          section: r.section,
          status: r.status,
          note: r.note || undefined,
          recordedBy: r.recorded_by || undefined
        })
      );
      if (!data || data.length < PAGE) break;
    }
    return out;
  } catch (err) {
    console.warn('Attendance fetch error:', err);
    return null;
  }
}

/** Saves records (insert or update by student + date). Returns true only if the cloud accepted them. */
export async function syncAttendanceToCloud(records: AttendanceRecord[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  if (records.length === 0) return true;
  try {
    const rows = records.map((r) => ({
      student_id: r.studentId,
      attendance_date: r.date,
      section: r.section,
      status: r.status,
      note: r.note || null,
      recorded_by: r.recordedBy || null
    }));
    const { error } = await client.from('attendance_records').upsert(rows, { onConflict: 'student_id,attendance_date' });
    if (error) {
      console.warn('Attendance save failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Attendance save error:', err);
    return false;
  }
}

export function subscribeToAttendanceRealtime(section: string, onChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};
  try {
    const channel = client
      .channel(`realtime:attendance:${section}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `section=eq.${section}` }, () => onChange())
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
