/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, GraduationCap, History, Search, UserMinus, UserPlus, X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { GradeSection, Student } from '../data/schoolData';
import { fetchAcademicYearsFromCloud, fetchStudentsFromCloud, isSupabaseConfigured } from '../lib/supabase';
import { formatYear, suggestRollover } from '../utils/academicYear';
import { rosterCounts, setStudentStatus, isInClass, isActive } from '../utils/rosterView';
import { ReportCardModal } from './ReportCardModal';

interface Props {
  year: string;
  lang: 'en' | 'am';
  /** Every student of the current year (placed, waiting and left). */
  students: Student[];
  sections: GradeSection[];
  onUpdateStudents?: (updater: (prev: any[]) => any[]) => void;
  onStartNewAcademicYear?: (nextYear: string) => Promise<boolean>;
}

const norm = (s?: string) => (s || '').toUpperCase().trim();

export const AcademicYearPanel: React.FC<Props> = ({ year, lang, students, sections, onUpdateStudents, onStartNewAcademicYear }) => {
  const T = (en: string, am: string) => (lang === 'am' ? am : en);
  const counts = useMemo(() => rosterCounts(students), [students]);
  const rollover = useMemo(() => suggestRollover(year), [year]);

  // ---- start a new year ----------------------------------------------------------------------------------------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [yearError, setYearError] = useState('');
  const [yearDone, setYearDone] = useState('');

  const confirmNewYear = async () => {
    if (!onStartNewAcademicYear || typed.trim() !== rollover.nextYear) return;
    setBusy(true);
    setYearError('');
    const ok = await onStartNewAcademicYear(rollover.nextYear);
    setBusy(false);
    if (ok) {
      setDialogOpen(false);
      setTyped('');
      setYearDone(T(`${formatYear(rollover.nextYear)} has started. ${formatYear(year)} stays saved and can be opened from "Past years".`, `${formatYear(rollover.nextYear, 'am')} ተጀምሯል። ${formatYear(year, 'am')} ተቀምጧል፤ ከ"ያለፉ ዓመታት" መክፈት ይቻላል።`));
    } else {
      setYearError(T('Could not save the new year to the database. Nothing was changed. Check the connection and try again.', 'አዲሱን ዓመት ዳታቤዝ ላይ ማስቀመጥ አልተቻለም። ምንም አልተቀየረም። ግንኙነቱን አይተው ደግመው ይሞክሩ።'));
    }
  };

  // ---- this year's roster: mark as left / bring back -------------------------------------------------------------
  const [query, setQuery] = useState('');
  const [leaving, setLeaving] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || (s.fullNameAmharic || '').includes(q) || s.studentId.toLowerCase().includes(q))
      .sort((a, b) => a.grade - b.grade || (a.sectionCode || '').localeCompare(b.sectionCode || '') || a.fullName.localeCompare(b.fullName));
  }, [students, query]);

  // Class head counts need no special handling here: they are recomputed from the students who are really on the
  // roster (see findSectionsWithStaleCounts), so a student who leaves stops being counted and one who returns is counted again.
  const markLeft = (s: Student) => {
    if (!onUpdateStudents) return;
    onUpdateStudents((prev) => prev.map((x) => (x.id === s.id ? setStudentStatus(x, 'inactive', reason) : x)));
    setLeaving(null);
    setReason('');
    setNote(T(`${s.fullName} is marked as left. Their record and marks are kept.`, `${s.fullNameAmharic || s.fullName} እንደለቀቀ ተመዝግቧል። መዝገቡና ውጤቱ ተጠብቋል።`));
  };

  const bringBack = (s: Student) => {
    if (!onUpdateStudents) return;
    // Back to the old class only if it still exists and has a free seat (counted from the real students).
    const roomIn = (code?: string) => {
      if (!code) return false;
      const sec = sections.find((x) => norm(x.section) === norm(code));
      if (!sec) return false;
      const taken = students.filter((x) => isActive(x) && (norm(x.sectionCode) === norm(code) || norm(x.cteSection) === norm(code))).length;
      return !sec.capacity || taken < sec.capacity;
    };
    const keepClass = roomIn(s.sectionCode);
    const keepCte = Boolean(s.cteSection) && roomIn(s.cteSection);
    onUpdateStudents((prev) =>
      prev.map((x) => {
        if (x.id !== s.id) return x;
        const back = setStudentStatus(x, 'active');
        return {
          ...back,
          ...(keepClass ? {} : { section: '', sectionCode: '' }),
          ...(keepCte ? {} : { cteSection: undefined, cteSpecialization: undefined, cteRank: undefined })
        };
      })
    );
    setNote(
      keepClass || !isInClass(s)
        ? T(`${s.fullName} is back on the roster.`, `${s.fullNameAmharic || s.fullName} ወደ ዝርዝሩ ተመልሷል።`)
        : T(`${s.fullName} is back, but their old class is full or gone, so they are waiting for a class.`, `${s.fullNameAmharic || s.fullName} ተመልሷል፤ ነገር ግን የቀድሞ ክፍላቸው ሞልቷል ወይም የለም፤ ስለዚህ ክፍል እየጠበቁ ነው።`)
    );
  };

  // ---- past years (read-only) --------------------------------------------------------------------------------------
  const [pastYears, setPastYears] = useState<string[]>([]);
  const [pastYear, setPastYear] = useState('');
  const [pastStudents, setPastStudents] = useState<Student[] | null>(null);
  const [pastLoading, setPastLoading] = useState(false);
  const [pastQuery, setPastQuery] = useState('');
  const [reportFor, setReportFor] = useState<{ student: Student; semester: 1 | 2 } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) return;
    fetchAcademicYearsFromCloud().then((years) => {
      if (!cancelled && years) setPastYears(years.filter((y) => y !== year));
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    let cancelled = false;
    setPastStudents(null);
    if (!pastYear) return;
    setPastLoading(true);
    fetchStudentsFromCloud(pastYear).then((rows) => {
      if (cancelled) return;
      setPastStudents(rows || []);
      setPastLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pastYear]);

  const pastListed = useMemo(() => {
    const q = pastQuery.trim().toLowerCase();
    return (pastStudents || [])
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q))
      .sort((a, b) => a.grade - b.grade || (a.section || '').localeCompare(b.section || '') || a.fullName.localeCompare(b.fullName));
  }, [pastStudents, pastQuery]);

  const card = 'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm';
  const head = 'flex items-center gap-2 border-b border-slate-100 px-6 py-4 font-display text-lg font-bold text-slate-900';
  const startsOn = rollover.startsOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="space-y-6">
      {/* Where the school is now + start a new year */}
      <div className={card}>
        <header className={head}>
          <CalendarClock className="h-5 w-5 text-emerald-700" />
          {T('Academic year', 'የትምህርት ዘመን')}: {formatYear(year, lang)}
        </header>
        <div className="space-y-4 p-6">
          <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              [T('Registered', 'የተመዘገቡ'), counts.registered],
              [T('In a class', 'ክፍል ያገኙ'), counts.inClass],
              [T('Waiting', 'በመጠበቅ ላይ'), counts.waiting],
              [T('Left school', 'የለቀቁ'), counts.inactive]
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-slate-50 px-4 py-3">
                <dd className="font-mono text-2xl font-semibold tabular-nums text-slate-900">{v}</dd>
                <dt className="mt-0.5 text-[11px] text-slate-500">{k}</dt>
              </div>
            ))}
          </dl>

          <div className={`rounded-2xl border p-4 text-sm ${rollover.due ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <p>
              {rollover.due
                ? T(`Meskerem 1 has passed: ${formatYear(rollover.nextYear)} began on ${startsOn}. When this year's work is finished, start the new year.`, `መስከረም 1 ደርሷል፤ ${formatYear(rollover.nextYear, 'am')} የጀመረው ${startsOn} ነው። የዚህ ዓመት ሥራ ሲጠናቀቅ አዲሱን ዓመት ይጀምሩ።`)
                : T(`${formatYear(rollover.nextYear)} begins on Meskerem 1 (${startsOn}). Nothing changes by itself; a new year only starts when you press the button.`, `${formatYear(rollover.nextYear, 'am')} የሚጀምረው መስከረም 1 (${startsOn}) ነው። በራሱ ምንም አይቀየርም፤ አዲስ ዓመት የሚጀምረው ቁልፉን ሲጫኑ ብቻ ነው።`)}
            </p>
            <button
              onClick={() => { setDialogOpen(true); setYearError(''); setYearDone(''); }}
              disabled={!onStartNewAcademicYear}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GraduationCap className="h-4 w-4 text-amber-300" />
              {T(`Start ${formatYear(rollover.nextYear)}`, `${formatYear(rollover.nextYear, 'am')} ጀምር`)}
            </button>
          </div>
          {yearDone && (
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> {yearDone}
            </p>
          )}
        </div>
      </div>

      {/* This year's students */}
      <div className={card}>
        <header className={head}>
          <UserMinus className="h-5 w-5 text-emerald-700" />
          {T('This year\'s students', 'የዚህ ዓመት ተማሪዎች')}
        </header>
        <div className="space-y-3 p-6">
          <p className="text-xs text-slate-500">
            {T('A student who leaves during the year is marked as left, not deleted: their record and marks stay, and their seat goes back to the class.', 'በዓመቱ ውስጥ የሚለቅ ተማሪ እንደለቀቀ ይመዘገባል እንጂ አይጠፋም፤ መዝገቡና ውጤቱ ይቀመጣል፣ ወንበሩም ወደ ክፍሉ ይመለሳል።')}
          </p>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T('Search by name or school ID', 'በስም ወይም በመታወቂያ ይፈልጉ')} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </label>
          {note && <p role="status" className="text-sm font-medium text-emerald-800">{note}</p>}
          <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{T('Student', 'ተማሪ')}</th>
                  <th className="px-3 py-2">{T('School ID', 'መታወቂያ')}</th>
                  <th className="px-3 py-2">{T('Class', 'ክፍል')}</th>
                  <th className="px-3 py-2">{T('Status', 'ሁኔታ')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {listed.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">{T('No students yet this year.', 'በዚህ ዓመት እስካሁን ተማሪ የለም።')}</td></tr>
                )}
                {listed.map((s) => {
                  const left = s.status === 'inactive';
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{lang === 'am' && s.fullNameAmharic ? s.fullNameAmharic : s.fullName}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.studentId}</td>
                      <td className="px-3 py-2">{s.sectionCode || (isInClass(s) ? `${s.grade}${s.section}` : T('Waiting', 'በመጠበቅ ላይ'))}</td>
                      <td className="px-3 py-2">
                        {left ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800" title={s.leftReason || ''}>
                            {T('Left', 'ለቋል')}{s.leftDate ? ` ${s.leftDate}` : ''}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{T('Active', 'ንቁ')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {leaving === s.id ? (
                          <span className="inline-flex items-center gap-1">
                            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={T('Reason (optional)', 'ምክንያት (አማራጭ)')} className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                            <button onClick={() => markLeft(s)} className="cursor-pointer rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white">{T('Confirm', 'አረጋግጥ')}</button>
                            <button onClick={() => { setLeaving(null); setReason(''); }} className="cursor-pointer rounded-lg px-2 py-1 text-xs text-slate-500">{T('Cancel', 'ተው')}</button>
                          </span>
                        ) : left ? (
                          <button onClick={() => bringBack(s)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><UserPlus className="h-3.5 w-3.5" />{T('Bring back', 'መልስ')}</button>
                        ) : (
                          <button onClick={() => { setLeaving(s.id); setReason(''); }} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><UserMinus className="h-3.5 w-3.5" />{T('Mark as left', 'እንደለቀቀ ምዝገባ')}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Past years, read only */}
      <div className={card}>
        <header className={head}>
          <History className="h-5 w-5 text-emerald-700" />
          {T('Past years', 'ያለፉ ዓመታት')}
        </header>
        <div className="space-y-3 p-6">
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-slate-500">{T('Past years are read from the database, which is not connected.', 'ያለፉ ዓመታት ከዳታቤዝ ይነበባሉ፤ ዳታቤዙ አልተገናኘም።')}</p>
          ) : pastYears.length === 0 ? (
            <p className="text-sm text-slate-500">{T('No earlier year is saved yet.', 'እስካሁን የተቀመጠ ያለፈ ዓመት የለም።')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select value={pastYear} onChange={(e) => setPastYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{T('Choose a year', 'ዓመት ይምረጡ')}</option>
                  {pastYears.map((y) => <option key={y} value={y}>{formatYear(y, lang)}</option>)}
                </select>
                {pastYear && <input value={pastQuery} onChange={(e) => setPastQuery(e.target.value)} placeholder={T('Search', 'ፈልግ')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />}
                <span className="text-xs text-slate-500">{T('Read only: nothing here can be changed.', 'ለንባብ ብቻ፤ እዚህ ምንም መቀየር አይቻልም።')}</span>
              </div>
              {pastLoading && <p className="text-sm text-slate-500">{T('Loading...', 'እየጫነ...')}</p>}
              {pastStudents && (
                <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr><th className="px-3 py-2">{T('Student', 'ተማሪ')}</th><th className="px-3 py-2">{T('School ID', 'መታወቂያ')}</th><th className="px-3 py-2">{T('Class', 'ክፍል')}</th><th className="px-3 py-2" /></tr>
                    </thead>
                    <tbody>
                      {pastListed.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{s.fullName}{s.status === 'inactive' ? ` (${T('left', 'ለቋል')})` : ''}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.studentId}</td>
                          <td className="px-3 py-2">{s.sectionCode || (s.section ? `${s.grade}${s.section}` : '-')}</td>
                          <td className="px-3 py-2 text-right">
                            {[1, 2].map((sem) => (
                              <button key={sem} onClick={() => setReportFor({ student: s, semester: sem as 1 | 2 })} className="ml-1 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                <FileText className="h-3.5 w-3.5" />{T(`Semester ${sem}`, `ሴሚስተር ${sem}`)}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {reportFor && reportFor.student.semesters.length > 0 && (
        <ReportCardModal student={reportFor.student} semester={reportFor.semester} isOpen onClose={() => setReportFor(null)} lang={lang} />
      )}

      {/* Confirm starting a new year */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-slate-900">{T(`Start ${formatYear(rollover.nextYear)}?`, `${formatYear(rollover.nextYear, 'am')} ይጀመር?`)}</h3>
              <button onClick={() => setDialogOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              <li>{T(`Nothing is deleted. The ${counts.registered + counts.inactive} students of ${formatYear(year)}, with their marks and attendance, stay saved.`, `ምንም አይጠፋም። የ${formatYear(year, 'am')} ${counts.registered + counts.inactive} ተማሪዎች ከውጤታቸውና ከመገኘታቸው ጋር ተቀምጠው ይቆያሉ።`)}</li>
              <li>{T('Registration, classes, the timetable and the student portals start empty for the new year.', 'ምዝገባ፣ ክፍሎች፣ የጊዜ ሰሌዳና የተማሪ ፖርታሎች ለአዲሱ ዓመት ባዶ ሆነው ይጀምራሉ።')}</li>
              <li>{T('Last year\'s records are used to recognise returning students, who keep their school ID.', 'የአምናው መዝገብ ተመላሽ ተማሪዎችን ለማወቅ ያገለግላል፤ እነሱ መታወቂያቸውን ይይዛሉ።')}</li>
              <li>{T('It applies to every device at once.', 'በሁሉም መሳሪያዎች ላይ በአንድ ጊዜ ይተገበራል።')}</li>
            </ul>
            {counts.waiting > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {T(`${counts.waiting} registered students have not been placed in a class yet.`, `${counts.waiting} የተመዘገቡ ተማሪዎች እስካሁን ክፍል አልተመደበላቸውም።`)}
              </p>
            )}
            <label className="block text-sm font-medium text-slate-700">
              {T(`Type ${rollover.nextYear} to confirm`, `ለማረጋገጥ ${rollover.nextYear} ብለው ይጻፉ`)}
              <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono" />
            </label>
            {yearError && <p role="alert" className="text-sm font-medium text-rose-700">{yearError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogOpen(false)} className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">{T('Cancel', 'ተው')}</button>
              <button onClick={confirmNewYear} disabled={busy || typed.trim() !== rollover.nextYear} className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? T('Saving...', 'እየተቀመጠ...') : T('Start new year', 'አዲስ ዓመት ጀምር')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
