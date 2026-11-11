/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssessmentColumnDef } from '../data/schoolData';

/**
 * A teacher can set up their own gradebook columns (for example ONE column "out of 10"). The marks are saved per column,
 * and the school summary (Assessment 30 + Mid 20 + Final 50) is only a rescaled copy of the percentage. This file keeps
 * the column definitions with the marks and works out what to SHOW from the real columns, so nothing looks rescaled.
 */

/** Key inside the saved per-column marks (the existing custom_assessments JSON column) that holds the definitions. */
export const COLUMNS_KEY = '__cols';

type Marks = Record<string, number>;

interface SubjectMarks {
  continuousAssessment: number;
  midExam: number;
  finalExam: number;
  customAssessments?: Marks;
  assessmentColumns?: AssessmentColumnDef[];
}

/** What is written to the database column: the marks plus the column definitions. null when there is nothing to save. */
export function packCustomAssessments(sub: Pick<SubjectMarks, 'customAssessments' | 'assessmentColumns'>): Record<string, unknown> | null {
  const cols = sub.assessmentColumns;
  if (!sub.customAssessments && !(cols && cols.length)) return null;
  return { ...(sub.customAssessments || {}), ...(cols && cols.length ? { [COLUMNS_KEY]: cols } : {}) };
}

const validCol = (c: any): c is AssessmentColumnDef =>
  c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.maxScore === 'number' && c.maxScore > 0;

/** Splits what was read from the database back into the marks and the column definitions. */
export function unpackCustomAssessments(raw: unknown): { customAssessments?: Marks; assessmentColumns?: AssessmentColumnDef[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const { [COLUMNS_KEY]: rawCols, ...rest } = raw as Record<string, unknown>;
  const marks: Marks = {};
  Object.entries(rest).forEach(([k, v]) => {
    if (typeof v === 'number') marks[k] = v;
  });
  const cols = Array.isArray(rawCols) ? rawCols.filter(validCol).map((c) => ({ id: c.id, name: c.name, maxScore: c.maxScore, ...(c.isBonus ? { isBonus: true } : {}) })) : [];
  return {
    customAssessments: Object.keys(marks).length || cols.length ? marks : undefined,
    assessmentColumns: cols.length ? cols : undefined
  };
}

export interface ColumnScore {
  id: string;
  name: string;
  score: number;
  max: number;
  isBonus: boolean;
}

export interface SubjectBreakdown {
  /** The columns exactly as the teacher set them up (or the school's 30 / 20 / 50 split for older records). */
  columns: ColumnScore[];
  earned: number;
  /** What the marks are out of: the sum of the non-bonus columns (100 for older records). */
  max: number;
  /** earned / max, as a percentage (what the pass mark and the letter grade use). */
  percentage: number;
  /** true when the teacher's own columns are used, false for the school's fixed 30 / 20 / 50 split. */
  custom: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The real marks of a subject for display. */
export function getSubjectBreakdown(sub: SubjectMarks): SubjectBreakdown {
  const cols = sub.assessmentColumns;
  const marks = sub.customAssessments;
  if (cols && cols.length && marks) {
    const columns: ColumnScore[] = cols.map((c) => ({
      id: c.id,
      name: c.name,
      score: round1(Number(marks[c.id]) || 0),
      max: c.maxScore,
      isBonus: Boolean(c.isBonus)
    }));
    const max = columns.filter((c) => !c.isBonus).reduce((a, c) => a + c.max, 0) || 100;
    const earned = round1(columns.reduce((a, c) => a + c.score, 0));
    return { columns, earned, max, percentage: round1((earned / max) * 100), custom: true };
  }
  const c = Math.max(0, Math.min(30, Number(sub.continuousAssessment) || 0));
  const m = Math.max(0, Math.min(20, Number(sub.midExam) || 0));
  const f = Math.max(0, Math.min(50, Number(sub.finalExam) || 0));
  const earned = round1(c + m + f);
  return {
    columns: [
      { id: 'continuousAssessment', name: 'Assessment', score: round1(c), max: 30, isBonus: false },
      { id: 'midExam', name: 'Mid', score: round1(m), max: 20, isBonus: false },
      { id: 'finalExam', name: 'Final', score: round1(f), max: 50, isBonus: false }
    ],
    earned,
    max: 100,
    percentage: earned,
    custom: false
  };
}
