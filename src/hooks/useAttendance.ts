import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AttendanceRecord,
  AttendanceStatus,
  fetchAttendanceFromCloud,
  syncAttendanceToCloud,
  subscribeToAttendanceRealtime,
  isSupabaseConfigured
} from '../lib/supabase';

export type { AttendanceStatus };
export type AttendanceCell = { status: AttendanceStatus; note?: string };
/** studentId -> date (YYYY-MM-DD) -> cell */
export type AttendanceMap = Record<string, Record<string, AttendanceCell>>;
export type SyncState = 'local' | 'saving' | 'saved' | 'offline';
export type AttendanceApi = ReturnType<typeof useAttendance>;

const HISTORY_DAYS = 90;

// Dates are built from LOCAL time. (toISOString() uses UTC and shows yesterday for 3 hours after midnight in Ethiopia.)
export const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (iso: string) => new Date(`${iso}T00:00:00`);
export const isSchoolDay = (iso: string) => {
  const w = parse(iso).getDay();
  return w !== 0 && w !== 6;
};
export function shiftSchoolDay(iso: string, dir: 1 | -1): string {
  const d = parse(iso);
  do {
    d.setDate(d.getDate() + dir);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return toLocalISO(d);
}
/** The last `count` school days (Mon-Fri) up to and including `upTo`, oldest first. */
export function recentSchoolDays(count: number, upTo: string = toLocalISO(new Date())): string[] {
  let cur = isSchoolDay(upTo) ? upTo : shiftSchoolDay(upTo, -1);
  const out = [cur];
  while (out.length < count) {
    cur = shiftSchoolDay(cur, -1);
    out.unshift(cur);
  }
  return out;
}

const k = (id: string, date: string) => `${id}|${date}`;
const cacheKey = (s: string) => `hmm_attendance_v2_${s}`;
const pendKey = (s: string) => `hmm_attendance_pending_${s}`;

/**
 * Attendance for one section. Local-first: every change is stored on this device immediately,
 * then sent to Supabase in a small batch. Unsent changes are remembered and retried, and other
 * devices' changes arrive live.
 */
export function useAttendance(section: string | null, recordedBy?: string) {
  const [map, setMap] = useState<AttendanceMap>({});
  const [sync, setSync] = useState<SyncState>(isSupabaseConfigured() ? 'saved' : 'local');
  const pending = useRef(new Map<string, AttendanceRecord>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const today = toLocalISO(new Date());

  const savePending = () => {
    const s = sectionRef.current;
    if (!s) return;
    try {
      localStorage.setItem(pendKey(s), JSON.stringify([...pending.current.values()]));
    } catch {
      /* storage full or blocked */
    }
  };

  const flush = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSync('local');
      return;
    }
    const batch = [...pending.current.values()];
    if (batch.length === 0) {
      setSync('saved');
      return;
    }
    setSync('saving');
    const ok = await syncAttendanceToCloud(batch);
    if (ok) {
      batch.forEach((r) => {
        if (pending.current.get(k(r.studentId, r.date)) === r) pending.current.delete(k(r.studentId, r.date));
      });
    }
    savePending();
    setSync(ok ? 'saved' : 'offline');
  }, []);

  // Load this section: device copy first (instant), then the cloud copy.
  useEffect(() => {
    if (!section) return;
    let cancelled = false;
    let rt: ReturnType<typeof setTimeout> | undefined;

    let local: AttendanceMap = {};
    try {
      local = JSON.parse(localStorage.getItem(cacheKey(section)) || '{}');
    } catch {
      /* ignore */
    }
    pending.current = new Map();
    try {
      (JSON.parse(localStorage.getItem(pendKey(section)) || '[]') as AttendanceRecord[]).forEach((r) =>
        pending.current.set(k(r.studentId, r.date), r)
      );
    } catch {
      /* ignore */
    }
    setMap(local);

    const load = async () => {
      if (!isSupabaseConfigured()) {
        setSync('local');
        return;
      }
      await flush(); // send unsent changes first so the cloud copy can't overwrite them
      const from = toLocalISO(new Date(Date.now() - HISTORY_DAYS * 86400000));
      const rows = await fetchAttendanceFromCloud(section, from);
      if (cancelled) return;
      if (!rows) {
        setSync('offline');
        return;
      }
      setMap((prev) => {
        const next: AttendanceMap = {};
        Object.keys(prev).forEach((id) => (next[id] = { ...prev[id] }));
        rows.forEach((r) => {
          if (pending.current.has(k(r.studentId, r.date))) return;
          (next[r.studentId] ||= {})[r.date] = { status: r.status, ...(r.note ? { note: r.note } : {}) };
        });
        try {
          localStorage.setItem(cacheKey(section), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    };
    load();

    const unsub = subscribeToAttendanceRealtime(section, () => {
      clearTimeout(rt);
      rt = setTimeout(load, 400);
    });
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      clearTimeout(rt);
      unsub();
      window.removeEventListener('online', onOnline);
    };
  }, [section, flush]);

  const setMany = useCallback(
    (updates: { studentId: string; date: string; status: AttendanceStatus; note?: string }[]) => {
      const s = sectionRef.current;
      if (!s || updates.length === 0) return;
      setMap((prev) => {
        const next: AttendanceMap = { ...prev };
        updates.forEach((u) => {
          const row = { ...(next[u.studentId] || {}) };
          const note = u.note !== undefined ? u.note : row[u.date]?.note;
          row[u.date] = { status: u.status, ...(note ? { note } : {}) };
          next[u.studentId] = row;
          pending.current.set(k(u.studentId, u.date), {
            studentId: u.studentId,
            date: u.date,
            section: s,
            status: u.status,
            note: note || undefined,
            recordedBy
          });
        });
        try {
          localStorage.setItem(cacheKey(s), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        savePending();
        return next;
      });
      setSync(isSupabaseConfigured() ? 'saving' : 'local');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush, recordedBy]
  );

  const setStatus = useCallback(
    (studentId: string, date: string, status: AttendanceStatus, note?: string) =>
      setMany([{ studentId, date, status, note }]),
    [setMany]
  );

  return { map, today, sync, setStatus, setMany, retry: flush };
}
