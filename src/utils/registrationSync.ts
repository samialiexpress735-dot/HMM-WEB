/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GradeSection } from '../data/schoolData';
import { RegisteredStudent2019 } from './registrationAndTimetable';

const norm = (s?: string | null) => (s || '').toUpperCase().trim();

export interface ReconcileResult {
  /** The list the screen should show. */
  merged: RegisteredStudent2019[];
  /** Students that were on screen but no longer exist in the database (deleted there). */
  removed: RegisteredStudent2019[];
  /** Students that exist only on this device and still have to be saved to the database. */
  toUpload: RegisteredStudent2019[];
}

/**
 * Makes the on-screen registrations match the database.
 *
 * - The database is the truth: a student that is not in it any more is removed here too.
 * - The only students kept when the database does not have them are the ones whose save has not
 *   gone through yet (`pendingIds`). Those are sent up instead of being dropped.
 * - A student whose save is still pending keeps the local copy, so a failed save is not overwritten
 *   by the older database row.
 */
export function reconcileRegistrations(
  local: RegisteredStudent2019[],
  cloud: RegisteredStudent2019[],
  pendingIds: Set<string>
): ReconcileResult {
  const localById = new Map(local.map((r) => [r.id, r]));
  const cloudIds = new Set(cloud.map((r) => r.id));
  const toUpload: RegisteredStudent2019[] = [];

  const merged: RegisteredStudent2019[] = cloud.map((c) => {
    const l = localById.get(c.id);
    if (!l) return c;
    if (pendingIds.has(c.id)) {
      toUpload.push(l);
      return l;
    }
    // Fields the database could not supply (e.g. a column that was never added) keep the local value.
    const defined = Object.fromEntries(
      Object.entries(c).filter(([, v]) => v !== undefined && v !== '' && v !== null)
    ) as Partial<RegisteredStudent2019>;
    // The class column always exists, so an empty value there is real: the class was cleared in the database.
    return { ...l, ...defined, allocatedSection: c.allocatedSection || undefined };
  });

  const removed: RegisteredStudent2019[] = [];
  local.forEach((l) => {
    if (cloudIds.has(l.id)) return;
    if (pendingIds.has(l.id)) {
      merged.push(l);
      toUpload.push(l);
    } else {
      removed.push(l);
    }
  });

  merged.sort((x, y) => (y.registrationDate || '').localeCompare(x.registrationDate || ''));
  return { merged, removed, toUpload };
}

/**
 * Returns the sections whose saved student counts drop because students were removed from them.
 * Both the student's class and, in Grades 11-12, the student's CTE group give up the seat.
 */
export function releaseSeatsOfRemoved(sections: GradeSection[], removed: RegisteredStudent2019[]): GradeSection[] {
  const lost = new Map<string, { m: number; f: number }>();
  const add = (code: string | undefined, gender: string) => {
    const key = norm(code);
    if (!key) return;
    const entry = lost.get(key) || { m: 0, f: 0 };
    if (gender === 'M') entry.m += 1;
    else entry.f += 1;
    lost.set(key, entry);
  };
  removed.forEach((r) => {
    add(r.allocatedSection, r.gender);
    add(r.cteSection, r.gender);
  });

  return sections
    .filter((sec) => lost.has(norm(sec.section)))
    .map((sec) => {
      const g = lost.get(norm(sec.section))!;
      return {
        ...sec,
        totalStudents: Math.max(0, (sec.totalStudents || 0) - g.m - g.f),
        maleStudents: Math.max(0, (sec.maleStudents || 0) - g.m),
        femaleStudents: Math.max(0, (sec.femaleStudents || 0) - g.f)
      };
    });
}
