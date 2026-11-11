/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, GradeSection } from '../data/schoolData';

/**
 * Administrator discipline tools.
 *
 *  - Ban: flags a student. They keep their class, marks and attendance, but are blocked from the public
 *    grade portal. A ban can have an end date; when the date passes the ban stops applying by itself.
 *  - Disband: dissolves a class. Its students go back to the waiting list (marks are kept) so the
 *    registrar can place them again, and the class is removed.
 */

const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** True while a ban applies. A ban with an end date stops applying on that date. */
export function isBanned(s: Pick<Student, 'banned' | 'bannedUntil'>, today: string = todayISO()): boolean {
  if (!s.banned) return false;
  if (s.bannedUntil && s.bannedUntil <= today) return false;
  return true;
}

/** A ban that had an end date which has passed (still flagged on the record, no longer applying). */
export function isBanExpired(s: Pick<Student, 'banned' | 'bannedUntil'>, today: string = todayISO()): boolean {
  return Boolean(s.banned && s.bannedUntil && s.bannedUntil <= today);
}

export function banStudent(
  s: Student,
  opts: { reason?: string; until?: string; today?: string } = {}
): Student {
  const today = opts.today ?? todayISO();
  return {
    ...s,
    banned: true,
    bannedDate: today,
    bannedUntil: opts.until?.trim() || undefined,
    bannedReason: opts.reason?.trim() || undefined
  };
}

export function unbanStudent(s: Student): Student {
  return { ...s, banned: false, bannedDate: undefined, bannedUntil: undefined, bannedReason: undefined };
}

/** Does this student belong to the class (academic class code, or the CTE group of the same code)? */
export function isInSection(s: Student, section: Pick<GradeSection, 'section' | 'sectionLetter' | 'grade' | 'stream' | 'isCteSection'>): boolean {
  const code = section.section.trim().toUpperCase();
  if (section.isCteSection) return (s.cteSection || '').trim().toUpperCase() === code;
  if ((s.sectionCode || '').trim()) return s.sectionCode!.trim().toUpperCase() === code;
  // Older rows only have the class letter
  return (
    (s.section || '').trim().toUpperCase() === (section.sectionLetter || '').trim().toUpperCase() &&
    s.grade === section.grade &&
    (section.grade < 11 || s.stream === section.stream)
  );
}

export function studentsInSection(students: Student[], section: GradeSection): Student[] {
  return students.filter((s) => isInSection(s, section));
}

export interface DisbandResult {
  /** The full student list with the class's students released. Students outside the class keep the same object. */
  students: Student[];
  /** Only the students that changed (to be saved). */
  released: Student[];
}

/**
 * Releases a class's students. An academic class: the student goes back to the waiting list (no class, no class
 * rank) and the marks stay; their CTE group, if any, is left alone. A CTE group: only the CTE group is cleared,
 * the student keeps their academic class.
 */
export function disbandSection(students: Student[], section: GradeSection): DisbandResult {
  const released: Student[] = [];
  const next = students.map((s) => {
    if (!isInSection(s, section)) return s;
    const updated: Student = section.isCteSection
      ? { ...s, cteSection: undefined, cteRank: undefined }
      : { ...s, section: '', sectionCode: '', rank: 0, totalStudentsInSection: 0, homeroomTeacher: 'To be assigned' };
    released.push(updated);
    return updated;
  });
  return { students: next, released };
}

export interface DisbandSummary {
  total: number;
  boys: number;
  girls: number;
  banned: number;
}

export function summariseSectionForDisband(students: Student[], section: GradeSection): DisbandSummary {
  const list = studentsInSection(students, section);
  return {
    total: list.length,
    boys: list.filter((s) => s.gender === 'M').length,
    girls: list.filter((s) => s.gender === 'F').length,
    banned: list.filter((s) => isBanned(s)).length
  };
}
