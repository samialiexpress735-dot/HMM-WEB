/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GradeSection, Teacher, Student } from '../data/schoolData';

/**
 * Normalizes a string for comparison.
 */
function clean(str?: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Returns all section codes assigned to a teacher either as Homeroom Teacher
 * or as a Subject Teacher, combined with any pre-configured sectionsTeaching.
 * This ensures full synchronization between the administrative assignments and teacher desks.
 */
export function getSectionsAssignedToTeacher(
  teacher: Teacher | null | undefined,
  sections: GradeSection[]
): string[] {
  if (!teacher) return [];
  const assigned = new Set<string>();

  const teacherName = clean(teacher.name);
  const teacherId = clean(teacher.id);

  // 1. Scan GradeSections for Homeroom and Subject Assignments (Single Source of Truth)
  sections.forEach((sec) => {
    const homeroomId = clean(sec.homeroomTeacher?.id);
    const homeroomName = clean(sec.homeroomTeacher?.name);

    const isHomeroom =
      (teacherId && homeroomId === teacherId) ||
      (teacherName && homeroomName === teacherName);

    const isSubject = sec.subjectAssignments?.some((sa) => {
      const saId = clean(sa.teacherId);
      const saName = clean(sa.teacherName);
      return (teacherId && saId === teacherId) || (teacherName && saName === teacherName);
    });

    if (isHomeroom || isSubject) {
      if (sec.section) {
        assigned.add(sec.section);
      }
    }
  });

  // 2. Include any legacy/manual sectionsTeaching that match existing school sections or valid format
  teacher.sectionsTeaching?.forEach((secCode) => {
    if (
      secCode &&
      secCode !== 'To be assigned in Grades of This Year' &&
      secCode !== 'Unassigned'
    ) {
      assigned.add(secCode);
    }
  });

  return Array.from(assigned);
}

/**
 * Returns the specific roles and subjects a teacher teaches in a given section.
 */
export function getTeacherRolesForSection(
  teacher: Teacher | null | undefined,
  section: GradeSection
): { isHomeroom: boolean; subjects: string[] } {
  if (!teacher || !section) return { isHomeroom: false, subjects: [] };

  const teacherName = clean(teacher.name);
  const teacherId = clean(teacher.id);

  const homeroomId = clean(section.homeroomTeacher?.id);
  const homeroomName = clean(section.homeroomTeacher?.name);

  const isHomeroom = Boolean(
    (teacherId && homeroomId === teacherId) ||
    (teacherName && homeroomName === teacherName)
  );

  const subjects: string[] = [];
  section.subjectAssignments?.forEach((sa) => {
    const saId = clean(sa.teacherId);
    const saName = clean(sa.teacherName);
    if ((teacherId && saId === teacherId) || (teacherName && saName === teacherName)) {
      subjects.push(sa.subjectName || sa.subjectId.toUpperCase());
    }
  });

  return { isHomeroom, subjects };
}

/**
 * Filter students belonging to a target section code (handles 9A, 9B, 11-Nat-A, 11-Soc-B, etc.)
 */
export function getStudentsForSection(
  sectionCode: string,
  sections: GradeSection[],
  students: Student[]
): Student[] {
  if (!sectionCode) return [];

  const targetUpper = sectionCode.toUpperCase().trim();
  const activeSectionObj = sections.find(
    (sec) => (sec.section || '').toUpperCase().trim() === targetUpper
  );

  const targetGrade = activeSectionObj
    ? activeSectionObj.grade
    : parseInt(sectionCode.replace(/\D/g, ''), 10) || 9;

  // Extract letter: e.g. "11-Nat-A" -> "A", "9B" -> "B"
  const targetLetter = activeSectionObj
    ? activeSectionObj.sectionLetter.toUpperCase().trim()
    : (sectionCode.split('-').pop() || sectionCode.replace(/\d/g, '') || 'A').toUpperCase().trim();

  const targetStream = activeSectionObj?.stream;

  return students.filter((s) => {
    // 0. Specialized CTE Section check (cross-homeroom cohort for Grade 11 & 12)
    if (activeSectionObj?.isCteSection || targetUpper.includes('CTE')) {
      if (s.grade !== targetGrade) return false;
      const targetCte = (activeSectionObj?.cteSpecialization || '').toLowerCase().trim();
      const studentCte = (s.cteSpecialization || '').toLowerCase().trim();
      if (targetCte && studentCte) {
        return studentCte.includes(targetCte) || targetCte.includes(studentCte);
      }
      if (targetUpper.includes('WD') && (studentCte.includes('web') || studentCte.includes('wd'))) return true;
      if (targetUpper.includes('ACC') && (studentCte.includes('account') || studentCte.includes('acc'))) return true;
      if (targetUpper.includes('MKT') && (studentCte.includes('market') || studentCte.includes('mkt'))) return true;
      if (targetUpper.includes('CST') && (studentCte.includes('construct') || studentCte.includes('cst'))) return true;
      return Boolean(s.cteSpecialization);
    }

    // 1. Direct allocatedSection match (e.g. from registrar allocation)
    const allocatedSec = (s as any).allocatedSection;
    if (allocatedSec && String(allocatedSec).toUpperCase().trim() === targetUpper) {
      return true;
    }

    // 2. Direct section string match (e.g. "11-Nat-A" or "9A")
    if (s.section && s.section.toUpperCase().trim() === targetUpper) {
      return true;
    }

    // 3. Grade match
    if (s.grade !== targetGrade) return false;

    // 4. Stream check for preparatory grades (11 & 12)
    if (targetGrade >= 11 && targetStream && s.stream) {
      if (s.stream !== targetStream) return false;
    }

    // 5. Section letter check
    const studentLetter = (s.section || '').toUpperCase().trim();
    return studentLetter === targetLetter || studentLetter === targetUpper;
  });
}
