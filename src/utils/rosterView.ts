/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, GradeSection } from '../data/schoolData';
import { RegisteredStudent2019 } from './registrationAndTimetable';

/**
 * The students table is the school's roster for one academic year. Everything about who is registered,
 * who is in a class and who is waiting is worked out from it. The registrations table only holds the
 * admission paperwork (previous school, score, CTE wishes) that placement needs as input.
 */

export const isActive = (s: Pick<Student, 'status'>): boolean => s.status !== 'inactive';

/** In a class = has a class code (or, for older records, a class letter). */
export const isInClass = (s: Pick<Student, 'sectionCode' | 'section'>): boolean =>
  Boolean((s.sectionCode || '').trim() || (s.section || '').trim());

export const isWaiting = (s: Student): boolean => isActive(s) && !isInClass(s);

/** The students every portal works with: placed in a class and still at the school. */
export const isOnRoster = (s: Student): boolean => isActive(s) && isInClass(s);

export interface RosterCounts {
  registered: number;
  inClass: number;
  waiting: number;
  inactive: number;
}

export function rosterCounts(students: Student[]): RosterCounts {
  const active = students.filter(isActive);
  const inClass = active.filter(isInClass).length;
  return {
    registered: active.length,
    inClass,
    waiting: active.length - inClass,
    inactive: students.length - active.length
  };
}

/**
 * The registrar's working list: one entry per ACTIVE roster student, with the admission data joined in
 * and the class taken from the student, never from the registration.
 * A waiting student always has a registration; if it is missing, the entry is built from the student alone.
 */
export function buildRegisteredView(registrations: RegisteredStudent2019[], students: Student[]): RegisteredStudent2019[] {
  const regById = new Map(registrations.map((r) => [r.id, r]));
  return students.filter(isActive).map((s) => {
    const reg = regById.get(s.registrationId || s.id);
    const base: RegisteredStudent2019 = reg ?? {
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      fullNameAmharic: s.fullNameAmharic,
      gender: s.gender,
      targetGrade: s.grade,
      stream: s.stream,
      academicYear: s.academicYear,
      previousSchool: '',
      previousGrade: 0,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      conduct: s.conduct,
      registrationDate: '',
      avatar: s.avatar || ''
    };
    return {
      ...base,
      id: s.id,
      studentId: s.studentId,
      allocatedSection: (s.sectionCode || '').trim() || undefined,
      cteSection: s.cteSection || undefined,
      cteSpecialization: s.cteSection ? s.cteSpecialization : base.cteSpecialization,
      cteRank: s.cteRank || undefined
    };
  });
}

/** The full class code ('9A', '11-Nat-A') of a student who only has a class letter, found among the year's classes. */
export function deriveSectionCode(s: Pick<Student, 'grade' | 'section' | 'stream' | 'sectionCode'>, sections: GradeSection[]): string {
  if (s.sectionCode) return s.sectionCode;
  const letter = (s.section || '').trim().toUpperCase();
  if (!letter) return '';
  const match = sections.find(
    (sec) =>
      !sec.isCteSection &&
      sec.grade === s.grade &&
      (sec.sectionLetter || '').toUpperCase() === letter &&
      (sec.grade < 11 || sec.stream === s.stream)
  );
  return match?.section || '';
}

/** A new roster row for a student who has just registered: no class yet, so they are waiting. */
export function newWaitingStudent(reg: RegisteredStudent2019, academicYear: string): Student {
  return {
    id: reg.id,
    studentId: reg.studentId,
    fullName: reg.fullName,
    fullNameAmharic: reg.fullNameAmharic || reg.fullName,
    gender: reg.gender,
    grade: reg.targetGrade,
    section: '',
    sectionCode: '',
    stream: reg.stream,
    academicYear,
    status: 'active',
    registrationId: reg.id,
    avatar: reg.avatar || '',
    rank: 0,
    totalStudentsInSection: 0,
    attendanceRate: 100,
    conduct: reg.conduct || 'A',
    homeroomTeacher: 'To be assigned',
    guardianName: reg.guardianName || 'Parent/Guardian',
    guardianPhone: reg.guardianPhone || '',
    semesters: [
      { semester: 1, subjects: [] },
      { semester: 2, subjects: [] }
    ]
  };
}

export interface SubjectTemplate {
  subjectId: string;
  subjectName: string;
  subjectAmharic?: string;
  teacherName?: string;
}

const subjectsFromTemplate = (template: SubjectTemplate[]) =>
  template.map((ts) => ({
    subjectId: ts.subjectId,
    subjectName: ts.subjectName,
    subjectAmharic: ts.subjectAmharic || ts.subjectName,
    teacherName: ts.teacherName || 'Unassigned',
    continuousAssessment: 0,
    midExam: 0,
    finalExam: 0,
    totalScore: 0
  }));

/**
 * Puts a roster student into a class. The student's row is UPDATED, never replaced: marks that already
 * exist are kept, and a waiting student (who has no subjects yet) gets the class's subject list.
 */
export function placeStudentInClass(args: {
  existing?: Student;
  reg: RegisteredStudent2019;
  academicYear: string;
  grade: number;
  sectionLetter: string;
  sectionCode: string;
  stream?: string;
  rank: number;
  totalInSection: number;
  homeroom?: string;
  template: SubjectTemplate[];
}): Student {
  const { existing, reg, academicYear, grade, sectionLetter, sectionCode, stream, rank, totalInSection, homeroom, template } = args;
  const base = existing ?? newWaitingStudent(reg, academicYear);
  const hasSubjects = base.semesters?.some((sem) => sem.subjects && sem.subjects.length > 0);
  const subjects = subjectsFromTemplate(template);
  return {
    ...base,
    grade,
    section: sectionLetter,
    sectionCode,
    stream: (stream as Student['stream']) ?? base.stream,
    academicYear,
    status: 'active',
    registrationId: base.registrationId || reg.id,
    rank,
    totalStudentsInSection: totalInSection,
    homeroomTeacher: homeroom || base.homeroomTeacher || 'To be assigned',
    semesters: hasSubjects
      ? base.semesters
      : [
          { semester: 1 as const, subjects },
          { semester: 2 as const, subjects }
        ]
  };
}

/**
 * The school ID is permanent: a returning student keeps the one they already have. A new student gets
 * HMM-<year of first admission>-<number>, numbered after every ID already in use that year.
 */
export function nextStudentId(args: { linkedStudentId?: string; year: string; taken: Iterable<string> }): string {
  if (args.linkedStudentId) return args.linkedStudentId;
  const taken = new Set(args.taken);
  const prefix = `HMM-${args.year}-`;
  let n = 1;
  for (const id of taken) {
    if (id.startsWith(prefix)) {
      const k = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(k) && k >= n) n = k + 1;
    }
  }
  while (taken.has(`${prefix}${String(n).padStart(4, '0')}`)) n++;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

/** Marks a student as having left (inactive) or brings them back. History and marks are never touched. */
export function setStudentStatus(s: Student, status: 'active' | 'inactive', reason?: string, today: string = new Date().toISOString().slice(0, 10)): Student {
  if (status === 'inactive') return { ...s, status, leftDate: today, leftReason: reason?.trim() || undefined };
  return { ...s, status: 'active', leftDate: undefined, leftReason: undefined };
}

/**
 * A portal that only sees the roster saves its list back. Students it cannot see (waiting for a class, or left the
 * school) are kept exactly as they are, so saving marks can never make them disappear. Students the portal removed
 * from its list are removed; students it added are added.
 */
export function mergeRosterUpdate(all: Student[], nextVisible: Student[]): Student[] {
  const nextIds = new Set(nextVisible.map((st) => st.id));
  const hidden = all.filter((st) => !isOnRoster(st) && !nextIds.has(st.id));
  return [...nextVisible, ...hidden];
}

/**
 * A student who is new to the list belongs to the current year and has a known class code, whatever year label or
 * code the screen that created them used. Students already in the list are returned untouched (same object).
 */
export function stampNewStudents(prev: Student[], next: Student[], year: string, sections: GradeSection[]): Student[] {
  const known = new Set(prev.map((st) => st.id));
  return next.map((st) =>
    known.has(st.id)
      ? st
      : { ...st, academicYear: year, sectionCode: st.sectionCode || deriveSectionCode(st, sections), status: st.status || 'active' }
  );
}
