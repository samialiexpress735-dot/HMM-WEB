/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Shuffle,
  Sliders,
  ChevronRight,
  BookOpen,
  Building,
  GraduationCap,
  Shield,
  Layers,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight,
  HelpCircle,
  Phone,
  UserCheck,
  School,
  AlertCircle,
  Download,
  ArrowLeft,
  Globe,
  LogOut,
  Plus,
  Armchair
} from 'lucide-react';
import {
  ArchiveStudent,
  RegisteredStudent2019,
  TimetableSlot,
  SectionAllocationBucket,
  recommendPreviousYearStudents,
  allocateStudentsToSections,
  reassignStudentToSection,
  generateSectionRosterCsv,
  checkTimetablePeriodConflict,
  DAYS_OF_WEEK,
  PERIOD_TIMES
} from '../utils/registrationAndTimetable';
import {
  PREVIOUS_YEAR_ARCHIVE_STUDENTS,
  INITIAL_REGISTERED_2019_STUDENTS,
  INITIAL_TIMETABLE_SLOTS
} from '../data/registrationArchiveData';
import {
  Teacher,
  GradeSection,
  STANDARD_GRADE_9_10_SUBJECTS,
  STANDARD_GRADE_11_12_NATURAL_SUBJECTS,
  STANDARD_GRADE_11_12_SOCIAL_SUBJECTS,
  CTE_SPECIALIZATION_OPTIONS,
  CTESpecialization
} from '../data/schoolData';
import { syncStudentToCloud, syncTimetableSlotToCloud, fetchRegistrationsFromCloud } from '../lib/supabase';
import {
  normalizeName,
  studentsToArchive,
  suggestPreviousStudents,
  allocateCteByMerit,
  choicesOf,
  CteTrack
} from '../utils/registrarLogic';
import { Student } from '../data/schoolData';
import { SCHOOL_INFO } from '../data/schoolInfo';
import {
  SeatAssignment,
  isAcademicSection,
  sectionAcceptsStudent,
  getSectionFill,
  validateSectionCapacity,
  getWaitingStudents,
  planSeatFilling,
  applyAssignmentsToSections,
  nextLetterIndex
} from '../utils/sectionCapacity';

interface RegistrarAdminPageProps {
  teachers: Teacher[];
  sections: GradeSection[];
  onAddSections: (newSections: GradeSection[]) => void;
  /** Saves one changed class in place (used for seat changes and adding students). */
  onUpdateSection?: (section: GradeSection) => void;
  onUpdateStudents?: (students: any[] | ((prev: any[]) => any[])) => void;
  /** The school's current students: last year's records used for name suggestions. */
  previousYearStudents?: Student[];
  lang: 'en' | 'am';
  onNavigateToGrades?: () => void;
  onNavigateToTeacher?: (sectionCode?: string, subjectId?: string) => void;
  onNavigateToAdmin?: () => void;
  onNavigateHome?: () => void;
  onSignOutAdmin?: () => void;
}

export const RegistrarAdminPage: React.FC<RegistrarAdminPageProps> = ({
  teachers,
  sections,
  onAddSections,
  onUpdateSection,
  onUpdateStudents,
  previousYearStudents = [],
  lang,
  onNavigateToGrades,
  onNavigateToTeacher,
  onNavigateToAdmin,
  onNavigateHome,
  onSignOutAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'registration' | 'allocation' | 'timetable'>('registration');

  // Archive & 2019 Registrations state
  const [archiveStudents] = useState<ArchiveStudent[]>(PREVIOUS_YEAR_ARCHIVE_STUDENTS);
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent2019[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_registered_students');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_REGISTERED_2019_STUDENTS;
  });

  // Timetable & Conflict Detection State
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_timetable_slots');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_TIMETABLE_SLOTS;
  });

  // Sync registered intake & timetable to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_registered_students', JSON.stringify(registeredStudents));
    } catch {
      // ignore
    }
  }, [registeredStudents]);

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_timetable_slots', JSON.stringify(timetableSlots));
    } catch {
      // ignore
    }
  }, [timetableSlots]);

  // Registration Form State
  const [targetGrade, setTargetGrade] = useState<number>(9);
  const [targetStream, setTargetStream] = useState<'Natural Science' | 'Social Science'>('Natural Science');
  const [cteChoices, setCteChoices] = useState<string[]>([]);
  const [lastTyped, setLastTyped] = useState<'en' | 'am'>('en');
  const [suggestOpen, setSuggestOpen] = useState<boolean>(false);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [linked, setLinked] = useState<ArchiveStudent | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [cteCapacities, setCteCapacities] = useState<Record<string, number>>({});
  const [cteUnplaced, setCteUnplaced] = useState<RegisteredStudent2019[]>([]);
  const [cteRankCounts, setCteRankCounts] = useState<number[]>([0, 0, 0, 0]);
  const [allocationNotice, setAllocationNotice] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [fullNameAmharic, setFullNameAmharic] = useState<string>('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [previousSchool, setPreviousSchool] = useState<string>('Debre Berhan Primary School');
  const [previousGrade, setPreviousGrade] = useState<number>(8);
  const [previousSection, setPreviousSection] = useState<string>('8A');
  const [previousScore, setPreviousScore] = useState<number>(88.5);
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianPhone, setGuardianPhone] = useState<string>('+251 91 ');
  const [conduct, setConduct] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Allocation State
  const [allocationGrade, setAllocationGrade] = useState<number>(9);
  const [allocationKind, setAllocationKind] = useState<'academic' | 'cte'>('academic');
  const [allocationStream, setAllocationStream] = useState<'Natural Science' | 'Social Science'>('Natural Science');
  const [studentsPerSection, setStudentsPerSection] = useState<number>(6);
  const [targetCapacity, setTargetCapacity] = useState<number>(45);
  const [numSectionsInput, setNumSectionsInput] = useState<number>(2);
  const [allocationMethod, setAllocationMethod] = useState<'by-size' | 'by-count'>('by-size');
  const [allocationMode, setAllocationMode] = useState<'combined-smart' | 'gender-balanced' | 'merit-balanced' | 'random'>(
    'combined-smart'
  );
  const [previewBuckets, setPreviewBuckets] = useState<SectionAllocationBucket[] | null>(null);
  // Existing classes: seat edits and adding students
  const [seatDrafts, setSeatDrafts] = useState<Record<string, string>>({});
  const [addPick, setAddPick] = useState<Record<string, string>>({});
  const [seatsNotice, setSeatsNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  // Start over: split every student of the grade again instead of keeping existing classes
  const [reshuffleAll, setReshuffleAll] = useState<boolean>(false);
  const [previewSearchQuery, setPreviewSearchQuery] = useState<string>('');
  const [allocationSuccessMessage, setAllocationSuccessMessage] = useState<string>('');
  const [hasCommittedCurrentPreview, setHasCommittedCurrentPreview] = useState<boolean>(false);
  const [showCommitSuccessModal, setShowCommitSuccessModal] = useState<boolean>(false);
  const [lastCommittedSectionsInfo, setLastCommittedSectionsInfo] = useState<{
    codes: string[];
    count: number;
    studentCount: number;
  } | null>(null);

  // Timetable & Conflict Detection State
  const [selectedTimetableSection, setSelectedTimetableSection] = useState<string>('9B');
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<Partial<TimetableSlot> | null>(null);
  const [slotDay, setSlotDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotSubjectId, setSlotSubjectId] = useState<string>('math');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('t2');
  const [clashError, setClashError] = useState<string | null>(null);
  const [clashErrorAmharic, setClashErrorAmharic] = useState<string | null>(null);

  const T = (en: string, am: string) => (lang === 'am' ? am : en);
  const labelCls = 'mb-1.5 block text-xs font-semibold text-slate-600';
  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

  // ---- Name suggestions from last year's records ----------------------------------------------
  // The pool is the school's real student list plus the older archive. Grade 12 graduates are excluded.
  const previousPool = React.useMemo(() => {
    const live = studentsToArchive(previousYearStudents);
    const liveIds = new Set(live.map((x) => x.studentId));
    // The demo archive is only a stand-in until the school has real students.
    return live.length > 0 ? live : archiveStudents.filter((x) => !liveIds.has(x.studentId));
  }, [previousYearStudents, archiveStudents]);

  const typedName = lastTyped === 'am' ? fullNameAmharic : fullName;
  const suggestions = React.useMemo(
    () => (linked ? [] : suggestPreviousStudents(previousPool, typedName)),
    [previousPool, typedName, linked]
  );
  const alreadyRegistered = (c: ArchiveStudent) =>
    registeredStudents.some(
      (r) => r.targetGrade === c.eligibleForGrade && normalizeName(r.fullName) === normalizeName(c.fullName)
    );

  const handleSelectSuggestion = (c: ArchiveStudent) => {
    setFullName(c.fullName);
    setFullNameAmharic(c.fullNameAmharic);
    setGender(c.gender);
    setPreviousSchool(c.previousSchool);
    setPreviousGrade(c.previousGrade);
    setPreviousSection(c.previousSection);
    if (c.previousAverageScore > 0) setPreviousScore(c.previousAverageScore);
    setGuardianName(c.guardianName);
    setGuardianPhone(c.guardianPhone);
    setConduct(c.conduct);
    if (c.eligibleForGrade >= 9 && c.eligibleForGrade <= 12) setTargetGrade(c.eligibleForGrade);
    if (c.recommendedStream) setTargetStream(c.recommendedStream);
    setLinked(c);
    setSuggestOpen(false);
    setActiveIdx(0);
    setFormError('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const pick = suggestions[activeIdx]?.student;
      if (pick && !alreadyRegistered(pick)) {
        e.preventDefault();
        handleSelectSuggestion(pick);
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  };

  // Tap a CTE track to add it to the ranking; tap it again to remove it.
  const toggleCteChoice = (label: string) =>
    setCteChoices((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load registrations saved from other devices, and send up any that only exist here.
  useEffect(() => {
    let cancelled = false;
    fetchRegistrationsFromCloud().then((rows) => {
      if (cancelled || rows.length === 0) return;
      setRegisteredStudents((local) => {
        const byId = new Map(local.map((r) => [r.id, r]));
        rows.forEach((c) => {
          const l = byId.get(c.id);
          if (!l) {
            byId.set(c.id, c);
          } else {
            const defined = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && v !== '' && v !== null));
            byId.set(c.id, { ...l, ...defined });
          }
        });
        const cloudIds = new Set(rows.map((r) => r.id));
        local.filter((l) => !cloudIds.has(l.id)).forEach((l) => syncStudentToCloud(l).catch(() => {}));
        return [...byId.values()].sort((x, y) => (y.registrationDate || '').localeCompare(x.registrationDate || ''));
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Submit new registration
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const name = fullName.trim();
    if (!name) {
      setFormError(lang === 'am' ? 'እባክዎ የተማሪውን ስም ያስገቡ።' : 'Please enter the student’s name.');
      return;
    }
    if (targetGrade >= 11 && cteChoices.length < CTE_SPECIALIZATION_OPTIONS.length) {
      setFormError(
        lang === 'am'
          ? 'እባክዎ አራቱንም የCTE ሙያዎች በምርጫ ቅደም ተከተል ያስቀምጡ።'
          : 'Please rank all four CTE tracks, from 1st choice to 4th choice.'
      );
      return;
    }
    if (registeredStudents.some((r) => r.targetGrade === targetGrade && normalizeName(r.fullName) === normalizeName(name))) {
      setFormError(
        lang === 'am'
          ? `${name} ለ${targetGrade}ኛ ክፍል አስቀድሞ ተመዝግቧል።`
          : `${name} is already registered for Grade ${targetGrade}.`
      );
      return;
    }

    const yearNum = parseInt(SCHOOL_INFO.registrationYear, 10) || new Date().getFullYear();
    const prefix = `HMM-${yearNum}-${targetGrade.toString().padStart(2, '0')}`;
    const taken = new Set(registeredStudents.map((r) => r.studentId));
    let n = registeredStudents.length + 1;
    while (taken.has(`${prefix}${String(n).padStart(2, '0')}`)) n++;
    const newStudentId = `${prefix}${String(n).padStart(2, '0')}`;

    const newStudent: RegisteredStudent2019 = {
      id: `reg-${Date.now()}`,
      studentId: newStudentId,
      fullName: name,
      fullNameAmharic: fullNameAmharic.trim() || name,
      gender,
      targetGrade,
      stream: targetGrade >= 11 ? targetStream : undefined,
      cteChoices: targetGrade >= 11 ? cteChoices : undefined,
      cteSpecialization: targetGrade >= 11 ? cteChoices[0] : undefined,
      academicYear: SCHOOL_INFO.registrationYear,
      previousSchool: previousSchool.trim() || 'Debre Berhan Feeder School',
      previousGrade,
      previousSection,
      previousAverageScore: Number(previousScore) || 0,
      guardianName: guardianName.trim() || 'Parent/Guardian',
      guardianPhone: guardianPhone.trim() || '+251 91 000 0000',
      conduct,
      registrationDate: new Date().toISOString().split('T')[0],
      avatar: ''
    };

    setRegisteredStudents((prev) => [newStudent, ...prev]);
    syncStudentToCloud(newStudent).catch(() => {});

    setFullName('');
    setFullNameAmharic('');
    setGuardianName('');
    setGuardianPhone('+251 91 ');
    setLinked(null);
    setCteChoices([]);
    setSuggestOpen(false);
    setToast(
      lang === 'am'
        ? `${newStudent.fullNameAmharic} ለ${targetGrade}ኛ ክፍል ተመዝግቧል።`
        : `${newStudent.fullName} is registered for Grade ${targetGrade}.`
    );
  };

  // ---- Existing classes: seats, adding students, filling open seats ---------------------------
  const saveClass = (updated: GradeSection) => {
    if (onUpdateSection) onUpdateSection(updated);
    else onAddSections([updated]);
  };

  const sameCode = (a?: string, b?: string) => (a || '').toUpperCase().trim() === (b || '').toUpperCase().trim();

  /**
   * Moves registered students into existing classes: records the class on each student, updates the
   * class totals, and adds the students to the school's active student list (marks are kept if they
   * already have a record). Everything is saved to the cloud like a normal edit.
   */
  const placeStudentsInClasses = (assignments: SeatAssignment[]) => {
    if (assignments.length === 0) return;
    const before = registeredStudents;
    const byStudent = new Map(assignments.map((a) => [a.studentId, a.sectionCode]));
    const updatedSections = applyAssignmentsToSections(sections, assignments, before);
    updatedSections.forEach(saveClass);

    const updatedRegistered = before.map((r) => (byStudent.has(r.id) ? { ...r, allocatedSection: byStudent.get(r.id) } : r));
    setRegisteredStudents(updatedRegistered);
    updatedRegistered.forEach((r, i) => {
      if (r !== before[i]) syncStudentToCloud(r).catch(() => {});
    });

    if (!onUpdateStudents) return;
    const secByCode = new Map(updatedSections.map((sec) => [sec.section.toUpperCase().trim(), sec]));
    const nextRank = new Map<string, number>();
    updatedSections.forEach((sec) => {
      const old = sections.find((x) => sameCode(x.section, sec.section));
      nextRank.set(sec.section.toUpperCase().trim(), old ? getSectionFill(old, before).enrolled : 0);
    });
    const registeredById = new Map(before.map((r) => [r.id, r]));
    const joining = assignments
      .map((a) => ({ reg: registeredById.get(a.studentId), sec: secByCode.get(a.sectionCode.toUpperCase().trim()) }))
      .filter((x): x is { reg: RegisteredStudent2019; sec: GradeSection } => Boolean(x.reg && x.sec));

    const inClass = (st: any, sec: GradeSection) =>
      st.grade === sec.grade && st.section === sec.sectionLetter && (sec.grade < 11 || st.stream === sec.stream);

    onUpdateStudents((prev: any) => {
      const prevArr: any[] = Array.isArray(prev) ? prev : [];
      const existingById = new Map(prevArr.map((x) => [x.id, x]));
      const built = joining.map(({ reg, sec }) => {
        const key = sec.section.toUpperCase().trim();
        const rank = (nextRank.get(key) || 0) + 1;
        nextRank.set(key, rank);
        const stream = sec.grade >= 11 ? (sec.stream as any) : reg.stream;
        const existing = existingById.get(reg.id);
        if (existing) {
          return { ...existing, grade: sec.grade, section: sec.sectionLetter, stream, totalStudentsInSection: sec.totalStudents };
        }
        const template =
          sec.grade >= 11
            ? sec.stream === 'Social Science'
              ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
              : STANDARD_GRADE_11_12_NATURAL_SUBJECTS
            : STANDARD_GRADE_9_10_SUBJECTS;
        const subjects = template.map((ts) => ({
          subjectId: ts.subjectId,
          subjectName: ts.subjectName,
          subjectAmharic: ts.subjectAmharic || ts.subjectName,
          teacherName: ts.teacherName || 'Unassigned',
          continuousAssessment: 0,
          midExam: 0,
          finalExam: 0,
          totalScore: 0
        }));
        return {
          id: reg.id,
          studentId: reg.studentId,
          fullName: reg.fullName,
          fullNameAmharic: reg.fullNameAmharic || reg.fullName,
          gender: reg.gender,
          grade: sec.grade,
          section: sec.sectionLetter,
          stream,
          cteSpecialization: reg.cteSection ? reg.cteSpecialization : undefined,
          academicYear: SCHOOL_INFO.registrationYear,
          homeroomTeacher: sec.homeroomTeacher?.id ? sec.homeroomTeacher.name : 'To be assigned',
          guardianName: reg.guardianName || 'Parent/Guardian',
          guardianPhone: reg.guardianPhone || '+251 91 000 0000',
          conduct: reg.conduct || 'A',
          attendanceRate: 100,
          rank,
          totalStudentsInSection: sec.totalStudents,
          semesters: [
            { semester: 1 as const, subjects },
            { semester: 2 as const, subjects }
          ]
        };
      });
      const newIds = new Set(built.map((b) => b.id));
      const kept = prevArr
        .filter((x) => !newIds.has(x.id))
        .map((x) => {
          const sec = updatedSections.find((u) => inClass(x, u));
          return sec ? { ...x, totalStudentsInSection: sec.totalStudents } : x;
        });
      return [...kept, ...built];
    });
  };

  /** Plain-language summary like "9A +6, 9B +4". */
  const summarizePlacement = (assignments: SeatAssignment[]) => {
    const counts = new Map<string, number>();
    assignments.forEach((a) => counts.set(a.sectionCode, (counts.get(a.sectionCode) || 0) + 1));
    return Array.from(counts.entries())
      .map(([code, n]) => `${code} +${n}`)
      .join(', ');
  };

  const handleSaveSeats = (sec: GradeSection) => {
    const raw = seatDrafts[sec.id];
    if (raw === undefined) return;
    const wanted = Math.floor(Number(raw));
    const check = validateSectionCapacity(sec, wanted, registeredStudents);
    if (!check.ok) {
      setSeatsNotice({
        kind: 'warn',
        text: T(
          `${sec.section} already has ${check.minimum} students, so it needs at least ${check.minimum} seats.`,
          `${sec.section} ቀድሞ ${check.minimum} ተማሪዎች አሉት፤ ቢያንስ ${check.minimum} መቀመጫ ያስፈልገዋል።`
        )
      });
      return;
    }
    saveClass({ ...sec, capacity: wanted });
    setSeatDrafts((prev) => {
      const next = { ...prev };
      delete next[sec.id];
      return next;
    });
    setSeatsNotice({
      kind: 'ok',
      text: T(`${sec.section} now has ${wanted} seats.`, `${sec.section} አሁን ${wanted} መቀመጫ አለው።`)
    });
  };

  const handleAddStudentToClass = (sec: GradeSection) => {
    const studentId = addPick[sec.id];
    const st = registeredStudents.find((r) => r.id === studentId);
    if (!st) return;
    const fill = getSectionFill(sec, registeredStudents);
    if (fill.free <= 0) {
      setSeatsNotice({
        kind: 'warn',
        text: T(`${sec.section} is full. Add seats first.`, `${sec.section} ሞልቷል። መጀመሪያ መቀመጫ ይጨምሩ።`)
      });
      return;
    }
    if (!sectionAcceptsStudent(sec, st)) return;
    placeStudentsInClasses([{ studentId: st.id, sectionCode: sec.section }]);
    setAddPick((prev) => ({ ...prev, [sec.id]: '' }));
    setSeatsNotice({
      kind: 'ok',
      text: T(`${st.fullName} was added to ${sec.section}.`, `${st.fullNameAmharic || st.fullName} ወደ ${sec.section} ተጨምሯል።`)
    });
  };

  const handleFillOpenSeats = () => {
    const waiting = getWaitingStudents(
      registeredStudents,
      sections,
      allocationGrade,
      allocationGrade >= 11 ? allocationStream : undefined
    );
    const plan = planSeatFilling(waiting, sections, registeredStudents);
    if (plan.assignments.length === 0) {
      setSeatsNotice({
        kind: 'warn',
        text:
          waiting.length === 0
            ? T('No students are waiting for a class.', 'ክፍል የሚጠብቅ ተማሪ የለም።')
            : T('No class has an open seat for the waiting students. Add seats to a class first.', 'ለሚጠብቁ ተማሪዎች ባዶ መቀመጫ ያለው ክፍል የለም። መጀመሪያ መቀመጫ ይጨምሩ።')
      });
      return;
    }
    placeStudentsInClasses(plan.assignments);
    setSeatsNotice({
      kind: 'ok',
      text: T(
        `${plan.assignments.length} students moved into open seats (${summarizePlacement(plan.assignments)}).${plan.remaining.length ? ` ${plan.remaining.length} still waiting.` : ''}`,
        `${plan.assignments.length} ተማሪዎች ባዶ መቀመጫ ወዳላቸው ክፍሎች ተዛውረዋል (${summarizePlacement(plan.assignments)})።${plan.remaining.length ? ` ${plan.remaining.length} አሁንም ይጠብቃሉ።` : ''}`
      )
    });
  };

  // Classes already created for the grade (and stream) being worked on, and students still waiting
  const classesHere = sections
    .filter((sec) => isAcademicSection(sec) && sec.grade === allocationGrade && (allocationGrade < 11 || sec.stream === allocationStream))
    .sort((a, b) => (a.sectionLetter || '').localeCompare(b.sectionLetter || '') || a.section.localeCompare(b.section));
  const waitingHere = getWaitingStudents(registeredStudents, sections, allocationGrade, allocationGrade >= 11 ? allocationStream : undefined);
  const openSeatsHere = classesHere.reduce((acc, sec) => acc + getSectionFill(sec, registeredStudents).free, 0);

  // Generate Section Allocation Preview
  const handleGenerateAllocation = () => {
    const streamFilter = allocationGrade >= 11 ? allocationStream : undefined;
    const gradeStudents = registeredStudents.filter((s) => {
      if (s.targetGrade !== allocationGrade) return false;
      if (allocationGrade >= 11) {
        return s.stream === allocationStream;
      }
      return true;
    });

    if (gradeStudents.length === 0) {
      alert(
        lang === 'am'
          ? `ለ${allocationGrade}ኛ ክፍል ${
              allocationGrade >= 11
                ? `(${allocationStream === 'Natural Science' ? 'የተፈጥሮ ሳይንስ' : 'የማህበራዊ ሳይንስ'})`
                : ''
            } የተመዘገበ ተማሪ አልተገኘም! እባክዎ አስቀድመው ተማሪዎችን ይመዝግቡ።`
          : `No registered students found for Grade ${allocationGrade}${
              allocationGrade >= 11 ? ` (${allocationStream})` : ''
            }! Please register students first.`
      );
      return;
    }

    // Normal case: students already in a class stay there. Only students still waiting are placed,
    // first into open seats of classes that already exist, then into new classes.
    // "Start over" re-divides everyone and replaces classes that have the same code.
    let candidates = gradeStudents;
    let placedMessage = '';
    if (!reshuffleAll) {
      candidates = getWaitingStudents(registeredStudents, sections, allocationGrade, streamFilter);
      if (candidates.length === 0) {
        setPreviewBuckets(null);
        setCteUnplaced([]);
        setAllocationSuccessMessage('');
        setAllocationNotice(
          T(
            'Every registered student of this grade is already in a class. Register new students first, or use “Start over” to divide everyone again.',
            'የዚህ ክፍል ደረጃ ሁሉም የተመዘገቡ ተማሪዎች ክፍል አግኝተዋል። አዲስ ተማሪዎችን ይመዝግቡ፣ ወይም ሁሉንም እንደገና ለመከፋፈል “እንደገና ጀምር” ይጠቀሙ።'
          )
        );
        return;
      }
      const plan = planSeatFilling(candidates, sections, registeredStudents);
      if (plan.assignments.length > 0) {
        placeStudentsInClasses(plan.assignments);
        placedMessage = T(
          `${plan.assignments.length} students were moved into open seats of existing classes (${summarizePlacement(plan.assignments)}).`,
          `${plan.assignments.length} ተማሪዎች ባዶ መቀመጫ ወዳላቸው ነባር ክፍሎች ተዛውረዋል (${summarizePlacement(plan.assignments)})።`
        );
      }
      candidates = plan.remaining;
      if (candidates.length === 0) {
        setPreviewBuckets(null);
        setCteUnplaced([]);
        setAllocationNotice('');
        setAllocationSuccessMessage(`${placedMessage} ${T('No new class is needed.', 'አዲስ ክፍል አያስፈልግም።')}`);
        return;
      }
    }

    const options = {
      grade: allocationGrade,
      stream: streamFilter,
      studentsPerSection: allocationMethod === 'by-size' ? studentsPerSection : undefined,
      numSections: allocationMethod === 'by-count' ? numSectionsInput : undefined,
      mode: allocationMode,
      targetCapacity,
      // New classes continue after the ones that exist (9A, 9B exist -> new ones are 9C, 9D)
      startLetterIndex: reshuffleAll ? 0 : nextLetterIndex(sections, allocationGrade, streamFilter)
    };

    const buckets = allocateStudentsToSections(candidates, options);
    setCteUnplaced([]);
    setAllocationNotice(
      buckets.length === 0
        ? T('There are no more class letters left for this grade.', 'ለዚህ ክፍል ደረጃ የቀሩ የክፍል ፊደላት የሉም።')
        : ''
    );
    setPreviewBuckets(buckets.length ? buckets : null);
    setAllocationSuccessMessage(placedMessage);
    setHasCommittedCurrentPreview(false);
    setShowCommitSuccessModal(false);
  };

  // CTE tracks with their seat limits. Students rank all four tracks; highest marks are placed first.
  const cteTracks: CteTrack[] = CTE_SPECIALIZATION_OPTIONS.map((o) => ({
    labelEn: o.labelEn,
    code: o.code,
    capacity: cteCapacities[o.labelEn] ?? 40
  }));

  const handleGenerateCteSections = () => {
    const grade = allocationGrade >= 11 ? allocationGrade : 11;
    const candidates = registeredStudents.filter((st) => st.targetGrade === grade && choicesOf(st).length > 0);
    if (candidates.length === 0) {
      setPreviewBuckets(null);
      setCteUnplaced([]);
      setAllocationNotice(
        lang === 'am'
          ? `ለ${grade}ኛ ክፍል የCTE ሙያ የመረጡ ተማሪዎች የሉም።`
          : `No Grade ${grade} students have chosen CTE tracks yet. Register students first.`
      );
      return;
    }
    const res = allocateCteByMerit(candidates, cteTracks, grade);
    setPreviewBuckets(res.buckets.length ? res.buckets : null);
    setCteUnplaced(res.unplaced);
    setCteRankCounts(res.rankCounts);
    setAllocationNotice('');
    setAllocationSuccessMessage('');
    setHasCommittedCurrentPreview(false);
    setShowCommitSuccessModal(false);
  };

  // Put a student who got no seat into a chosen track (this may go over that track's seat limit).
  const handlePlaceUnplaced = (studentId: string, trackLabel: string) => {
    const st = cteUnplaced.find((x) => x.id === studentId);
    const track = cteTracks.find((t) => t.labelEn === trackLabel);
    if (!st || !track) return;
    const grade = allocationGrade >= 11 ? allocationGrade : 11;
    const placed: RegisteredStudent2019 = {
      ...st,
      cteSpecialization: track.labelEn,
      cteRank: choicesOf(st).indexOf(track.labelEn) + 1 || undefined,
      cteSection: `${grade}-CTE-${track.code}`
    };
    setPreviewBuckets((prev) => {
      const buckets = prev ? [...prev] : [];
      const i = buckets.findIndex((b) => b.cteSpecialization === track.labelEn);
      if (i >= 0) {
        const list = [...buckets[i].students, placed];
        buckets[i] = {
          ...buckets[i],
          students: list,
          maleCount: list.filter((x) => x.gender === 'M').length,
          femaleCount: list.filter((x) => x.gender === 'F').length
        };
      } else {
        buckets.push({
          sectionCode: `${grade}-CTE-${track.code}`,
          sectionLetter: `CTE-${track.code}`,
          students: [placed],
          maleCount: placed.gender === 'M' ? 1 : 0,
          femaleCount: placed.gender === 'F' ? 1 : 0,
          averageScore: Math.round(placed.previousAverageScore || 0),
          maxCapacity: track.capacity,
          roomNumber: `Tech Lab ${cteTracks.indexOf(track) + 1}`,
          isCteSection: true,
          cteSpecialization: track.labelEn
        });
      }
      return buckets;
    });
    setCteUnplaced((prev) => prev.filter((x) => x.id !== studentId));
  };

  // Move Student from one preview section to another
  const handleMoveStudent = (studentId: string, targetSectionCode: string) => {
    if (!previewBuckets) return;
    const updated = reassignStudentToSection(previewBuckets, studentId, targetSectionCode);
    setPreviewBuckets(updated);
  };

  // Export Allocation Rosters to Official CSV
  const handleDownloadCsv = () => {
    if (!previewBuckets || previewBuckets.length === 0) return;
    const csvContent = generateSectionRosterCsv(previewBuckets, '2019 E.C.');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HMM_Grade_${allocationGrade}_Sections_Roster_2017_EC.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm and Commit New Sections
  const handleCommitSections = () => {
    if (!previewBuckets || previewBuckets.length === 0) return;

    if (hasCommittedCurrentPreview) {
      setShowCommitSuccessModal(true);
      return;
    }

    // Create GradeSection objects with empty assigned teachers as requested
    const newGradeSections: GradeSection[] = previewBuckets.map((bucket, idx) => {
      let standardSubjects = STANDARD_GRADE_9_10_SUBJECTS;
      if (allocationGrade >= 11) {
        standardSubjects =
          allocationStream === 'Social Science' || bucket.sectionCode.includes('-Soc')
            ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
            : STANDARD_GRADE_11_12_NATURAL_SUBJECTS;
      }

      // Empty assigned teachers initially
      const emptySubjects = bucket.isCteSection
        ? [
            {
              subjectId: 'cte',
              subjectName: `Career & Technical Education: ${bucket.cteSpecialization || 'Elective'}`,
              subjectAmharic: `የስራና ቴክኒክ፡ ${bucket.cteSpecialization || 'ሙያ'}`,
              teacherId: '',
              teacherName: lang === 'am' ? 'ያልተመደበ (Unassigned)' : 'Unassigned (ያልተመደበ)',
              periodsPerWeek: 4
            }
          ]
        : standardSubjects.map((sub) => ({
            ...sub,
            teacherId: '',
            teacherName: lang === 'am' ? 'ያልተመደበ (Unassigned)' : 'Unassigned (ያልተመደበ)'
          }));

      const streamName = bucket.isCteSection
        ? `CTE Vocational: ${bucket.cteSpecialization}`
        : allocationGrade >= 11
        ? allocationStream
        : 'General Secondary';
      const streamAmharic = bucket.isCteSection
        ? `የስራና ቴክኒክ፡ ${bucket.cteSpecialization}`
        : allocationGrade >= 11
        ? allocationStream === 'Natural Science'
          ? 'የተፈጥሮ ሳይንስ'
          : 'የማህበራዊ ሳይንስ'
        : 'አጠቃላይ 2ኛ ደረጃ';

      return {
        id: `sec-2017-${bucket.sectionCode.toLowerCase()}`,
        grade: allocationGrade,
        section: bucket.sectionCode,
        sectionLetter: bucket.sectionLetter,
        stream: streamName as any,
        streamAmharic,
        isCteSection: bucket.isCteSection || false,
        cteSpecialization: bucket.cteSpecialization,
        totalStudents: bucket.students.length,
        maleStudents: bucket.maleCount,
        femaleStudents: bucket.femaleCount,
        capacity: bucket.maxCapacity || targetCapacity,
        homeroomTeacher: {
          id: '',
          name: lang === 'am' ? 'ያልተመደበ (Unassigned)' : 'Unassigned (ያልተመደበ)',
          nameAmharic: 'ያልተመደበ',
          subject: 'None',
          phone: '-',
          avatar:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
        },
        studentMonitors: {
          classMonitor: bucket.students[0]?.fullName || 'To be elected',
          deputyMonitor: bucket.students[1]?.fullName || 'To be elected'
        },
        subjectAssignments: emptySubjects,
        roomNumber: bucket.roomNumber || `Room ${idx + 1}`,
        buildingBlock: `Block ${bucket.sectionLetter}`,
        shift: idx % 2 === 0 ? 'Morning Shift (ጧት)' : 'Afternoon Shift (ከሰዓት)',
        attendanceToday: 100,
        isDemoAvailable: false
      };
    });

    onAddSections(newGradeSections);

    // Update allocatedSection status on registered students
    // A student has ONE academic section and (Grades 11-12) ONE CTE track. A CTE group never replaces the academic section.
    const allocatedMap = new Map<string, string>();
    const cteMap = new Map<string, { track: string; rank?: number; section: string }>();
    previewBuckets.forEach((b) => {
      b.students.forEach((st) => {
        if (b.isCteSection) {
          cteMap.set(st.id, { track: b.cteSpecialization || '', rank: st.cteRank, section: b.sectionCode });
        } else {
          allocatedMap.set(st.id, b.sectionCode);
        }
      });
    });

    const updatedRegistered = registeredStudents.map((s) => {
      let u = s;
      if (allocatedMap.has(s.id)) u = { ...u, allocatedSection: allocatedMap.get(s.id) };
      const c = cteMap.get(s.id);
      if (c) u = { ...u, cteSpecialization: c.track, cteRank: c.rank, cteSection: c.section };
      return u;
    });
    setRegisteredStudents(updatedRegistered);
    updatedRegistered.forEach((s, i) => {
      if (s !== registeredStudents[i]) syncStudentToCloud(s).catch(() => {});
    });

    // Also convert to active school students with properly initialized subjects (0 initial score)
    if (onUpdateStudents) {
      let templateSubjects = STANDARD_GRADE_9_10_SUBJECTS;
      if (allocationGrade >= 11) {
        templateSubjects =
          allocationStream === 'Social Science'
            ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
            : STANDARD_GRADE_11_12_NATURAL_SUBJECTS;
      }

      const convertedStudents = previewBuckets.filter((b) => !b.isCteSection).flatMap((bucket) => {
        return bucket.students.map((st, idx) => {
          const studentSubjects = (bucket.isCteSection
            ? [
                {
                  subjectId: 'cte',
                  subjectName: `Career & Technical: ${st.cteSpecialization || 'Elective'}`,
                  subjectAmharic: `የስራና ቴክኒክ፡ ${st.cteSpecialization || 'ሙያ'}`,
                  teacherName: 'Unassigned',
                  periodsPerWeek: 4
                }
              ]
            : templateSubjects
          ).map((ts) => ({
            subjectId: ts.subjectId,
            subjectName: ts.subjectName,
            subjectAmharic: ts.subjectAmharic || ts.subjectName,
            teacherName: ts.teacherName || 'Unassigned',
            continuousAssessment: 0,
            midExam: 0,
            finalExam: 0,
            totalScore: 0
          }));

          return {
            id: st.id,
            studentId: st.studentId,
            fullName: st.fullName,
            fullNameAmharic: st.fullNameAmharic || st.fullName,
            gender: st.gender,
            grade: allocationGrade,
            section: bucket.sectionLetter,
            stream: st.stream,
            cteSpecialization: st.cteSection ? st.cteSpecialization : undefined,
            academicYear: SCHOOL_INFO.registrationYear,
            homeroomTeacher: 'To be assigned',
            guardianName: st.guardianName || 'Parent/Guardian',
            guardianPhone: st.guardianPhone || '+251 91 000 0000',
            conduct: st.conduct || 'A',
            attendanceRate: 100,
            rank: idx + 1,
            totalStudentsInSection: bucket.students.length,
            semesters: [
              {
                semester: 1 as const,
                subjects: studentSubjects
              },
              {
                semester: 2 as const,
                subjects: studentSubjects
              }
            ]
          };
        });
      });

      onUpdateStudents((prev: any) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const newIds = new Set(convertedStudents.map((s) => s.id));
        const kept = prevArr.filter((s: any) => !newIds.has(s.id));
        return [...kept, ...convertedStudents];
      });

      // Students already in the school's list keep their section and subjects; they only gain their CTE track.
      if (cteMap.size > 0) {
        onUpdateStudents((prev: any) =>
          (Array.isArray(prev) ? prev : []).map((s: any) => {
            const c = cteMap.get(s.id);
            if (!c) return s;
            const label = `Career & Technical: ${c.track}`;
            const labelAm = `የስራና ቴክኒክ፡ ${c.track}`;
            return {
              ...s,
              cteSpecialization: c.track,
              semesters: (s.semesters || []).map((sem: any) => ({
                ...sem,
                subjects: sem.subjects.some((x: any) => x.subjectId === 'cte')
                  ? sem.subjects.map((x: any) => (x.subjectId === 'cte' ? { ...x, subjectName: label, subjectAmharic: labelAm } : x))
                  : [
                      ...sem.subjects,
                      { subjectId: 'cte', subjectName: label, subjectAmharic: labelAm, teacherName: 'Unassigned', continuousAssessment: 0, midExam: 0, finalExam: 0, totalScore: 0 }
                    ]
              }))
            };
          })
        );
      }
    }

    setAllocationSuccessMessage(
      lang === 'am'
        ? `በ2019 ዓ.ም. ${previewBuckets.length} አዳዲስ ክፍሎች (${previewBuckets
            .map((b) => b.sectionCode)
            .join(', ')}) በተሳካ ሁኔታ ተፈጥረዋል!`
        : `Successfully created ${previewBuckets.length} new 2019 E.C. sections (${previewBuckets
            .map((b) => b.sectionCode)
            .join(', ')}) with room assignments and merit/gender balancing!`
    );

    setHasCommittedCurrentPreview(true);
    setLastCommittedSectionsInfo({
      codes: previewBuckets.map((b) => b.sectionCode),
      count: previewBuckets.length,
      studentCount: previewBuckets.reduce((acc, b) => acc + b.students.length, 0)
    });
    setShowCommitSuccessModal(true);
  };

  // Open Timetable Assignment Modal
  const handleOpenSlotModal = (day: typeof slotDay, period: number) => {
    setSlotDay(day);
    setSlotPeriod(period);
    setClashError(null);
    setClashErrorAmharic(null);

    // Check if slot already exists
    const existing = timetableSlots.find(
      (s) => s.sectionCode === selectedTimetableSection && s.day === day && s.period === period
    );

    const initialTeacherId = existing ? existing.teacherId : (teachers[0]?.id || 't2');
    if (existing) {
      setEditingSlot(existing);
      setSlotSubjectId(existing.subjectId);
      setSlotTeacherId(existing.teacherId);
    } else {
      setEditingSlot(null);
      setSlotSubjectId('math');
      setSlotTeacherId(initialTeacherId);
    }

    setIsSlotModalOpen(true);
    // Evaluate conflict immediately upon opening
    runLiveClashCheck(initialTeacherId, day, period);
  };

  // Live Check Clash when candidate teacher or period changes
  const runLiveClashCheck = (teacherId: string, day: typeof slotDay, period: number) => {
    const selectedTeacher = teachers.find((t) => t.id === teacherId);
    const teacherName = selectedTeacher?.name || 'Selected Teacher';

    const result = checkTimetablePeriodConflict(timetableSlots, {
      slotId: editingSlot?.id,
      teacherId,
      teacherName,
      day,
      period,
      sectionCode: selectedTimetableSection,
      subjectName: slotSubjectId.toUpperCase()
    });

    if (result.hasConflict) {
      setClashError(result.errorMessage || 'Period conflict detected!');
      setClashErrorAmharic(result.errorMessageAmharic || 'የክፍለ-ጊዜ ግጭት ተፈጥሯል!');
      return false;
    } else {
      setClashError(null);
      setClashErrorAmharic(null);
      return true;
    }
  };

  // Save Timetable Slot with Conflict Check
  const handleSaveTimetableSlot = (e: React.FormEvent) => {
    e.preventDefault();

    const isClear = runLiveClashCheck(slotTeacherId, slotDay, slotPeriod);
    if (!isClear) {
      // Conflict exists! Block save and alert
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === slotTeacherId);
    const teacherName = selectedTeacher?.name || 'Unassigned';

    const subjectMap: Record<string, string> = {
      math: 'Mathematics',
      phys: 'Physics',
      chem: 'Chemistry',
      bio: 'Biology',
      eng: 'English Language',
      amh: 'Amharic Language',
      geo: 'Geography',
      hist: 'History',
      civ: 'Citizenship Education',
      it: 'Information Technology (IT)',
      ict: 'Information Technology (IT)',
      pe: 'Physical Education (P.E.)',
      econ: 'Economics',
      agri: 'Agriculture',
      cte: 'Career & Technical Education (CTE)'
    };

    const newSlot: TimetableSlot = {
      id: editingSlot?.id || `slot-${Date.now()}`,
      day: slotDay,
      period: slotPeriod,
      sectionCode: selectedTimetableSection,
      subjectId: slotSubjectId,
      subjectName: subjectMap[slotSubjectId] || slotSubjectId.toUpperCase(),
      teacherId: slotTeacherId,
      teacherName
    };

    setTimetableSlots((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.sectionCode === selectedTimetableSection &&
            s.day === slotDay &&
            s.period === slotPeriod
          )
      );
      return [...filtered, newSlot];
    });

    syncTimetableSlotToCloud(newSlot).catch(() => {});

    setIsSlotModalOpen(false);
  };

  // Remove Slot
  const handleRemoveSlot = (day: typeof slotDay, period: number) => {
    setTimetableSlots((prev) =>
      prev.filter(
        (s) =>
          !(
            s.sectionCode === selectedTimetableSection &&
            s.day === day &&
            s.period === period
          )
      )
    );
    setIsSlotModalOpen(false);
  };

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
          {onNavigateToGrades && (
            <button onClick={onNavigateToGrades} className="btn-academic flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-2.5 sm:py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer">
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{T('Classes & Sections', 'ክፍሎችና ሴክሽኖች')} →</span>
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

      {/* Header with live numbers */}
      <section className="fade-up relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="academic-ribbon absolute inset-x-0 top-0" aria-hidden="true" />
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-slate-950">
              {T('Admissions', 'ምዝገባ')} {SCHOOL_INFO.registrationYear}
            </span>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{T('Admissions and classes', 'ምዝገባና የክፍል ምደባ')}</h1>
            <p className="text-sm leading-relaxed text-slate-300">
              {T(
                'Register students, place them into classes and CTE tracks, then build the timetable.',
                'ተማሪዎችን ይመዝግቡ፣ ወደ ክፍሎችና የCTE ሙያዎች ይመድቡ፣ ከዚያ የጊዜ ሰሌዳ ያዘጋጁ።'
              )}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              [T('Registered', 'የተመዘገቡ'), registeredStudents.length],
              [T('In a class', 'ክፍል ያገኙ'), registeredStudents.filter((r) => r.allocatedSection).length],
              [T('Waiting', 'በመጠበቅ ላይ'), registeredStudents.length - registeredStudents.filter((r) => r.allocatedSection).length]
            ].map(([k, v]) => (
              <div key={String(k)} className="glass min-w-[88px] rounded-2xl px-4 py-3">
                <dd className="font-mono text-2xl font-semibold tabular-nums text-white">{v}</dd>
                <dt className="mt-0.5 text-[11px] text-slate-400">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Steps */}
      <nav aria-label="Registrar steps" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 sm:flex sm:gap-2 sm:overflow-x-auto sm:p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          ['registration', 1, T('Register students', 'ተማሪ መመዝገብ'), registeredStudents.length, UserPlus],
          ['allocation', 2, T('Place in classes', 'ክፍል መመደብ'), registeredStudents.length - registeredStudents.filter((r) => r.allocatedSection).length, Shuffle],
          ['timetable', 3, T('Timetable', 'የጊዜ ሰሌዳ'), undefined, Calendar]
        ] as const).map(([id, n, label, count, Icon]) => {
          const active = activeTab === id;
          return (
            <button
              key={id} onClick={() => setActiveTab(id)} aria-current={active ? 'step' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-center text-[12px] leading-tight font-semibold transition-colors cursor-pointer sm:shrink-0 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-4 sm:text-sm sm:leading-normal ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] ${active ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{n}</span>
              <Icon className={`hidden h-4 w-4 sm:block ${active ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="sm:whitespace-nowrap">{label}</span>
              {count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* =========================================================================
          TAB 1: STUDENT REGISTRATION (name suggestions from last year + ranked CTE choices)
         ========================================================================= */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {toast && (
            <div role="status" className="fade-up fixed bottom-4 sm:bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-4 sm:px-5 py-3 text-sm font-medium text-white shadow-2xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {toast}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                    <UserPlus className="h-5 w-5 text-emerald-700" />
                    {T('New student admission', 'አዲስ ተማሪ ምዝገባ')}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {T(
                      `Start typing a name. We look for the student in ${SCHOOL_INFO.previousYear} records and fill in the rest.`,
                      `ስም መጻፍ ይጀምሩ። ተማሪውን በ${SCHOOL_INFO.previousYear} መዝገብ ውስጥ ፈልገን ቀሪውን እንሞላለን።`
                    )}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-amber-300">
                  {SCHOOL_INFO.registrationYear}
                </span>
              </header>

              <form onSubmit={handleRegisterStudent} className="space-y-7 p-6">
                {/* 1. Name, with suggestions */}
                <section aria-labelledby="reg-name">
                  <h4 id="reg-name" className="mb-3 text-sm font-bold text-slate-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">1</span>
                    {T('Student name', 'የተማሪው ስም')}
                  </h4>
                  <div className="relative">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>{T('Full name (English)', 'ሙሉ ስም (እንግሊዝኛ)')} *</label>
                        <input
                          type="text" autoComplete="off" value={fullName} placeholder="Yared Getachew Tadesse" className={inputCls}
                          onChange={(e) => { setFullName(e.target.value); setLastTyped('en'); setSuggestOpen(true); setActiveIdx(0); if (linked) setLinked(null); }}
                          onFocus={() => { setLastTyped('en'); setSuggestOpen(true); }}
                          onBlur={() => setSuggestOpen(false)}
                          onKeyDown={handleNameKeyDown}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{T('Full name (Amharic)', 'ሙሉ ስም (አማርኛ)')}</label>
                        <input
                          type="text" autoComplete="off" value={fullNameAmharic} placeholder="ያሬድ ጌታቸው ታደሰ" className={inputCls}
                          onChange={(e) => { setFullNameAmharic(e.target.value); setLastTyped('am'); setSuggestOpen(true); setActiveIdx(0); if (linked) setLinked(null); }}
                          onFocus={() => { setLastTyped('am'); setSuggestOpen(true); }}
                          onBlur={() => setSuggestOpen(false)}
                          onKeyDown={handleNameKeyDown}
                        />
                      </div>
                    </div>

                    {suggestOpen && !linked && typedName.trim().length >= 2 && (
                      <div role="listbox" className="fade-up absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500">
                          <Search className="h-3.5 w-3.5" />
                          {suggestions.length > 0
                            ? T(`From ${SCHOOL_INFO.previousYear} records`, `ከ${SCHOOL_INFO.previousYear} መዝገብ`)
                            : T('No match in last year’s records', 'በባለፈው ዓመት መዝገብ አልተገኘም')}
                        </div>
                        {suggestions.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-slate-500">
                            {T('This looks like a new or transfer student. Fill in the details below.', 'አዲስ ወይም ከሌላ ትምህርት ቤት የመጣ ተማሪ ይመስላል። ዝርዝሩን ከታች ይሙሉ።')}
                          </p>
                        ) : (
                          suggestions.map(({ student: c }, i) => {
                            const dup = alreadyRegistered(c);
                            return (
                              <button
                                key={c.id} type="button" role="option" aria-selected={i === activeIdx} disabled={dup}
                                onMouseDown={(e) => { e.preventDefault(); if (!dup) handleSelectSuggestion(c); }}
                                onMouseEnter={() => setActiveIdx(i)}
                                className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 ${i === activeIdx ? 'bg-emerald-50' : 'hover:bg-slate-50'} ${dup ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              >
                                <span className="avatar-monogram h-9 w-9 shrink-0 rounded-full text-xs">
                                  {c.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-900">
                                    {c.fullName}
                                    {c.fullNameAmharic && <span className="font-normal text-slate-500"> · {c.fullNameAmharic}</span>}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {T('Last year', 'ባለፈው ዓመት')}: {c.previousSection}
                                    {c.previousAverageScore > 0 ? ` · ${T('average', 'አማካይ')} ${c.previousAverageScore}%` : ''}
                                  </span>
                                </span>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${dup ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {dup ? T('Already registered', 'ተመዝግቧል') : `→ ${T('Grade', 'ክፍል')} ${c.eligibleForGrade}`}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {linked && (
                    <div className="fade-up mt-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="flex items-start gap-2.5 text-sm text-emerald-900">
                        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        <span>
                          <b>{T('Matched with last year’s record.', 'ከባለፈው ዓመት መዝገብ ጋር ተዛምዷል።')}</b>{' '}
                          {T('Details are filled in. Check them before you confirm.', 'ዝርዝሩ ተሞልቷል። ከማረጋገጥዎ በፊት ያረጋግጡ።')}
                        </span>
                      </div>
                      <button type="button" onClick={() => setLinked(null)} className="shrink-0 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer">
                        {T('Not this student', 'ይህ ተማሪ አይደለም')}
                      </button>
                    </div>
                  )}
                </section>

                {/* 2. Grade */}
                <section aria-labelledby="reg-grade">
                  <h4 id="reg-grade" className="mb-3 text-sm font-bold text-slate-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">2</span>
                    {T('Grade to join', 'የሚገባበት ክፍል')}
                  </h4>
                  <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:inline-flex sm:w-auto" role="radiogroup" aria-label="Grade">
                    {[9, 10, 11, 12].map((g) => (
                      <button
                        key={g} type="button" role="radio" aria-checked={targetGrade === g}
                        onClick={() => { setTargetGrade(g); setPreviousGrade(g - 1); }}
                        className={`rounded-xl px-5 py-2.5 sm:py-2 text-sm font-bold transition-all cursor-pointer sm:flex-none ${targetGrade === g ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {T('Grade', 'ክፍል')} {g}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. Stream + ranked CTE (Grades 11-12) */}
                {targetGrade >= 11 && (
                  <section aria-labelledby="reg-stream" className="fade-up space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                    <div>
                      <h4 id="reg-stream" className="mb-3 text-sm font-bold text-slate-900">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">3</span>
                        {T('Stream', 'የትምህርት ዘርፍ')}
                      </h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {([
                          ['Natural Science', 'የተፈጥሮ ሳይንስ', 'English, Biology, Chemistry, Physics, Math, Amharic, Agriculture, IT'],
                          ['Social Science', 'የማህበራዊ ሳይንስ', 'English, Math, Geography, History, Economics, IT, Citizenship']
                        ] as const).map(([val, am, subjects]) => (
                          <button
                            key={val} type="button" aria-pressed={targetStream === val} onClick={() => setTargetStream(val)}
                            className={`rounded-xl border-2 p-3.5 text-left transition-all cursor-pointer ${targetStream === val ? 'border-slate-950 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <span className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{lang === 'am' ? am : val}</span>
                              <span className={`h-4 w-4 rounded-full border-2 transition-all ${targetStream === val ? 'border-slate-950 bg-slate-950 ring-2 ring-white ring-inset' : 'border-slate-300'}`} />
                            </span>
                            <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{subjects}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-900">
                          {T('CTE track: rank all four', 'የCTE ሙያ፡ አራቱንም በቅደም ተከተል ያስቀምጡ')}
                        </h4>
                        {cteChoices.length > 0 && (
                          <button type="button" onClick={() => setCteChoices([])} className="text-xs font-semibold text-slate-500 underline hover:text-slate-800 cursor-pointer">
                            {T('Start again', 'እንደገና ጀምር')}
                          </button>
                        )}
                      </div>
                      <p className="mb-3 text-xs leading-relaxed text-slate-500">
                        {T(
                          'Tap the tracks in order: first the one you want most, then the next. If a track is full, the student goes to the next choice. Students with higher marks are placed first.',
                          'በጣም የሚፈልገውን መጀመሪያ፣ ቀጥሎ የሚቀጥለውን ይንኩ። አንዱ ሙሉ ከሆነ ተማሪው ወደ ቀጣዩ ምርጫ ይገባል። ከፍተኛ ውጤት ያላቸው መጀመሪያ ይመደባሉ።'
                        )}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {CTE_SPECIALIZATION_OPTIONS.map((opt) => {
                          const rank = cteChoices.indexOf(opt.labelEn) + 1;
                          return (
                            <button
                              key={opt.id} type="button" aria-pressed={rank > 0} onClick={() => toggleCteChoice(opt.labelEn)}
                              className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${rank ? 'border-emerald-600 bg-emerald-50' : 'border-dashed border-slate-300 bg-white hover:border-slate-400'}`}
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold transition-all ${rank ? 'pop bg-emerald-600 text-white' : 'border border-dashed border-slate-300 text-slate-300'}`}>
                                {rank || '·'}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-slate-900">{lang === 'am' ? opt.labelAm : opt.labelEn}</span>
                                <span className="block truncate text-[11px] text-slate-500">
                                  {rank ? `${rank}${['st', 'nd', 'rd', 'th'][rank - 1]} ${T('choice', 'ምርጫ')}` : lang === 'am' ? opt.labelEn : opt.labelAm}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className={`mt-2 text-xs font-semibold ${cteChoices.length === 4 ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {cteChoices.length === 4 ? `✓ ${T('All four ranked', 'አራቱም ተቀምጠዋል')}` : `${cteChoices.length} ${T('of 4 ranked', 'ከ4 ተቀምጠዋል')}`}
                      </p>
                    </div>
                  </section>
                )}

                {/* Details */}
                <section aria-labelledby="reg-details" className="space-y-4">
                  <h4 id="reg-details" className="text-sm font-bold text-slate-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] text-white">{targetGrade >= 11 ? 4 : 3}</span>
                    {T('Details', 'ዝርዝር መረጃ')}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>{T('Gender', 'ጾታ')}</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value as 'M' | 'F')} className={inputCls}>
                        <option value="M">{T('Male', 'ወንድ')}</option>
                        <option value="F">{T('Female', 'ሴት')}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{T('Previous school', 'የቀድሞ ትምህርት ቤት')}</label>
                      <input type="text" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        {targetGrade === 9 ? T('Grade 8 exam result (%)', 'የ8ኛ ክፍል ውጤት (%)') : T('Last year’s average (%)', 'የባለፈው ዓመት አማካይ (%)')}
                      </label>
                      <input type="number" step="0.1" min="0" max="100" value={previousScore} onChange={(e) => setPreviousScore(Number(e.target.value))} className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                  {targetGrade >= 11 && (
                    <p className="-mt-1 text-[11px] text-slate-500">
                      {T('This mark decides who is placed first when CTE tracks fill up.', 'ይህ ውጤት የCTE ሙያዎች ሲሞሉ ማን መጀመሪያ እንደሚመደብ ይወስናል።')}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>{T('Guardian name', 'የወላጅ/አሳዳጊ ስም')}</label>
                      <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{T('Guardian phone', 'የወላጅ/አሳዳጊ ስልክ')}</label>
                      <input type="tel" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                </section>

                {formError && (
                  <div role="alert" className="fade-up flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <span className="text-xs text-slate-500">
                    {T('Admission year', 'የምዝገባ ዓመት')}: <b className="text-slate-700">{SCHOOL_INFO.registrationYear}</b>
                  </span>
                  <button type="submit" className="btn-academic flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 cursor-pointer">
                    <CheckCircle2 className="h-4 w-4 text-amber-300" />
                    {T('Register student', 'ተማሪውን መዝግብ')}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Panel: Registered 2017 Cohort List */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>
                      {T('Registered students', 'የተመዘገቡ ተማሪዎች')}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {T('Grade', 'ክፍል')} {targetGrade}: {registeredStudents.filter((s) => s.targetGrade === targetGrade).length} {T('students', 'ተማሪዎች')}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('allocation')}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{T('Place in classes', 'ክፍል መድብ')} →</span>
                </button>
              </div>

              {/* Registered List */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {registeredStudents.filter((s) => s.targetGrade === targetGrade).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <UserPlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Grade {targetGrade} Students Enrolled Yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Use the intake form on the left or select a 2018 E.C. candidate above to enroll the first applicant.
                    </p>
                  </div>
                ) : (
                  registeredStudents.filter((s) => s.targetGrade === targetGrade).map((st, idx) => {
                    const initials = st.fullName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';
                    return (
                      <div
                        key={st.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-xs border border-slate-700 flex-shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate">
                              {idx + 1}. {st.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{st.studentId}</span>
                              <span>•</span>
                              <span>Score: {st.previousAverageScore}%</span>
                          <span>•</span>
                          <span>{st.gender === 'F' ? 'Female' : 'Male'}</span>
                          {st.stream && (
                            <>
                              <span>•</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-extrabold text-[9.5px] ${
                                  st.stream === 'Natural Science'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {st.stream === 'Natural Science' ? '🧪 Natural' : '📜 Social'}
                              </span>
                            </>
                          )}
                          {st.cteSpecialization && (
                            <span className="px-1.5 py-0.2 rounded font-medium text-[9.5px] bg-slate-200 text-slate-800">
                              CTE: {st.cteSpecialization}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {st.allocatedSection ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {st.allocatedSection}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              }))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RANDOM & BALANCED SECTION ALLOCATION ENGINE
         ========================================================================= */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          {/* Success Banner if committed */}
          {allocationSuccessMessage && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                <span className="font-bold">{allocationSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActiveTab('timetable')}
                className="px-3 py-1.5 bg-emerald-800 text-white rounded-xl font-black text-xs hover:bg-emerald-900 cursor-pointer flex-shrink-0 flex items-center gap-1"
              >
                <span>{T('Next: timetable and teachers →', 'ቀጣይ፡ የጊዜ ሰሌዳና መምህራን →')}</span>
              </button>
            </div>
          )}

          {/* Allocation controls: academic classes or CTE tracks */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">{T('Place students in classes', 'ተማሪዎችን ወደ ክፍል መድብ')}</h3>
                <p className="text-xs text-slate-500">
                  {T('Choose what to place, check the settings, then preview before you save.', 'የሚመደበውን ይምረጡ፣ ቅንብሩን ያረጋግጡ፣ ከማስቀመጥዎ በፊት ቅድመ እይታ ይመልከቱ።')}
                </p>
              </div>
              <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-bold" role="tablist">
                {([['academic', T('Academic classes', 'መደበኛ ክፍሎች')], ['cte', T('CTE tracks (Grades 11–12)', 'የCTE ሙያዎች (11–12)')]] as const).map(([k, label]) => (
                  <button
                    key={k} role="tab" aria-selected={allocationKind === k}
                    onClick={() => {
                      setAllocationKind(k);
                      if (k === 'cte' && allocationGrade < 11) setAllocationGrade(11);
                      setPreviewBuckets(null);
                      setCteUnplaced([]);
                      setAllocationNotice('');
                    }}
                    className={`rounded-full px-4 py-2 transition-colors cursor-pointer ${allocationKind === k ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{T('Grade', 'ክፍል')}</span>
                  <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup">
                    {(allocationKind === 'cte' ? [11, 12] : [9, 10, 11, 12]).map((g) => (
                      <button
                        key={g} role="radio" aria-checked={allocationGrade === g}
                        onClick={() => { setAllocationGrade(g); setPreviewBuckets(null); setCteUnplaced([]); setAllocationNotice(''); }}
                        className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all cursor-pointer ${allocationGrade === g ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {allocationKind === 'academic' && allocationGrade >= 11 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">{T('Stream', 'ዘርፍ')}</span>
                    <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup">
                      {([['Natural Science', T('Natural Science', 'የተፈጥሮ ሳይንስ')], ['Social Science', T('Social Science', 'የማህበራዊ ሳይንስ')]] as const).map(([k, label]) => (
                        <button
                          key={k} role="radio" aria-checked={allocationStream === k}
                          onClick={() => { setAllocationStream(k); setPreviewBuckets(null); }}
                          className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all cursor-pointer ${allocationStream === k ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-xs text-slate-500">
                  <b className="font-mono text-slate-900">
                    {registeredStudents.filter((r) => r.targetGrade === allocationGrade && (allocationKind === 'cte' || allocationGrade < 11 || r.stream === allocationStream)).length}
                  </b>{' '}
                  {T('registered students', 'የተመዘገቡ ተማሪዎች')}
                </span>
              </div>

              {allocationKind === 'academic' ? (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <span className={labelCls}>{T('Split classes by', 'ክፍሎችን የሚከፋፈሉት በ')}</span>
                    <div className="mb-2 inline-flex w-full gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                      {([['by-size', T('Class size', 'የክፍል ብዛት')], ['by-count', T('Number of classes', 'የክፍሎች ቁጥር')]] as const).map(([k, label]) => (
                        <button key={k} onClick={() => setAllocationMethod(k)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all cursor-pointer ${allocationMethod === k ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {allocationMethod === 'by-size' ? (
                      <input type="number" min={1} value={studentsPerSection} onChange={(e) => setStudentsPerSection(Math.max(1, Number(e.target.value) || 1))} className={`${inputCls} font-mono`} aria-label="Students per class" />
                    ) : (
                      <input type="number" min={1} value={numSectionsInput} onChange={(e) => setNumSectionsInput(Math.max(1, Number(e.target.value) || 1))} className={`${inputCls} font-mono`} aria-label="Number of classes" />
                    )}
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {allocationMethod === 'by-size' ? T('students in each class', 'በእያንዳንዱ ክፍል ያሉ ተማሪዎች') : T('classes to create', 'የሚፈጠሩ ክፍሎች')}
                    </span>
                  </div>
                  <div>
                    <label className={labelCls}>{T('How to mix students', 'ተማሪዎችን የማደባለቅ ዘዴ')}</label>
                    <select value={allocationMode} onChange={(e) => setAllocationMode(e.target.value as any)} className={inputCls}>
                      <option value="combined-smart">{T('Balanced: marks and gender (recommended)', 'ሚዛናዊ፡ ውጤትና ጾታ (የሚመከር)')}</option>
                      <option value="gender-balanced">{T('Equal boys and girls', 'እኩል ወንድና ሴት')}</option>
                      <option value="merit-balanced">{T('Even spread of marks', 'እኩል የውጤት ስርጭት')}</option>
                      <option value="random">{T('Random draw', 'በዕጣ')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{T('Seats per classroom', 'በአንድ ክፍል የመቀመጫ ብዛት')}</label>
                    <input type="number" min={1} value={targetCapacity} onChange={(e) => setTargetCapacity(Math.max(1, Number(e.target.value) || 1))} className={`${inputCls} font-mono`} />
                    <span className="mt-1 block text-[11px] text-slate-500">{T('Used to warn you about full rooms', 'ሙሉ ክፍሎችን ለማስጠንቀቅ')}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-slate-500">
                    {T(
                      'Students with the highest marks choose first. Each one gets their best-ranked track that still has a free seat. Set how many seats each track has.',
                      'ከፍተኛ ውጤት ያላቸው መጀመሪያ ይመርጣሉ። እያንዳንዱ ተማሪ ባዶ መቀመጫ ያለው ከፍተኛ ደረጃ የሰጠውን ሙያ ያገኛል። ለእያንዳንዱ ሙያ የመቀመጫ ብዛት ያስቀምጡ።'
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CTE_SPECIALIZATION_OPTIONS.map((o) => {
                      const firstChoice = registeredStudents.filter((r) => r.targetGrade === allocationGrade && choicesOf(r)[0] === o.labelEn).length;
                      return (
                        <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900">{lang === 'am' ? o.labelAm : o.labelEn}</div>
                            <div className="text-[11px] text-slate-500">
                              <b className="font-mono text-slate-700">{firstChoice}</b> {T('chose it first', 'በመጀመሪያ ምርጫ መርጠዋል')}
                            </div>
                          </div>
                          <label className="shrink-0 text-right">
                            <span className="block text-[11px] font-semibold text-slate-500">{T('Seats', 'መቀመጫ')}</span>
                            <input
                              type="number" min={1} value={cteCapacities[o.labelEn] ?? 40}
                              onChange={(e) => setCteCapacities((prev) => ({ ...prev, [o.labelEn]: Math.max(1, Number(e.target.value) || 1) }))}
                              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {allocationKind === 'academic' && classesHere.length > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={reshuffleAll}
                    onChange={(e) => { setReshuffleAll(e.target.checked); setPreviewBuckets(null); }}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600"
                  />
                  <span>
                    <b className="text-slate-800">{T('Start over', 'እንደገና ጀምር')}</b>{' '}
                    {T(
                      'Divide every student of this grade again. Classes with the same letter are replaced and their teachers are cleared. Leave this off to keep existing classes and only place students who are waiting.',
                      'የዚህን ክፍል ደረጃ ሁሉንም ተማሪዎች እንደገና ይከፋፍሉ። ተመሳሳይ ፊደል ያላቸው ክፍሎች ይተካሉ፤ መምህራንም ይጠረዛሉ። ነባር ክፍሎችን ለማቆየትና የሚጠብቁትን ብቻ ለመመደብ ይህን ባዶ ያድርጉት።'
                    )}
                  </span>
                </label>
              )}

              {allocationNotice && (
                <div role="alert" className="fade-up flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {allocationNotice}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={allocationKind === 'cte' ? handleGenerateCteSections : handleGenerateAllocation}
                  className="btn-academic flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  {allocationKind === 'cte' ? <Sparkles className="h-4 w-4 text-amber-300" /> : <Shuffle className="h-4 w-4 text-amber-300" />}
                  {allocationKind === 'cte' ? T('Place students by marks', 'ተማሪዎችን በውጤት መድብ') : T('Preview classes', 'ክፍሎችን ቅድመ እይታ')}
                </button>
              </div>
            </div>
          </div>

          {/* CLASSES & SEATS: change seats and add students after a class exists */}
          {allocationKind === 'academic' && classesHere.length > 0 && (
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 text-base font-black text-slate-900">
                    <Armchair className="h-5 w-5 text-emerald-700" />
                    {T('Classes and seats', 'ክፍሎችና መቀመጫዎች')} · {T('Grade', 'ክፍል')} {allocationGrade}
                    {allocationGrade >= 11 ? ` (${allocationStream === 'Natural Science' ? T('Natural Science', 'የተፈጥሮ ሳይንስ') : T('Social Science', 'የማህበራዊ ሳይንስ')})` : ''}
                  </h4>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                    {T(
                      'Change the seats of a class at any time, or add a waiting student by hand. When you press “Preview classes”, waiting students are moved into open seats first. Only students who do not fit are put into new classes.',
                      'የአንድ ክፍል መቀመጫ በማንኛውም ጊዜ ይቀይሩ፣ ወይም የሚጠብቅ ተማሪ በእጅ ይጨምሩ። “ክፍሎችን ቅድመ እይታ” ሲጫኑ የሚጠብቁ ተማሪዎች መጀመሪያ ባዶ መቀመጫ ወዳላቸው ክፍሎች ይገባሉ። የማይመጥኑት ብቻ ወደ አዲስ ክፍሎች ይገባሉ።'
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{waitingHere.length} {T('waiting', 'በመጠበቅ ላይ')}</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">{openSeatsHere} {T('open seats', 'ባዶ መቀመጫ')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillOpenSeats}
                    disabled={waitingHere.length === 0 || openSeatsHere === 0}
                    className="flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 text-amber-300" />
                    {T('Fill open seats now', 'ባዶ መቀመጫዎችን አሁን ሙላ')}
                  </button>
                </div>
              </div>

              {seatsNotice && (
                <div
                  role="status"
                  className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                    seatsNotice.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <span>{seatsNotice.text}</span>
                  <button type="button" onClick={() => setSeatsNotice(null)} aria-label="Dismiss" className="cursor-pointer opacity-60 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {classesHere.map((sec) => {
                  const fill = getSectionFill(sec, registeredStudents);
                  const draft = seatDrafts[sec.id];
                  const draftNum = draft === undefined ? fill.capacity : Math.floor(Number(draft));
                  const changed = draft !== undefined && draftNum !== fill.capacity;
                  const pct = Math.min(100, Math.round((fill.enrolled / fill.capacity) * 100));
                  const eligible = waitingHere.filter((r) => sectionAcceptsStudent(sec, r));
                  const full = fill.free <= 0;
                  return (
                    <div key={sec.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-lg font-black text-slate-900">{sec.section}</div>
                          <div className="text-[11px] text-slate-500">
                            {sec.roomNumber || '—'} · {fill.male} {T('boys', 'ወንድ')} / {fill.female} {T('girls', 'ሴት')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono text-lg font-black ${fill.enrolled > fill.capacity ? 'text-rose-600' : 'text-slate-900'}`}>
                            {fill.enrolled} / {fill.capacity}
                          </div>
                          <div className={`text-[11px] font-bold ${full ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {full ? T('Class is full', 'ክፍሉ ሞልቷል') : `${fill.free} ${T('seats free', 'ባዶ መቀመጫ')}`}
                          </div>
                        </div>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <div className={`h-full rounded-full ${full ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelCls} htmlFor={`seats-${sec.id}`}>{T('Seats in this class', 'የክፍሉ መቀመጫ')}</label>
                          <div className="flex gap-2">
                            <input
                              id={`seats-${sec.id}`}
                              type="number"
                              min={Math.max(1, fill.enrolled)}
                              value={draft ?? String(fill.capacity)}
                              onChange={(e) => setSeatDrafts((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSeats(sec); }}
                              className={`${inputCls} font-mono`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSeats(sec)}
                              disabled={!changed}
                              className="shrink-0 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            >
                              {T('Save', 'አስቀምጥ')}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={labelCls} htmlFor={`add-${sec.id}`}>{T('Add a waiting student', 'የሚጠብቅ ተማሪ ጨምር')}</label>
                          <div className="flex gap-2">
                            <select
                              id={`add-${sec.id}`}
                              value={addPick[sec.id] || ''}
                              onChange={(e) => setAddPick((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                              disabled={full || eligible.length === 0}
                              className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400`}
                            >
                              <option value="">
                                {full
                                  ? T('No seats free', 'ባዶ መቀመጫ የለም')
                                  : eligible.length === 0
                                  ? T('No one is waiting', 'የሚጠብቅ የለም')
                                  : T('Choose a student…', 'ተማሪ ይምረጡ…')}
                              </option>
                              {eligible.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.fullName} ({r.studentId})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAddStudentToClass(sec)}
                              disabled={!addPick[sec.id] || full}
                              aria-label={T('Add student', 'ተማሪ ጨምር')}
                              className="shrink-0 rounded-xl bg-slate-950 px-3 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTE results: who got which choice, and who is left without a seat */}
          {allocationKind === 'cte' && (previewBuckets || cteUnplaced.length > 0) && (
            <div className="fade-up space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="mr-2 font-display text-base font-bold text-slate-900">{T('How the choices worked out', 'ምርጫዎቹ እንዴት ተሳኩ')}</h4>
                {cteRankCounts.map((n, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {i + 1}{['st', 'nd', 'rd', 'th'][i]} {T('choice', 'ምርጫ')}: <b className="font-mono">{n}</b>
                  </span>
                ))}
              </div>
              {cteUnplaced.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-3 flex items-start gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {T(
                      `${cteUnplaced.length} student(s) have no seat: every track they chose is full. Raise a track's seats above, or place them by hand.`,
                      `${cteUnplaced.length} ተማሪ(ዎች) መቀመጫ አላገኙም፡ የመረጧቸው ሙያዎች በሙሉ ሞልተዋል። የመቀመጫ ብዛት ይጨምሩ ወይም በእጅ ይመድቧቸው።`
                    )}
                  </p>
                  <ul className="space-y-2">
                    {cteUnplaced.map((u) => (
                      <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-900">{u.fullName}</span>
                          <span className="ml-2 font-mono text-xs text-slate-500">{u.previousAverageScore ?? 0}%</span>
                        </span>
                        <select
                          defaultValue="" aria-label={`Place ${u.fullName}`}
                          onChange={(e) => e.target.value && handlePlaceUnplaced(u.id, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold cursor-pointer"
                        >
                          <option value="">{T('Place in…', 'መድብ ወደ…')}</option>
                          {CTE_SPECIALIZATION_OPTIONS.map((o) => (
                            <option key={o.id} value={o.labelEn}>{o.labelEn}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW SECTIONS GRID */}
          {previewBuckets && previewBuckets.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span>{T('Preview', 'ቅድመ እይታ')}: {previewBuckets.length} {T('classes', 'ክፍሎች')}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {allocationMode === 'combined-smart' ? 'Gender & Merit Optimized' : allocationMode}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Check each class. Use “Move” to put a student in a different class before you save.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>{T('Download rosters', 'ዝርዝሮችን አውርድ')}</span>
                  </button>

                  {hasCommittedCurrentPreview ? (
                    <button
                      type="button"
                      onClick={() => setShowCommitSuccessModal(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{lang === 'am' ? '✓ ክፍሎች ተመዝግበዋል (ዝርዝር እይ)' : '✓ Saved (view details)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCommitSections}
                      className="btn-animated px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                      <span>{lang === 'am' ? 'ክፍሎችን አፅድቅና መዝግብ' : 'Save these classes'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bucket Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {previewBuckets.map((bucket) => {
                  const filteredBucketStudents = previewSearchQuery
                    ? bucket.students.filter(
                        (s) =>
                          s.fullName.toLowerCase().includes(previewSearchQuery.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(previewSearchQuery.toLowerCase())
                      )
                    : bucket.students;

                  const isOverCapacity = bucket.students.length > (bucket.maxCapacity || targetCapacity);

                  return (
                    <div
                      key={bucket.sectionCode}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4 flex flex-col justify-between"
                    >
                      {/* Card Header */}
                      <div className="space-y-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 bg-gradient-to-r from-emerald-800 to-slate-900 text-amber-400 font-mono font-black text-sm rounded-xl">
                              {bucket.sectionCode}
                            </span>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">
                                {bucket.isCteSection ? <>Grade {allocationGrade} · {bucket.cteSpecialization}</> : <>Grade {allocationGrade} Section {bucket.sectionLetter}</>}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span>{bucket.roomNumber || 'Classroom 101'}</span>
                                <span>•</span>
                                <span className={isOverCapacity ? 'font-bold text-rose-600' : ''}>{bucket.students.length}/{bucket.maxCapacity || targetCapacity} seats{isOverCapacity ? ' (over the limit)' : ''}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-sm font-black block ${
                                isOverCapacity ? 'text-rose-600' : 'text-slate-900'
                              }`}
                            >
                              {bucket.students.length} / {bucket.maxCapacity || targetCapacity}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">
                              {isOverCapacity ? 'Capacity Alert' : 'Enrolled'}
                            </span>
                          </div>
                        </div>

                        {/* Merit & Gender Radar */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Gender Ratio</span>
                            <strong className="text-slate-900 font-bold">
                              {bucket.maleCount}M / {bucket.femaleCount}F
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Section Avg</span>
                            <strong className="text-emerald-800 font-bold">{bucket.averageScore}%</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Merit Tiers</span>
                            <span className="text-[10px] font-bold text-slate-700">
                              <span className="text-emerald-700">{bucket.highScorersCount || 0}H</span> /{' '}
                              <span className="text-amber-700">{bucket.mediumScorersCount || 0}M</span> /{' '}
                              <span className="text-slate-500">{bucket.supportScorersCount || 0}S</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Student list with interactive transfer dropdown */}
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-xs flex-1">
                        {filteredBucketStudents.map((st, idx) => (
                          <div
                            key={st.id}
                            className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 w-4">{idx + 1}.</span>
                              <div className="truncate">
                                <span className="font-semibold text-slate-900 block truncate">{st.fullName}</span>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <span className="font-mono">{st.studentId}</span>
                                  <span>•</span>
                                  <span>{st.gender === 'F' ? 'Female' : 'Male'}</span>
                                  <span>•</span>
                                  <span className="font-bold text-amber-700">{st.previousAverageScore}%</span>
                                  {(bucket.isCteSection ? st.cteSpecialization : st.cteSection && st.cteSpecialization) && (
                                    <>
                                      <span>•</span>
                                      <span className="font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                        {bucket.isCteSection ? (st.cteRank ? `${st.cteRank}${['st', 'nd', 'rd', 'th'][Math.min(st.cteRank, 4) - 1]} choice` : 'Placed by hand') : `CTE: ${st.cteSpecialization}`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Section Transfer Control */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              <span className="text-[10px] text-slate-400">{T('Move', 'አንቀሳቅስ')}:</span>
                              <select
                                value={bucket.sectionCode}
                                onChange={(e) => handleMoveStudent(st.id, e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-500"
                                aria-label="Transfer student to section"
                              >
                                {previewBuckets.map((b) => (
                                  <option key={b.sectionCode} value={b.sectionCode}>
                                    Section {b.sectionLetter} ({b.students.length} sts)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: TIMETABLE & TEACHER PERIOD CLASH PREVENTER
         ========================================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Instructions banner */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold text-sm block">
                {lang === 'am'
                  ? 'የመምህራን ክፍለ-ጊዜ ግጭት መቆጣጠሪያ (Period Conflict Prevention System)'
                  : 'Timetable Period Clash Prevention System Active'}
              </strong>
              <span>
                {lang === 'am'
                  ? 'አንድ መምህር በአንድ ክፍለ-ጊዜ በሁለት የተለያዩ ክፍሎች ላይ ከተመደበ ሲስተሙ ወዲያውኑ ቀይ የስህተት ማስጠንቀቂያ ይልካል፤ እንዳይመዘገብም ይከላከላል!'
                  : 'If an administrator assigns a teacher to two different sections during the same period slot, the system immediately flags a prominent conflict error and blocks clashing assignments.'}
              </span>
            </div>
          </div>

          {/* Section Selector */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {lang === 'am' ? 'የክፍለ-ጊዜ ሰሌዳ የሚዋቀርለት ክፍል ይምረጡ:' : 'Select Section to Configure Timetable:'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Total Active Sections in System: {sections.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedTimetableSection}
                onChange={(e) => setSelectedTimetableSection(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-slate-900 cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.section}>
                    Section {sec.section} ({sec.stream})
                  </option>
                ))}
              </select>

              {onNavigateToGrades && (
                <button
                  onClick={onNavigateToGrades}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
                >
                  View in Grades Page →
                </button>
              )}
            </div>
          </div>

          {/* WEEKLY TIMETABLE MATRIX */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto p-5">
            <div className="min-w-[760px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-800 text-amber-400 font-mono font-black rounded-xl text-xs">
                    {selectedTimetableSection}
                  </span>
                  <h4 className="font-black text-sm text-slate-900">
                    Weekly Timetable Matrix (Periods 1 to 7 • Mon to Fri)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click any period cell to assign or edit teacher & subject
                </span>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-black text-slate-700 border-b border-slate-200 pb-2 mb-2">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-500">Period / Time</div>
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="p-2 bg-slate-100 rounded-xl">
                    {d}
                  </div>
                ))}
              </div>

              {/* Periods Rows */}
              <div className="space-y-2">
                {PERIOD_TIMES.map((pt) => (
                  <div key={pt.period} className="grid grid-cols-6 gap-2 items-center">
                    {/* Period Label */}
                    <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                      <span className="font-black text-slate-900 text-xs block">Period {pt.period}</span>
                      <span className="text-[10px] text-slate-400 block">{pt.time}</span>
                    </div>

                    {/* Day Cells */}
                    {DAYS_OF_WEEK.map((day) => {
                      const slot = timetableSlots.find(
                        (s) =>
                          s.sectionCode === selectedTimetableSection &&
                          s.day === day &&
                          s.period === pt.period
                      );

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleOpenSlotModal(day, pt.period)}
                          className={`min-h-[64px] p-2 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            slot
                              ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950'
                              : 'bg-slate-50/50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-400'
                          }`}
                        >
                          {slot ? (
                            <>
                              <div className="font-extrabold text-[11px] text-slate-900 truncate">
                                {slot.subjectName}
                              </div>
                              <div className="text-[10px] font-bold text-emerald-800 truncate flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                                <span className="truncate">{slot.teacherName}</span>
                              </div>
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[10px] font-semibold text-slate-400">
                              + Empty Slot
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLOT TIMETABLE ASSIGNMENT MODAL WITH LIVE CLASH DETECTION
         ========================================================================= */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>Assign Teacher to Period ({selectedTimetableSection})</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  {slotDay} • Period {slotPeriod} ({PERIOD_TIMES.find((p) => p.period === slotPeriod)?.time})
                </span>
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE CONFLICT ERROR BANNER */}
            {clashError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-950 space-y-1.5 animate-shake">
                <div className="flex items-center gap-2 font-black text-rose-900">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{lang === 'am' ? 'የክፍለ-ጊዜ ግጭት ስህተት!' : 'TIMETABLE CLASH DETECTED!'}</span>
                </div>
                <p className="font-semibold">{clashError}</p>
                {clashErrorAmharic && (
                  <p className="text-[11px] text-rose-800">{clashErrorAmharic}</p>
                )}
                <div className="text-[10px] text-rose-700 pt-1 border-t border-rose-200">
                  💡 Fix: Choose a different teacher who is free at this period, or move this class to another time slot.
                </div>
              </div>
            )}

            {!clashError && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>
                  {lang === 'am'
                    ? 'መምህሩ በዚህ ክፍለ-ጊዜ ነፃ ናቸው፤ ምንም ዓይነት ግጭት አልተገኘም።'
                    : 'Teacher is free during this slot. No timetable conflict found.'}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveTimetableSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject to Teach:
                </label>
                <select
                  value={slotSubjectId}
                  onChange={(e) => setSlotSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="math">Mathematics (ሒሳብ)</option>
                  <option value="phys">Physics (ፊዚክስ)</option>
                  <option value="chem">Chemistry (ኬሚስትሪ)</option>
                  <option value="bio">Biology (ባዮሎጂ)</option>
                  <option value="eng">English Language (እንግሊዝኛ)</option>
                  <option value="amh">Amharic Language (አማርኛ)</option>
                  <option value="geo">Geography (ጂኦግራፊ)</option>
                  <option value="hist">History (ታሪክ)</option>
                  <option value="civ">Citizenship Education (ስነ-ዜጋ)</option>
                  <option value="ict">Information Tech / IT (ኢንፎርሜሽን ቴክኖሎጂ)</option>
                  <option value="pe">Physical Education (P.E. / ስፖርት)</option>
                  <option value="econ">Economics (ኢኮኖሚክስ)</option>
                  <option value="agri">Agriculture (ግብርና)</option>
                  <option value="cte">Career & Technical Education (CTE / የስራና ቴክኒክ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Teacher (መምህር):
                </label>
                <select
                  value={slotTeacherId}
                  onChange={(e) => {
                    const newTId = e.target.value;
                    setSlotTeacherId(newTId);
                    runLiveClashCheck(newTId, slotDay, slotPeriod);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject} - {t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingSlot ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slotDay, slotPeriod)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Clear Slot
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSlotModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(clashError)}
                    className={`btn-animated px-5 py-2 text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer ${
                      clashError
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Save Period Slot</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Immediate Commit Confirmation Modal */}
      {showCommitSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setShowCommitSuccessModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    2019 E.C. Academic Registry
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    {lang === 'am' ? 'ክፍሎች በተሳካ ሁኔታ ተመዝግበዋል!' : 'Sections Successfully Committed!'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-xs leading-relaxed space-y-2">
                <p className="font-bold">
                  {lang === 'am'
                    ? `የ2019 ዓ.ም. ${lastCommittedSectionsInfo?.count || previewBuckets?.length || 0} ክፍሎች ተፈጥረው ወደ ትምህርት ቤቱ ዋና ዳታቤዝ ተመዝግበዋል።`
                    : `Successfully recorded ${lastCommittedSectionsInfo?.count || previewBuckets?.length || 0} sections (${(lastCommittedSectionsInfo?.codes || previewBuckets?.map((b) => b.sectionCode) || []).join(', ')}) into the school active roster.`}
                </p>
                <p className="text-emerald-700 text-[11px]">
                  {lang === 'am'
                    ? 'የክፍል ድግግሞሽ (Duplicate Sections) መከላከያ ስርዓት ገብሯል፤ በአጋጣሚ ደጋግመው ቢጫኑም አላስፈላጊ ተመሳሳይ ክፍሎች አይፈጠሩም።'
                    : 'Section deduplication safety is active: pressing confirm multiple times will not create duplicate sections.'}
                </p>
              </div>

              {/* Created Sections List */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  {lang === 'am' ? 'የተመዘገቡ ክፍሎች ኮዶች' : 'Active Section Codes Registered'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(lastCommittedSectionsInfo?.codes || previewBuckets?.map((b) => b.sectionCode) || []).map((code) => (
                    <span
                      key={code}
                      className="px-3 py-1.5 bg-slate-900 text-amber-400 font-mono font-black text-xs rounded-xl shadow-xs border border-slate-700 flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Section {code}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Next Steps Guidance */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  {lang === 'am' ? 'ቀጣይ እርምጃዎች' : 'Next Recommended Actions'}
                </span>
                <p className="text-xs text-slate-600">
                  {lang === 'am'
                    ? '1. በ"ክፍሎችና ሴክሽኖች" ገጽ ላይ የክፍል መምህራንንና የትምህርት ዓይነት መምህራንን ይመድቡ።'
                    : '1. In "Classes & Sections", assign subject teachers and homeroom teachers.'}
                </p>
                <p className="text-xs text-slate-600">
                  {lang === 'am'
                    ? '2. በ"Timetable & Rooms" ታብ ላይ የክፍለ ጊዜያት ግጭት ሳይኖር የሰሌዳ ፕሮግራም ያዘጋጁ።'
                    : '2. In the "Timetable & Rooms" tab, arrange clash-free weekly period schedules.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-100">
                {onNavigateToGrades && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommitSuccessModal(false);
                      onNavigateToGrades();
                    }}
                    className="w-full sm:w-auto flex-1 btn-animated px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'am' ? 'ወደ ክፍሎች አስተዳደር ሂድ →' : 'View in Classes & Sections →'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCommitSuccessModal(false);
                    setActiveTab('timetable');
                  }}
                  className="w-full sm:w-auto btn-animated px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-emerald-950" />
                  <span>{lang === 'am' ? 'የሰሌዳ ፕሮግራም አዘጋጅ' : 'Schedule Timetable'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommitSuccessModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {lang === 'am' ? 'ዝጋ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
