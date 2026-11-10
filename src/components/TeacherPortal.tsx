import React, { useState } from 'react';
import { AttendanceTab } from './AttendanceTab';
import { useAttendance } from '../hooks/useAttendance';
import {
  Users,
  CheckCircle,
  Clock,
  Save,
  Search,
  BookOpen,
  Award,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  Download,
  LogOut,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Phone,
  MessageSquare,
  PlusCircle,
  GraduationCap,
  Sparkles,
  Layers,
  Star,
  Filter,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Settings2,
  SlidersHorizontal,
  Check,
  X,
  ChevronRight,
  Globe,
  Calendar
} from 'lucide-react';
import {
  Student,
  Teacher,
  GradeSection,
  STANDARD_GRADE_9_10_SUBJECTS,
  STANDARD_GRADE_11_12_NATURAL_SUBJECTS,
  STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
} from '../data/schoolData';
import { calculateTotalScore, getEthiopianLetterGrade } from '../utils/gradeCalculations';
import {
  getSectionsAssignedToTeacher,
  getTeacherRolesForSection,
  getStudentsForSection
} from '../utils/sectionUtils';
import { DualDate } from './DualDate';
import { academicYearLabel, addDaysISO, toLocalISO, todayISO } from '../utils/ethiopianCalendar';

export interface AssessmentColumn {
  id: string;
  name: string;
  maxScore: number;
  isBonus?: boolean;
}

export function getRecentSchoolDays(count: number = 12): string[] {
  const days: string[] = [];
  const current = new Date();
  let checked = 0;
  while (days.length < count && checked < 30) {
    const d = new Date(current);
    d.setDate(current.getDate() - checked);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.unshift(toLocalISO(d));
    }
    checked++;
  }
  return days;
}

export const formatMatrixDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { month: '', day: '', weekday: '', full: dateStr };
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'narrow' });
  return { month, day: String(day), weekday, full: `${month} ${day}` };
};

export const DEFAULT_ASSESSMENT_COLUMNS: AssessmentColumn[] = [
  { id: 'quiz1', name: 'Quiz / Test', maxScore: 10, isBonus: false },
  { id: 'assignment', name: 'Assignment / Practical', maxScore: 20, isBonus: false },
  { id: 'mid', name: 'Midterm Exam', maxScore: 20, isBonus: false },
  { id: 'final', name: 'Final Exam', maxScore: 50, isBonus: false }
];

interface TeacherPortalProps {
  students: Student[];
  onUpdateStudents: (updated: Student[] | ((prev: Student[]) => Student[])) => void;
  teachers: Teacher[];
  sections?: GradeSection[];
  lang: 'en' | 'am';
  initialSection?: string;
  initialSubjectId?: string;
  activeTeacherUser?: Teacher | null;
  onSignOutTeacher?: () => void;
  onSignInTeacher?: (teacher: Teacher) => void;
  onNavigateHome?: () => void;
}

interface ClassAnnouncement {
  id: string;
  section: string;
  title: string;
  content: string;
  date: string;
  dueDate?: string;
}

/** Spreadsheet-style score cell: edits stay local until Enter/blur, then save once.
 *  Enter / ↓ moves down the column, ↑ moves up, Esc reverts. Values over the max are flagged live. */
const ScoreCell: React.FC<{
  value: number; max: number; isBonus?: boolean; row: number; col: number; label: string;
  onCommit: (n: number) => void;
}> = ({ value, max, isBonus, row, col, label, onCommit }) => {
  const show = (v: number) => (v === 0 ? '' : String(v));
  const [draft, setDraft] = React.useState<string>(show(value));
  const focused = React.useRef(false);
  React.useEffect(() => { if (!focused.current) setDraft(show(value)); }, [value]);

  const num = draft === '' ? 0 : Number(draft);
  const invalid = draft !== '' && (isNaN(num) || num > max);
  const commit = () => {
    focused.current = false;
    if (draft === '') { if (value !== 0) onCommit(0); return; }
    if (isNaN(num)) { setDraft(show(value)); return; }
    const c = Math.max(0, Math.min(max, num));
    setDraft(show(c));
    if (c !== value) onCommit(c);
  };
  const move = (d: number) =>
    (document.querySelector(`[data-cell="${row + d}:${col}"]`) as HTMLInputElement | null)?.focus();

  return (
    <input
      data-cell={`${row}:${col}`}
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder="–"
      aria-label={label}
      aria-invalid={invalid}
      title={invalid ? `Maximum is ${max}` : `Out of ${max}${isBonus ? ' (bonus)' : ''}`}
      onFocus={(e) => { focused.current = true; e.currentTarget.select(); }}
      onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setDraft(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); commit(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); commit(); move(-1); }
        else if (e.key === 'Escape') { setDraft(show(value)); e.currentTarget.blur(); }
      }}
      className={`w-[68px] h-9 text-center font-mono text-sm rounded-lg border outline-none transition-colors ${
        invalid
          ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
          : isBonus
          ? 'border-amber-300 bg-amber-50 text-amber-900 font-bold focus:ring-2 focus:ring-amber-300'
          : draft === ''
          ? 'border-dashed border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200'
          : 'border-slate-200 bg-white text-slate-900 font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
      }`}
    />
  );
};

const TeacherPortalInner: React.FC<TeacherPortalProps> = ({
  students,
  onUpdateStudents,
  teachers,
  sections = [],
  lang,
  initialSection = '9A',
  initialSubjectId = 'math',
  activeTeacherUser,
  onSignOutTeacher,
  onSignInTeacher,
  onNavigateHome
}) => {
  // Login Form States (used when activeTeacherUser is null)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signInMode, setSignInMode] = useState<'roster' | 'form'>('roster');
  const [selectedTeacherPrompt, setSelectedTeacherPrompt] = useState<Teacher | null>(null);
  const [promptPasscode, setPromptPasscode] = useState('');

  // Dynamically derive assigned sections from sections array and teacher profile
  const assignedSections = React.useMemo(() => {
    if (!activeTeacherUser) return [];
    return getSectionsAssignedToTeacher(activeTeacherUser, sections);
  }, [activeTeacherUser, sections]);

  // Class Management States - null indicates teacher is on the Sections Hub
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'marks' | 'attendance' | 'roster' | 'notices'>('marks');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Customizable Assessment Columns state (teachers can add, edit, change max points and bonus)
  const [assessmentColumns, setAssessmentColumns] = useState<AssessmentColumn[]>(DEFAULT_ASSESSMENT_COLUMNS);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colNameInput, setColNameInput] = useState('');
  const [colMaxInput, setColMaxInput] = useState<number>(10);
  const [colBonusInput, setColBonusInput] = useState(false);

  // Class Announcements state
  const [classNotices, setClassNotices] = useState<ClassAnnouncement[]>([
    {
      id: 'n1',
      section: '9A',
      title: 'Chapter 4 Quiz & Homework Submission',
      content: 'Complete problems 1 to 15 on page 84 of the national textbook before Wednesday.',
      date: addDaysISO(todayISO(), -2),
      dueDate: addDaysISO(todayISO(), 0)
    },
    {
      id: 'n2',
      section: '9A',
      title: 'Science Lab Preparation',
      content: 'Bring lab notebooks and protective coats for Thursday practical chemistry demonstration.',
      date: addDaysISO(todayISO(), -4),
      dueDate: addDaysISO(todayISO(), 1)
    }
  ]);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeDueDate, setNewNoticeDueDate] = useState('');
  const [showNewNoticeForm, setShowNewNoticeForm] = useState(false);

  // Load custom columns whenever section, subject, or semester changes
  React.useEffect(() => {
    if (selectedSection && selectedSubjectId) {
      const storageKey = `hmm_teacher_assessment_cols_${selectedSection}_${selectedSubjectId}_sem${selectedSemester}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssessmentColumns(parsed);
            return;
          }
        }
      } catch {}
      setAssessmentColumns(DEFAULT_ASSESSMENT_COLUMNS);
    }
  }, [selectedSection, selectedSubjectId, selectedSemester]);

  const saveAssessmentColumns = (newCols: AssessmentColumn[]) => {
    setAssessmentColumns(newCols);
    if (selectedSection && selectedSubjectId) {
      const storageKey = `hmm_teacher_assessment_cols_${selectedSection}_${selectedSubjectId}_sem${selectedSemester}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newCols));
      } catch {}
    }
  };

  const handleOpenAddColumnModal = () => {
    setEditingColumnId(null);
    setColNameInput('');
    setColMaxInput(10);
    setColBonusInput(false);
    setIsColumnModalOpen(true);
  };

  const handleOpenEditColumnModal = (col: AssessmentColumn) => {
    setEditingColumnId(col.id);
    setColNameInput(col.name);
    setColMaxInput(col.maxScore);
    setColBonusInput(Boolean(col.isBonus));
    setIsColumnModalOpen(true);
  };

  const handleSaveColumnModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = colNameInput.trim() || 'Assessment Component';
    const cleanMax = Math.max(1, Number(colMaxInput) || 10);

    if (editingColumnId) {
      const updated = assessmentColumns.map((c) =>
        c.id === editingColumnId ? { ...c, name: cleanName, maxScore: cleanMax, isBonus: colBonusInput } : c
      );
      saveAssessmentColumns(updated);
      setSaveSuccessMsg(`Column "${cleanName}" updated successfully!`);
    } else {
      const newCol: AssessmentColumn = {
        id: `col_${Date.now()}`,
        name: cleanName,
        maxScore: cleanMax,
        isBonus: colBonusInput
      };
      saveAssessmentColumns([...assessmentColumns, newCol]);
      setSaveSuccessMsg(`New assessment column "${cleanName}" (${cleanMax} pts) added!`);
    }

    setIsColumnModalOpen(false);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleDeleteColumn = (colId: string) => {
    if (assessmentColumns.length <= 1) {
      setSaveSuccessMsg('At least one assessment column must be maintained.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      return;
    }
    const target = assessmentColumns.find((c) => c.id === colId);
    const updated = assessmentColumns.filter((c) => c.id !== colId);
    saveAssessmentColumns(updated);
    setSaveSuccessMsg(`Column "${target?.name || ''}" removed successfully.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleEnterSection = (
    sectionCode: string,
    initialTab: 'marks' | 'attendance' | 'roster' | 'notices' = 'marks'
  ) => {
    // A teacher can only open sections that are assigned to them
    if (!assignedSections.some((a) => a.trim().toUpperCase() === sectionCode.trim().toUpperCase())) return;
    setSelectedSection(sectionCode);
    setActiveTab(initialTab);
    const targetSec = sections.find((s) => (s.section || '').toUpperCase() === sectionCode.toUpperCase());
    if (targetSec && activeTeacherUser) {
      const roles = getTeacherRolesForSection(activeTeacherUser, targetSec);
      if (roles.subjects.length > 0) {
        const matchedSubObj = targetSec.subjectAssignments?.find(
          (sa) => sa.teacherId === activeTeacherUser.id || sa.teacherName === activeTeacherUser.name
        );
        if (matchedSubObj) {
          setSelectedSubjectId(matchedSubObj.subjectId);
        }
      }
    }
  };

  // Sync subject when active teacher changes
  React.useEffect(() => {
    if (activeTeacherUser) {
      const subj = (activeTeacherUser.subject || '').toLowerCase();
      if (subj.includes('math')) setSelectedSubjectId('math');
      else if (subj.includes('phys')) setSelectedSubjectId('phys');
      else if (subj.includes('chem')) setSelectedSubjectId('chem');
      else if (subj.includes('bio')) setSelectedSubjectId('bio');
      else if (subj.includes('eng')) setSelectedSubjectId('eng');
      else if (subj.includes('amh')) setSelectedSubjectId('amh');
      else if (subj.includes('geo')) setSelectedSubjectId('geo');
      else if (subj.includes('hist')) setSelectedSubjectId('hist');
      else if (subj.includes('civ')) setSelectedSubjectId('civ');
      else if (subj.includes('it') || subj.includes('ict')) setSelectedSubjectId('it');
      else if (subj.includes('econ')) setSelectedSubjectId('econ');
      else if (subj.includes('pe') || subj.includes('sport')) setSelectedSubjectId('pe');
    }
  }, [activeTeacherUser, sections]);

  const verifyTeacherCredentials = (teacher: Teacher, pass: string): boolean => {
    const cleanPass = pass.trim();
    if (!cleanPass) return false;
    const defaultStaffPass = 'debberhan2017';
    const surnamePass = `${teacher.name.toLowerCase().split(' ')[0]}2017!`;
    const specificPass = (teacher as any).password;
    return cleanPass === defaultStaffPass || cleanPass === surnamePass || cleanPass === specificPass;
  };

  // Handle Manual Credentials Login
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const query = loginEmail.trim().toLowerCase();
    const matched = teachers.find(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.email && t.email.toLowerCase() === query) ||
        t.id.toLowerCase() === query
    );

    if (!matched) {
      setLoginError(
        lang === 'am'
          ? 'የመምህሩ ስም ወይም ኢሜይል አልተገኘም። እባክዎ በትክክል መጻፍዎን ያረጋግጡ ወይም ከዝርዝሩ ይምረጡ።'
          : 'Faculty record not found. Please verify your credentials or select your name from the staff roster.'
      );
      return;
    }

    if (verifyTeacherCredentials(matched, loginPassword)) {
      if (onSignInTeacher) onSignInTeacher(matched);
    } else {
      setLoginError(
        lang === 'am'
          ? 'የተሳሳተ የመምህር የይለፍ ቃል! (ትክክለኛውን የይለፍ ቃል ያስገቡ፡ debberhan2017)'
          : 'Incorrect staff passcode. Access denied. (Staff key: debberhan2017)'
      );
    }
  };

  const handlePromptLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherPrompt) return;

    if (verifyTeacherCredentials(selectedTeacherPrompt, promptPasscode)) {
      if (onSignInTeacher) onSignInTeacher(selectedTeacherPrompt);
      setSelectedTeacherPrompt(null);
      setPromptPasscode('');
    } else {
      setLoginError(
        lang === 'am'
          ? 'የተሳሳተ የመምህር የይለፍ ቃል! (ትክክለኛውን የይለፍ ቃል ያስገቡ፡ debberhan2017)'
          : 'Incorrect passcode for this faculty account. (Staff key: debberhan2017)'
      );
    }
  };

  // ==========================================
  // VIEW 1: DEDICATED TEACHER SIGN-IN PAGE
  // ==========================================
  if (!activeTeacherUser) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 bg-[#070b16] text-white border-b border-slate-800 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-400/30 shadow-md mb-3">
              <span className="font-bold text-lg text-amber-300">HMM</span>
            </div>
            <div className="text-xs text-emerald-400 font-medium mb-1">
              Debre Berhan, Ethiopia · Academic Year {academicYearLabel('en')}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {lang === 'am' ? 'የመምህራን መግቢያ እና የክፍል መቆጣጠሪያ' : 'Teacher sign in'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              {lang === 'am'
                ? 'የተማሪዎችን የፈተና እና ተከታታይ ምዘና (Continuous Assessment) ውጤት ለመመዝገብ፣ አቴንዳንስ ለመከታተል እና የክፍልዎን ተማሪዎች ለማስተዳደር ይግቡ።'
                : 'Sign in to record continuous assessments, track daily student attendance, and manage your assigned classes.'}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {/* If a teacher was selected from roster, prompt for passcode */}
            {selectedTeacherPrompt ? (
              <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 font-bold text-sm flex items-center justify-center">
                      {selectedTeacherPrompt.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-base">{selectedTeacherPrompt.name}</div>
                      <div className="text-xs text-emerald-800 font-bold">{selectedTeacherPrompt.subject} Department</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacherPrompt(null);
                      setPromptPasscode('');
                      setLoginError('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Select Another
                  </button>
                </div>

                <form onSubmit={handlePromptLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Enter Security Key / Passcode for {selectedTeacherPrompt.name.split(' ')[0]}:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        autoFocus
                        required
                        placeholder="Enter faculty password..."
                        value={promptPasscode}
                        onChange={(e) => setPromptPasscode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <span>Institutional Staff Key:</span>
                      <code className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        debberhan2017
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherPrompt(null);
                        setPromptPasscode('');
                        setLoginError('');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span>Unlock Faculty Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* Mode Switcher */}
                <div className="flex items-center gap-1 mb-6 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSignInMode('roster');
                      setLoginError('');
                    }}
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      signInMode === 'roster'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'am' ? 'የመምህራን ዝርዝር' : 'Faculty Roster'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignInMode('form');
                      setLoginError('');
                    }}
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      signInMode === 'form'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'am' ? 'በኢሜይል / መለያ ግባ' : 'Email & Passcode'}
                  </button>
                </div>

                {signInMode === 'roster' ? (
                  /* Option 1: Roster with Password Challenge */
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Select Your Faculty Profile ({teachers.length} Instructors):</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">Protected Roster</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                      {teachers.map((teacher) => {
                        const initials = teacher.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'ED';

                        return (
                          <div
                            key={teacher.id}
                            onClick={() => {
                              setSelectedTeacherPrompt(teacher);
                              setLoginError('');
                              setPromptPasscode('');
                            }}
                            className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-slate-50 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-700">
                                    {teacher.name}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {teacher.subject}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {teacher.department} • Assigned: {getSectionsAssignedToTeacher(teacher, sections).join(', ') || 'Faculty'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors shrink-0">
                              <Lock className="w-3 h-3 text-slate-400 group-hover:text-amber-300" />
                              <span>Sign In</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Option 2: Credentials Form */
                  <form onSubmit={handleManualLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Teacher Email or Full Name:
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. daniel.girma@hailemariammamo.edu.et or Daniel Girma"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Staff Passcode:
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          placeholder="Enter teacher password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>Staff Key:</span>
                        <code className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          debberhan2017
                        </code>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Lock className="w-4 h-4 text-amber-300" />
                      <span>Authenticate & Access Grade Desk</span>
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOGGED-IN TEACHER CLASS MANAGEMENT
  // ==========================================

  // Filter students for the active class section accurately (returns empty array when on sections hub)
  const sectionStudents = React.useMemo(() => {
    if (!selectedSection) return [];
    return getStudentsForSection(selectedSection, sections, students);
  }, [selectedSection, sections, students]);

  // A teacher only ever sees the sections assigned to them (no school-wide fallback)
  const visibleSections = React.useMemo(() => {
    const seen = new Set<string>();
    return assignedSections.filter((code) => {
      const key = code.trim().toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [assignedSections]);

  // Numbers for the overview strip on the sections hub
  const { hubTotalStudents, hubSubjectCount, hubHomeroomCount } = React.useMemo(() => {
    let total = 0;
    let homerooms = 0;
    const subjects = new Set<string>();
    visibleSections.forEach((code) => {
      const sec = sections.find((x) => (x.section || '').toUpperCase() === code.toUpperCase());
      total += getStudentsForSection(code, sections, students).length;
      if (sec && activeTeacherUser) {
        const r = getTeacherRolesForSection(activeTeacherUser, sec);
        if (r.isHomeroom) homerooms += 1;
        r.subjects.forEach((x) => subjects.add(x));
      }
    });
    if (subjects.size === 0 && activeTeacherUser?.subject) subjects.add(activeTeacherUser.subject);
    return { hubTotalStudents: total, hubSubjectCount: subjects.size, hubHomeroomCount: homerooms };
  }, [visibleSections, sections, students, activeTeacherUser]);

  // If assignments change while a section is open (admin edit / refresh), leave a section that is no longer theirs
  React.useEffect(() => {
    if (
      selectedSection &&
      !visibleSections.some((c) => c.toUpperCase() === selectedSection.toUpperCase())
    ) {
      setSelectedSection(null);
    }
  }, [selectedSection, visibleSections]);

  // Current active section object and subjects
  const currentSectionObj = selectedSection
    ? sections.find((s) => (s.section || '').toUpperCase() === selectedSection.toUpperCase())
    : undefined;

  const availableSubjects = React.useMemo(() => {
    if (currentSectionObj?.subjectAssignments && currentSectionObj.subjectAssignments.length > 0) {
      // Subject teachers only get the subjects they teach in this section (homeroom-only teachers see all)
      const mine = currentSectionObj.subjectAssignments.filter(
        (sa) =>
          activeTeacherUser &&
          ((sa.teacherId && sa.teacherId === activeTeacherUser.id) ||
            (sa.teacherName || '').trim().toLowerCase() === activeTeacherUser.name.trim().toLowerCase())
      );
      return mine.length > 0 ? mine : currentSectionObj.subjectAssignments;
    }
    const gr = currentSectionObj?.grade || (selectedSection ? parseInt(selectedSection.replace(/\D/g, ''), 10) : 9) || 9;
    if (gr >= 11) {
      return currentSectionObj?.stream === 'Social Science' || (selectedSection && selectedSection.includes('-Soc'))
        ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
        : STANDARD_GRADE_11_12_NATURAL_SUBJECTS;
    }
    return STANDARD_GRADE_9_10_SUBJECTS;
  }, [currentSectionObj, selectedSection, activeTeacherUser]);

  React.useEffect(() => {
    if (
      selectedSection &&
      availableSubjects.length > 0 &&
      !availableSubjects.some(
        (x) =>
          x.subjectId === selectedSubjectId ||
          (selectedSubjectId === 'it' && x.subjectId === 'ict') ||
          (selectedSubjectId === 'ict' && x.subjectId === 'it')
      )
    ) {
      setSelectedSubjectId(availableSubjects[0].subjectId);
    }
  }, [selectedSection, availableSubjects, selectedSubjectId]);

  const currentSubjectObj = availableSubjects.find(
    (s) =>
      s.subjectId === selectedSubjectId ||
      (selectedSubjectId === 'it' && s.subjectId === 'ict') ||
      (selectedSubjectId === 'ict' && s.subjectId === 'it')
  ) || availableSubjects[0];

  const filteredStudents = sectionStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.fullNameAmharic && s.fullNameAmharic.includes(searchQuery))
  );

  // Helper to fetch student score for a custom assessment column
  const getStudentColumnScore = (student: Student, colId: string): number => {
    const semData = student.semesters.find((s) => s.semester === selectedSemester) || student.semesters[0];
    const subject = semData?.subjects.find(
      (s) =>
        s.subjectId === selectedSubjectId ||
        (selectedSubjectId === 'it' && s.subjectId === 'ict') ||
        (selectedSubjectId === 'ict' && s.subjectId === 'it')
    );

    // 1) The marks saved with the student (also stored in the database)
    const customMap = (subject as any)?.customAssessments;
    if (customMap && typeof customMap[colId] === 'number') {
      return customMap[colId];
    }

    // 2) Backup of ALL columns kept on this device (covers a database without the custom_assessments column)
    try {
      const snap = localStorage.getItem(`hmm_marks_${student.id}_sem${selectedSemester}_${selectedSubjectId}`);
      if (snap) {
        const parsed = JSON.parse(snap);
        if (parsed && typeof parsed[colId] === 'number') return parsed[colId];
      }
    } catch {}

    // 3) Older single-cell backup
    try {
      const storageKey = `hmm_score_${student.id}_sem${selectedSemester}_${selectedSubjectId}_${colId}`;
      const raw = localStorage.getItem(storageKey);
      if (raw !== null && !isNaN(Number(raw))) {
        return Number(raw);
      }
    } catch {}

    // 4) First time only (nothing typed yet): estimate from the old summary totals. Saved the moment any cell is edited.
    if (colId === 'quiz1') {
      return Math.min(10, Math.round((subject?.continuousAssessment ?? 0) * (10 / 30)));
    }
    if (colId === 'assignment') {
      return Math.min(20, Math.round((subject?.continuousAssessment ?? 0) * (20 / 30)));
    }
    if (colId === 'mid') {
      return subject?.midExam ?? 0;
    }
    if (colId === 'final') {
      return subject?.finalExam ?? 0;
    }

    return 0;
  };

  // Dynamically compute total, letter grade, and pass/fail for a student across all active columns
  const calculateStudentCustomSummary = (student: Student) => {
    const regularCols = assessmentColumns.filter((c) => !c.isBonus);
    const bonusCols = assessmentColumns.filter((c) => c.isBonus);
    const maxPossible = regularCols.reduce((sum, c) => sum + c.maxScore, 0) || 100;

    const regularEarned = regularCols.reduce((sum, c) => sum + getStudentColumnScore(student, c.id), 0);
    const bonusEarned = bonusCols.reduce((sum, c) => sum + getStudentColumnScore(student, c.id), 0);
    const totalEarned = regularEarned + bonusEarned;

    const percentage = maxPossible > 0 ? (totalEarned / maxPossible) * 100 : totalEarned;
    const roundedPct = Math.round(percentage);
    const letter = getEthiopianLetterGrade(roundedPct);
    const status = percentage >= 50 ? 'Pass' : 'Fail';

    return {
      totalEarned,
      maxPossible,
      percentage: Math.round(percentage * 10) / 10,
      letter,
      status
    };
  };

  // Customizable Mark Score Change Handler
  const handleCustomScoreChange = (studentId: string, colId: string, rawVal: number) => {
    const col = assessmentColumns.find((c) => c.id === colId);
    const maxAllowed = col ? col.maxScore : 100;
    const clamped = Math.max(0, Math.min(maxAllowed, Number(rawVal) || 0));

    try {
      const storageKey = `hmm_score_${studentId}_sem${selectedSemester}_${selectedSubjectId}_${colId}`;
      localStorage.setItem(storageKey, String(clamped));
    } catch {}

    // Functional update: always builds on the latest student list, so two quick edits can never overwrite each other.
    onUpdateStudents((prev) => prev.map((st) => {
      if (st.id !== studentId) return st;

      const semesterData = st.semesters.find((sem) => sem.semester === selectedSemester) || st.semesters[0];
      const existingSubject = semesterData?.subjects.find(
        (s) =>
          s.subjectId === selectedSubjectId ||
          (selectedSubjectId === 'it' && s.subjectId === 'ict') ||
          (selectedSubjectId === 'ict' && s.subjectId === 'it')
      );

      // FIX: freeze what every column currently shows BEFORE the summary totals are rewritten below.
      // Columns that were never typed into read their value back from those totals, so without this
      // snapshot editing one cell silently changed the others.
      const existingCustom = (existingSubject as any)?.customAssessments || {};
      const frozen: Record<string, number> = {};
      assessmentColumns.forEach((c) => { frozen[c.id] = getStudentColumnScore(st, c.id); });
      const updatedCustom: Record<string, number> = { ...existingCustom, ...frozen, [colId]: clamped };
      try {
        localStorage.setItem(`hmm_marks_${st.id}_sem${selectedSemester}_${selectedSubjectId}`, JSON.stringify(updatedCustom));
      } catch {}

      const regularCols = assessmentColumns.filter((c) => !c.isBonus);
      const bonusCols = assessmentColumns.filter((c) => c.isBonus);
      const maxPossible = regularCols.reduce((sum, c) => sum + c.maxScore, 0) || 100;

      const totalEarned = [...regularCols, ...bonusCols].reduce((sum, c) => sum + (updatedCustom[c.id] ?? 0), 0);
      const percentage = maxPossible > 0 ? (totalEarned / maxPossible) * 100 : totalEarned;

      const continuousScore = Math.min(30, Math.round((percentage * 0.3) * 10) / 10);
      const midScore = Math.min(20, Math.round((percentage * 0.2) * 10) / 10);
      const finalScore = Math.min(50, Math.round((percentage * 0.5) * 10) / 10);

      let newSubjects;
      if (existingSubject) {
        newSubjects = semesterData.subjects.map((sub) =>
          sub.subjectId === existingSubject.subjectId
            ? {
                ...sub,
                continuousAssessment: continuousScore,
                midExam: midScore,
                finalExam: finalScore,
                customAssessments: updatedCustom
              }
            : sub
        );
      } else {
        newSubjects = [
          ...(semesterData?.subjects || []),
          {
            subjectId: selectedSubjectId,
            subjectName: currentSubjectObj?.subjectName || selectedSubjectId.toUpperCase(),
            subjectAmharic: currentSubjectObj?.subjectAmharic || selectedSubjectId.toUpperCase(),
            teacherName: activeTeacherUser?.name || 'Subject Teacher',
            continuousAssessment: continuousScore,
            midExam: midScore,
            finalExam: finalScore,
            customAssessments: updatedCustom
          }
        ];
      }

      const hasSemester = st.semesters.some((sem) => sem.semester === selectedSemester);
      const updatedSemesters = hasSemester
        ? st.semesters.map((sem) => (sem.semester === selectedSemester ? { ...sem, subjects: newSubjects } : sem))
        : [...st.semesters, { semester: selectedSemester, subjects: newSubjects }];

      return { ...st, semesters: updatedSemesters };
    }));
  };

  // Attendance: saved on this device first, then synced to Supabase (see hooks/useAttendance.ts)
  const att = useAttendance(selectedSection, activeTeacherUser?.name);

  const handleSaveMarks = () => {
    setSaveSuccessMsg(`Marks successfully saved for Section ${selectedSection || ''} (${selectedSubjectId.toUpperCase()})!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Export to CSV Functionality with dynamic customizable assessment columns
  const handleExportCSV = () => {
    const regularCols = assessmentColumns.filter((c) => !c.isBonus);
    const maxPossible = regularCols.reduce((sum, c) => sum + c.maxScore, 0) || 100;

    const headers = [
      '#',
      'Student ID',
      'Full Name',
      'Amharic Name',
      'Gender',
      'Grade',
      'Section',
      'CTE Elective',
      ...assessmentColumns.map((c) => `"${c.name} (${c.maxScore}${c.isBonus ? ' Bonus' : ''})"`),
      `"Total (${maxPossible})"`,
      'Percentage (%)',
      'Letter Grade'
    ];

    const rows = filteredStudents.map((s, idx) => {
      const summary = calculateStudentCustomSummary(s);
      const colScores = assessmentColumns.map((c) => getStudentColumnScore(s, c.id));

      return [
        idx + 1,
        `"${s.studentId}"`,
        `"${s.fullName}"`,
        `"${s.fullNameAmharic || ''}"`,
        `"${s.gender || 'M'}"`,
        s.grade,
        `"${s.section}"`,
        `"${s.cteSpecialization || 'None'}"`,
        ...colScores,
        summary.totalEarned,
        summary.percentage,
        `"${summary.letter.letter}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HMM_${selectedSection || 'Class'}_${selectedSubjectId.toUpperCase()}_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Post Class Notice Handler
  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;

    const notice: ClassAnnouncement = {
      id: `notice-${Date.now()}`,
      section: selectedSection || '',
      title: newNoticeTitle.trim(),
      content: newNoticeContent.trim(),
      date: todayISO(),
      dueDate: newNoticeDueDate || undefined
    };

    setClassNotices([notice, ...classNotices]);
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setNewNoticeDueDate('');
    setShowNewNoticeForm(false);
    setSaveSuccessMsg(`Announcement posted to Section ${selectedSection}!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Stats
  const marksList = sectionStudents.map((s) => {
    const semData = s.semesters.find((sem) => sem.semester === selectedSemester) || s.semesters[0];
    const subj = semData?.subjects.find((sub) => sub.subjectId === selectedSubjectId);
    return subj ? calculateTotalScore(subj.continuousAssessment, subj.midExam, subj.finalExam) : 0;
  });

  const classAvg = marksList.length
    ? Math.round((marksList.reduce((a, b) => a + b, 0) / marksList.length) * 10) / 10
    : 0;
  const passCount = marksList.filter((m) => m >= 50).length;
  const passRate = marksList.length ? Math.round((passCount / marksList.length) * 100) : 0;

  const todayMarks = sectionStudents.map((st) => att.map[st.id]?.[att.today]?.status).filter(Boolean);
  const attendanceRate = todayMarks.length
    ? `${Math.round((todayMarks.filter((x) => x === 'Present' || x === 'Late').length / todayMarks.length) * 100)}%`
    : '–';

  // RENDER 1: SECTIONS HUB (Shown when teacher first logs in; no student list is shown yet)
  if (!selectedSection) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Teacher Header Banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-lg border border-slate-700 shadow-sm shrink-0">
                {activeTeacherUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{activeTeacherUser.name}</h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {activeTeacherUser.subject}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTeacherUser.department} • {activeTeacherUser.email || 'Faculty of Secondary Sciences'}
                </p>
              </div>
            </div>

            {/* Action buttons & Sign Out */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500 hidden sm:block mr-1">
                Role: <strong className="text-slate-800">Faculty Instructor</strong>
              </div>
              {onNavigateHome && (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="View Public School Website"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Public Site</span>
                </button>
              )}
              {onSignOutTeacher && (
                <button
                  onClick={onSignOutTeacher}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Sign out of Teacher Desk"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>

          {/* Welcome Title & Filter Toggle */}
          <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'am' ? 'የተመደቡ ክፍሎች ዝርዝር' : 'My Assigned Classes & Sections'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'am'
                  ? 'ለመመዝገብ ወይም ማርክ ለማስገባት ከታች ካሉት ክፍሎች አንዱን ይምረጡ'
                  : 'Select an assigned class section below to enter its workspace, record assessment marks, or manage attendance.'}
              </p>
            </div>

          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: lang === 'am' ? 'የተመደቡ ክፍሎች' : 'My Sections', value: visibleSections.length, icon: Layers, tone: 'text-emerald-700 bg-emerald-50' },
            { label: lang === 'am' ? 'ጠቅላላ ተማሪዎች' : 'Total Students', value: hubTotalStudents, icon: Users, tone: 'text-sky-700 bg-sky-50' },
            { label: lang === 'am' ? 'የምሰጣቸው ትምህርቶች' : 'Subjects Taught', value: hubSubjectCount, icon: BookOpen, tone: 'text-violet-700 bg-violet-50' },
            { label: lang === 'am' ? 'የክፍል ኃላፊነት' : 'Homeroom Classes', value: hubHomeroomCount, icon: Star, tone: 'text-amber-700 bg-amber-50' }
          ].map((st) => (
            <div key={st.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 shadow-xs">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.tone}`}>
                <st.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-900 leading-none">{st.value}</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-1 truncate">{st.label}</div>
              </div>
            </div>
          ))}
        </div>

        {visibleSections.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {lang === 'am' ? 'እስካሁን ምንም ክፍል አልተመደበልዎትም' : 'No sections assigned to you yet'}
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
              {lang === 'am'
                ? 'አስተዳዳሪው ክፍሎችን እስኪመድብልዎት ድረስ ምንም ክፍል ማየት አይችሉም። እባክዎ አስተዳዳሪውን ያነጋግሩ።'
                : 'You can only open the sections the Administrator assigns to you. Please ask the school administrator to assign your classes in "Grades of This Year".'}
            </p>
          </div>
        )}

        {/* Grid of Sections Cards (No student names rendered on login) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleSections.map((sec) => {
            const targetSecObj = sections.find(
              (s) => (s.section || '').toUpperCase() === sec.toUpperCase()
            );
            const roles = targetSecObj
              ? getTeacherRolesForSection(activeTeacherUser, targetSecObj)
              : { isHomeroom: false, subjects: [] };
            const secStudents = getStudentsForSection(sec, sections, students);

            return (
              <div
                key={sec}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-900 transition-colors">
                        Section {sec}
                      </span>
                      {roles.isHomeroom && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          ★ Homeroom
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                      Grade {targetSecObj?.grade || sec.replace(/\D/g, '') || 9}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {(roles.subjects.length > 0 ? roles.subjects : [activeTeacherUser.subject]).map((sub) => (
                          <span key={sub} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Enrolled Students: <strong className="text-slate-800">{secStudents.length} Students</strong>
                      </span>
                    </div>
                    {targetSecObj?.stream && (
                      <div className="text-[11px] text-slate-500">
                        Stream: <span className="font-semibold text-slate-700">{targetSecObj.stream}</span>
                      </div>
                    )}
                    {targetSecObj?.shift && (
                      <div className="text-[11px] text-slate-500">
                        Shift: <span className="font-medium text-slate-700">{targetSecObj.shift}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleEnterSection(sec, 'marks')}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:shadow"
                  >
                    <span>{lang === 'am' ? `ወደ ክፍል ${sec} ግባ` : `Enter Section ${sec} Workspace`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleEnterSection(sec, 'marks')}
                      className="py-1 px-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-center transition-colors cursor-pointer truncate"
                      title="Open Gradebook"
                    >
                      📝 Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnterSection(sec, 'attendance')}
                      className="py-1 px-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-center transition-colors cursor-pointer truncate"
                      title="Open Attendance"
                    >
                      📋 Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnterSection(sec, 'roster')}
                      className="py-1 px-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-center transition-colors cursor-pointer truncate"
                      title="Open Roster"
                    >
                      👥 Roster
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // RENDER 2: SECTION WORKSPACE (Shown when teacher enters into a specific section)
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. SECTION WORKSPACE HEADER WITH TOP ACTION BAR (The Common Place for Action Buttons) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 space-y-4">
        <div className="academic-ribbon absolute inset-x-0 top-0" aria-hidden="true" />
        {/* Top Context & Navigation Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSelectedSection(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Return to sections list"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
              <span>{lang === 'am' ? 'ወደ ክፍሎች ዝርዝር' : 'All Sections'}</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Section {selectedSection}</h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                  {currentSubjectObj?.subjectName || activeTeacherUser.subject}
                </span>
                {currentSectionObj?.isCteSection && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-violet-100 text-violet-900 border border-violet-200">
                    🛠️ CTE: {currentSectionObj.cteSpecialization}
                  </span>
                )}
                {currentSectionObj && getTeacherRolesForSection(activeTeacherUser, currentSectionObj).isHomeroom && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ★ Homeroom Teacher
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instructor: <strong>{activeTeacherUser.name}</strong> • Academic Year: <strong>{academicYearLabel(lang)}</strong> • {sectionStudents.length} Students Enrolled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Section Switcher */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 border border-white/10 rounded-xl px-2.5 py-1 min-w-0 max-w-full">
              <span className="font-semibold hidden sm:inline">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="min-w-0 truncate bg-transparent font-bold text-white [&>option]:text-white text-xs outline-none cursor-pointer"
              >
                {visibleSections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Switcher */}
            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-xl shrink-0">
              <button
                onClick={() => setSelectedSemester(1)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedSemester === 1 ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Semester 1
              </button>
              <button
                onClick={() => setSelectedSemester(2)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedSemester === 2 ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Semester 2
              </button>
            </div>

            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer ml-1"
                title="View Public School Website"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Public Site</span>
              </button>
            )}

            {onSignOutTeacher && (
              <button
                onClick={onSignOutTeacher}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/20 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Common Header Action Toolbar (Admin-suggested common place instead of floating in the middle) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject Selector */}
            {availableSubjects.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs min-w-0 max-w-full">
                <BookOpen className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="font-semibold text-slate-300 shrink-0">Subject:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="min-w-0 truncate bg-transparent font-bold text-white [&>option]:text-white outline-none cursor-pointer"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.subjectId} value={sub.subjectId}>
                      {sub.subjectName} ({sub.subjectAmharic})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student Search Box */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students in Section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Contextual Action Buttons in Header */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'marks' && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddColumnModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Add customizable assessment column with custom max score and bonus points"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{lang === 'am' ? 'የውጤት መስክ አክል (+)' : '+ Add Assessment Column'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Download marks roster spreadsheet (CSV)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleSaveMarks}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Marks</span>
                </button>
              </>
            )}


            {activeTab === 'notices' && (
              <button
                onClick={() => setShowNewNoticeForm(!showNewNoticeForm)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Homework / Notice</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. STATS OVERVIEW FOR ACTIVE CLASS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Class Enrolled</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
            {sectionStudents.length} Students
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">{activeTeacherUser.subject} Average</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1 tabular-nums">
            {classAvg}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Pass Rate (≥ 50%)</div>
          <div className="text-2xl font-bold text-blue-600 font-mono mt-1 tabular-nums">
            {passRate}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Attendance Rate</div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1 tabular-nums">
            {attendanceRate}
          </div>
        </div>
      </div>

      {/* 3. SECTION MODULES SELECTOR (Cards to Open Specific Academic Workspaces) */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          {lang === 'am' ? 'የክፍሉ የሥራ ክፍሎች (Section Modules)' : 'Section Academic Modules (Select to Open):'}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Module 1: Gradebook & Marks */}
          <button
            type="button"
            onClick={() => setActiveTab('marks')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              activeTab === 'marks'
                ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl text-base ${activeTab === 'marks' ? 'bg-white/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}`}>
                  📝
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'marks' ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  Base: {assessmentColumns.filter((c) => !c.isBonus).reduce((s, c) => s + c.maxScore, 0)} pts
                </span>
              </div>
              <div className={`font-black text-sm ${activeTab === 'marks' ? 'text-white' : 'text-slate-900'}`}>
                Gradebook & Marks
              </div>
              <div className={`text-[11px] mt-0.5 leading-snug ${activeTab === 'marks' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Customizable assessment columns, scores & grades
              </div>
            </div>
            <div className={`mt-3 pt-2 border-t text-[11px] font-bold flex items-center justify-between ${activeTab === 'marks' ? 'border-emerald-700/60 text-emerald-200' : 'border-slate-100 text-emerald-700'}`}>
              <span>{activeTab === 'marks' ? 'Current class' : 'Open Gradebook →'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Module 2: Attendance & Matrix */}
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              activeTab === 'attendance'
                ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl text-base ${activeTab === 'attendance' ? 'bg-white/10 text-emerald-200' : 'bg-amber-50 text-amber-700'}`}>
                  📅
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'attendance' ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  Rate: {attendanceRate}
                </span>
              </div>
              <div className={`font-black text-sm ${activeTab === 'attendance' ? 'text-white' : 'text-slate-900'}`}>
                Attendance Spreadsheet
              </div>
              <div className={`text-[11px] mt-0.5 leading-snug ${activeTab === 'attendance' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Past days matrix spreadsheet & roll calls
              </div>
            </div>
            <div className={`mt-3 pt-2 border-t text-[11px] font-bold flex items-center justify-between ${activeTab === 'attendance' ? 'border-emerald-700/60 text-emerald-200' : 'border-slate-100 text-emerald-700'}`}>
              <span>{activeTab === 'attendance' ? 'Current class' : 'Open Attendance →'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Module 3: Class Roster & CTE */}
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              activeTab === 'roster'
                ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl text-base ${activeTab === 'roster' ? 'bg-white/10 text-emerald-200' : 'bg-blue-50 text-blue-700'}`}>
                  👥
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'roster' ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {sectionStudents.length} Students
                </span>
              </div>
              <div className={`font-black text-sm ${activeTab === 'roster' ? 'text-white' : 'text-slate-900'}`}>
                Class Roster & CTE
              </div>
              <div className={`text-[11px] mt-0.5 leading-snug ${activeTab === 'roster' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Student dossiers, CTE vocational electives & parents
              </div>
            </div>
            <div className={`mt-3 pt-2 border-t text-[11px] font-bold flex items-center justify-between ${activeTab === 'roster' ? 'border-emerald-700/60 text-emerald-200' : 'border-slate-100 text-emerald-700'}`}>
              <span>{activeTab === 'roster' ? 'Current class' : 'Open Roster →'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Module 4: Homework & Bulletins */}
          <button
            type="button"
            onClick={() => setActiveTab('notices')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              activeTab === 'notices'
                ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl text-base ${activeTab === 'notices' ? 'bg-white/10 text-emerald-200' : 'bg-purple-50 text-purple-700'}`}>
                  📢
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'notices' ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {classNotices.filter((n) => n.section === selectedSection).length} Bulletins
                </span>
              </div>
              <div className={`font-black text-sm ${activeTab === 'notices' ? 'text-white' : 'text-slate-900'}`}>
                Homework & Bulletins
              </div>
              <div className={`text-[11px] mt-0.5 leading-snug ${activeTab === 'notices' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Assignments, due dates & reminders
              </div>
            </div>
            <div className={`mt-3 pt-2 border-t text-[11px] font-bold flex items-center justify-between ${activeTab === 'notices' ? 'border-emerald-700/60 text-emerald-200' : 'border-slate-100 text-emerald-700'}`}>
              <span>{activeTab === 'notices' ? 'Current class' : 'Open Bulletins →'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* 4. ACTIVE SECTION WORKSPACE WORKAREA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* TAB 1: MARKS & CONTINUOUS ASSESSMENT */}
        {activeTab === 'marks' && (() => {
          const baseTotal = assessmentColumns.filter((c) => !c.isBonus).reduce((t, c) => t + c.maxScore, 0);
          const sums = filteredStudents.map((st) => calculateStudentCustomSummary(st));
          const scored = sums.filter((x) => x.totalEarned > 0);
          const avg = scored.length ? Math.round((scored.reduce((t, x) => t + x.percentage, 0) / scored.length) * 10) / 10 : 0;
          const top = scored.length ? Math.max(...scored.map((x) => x.percentage)) : 0;
          const low = scored.length ? Math.min(...scored.map((x) => x.percentage)) : 0;
          const atRisk = scored.filter((x) => x.percentage < 50).length;
          const tone = (pct: number) =>
            pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800';
          const bar = (pct: number) => (pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-rose-500');
          return (
          <div>
            {/* Context + summary strip */}
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  {currentSubjectObj?.subjectName || activeTeacherUser.subject}
                  {currentSubjectObj?.subjectAmharic && <span className="text-slate-400 font-normal">({currentSubjectObj.subjectAmharic})</span>}
                </span>
                <span>Class average <b className="font-mono text-slate-900">{scored.length ? `${avg}%` : '–'}</b></span>
                <span>Highest <b className="font-mono text-emerald-700">{scored.length ? `${top}%` : '–'}</b></span>
                <span>Lowest <b className="font-mono text-slate-900">{scored.length ? `${low}%` : '–'}</b></span>
                {atRisk > 0 && <span className="text-rose-700 font-semibold">{atRisk} below 50%</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Graded out of <b className="font-mono text-slate-900">{baseTotal}</b></span>
                <button
                  type="button"
                  onClick={handleOpenAddColumnModal}
                  className="btn-academic flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                  Add assessment
                </button>
              </div>
            </div>

            <p className="px-5 py-2 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-200">
              Type a mark and press <kbd className="px-1 rounded bg-white border border-slate-300 font-mono">Enter</kbd> to save and move to the next student.
              Arrow keys also move between cells. Marks above the maximum are flagged in red.
            </p>

            <div className="overflow-auto max-h-[72vh]">
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-slate-600">
                    <th className="sticky top-0 left-0 z-30 bg-slate-100 border-b border-slate-200 py-3 px-3 text-center w-12 min-w-12 hidden sm:table-cell">#</th>
                    <th className="sticky top-0 left-0 sm:left-12 z-30 bg-slate-100 border-b border-slate-200 py-3 px-2.5 sm:px-4 min-w-[132px] sm:min-w-[220px] font-semibold">Student</th>
                    {assessmentColumns.map((col) => (
                      <th key={col.id} className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 py-2.5 px-1.5 sm:px-2 text-center min-w-[88px] sm:min-w-[112px]">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-slate-900 truncate max-w-[90px]">{col.name}</span>
                          <button type="button" onClick={() => handleOpenEditColumnModal(col)} className="p-1 text-slate-400 hover:text-emerald-700 rounded cursor-pointer" title={`Edit ${col.name}`} aria-label={`Edit ${col.name}`}>
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {assessmentColumns.length > 1 && (
                            <button type="button" onClick={() => handleDeleteColumn(col.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer" title={`Delete ${col.name}`} aria-label={`Delete ${col.name}`}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className={`text-[10px] block font-mono ${col.isBonus ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                          out of {col.maxScore}{col.isBonus ? ' · bonus' : ''}
                        </span>
                      </th>
                    ))}
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 py-3 px-2 sm:px-3 text-center min-w-[84px] sm:min-w-[104px] font-semibold">Total</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 py-3 px-3 text-center w-20 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4 + assessmentColumns.length} className="py-14 text-center text-slate-500">
                        <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        No students found in Section {selectedSection}.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const summary = sums[idx];
                      const failing = summary.totalEarned > 0 && summary.percentage < 50;
                      return (
                        <tr key={student.id} className="group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-slate-100 py-2.5 px-3 text-center text-slate-400 font-mono hidden sm:table-cell">{idx + 1}</td>
                          <td className="sticky left-0 sm:left-12 z-10 bg-white group-hover:bg-slate-50 border-b border-slate-100 py-2.5 px-2.5 sm:px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {failing && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Below 50%" />}
                              <span className="font-semibold text-slate-900">{student.fullName}</span>
                              {student.cteSpecialization && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">{student.cteSpecialization}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {student.studentId}{student.fullNameAmharic && <span className="hidden sm:inline text-slate-400 font-sans"> · {student.fullNameAmharic}</span>}
                            </div>
                          </td>

                          {assessmentColumns.map((col, cIdx) => (
                            <td key={col.id} className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-1.5 sm:px-2 text-center">
                              <ScoreCell
                                value={getStudentColumnScore(student, col.id)}
                                max={col.maxScore}
                                isBonus={col.isBonus}
                                row={idx}
                                col={cIdx}
                                label={`${student.fullName}, ${col.name}, out of ${col.maxScore}`}
                                onCommit={(n) => handleCustomScoreChange(student.id, col.id, n)}
                              />
                            </td>
                          ))}

                          <td className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono font-bold tabular-nums">
                                {summary.totalEarned}
                                <span className="text-slate-400 font-normal">/{summary.maxPossible}</span>
                              </span>
                              <span className="h-1 w-16 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                                <span className={`block h-full rounded-full ${bar(summary.percentage)}`} style={{ width: `${Math.min(100, summary.percentage)}%` }} />
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-3 text-center">
                            <span className={`inline-block min-w-9 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] ${summary.totalEarned > 0 ? tone(summary.percentage) : 'bg-slate-100 text-slate-400'}`}>
                              {summary.totalEarned > 0 ? summary.letter.letter : '–'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* TAB 2: ATTENDANCE */}
        {activeTab === 'attendance' && selectedSection && (
          <AttendanceTab students={filteredStudents} section={selectedSection} att={att} />
        )}

        {/* TAB 3: CLASS ROSTER & PARENT CONTACTS */}
        {activeTab === 'roster' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{student.fullName}</h4>
                      <p className="text-xs text-slate-500">{student.fullNameAmharic}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {student.studentId}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/80">
                    {student.cteSpecialization && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">CTE Elective:</span>
                        <span className="font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-200 text-[11px]">
                          🛠️ {student.cteSpecialization}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Gender:</span>
                      <span className="font-medium text-slate-900">{student.gender === 'F' ? 'Female' : 'Male'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conduct Rating:</span>
                      <span className="font-bold text-emerald-700">{student.conduct || 'A'}</span>
                    </div>
                    {student.guardianPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Parent Phone:</span>
                      <a
                        href={`tel:${student.guardianPhone.replace(/\s+/g, '')}`}
                        className="font-mono font-medium text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{student.guardianPhone}</span>
                      </a>
                    </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CLASSROOM HOMEWORK & BULLETINS */}
        {activeTab === 'notices' && (
          <div className="p-6 space-y-6">
            {showNewNoticeForm && (
              <form onSubmit={handleCreateNotice} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Post Class Notice / Homework Assignment</h4>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Notice / Assignment Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 5 Homework Problems (Due Friday)"
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Details & Instructions:</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter instructions, textbook page numbers, and lab requirements..."
                    value={newNoticeContent}
                    onChange={(e) => setNewNoticeContent(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Submission Deadline (Optional):</label>
                  <input
                    type="date"
                    value={newNoticeDueDate}
                    onChange={(e) => setNewNoticeDueDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Publish to Section {selectedSection}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewNoticeForm(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Recent Notices for Section {selectedSection}:</h4>
              {classNotices.filter((n) => n.section === selectedSection).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  No announcements posted yet for Section {selectedSection}. Click &quot;Post Homework / Notice&quot; above to create one.
                </div>
              ) : (
                classNotices
                  .filter((n) => n.section === selectedSection)
                  .map((notice) => (
                    <div key={notice.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{notice.title}</span>
                        <DualDate date={notice.date} lang={lang} className="font-mono text-[11px] text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
                      {notice.dueDate && (
                        <div className="text-[11px] font-semibold text-amber-700 pt-1">
                          Deadline: <DualDate date={notice.dueDate} lang={lang} layout="inline" />
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT ASSESSMENT COLUMN MODAL */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingColumnId
                    ? lang === 'am' ? 'የውጤት መስክ አሻሽል' : 'Edit Assessment Column'
                    : lang === 'am' ? 'አዲስ የውጤት መስክ አክል' : 'Add Assessment Column'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveColumnModal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'am' ? 'የውጤት አይነት ስም' : 'Assessment Item Name / Title:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quiz 2, Practical Lab, Group Assignment, Midterm"
                  value={colNameInput}
                  onChange={(e) => setColNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'am' ? 'የሚሰላበት ሙሉ ነጥብ (ከስንት)' : 'Maximum Points ("From how much"): *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={colMaxInput}
                  onChange={(e) => setColMaxInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Common point benchmarks: 5, 10, 15, 20, 25, 30, 40, 50, 100
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colBonusInput}
                    onChange={(e) => setColBonusInput(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    {lang === 'am' ? 'ተጨማሪ / ቦነስ ነጥብ አለው' : 'Has Bonus / Extra Credit Points'}
                  </span>
                </label>
                <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                  Bonus points are awarded on top of the student&apos;s earned marks without increasing the mandatory course total.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsColumnModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingColumnId ? 'Update Column' : 'Add Column to Gradebook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * The inner component returns early when nobody is signed in but declares hooks after that point.
 * Remounting when the signed-in state flips keeps the hook order stable (otherwise React can crash
 * with "rendered more/fewer hooks" on sign-in or sign-out).
 */
export const TeacherPortal: React.FC<TeacherPortalProps> = (props) => (
  <TeacherPortalInner key={props.activeTeacherUser ? 'signed-in' : 'signed-out'} {...props} />
);
