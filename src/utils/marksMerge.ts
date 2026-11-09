import { Student } from '../data/schoolData';

/** How long (ms) a student stays "protected" after being edited on this device. */
export const RECENT_EDIT_MS = 8000;

/**
 * Merges a fresh copy of the students from the cloud into what this device has.
 * Without this, every background refresh replaced the screen with the cloud copy, which could be
 * slightly behind (or lack the per-column marks) and made typed marks jump around.
 *
 *  1. A student edited on this device a moment ago is kept exactly as it is here.
 *  2. If the cloud copy of a subject has no per-column marks (older database), the ones this device
 *     has are carried over together with their totals, so the columns stay consistent.
 */
export function mergeCloudStudents(
  local: Student[],
  cloud: Student[],
  editedAt: Map<string, number>,
  now: number = Date.now()
): Student[] {
  const localById = new Map(local.map((s) => [s.id, s]));
  return cloud.map((cs) => {
    const ls = localById.get(cs.id);
    if (!ls) return cs;

    const t = editedAt.get(cs.id);
    if (t !== undefined && now - t < RECENT_EDIT_MS) return ls;

    let changed = false;
    const semesters = cs.semesters.map((csem) => {
      const lsem = ls.semesters.find((x) => x.semester === csem.semester);
      if (!lsem) return csem;
      return {
        ...csem,
        subjects: csem.subjects.map((csub) => {
          if (csub.customAssessments) return csub;
          const lsub = lsem.subjects.find((x) => x.subjectId === csub.subjectId);
          if (!lsub?.customAssessments) return csub;
          changed = true;
          return {
            ...csub,
            continuousAssessment: lsub.continuousAssessment,
            midExam: lsub.midExam,
            finalExam: lsub.finalExam,
            customAssessments: lsub.customAssessments
          };
        })
      };
    });
    return changed ? { ...cs, semesters } : cs;
  });
}
