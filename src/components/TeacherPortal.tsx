import React, { useState } from 'react';
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
  Globe
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

export interface AssessmentColumn {
  id: string;
  name: string;
  maxScore: number;
  isBonus?: boolean;
}

export const DEFAULT_ASSESSMENT_COLUMNS: AssessmentColumn[] = [
  { id: 'quiz1', name: 'Quiz / Test', maxScore: 10, isBonus: false },
  { id: 'assignment', name: 'Assignment / Practical', maxScore: 20, isBonus: false },
  { id: 'mid', name: 'Midterm Exam', maxScore: 20, isBonus: false },
  { id: 'final', name: 'Final Exam', maxScore: 50, isBonus: false }
];

interface TeacherPortalProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
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

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
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

  const [sectionFilterMode, setSectionFilterMode] = useState<'assigned' | 'all'>('assigned');

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
      date: '2025-01-20',
      dueDate: '2025-01-22'
    },
    {
      id: 'n2',
      section: '9A',
      title: 'Science Lab Preparation',
      content: 'Bring lab notebooks and protective coats for Thursday practical chemistry demonstration.',
      date: '2025-01-18',
      dueDate: '2025-01-23'
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
      alert('You must keep at least one assessment column.');
      return;
    }
    const target = assessmentColumns.find((c) => c.id === colId);
    if (window.confirm(`Are you sure you want to remove column "${target?.name || ''}"?`)) {
      const updated = assessmentColumns.filter((c) => c.id !== colId);
      saveAssessmentColumns(updated);
      setSaveSuccessMsg(`Column removed.`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const handleEnterSection = (
    sectionCode: string,
    initialTab: 'marks' | 'attendance' | 'roster' | 'notices' = 'marks'
  ) => {
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
          <div className="p-6 sm:p-8 bg-[#0a1120] text-white border-b border-slate-800 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-400/30 shadow-md mb-3">
              <span className="font-bold text-lg text-amber-300">HMM</span>
            </div>
            <div className="text-xs text-emerald-400 font-medium mb-1">
              Debre Berhan, Ethiopia · Academic Year 2017 E.C.
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {lang === 'am' ? 'የመምህራን መግቢያ እና የክፍል መቆጣጠሪያ' : 'Faculty Sign In & Class Management Desk'}
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

  // Derived visible sections based on filter mode ('assigned' vs 'all')
  const visibleSections = React.useMemo(() => {
    if (sectionFilterMode === 'assigned' && assignedSections.length > 0) {
      return assignedSections;
    }
    const allSecCodes = sections.map((s) => s.section);
    return allSecCodes.length > 0
      ? allSecCodes
      : assignedSections.length > 0
      ? assignedSections
      : ['9A'];
  }, [sectionFilterMode, assignedSections, sections]);

  // Current active section object and subjects
  const currentSectionObj = selectedSection
    ? sections.find((s) => (s.section || '').toUpperCase() === selectedSection.toUpperCase())
    : undefined;

  const availableSubjects = React.useMemo(() => {
    if (currentSectionObj?.subjectAssignments && currentSectionObj.subjectAssignments.length > 0) {
      return currentSectionObj.subjectAssignments;
    }
    const gr = currentSectionObj?.grade || (selectedSection ? parseInt(selectedSection.replace(/\D/g, ''), 10) : 9) || 9;
    if (gr >= 11) {
      return currentSectionObj?.stream === 'Social Science' || (selectedSection && selectedSection.includes('-Soc'))
        ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
        : STANDARD_GRADE_11_12_NATURAL_SUBJECTS;
    }
    return STANDARD_GRADE_9_10_SUBJECTS;
  }, [currentSectionObj, selectedSection]);

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

    const customMap = (subject as any)?.customAssessments;
    if (customMap && typeof customMap[colId] === 'number') {
      return customMap[colId];
    }

    try {
      const storageKey = `hmm_score_${student.id}_sem${selectedSemester}_${selectedSubjectId}_${colId}`;
      const raw = localStorage.getItem(storageKey);
      if (raw !== null && !isNaN(Number(raw))) {
        return Number(raw);
      }
    } catch {}

    // Fallbacks to standard fields
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

    const updated = students.map((st) => {
      if (st.id !== studentId) return st;

      const semesterData = st.semesters.find((sem) => sem.semester === selectedSemester) || st.semesters[0];
      const existingSubject = semesterData?.subjects.find(
        (s) =>
          s.subjectId === selectedSubjectId ||
          (selectedSubjectId === 'it' && s.subjectId === 'ict') ||
          (selectedSubjectId === 'ict' && s.subjectId === 'it')
      );

      const existingCustom = (existingSubject as any)?.customAssessments || {};
      const updatedCustom = { ...existingCustom, [colId]: clamped };

      // Calculate new total and scale to standard fields
      const regularCols = assessmentColumns.filter((c) => !c.isBonus);
      const bonusCols = assessmentColumns.filter((c) => c.isBonus);
      const maxPossible = regularCols.reduce((sum, c) => sum + c.maxScore, 0) || 100;

      const regScore = regularCols.reduce((sum, c) => {
        const val = c.id === colId ? clamped : (updatedCustom[c.id] ?? getStudentColumnScore(st, c.id));
        return sum + val;
      }, 0);

      const bonusScore = bonusCols.reduce((sum, c) => {
        const val = c.id === colId ? clamped : (updatedCustom[c.id] ?? getStudentColumnScore(st, c.id));
        return sum + val;
      }, 0);

      const totalEarned = regScore + bonusScore;
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
      let updatedSemesters;
      if (hasSemester) {
        updatedSemesters = st.semesters.map((sem) =>
          sem.semester === selectedSemester ? { ...sem, subjects: newSubjects } : sem
        );
      } else {
        updatedSemesters = [...st.semesters, { semester: selectedSemester, subjects: newSubjects }];
      }

      return { ...st, semesters: updatedSemesters };
    });

    onUpdateStudents(updated);
  };

  // Attendance Handlers
  const handleAttendanceChange = (
    studentId: string,
    status: 'Present' | 'Absent' | 'Late' | 'Permission'
  ) => {
    const updated = students.map((s) => (s.id === studentId ? { ...s, attendanceStatus: status } : s));
    onUpdateStudents(updated);
  };

  const handleMarkAllPresent = () => {
    const studentIdsInSection = new Set(sectionStudents.map((s) => s.id));
    const updated = students.map((s) => {
      if (studentIdsInSection.has(s.id)) {
        return { ...s, attendanceStatus: 'Present' as const };
      }
      return s;
    });
    onUpdateStudents(updated);
    setSaveSuccessMsg(`All students in Section ${selectedSection || ''} marked Present!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

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
      ...assessmentColumns.map((c) => `"${c.name} (${c.maxScore}${c.isBonus ? ' Bonus' : ''})"`),
      `"Total (${maxPossible})"`,
      'Percentage (%)',
      'Letter Grade',
      'Status'
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
        ...colScores,
        summary.totalEarned,
        summary.percentage,
        `"${summary.letter.letter}"`,
        `"${summary.status}"`
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
      date: new Date().toISOString().split('T')[0],
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

  const presentCount = sectionStudents.filter((s) => s.attendanceStatus === 'Present').length;
  const attendanceRate = sectionStudents.length
    ? Math.round((presentCount / sectionStudents.length) * 100)
    : 0;

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

            {assignedSections.length > 0 && sections.length > assignedSections.length && (
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSectionFilterMode('assigned')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    sectionFilterMode === 'assigned'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Assigned ({assignedSections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSectionFilterMode('all')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    sectionFilterMode === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All School Sections ({sections.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {assignedSections.length === 0 && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>No section officially assigned to your profile by the Administrator yet. You can access and manage any active school section below:</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded border border-amber-200 shrink-0">
              School-Wide Access
            </span>
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
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Subject:{' '}
                        <strong className="text-slate-800">
                          {roles.subjects.length > 0 ? roles.subjects.join(', ') : activeTeacherUser.subject}
                        </strong>
                      </span>
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
      {/* 1. SECTION WORKSPACE HEADER WITH BACK TO SECTIONS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedSection(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Return to sections list"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'am' ? 'ወደ ክፍሎች ዝርዝር' : 'All Sections'}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Section {selectedSection}</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {currentSubjectObj?.subjectName || activeTeacherUser.subject}
                </span>
                {currentSectionObj && getTeacherRolesForSection(activeTeacherUser, currentSectionObj).isHomeroom && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ★ Homeroom Teacher
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instructor: {activeTeacherUser.name} • {sectionStudents.length} Students Enrolled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Switcher */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold hidden sm:inline">Switch Class:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
              >
                {visibleSections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setSelectedSemester(1)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedSemester === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semester 1
              </button>
              <button
                onClick={() => setSelectedSemester(2)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedSemester === 2 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semester 2
              </button>
            </div>

            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer ml-1"
                title="View Public School Website"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Public Site</span>
              </button>
            )}

            {onSignOutTeacher && (
              <button
                onClick={onSignOutTeacher}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW FOR ACTIVE CLASS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Class Enrolled</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
            {sectionStudents.length} Students
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">{activeTeacherUser.subject} Average</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1 tabular-nums">
            {classAvg}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Pass Rate (≥ 50%)</div>
          <div className="text-2xl font-bold text-blue-600 font-mono mt-1 tabular-nums">
            {passRate}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Attendance Rate</div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1 tabular-nums">
            {attendanceRate}%
          </div>
        </div>
      </div>

      {/* 3. CLASS MANAGEMENT TABS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('marks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'marks'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Gradebook & Marks
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Daily Attendance
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Class Roster & Parents
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'notices'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Homework & Bulletins
            </button>
            <button
              disabled
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-slate-400 bg-slate-100/50 cursor-not-allowed flex items-center gap-1"
              title="Additional academic modules coming soon"
            >
              <span>+ More Tools (Coming Soon)</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'marks' && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddColumnModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Add customizable assessment column with custom max score and bonus points"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'am' ? 'የውጤት መስክ አክል (+)' : '+ Add Assessment Column'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleSaveMarks}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Marks</span>
                </button>
              </>
            )}

            {activeTab === 'attendance' && (
              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Mark All Present
              </button>
            )}

            {activeTab === 'notices' && (
              <button
                onClick={() => setShowNewNoticeForm(!showNewNoticeForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Homework / Notice</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Filter input */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Showing {filteredStudents.length} of {sectionStudents.length} students
          </span>
        </div>

        {/* TAB 1: MARKS & CONTINUOUS ASSESSMENT */}
        {activeTab === 'marks' && (
          <div className="overflow-x-auto">
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-950">
                <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Active Subject: <strong className="font-bold">{currentSubjectObj?.subjectName || activeTeacherUser.subject}</strong> ({currentSubjectObj?.subjectAmharic || ''})
                </span>
                <span className="text-emerald-400">•</span>
                <span className="text-emerald-800">
                  Section <strong className="font-bold">{selectedSection}</strong>
                </span>
                <span className="text-emerald-400">•</span>
                <span className="text-emerald-800">
                  Semester <strong className="font-bold">{selectedSemester}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-800 font-medium bg-white/80 px-2.5 py-0.5 rounded border border-emerald-200">
                  Total Assessment Base:{' '}
                  <strong>{assessmentColumns.filter((c) => !c.isBonus).reduce((s, c) => s + c.maxScore, 0)} pts</strong>
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddColumnModal}
                  className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-4 min-w-[170px]">Student Name & ID</th>
                  {assessmentColumns.map((col) => (
                    <th key={col.id} className="py-3 px-2 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-slate-900 truncate max-w-[90px]">{col.name}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditColumnModal(col)}
                            className="p-0.5 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                            title={`Edit ${col.name}`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {assessmentColumns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteColumn(col.id)}
                              className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title={`Delete ${col.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] block font-mono ${col.isBonus ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                        ({col.maxScore} pts{col.isBonus ? ' • Bonus' : ''})
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24">
                    <div>Total</div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({assessmentColumns.filter((c) => !c.isBonus).reduce((s, c) => s + c.maxScore, 0)})
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center w-20">Grade</th>
                  <th className="py-3 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5 + assessmentColumns.length} className="py-8 text-center text-slate-500">
                      No students found in Section {selectedSection}.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const summary = calculateStudentCustomSummary(student);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold">
                          <div>{student.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{student.studentId}</div>
                        </td>

                        {assessmentColumns.map((col) => {
                          const val = getStudentColumnScore(student, col.id);
                          return (
                            <td key={col.id} className="py-3 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={col.maxScore}
                                value={val === 0 ? '' : val}
                                placeholder="0"
                                onChange={(e) =>
                                  handleCustomScoreChange(student.id, col.id, Number(e.target.value))
                                }
                                className={`w-16 text-center font-mono py-1 rounded border text-xs focus:ring-2 focus:ring-emerald-500 ${
                                  col.isBonus
                                    ? 'border-amber-300 bg-amber-50/50 text-amber-950 font-bold'
                                    : 'border-slate-200 bg-white text-slate-900'
                                }`}
                                title={`Max: ${col.maxScore}${col.isBonus ? ' (Bonus)' : ''}`}
                              />
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 tabular-nums">
                          {summary.totalEarned}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              summary.percentage >= 80
                                ? 'bg-emerald-50 text-emerald-800'
                                : summary.percentage >= 50
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {summary.letter.letter}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {summary.status === 'Pass' ? (
                            <span className="text-emerald-700 font-semibold">Pass</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">Fail</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DAILY ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-4">Student ID & Name</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Update Today&apos;s Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {filteredStudents.map((student, idx) => {
                  const currentStatus = student.attendanceStatus || 'Present';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{student.studentId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : currentStatus === 'Absent'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : currentStatus === 'Late'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {(['Present', 'Absent', 'Late', 'Permission'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleAttendanceChange(student.id, status)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                                currentStatus === status
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Gender:</span>
                      <span className="font-medium text-slate-900">{student.gender === 'F' ? 'Female' : 'Male'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conduct Rating:</span>
                      <span className="font-bold text-emerald-700">{student.conduct || 'A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Parent Phone:</span>
                      <a
                        href="tel:+251911234567"
                        className="font-mono font-medium text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>+251 91 123 4567</span>
                      </a>
                    </div>
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
                        <span className="font-mono text-[11px] text-slate-400">{notice.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
                      {notice.dueDate && (
                        <div className="text-[11px] font-semibold text-amber-700 pt-1">
                          Deadline: {notice.dueDate}
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
