/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  History,
  Check,
  X,
  Minus,
  TriangleAlert,
  Loader2,
  UserCheck,
  UserPlus,
  Undo2,
  Unlink,
  Info,
  Hash
} from 'lucide-react';
import type { ArchiveStudent } from '../utils/registrationAndTimetable';
import {
  StudentMatch,
  StudentMatchIndex,
  StudentMatchQuery,
  FieldStatus,
  MatchLevel,
  hasEnoughToMatch,
  searchPreviousYearStudents,
  composeFullName
} from '../utils/studentMatching';

interface PreviousStudentCheckProps {
  lang: 'en' | 'am';
  /** Index of last year's records, built by the parent. */
  index: StudentMatchIndex;
  /** What the administrator has entered so far (without the optional old ID). */
  query: StudentMatchQuery;
  /** Optional old Student ID typed into this panel. */
  previousStudentIdInput: string;
  onPreviousStudentIdChange: (value: string) => void;
  /** Student IDs of previous-year records that were already registered this year. */
  alreadyRegisteredIds: Set<string>;
  /** The record the administrator confirmed, if any. */
  linkedRecord: ArchiveStudent | null;
  onUse: (record: ArchiveStudent) => void;
  onUnlink: () => void;
}

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 30;
const VISIBLE_CARDS = 3;

const COPY = {
  en: {
    title: 'Previous Student Check',
    subtitle: (n: number) => `Checks last year’s records as you type · ${n.toLocaleString()} records`,
    waiting: 'Enter first and father’s name',
    checking: 'Checking records…',
    found: (n: number) => (n === 1 ? '1 possible match' : `${n} possible matches`),
    none: 'No previous record found',
    linked: 'Linked to previous record',
    newStudent: 'Confirmed as new student',
    emptyArchive:
      'No previous-year records are available yet, so there is nothing to match against. Registration continues as normal.',
    waitingHint:
      'Start with the student’s first and father’s name. Adding the grandfather’s name and date of birth makes the match more accurate.',
    noneHint: 'No similar student in last year’s records. Continue registering as a new student.',
    foundTitle: 'Possible previous-year student found',
    entering: 'Entering now',
    previousRecord: 'Previous record',
    rows: { name: 'Name', dob: 'Birth date', gender: 'Gender', guardian: 'Guardian' },
    male: 'Male',
    female: 'Female',
    previousGrade: 'Previous grade',
    section: 'Section',
    studentId: 'Student ID',
    level: { 'very-likely': 'Very likely', likely: 'Likely', possible: 'Possible' } as Record<MatchLevel, string>,
    idMatch: 'Exact ID match',
    alreadyRegistered: 'Already registered this year',
    confirmTitle: 'Administrator confirmation',
    confirmHint: 'Nothing is copied into the form until you confirm.',
    use: 'Use Previous Student Information',
    isNew: 'This is a New Student',
    more: (n: number) => `${n} more similar record${n === 1 ? '' : 's'} not shown. Add the grandfather’s name or birth date to narrow it down.`,
    idLabel: 'Old Student ID (optional)',
    idPlaceholder: 'e.g. HMM-2018-091',
    idNotFound: 'No record with this ID',
    appliedTitle: 'Previous record applied',
    appliedHint: 'The form below was filled from this record. Please review the highlighted fields.',
    unlink: 'Unlink',
    newTitle: 'Registering as a new student',
    newHint: 'The suggestions above were dismissed. They will not reappear for this student.',
    undo: 'Undo',
    compareCarefully: 'Please compare the details carefully before confirming.'
  },
  am: {
    title: 'የቀድሞ ተማሪ ማረጋገጫ',
    subtitle: (n: number) => `ስም ሲጽፉ የባለፈው ዓመት መዝገብ በራስ-ሰር ይፈተሻል · ${n.toLocaleString()} መዝገቦች`,
    waiting: 'የተማሪውን ስም እና የአባት ስም ይጻፉ',
    checking: 'መዝገቡን በመፈተሽ ላይ…',
    found: (n: number) => `${n} ሊሆን የሚችል ተማሪ ተገኝቷል`,
    none: 'የቀድሞ መዝገብ አልተገኘም',
    linked: 'ከቀድሞ መዝገብ ጋር ተገናኝቷል',
    newStudent: 'አዲስ ተማሪ ተብሎ ተረጋግጧል',
    emptyArchive: 'ለማመሳከር የሚሆን የቀድሞ ዓመት መዝገብ እስካሁን የለም። ምዝገባው እንደተለመደው ይቀጥላል።',
    waitingHint: 'በተማሪው ስም እና በአባት ስም ይጀምሩ። የአያት ስም እና የትውልድ ቀን መጨመር ማመሳከሪያውን ትክክለኛ ያደርገዋል።',
    noneHint: 'በባለፈው ዓመት መዝገብ ውስጥ ተመሳሳይ ተማሪ የለም። እንደ አዲስ ተማሪ መመዝገብዎን ይቀጥሉ።',
    foundTitle: 'ሊሆን የሚችል የቀድሞ ተማሪ ተገኝቷል',
    entering: 'አሁን የሚመዘገበው',
    previousRecord: 'የቀድሞ መዝገብ',
    rows: { name: 'ስም', dob: 'የትውልድ ቀን', gender: 'ጾታ', guardian: 'ኃላፊ' },
    male: 'ወንድ',
    female: 'ሴት',
    previousGrade: 'የቀድሞ ክፍል',
    section: 'ሴክሽን',
    studentId: 'የተማሪ መታወቂያ',
    level: { 'very-likely': 'በጣም ተመሳሳይ', likely: 'ተመሳሳይ', possible: 'ሊሆን ይችላል' } as Record<MatchLevel, string>,
    idMatch: 'መታወቂያው በትክክል ይመሳሰላል',
    alreadyRegistered: 'በዚህ ዓመት ተመዝግቧል',
    confirmTitle: 'የአስተዳዳሪ ማረጋገጫ',
    confirmHint: 'እስኪያረጋግጡ ድረስ ምንም መረጃ ወደ ፎርሙ አይገባም።',
    use: 'የቀድሞ ተማሪ መረጃ ተጠቀም',
    isNew: 'ይህ አዲስ ተማሪ ነው',
    more: (n: number) => `${n} ተጨማሪ ተመሳሳይ መዝገቦች አልታዩም። ለማጥበብ የአያት ስም ወይም የትውልድ ቀን ያክሉ።`,
    idLabel: 'የቀድሞ የተማሪ መታወቂያ (አማራጭ)',
    idPlaceholder: 'ለምሳሌ፡ HMM-2018-091',
    idNotFound: 'በዚህ መታወቂያ የተገኘ መዝገብ የለም',
    appliedTitle: 'የቀድሞ መዝገብ ተተግብሯል',
    appliedHint: 'ከታች ያለው ፎርም ከዚህ መዝገብ ተሞልቷል። ምልክት የተደረገባቸውን መስኮች ይመልከቱ።',
    unlink: 'አገናኙን አስወግድ',
    newTitle: 'እንደ አዲስ ተማሪ እየተመዘገበ ነው',
    newHint: 'ከላይ የነበሩት አስተያየቶች ተትተዋል። ለዚህ ተማሪ እንደገና አይታዩም።',
    undo: 'ቀልብስ',
    compareCarefully: 'እባክዎ መረጃውን በጥንቃቄ ያመሳክሩ።'
  }
} as const;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return '';
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const GUARDIAN_PLACEHOLDER = /^parent\s*\/?\s*guardian$/i;

const STATUS_STYLE: Record<FieldStatus, { row: string; icon: string; label: string }> = {
  match: { row: 'bg-emerald-50/80', icon: 'text-emerald-600', label: 'Matches' },
  similar: { row: 'bg-amber-50/80', icon: 'text-amber-600', label: 'Similar' },
  differs: { row: 'bg-rose-50/80', icon: 'text-rose-600', label: 'Differs' },
  unknown: { row: 'bg-white', icon: 'text-slate-300', label: 'Not available' }
};

const LEVEL_STYLE: Record<MatchLevel, { badge: string; bar: string }> = {
  'very-likely': { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500' },
  likely: { badge: 'bg-teal-100 text-teal-800 border-teal-300', bar: 'bg-teal-500' },
  possible: { badge: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500' }
};

function StatusIcon({ status }: { status: FieldStatus }) {
  const cls = `w-3.5 h-3.5 ${STATUS_STYLE[status].icon}`;
  if (status === 'match') return <Check className={cls} aria-hidden />;
  if (status === 'differs') return <X className={cls} aria-hidden />;
  if (status === 'similar') {
    return (
      <span className={`text-sm leading-none font-black ${STATUS_STYLE.similar.icon}`} aria-hidden>
        ≈
      </span>
    );
  }
  return <Minus className={cls} aria-hidden />;
}

export const PreviousStudentCheck: React.FC<PreviousStudentCheckProps> = ({
  lang,
  index,
  query,
  previousStudentIdInput,
  onPreviousStudentIdChange,
  alreadyRegisteredIds,
  linkedRecord,
  onUse,
  onUnlink
}) => {
  const t = COPY[lang];
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  // The query that is actually checked: debounced so typing stays smooth.
  const fullQuery: StudentMatchQuery = useMemo(
    () => ({ ...query, previousStudentId: previousStudentIdInput.trim() || undefined }),
    [query, previousStudentIdInput]
  );
  const queryKey = JSON.stringify(fullQuery);
  const debouncedKey = useDebounced(queryKey, DEBOUNCE_MS);
  const debouncedQuery = useMemo(() => JSON.parse(debouncedKey) as StudentMatchQuery, [debouncedKey]);

  const enoughNow = hasEnoughToMatch(fullQuery);
  const isChecking = enoughNow && queryKey !== debouncedKey;
  const enoughChecked = hasEnoughToMatch(debouncedQuery);

  const result = useMemo(
    () => searchPreviousYearStudents(index, debouncedQuery, { limit: SEARCH_LIMIT }),
    [index, debouncedQuery]
  );

  const open = result.matches.filter((m) => !dismissed.has(m.record.id));
  const visible = open.slice(0, VISIBLE_CARDS);
  const hiddenCount = Math.max(0, open.length - visible.length) + Math.max(0, result.totalFound - result.matches.length);
  const hasDismissed = enoughChecked && dismissed.size > 0 && result.matches.some((m) => dismissed.has(m.record.id));

  const idTyped = previousStudentIdInput.trim();
  const idNotFound = idTyped.length >= 5 && !index.byStudentId.has(idTyped.toLowerCase());

  // ---- header status ------------------------------------------------------
  type Phase = 'empty' | 'linked' | 'waiting' | 'checking' | 'found' | 'new' | 'none';
  let phase: Phase;
  if (index.entries.length === 0) phase = 'empty';
  else if (linkedRecord) phase = 'linked';
  else if (!enoughNow) phase = 'waiting';
  else if (isChecking) phase = 'checking';
  else if (visible.length > 0) phase = 'found';
  else if (hasDismissed) phase = 'new';
  else phase = 'none';

  const statusText: Record<Phase, string> = {
    empty: t.none,
    linked: t.linked,
    waiting: t.waiting,
    checking: t.checking,
    found: t.found(open.length + Math.max(0, result.totalFound - result.matches.length)),
    new: t.newStudent,
    none: t.none
  };
  const statusStyle: Record<Phase, string> = {
    empty: 'bg-slate-100 text-slate-600 border-slate-200',
    linked: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    waiting: 'bg-slate-100 text-slate-600 border-slate-200',
    checking: 'bg-sky-50 text-sky-700 border-sky-200',
    found: 'bg-amber-100 text-amber-900 border-amber-300',
    new: 'bg-slate-100 text-slate-700 border-slate-300',
    none: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const dismissAll = () => setDismissed((prev) => new Set([...prev, ...result.matches.map((m) => m.record.id)]));
  const undoDismiss = () => setDismissed(new Set());

  const enteredName = composeFullName(query.firstName, query.fatherName, query.grandfatherName);
  const genderLabel = (g?: 'M' | 'F') => (g === 'F' ? t.female : g === 'M' ? t.male : '—');

  const borderTone =
    phase === 'linked'
      ? 'border-emerald-300'
      : phase === 'found'
        ? 'border-amber-300'
        : 'border-slate-200';

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={t.title}
        className={`rounded-2xl border-2 bg-white shadow-xs overflow-hidden transition-colors duration-300 ${borderTone}`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0">
              <History className="w-4 h-4 text-amber-300" aria-hidden />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 leading-tight">{t.title}</h4>
              <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">{t.subtitle(index.entries.length)}</p>
            </div>
          </div>

          <div aria-live="polite" className="flex-shrink-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={phase + (phase === 'found' ? open.length : '')}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${statusStyle[phase]}`}
              >
                {phase === 'checking' && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
                {phase === 'linked' && <UserCheck className="w-3 h-3" aria-hidden />}
                {phase === 'found' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden />}
                {phase === 'new' && <UserPlus className="w-3 h-3" aria-hidden />}
                {statusText[phase]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Empty archive */}
          {phase === 'empty' && (
            <p className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{t.emptyArchive}</span>
            </p>
          )}

          {/* Optional old student ID */}
          {phase !== 'empty' && phase !== 'linked' && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="prev-student-id" className="text-[10.5px] font-bold text-slate-600 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" aria-hidden />
                {t.idLabel}
              </label>
              <input
                id="prev-student-id"
                type="text"
                value={previousStudentIdInput}
                onChange={(e) => onPreviousStudentIdChange(e.target.value)}
                placeholder={t.idPlaceholder}
                autoComplete="off"
                className="w-44 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {idNotFound && <span className="text-[10.5px] font-semibold text-rose-600">{t.idNotFound}</span>}
            </div>
          )}

          {/* Waiting / none hints */}
          {phase === 'waiting' && (
            <p className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{t.waitingHint}</span>
            </p>
          )}
          {phase === 'none' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{t.noneHint}</span>
            </motion.p>
          )}

          {/* Confirmed: linked to previous record */}
          <AnimatePresence initial={false}>
            {phase === 'linked' && linkedRecord && (
              <motion.div
                key="linked"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-emerald-950">{t.appliedTitle}</div>
                    <div className="text-[11px] text-emerald-900 font-semibold truncate">
                      {linkedRecord.fullName} · {linkedRecord.studentId} · {t.previousGrade} {linkedRecord.previousGrade} (
                      {linkedRecord.previousSection})
                    </div>
                    <div className="text-[10.5px] text-emerald-800/80 mt-0.5">{t.appliedHint}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onUnlink}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Unlink className="w-3.5 h-3.5" aria-hidden />
                  {t.unlink}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions */}
          {phase !== 'linked' && (
            <>
              {(phase === 'found' || phase === 'checking') && visible.length > 0 && (
                <div className="text-[11px] font-black text-amber-900 uppercase tracking-wide">{t.foundTitle}</div>
              )}

              <div className={`space-y-3 transition-opacity duration-200 ${phase === 'checking' ? 'opacity-60' : 'opacity-100'}`}>
                <AnimatePresence initial={false}>
                  {visible.map((match) => (
                    <MatchCard
                      key={match.record.id}
                      match={match}
                      t={t}
                      enteredName={enteredName}
                      query={query}
                      genderLabel={genderLabel}
                      alreadyRegistered={alreadyRegisteredIds.has(match.record.studentId)}
                      onUse={() => onUse(match.record)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {hiddenCount > 0 && phase !== 'waiting' && (
                <p className="text-[10.5px] text-slate-500 flex items-start gap-1.5">
                  <Info className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
                  <span>{t.more(hiddenCount)}</span>
                </p>
              )}

              {/* Confirmed: new student */}
              <AnimatePresence initial={false}>
                {phase === 'new' && (
                  <motion.div
                    key="new"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-3.5 h-3.5" aria-hidden />
                      </span>
                      <div>
                        <div className="text-xs font-black text-slate-900">{t.newTitle}</div>
                        <div className="text-[10.5px] text-slate-600">{t.newHint}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={undoDismiss}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <Undo2 className="w-3.5 h-3.5" aria-hidden />
                      {t.undo}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Administrator confirmation */}
        <AnimatePresence initial={false}>
          {phase === 'found' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
                    {t.confirmTitle}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{t.confirmHint}</div>
                </div>
                <button
                  type="button"
                  onClick={dismissAll}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <UserPlus className="w-3.5 h-3.5" aria-hidden />
                  {t.isNew}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
};

// ---------------------------------------------------------------------------
// One suggested previous-year student
// ---------------------------------------------------------------------------

interface MatchCardProps {
  match: StudentMatch;
  t: (typeof COPY)['en'] | (typeof COPY)['am'];
  enteredName: string;
  query: StudentMatchQuery;
  genderLabel: (g?: 'M' | 'F') => string;
  alreadyRegistered: boolean;
  onUse: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, t, enteredName, query, genderLabel, alreadyRegistered, onUse }) => {
  const { record } = match;
  const level = LEVEL_STYLE[match.level];
  const previousGuardian = GUARDIAN_PLACEHOLDER.test((record.guardianName || '').trim()) ? '' : record.guardianName;

  const rows: { key: string; label: string; entered: string; previous: string; status: FieldStatus }[] = [
    { key: 'name', label: t.rows.name, entered: enteredName || '—', previous: record.fullName, status: match.fields.name },
    {
      key: 'dob',
      label: t.rows.dob,
      entered: formatDate(query.dateOfBirth) || '—',
      previous: formatDate(record.dateOfBirth) || '—',
      status: match.fields.dateOfBirth
    },
    {
      key: 'gender',
      label: t.rows.gender,
      entered: genderLabel(query.gender),
      previous: genderLabel(record.gender),
      status: match.fields.gender
    },
    {
      key: 'guardian',
      label: t.rows.guardian,
      entered: (query.guardianName || '').trim() || '—',
      previous: previousGuardian || '—',
      status: match.fields.guardian
    }
  ];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:border-emerald-400 transition-colors"
    >
      {/* Identity of the previous-year student */}
      <div className="px-3.5 pt-3 pb-2.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-slate-900 leading-snug">
            {record.fullName}
            {record.fullNameAmharic ? (
              <span className="font-semibold text-slate-500"> ({record.fullNameAmharic})</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
            <span>
              <span className="text-slate-400">{t.previousGrade}:</span>{' '}
              <strong className="text-slate-800">{record.previousGrade}</strong>
            </span>
            <span>
              <span className="text-slate-400">{t.section}:</span>{' '}
              <strong className="text-slate-800">{record.previousSection}</strong>
            </span>
            <span>
              <span className="text-slate-400">{t.studentId}:</span>{' '}
              <strong className="text-slate-800 font-mono">{record.studentId}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${level.badge}`}>
            {match.byStudentId ? t.idMatch : t.level[match.level]}
          </span>
          <div className="w-24 h-1 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
            <motion.div
              className={`h-full rounded-full ${level.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(match.score * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Entered vs previous comparison */}
      <div className="px-3.5 pb-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden text-[11px]">
          <div className="grid grid-cols-[4.6rem_1fr_1fr_1.5rem] bg-slate-100 text-[10px] font-black uppercase tracking-wide">
            <div className="px-2 py-1.5" />
            <div className="px-2 py-1.5 text-slate-700">{t.entering}</div>
            <div className="px-2 py-1.5 text-amber-800 bg-amber-100/70">{t.previousRecord}</div>
            <div />
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className={`grid grid-cols-[4.6rem_1fr_1fr_1.5rem] items-center border-t border-slate-100 transition-colors ${STATUS_STYLE[row.status].row}`}
            >
              <div className="px-2 py-1.5 font-bold text-slate-500">{row.label}</div>
              <div className="px-2 py-1.5 text-slate-900 font-semibold break-words min-w-0">{row.entered}</div>
              <div className="px-2 py-1.5 text-slate-900 font-semibold break-words min-w-0">{row.previous}</div>
              <div className="flex items-center justify-center" title={STATUS_STYLE[row.status].label}>
                <StatusIcon status={row.status} />
              </div>
            </div>
          ))}
        </div>

        {match.level === 'possible' && (
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-amber-800">
            <TriangleAlert className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden />
            <span>{t.compareCarefully}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUse}
            disabled={alreadyRegistered}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[11px] font-black rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-300" aria-hidden />
            {t.use}
          </button>
          {alreadyRegistered && (
            <span className="text-[10.5px] font-bold text-rose-700 flex items-center gap-1">
              <TriangleAlert className="w-3 h-3" aria-hidden />
              {t.alreadyRegistered}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
};
