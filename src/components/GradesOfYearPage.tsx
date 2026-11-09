import React, { useState } from 'react';
import {
  Layers,
  Users,
  UserCheck,
  GraduationCap,
  Building,
  Clock,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Edit3,
  X,
  FileSpreadsheet,
  Award,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  User,
  SlidersHorizontal,
  ChevronDown,
  Save,
  Printer,
  AlertTriangle,
  ArrowLeft,
  Globe,
  LogOut,
  UserPlus
} from 'lucide-react';
import { GradeSection, Teacher, Student, SectionSubjectAssignment } from '../data/schoolData';
import { calculateTotalScore, getEthiopianLetterGrade } from '../utils/gradeCalculations';
import { getStudentsForSection as getStudentsForSectionUtil, getSectionHeadcount } from '../utils/sectionUtils';
import { getSectionCapacity } from '../utils/sectionCapacity';
import { currentEcLabel } from '../utils/ethiopianCalendar';

interface GradesOfYearPageProps {
  sections: GradeSection[];
  onUpdateSection: (updated: GradeSection) => void;
  teachers: Teacher[];
  students: Student[];
  onUpdateStudents?: (updated: Student[] | ((prev: Student[]) => Student[])) => void;
  lang: 'en' | 'am';
  onNavigateToTeacherPortal?: (sectionCode?: string, subjectId?: string) => void;
  onNavigateToGradePortal?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToRegistrar?: () => void;
  onNavigateHome?: () => void;
  onSignOutAdmin?: () => void;
}

export function isTeacherQualifiedForSubject(teacher: Teacher, subjectId: string, subjectName: string): boolean {
  const tSub = (teacher.subject || '').toLowerCase().trim();
  const sId = (subjectId || '').toLowerCase().trim();
  const sName = (subjectName || '').toLowerCase().trim();

  const subjectKeywords: Record<string, string[]> = {
    math: ['math', 'ሒሳብ', 'mathematics'],
    phys: ['phys', 'ፊዚክስ', 'physics'],
    chem: ['chem', 'ኬሚስትሪ', 'chemistry'],
    bio: ['bio', 'ባዮሎጂ', 'biology'],
    eng: ['eng', 'እንግሊዝኛ', 'english'],
    amh: ['amh', 'አማርኛ', 'amharic'],
    geo: ['geo', 'ጂኦግራፊ', 'geography'],
    hist: ['hist', 'ታሪክ', 'history'],
    civ: ['civ', 'ስነ-ዜጋ', 'civics', 'citizenship'],
    it: ['it', 'ict', 'ኢንፎርሜሽን', 'computer', 'information technology'],
    pe: ['pe', 'sport', 'ስፖርት', 'physical education'],
    econ: ['econ', 'ኢኮኖሚክስ', 'economics'],
    agri: ['agri', 'ግብርና', 'agriculture'],
    cte: ['cte', 'ስራና ቴክኒክ', 'career', 'technical']
  };

  let matchedKey = '';
  for (const [key, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some((kw) => sId.includes(kw) || sName.includes(kw))) {
      matchedKey = key;
      break;
    }
  }

  if (matchedKey) {
    const validKeywords = subjectKeywords[matchedKey];
    return validKeywords.some((kw) => tSub.includes(kw));
  }

  return tSub.includes(sId) || sName.includes(tSub);
}

const gradeTone = (letter: string) =>
  letter.startsWith('A') ? { chip: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' }
  : letter.startsWith('B') ? { chip: 'bg-sky-100 text-sky-800', bar: 'bg-sky-500' }
  : letter.startsWith('C') ? { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-400' }
  : letter.startsWith('D') ? { chip: 'bg-orange-100 text-orange-800', bar: 'bg-orange-400' }
  : { chip: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' };

export const GradesOfYearPage: React.FC<GradesOfYearPageProps> = ({
  sections,
  onUpdateSection,
  teachers,
  students,
  lang,
  onNavigateToTeacherPortal,
  onNavigateToGradePortal,
  onNavigateToAdmin,
  onNavigateToRegistrar,
  onNavigateHome,
  onSignOutAdmin
}) => {
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all' | 'cte'>('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [reassignModalSection, setReassignModalSection] = useState<GradeSection | null>(null);
  const [selectedHomeroomTeacherId, setSelectedHomeroomTeacherId] = useState<string>('');
  
  // Subject Reassignment Modal State
  const [subjectReassignSection, setSubjectReassignSection] = useState<GradeSection | null>(null);
  const [subjectAssignmentsDraft, setSubjectAssignmentsDraft] = useState<SectionSubjectAssignment[]>([]);

  // Section Students & Marks Modal State
  const [rosterModalSection, setRosterModalSection] = useState<GradeSection | null>(null);
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState<Student | null>(null);
  const [deskQuery, setDeskQuery] = useState('');
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');

  const [saveToast, setSaveToast] = useState<string>('');

  // Which section is open. Null = show the short list of sections only.
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const openSection = openSectionId ? sections.find((s) => s.id === openSectionId) || null : null;
  const openSectionDetails = (id: string) => {
    setOpenSectionId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const isUnassignedTeacher = (a: SectionSubjectAssignment) =>
    !a.teacherId || (a.teacherName || '').toLowerCase().includes('unassigned') || (a.teacherName || '').includes('ያልተመደበ');

  // Summary calculations
  // One source for every enrollment number on this page (never lower than the students found in the section)
  const head = (sec: GradeSection) => getSectionHeadcount(sec, sections, students);
  const totalStudents = sections.reduce((acc, s) => acc + head(s).total, 0);
  const totalMale = sections.reduce((acc, s) => acc + head(s).male, 0);
  const totalFemale = sections.reduce((acc, s) => acc + head(s).female, 0);
  const avgAttendance = sections.length > 0
    ? (sections.reduce((acc, s) => acc + s.attendanceToday, 0) / sections.length).toFixed(1)
    : '0.0';

  // Filtered sections
  const filteredSections = sections.filter((s) => {
    if (selectedGradeFilter === 'cte') {
      if (!s.isCteSection && !s.section.includes('CTE')) return false;
    } else if (selectedGradeFilter !== 'all' && s.grade !== selectedGradeFilter) {
      return false;
    }
    if (selectedStreamFilter !== 'all' && s.stream !== selectedStreamFilter) return false;
    if (selectedShiftFilter !== 'all' && !s.shift.includes(selectedShiftFilter)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSection = s.section.toLowerCase().includes(q);
      const matchTeacher = s.homeroomTeacher.name.toLowerCase().includes(q) || s.homeroomTeacher.subject.toLowerCase().includes(q);
      const matchRoom = s.roomNumber.toLowerCase().includes(q) || s.buildingBlock.toLowerCase().includes(q);
      const matchMonitor = s.studentMonitors.classMonitor.toLowerCase().includes(q) || s.studentMonitors.deputyMonitor.toLowerCase().includes(q);
      const matchSubjects = s.subjectAssignments?.some(
        (sub) => sub.subjectName.toLowerCase().includes(q) || sub.teacherName.toLowerCase().includes(q)
      );
      return matchSection || matchTeacher || matchRoom || matchMonitor || matchSubjects;
    }

    return true;
  });

  // Open Reassign Homeroom Modal
  const handleOpenReassignHomeroom = (section: GradeSection) => {
    setReassignModalSection(section);
    setSelectedHomeroomTeacherId(section.homeroomTeacher.id);
  };

  // Save Homeroom Reassignment
  const handleSaveHomeroomReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalSection) return;

    const chosenHomeroom = teachers.find((t) => t.id === selectedHomeroomTeacherId);
    if (!chosenHomeroom) return;

    const updated: GradeSection = {
      ...reassignModalSection,
      homeroomTeacher: {
        id: chosenHomeroom.id,
        name: chosenHomeroom.name,
        nameAmharic: chosenHomeroom.nameAmharic,
        subject: chosenHomeroom.subject,
        phone: chosenHomeroom.phone,
        avatar: chosenHomeroom.avatar
      }
    };

    onUpdateSection(updated);
    setSaveToast(
      lang === 'am'
        ? `የክፍል ${updated.section} የኃላፊ መምህር ምደባ ተቀይሯል!`
        : `Homeroom teacher for Section ${updated.section} successfully updated to ${chosenHomeroom.name}!`
    );
    setReassignModalSection(null);
    setTimeout(() => setSaveToast(''), 4000);
  };

  // Open Subject Assignments Editor Modal
  const handleOpenSubjectEditor = (section: GradeSection) => {
    setSubjectReassignSection(section);
    setSubjectAssignmentsDraft([...(section.subjectAssignments || [])]);
  };

  // Handle draft change for a subject's teacher
  const handleSubjectTeacherDraftChange = (subjectId: string, newTeacherId: string) => {
    if (!newTeacherId) {
      setSubjectAssignmentsDraft((prev) =>
        prev.map((sub) =>
          sub.subjectId === subjectId
            ? {
                ...sub,
                teacherId: '',
                teacherName: lang === 'am' ? 'ያልተመደበ (Unassigned)' : 'Unassigned (ያልተመደበ)'
              }
            : sub
        )
      );
      return;
    }

    const teacherObj = teachers.find((t) => t.id === newTeacherId);
    if (!teacherObj) return;

    setSubjectAssignmentsDraft((prev) =>
      prev.map((sub) =>
        sub.subjectId === subjectId
          ? {
              ...sub,
              teacherId: teacherObj.id,
              teacherName: teacherObj.name
            }
          : sub
      )
    );
  };

  // Save Subject Assignments
  const handleSaveSubjectAssignments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectReassignSection) return;

    const updated: GradeSection = {
      ...subjectReassignSection,
      subjectAssignments: subjectAssignmentsDraft
    };

    onUpdateSection(updated);
    setSaveToast(
      lang === 'am'
        ? `የክፍል ${updated.section} የትምህርት አይነቶችና የመምህራን ምደባ በተሳካ ሁኔታ ተቀምጧል!`
        : `Subject teachers for Section ${updated.section} saved successfully!`
    );
    setSubjectReassignSection(null);
    setTimeout(() => setSaveToast(''), 4000);
  };

  // Get enrolled students for a specific section (handles all formats: 9A, 11-Nat-A, etc.)
  const getStudentsForSection = (section: GradeSection) => {
    return getStudentsForSectionUtil(section.section, sections, students);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 bg-emerald-900 text-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold text-sm">{saveToast}</span>
        </div>
      )}

      {/* Top Navigation Bar for Admin Suite */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="btn-animated min-w-0 flex-1 sm:flex-none justify-center px-3.5 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{lang === 'am' ? 'ወደ አድሚን ዴስክ' : 'Back to admin'}</span>
            </button>
          )}
          {onNavigateToRegistrar && (
            <button
              onClick={onNavigateToRegistrar}
              className="btn-animated min-w-0 flex-1 sm:flex-none justify-center px-3.5 py-2.5 sm:py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-950 shrink-0" />
              <span className="truncate">{lang === 'am' ? `ምዝገባ (${currentEcLabel('am')}) →` : 'Registrar →'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3 sm:px-3.5 py-2.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="View Public School Website"
              aria-label="View Public School Website"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">{lang === 'am' ? 'ድረ-ገጽ' : 'Public Site'}</span>
            </button>
          )}
          {onSignOutAdmin && (
            <button
              onClick={onSignOutAdmin}
              className="px-3 sm:px-3.5 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Sign out of Administrator Suite"
              aria-label="Sign out of Administrator Suite"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MoE Official Header & Academic Year Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Ethiopian Flag Top Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-800 to-slate-900 text-amber-400 flex items-center justify-center shadow-md flex-shrink-0 border border-amber-400/30">
              <Layers className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {lang === 'am' ? `የትምህርት ሚኒስቴር የ${currentEcLabel('am')}` : `FDRE Ministry of Education • ${currentEcLabel('en')}`}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {lang === 'am' ? 'ደብረ ብርሃን ዞን ሁለተኛ ደረጃ' : 'Debre Berhan Secondary Bureau'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {lang === 'am' ? 'ክፍሎች፣ ሴክሽኖችና የተመደቡ መምህራን' : 'Classes & Sections: teachers and curriculum'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                {lang === 'am'
                  ? 'የ9ኛ - 12ኛ ክፍል ሙሉ ሴክሽኖች ዝርዝር፣ የሚማሩት የትምህርት አይነቶች (Subjects)፣ የተመደቡ መምህራን፣ የተማሪዎች አለቃ እና የተማሪዎች ማርክ መዝገብ'
                  : 'Comprehensive view of all secondary sections (Grades 9-12), subjects taught per section, assigned faculty, student monitors, and direct marks access'}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'ጠቅላላ ክፍሎች' : 'Total Sections'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {sections.length} <span className="text-xs font-normal text-slate-500">Sections</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">Grades 9 to 12</span>
            </div>

            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'ጠቅላላ ተማሪዎች' : 'Total Enrolled'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                {totalStudents.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                M: {totalMale} • F: {totalFemale}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                {lang === 'am' ? 'የዛሬ አቴንዳንስ' : "Today's Attendance"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
                {avgAttendance}%
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Average Schoolwide</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Grade Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">
              {lang === 'am' ? 'ክፍል:' : 'Grade:'}
            </span>
            {[
              { id: 'all', label: lang === 'am' ? 'ሁሉም (16)' : 'All Grades (16)' },
              { id: 9, label: 'Grade 9 (4 Sections)' },
              { id: 10, label: 'Grade 10 (4 Sections)' },
              { id: 11, label: 'Grade 11 (4 Sections)' },
              { id: 12, label: 'Grade 12 (4 Sections)' },
              { id: 'cte', label: lang === 'am' ? '🛠️ CTE ሙያ ክፍሎች' : '🛠️ CTE Vocational Sections' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGradeFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGradeFilter === tab.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'am'
                  ? 'ሴክሽን፣ የትምህርት አይነት፣ መምህር፣ ክፍል ቁጥር ፈልግ...'
                  : 'Search section, subject, teacher, room...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filters: Stream & Shift */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="font-semibold text-slate-500 shrink-0">
              {lang === 'am' ? 'የትምህርት ዘርፍ (Stream):' : 'Stream:'}
            </span>
            <select
              value={selectedStreamFilter}
              onChange={(e) => setSelectedStreamFilter(e.target.value)}
              className="min-w-0 flex-1 sm:flex-none truncate bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Streams (ሁሉም ዘርፎች)</option>
              <option value="General Secondary">General Secondary (9th & 10th)</option>
              <option value="Natural Science">Natural Science (የተፈጥሮ ሳይንስ)</option>
              <option value="Social Science">Social Science (የማህበራዊ ሳይንስ)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="font-semibold text-slate-500 shrink-0">
              {lang === 'am' ? 'ፈረቃ (Shift):' : 'Shift:'}
            </span>
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="min-w-0 flex-1 sm:flex-none truncate bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Shifts (ሁለቱም ፈረቃዎች)</option>
              <option value="Morning">Morning Shift (ጧት: 8:00 AM - 12:30 PM)</option>
              <option value="Afternoon">Afternoon Shift (ከሰዓት: 12:45 PM - 5:15 PM)</option>
            </select>
          </div>

          <div className="ml-auto text-slate-500 text-[11px] font-semibold">
            Showing <strong className="text-slate-900">{filteredSections.length}</strong> of{' '}
            {sections.length} sections {openSection ? '' : (lang === 'am' ? '• ለዝርዝር ክፍል ይጫኑ' : '• click a section to open it')}
          </div>
        </div>
      </div>

      {/* FULL-WIDTH SECTIONS LIST (1 section per row, full wide as requested) */}
      <div className="flex flex-col gap-6 w-full">
        {openSection && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpenSectionId(null)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {lang === 'am' ? 'ወደ ሁሉም ክፍሎች ተመለስ' : 'Back to all sections'}
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {lang === 'am' ? 'የሚታየው፡' : 'Showing:'} <strong className="text-slate-900">{openSection.section}</strong>
            </span>
          </div>
        )}
        {!openSection && filteredSections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
              <Layers className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="font-bold text-slate-900 text-base">
              {lang === 'am' ? 'ምንም ክፍሎች (Sections) አልተፈጠሩም' : 'No Sections Created for This Academic Year Yet'}
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {lang === 'am'
                ? 'በሬጅስትራር ዴስክ የተማሪዎች ክፍፍል (Section Allocator) በመጠቀም ክፍሎችን በዘፈቀደ ወይም በፆታ ማመጣጠን ይችላሉ።'
                : 'Open the Registrar Portal and use the Section Allocator to distribute enrolled students into balanced Grade sections (A, B, C...) with assigned subjects.'}
            </p>
          </div>
        ) : !openSection ? (
          // Short list: one small card per section, grouped by grade. Full details open on click.
          Array.from(new Set(filteredSections.map((x) => x.grade)))
            .sort((a, b) => a - b)
            .map((grade) => (
              <section key={grade} className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                  <span>{lang === 'am' ? `${grade}ኛ ክፍል` : `Grade ${grade}`}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {filteredSections.filter((x) => x.grade === grade).length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSections
                    .filter((x) => x.grade === grade)
                    .sort((a, b) => a.section.localeCompare(b.section))
                    .map((sec) => {
                      const missing = (sec.subjectAssignments || []).filter(isUnassignedTeacher).length;
                      const homeroomAssigned = Boolean(sec.homeroomTeacher?.id);
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => openSectionDetails(sec.id)}
                          className="group flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="inline-block rounded-xl bg-gradient-to-r from-emerald-800 to-slate-900 px-3 py-1 font-mono text-base font-black tracking-wider text-amber-400">
                                {sec.section}
                              </span>
                              <div className="mt-1.5 truncate text-[11px] font-semibold text-slate-500">
                                {sec.isCteSection ? `🛠️ CTE: ${sec.cteSpecialization}` : lang === 'am' ? sec.streamAmharic : sec.stream}
                              </div>
                            </div>
                            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600" />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-emerald-700" />
                              {head(sec).total}
                              {!sec.isCteSection && <span className="text-slate-400">/ {getSectionCapacity(sec)}</span>}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Building className="h-3.5 w-3.5 text-slate-400" />
                              {sec.roomNumber || '—'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {sec.shift.includes('Morning') ? (lang === 'am' ? 'ጧት' : 'Morning') : lang === 'am' ? 'ከሰዓት' : 'Afternoon'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                            <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-slate-700">
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                              <span className="truncate">
                                {homeroomAssigned
                                  ? lang === 'am' ? sec.homeroomTeacher.nameAmharic || sec.homeroomTeacher.name : sec.homeroomTeacher.name
                                  : lang === 'am' ? 'የክፍል መምህር አልተመደበም' : 'No homeroom teacher'}
                              </span>
                            </span>
                            {missing > 0 && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                                <AlertTriangle className="h-3 w-3" />
                                {missing} {lang === 'am' ? 'ያልተመደቡ' : 'unassigned'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>
            ))
        ) : (
          [openSection].map((sec) => {
          const hc = head(sec);
          const malePct = hc.total > 0 ? Math.round((hc.male / hc.total) * 100) : 0;
          const femalePct = hc.total > 0 ? 100 - malePct : 0;
          const sectionStudents = getStudentsForSection(sec);

          return (
            <div
              key={sec.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden w-full flex flex-col"
            >
              {/* 1. SECTION TOP HEADER (Full Width Bar) */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Section Badge, Grade, Stream */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-emerald-800 to-slate-900 text-amber-400 font-mono font-black text-lg tracking-wider rounded-2xl shadow-sm border border-emerald-700/60">
                      {sec.section}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {lang === 'am' ? `${sec.grade}ኛ ክፍል • ሴክሽን "${sec.sectionLetter}"` : `Grade ${sec.grade} — Section "${sec.sectionLetter}"`}
                        </h3>
                        {sec.isCteSection && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
                            🛠️ CTE: {sec.cteSpecialization}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                        <span className="text-emerald-800 font-bold">
                          {lang === 'am' ? sec.streamAmharic : sec.stream}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {sec.roomNumber} ({sec.buildingBlock})
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {sec.shift}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Enrollment Summary & Attendance */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
                    <div>
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        {lang === 'am' ? 'የተመዘገቡ ተማሪዎች' : 'Enrolled Students'}
                      </div>
                      <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-700" />
                        <span>{hc.total}</span>
                        {!sec.isCteSection && (
                          <span className="text-xs font-semibold text-slate-400">
                            / {getSectionCapacity(sec)} {lang === 'am' ? 'መቀመጫ' : 'seats'}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          (M: {hc.male} • F: {hc.female})
                        </span>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                    <div>
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        {lang === 'am' ? 'የዛሬ አቴንዳንስ' : "Today's Attendance"}
                      </div>
                      <div className="text-base font-black text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{sec.attendanceToday}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enrollment Distribution Bar */}
                <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden flex" title={`Male: ${hc.male} (${malePct}%) | Female: ${hc.female} (${femalePct}%)`}>
                  <div className="bg-emerald-600 h-full" style={{ width: `${malePct}%` }} />
                  <div className="bg-amber-500 h-full" style={{ width: `${femalePct}%` }} />
                </div>
              </div>

              {/* 2. SECTION BODY (Faculty, Student Monitors & Full Curriculum Subjects) */}
              <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (4 cols): Homeroom Teacher & Student Monitors */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Assigned Homeroom Teacher */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        <span>{lang === 'am' ? 'የክፍል ኃላፊ መምህር' : 'Assigned Homeroom Teacher'}</span>
                      </span>
                      <button
                        onClick={() => handleOpenReassignHomeroom(sec)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer flex items-center gap-1"
                        title="Reassign homeroom teacher"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{lang === 'am' ? 'ቀይር' : 'Change'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="avatar-monogram w-12 h-12 rounded-2xl flex-shrink-0 text-xs font-black shadow-xs">
                        {sec.homeroomTeacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'HT'}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {lang === 'am' ? sec.homeroomTeacher.nameAmharic : sec.homeroomTeacher.name}
                        </div>
                        <span className="text-emerald-800 font-semibold block truncate">
                          {sec.homeroomTeacher.subject} Teacher
                        </span>
                        <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {sec.homeroomTeacher.phone}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{lang === 'am' ? 'የተረጋገጠ የክፍል መምህር' : 'Verified Homeroom Faculty'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReassignModalSection(sec);
                          setSelectedHomeroomTeacherId(sec.homeroomTeacher.id || '');
                        }}
                        className="font-bold text-emerald-900 hover:text-emerald-950 flex items-center gap-0.5 hover:underline cursor-pointer"
                      >
                        <span>{lang === 'am' ? 'መምህር ቀይር →' : 'Change Teacher →'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Student Monitors (Monitor and Deputy Monitor ONLY - Academic Student removed) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {lang === 'am' ? 'የክፍል ተማሪዎች አለቆች' : 'Student Class Monitors'}
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-semibold">
                          {lang === 'am' ? 'የክፍል አለቃ (Monitor):' : 'Class Monitor (አለቃ):'}
                        </span>
                        <strong className="text-slate-900 font-bold truncate max-w-[180px]">
                          {sec.studentMonitors.classMonitor}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-semibold">
                          {lang === 'am' ? 'ምክትል አለቃ (2nd Monitor):' : 'Second Monitor (ምክትል አለቃ):'}
                        </span>
                        <strong className="text-slate-900 font-bold truncate max-w-[180px]">
                          {sec.studentMonitors.deputyMonitor}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (8 cols): What Subjects They Learn and What Teacher is Assigned */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {lang === 'am'
                          ? `የሚማሩት የትምህርት አይነቶችና የተመደቡ መምህራን (${sec.subjectAssignments?.length || 0})`
                          : `Curriculum Subjects & Assigned Faculty (${sec.subjectAssignments?.length || 0} Subjects)`}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleOpenSubjectEditor(sec)}
                      className="btn-animated px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                      <span>{lang === 'am' ? 'የመምህራን ምደባ አሻሽል' : 'Edit Subject Faculty'}</span>
                    </button>
                  </div>

                  {/* Grid of Subjects & Assigned Teachers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {sec.subjectAssignments?.map((sub) => {
                      const teacherObj = teachers.find((t) => t.id === sub.teacherId);
                      return (
                        <div
                          key={sub.subjectId}
                          className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 transition-all flex items-start gap-2.5 shadow-2xs group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-black flex items-center justify-center text-xs flex-shrink-0 border border-emerald-200">
                            {sub.subjectId.toUpperCase().slice(0, 3)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {lang === 'am' ? sub.subjectAmharic : sub.subjectName}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                                {sub.periodsPerWeek}h/wk
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold truncate mt-0.5 flex items-center gap-1">
                              {!sub.teacherId || sub.teacherName.toLowerCase().includes('unassigned') || sub.teacherName.includes('ያልተመደበ') ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <span>⚠️</span>
                                  <span>{lang === 'am' ? 'መምህር አልተመደበም' : 'Unassigned'}</span>
                                </span>
                              ) : (
                                <>
                                  <User className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span className="text-emerald-800 truncate">{sub.teacherName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. SECTION ACTIONS FOOTER */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  {lang === 'am'
                    ? `የክፍል ${sec.section} ሙሉ የተማሪዎች ዝርዝር እና ውጤቶች ለመመልከት ይጫኑ`
                    : `View full roster of ${hc.total} students and inspect their marks across all subjects`}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => {
                      setRosterModalSection(sec);
                      const roster = getStudentsForSection(sec);
                      setSelectedStudentForMarks(roster[0] || null);
                    }}
                    className="btn-animated px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <GraduationCap className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'am' ? `የክፍል ${sec.section} የተማሪዎች ዝርዝር እና ማርክ መመልከቻ` : `Open Section ${sec.section} Students & Marks Desk`}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* MODAL 1: Reassign Homeroom Teacher Modal */}
      {reassignModalSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setReassignModalSection(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <span className="p-3 bg-emerald-100 text-emerald-900 rounded-2xl">
                <Edit3 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {lang === 'am'
                    ? `የክፍል ${reassignModalSection.section} ኃላፊ መምህር ምረጥ`
                    : `Reassign Homeroom Teacher for ${reassignModalSection.section}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Select from registered faculty without manual typing
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveHomeroomReassign} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  {lang === 'am' ? 'የክፍል ኃላፊ መምህር (Homeroom Teacher):' : 'Assigned Homeroom Teacher:'}
                </label>
                <select
                  value={selectedHomeroomTeacherId}
                  onChange={(e) => setSelectedHomeroomTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.subject} ({t.department})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 block mt-1">
                  The homeroom teacher oversees roll call attendance, student conduct (A/B/C/D), and parent notices.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalSection(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn-animated px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                >
                  {lang === 'am' ? 'ምደባውን አስቀምጥ' : 'Save Homeroom Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Subject Teachers for Section Modal */}
      {subjectReassignSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSubjectReassignSection(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <span className="p-3 bg-emerald-800 text-amber-400 rounded-2xl shadow-sm">
                <SlidersHorizontal className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {lang === 'am'
                    ? `የክፍል ${subjectReassignSection.section} የትምህርት መምህራን ምደባ`
                    : `Assign Subject Faculty for ${subjectReassignSection.section}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Choose which teacher is assigned to each course in {subjectReassignSection.stream}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSubjectAssignments} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="divide-y divide-slate-100">
                {subjectAssignmentsDraft.map((sub) => (
                  <div key={sub.subjectId} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 sm:w-1/3">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {sub.subjectName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sub.subjectAmharic} • {sub.periodsPerWeek} periods/wk
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      {(() => {
                        const qualifiedTeachers = teachers.filter((t) => isTeacherQualifiedForSubject(t, sub.subjectId, sub.subjectName));
                        const otherTeachers = teachers.filter((t) => !isTeacherQualifiedForSubject(t, sub.subjectId, sub.subjectName));
                        const currentAssignedTeacher = teachers.find((t) => t.id === sub.teacherId);
                        const isCurrentMismatch = Boolean(currentAssignedTeacher && !isTeacherQualifiedForSubject(currentAssignedTeacher, sub.subjectId, sub.subjectName));

                        return (
                          <>
                            <select
                              value={sub.teacherId}
                              onChange={(e) => handleSubjectTeacherDraftChange(sub.subjectId, e.target.value)}
                              className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                                isCurrentMismatch ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400' : 'border-slate-300'
                              }`}
                            >
                              <option value="">{lang === 'am' ? '-- መምህር አልተመደበም (Unassigned) --' : '-- Unassigned (መምህር አልተመደበም) --'}</option>
                              {qualifiedTeachers.length > 0 ? (
                                <optgroup label={lang === 'am' ? `የተረጋገጡ የ${sub.subjectName} መምህራን (${qualifiedTeachers.length})` : `Certified ${sub.subjectName} Specialists (${qualifiedTeachers.length})`}>
                                  {qualifiedTeachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      ✓ {t.name} (Specialist: {t.subject} - {t.department})
                                    </option>
                                  ))}
                                </optgroup>
                              ) : (
                                <option disabled value="__none__">
                                  ⚠️ {lang === 'am' ? `የ${sub.subjectName} የተረጋገጠ መምህር አልተገኘም (በStaff ገጽ ይመዝግቡ)` : `No certified ${sub.subjectName} teacher registered yet (Register in Staff Tab)`}
                                </option>
                              )}
                              {otherTeachers.length > 0 && (
                                <optgroup label={lang === 'am' ? 'ሌሎች መምህራን (የተለያየ የትምህርት ዘርፍ - የተከለከለ)' : 'Other Faculty (Blocked - Subject Mismatch)'}>
                                  {otherTeachers.map((t) => (
                                    <option key={t.id} value={t.id} disabled>
                                      ⛔ {t.name} (Certified in {t.subject} - Not {sub.subjectName})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>

                            {isCurrentMismatch && (
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-800 flex items-center gap-1.5 animate-in fade-in">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  {lang === 'am'
                                    ? `ማስጠንቀቂያ፡ ${currentAssignedTeacher?.name} የተመዘገቡት በ${currentAssignedTeacher?.subject} እንጂ በ${sub.subjectName} አይደለም!`
                                    : `Subject Mismatch Block: ${currentAssignedTeacher?.name} is registered for ${currentAssignedTeacher?.subject}, not ${sub.subjectName}. Please select a certified specialist.`}
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setSubjectReassignSection(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn-animated px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'am' ? 'ምደባውን አስቀምጥ' : 'Save Faculty Assignments'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Section Roster & Specific Student Subject Marks Modal */}
      {rosterModalSection && (() => {
        const sem1Of = (st: Student) => st.semesters.find((x) => x.semester === 1) || st.semesters[0];
        const avgOf = (st: Student): number | null => {
          const subs = sem1Of(st)?.subjects || [];
          if (!subs.length) return null;
          const t = subs.reduce((a, x) => a + calculateTotalScore(x.continuousAssessment, x.midExam, x.finalExam), 0);
          return Math.round((t / subs.length) * 10) / 10;
        };
        const closeDesk = () => { setRosterModalSection(null); setSelectedStudentForMarks(null); setDeskQuery(''); };
        const roster = getStudentsForSection(rosterModalSection);
        const q = deskQuery.trim().toLowerCase();
        const shown = q
          ? roster.filter((st) => st.fullName.toLowerCase().includes(q) || st.studentId.toLowerCase().includes(q) || (st.fullNameAmharic || '').includes(deskQuery.trim()))
          : roster;
        const avgs = roster.map(avgOf).filter((x): x is number => x !== null);
        const classAvg = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;
        const topAvg = avgs.length ? Math.max(...avgs) : null;
        const below = avgs.filter((x) => x < 50).length;
        // Always show the live record (never a stale copy) so every number matches the saved marks
        const live = selectedStudentForMarks ? roster.find((x) => x.id === selectedStudentForMarks.id) || selectedStudentForMarks : null;
        const liveSubjects = live ? sem1Of(live)?.subjects || [] : [];
        const liveAvg = live ? avgOf(live) : null;
        const liveTotal = liveSubjects.reduce((a, x) => a + calculateTotalScore(x.continuousAssessment, x.midExam, x.finalExam), 0);
        const passed = liveSubjects.filter((x) => calculateTotalScore(x.continuousAssessment, x.midExam, x.finalExam) >= 50).length;
        const medal = (r?: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '');

        return (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={closeDesk}>
          <div className="bg-white rounded-3xl max-w-6xl w-full border border-slate-200 shadow-2xl relative max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="p-3 bg-emerald-800 text-amber-400 rounded-2xl shadow-sm shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900">Section {rosterModalSection.section} · Marks Desk</h3>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full font-bold text-xs">{rosterModalSection.stream}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">View only. Marks are entered by each subject teacher in the Teacher Portal.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => window.print()} title="Print section record" className="btn-academic hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> {lang === 'am' ? 'አትም' : 'Print'}
                  </button>
                  <button onClick={closeDesk} aria-label="Close" className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Class summary strip */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { k: 'Students', v: String(Math.max(roster.length, head(rosterModalSection).total)), tone: 'text-slate-900' },
                  { k: 'Class average', v: classAvg !== null ? `${classAvg}%` : '–', tone: 'text-emerald-700' },
                  { k: 'Top average', v: topAvg !== null ? `${topAvg}%` : '–', tone: 'text-slate-900' },
                  { k: 'Below 50%', v: String(below), tone: below ? 'text-rose-700' : 'text-slate-900' }
                ].map((c) => (
                  <div key={c.k} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.k}</div>
                    <div className={`font-display font-bold text-lg leading-tight ${c.tone}`}>{c.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split view */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 p-4 sm:p-5 flex-1 overflow-hidden min-h-0">
              {/* Roster */}
              <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white min-h-[220px]">
                <div className="p-2.5 border-b border-slate-200 bg-slate-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={deskQuery} onChange={(e) => setDeskQuery(e.target.value)} placeholder={`Search ${roster.length} ${roster.length === 1 ? 'student' : 'students'}…`}
                      className="w-full h-9 pl-8 pr-3 rounded-full border border-slate-200 bg-white text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {shown.length > 0 ? shown.map((st) => {
                    const isSel = live?.id === st.id;
                    const av = avgOf(st);
                    const tone = av === null ? null : gradeTone(getEthiopianLetterGrade(av).letter);
                    return (
                      <button
                        key={st.id} type="button" onClick={() => setSelectedStudentForMarks(st)}
                        className={`w-full text-left p-3 flex items-center gap-3 cursor-pointer transition-colors border-l-4 ${isSel ? 'bg-emerald-50 border-emerald-600' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        {st.avatar
                          ? <img src={st.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                          : <span className="avatar-monogram w-10 h-10 rounded-full text-xs shrink-0">{st.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs truncate">{st.fullName}</div>
                          <div className="text-[11px] text-slate-400 truncate font-mono">{st.studentId}</div>
                          {st.cteSpecialization && <span className="inline-block mt-0.5 px-1.5 rounded text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200">CTE · {st.cteSpecialization}</span>}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="text-[11px] font-bold text-slate-700">{medal(st.rank)} #{st.rank}</div>
                          {tone && av !== null && <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${tone.chip}`}>{av}%</span>}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <Users className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                      {roster.length === 0
                        ? <>This section has <strong>{head(rosterModalSection).total}</strong> {head(rosterModalSection).total === 1 ? 'student' : 'students'} in the registry, but the student {head(rosterModalSection).total === 1 ? 'file is' : 'files are'} not linked to this class yet.</>
                        : 'No student matches your search.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Marks card */}
              <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white min-h-[260px]">
                {live ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {live.avatar
                            ? <img src={live.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shrink-0" />
                            : <span className="avatar-monogram w-12 h-12 rounded-full text-sm shrink-0">{live.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>}
                          <div className="min-w-0">
                            <div className="font-black text-sm truncate">{live.fullName}</div>
                            <div className="text-[11px] text-emerald-200 truncate">{live.fullNameAmharic} · {live.studentId}</div>
                            <div className="text-[10px] text-slate-300 truncate">Grade {live.grade} “{live.section}” · Homeroom: {live.homeroomTeacher}</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/30 shrink-0">{medal(live.rank)} Rank #{live.rank}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        {[
                          { k: 'Total', v: `${Math.round(liveTotal * 10) / 10}/${liveSubjects.length * 100}` },
                          { k: 'Average', v: liveAvg !== null ? `${liveAvg}%` : '–' },
                          { k: 'Passed', v: `${passed}/${liveSubjects.length}` }
                        ].map((c) => (
                          <div key={c.k} className="rounded-xl bg-white/10 border border-white/10 py-1.5">
                            <div className="text-[9px] uppercase tracking-wider text-slate-300">{c.k}</div>
                            <div className="font-mono font-bold text-sm">{c.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700">Semester 1 · Assessment 30 + Mid 20 + Final 50 = 100</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-bold"><ShieldCheck className="w-3 h-3" /> View only</span>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-xs border-separate border-spacing-0">
                        <thead>
                          <tr className="text-slate-600">
                            <th className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-left py-2.5 px-4 font-semibold min-w-[150px]">Subject</th>
                            {[['Assess', 30], ['Mid', 20], ['Final', 50]].map(([n, m]) => (
                              <th key={n as string} className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 py-2 px-1 text-center font-semibold">
                                {n}<span className="block text-[10px] font-mono text-slate-400 font-normal">out of {m}</span>
                              </th>
                            ))}
                            <th className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 py-2.5 px-3 text-center font-semibold min-w-[110px]">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveSubjects.map((sub) => {
                            const total = calculateTotalScore(sub.continuousAssessment, sub.midExam, sub.finalExam);
                            const letter = getEthiopianLetterGrade(total).letter;
                            const tone = gradeTone(letter);
                            const cells: ('continuousAssessment' | 'midExam' | 'finalExam')[] = ['continuousAssessment', 'midExam', 'finalExam'];
                            return (
                              <tr key={sub.subjectId} className="group">
                                <td className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-4">
                                  <div className="font-bold text-slate-900 truncate max-w-[200px]">{sub.subjectName}</div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{sub.subjectAmharic} · {sub.teacherName}</div>
                                </td>
                                {cells.map((field) => (
                                  <td key={field} className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-1 text-center">
                                    <span className="inline-block w-14 text-center font-mono text-sm font-semibold text-slate-800 tabular-nums">
                                      {sub[field] ? Math.round(sub[field] * 10) / 10 : <span className="text-slate-300">–</span>}
                                    </span>
                                  </td>
                                ))}
                                <td className="border-b border-slate-100 group-hover:bg-slate-50 py-2 px-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="font-mono font-bold text-sm tabular-nums text-slate-900">{total}</span>
                                      <span className="h-1 w-14 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                                        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, total)}%` }} />
                                      </span>
                                    </div>
                                    <span className={`inline-block min-w-9 text-center px-2 py-1 rounded-lg font-mono font-bold text-[11px] ${tone.chip}`}>{letter}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 my-auto">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Select a student from the roster</p>
                    <p className="text-[11px] text-slate-400 mt-1">Their marks for every subject will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500">FDRE MoE Secondary Grading Standard · 50% pass threshold</span>
              <button onClick={closeDesk} className="btn-academic px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-full text-xs font-bold cursor-pointer">
                Close Desk
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
