/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';
import { ethiopianToIso, ecYearLabel } from './ethiopianCalendar';

/**
 * Academic years are Ethiopian Calendar (E.C.) years written as four digits: '2019'.
 * The database, the cache and the code all use that plain form; only the screen adds "E.C." / "ዓ.ም.".
 */

/**
 * The Gregorian date on which Ethiopian year `ec` begins (Meskerem 1), worked out by the calendar code in
 * ethiopianCalendar.ts (September 11, or September 12 right after an Ethiopian leap year).
 */
export function meskerem1(ec: number): Date {
  return new Date(`${ethiopianToIso(ec, 1, 1)}T00:00:00Z`);
}

/** Reads a year out of the many shapes it has been stored in: '2019', '2019 E.C.', '2024/2025 (2017 ዓ.ም.)'. */
export function yearDigits(raw: string | number | null | undefined, fallback = ''): string {
  const s = String(raw ?? '').trim();
  if (/^\d{4}$/.test(s)) return s;
  if (/(E\.?\s?C|ዓ)/i.test(s)) {
    const m = s.match(/(\d{4})\D*$/);
    if (m) return m[1];
  }
  return fallback;
}

export const nextYear = (year: string): string => String((parseInt(year, 10) || 0) + 1);
export const previousYear = (year: string): string => String((parseInt(year, 10) || 0) - 1);

/** '2019' -> '2019 E.C.' (or '2019 ዓ.ም.'). */
export function formatYear(year: string, lang: 'en' | 'am' = 'en'): string {
  return ecYearLabel(parseInt(year, 10) || 0, lang);
}

export interface RolloverSuggestion {
  /** True once the next year's Meskerem 1 has arrived. */
  due: boolean;
  nextYear: string;
  startsOn: Date;
}

/** Meskerem 1 only SUGGESTS a new year; an administrator still has to press the button. */
export function suggestRollover(currentYear: string, today: Date = new Date()): RolloverSuggestion {
  const next = nextYear(currentYear);
  const startsOn = meskerem1(parseInt(next, 10));
  return { due: today.getTime() >= startsOn.getTime(), nextYear: next, startsOn };
}

// ---- the current academic year, shared by every screen ------------------------------------------------------------

const CACHE_KEY = 'hmm_current_academic_year';
/** Used only until the database has said which year is current. */
export const FALLBACK_ACADEMIC_YEAR = '2019';

function readCached(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = yearDigits(localStorage.getItem(CACHE_KEY));
      if (v) return v;
    }
  } catch {
    // ignore
  }
  return FALLBACK_ACADEMIC_YEAR;
}

let current = readCached();
const listeners = new Set<() => void>();

export function getAcademicYear(): string {
  return current;
}

export function setAcademicYear(year: string) {
  const y = yearDigits(year);
  if (!y || y === current) return;
  current = y;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CACHE_KEY, y);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useAcademicYear(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current
  );
}
