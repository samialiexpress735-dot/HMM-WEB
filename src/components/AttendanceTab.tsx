import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Cloud, CloudOff, Download, Users } from 'lucide-react';
import { Student } from '../data/schoolData';
import {
  AttendanceApi,
  AttendanceStatus,
  isSchoolDay,
  recentSchoolDays,
  shiftSchoolDay
} from '../hooks/useAttendance';
import { formatDualDateLong, formatEthiopian } from '../utils/ethiopianCalendar';

const STATUS: { key: AttendanceStatus; short: string; label: string; on: string; chip: string; bar: string }[] = [
  { key: 'Present', short: 'P', label: 'Present', on: 'bg-emerald-600 text-white', chip: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
  { key: 'Late', short: 'L', label: 'Late', on: 'bg-amber-500 text-white', chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-400' },
  { key: 'Permission', short: 'E', label: 'Permission', on: 'bg-sky-600 text-white', chip: 'bg-sky-100 text-sky-800', bar: 'bg-sky-400' },
  { key: 'Absent', short: 'A', label: 'Absent', on: 'bg-rose-600 text-white', chip: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' }
];
const CYCLE: (AttendanceStatus | undefined)[] = [undefined, 'Present', 'Late', 'Permission', 'Absent'];
const meta = (s: AttendanceStatus) => STATUS.find((x) => x.key === s)!;

// Gregorian long form for the main header; fmtLong (tooltips / screen readers) names the day in BOTH calendars.
const fmtGcLong = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtLong = (iso: string) => formatDualDateLong(iso) || iso;
const fmtShort = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return { wd: d.toLocaleDateString('en-US', { weekday: 'narrow' }), day: d.getDate(), mon: d.toLocaleDateString('en-US', { month: 'short' }) };
};

interface Props {
  students: Student[];
  section: string;
  att: AttendanceApi;
}

export const AttendanceTab: React.FC<Props> = ({ students, section, att }) => {
  const { map, today, sync, setStatus, setMany, retry } = att;
  const [mode, setMode] = useState<'roll' | 'history'>('roll');
  const [date, setDate] = useState<string>(() => (isSchoolDay(today) ? today : shiftSchoolDay(today, -1)));
  const lastDay = isSchoolDay(today) ? today : shiftSchoolDay(today, -1);
  const days = useMemo(() => recentSchoolDays(20, today), [today]);

  const cur = (id: string, d = date) => map[id]?.[d]?.status;
  const counts = useMemo(() => {
    const c: Record<string, number> = { Present: 0, Late: 0, Permission: 0, Absent: 0, none: 0 };
    students.forEach((s) => {
      const st = map[s.id]?.[date]?.status;
      c[st || 'none']++;
    });
    return c;
  }, [students, map, date]);
  const marked = students.length - counts.none;

  const markRestPresent = () =>
    setMany(students.filter((s) => !cur(s.id)).map((s) => ({ studentId: s.id, date, status: 'Present' as const })));

  const exportCsv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ['#', 'Student ID', 'Name', ...days, 'Present', 'Late', 'Permission', 'Absent', 'Attendance %'];
    const rows = students.map((s, i) => {
      const per = days.map((d) => cur(s.id, d) || '');
      const n = (st: string) => per.filter((x) => x === st).length;
      const taken = per.filter(Boolean).length;
      const rate = taken ? Math.round(((n('Present') + n('Late')) / taken) * 100) : '';
      return [i + 1, s.studentId, s.fullName, ...per, n('Present'), n('Late'), n('Permission'), n('Absent'), rate].map(q).join(',');
    });
    const blob = new Blob(['\uFEFF' + [head.map(q).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Attendance_Section_${section}_${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const syncBadge =
    sync === 'offline' ? (
      <button onClick={() => retry()} className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 cursor-pointer">
        <CloudOff className="w-3.5 h-3.5" /> Not synced yet. Tap to retry
      </button>
    ) : sync === 'saving' ? (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Cloud className="w-3.5 h-3.5 animate-pulse" /> Saving…</span>
    ) : sync === 'saved' ? (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Check className="w-3.5 h-3.5" /> Saved to cloud</span>
    ) : (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CloudOff className="w-3.5 h-3.5" /> Saved on this device only</span>
    );

  return (
    <div>
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-bold" role="tablist">
          {(['roll', 'history'] as const).map((m) => (
            <button
              key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full cursor-pointer transition-colors ${mode === m ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {m === 'roll' ? 'Roll call' : 'History'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {syncBadge}
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
          No students in Section {section} yet.
        </div>
      ) : mode === 'roll' ? (
        <>
          {/* Date + progress */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button aria-label="Previous school day" onClick={() => setDate(shiftSchoolDay(date, -1))} className="p-2 rounded-full hover:bg-slate-200 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <div className="px-2 text-center min-w-[200px]">
                  <div className="font-display font-bold text-slate-900">{fmtGcLong(date)}</div>
                  <div className="text-xs font-semibold text-slate-500">{formatEthiopian(date)}</div>
                  {date === lastDay && <div className="text-[11px] text-emerald-700 font-semibold">Today</div>}
                </div>
                <button aria-label="Next school day" disabled={date >= lastDay} onClick={() => setDate(shiftSchoolDay(date, 1))} className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"><ChevronRight className="w-4 h-4" /></button>
                {date !== lastDay && <button onClick={() => setDate(lastDay)} className="ml-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">Jump to today</button>}
              </div>
              <button
                onClick={markRestPresent} disabled={counts.none === 0}
                className="btn-academic px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold cursor-pointer disabled:cursor-default"
              >
                {counts.none === students.length ? 'Mark everyone present' : counts.none === 0 ? 'Everyone marked' : `Mark remaining ${counts.none} present`}
              </button>
            </div>
            <div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-200" aria-hidden="true">
                {STATUS.map((s) => <div key={s.key} className={s.bar} style={{ width: `${(counts[s.key] / students.length) * 100}%` }} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {STATUS.map((s) => <span key={s.key}><b className="font-mono text-slate-900">{counts[s.key]}</b> {s.label.toLowerCase()}</span>)}
                <span className="text-slate-400"><b className="font-mono">{counts.none}</b> not marked · {marked}/{students.length} done</span>
              </div>
            </div>
          </div>

          {/* Roll call */}
          <ul>
            {students.map((s, i) => {
              const c = cur(s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 border-b border-slate-100 hover:bg-slate-50/70">
                  <span className="w-6 text-right text-xs text-slate-400 font-mono">{i + 1}</span>
                  <span className="avatar-monogram w-9 h-9 rounded-full text-xs shrink-0">{s.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="font-semibold text-slate-900 text-sm truncate">{s.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.studentId}</div>
                  </div>
                  <div role="radiogroup" aria-label={`Attendance for ${s.fullName}`} className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
                    {STATUS.map((st) => (
                      <button
                        key={st.key} role="radio" aria-checked={c === st.key} onClick={() => setStatus(s.id, date, st.key)}
                        className={`h-9 min-w-[42px] sm:min-w-[92px] px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${c === st.key ? st.on : 'text-slate-600 hover:bg-white'}`}
                      >
                        <span className="sm:hidden">{st.short}</span>
                        <span className="hidden sm:inline">{st.label}</span>
                      </button>
                    ))}
                  </div>
                  {c && c !== 'Present' && (
                    <input
                      key={`${s.id}-${date}`} defaultValue={map[s.id]?.[date]?.note || ''} placeholder="Reason (optional)" maxLength={140}
                      aria-label={`Reason for ${s.fullName}`}
                      onBlur={(e) => { if (e.target.value !== (map[s.id]?.[date]?.note || '')) setStatus(s.id, date, c, e.target.value.trim()); }}
                      className="basis-full sm:basis-auto sm:w-48 h-9 px-3 rounded-lg border border-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="px-5 py-2 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-200">
            Last {days.length} school days. Click a cell to change it: blank → Present → Late → Permission → Absent.
          </p>
          <div className="overflow-auto max-h-[72vh]">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-30 bg-slate-100 border-b border-slate-200 text-left py-3 px-4 min-w-[210px] font-semibold text-slate-600">Student</th>
                  {days.map((d) => {
                    const f = fmtShort(d);
                    const present = students.filter((s) => ['Present', 'Late'].includes(cur(s.id, d) || '')).length;
                    const taken = students.filter((s) => cur(s.id, d)).length;
                    return (
                      <th key={d} className={`sticky top-0 z-20 border-b border-slate-200 px-1 py-2 text-center min-w-[40px] ${d === today ? 'bg-emerald-100' : 'bg-slate-100'}`} title={fmtLong(d)}>
                        <div className="text-[10px] text-slate-500 font-medium">{f.wd}</div>
                        <div className="font-mono font-bold text-slate-900">{f.day}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{taken ? `${Math.round((present / taken) * 100)}%` : '–'}</div>
                      </th>
                    );
                  })}
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 text-center font-semibold text-slate-600 min-w-[64px]">Rate</th>
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 text-center font-semibold text-slate-600 min-w-[64px]">Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const per = days.map((d) => cur(s.id, d));
                  const taken = per.filter(Boolean).length;
                  const attended = per.filter((x) => x === 'Present' || x === 'Late').length;
                  const absent = per.filter((x) => x === 'Absent').length;
                  const rate = taken ? Math.round((attended / taken) * 100) : null;
                  return (
                    <tr key={s.id} className="group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-slate-100 py-2 px-4">
                        <div className="font-semibold text-slate-900">{s.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.studentId}</div>
                      </td>
                      {days.map((d, i) => {
                        const st = per[i];
                        const note = map[s.id]?.[d]?.note;
                        return (
                          <td key={d} className="border-b border-slate-100 group-hover:bg-slate-50 p-1 text-center">
                            <button
                              onClick={() => setStatus(s.id, d, CYCLE[(CYCLE.indexOf(st) + 1) % CYCLE.length] || 'Present')}
                              aria-label={`${s.fullName}, ${fmtLong(d)}: ${st || 'not marked'}`}
                              title={`${fmtLong(d)}: ${st || 'not marked'}${note ? ` (${note})` : ''}`}
                              className={`w-8 h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${st ? meta(st).chip : 'border border-dashed border-slate-200 text-slate-300 hover:border-slate-400'}`}
                            >
                              {st ? meta(st).short : '·'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-b border-slate-100 group-hover:bg-slate-50 px-3 text-center font-mono font-bold">
                        <span className={rate === null ? 'text-slate-300' : rate >= 90 ? 'text-emerald-700' : rate >= 75 ? 'text-slate-900' : 'text-rose-700'}>{rate === null ? '–' : `${rate}%`}</span>
                      </td>
                      <td className="border-b border-slate-100 group-hover:bg-slate-50 px-3 text-center font-mono">{absent || <span className="text-slate-300">0</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
