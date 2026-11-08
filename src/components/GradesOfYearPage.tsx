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
import { getStudentsForSection as getStudentsForSectionUtil } from '../utils/sectionUtils';

interface GradesOfYearPageProps {
  sections: GradeSection[];
  onUpdateSection: (updated: GradeSection) => void;
  teachers: Teacher[];
  students: Student[];
  onUpdateStudents?: (updated: Student[]) => void;
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

export const GradesOfYearPage: React.FC<GradesOfYearPageProps> = ({
  sections,
  onUpdateSection,
  teachers,
  students,
  onUpdateStudents,
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
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');

  const [saveToast, setSaveToast] = useState<string>('');

  // Summary calculations
  const totalStudents = sections.reduce((acc, s) => acc + s.totalStudents, 0);
  const totalMale = sections.reduce((acc, s) => acc + s.maleStudents, 0);
  const totalFemale = sections.reduce((acc, s) => acc + s.femaleStudents, 0);
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

  // Handle mark change for a student in the modal
  const handleStudentMarkEdit = (
    studentId: string,
    subjectId: string,
    field: 'continuousAssessment' | 'midExam' | 'finalExam',
    val: number
  ) => {
    if (!onUpdateStudents) return;

    const updatedList = students.map((st) => {
      if (st.id !== studentId) return st;
      const semesters = st.semesters.map((sem) => {
        if (sem.semester !== 1) return sem;
        const subjects = sem.subjects.map((sub) => {
          if (sub.subjectId !== subjectId) return sub;
          return {
            ...sub,
            [field]: Math.max(0, val)
          };
        });
        return { ...sem, subjects };
      });
      return { ...st, semesters };
    });

    onUpdateStudents(updatedList);

    // Also update currently inspected student
    const current = updatedList.find((s) => s.id === studentId);
    if (current) {
      setSelectedStudentForMarks(current);
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold text-sm">{saveToast}</span>
        </div>
      )}

      {/* Top Navigation Bar for Admin Suite */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="btn-animated px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'am' ? '← ወደ አድሚን ዴስክ' : '← Back to admin'}</span>
            </button>
          )}
          {onNavigateToRegistrar && (
            <button
              onClick={onNavigateToRegistrar}
              className="btn-animated px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-950" />
              <span>{lang === 'am' ? 'ምዝገባ (2017 ዓ.ም.) →' : 'Registrar →'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="View Public School Website"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'am' ? 'ድረ-ገጽ' : 'Public Site'}</span>
            </button>
          )}
          {onSignOutAdmin && (
            <button
              onClick={onSignOutAdmin}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Sign out of Administrator Suite"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
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
                  {lang === 'am' ? 'የትምህርት ሚኒስቴር የ2017 ዓ.ም' : 'FDRE Ministry of Education • 2017 E.C.'}
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
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">
              {lang === 'am' ? 'የትምህርት ዘርፍ (Stream):' : 'Stream:'}
            </span>
            <select
              value={selectedStreamFilter}
              onChange={(e) => setSelectedStreamFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Streams (ሁሉም ዘርፎች)</option>
              <option value="General Secondary">General Secondary (9th & 10th)</option>
              <option value="Natural Science">Natural Science (የተፈጥሮ ሳይንስ)</option>
              <option value="Social Science">Social Science (የማህበራዊ ሳይንስ)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">
              {lang === 'am' ? 'ፈረቃ (Shift):' : 'Shift:'}
            </span>
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Shifts (ሁለቱም ፈረቃዎች)</option>
              <option value="Morning">Morning Shift (ጧት: 8:00 AM - 12:30 PM)</option>
              <option value="Afternoon">Afternoon Shift (ከሰዓት: 12:45 PM - 5:15 PM)</option>
            </select>
          </div>

          <div className="ml-auto text-slate-500 text-[11px] font-semibold">
            Showing <strong className="text-slate-900">{filteredSections.length}</strong> of{' '}
            {sections.length} sections (Full-Width View)
          </div>
        </div>
      </div>

      {/* FULL-WIDTH SECTIONS LIST (1 section per row, full wide as requested) */}
      <div className="flex flex-col gap-6 w-full">
        {filteredSections.length === 0 ? (
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
        ) : (
          filteredSections.map((sec) => {
          const malePct = Math.round((sec.maleStudents / sec.totalStudents) * 100);
          const femalePct = 100 - malePct;
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
                        <span>{sec.totalStudents}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          (M: {sec.maleStudents} • F: {sec.femaleStudents})
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
                <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden flex" title={`Male: ${sec.maleStudents} (${malePct}%) | Female: ${sec.femaleStudents} (${femalePct}%)`}>
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
                    : `View full roster of ${sec.totalStudents} students and inspect their marks across all subjects`}
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
      {rosterModalSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => {
                setRosterModalSection(null);
                setSelectedStudentForMarks(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-emerald-800 text-amber-400 rounded-2xl shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      Section {rosterModalSection.section} Students & Marks Desk
                    </h3>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full font-bold text-xs">
                      {rosterModalSection.stream}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any student to view or edit their exact marks across all subjects (Math, Physics, English, Chemistry, Biology, etc.)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300 transition-colors"
                  title="Print official section record and student mark roster"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>{lang === 'am' ? 'የክፍል ሪከርድ አትም' : 'Print Section Record'}</span>
                </button>
              </div>
            </div>

            {/* Split View: Left Student Roster, Right Marks Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-hidden min-h-0">
              {/* Left Column: Student List (4 cols) */}
              <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-extrabold text-xs text-slate-700 flex items-center justify-between">
                  <span>Enrolled Students ({getStudentsForSection(rosterModalSection).length})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Select to view marks</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {getStudentsForSection(rosterModalSection).length > 0 ? (
                    getStudentsForSection(rosterModalSection).map((st) => {
                      const isSelected = selectedStudentForMarks?.id === st.id;
                      return (
                        <div
                          key={st.id}
                          onClick={() => setSelectedStudentForMarks(st)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 border-l-4 border-emerald-600'
                              : 'hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={st.avatar}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate">
                                {st.fullName}
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                ID: {st.studentId} • Conduct: <strong>{st.conduct}</strong>
                              </span>
                              {st.cteSpecialization && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                  🛠️ CTE: {st.cteSpecialization}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Rank #{st.rank}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>
                        This section currently has <strong>{rosterModalSection.totalStudents}</strong> students recorded in the MoE registry database.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Full individual interactive mark entry is enabled for all enrolled classes.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Selected Student's Marks Breakdown Across All Subjects (7 cols) */}
              <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {selectedStudentForMarks ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Student Top Mini Banner */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedStudentForMarks.avatar}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shadow-sm"
                        />
                        <div>
                          <div className="font-black text-sm text-white">
                            {selectedStudentForMarks.fullName}
                          </div>
                          <div className="text-[11px] text-emerald-200">
                            {selectedStudentForMarks.fullNameAmharic} • {selectedStudentForMarks.studentId}
                          </div>
                          <div className="text-[10px] text-slate-300 mt-0.5">
                            Grade {selectedStudentForMarks.grade} &quot;{selectedStudentForMarks.section}&quot; • Homeroom: {selectedStudentForMarks.homeroomTeacher}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30">
                          Rank #{selectedStudentForMarks.rank}
                        </span>
                        <div className="text-[11px] text-slate-300 mt-1">
                          Attendance: {selectedStudentForMarks.attendanceRate}%
                        </div>
                      </div>
                    </div>

                    {/* All Subjects Marks Table */}
                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">
                          Semester 1 Official Subject Marks (Continuous 30% + Mid 20% + Final 50% = 100%)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Editable inputs
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                        <div className="bg-slate-100/80 p-2.5 font-bold text-slate-600 grid grid-cols-12 text-[11px] uppercase tracking-wider">
                          <span className="col-span-4">Subject & Instructor</span>
                          <span className="col-span-2 text-center">Assess (30)</span>
                          <span className="col-span-2 text-center">Mid (20)</span>
                          <span className="col-span-2 text-center">Final (50)</span>
                          <span className="col-span-2 text-right">Total / Grade</span>
                        </div>

                        {selectedStudentForMarks.semesters[0]?.subjects.map((sub) => {
                          const total = calculateTotalScore(
                            sub.continuousAssessment,
                            sub.midExam,
                            sub.finalExam
                          );
                          const gradeObj = getEthiopianLetterGrade(total);
                          const letter = gradeObj.letter;

                          return (
                            <div
                              key={sub.subjectId}
                              className="p-2.5 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors"
                            >
                              <div className="col-span-4 min-w-0 pr-1">
                                <div className="font-bold text-slate-900 truncate">
                                  {sub.subjectName}
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {sub.subjectAmharic} • {sub.teacherName}
                                </span>
                              </div>

                              {/* Continuous Assessment input */}
                              <div className="col-span-2 text-center px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={30}
                                  value={sub.continuousAssessment}
                                  onChange={(e) =>
                                    handleStudentMarkEdit(
                                      selectedStudentForMarks.id,
                                      sub.subjectId,
                                      'continuousAssessment',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-12 text-center py-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Mid Exam input */}
                              <div className="col-span-2 text-center px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={sub.midExam}
                                  onChange={(e) =>
                                    handleStudentMarkEdit(
                                      selectedStudentForMarks.id,
                                      sub.subjectId,
                                      'midExam',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-12 text-center py-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Final Exam input */}
                              <div className="col-span-2 text-center px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  value={sub.finalExam}
                                  onChange={(e) =>
                                    handleStudentMarkEdit(
                                      selectedStudentForMarks.id,
                                      sub.subjectId,
                                      'finalExam',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-12 text-center py-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Total & Ethiopian Letter Grade */}
                              <div className="col-span-2 text-right">
                                <span className="font-black text-slate-900 text-sm">
                                  {total}
                                </span>
                                <span
                                  className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                                    letter === 'A'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : letter === 'B'
                                      ? 'bg-blue-100 text-blue-800'
                                      : letter === 'C'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {letter}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 my-auto">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Select a student from the left roster</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Their comprehensive marks across all subjects will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-3">
              <span className="text-[11px] text-slate-500">
                FDRE MoE Secondary Grading Standard (50% Pass Threshold, Conduct Rating A-D)
              </span>
              <button
                onClick={() => {
                  setRosterModalSection(null);
                  setSelectedStudentForMarks(null);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Desk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
