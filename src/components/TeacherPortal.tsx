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
  GraduationCap
} from 'lucide-react';
import { Student, Teacher } from '../data/schoolData';
import { calculateTotalScore, getEthiopianLetterGrade } from '../utils/gradeCalculations';

interface TeacherPortalProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
  teachers: Teacher[];
  lang: 'en' | 'am';
  initialSection?: string;
  initialSubjectId?: string;
  activeTeacherUser?: Teacher | null;
  onSignOutTeacher?: () => void;
  onSignInTeacher?: (teacher: Teacher) => void;
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
  lang,
  initialSection = '9A',
  initialSubjectId = 'math',
  activeTeacherUser,
  onSignOutTeacher,
  onSignInTeacher
}) => {
  // Login Form States (used when activeTeacherUser is null)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signInMode, setSignInMode] = useState<'roster' | 'form'>('roster');
  const [selectedTeacherPrompt, setSelectedTeacherPrompt] = useState<Teacher | null>(null);
  const [promptPasscode, setPromptPasscode] = useState('');

  // Class Management States
  const [selectedSection, setSelectedSection] = useState<string>(
    activeTeacherUser?.sectionsTeaching?.[0] || initialSection
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'marks' | 'attendance' | 'roster' | 'notices'>('marks');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

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

  // Sync section if teacher changes
  React.useEffect(() => {
    if (activeTeacherUser) {
      if (activeTeacherUser.sectionsTeaching && activeTeacherUser.sectionsTeaching.length > 0) {
        setSelectedSection(activeTeacherUser.sectionsTeaching[0]);
      }
      const subj = activeTeacherUser.subject.toLowerCase();
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
    }
  }, [activeTeacherUser]);

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
                                  {teacher.department} • Assigned: {teacher.sectionsTeaching?.join(', ') || 'Grades 9 & 10'}
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

  // Filter students for the active class section
  const currentGradeNum = parseInt(selectedSection.replace(/\D/g, ''), 10) || 9;
  const currentSectionLetter = selectedSection.replace(/\d/g, '') || 'A';

  const sectionStudents = students.filter(
    (s) => s.grade === currentGradeNum && s.section.toUpperCase() === currentSectionLetter.toUpperCase()
  );

  const filteredStudents = sectionStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullNameAmharic.includes(searchQuery)
  );

  // Mark Score Handlers
  const handleScoreChange = (
    studentId: string,
    field: 'continuousAssessment' | 'midExam' | 'finalExam',
    value: number
  ) => {
    const updated = students.map((st) => {
      if (st.id === studentId) {
        const semesterData = st.semesters.find((sem) => sem.semester === selectedSemester) || st.semesters[0];
        const existingSubject = semesterData?.subjects.find((s) => s.subjectId === selectedSubjectId);

        let newSubjects;
        if (existingSubject) {
          newSubjects = semesterData.subjects.map((sub) =>
            sub.subjectId === selectedSubjectId ? { ...sub, [field]: value } : sub
          );
        } else {
          newSubjects = [
            ...(semesterData?.subjects || []),
            {
              subjectId: selectedSubjectId,
              subjectName: selectedSubjectId.toUpperCase(),
              subjectAmharic: selectedSubjectId.toUpperCase(),
              teacherName: activeTeacherUser?.name || 'Subject Teacher',
              continuousAssessment: field === 'continuousAssessment' ? value : 0,
              midExam: field === 'midExam' ? value : 0,
              finalExam: field === 'finalExam' ? value : 0
            }
          ];
        }

        const updatedSemesters = st.semesters.map((sem) =>
          sem.semester === selectedSemester ? { ...sem, subjects: newSubjects } : sem
        );

        return { ...st, semesters: updatedSemesters };
      }
      return st;
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
    const updated = students.map((s) => {
      if (s.grade === currentGradeNum && s.section.toUpperCase() === currentSectionLetter.toUpperCase()) {
        return { ...s, attendanceStatus: 'Present' as const };
      }
      return s;
    });
    onUpdateStudents(updated);
    setSaveSuccessMsg(`All students in Section ${selectedSection} marked Present!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveMarks = () => {
    setSaveSuccessMsg(`Marks successfully saved for Section ${selectedSection} (${selectedSubjectId.toUpperCase()})!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    const headers = [
      '#',
      'Student ID',
      'Full Name',
      'Amharic Name',
      'Gender',
      'Grade',
      'Section',
      'Continuous (30%)',
      'Midterm (20%)',
      'Final (50%)',
      'Total (100%)',
      'Letter Grade',
      'Status'
    ];
    const rows = filteredStudents.map((s, idx) => {
      const semData = s.semesters.find((sem) => sem.semester === selectedSemester) || s.semesters[0];
      const sub = semData?.subjects.find(
        (subj) =>
          subj.subjectId === selectedSubjectId ||
          (selectedSubjectId === 'it' && subj.subjectId === 'ict') ||
          (selectedSubjectId === 'ict' && subj.subjectId === 'it')
      );
      const continuous = sub?.continuousAssessment ?? 0;
      const mid = sub?.midExam ?? 0;
      const final = sub?.finalExam ?? 0;
      const total = continuous + mid + final;
      const letter = getEthiopianLetterGrade(total);
      const status = total >= 50 ? 'Pass' : 'Fail';
      return [
        idx + 1,
        `"${s.studentId}"`,
        `"${s.fullName}"`,
        `"${s.fullNameAmharic || ''}"`,
        `"${s.gender || 'M'}"`,
        s.grade,
        `"${s.section}"`,
        continuous,
        mid,
        final,
        total,
        `"${letter}"`,
        `"${status}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HMM_${selectedSection}_${selectedSubjectId.toUpperCase()}_Roster.csv`);
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
      section: selectedSection,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TEACHER PROFILE & WORKSPACE HEADER */}
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
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 hidden sm:block">
              Role: <strong className="text-slate-800">Faculty Instructor</strong>
            </div>
            {onSignOutTeacher && (
              <button
                onClick={onSignOutTeacher}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Sign out of Teacher Desk"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Switcher & Semester Toggle */}
        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Your Assigned Classes:</span>
            {(activeTeacherUser.sectionsTeaching || ['9A', '9B', '10A']).map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSection === sec
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Section {sec}
              </button>
            ))}
          </div>

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

      {/* 3. FOUR CLASS MANAGEMENT MODES */}
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
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {activeTab === 'marks' && (
              <>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-4">Student Name & ID</th>
                  <th className="py-3 px-3 text-center w-28">Continuous (30)</th>
                  <th className="py-3 px-3 text-center w-28">Midterm (20)</th>
                  <th className="py-3 px-3 text-center w-28">Final Exam (50)</th>
                  <th className="py-3 px-3 text-center w-24">Total (100)</th>
                  <th className="py-3 px-3 text-center w-20">Grade</th>
                  <th className="py-3 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No students found in Section {selectedSection}.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const semData =
                      student.semesters.find((s) => s.semester === selectedSemester) || student.semesters[0];
                    const subject = semData?.subjects.find((s) => s.subjectId === selectedSubjectId);
                    const continuous = subject?.continuousAssessment ?? 0;
                    const mid = subject?.midExam ?? 0;
                    const final = subject?.finalExam ?? 0;
                    const total = continuous + mid + final;
                    const letter = getEthiopianLetterGrade(total);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold">
                          <div>{student.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{student.studentId}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={continuous}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'continuousAssessment', Number(e.target.value))
                            }
                            className="w-16 text-center font-mono py-1 rounded border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={mid}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'midExam', Number(e.target.value))
                            }
                            className="w-16 text-center font-mono py-1 rounded border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={final}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'finalExam', Number(e.target.value))
                            }
                            className="w-16 text-center font-mono py-1 rounded border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 tabular-nums">
                          {total}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              total >= 80
                                ? 'bg-emerald-50 text-emerald-800'
                                : total >= 50
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {letter.letter}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {total >= 50 ? (
                            <span className="text-emerald-700">Pass</span>
                          ) : (
                            <span className="text-rose-600">Remedial</span>
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
    </div>
  );
};
