/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ArchiveStudent } from './registrationAndTimetable';
import type { Student } from '../data/schoolData';

/**
 * Previous-year student matching
 * ------------------------------
 * Used by the registration page to suggest likely matches from last year's
 * records while the administrator is still typing. The result is only ever a
 * *suggestion*: the administrator always confirms or rejects it.
 *
 * Design:
 *  1. Index   – built once per record list (`buildStudentMatchIndex`). Every
 *               name token is folded to a phonetic-ish form and stored in an
 *               inverted bigram index.
 *  2. Retrieve – the entered name parts are looked up in the inverted index, so
 *               only a handful of plausible records are scored, no matter how
 *               many thousands of students exist.
 *  3. Score   – candidates are scored with fuzzy name similarity (positional
 *               and order-independent), date of birth, gender and guardian
 *               details. Weak matches are dropped; strong claims ("very
 *               likely") require independent corroboration beyond the name.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentMatchQuery {
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  fullNameAmharic?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: 'M' | 'F';
  guardianName?: string;
  guardianPhone?: string;
  /** Grade the student is being registered into. A soft signal only. */
  targetGrade?: number;
  /** Optional: an old student ID typed by the administrator. */
  previousStudentId?: string;
}

export type MatchLevel = 'very-likely' | 'likely' | 'possible';
export type FieldStatus = 'match' | 'similar' | 'differs' | 'unknown';

export interface MatchFieldComparison {
  name: FieldStatus;
  dateOfBirth: FieldStatus;
  gender: FieldStatus;
  guardian: FieldStatus;
}

export interface StudentMatch {
  record: ArchiveStudent;
  /** 0..1 */
  score: number;
  level: MatchLevel;
  /** True when the match came from an exact previous Student ID. */
  byStudentId: boolean;
  fields: MatchFieldComparison;
}

export interface MatchOptions {
  /** Matches scoring below this are not shown. */
  minScore?: number;
  /** Maximum number of suggestions returned. */
  limit?: number;
}

export const DEFAULT_MIN_SCORE = 0.72;
export const DEFAULT_MATCH_LIMIT = 3;
const MAX_RETRIEVED_CANDIDATES = 400;

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

/** Splits "Yared Getachew Tadesse" into the three-part Ethiopian name. */
export function splitFullName(fullName: string): {
  firstName: string;
  fatherName: string;
  grandfatherName: string;
} {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    fatherName: parts[1] || '',
    grandfatherName: parts.slice(2).join(' ')
  };
}

export function composeFullName(firstName: string, fatherName: string, grandfatherName: string): string {
  return [firstName, fatherName, grandfatherName]
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(' ');
}

/** Lower-cases, removes accents/punctuation and collapses whitespace. */
export function normalizeName(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Folds common transliteration variants so that e.g. "Yoseph"/"Yosef",
 * "Mulugeta"/"Mulugetta" and "Tsegaye"/"Segaye" compare as equal.
 * Only touches Latin letters; Amharic (Ge'ez) tokens pass through unchanged.
 */
export function foldToken(token: string): string {
  if (!/^[a-z]+$/.test(token)) return token;
  return token
    .replace(/^ts/, 's')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck/g, 'k')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1');
}

function tokenize(input: string): string[] {
  const normalized = normalizeName(input);
  return normalized ? normalized.split(' ').map(foldToken) : [];
}

// ---------------------------------------------------------------------------
// String similarity
// ---------------------------------------------------------------------------

/** Optimal-string-alignment (Damerau-Levenshtein) edit distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Similarity of two (already normalised) tokens in 0..1. */
export function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // A lone initial ("G.") matches any token that starts with it, weakly.
  if (a.length === 1 || b.length === 1) {
    return a[0] === b[0] ? 0.7 : 0;
  }

  const maxLen = Math.max(a.length, b.length);
  const ratio = 1 - editDistance(a, b) / maxLen;
  // Very short tokens are fragile: one wrong letter is a big relative change,
  // but also a very different name. Keep the plain ratio for them.
  return Math.max(0, ratio);
}

/**
 * Turns a raw similarity into "how much do we believe this is the same name".
 * One typo in a normal-length name (similarity ~0.8+) keeps most of its credit,
 * while merely related-looking names (similarity < 0.6) earn nothing.
 */
function sharpen(sim: number): number {
  if (sim >= 1) return 1;
  if (sim >= 0.8) return 0.75 + (sim - 0.8) * 1.25;
  if (sim >= 0.6) return (sim - 0.6) * 3.75;
  return 0;
}

const NAME_PART_WEIGHTS = [0.45, 0.33, 0.22];

interface NameAlignment {
  score: number;
  /** Entered name parts that clearly do not agree with the record. */
  mismatches: number;
}

/**
 * Aligns the entered name parts with a record's name tokens.
 * Uses the better of a positional comparison (first↔first, father↔father…)
 * and an order-independent one (slightly discounted).
 */
function alignNameParts(queryParts: string[], recordTokens: string[]): NameAlignment {
  const parts = queryParts
    .map((token, originalIndex) => ({ token, originalIndex, weight: NAME_PART_WEIGHTS[originalIndex] ?? 0.2 }))
    .filter((p) => p.token);
  if (parts.length === 0 || recordTokens.length === 0) return { score: 0, mismatches: parts.length };

  const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0);

  // Positional
  let positionalSum = 0;
  let positionalMismatches = 0;
  parts.forEach((p) => {
    const candidate = recordTokens[p.originalIndex];
    const value = sharpen(candidate ? tokenSimilarity(p.token, candidate) : 0);
    positionalSum += p.weight * value;
    if (value < 0.3) positionalMismatches += 1;
  });
  const positional = positionalSum / totalWeight;

  // Order independent: each record token may be used once.
  const used = new Set<number>();
  let bagSum = 0;
  let bagMismatches = 0;
  parts.forEach((p) => {
    let best = 0;
    let bestIdx = -1;
    recordTokens.forEach((rt, idx) => {
      if (used.has(idx)) return;
      const sim = tokenSimilarity(p.token, rt);
      if (sim > best) {
        best = sim;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    const value = sharpen(best);
    bagSum += p.weight * value;
    if (value < 0.3) bagMismatches += 1;
  });
  const bag = (bagSum / totalWeight) * 0.88;

  return positional >= bag
    ? { score: positional, mismatches: positionalMismatches }
    : { score: bag, mismatches: bagMismatches };
}

/** Similarity (0..1) of the entered name parts to a record's name tokens. */
export function scoreNameParts(queryParts: string[], recordTokens: string[]): number {
  return alignNameParts(queryParts, recordTokens).score;
}

// ---------------------------------------------------------------------------
// Other field comparisons
// ---------------------------------------------------------------------------

function parseIsoDate(value?: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** 1 = identical, partial credit for the typical data-entry slips. */
export function scoreDateOfBirth(a?: string, b?: string): number | null {
  const da = parseIsoDate(a);
  const db = parseIsoDate(b);
  if (!da || !db) return null;
  if (da.y === db.y && da.m === db.m && da.d === db.d) return 1;
  // Day and month typed the wrong way round (03/08 vs 08/03)
  if (da.y === db.y && da.m === db.d && da.d === db.m) return 0.8;
  if (da.y === db.y && da.m === db.m) return 0.6; // wrong day
  if (da.y === db.y && da.d === db.d) return 0.45; // wrong month
  if (da.y === db.y) return 0.3;
  if (Math.abs(da.y - db.y) === 1 && da.m === db.m && da.d === db.d) return 0.35;
  return 0;
}

const GUARDIAN_PLACEHOLDERS = new Set(['parent guardian', 'parent / guardian', 'guardian']);
const HONORIFICS = new Set(['ato', 'wro', 'woizero', 'w', 'ro', 'mr', 'mrs', 'ms', 'dr', 'አቶ', 'ወ', 'ሮ', 'ወይዘሮ']);

function guardianTokens(name?: string): string[] {
  const normalized = normalizeName(name || '');
  if (!normalized || GUARDIAN_PLACEHOLDERS.has(normalized) || normalized === 'parent guardian') return [];
  return normalized
    .split(' ')
    .filter((t) => !HONORIFICS.has(t))
    .map(foldToken);
}

function phoneDigits(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  // Placeholders like "+251 91 " or "+251 91 000 0000" carry no information.
  if (digits.length < 9 || /0{6,}$/.test(digits)) return '';
  return digits.slice(-9);
}

function scoreGuardian(
  query: Pick<StudentMatchQuery, 'guardianName' | 'guardianPhone'>,
  record: IndexedRecord
): number | null {
  const scores: number[] = [];

  const qTokens = guardianTokens(query.guardianName);
  if (qTokens.length > 0 && record.guardianTokens.length > 0) {
    scores.push(scoreNameParts(qTokens, record.guardianTokens));
  }

  const qPhone = phoneDigits(query.guardianPhone);
  if (qPhone && record.phone) scores.push(qPhone === record.phone ? 1 : 0);

  return scores.length ? Math.max(...scores) : null;
}

function toStatus(score: number | null): FieldStatus {
  if (score === null) return 'unknown';
  if (score >= 0.95) return 'match';
  if (score >= 0.6) return 'similar';
  return 'differs';
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

interface IndexedRecord {
  record: ArchiveStudent;
  enTokens: string[];
  amTokens: string[];
  guardianTokens: string[];
  phone: string;
}

export interface StudentMatchIndex {
  entries: IndexedRecord[];
  /** bigram -> indexes of entries containing it */
  postings: Map<string, number[]>;
  byStudentId: Map<string, number>;
}

function bigrams(token: string): Set<string> {
  const padded = `^${token}$`;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 1; i++) out.add(padded.slice(i, i + 2));
  return out;
}

export function buildStudentMatchIndex(records: ArchiveStudent[]): StudentMatchIndex {
  const entries: IndexedRecord[] = [];
  const postings = new Map<string, number[]>();
  const byStudentId = new Map<string, number>();

  records.forEach((record) => {
    const idx = entries.length;
    const enTokens = tokenize(record.fullName);
    const amTokens = tokenize(record.fullNameAmharic || '');
    entries.push({
      record,
      enTokens,
      amTokens,
      guardianTokens: guardianTokens(record.guardianName),
      phone: phoneDigits(record.guardianPhone)
    });

    if (record.studentId) byStudentId.set(record.studentId.trim().toLowerCase(), idx);

    const seen = new Set<string>();
    [...enTokens, ...amTokens].forEach((token) => {
      bigrams(token).forEach((bg) => seen.add(bg));
    });
    seen.forEach((bg) => {
      const list = postings.get(bg);
      if (list) list.push(idx);
      else postings.set(bg, [idx]);
    });
  });

  return { entries, postings, byStudentId };
}

/** Looks the query tokens up in the inverted index and returns plausible entries. */
function retrieveCandidates(index: StudentMatchIndex, queryTokens: string[]): number[] {
  const totalHits = new Map<number, number>();
  const passing = new Set<number>();

  queryTokens.forEach((token) => {
    const grams = bigrams(token);
    const perToken = new Map<number, number>();
    grams.forEach((bg) => {
      index.postings.get(bg)?.forEach((entryIdx) => {
        perToken.set(entryIdx, (perToken.get(entryIdx) || 0) + 1);
      });
    });

    // An entry is a candidate when it shares a decent share of this token's bigrams.
    const needed = Math.max(2, Math.ceil(grams.size * 0.4));
    perToken.forEach((hits, entryIdx) => {
      if (hits >= needed) {
        passing.add(entryIdx);
        totalHits.set(entryIdx, (totalHits.get(entryIdx) || 0) + hits);
      }
    });
  });

  return [...passing]
    .sort((a, b) => (totalHits.get(b) || 0) - (totalHits.get(a) || 0))
    .slice(0, MAX_RETRIEVED_CANDIDATES);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Highest score a match can reach without a second, independent identifier. */
const UNCORROBORATED_CAP = 0.87;
/** Highest score a match can reach when something clearly disagrees. */
const CONTRADICTED_CAP = 0.77;

export function levelForScore(score: number): MatchLevel {
  if (score >= 0.88) return 'very-likely';
  if (score >= 0.78) return 'likely';
  return 'possible';
}

/**
 * True when the query has enough information to run a meaningful check.
 * Requiring the first *and* father's name keeps one-letter searches from
 * flooding the administrator with irrelevant suggestions.
 */
export function hasEnoughToMatch(query: StudentMatchQuery): boolean {
  if (query.previousStudentId && query.previousStudentId.trim().length >= 4) return true;
  return normalizeName(query.firstName).length >= 2 && normalizeName(query.fatherName).length >= 2;
}

export interface MatchSearchResult {
  /** Best matches, limited to `options.limit`. */
  matches: StudentMatch[];
  /** How many records passed the minimum score before the limit was applied. */
  totalFound: number;
}

export function findPreviousYearMatches(
  index: StudentMatchIndex,
  query: StudentMatchQuery,
  options: MatchOptions = {}
): StudentMatch[] {
  return searchPreviousYearStudents(index, query, options).matches;
}

export function searchPreviousYearStudents(
  index: StudentMatchIndex,
  query: StudentMatchQuery,
  options: MatchOptions = {}
): MatchSearchResult {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit ?? DEFAULT_MATCH_LIMIT;
  if (!hasEnoughToMatch(query)) return { matches: [], totalFound: 0 };

  const results: StudentMatch[] = [];
  const included = new Set<number>();

  // 1. Exact previous Student ID: always shown first.
  const idKey = (query.previousStudentId || '').trim().toLowerCase();
  if (idKey && index.byStudentId.has(idKey)) {
    const idx = index.byStudentId.get(idKey)!;
    included.add(idx);
    results.push(buildResult(index.entries[idx], query, 1, true));
  }

  // 2. Fuzzy matching on names and supporting details.
  const qEn = [query.firstName, query.fatherName, query.grandfatherName].map((p) => tokenize(p).join(' '));
  const qAm = tokenize(query.fullNameAmharic || '');
  const retrievalTokens = [...qEn.filter(Boolean), ...qAm.slice(0, 2)];
  if (retrievalTokens.length > 0) {
    const candidates = retrieveCandidates(index, retrievalTokens);
    const scored: StudentMatch[] = [];
    candidates.forEach((idx) => {
      if (included.has(idx)) return;
      const entry = index.entries[idx];
      const score = scoreCandidate(entry, query, qEn, qAm);
      if (score.value >= minScore) {
        scored.push(buildResult(entry, query, score.value, false, score.parts));
      }
    });
    scored.sort((a, b) => b.score - a.score || a.record.studentId.localeCompare(b.record.studentId));
    results.push(...scored);
  }

  return { matches: results.slice(0, limit), totalFound: results.length };
}

interface ScoreParts {
  name: number;
  dob: number | null;
  gender: number | null;
  guardian: number | null;
}

function scoreCandidate(
  entry: IndexedRecord,
  query: StudentMatchQuery,
  qEn: string[],
  qAm: string[]
): { value: number; parts: ScoreParts } {
  // Name: English (positional + order independent) and, when both sides have
  // one, the Amharic name. Whichever agrees better wins.
  const english = alignNameParts(qEn, entry.enTokens);
  let name = english.score;
  let mismatches = english.mismatches;
  if (qAm.length > 0 && entry.amTokens.length > 0) {
    const amharic = alignNameParts(qAm, entry.amTokens);
    if (amharic.score * 0.97 > name) {
      name = amharic.score * 0.97;
      mismatches = amharic.mismatches;
    }
  }

  const dob = scoreDateOfBirth(query.dateOfBirth, entry.record.dateOfBirth);
  const gender = query.gender && entry.record.gender ? (query.gender === entry.record.gender ? 1 : 0) : null;
  const guardian = scoreGuardian(query, entry);
  // Guardians and phone numbers change and siblings share them, so a
  // different guardian is not evidence against: it simply does not count.
  const guardianForScore = guardian !== null && guardian >= 0.5 ? guardian : null;

  const signals: { weight: number; value: number }[] = [{ weight: 0.62, value: name }];
  if (dob !== null) signals.push({ weight: 0.2, value: dob });
  if (gender !== null) signals.push({ weight: 0.08, value: gender });
  if (guardianForScore !== null) signals.push({ weight: 0.1, value: guardianForScore });

  const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
  let value = signals.reduce((acc, s) => acc + s.weight * s.value, 0) / totalWeight;

  // Not enough of the name entered yet to be sure.
  const provided = qEn.filter(Boolean).length;
  const available = Math.min(3, entry.enTokens.length);
  if (provided < available) value *= 0.93;

  // A name match alone is never "very likely": common names repeat. It needs a
  // second, independent identifier (birth date or guardian) to agree.
  const corroborated = (dob !== null && dob >= 0.99) || (guardianForScore !== null && guardianForScore >= 0.9);
  if (!corroborated) value = Math.min(value, UNCORROBORATED_CAP);

  // A name part that clearly disagrees (e.g. a different grandfather's name)
  // means this is probably a relative or a different student altogether. It is
  // only still worth showing when the birth date or guardian vouches for it.
  if (mismatches > 0) value = Math.min(value, corroborated ? CONTRADICTED_CAP : DEFAULT_MIN_SCORE - 0.03);

  // A clearly different date of birth is strong evidence against.
  if (dob !== null && dob < 0.3) value = Math.min(value, CONTRADICTED_CAP);

  // Soft grade signal: the student should be coming from (or repeating) a
  // grade that leads into the target grade.
  if (
    query.targetGrade &&
    entry.record.eligibleForGrade !== query.targetGrade &&
    entry.record.previousGrade !== query.targetGrade
  ) {
    value *= 0.93;
  }

  return { value: Math.max(0, Math.min(1, value)), parts: { name, dob, gender, guardian } };
}

function buildResult(
  entry: IndexedRecord,
  query: StudentMatchQuery,
  score: number,
  byStudentId: boolean,
  parts?: ScoreParts
): StudentMatch {
  let resolved = parts;
  if (!resolved) {
    // ID match: still compute field comparisons so the UI can show them.
    const qEn = [query.firstName, query.fatherName, query.grandfatherName].map((p) => tokenize(p).join(' '));
    const qAm = tokenize(query.fullNameAmharic || '');
    resolved = scoreCandidate(entry, query, qEn, qAm).parts;
  }
  return {
    record: entry.record,
    score,
    level: levelForScore(score),
    byStudentId,
    fields: {
      name: toStatus(resolved.name),
      dateOfBirth: toStatus(resolved.dob),
      gender: toStatus(resolved.gender),
      guardian: toStatus(resolved.guardian)
    }
  };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/** Average of all entered marks, or 0 if there are none. */
function averageOfMarks(student: Student): number {
  let sum = 0;
  let count = 0;
  student.semesters?.forEach((sem) =>
    sem.subjects?.forEach((sub) => {
      const total = (sub.continuousAssessment || 0) + (sub.midExam || 0) + (sub.finalExam || 0);
      if (total > 0) {
        sum += total;
        count += 1;
      }
    })
  );
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
}

/** Converts a currently enrolled student into a record that can be matched next year. */
export function studentToPreviousRecord(student: Student): ArchiveStudent {
  const section = /^\d/.test(student.section) ? student.section : `${student.grade}${student.section}`;
  return {
    id: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    fullNameAmharic: student.fullNameAmharic || '',
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    previousGrade: student.grade,
    previousSection: section,
    previousSchool: 'Hailemariam Mamo Secondary & Prep School',
    previousAverageScore: averageOfMarks(student),
    eligibleForGrade: student.grade + 1,
    recommendedStream: student.stream,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    conduct: student.conduct
  };
}

/** Merges record lists, keeping the first record seen for each student ID. */
export function mergePreviousRecords(...lists: ArchiveStudent[][]): ArchiveStudent[] {
  const seen = new Set<string>();
  const merged: ArchiveStudent[] = [];
  lists.forEach((list) =>
    list.forEach((record) => {
      const key = (record.studentId || record.id).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(record);
    })
  );
  return merged;
}
