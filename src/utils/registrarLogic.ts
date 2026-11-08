import { Student } from '../data/schoolData';
import { calculateTotalScore } from './gradeCalculations';
import { ArchiveStudent, RegisteredStudent2019, SectionAllocationBucket } from './registrationAndTimetable';

/* ------------------------------------------------------------------ */
/*  Last-year suggestions                                              */
/* ------------------------------------------------------------------ */

/** Lower-case, strip accents and punctuation, collapse spaces. Amharic passes through untouched. */
export const normalizeName = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const A = Array.from(a);
  const B = Array.from(b);
  let prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

/** 1 = word starts with what was typed, 0.8 = one typo away, 0 = no match. */
function tokenScore(typed: string, nameTokens: string[]): number {
  let best = 0;
  for (const t of nameTokens) {
    if (t.startsWith(typed)) return 1;
    if (typed.length >= 4 && editDistance(typed, t.slice(0, typed.length), 1) <= 1) best = Math.max(best, 0.8);
  }
  return best;
}

export interface Suggestion {
  student: ArchiveStudent;
  score: number;
}

/**
 * Finds last year's students that look like what the registrar is typing.
 * Every typed word must match (as a start of a name, or within one typo), in English or Amharic.
 * A student ID fragment also matches. Best matches first.
 */
export function suggestPreviousStudents(pool: ArchiveStudent[], query: string, limit = 6): Suggestion[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const typed = q.split(' ').filter(Boolean);
  const out: Suggestion[] = [];

  for (const st of pool) {
    const en = normalizeName(st.fullName);
    const am = normalizeName(st.fullNameAmharic || '');
    const id = st.studentId.toLowerCase();
    let score = 0;

    if (q.length >= 3 && /\d/.test(q) && id.includes(q)) {
      score = 1;
    } else {
      for (const tokens of [en.split(' '), am.split(' ')]) {
        let sum = 0;
        let ok = true;
        for (const w of typed) {
          const sc = tokenScore(w, tokens);
          if (sc === 0) { ok = false; break; }
          sum += sc;
        }
        if (ok) score = Math.max(score, sum / typed.length);
      }
      if (score > 0 && (en.startsWith(q) || am.startsWith(q))) score += 0.2;
    }
    if (score > 0) out.push({ student: st, score });
  }
  return out
    .sort((a, b) => b.score - a.score || a.student.fullName.localeCompare(b.student.fullName))
    .slice(0, limit);
}

/** A student's average mark (out of 100) over every subject and semester that has marks. 0 = no marks yet. */
export function studentAverageScore(st: Student): number {
  const totals: number[] = [];
  (st.semesters || []).forEach((sem) =>
    (sem.subjects || []).forEach((sub: any) => {
      const t = calculateTotalScore(sub.continuousAssessment || 0, sub.midExam || 0, sub.finalExam || 0);
      if (t > 0) totals.push(t);
    })
  );
  return totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : 0;
}

/** Turns the school's current students into the "last year" pool. Grade 12 students have graduated, so they are left out. */
export function studentsToArchive(students: Student[], schoolName = 'Hailemariam Mamo School'): ArchiveStudent[] {
  return students
    .filter((s) => s.grade >= 8 && s.grade < 12)
    .map((s) => ({
      id: `prev-${s.id}`,
      studentId: s.studentId,
      fullName: s.fullName,
      fullNameAmharic: s.fullNameAmharic || '',
      gender: s.gender,
      previousGrade: s.grade,
      previousSection: `${s.grade}${s.section}`,
      previousSchool: schoolName,
      previousAverageScore: studentAverageScore(s),
      eligibleForGrade: s.grade + 1,
      recommendedStream: s.stream,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      conduct: s.conduct
    }));
}

/* ------------------------------------------------------------------ */
/*  CTE allocation: ranked choices, highest marks first                */
/* ------------------------------------------------------------------ */

export interface CteTrack {
  labelEn: string;
  code: string;
  capacity: number;
}

export interface CteAllocationResult {
  buckets: SectionAllocationBucket[];
  /** Students whose every choice was full. They stay unplaced until the registrar decides. */
  unplaced: RegisteredStudent2019[];
  /** How many students got their 1st, 2nd, 3rd and 4th choice. */
  rankCounts: number[];
  /** Seats used per track label. */
  used: Record<string, number>;
}

const trackFor = (value: string, tracks: CteTrack[]): CteTrack | undefined => {
  const v = (value || '').toLowerCase();
  return tracks.find((t) => v === t.labelEn.toLowerCase() || v.includes(t.labelEn.toLowerCase()) || v === t.code.toLowerCase());
};

/** A student's preferences, best first. Older records with one pick become a one-item list. */
export const choicesOf = (s: RegisteredStudent2019): string[] =>
  s.cteChoices && s.cteChoices.length ? s.cteChoices : s.cteSpecialization ? [s.cteSpecialization] : [];

/**
 * Highest marks choose first. Each student gets their best-ranked track that still has a free seat.
 * Ties on marks go to whoever registered first, so the result is the same every time it is run.
 */
export function allocateCteByMerit(students: RegisteredStudent2019[], tracks: CteTrack[], grade: number): CteAllocationResult {
  const ordered = [...students].sort(
    (a, b) =>
      (b.previousAverageScore ?? 0) - (a.previousAverageScore ?? 0) ||
      (a.registrationDate || '').localeCompare(b.registrationDate || '') ||
      a.fullName.localeCompare(b.fullName)
  );

  const seats: Record<string, RegisteredStudent2019[]> = {};
  tracks.forEach((t) => (seats[t.labelEn] = []));
  const unplaced: RegisteredStudent2019[] = [];
  const rankCounts = [0, 0, 0, 0];

  for (const st of ordered) {
    let placed = false;
    const prefs = choicesOf(st);
    for (let i = 0; i < prefs.length && !placed; i++) {
      const t = trackFor(prefs[i], tracks);
      if (t && seats[t.labelEn].length < t.capacity) {
        seats[t.labelEn].push({ ...st, cteSpecialization: t.labelEn, cteRank: i + 1, cteSection: `${grade}-CTE-${t.code}` });
        rankCounts[Math.min(i, 3)]++;
        placed = true;
      }
    }
    if (!placed) unplaced.push(st);
  }

  const buckets: SectionAllocationBucket[] = [];
  tracks.forEach((t, idx) => {
    const list = seats[t.labelEn];
    if (list.length === 0) return;
    buckets.push({
      sectionCode: `${grade}-CTE-${t.code}`,
      sectionLetter: `CTE-${t.code}`,
      students: list,
      maleCount: list.filter((s) => s.gender === 'M').length,
      femaleCount: list.filter((s) => s.gender === 'F').length,
      averageScore: Math.round(list.reduce((a, s) => a + (s.previousAverageScore || 0), 0) / list.length),
      maxCapacity: t.capacity,
      roomNumber: `Tech Lab ${idx + 1}`,
      isCteSection: true,
      cteSpecialization: t.labelEn
    });
  });

  const used: Record<string, number> = {};
  tracks.forEach((t) => (used[t.labelEn] = seats[t.labelEn].length));
  return { buckets, unplaced, rankCounts, used };
}
