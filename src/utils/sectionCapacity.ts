/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GradeSection } from '../data/schoolData';
import { RegisteredStudent2019 } from './registrationAndTimetable';

/** Seats used when a section was saved without a capacity (older sections). */
export const DEFAULT_SECTION_CAPACITY = 45;

const norm = (s?: string) => (s || '').toUpperCase().trim();

export function getSectionCapacity(section: GradeSection): number {
  const c = Number(section.capacity);
  return Number.isFinite(c) && c > 0 ? Math.floor(c) : DEFAULT_SECTION_CAPACITY;
}

/** CTE groups have their own seat limits and their own allocation. They are not handled here. */
export function isAcademicSection(section: GradeSection): boolean {
  return !section.isCteSection && !/-CTE-/i.test(section.section || '');
}

/** Can this student sit in this section? Same grade, and the same stream in Grades 11-12. */
export function sectionAcceptsStudent(
  section: GradeSection,
  student: Pick<RegisteredStudent2019, 'targetGrade' | 'stream'>
): boolean {
  if (!isAcademicSection(section)) return false;
  if (section.grade !== student.targetGrade) return false;
  if (section.grade >= 11) {
    return (section.stream === 'Natural Science' || section.stream === 'Social Science') && section.stream === student.stream;
  }
  return true;
}

export interface SectionFill {
  enrolled: number;
  male: number;
  female: number;
  capacity: number;
  free: number;
}

/**
 * How full a section is, counted from the registered students that are placed in it right now.
 * The head count saved on the section is NOT used: it can be out of date (for example after students
 * were deleted from the database), and trusting it would keep seats taken that are really free.
 * Pass the registered list as it is BEFORE any new placement is applied.
 */
export function getSectionFill(section: GradeSection, registered: RegisteredStudent2019[]): SectionFill {
  const mine = registered.filter((r) => norm(r.allocatedSection) === norm(section.section));
  const male = mine.filter((r) => r.gender === 'M').length;
  const female = mine.length - male;
  const enrolled = mine.length;
  const capacity = getSectionCapacity(section);
  return { enrolled, male, female, capacity, free: Math.max(0, capacity - enrolled) };
}

/** A new seat count may not be lower than the number of students already in the class. */
export function validateSectionCapacity(
  section: GradeSection,
  newCapacity: number,
  registered: RegisteredStudent2019[]
): { ok: boolean; minimum: number } {
  const { enrolled } = getSectionFill(section, registered);
  const ok = Number.isFinite(newCapacity) && newCapacity >= 1 && newCapacity >= enrolled;
  return { ok, minimum: Math.max(1, enrolled) };
}

/** Registered students who have no class yet, optionally limited to one grade (and stream). */
export function getWaitingStudents(
  registered: RegisteredStudent2019[],
  sections: GradeSection[],
  grade?: number,
  stream?: 'Natural Science' | 'Social Science'
): RegisteredStudent2019[] {
  const existing = new Set(sections.filter(isAcademicSection).map((s) => norm(s.section)));
  return registered.filter((r) => {
    if (grade !== undefined && r.targetGrade !== grade) return false;
    if (grade !== undefined && grade >= 11 && stream && r.stream !== stream) return false;
    // Waiting = no class, or a class that no longer exists.
    return !r.allocatedSection || !existing.has(norm(r.allocatedSection));
  });
}

export interface SeatAssignment {
  studentId: string;
  sectionCode: string;
}

/**
 * Puts waiting students into open seats of existing classes that match (grade, stream).
 * Higher marks are placed first. Each student goes to the matching class that has the fewest
 * students overall (so class sizes level out), and when sizes are equal, to the class with the
 * fewest students of the same gender (so boys and girls stay balanced).
 * Students that no class can take are returned in `remaining` (in their original order).
 */
export function planSeatFilling(
  waiting: RegisteredStudent2019[],
  sections: GradeSection[],
  registered: RegisteredStudent2019[]
): { assignments: SeatAssignment[]; remaining: RegisteredStudent2019[] } {
  const state = sections.filter(isAcademicSection).map((sec) => ({ sec, ...getSectionFill(sec, registered) }));
  const byMerit = [...waiting].sort((a, b) => (b.previousAverageScore || 75) - (a.previousAverageScore || 75));
  const assignments: SeatAssignment[] = [];
  const placed = new Set<string>();

  for (const st of byMerit) {
    const options = state.filter((x) => x.free > 0 && sectionAcceptsStudent(x.sec, st));
    if (options.length === 0) continue;
    const sameGender = (x: (typeof state)[number]) => (st.gender === 'M' ? x.male : x.female);
    options.sort(
      (a, b) =>
        a.enrolled - b.enrolled ||
        sameGender(a) - sameGender(b) ||
        a.sec.section.localeCompare(b.sec.section)
    );
    const pick = options[0];
    pick.enrolled += 1;
    pick.free -= 1;
    if (st.gender === 'M') pick.male += 1;
    else pick.female += 1;
    assignments.push({ studentId: st.id, sectionCode: pick.sec.section });
    placed.add(st.id);
  }

  return { assignments, remaining: waiting.filter((s) => !placed.has(s.id)) };
}

/**
 * Returns the sections that change when the assignments are applied, with updated student counts.
 * `registeredBefore` must be the registered list before the placement was applied.
 */
export function applyAssignmentsToSections(
  sections: GradeSection[],
  assignments: SeatAssignment[],
  registeredBefore: RegisteredStudent2019[]
): GradeSection[] {
  const byId = new Map(registeredBefore.map((r) => [r.id, r]));
  const touched = new Set(assignments.map((a) => norm(a.sectionCode)));
  return sections
    .filter((sec) => touched.has(norm(sec.section)))
    .map((sec) => {
      const fill = getSectionFill(sec, registeredBefore);
      let addM = 0;
      let addF = 0;
      assignments.forEach((a) => {
        if (norm(a.sectionCode) !== norm(sec.section)) return;
        const st = byId.get(a.studentId);
        if (!st) return;
        if (st.gender === 'M') addM += 1;
        else addF += 1;
      });
      return {
        ...sec,
        totalStudents: fill.enrolled + addM + addF,
        maleStudents: fill.male + addM,
        femaleStudents: fill.female + addF
      };
    });
}

/** Letter index (0 = A) a new class should start from, so it continues after existing classes. */
export function nextLetterIndex(
  sections: GradeSection[],
  grade: number,
  stream?: 'Natural Science' | 'Social Science'
): number {
  let max = -1;
  sections.forEach((sec) => {
    if (!isAcademicSection(sec) || sec.grade !== grade) return;
    if (grade >= 11 && stream && sec.stream !== stream) return;
    const letter = (sec.sectionLetter || '').trim().toUpperCase();
    if (/^[A-Z]$/.test(letter)) max = Math.max(max, letter.charCodeAt(0) - 65);
  });
  return max + 1;
}
