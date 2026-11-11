/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Globe,
  Layers,
  LogOut,
  Search,
  ShieldAlert,
  Trash2,
  UserX,
  Users,
  X,
  AlertTriangle,
  Undo2
} from 'lucide-react';
import { Student, GradeSection } from '../data/schoolData';
import { isActive } from '../utils/rosterView';
import { isBanned, isBanExpired, studentsInSection, summariseSectionForDisband } from '../utils/banAndDisband';

interface AdminDisciplinePageProps {
  /** Every student of the current year (placed, waiting). Students who left the school are not listed. */
  students: Student[];
  sections: GradeSection[];
  lang: 'en' | 'am';
  onBanStudent: (studentId: string, opts: { reason: string; until?: string }) => void;
  onUnbanStudent: (studentId: string) => void;
  /** Disbands a class. Resolves to false if the database could not be updated (the class is gone on this device only). */
  onDisbandSection: (section: GradeSection) => Promise<boolean>;
  onNavigateToAdmin?: () => void;
  onNavigateToRegistrar?: () => void;
  onNavigateToGrades?: () => void;
  onNavigateHome?: () => void;
  onSignOutAdmin?: () => void;
}

type Tab = 'students' | 'sections';

export const AdminDisciplinePage: React.FC<AdminDisciplinePageProps> = ({
  students,
  sections,
  lang,
  onBanStudent,
  onUnbanStudent,
  onDisbandSection,
  onNavigateToAdmin,
  onNavigateToRegistrar,
  onNavigateToGrades,
  onNavigateHome,
  onSignOutAdmin
}) => {
  const T = (en: string, am: string) => (lang === 'am' ? am : en);
  const [tab, setTab] = useState<Tab>('students');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  // ---- Students tab ----
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'banned' | 'not-banned'>('all');
  const [banTarget, setBanTarget] = useState<Student | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banUntil, setBanUntil] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const activeStudents = useMemo(() => students.filter(isActive), [students]);
  const bannedCount = useMemo(() => activeStudents.filter((s) => isBanned(s)).length, [activeStudents]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeStudents
      .filter((s) => {
        if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;
        if (stateFilter === 'banned' && !isBanned(s)) return false;
        if (stateFilter === 'not-banned' && isBanned(s)) return false;
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          (s.fullNameAmharic || '').toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(isBanned(b)) - Number(isBanned(a)) || a.fullName.localeCompare(b.fullName));
  }, [activeStudents, query, gradeFilter, stateFilter]);

  const classLabel = (s: Student) => (s.sectionCode || s.section ? s.sectionCode || `${s.grade}${s.section}` : T('Waiting for a class', 'ክፍል በመጠበቅ ላይ'));

  const openBan = (s: Student) => {
    setBanTarget(s);
    setBanReason('');
    setBanUntil('');
  };

  const confirmBan = () => {
    if (!banTarget) return;
    if (banUntil && banUntil <= today) return;
    onBanStudent(banTarget.id, { reason: banReason, until: banUntil || undefined });
    setBanner({ kind: 'ok', text: T(`${banTarget.fullName} is now banned.`, `${banTarget.fullName} ታግዷል።`) });
    setBanTarget(null);
  };

  const lift = (s: Student) => {
    onUnbanStudent(s.id);
    setBanner({ kind: 'ok', text: T(`Ban lifted for ${s.fullName}.`, `የ${s.fullName} እገዳ ተነስቷል።`) });
  };

  // ---- Sections tab ----
  const [sectionQuery, setSectionQuery] = useState('');
  const [disbandTarget, setDisbandTarget] = useState<GradeSection | null>(null);
  const [typedCode, setTypedCode] = useState('');
  const [disbanding, setDisbanding] = useState(false);

  const sectionRows = useMemo(
    () =>
      [...sections]
        .sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section))
        .filter((sec) => !sectionQuery.trim() || sec.section.toLowerCase().includes(sectionQuery.trim().toLowerCase()))
        .map((sec) => ({ sec, count: studentsInSection(students.filter(isActive), sec).length })),
    [sections, students, sectionQuery]
  );

  const disbandSummary = useMemo(
    () => (disbandTarget ? summariseSectionForDisband(students.filter(isActive), disbandTarget) : null),
    [disbandTarget, students]
  );

  const codeMatches = disbandTarget ? typedCode.trim().toUpperCase() === disbandTarget.section.trim().toUpperCase() : false;

  const confirmDisband = async () => {
    if (!disbandTarget || !codeMatches || disbanding) return;
    setDisbanding(true);
    const target = disbandTarget;
    const count = disbandSummary?.total ?? 0;
    let ok = true;
    try {
      ok = await onDisbandSection(target);
    } catch {
      ok = false;
    }
    setDisbanding(false);
    setDisbandTarget(null);
    setTypedCode('');
    const done = target.isCteSection
      ? T(`Group ${target.section} was disbanded. ${count} student(s) left the group.`, `ቡድን ${target.section} ተበትኗል። ${count} ተማሪዎች ከቡድኑ ወጥተዋል።`)
      : T(`Class ${target.section} was disbanded. ${count} student(s) are back on the waiting list.`, `ክፍል ${target.section} ተበትኗል። ${count} ተማሪዎች ወደ መጠበቂያ ዝርዝር ተመልሰዋል።`);
    setBanner(
      ok
        ? { kind: 'ok', text: done }
        : {
            kind: 'warn',
            text: done + ' ' + T('The database could not be reached, so the class may come back when the page reloads. Try again once you are online.', 'ዳታቤዙ አልተገኘም፤ ገጹ ሲታደስ ክፍሉ ተመልሶ ሊመጣ ይችላል። ኢንተርኔት ሲኖር እንደገና ይሞክሩ።')
          }
    );
  };

  const tabs: [Tab, string, number, React.ComponentType<{ className?: string }>][] = [
    ['students', T('Ban students', 'ተማሪ ማገድ'), bannedCount, UserX],
    ['sections', T('Disband sections', 'ክፍል መበተን'), sections.length, Layers]
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-2xl bg-slate-950 p-2.5 sm:p-3 text-white">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          {onNavigateToAdmin && (
            <button onClick={onNavigateToAdmin} className="flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2.5 sm:py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-white/15 cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{T('Back to admin', 'ወደ አስተዳዳሪ ተመለስ')}</span>
            </button>
          )}
          {onNavigateToRegistrar && (
            <button onClick={onNavigateToRegistrar} className="btn-academic flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-2.5 sm:py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{T('Registrar', 'ምዝገባ')} →</span>
            </button>
          )}
          {onNavigateToGrades && (
            <button onClick={onNavigateToGrades} className="hidden sm:flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-white/15 cursor-pointer">
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span>{T('Classes & Sections', 'ክፍሎችና ሴክሽኖች')} →</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button onClick={onNavigateHome} title="View public website" aria-label="View public website" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-white/15 cursor-pointer">
              <Globe className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">{T('Public site', 'ድረ-ገጽ')}</span>
            </button>
          )}
          {onSignOutAdmin && (
            <button onClick={onSignOutAdmin} title="Sign out" aria-label="Sign out" className="flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/15 px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/25 cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{T('Sign out', 'ውጣ')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="academic-ribbon absolute inset-x-0 top-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-bold text-white">
              <ShieldAlert className="h-3.5 w-3.5" />
              {T('Administrator only', 'ለአስተዳዳሪ ብቻ')}
            </span>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{T('Discipline & class control', 'ዲሲፕሊንና የክፍል ቁጥጥር')}</h1>
            <p className="text-sm leading-relaxed text-slate-300">
              {T(
                'Ban a student from the public grade portal, or disband a class and send its students back to the waiting list.',
                'ተማሪን ከሕዝብ የውጤት ገጽ ያግዱ፣ ወይም ክፍልን በትነው ተማሪዎቹን ወደ መጠበቂያ ዝርዝር ይመልሱ።'
              )}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-center">
            {[
              [T('Banned now', 'የታገዱ'), bannedCount],
              [T('Classes', 'ክፍሎች'), sections.length]
            ].map(([k, v]) => (
              <div key={String(k)} className="glass min-w-[88px] rounded-2xl px-4 py-3">
                <dd className="font-mono text-2xl font-semibold tabular-nums text-white">{v}</dd>
                <dt className="mt-0.5 text-[11px] text-slate-400">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Tabs */}
      <nav aria-label="Discipline sections" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 sm:flex sm:gap-2 sm:p-2">
        {tabs.map(([id, label, count, Icon]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setBanner(null);
              }}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer sm:px-5 ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="truncate">{label}</span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      {banner && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ${banner.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
        >
          <span className="flex items-start gap-2">
            {banner.kind === 'ok' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{banner.text}</span>
          </span>
          <button onClick={() => setBanner(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer text-slate-500 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===================== BAN STUDENTS ===================== */}
      {tab === 'students' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
            {T(
              'A banned student keeps their class, marks and attendance, but cannot be looked up in the public grade portal. Give an end date for a temporary ban, or leave it empty to ban until you lift it.',
              'የታገደ ተማሪ ክፍሉን፣ ውጤቱንና ተሳትፎውን እንደያዘ ይቆያል፤ ነገር ግን በሕዝብ የውጤት ገጽ ሊታይ አይችልም። ለጊዜያዊ እገዳ የማብቂያ ቀን ያስገቡ፤ ባዶ ከተወ እስኪያነሱት ይቆያል።'
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={T('Search by name or student ID', 'በስም ወይም በተማሪ መታወቂያ ይፈልጉ')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label={T('Grade', 'ክፍል ደረጃ')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">{T('All grades', 'ሁሉም ደረጃዎች')}</option>
              {[9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>{T(`Grade ${g}`, `ክፍል ${g}`)}</option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}
              aria-label={T('Status', 'ሁኔታ')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">{T('Everyone', 'ሁሉም')}</option>
              <option value="banned">{T('Banned', 'የታገዱ')}</option>
              <option value="not-banned">{T('Not banned', 'ያልታገዱ')}</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {filteredStudents.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">{T('No students match.', 'ምንም ተማሪ አልተገኘም።')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredStudents.slice(0, 200).map((s) => {
                  const banned = isBanned(s);
                  const expired = isBanExpired(s);
                  return (
                    <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">{s.fullName}</span>
                          {banned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                              <Ban className="h-3 w-3" />
                              {T('Banned', 'ታግዷል')}
                            </span>
                          )}
                          {expired && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              {T('Ban ended', 'እገዳው አብቅቷል')}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {s.studentId} · {T('Grade', 'ክፍል')} {s.grade} · {classLabel(s)}
                        </div>
                        {(banned || expired) && (
                          <div className="mt-1 text-xs text-slate-600">
                            {s.bannedReason ? <span>{s.bannedReason}</span> : <span className="italic text-slate-400">{T('No reason given', 'ምክንያት አልተሰጠም')}</span>}
                            {s.bannedDate && <span className="text-slate-400"> · {T('since', 'ከ')} {s.bannedDate}</span>}
                            {s.bannedUntil && <span className="text-slate-400"> · {T('until', 'እስከ')} {s.bannedUntil}</span>}
                          </div>
                        )}
                      </div>
                      {banned || expired ? (
                        <button
                          onClick={() => lift(s)}
                          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {expired ? T('Clear record', 'መዝገቡን አጽዳ') : T('Lift ban', 'እገዳ አንሳ')}
                        </button>
                      ) : (
                        <button
                          onClick={() => openBan(s)}
                          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {T('Ban', 'አግድ')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {filteredStudents.length > 200 && (
              <p className="border-t border-slate-100 p-3 text-center text-xs text-slate-500">
                {T(`Showing the first 200 of ${filteredStudents.length}. Narrow the search to find the rest.`, `ከ${filteredStudents.length} የመጀመሪያዎቹ 200 ብቻ ታይተዋል። ቀሪውን ለማግኘት ፍለጋዎን ያጥቡ።`)}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ===================== DISBAND SECTIONS ===================== */}
      {tab === 'sections' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            {T(
              'Disbanding removes the class, its timetable periods and its teacher assignments. Its students go back to the waiting list with their marks kept, so the registrar can place them in another class. This cannot be undone.',
              'ክፍልን መበተን ክፍሉን፣ የጊዜ ሰሌዳውንና የመምህራን ምደባውን ያስወግዳል። ተማሪዎቹ ውጤታቸውን ይዘው ወደ መጠበቂያ ዝርዝር ይመለሳሉ፤ ሬጅስትራሩ ወደ ሌላ ክፍል ሊመድባቸው ይችላል። ይህ ሊመለስ አይችልም።'
            )}
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={sectionQuery}
              onChange={(e) => setSectionQuery(e.target.value)}
              placeholder={T('Search a class, e.g. 9A', 'ክፍል ይፈልጉ፣ ለምሳሌ 9A')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </label>

          {sectionRows.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {sections.length === 0 ? T('There are no classes this year.', 'በዚህ ዓመት ምንም ክፍል የለም።') : T('No class matches.', 'ምንም ክፍል አልተገኘም።')}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectionRows.map(({ sec, count }) => (
                <div key={sec.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-slate-900">{sec.section}</span>
                      {sec.isCteSection && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          {sec.cteSpecialization ? `CTE · ${sec.cteSpecialization}` : 'CTE'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {T('Grade', 'ክፍል')} {sec.grade} · {sec.stream}
                    </div>
                    <div className="text-xs text-slate-500">
                      {T('Homeroom', 'ሆምሩም')}: {sec.homeroomTeacher?.name || T('Unassigned', 'አልተመደበም')}
                    </div>
                    <div className="pt-1 font-mono text-sm text-slate-800">
                      {count} {T('students', 'ተማሪዎች')}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDisbandTarget(sec);
                      setTypedCode('');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {T('Disband', 'በትን')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===================== BAN MODAL ===================== */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={T('Ban student', 'ተማሪ ማገድ')}>
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{T('Ban student', 'ተማሪ ማገድ')}</h2>
                <p className="text-sm text-slate-600">
                  {banTarget.fullName} <span className="font-mono text-xs text-slate-400">({banTarget.studentId})</span>
                </p>
              </div>
              <button onClick={() => setBanTarget(null)} aria-label="Close" className="cursor-pointer text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">{T('Reason', 'ምክንያት')}</span>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder={T('Why is this student being banned?', 'ይህ ተማሪ ለምን ታገደ?')}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">{T('Ban ends on (optional)', 'እገዳው የሚያበቃበት ቀን (አማራጭ)')}</span>
              <input
                type="date"
                value={banUntil}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                onChange={(e) => setBanUntil(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-slate-400"
              />
              <span className="text-[11px] text-slate-500">
                {banUntil ? T('The ban lifts by itself on this date.', 'እገዳው በዚህ ቀን በራሱ ይነሳል።') : T('No end date: the ban stays until you lift it.', 'የማብቂያ ቀን የለም፤ እስኪያነሱት ይቆያል።')}
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setBanTarget(null)} className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 cursor-pointer">
                {T('Cancel', 'ሰርዝ')}
              </button>
              <button
                onClick={confirmBan}
                disabled={Boolean(banUntil) && banUntil <= today}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Ban className="h-4 w-4" />
                {T('Ban student', 'ተማሪውን እገድ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DISBAND MODAL ===================== */}
      {disbandTarget && disbandSummary && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={T('Disband class', 'ክፍል መበተን')}>
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {disbandTarget.isCteSection ? T('Disband CTE group', 'የCTE ቡድን መበተን') : T('Disband class', 'ክፍል መበተን')} {disbandTarget.section}
                </h2>
                <p className="text-sm text-slate-600">{T('Please read what will happen.', 'የሚከሰተውን ያንብቡ።')}</p>
              </div>
              <button onClick={() => !disbanding && setDisbandTarget(null)} aria-label="Close" className="cursor-pointer text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <li>
                <strong>{disbandSummary.total}</strong> {T('students', 'ተማሪዎች')} ({disbandSummary.boys} {T('boys', 'ወንድ')}, {disbandSummary.girls} {T('girls', 'ሴት')}){' '}
                {disbandTarget.isCteSection
                  ? T('leave this CTE group and keep their academic class.', 'ከዚህ የCTE ቡድን ይወጣሉ፤ የትምህርት ክፍላቸውን ይይዛሉ።')
                  : T('go back to the waiting list. Their marks are kept.', 'ወደ መጠበቂያ ዝርዝር ይመለሳሉ። ውጤታቸው ይቀመጣል።')}
              </li>
              {disbandSummary.banned > 0 && (
                <li className="text-rose-700">
                  {disbandSummary.banned} {T('of them are banned. Their ban stays.', 'የታገዱ ናቸው። እገዳቸው ይቆያል።')}
                </li>
              )}
              <li>{T('The class, its timetable periods and its teacher assignments are deleted.', 'ክፍሉ፣ የጊዜ ሰሌዳው እና የመምህራን ምደባው ይሰረዛል።')}</li>
              <li className="font-semibold text-rose-700">{T('This cannot be undone.', 'ይህ ሊመለስ አይችልም።')}</li>
            </ul>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">
                {T('Type', 'ለማረጋገጥ')} <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{disbandTarget.section}</span> {T('to confirm', 'ይተይቡ')}
              </span>
              <input
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value)}
                autoFocus
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-sm outline-none focus:border-slate-400"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setDisbandTarget(null)} disabled={disbanding} className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50 cursor-pointer">
                {T('Cancel', 'ሰርዝ')}
              </button>
              <button
                onClick={confirmDisband}
                disabled={!codeMatches || disbanding}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                {disbanding ? T('Disbanding…', 'በመበተን ላይ…') : T('Disband', 'በትን')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
