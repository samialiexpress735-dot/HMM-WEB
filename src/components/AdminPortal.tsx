import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Key,
  Users,
  Printer,
  Copy,
  CheckCircle,
  Building2,
  Lock,
  Mail,
  Phone,
  BookOpen,
  Award,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Search,
  Filter,
  Check,
  Layers,
  LogIn,
  LogOut,
  Edit3,
  Database,
  UploadCloud,
  AlertTriangle,
  Trash2,
  Calendar,
  Bell,
  X,
  Shuffle,
  GraduationCap,
  FileText,
  Globe
} from 'lucide-react';
import { Teacher, Student, GradeSection, SchoolEvent, SchoolAnnouncement } from '../data/schoolData';
import { UserAccount, generateStaffPassword, generateStudentPasscode } from '../utils/authUtils';
import { getSectionsAssignedToTeacher, getStudentsForSection } from '../utils/sectionUtils';
import {
  syncTeacherToCloud,
  updateAdminProfileInCloud,
  syncSubAdminToCloud,
  fetchSubAdminsFromCloud
} from '../lib/supabase';

import { AdminUser } from './AdminSignupPage';
import { DualDatePicker } from './DualDatePicker';
import { academicYearLabel, academicYearShort, currentAcademicYear, currentEcLabel, currentEcYear, formatDualDate, formatEthiopian, formatGregorian, todayISO } from '../utils/ethiopianCalendar';
import { DualDate } from './DualDate';

interface AdminPortalProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string) => void;
  students: Student[];
  onUpdateStudents?: (students: Student[]) => void;
  sections?: GradeSection[];
  events?: SchoolEvent[];
  onAddEvent?: (event: SchoolEvent) => void;
  announcements?: SchoolAnnouncement[];
  onAddAnnouncement?: (announcement: SchoolAnnouncement) => void;
  lang: 'en' | 'am';
  adminUser?: AdminUser | null;
  onNavigateToGrades?: () => void;
  onNavigateToRegistrar?: () => void;
  onNavigateHome?: () => void;
  onSignOut?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  teachers,
  onAddTeacher,
  onDeleteTeacher,
  students,
  onUpdateStudents,
  sections = [],
  events = [],
  onAddEvent,
  announcements = [],
  onAddAnnouncement,
  lang,
  adminUser,
  onNavigateToGrades,
  onNavigateToRegistrar,
  onNavigateHome,
  onSignOut
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'staff' | 'students' | 'credentials' | 'notices' | 'school'>('overview');
  const [showAddTeacherDrawer, setShowAddTeacherDrawer] = useState<boolean>(false);
  const [showAddSubAdminDrawer, setShowAddSubAdminDrawer] = useState<boolean>(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Student Search & Dossier States
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentGradeFilter, setStudentGradeFilter] = useState<number | 'all'>('all');
  const [studentSectionFilter, setStudentSectionFilter] = useState<string>('all');
  const [studentStreamFilter, setStudentStreamFilter] = useState<string>('all');
  const [selectedStudentDossier, setSelectedStudentDossier] = useState<Student | null>(null);
  const [showQuickEnrollModal, setShowQuickEnrollModal] = useState<boolean>(false);

  // Quick Enroll Student Form
  const [newStudentFullName, setNewStudentFullName] = useState<string>('');
  const [newStudentFullNameAmharic, setNewStudentFullNameAmharic] = useState<string>('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [newStudentGrade, setNewStudentGrade] = useState<number>(9);
  const [newStudentSection, setNewStudentSection] = useState<string>('A');
  const [newStudentStream, setNewStudentStream] = useState<'General Secondary' | 'Natural Science' | 'Social Science'>('General Secondary');
  const [newStudentGuardian, setNewStudentGuardian] = useState<string>('');
  const [newStudentGuardianPhone, setNewStudentGuardianPhone] = useState<string>('+251 91 ');

  const handleQuickEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFullName.trim()) {
      setSuccessBanner('Please enter student full name.');
      return;
    }

    const nextIdNum = String(students.length + 1).padStart(4, '0');
    const studentId = `HMM-${currentAcademicYear().gcStart}-${nextIdNum}`; // G.C. year the school year starts in

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      studentId: studentId,
      fullName: newStudentFullName.trim(),
      fullNameAmharic: newStudentFullNameAmharic.trim() || newStudentFullName.trim(),
      gender: newStudentGender,
      grade: newStudentGrade,
      section: newStudentSection.toUpperCase(),
      stream: newStudentGrade >= 11 && (newStudentStream === 'Natural Science' || newStudentStream === 'Social Science') ? newStudentStream : undefined,
      streamAmharic: newStudentGrade >= 11 ? (newStudentStream === 'Natural Science' ? 'የተፈጥሮ ሳይንስ' : 'የማህበራዊ ሳይንስ') : undefined,
      academicYear: academicYearShort(undefined, 'am'),
      rank: students.filter((s) => s.grade === newStudentGrade && s.section === newStudentSection.toUpperCase()).length + 1,
      totalStudentsInSection: students.filter((s) => s.grade === newStudentGrade && s.section === newStudentSection.toUpperCase()).length + 1,
      attendanceRate: 98.0,
      conduct: 'A',
      homeroomTeacher: 'Not assigned yet',
      guardianName: newStudentGuardian.trim() || 'Parent / Guardian',
      guardianPhone: newStudentGuardianPhone.trim(),
      attendanceStatus: 'Present',
      semesters: [
        {
          semester: 1,
          subjects: [
            { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherName: 'Faculty', continuousAssessment: 26, midExam: 17, finalExam: 42 },
            { subjectId: 'phys', subjectName: 'Physics', subjectAmharic: 'ፊዚክስ', teacherName: 'Faculty', continuousAssessment: 25, midExam: 16, finalExam: 40 },
            { subjectId: 'chem', subjectName: 'Chemistry', subjectAmharic: 'ኬሚስትሪ', teacherName: 'Faculty', continuousAssessment: 24, midExam: 16, finalExam: 41 },
            { subjectId: 'bio', subjectName: 'Biology', subjectAmharic: 'ባዮሎጂ', teacherName: 'Faculty', continuousAssessment: 25, midExam: 18, finalExam: 43 },
            { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherName: 'Faculty', continuousAssessment: 27, midExam: 18, finalExam: 45 },
            { subjectId: 'amh', subjectName: 'Amharic Language', subjectAmharic: 'አማርኛ', teacherName: 'Faculty', continuousAssessment: 26, midExam: 17, finalExam: 44 }
          ]
        },
        {
          semester: 2,
          subjects: [
            { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherName: 'Faculty', continuousAssessment: 27, midExam: 18, finalExam: 44 },
            { subjectId: 'phys', subjectName: 'Physics', subjectAmharic: 'ፊዚክስ', teacherName: 'Faculty', continuousAssessment: 26, midExam: 17, finalExam: 42 },
            { subjectId: 'chem', subjectName: 'Chemistry', subjectAmharic: 'ኬሚስትሪ', teacherName: 'Faculty', continuousAssessment: 25, midExam: 17, finalExam: 43 },
            { subjectId: 'bio', subjectName: 'Biology', subjectAmharic: 'ባዮሎጂ', teacherName: 'Faculty', continuousAssessment: 26, midExam: 19, finalExam: 45 },
            { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherName: 'Faculty', continuousAssessment: 28, midExam: 19, finalExam: 46 },
            { subjectId: 'amh', subjectName: 'Amharic Language', subjectAmharic: 'አማርኛ', teacherName: 'Faculty', continuousAssessment: 27, midExam: 18, finalExam: 45 }
          ]
        }
      ]
    };

    if (onUpdateStudents) {
      onUpdateStudents([newStudent, ...students]);
    }
    setSuccessBanner(`✓ Student "${newStudentFullName}" enrolled successfully! ID: ${studentId}`);
    setNewStudentFullName('');
    setNewStudentFullNameAmharic('');
    setNewStudentGuardian('');
    setNewStudentGuardianPhone('+251 91 ');
    setShowQuickEnrollModal(false);
    setTimeout(() => setSuccessBanner(''), 5000);
  };

  // Available sections list (dynamic from sections data)
  const availableSections = sections.length > 0
    ? Array.from(new Set(sections.map((s) => s.section)))
    : ['9-A', '9-B', '10-A', '11-Nat-A', '12-Nat-A'];

  // Selected section for student credential slips
  const [selectedSection, setSelectedSection] = useState<string>(availableSections[0] || '9-A');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Teacher Form State
  const [teacherName, setTeacherName] = useState('');
  const [teacherNameAmharic, setTeacherNameAmharic] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('Mathematics');
  const [teacherDepartment, setTeacherDepartment] = useState('Natural Sciences');
  const [teacherPhone, setTeacherPhone] = useState('+251 91 ');
  const [teacherEmail, setTeacherEmail] = useState('');

  // New Sub-Admin Form State
  const [subAdminName, setSubAdminName] = useState('');
  const [subAdminRoleTitle, setSubAdminRoleTitle] = useState('Registrar Officer (የሬጅስትራር ሃላፊ)');
  const [subAdminPhone, setSubAdminPhone] = useState('+251 92 ');
  const [subAdminEmail, setSubAdminEmail] = useState('');

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annTitleAmharic, setAnnTitleAmharic] = useState('');
  const [annCategory, setAnnCategory] = useState<'Administrative' | 'Academic' | 'Parent Notice' | 'Examination' | 'General'>('Administrative');
  const [annSummary, setAnnSummary] = useState('');
  const [annIsUrgent, setAnnIsUrgent] = useState(false);

  // New Calendar Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventTitleAmharic, setEventTitleAmharic] = useState('');
  const [eventDate, setEventDate] = useState(todayISO()); // G.C. ISO date; the E.C. date is always derived from it
  const [eventTime, setEventTime] = useState('8:30 AM');
  const [eventLocation, setEventLocation] = useState('School Main Assembly Hall');
  const [eventCategory, setEventCategory] = useState<'Exam' | 'Holiday' | 'Sports' | 'PTA' | 'Academic' | 'Club'>('Academic');
  const [eventDesc, setEventDesc] = useState('');

  // Sub-admins list state - initialized with stored or cloud data
  const [subAdmins, setSubAdmins] = useState<any[]>(() => {
    try {
      const s = localStorage.getItem('hmm_subadmins');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  // Load sub-admins from Supabase profiles on mount
  React.useEffect(() => {
    async function loadCloudSubAdmins() {
      try {
        const cloudSubs = await fetchSubAdminsFromCloud();
        if (cloudSubs && cloudSubs.length > 0) {
          setSubAdmins(cloudSubs);
        }
      } catch (err) {
        console.warn('SubAdmin load error:', err);
      }
    }
    loadCloudSubAdmins();
  }, []);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Admin Profile State & Edit Modal
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(() => {
    return adminUser || {
      fullName: 'Berhanu Wolde Mengesha',
      fullNameAmharic: 'ብርሃኑ ወልደ መንገሻ',
      email: 'director@hailemariammamo.edu.et',
      phone: '+251 91 142 5566',
      roleTitle: 'Principal & School Director',
      adminId: 'DIR-HMM-001',
      dateRegistered: '2024-09-01'
    };
  });
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(currentAdmin.fullName);
  const [editPhone, setEditPhone] = useState(currentAdmin.phone);
  const [editRoleTitle, setEditRoleTitle] = useState(currentAdmin.roleTitle);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminUser = {
      ...currentAdmin,
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      roleTitle: editRoleTitle
    };
    setCurrentAdmin(updated);
    try {
      localStorage.setItem('hmm_school_admin', JSON.stringify(updated));
    } catch {
      // ignore
    }
    await updateAdminProfileInCloud(updated);
    setIsEditProfileOpen(false);
    setSuccessBanner('Administrator profile updated successfully!');
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  // Add Teacher Handler with real email requirement and instant background Supabase Cloud Sync
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setSuccessBanner('Please enter the teacher full name.');
      return;
    }
    if (!teacherEmail.trim()) {
      setSuccessBanner('Please enter the teacher actual email address.');
      return;
    }

    const newId = `t-${Date.now()}`;
    const generatedPass = generateStaffPassword('Teacher', teacherName.split(' ')[0]);

    const newTeacher: Teacher = {
      id: newId,
      name: teacherName.trim(),
      nameAmharic: teacherNameAmharic.trim() || teacherName.trim(),
      department: teacherDepartment,
      subject: teacherSubject,
      gradesTeaching: [9, 10, 11, 12],
      sectionsTeaching: ['Not assigned yet'],
      email: teacherEmail.trim().toLowerCase(),
      phone: teacherPhone.trim(),
      qualification: 'B.Ed. / B.Sc. (Ethiopian University)',
      avatar: '',
      isOnline: true,
      officeHours: 'Mon & Thu: 2:00 PM - 4:00 PM'
    };

    // 1. Optimistic instant UI update
    onAddTeacher(newTeacher);

    // 2. Silent background sync to Supabase database
    syncTeacherToCloud(newTeacher);

    setSuccessBanner(
      `✓ Teacher "${teacherName}" registered successfully with email ${teacherEmail}! Passcode: ${generatedPass}`
    );
    setTeacherName('');
    setTeacherNameAmharic('');
    setTeacherEmail('');
    setTimeout(() => setSuccessBanner(''), 8000);
  };

  // Add Sub-Admin Handler with real email requirement and cloud sync
  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAdminName.trim()) {
      setSuccessBanner('Please enter the staff member name.');
      return;
    }
    if (!subAdminEmail.trim()) {
      setSuccessBanner('Please enter the sub-administrator actual email address.');
      return;
    }

    const newSub = {
      id: `sub-${Date.now()}`,
      name: subAdminName.trim(),
      role: subAdminRoleTitle,
      roleAmharic: 'ረዳት አስተዳዳሪ',
      phone: subAdminPhone.trim(),
      email: subAdminEmail.trim().toLowerCase(),
      passcode: `${subAdminName.trim().toLowerCase().split(' ')[0]}2017!`,
      status: 'Active'
    };

    setSubAdmins((prev) => [...prev, newSub]);
    try {
      localStorage.setItem('hmm_subadmins', JSON.stringify([...subAdmins, newSub]));
    } catch {
      // ignore
    }

    // Direct background sync to Supabase profiles table
    syncSubAdminToCloud(newSub);

    setSuccessBanner(`✓ Sub-Admin "${subAdminName}" registered with email ${newSub.email}! Passcode: ${newSub.passcode}`);
    setSubAdminName('');
    setSubAdminEmail('');
    setTimeout(() => setSuccessBanner(''), 8000);
  };

  // Add Official Announcement Handler
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annSummary.trim()) return;

    const newAnn: SchoolAnnouncement = {
      id: `ann-${Date.now()}`,
      title: annTitle.trim(),
      titleAmharic: annTitleAmharic.trim() || undefined,
      date: todayISO(),
      datePosted: todayISO(),
      category: annCategory,
      postedBy: currentAdmin.fullName || 'School Director',
      summary: annSummary.trim(),
      isUrgent: annIsUrgent
    };

    if (onAddAnnouncement) {
      onAddAnnouncement(newAnn);
    }
    setSuccessBanner(`✓ Announcement "${annTitle}" posted to school portal!`);
    setAnnTitle('');
    setAnnTitleAmharic('');
    setAnnSummary('');
    setAnnIsUrgent(false);
    setTimeout(() => setSuccessBanner(''), 6000);
  };

  // Add Academic Calendar Event Handler
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEv: SchoolEvent = {
      id: `ev-${Date.now()}`,
      title: eventTitle.trim(),
      titleAmharic: eventTitleAmharic.trim() || eventTitle.trim(),
      date: eventDate,
      ethiopianDate: formatEthiopian(eventDate, 'am', { era: false }),
      time: eventTime,
      location: eventLocation,
      category: eventCategory,
      targetGrades: [9, 10, 11, 12],
      description: eventDesc.trim() || 'Official school event scheduled by administration.',
      descriptionAmharic: 'በት/ቤቱ አስተዳደር የተመዘገበ ኦፊሴላዊ የትምህርት ቤት ክንውን'
    };

    if (onAddEvent) {
      onAddEvent(newEv);
    }
    setSuccessBanner(`✓ Calendar Event "${eventTitle}" added for ${formatDualDate(eventDate)}!`);
    setEventTitle('');
    setEventTitleAmharic('');
    setEventDesc('');
    setTimeout(() => setSuccessBanner(''), 6000);
  };

  // Filter students for the credential distribution desk (handles 9A, 11-Nat-A, etc.)
  const sectionStudents = React.useMemo(() => {
    return getStudentsForSection(selectedSection, sections, students);
  }, [selectedSection, sections, students]);

  const filteredStudents = sectionStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Unified Executive Admin Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-slate-950 text-white p-2.5 sm:p-3.5 rounded-2xl">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          <div className="hidden sm:flex px-3.5 py-2 bg-white/10 text-white text-xs font-bold rounded-full items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'am' ? 'የአስተዳዳሪ ዴስክ' : 'Admin'}</span>
          </div>
          {onNavigateToRegistrar && (
            <button
              onClick={onNavigateToRegistrar}
              className="btn-academic min-w-0 flex-1 sm:flex-none justify-center px-3.5 py-2.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-950 shrink-0" />
              <span className="truncate">{lang === 'am' ? `ምዝገባ (${currentEcLabel('am')}) →` : 'Registrar →'}</span>
            </button>
          )}
          {onNavigateToGrades && (
            <button
              onClick={onNavigateToGrades}
              className="min-w-0 flex-1 sm:flex-none justify-center px-3.5 py-2.5 sm:py-2 bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">{lang === 'am' ? 'ክፍሎችና ሴክሽኖች →' : <>Classes<span className="hidden min-[420px]:inline"> & Sections</span> →</>}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3 sm:px-3.5 py-2.5 sm:py-2 bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
              title="View Public School Website"
              aria-label="View Public School Website"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">{lang === 'am' ? 'ድረ-ገጽ' : 'Public Site'}</span>
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-3 sm:px-3.5 py-2.5 sm:py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/20 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
              title="Sign out of Administrator Suite"
              aria-label="Sign out of Administrator Suite"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin header card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="academic-ribbon" />

        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pb-5 sm:pb-6 border-b border-slate-100">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-amber-400 p-0.5 border-2 border-amber-400 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md">
                <span>HMM</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Administration
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {lang === 'am'
                    ? 'የትምህርት ቤት ዋና አስተዳዳሪና የተጠቃሚዎች መቆጣጠሪያ'
                    : 'School director and user accounts'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  Register faculty, create sub-administrators, post school notices, and issue student & parent access slips
                </p>
              </div>
            </div>

            {/* Verified Director Session Card */}
            <div className="p-3.5 bg-[#f5f7fb] rounded-2xl border border-[#d8e0ee] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs shadow-2xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b4635] to-[#0e6b4e] text-[#f6c65c] flex items-center justify-center font-black text-xs border border-[#f2b544]/40 shadow-xs flex-shrink-0">
                  {(currentAdmin.fullName || 'BW').split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#0d1526] flex items-center gap-1.5 truncate">
                    <span className="truncate">{currentAdmin.fullName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Active Admin Session"></span>
                  </div>
                  <span className="text-[11px] text-[#0e6b4e] font-semibold block truncate">
                    {currentAdmin.roleTitle}
                  </span>
                  <div className="text-[10px] text-[#5f7090]">
                    ID: {currentAdmin.adminId} • <span className="text-emerald-700 font-medium">Verified Session</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditFullName(currentAdmin.fullName);
                    setEditPhone(currentAdmin.phone);
                    setEditRoleTitle(currentAdmin.roleTitle);
                    setIsEditProfileOpen(true);
                  }}
                  className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] font-bold bg-[#eaeff7] text-[#0e6b4e] hover:bg-[#d8e0ee] border border-[#d8e0ee] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Edit administrator name, phone, or title"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Profile</span>
                </button>

                {onNavigateHome && (
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-[#d8e0ee] shadow-2xs transition-colors items-center gap-1 cursor-pointer"
                    title="View Public School Website"
                  >
                    <Globe className="w-3 h-3 text-emerald-700" />
                    <span>Public Site</span>
                  </button>
                )}

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="hidden sm:block p-1.5 rounded-lg text-[#5f7090] hover:text-rose-700 hover:bg-rose-50 border border-[#d8e0ee] hover:border-rose-300 transition-colors cursor-pointer"
                    title={lang === 'am' ? 'ከአስተዳዳሪ ዴስክ ውጣ' : 'Sign Out Administrator'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED ADMIN SUB-NAVBAR (Clean, elevated, easy to manage) */}
      <nav className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-1.5 sm:p-2.5 sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Admin sections" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            { id: 'overview', Icon: Shield, en: 'Overview', am: 'አጠቃላይ እይታ' },
            { id: 'staff', Icon: Users, en: 'Staff', am: 'ሰራተኞች', count: teachers.length + subAdmins.length },
            { id: 'students', Icon: Search, en: 'Students', am: 'ተማሪዎች', count: students.length },
            { id: 'credentials', Icon: Key, en: 'Login slips', am: 'የመግቢያ ካርዶች', count: sectionStudents.length },
            { id: 'notices', Icon: BookOpen, en: 'Announcements & events', am: 'ማስታወቂያና ዝግጅቶች', count: announcements.length + events.length },
            { id: 'school', Icon: Building2, en: 'School profile', am: 'የትምህርት ቤት መረጃ' }
          ] as { id: 'overview' | 'staff' | 'students' | 'credentials' | 'notices' | 'school'; Icon: React.ElementType; en: string; am: string; count?: number }[]).map(({ id, Icon, en, am, count }) => {
            const active = activeAdminTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveAdminTab(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{lang === 'am' ? am : en}</span>
                {count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeAdminTab === 'credentials' && (
          <button
            onClick={() => window.print()}
            className="btn-animated px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Section {selectedSection} Credential Slips</span>
          </button>
        )}
      </nav>

      {/* Feedback Success Notice */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {successBanner}
          </span>
        </div>
      )}

      {/* TAB 0: EXECUTIVE SCHOOL OVERVIEW (DEFAULT LANDING VIEW) */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Welcome & Security Banner */}
          <div className="bg-gradient-to-r from-[#070b16] to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Academic Year: {academicYearLabel('en')} · Term 1 In Session</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {lang === 'am' ? 'የትምህርት ቤቱ አስተዳደር መቆጣጠሪያ ማዕከል' : 'School overview'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Welcome, <strong>{currentAdmin.fullName}</strong>. Manage institutional operations, curriculum sections, faculty appointments, and student report card credentials from one unified center.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                {onNavigateToRegistrar && (
                  <button
                    type="button"
                    onClick={onNavigateToRegistrar}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-sm transition-transform cursor-pointer hover:scale-105"
                  >
                    <Shuffle className="w-4 h-4 text-emerald-950" />
                    <span>Distribute Sections ({currentEcLabel('en')})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('staff')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>View Staff Roster</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* KPI 1: Enrolled Students */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Enrolled Students
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">{students.length.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="font-semibold text-emerald-700">Gr 9: {students.filter((st) => st.grade === 9).length}</span> •
                <span className="font-semibold text-slate-700">Gr 10: {students.filter((st) => st.grade === 10).length}</span> •
                <span className="font-semibold text-amber-700">Gr 11: {students.filter((st) => st.grade === 11).length}</span> •
                <span className="font-semibold text-slate-700">Gr 12: {students.filter((st) => st.grade === 12).length}</span>
              </div>
            </div>

            {/* KPI 2: Certified Faculty */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Verified Faculty Staff
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {teachers.length + subAdmins.length} Staff
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>All authenticated with secure passcodes</span>
              </div>
            </div>

            {/* KPI 3: Active Sections */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Class Sections
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {sections.length > 0 ? sections.length : 12} Sections
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span>Avg class size: <strong>42 students</strong></span>
              </div>
            </div>

            {/* KPI 4: Academic Health Index */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Promotion / Pass Rate
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">82.4%</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-emerald-700 font-bold">+4.2%</span>
                <span>vs last academic year</span>
              </div>
            </div>
          </div>

          {/* Quick Administrative Action Center */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Administrative Command Shortcuts</h3>
                <p className="text-xs text-slate-500">Fast access to key workflows without navigating forms</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Admin Controls
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Shortcut 1: Section Allocation */}
              <div
                onClick={onNavigateToRegistrar}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Shuffle className="w-5 h-5 text-emerald-800" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-800">
                  Section Balancing ({currentEcLabel('en')})
                </h4>
                <p className="text-xs text-slate-500">
                  Automated gender/merit distribution, capacity limits, and student drag/drop transfers.
                </p>
              </div>

              {/* Shortcut 2: Staff Roster */}
              <div
                onClick={() => setActiveAdminTab('staff')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5 text-blue-800" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-800">
                  Staff Roster Directory
                </h4>
                <p className="text-xs text-slate-500">
                  View certified faculty list, assign classes, or optionally register new instructors.
                </p>
              </div>

              {/* Shortcut 3: Student Search & Dossier */}
              <div
                onClick={() => setActiveAdminTab('students')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Search className="w-5 h-5 text-teal-800" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-800">
                  Student Search & Dossiers
                </h4>
                <p className="text-xs text-slate-500">
                  Instant student file lookup, conduct rating, guardian contacts, and mark transcripts.
                </p>
              </div>

              {/* Shortcut 4: Student Passcodes */}
              <div
                onClick={() => setActiveAdminTab('credentials')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Key className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-800">
                  Student Passcode Slips
                </h4>
                <p className="text-xs text-slate-500">
                  Generate and print unique student & parent grade report card credential slips.
                </p>
              </div>

              {/* Shortcut 5: Notices */}
              <div
                onClick={() => setActiveAdminTab('notices')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-purple-800" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-800">
                  School Bulletins & Calendar
                </h4>
                <p className="text-xs text-slate-500">
                  Publish official notices, examination schedules, and PTA assemblies to school portal.
                </p>
              </div>
            </div>
          </div>

          {/* 2-Column: Recent Bulletins & Security Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Announcements */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-700" />
                  <span>Recent School Announcements</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('notices')}
                  className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Post Notice +
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
                {announcements.slice(0, 4).map((ann) => (
                  <div key={ann.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ann.title}</span>
                      <DualDate date={ann.date} lang={lang} className="text-[10px] text-slate-500" />
                    </div>
                    <p className="text-slate-600 mt-1 line-clamp-2">{ann.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Security Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>Security & Integrity Guard</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Strict Protection Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">1-Click Login Vulnerability Eliminated</strong>
                    <span className="text-slate-600 text-[11px]">
                      All faculty and registrar desks now strictly require passcode challenge verification.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Registrar Desk Restricted</strong>
                    <span className="text-slate-600 text-[11px]">
                      Unauthenticated student intake is locked. Only verified administrators can access student records.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Timetable Conflict Engine Active</strong>
                    <span className="text-slate-600 text-[11px]">
                      Zero period clashes detected. Teachers are protected from double-booking.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: STAFF PROVISIONING (TEACHERS & SUB-ADMINS) */}
      {activeAdminTab === 'staff' && (() => {
        const filteredTeachers = teachers.filter((t) => {
          const q = staffSearchQuery.trim().toLowerCase();
          const matchesSearch = !q ||
            t.name.toLowerCase().includes(q) ||
            (t.nameAmharic && t.nameAmharic.toLowerCase().includes(q)) ||
            (t.email && t.email.toLowerCase().includes(q)) ||
            (t.subject && t.subject.toLowerCase().includes(q)) ||
            (t.department && t.department.toLowerCase().includes(q)) ||
            (t.phone && t.phone.toLowerCase().includes(q));

          const natSciSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'ICT'];
          const socSciSubjects = ['Geography', 'History', 'Civics', 'Economics'];
          const langSubjects = ['English Language', 'English', 'Amharic'];

          const matchesDept = staffDeptFilter === 'all' ||
            (staffDeptFilter === 'Natural Sciences' && (t.department === 'Natural Sciences' || natSciSubjects.includes(t.subject))) ||
            (staffDeptFilter === 'Social Sciences' && (t.department === 'Social Sciences' || socSciSubjects.includes(t.subject))) ||
            (staffDeptFilter === 'Languages' && (t.department === 'Languages' || langSubjects.includes(t.subject)));

          return matchesSearch && matchesDept;
        });

        const filteredSubAdmins = subAdmins.filter((sub) => {
          const q = staffSearchQuery.trim().toLowerCase();
          const matchesSearch = !q ||
            sub.name.toLowerCase().includes(q) ||
            (sub.email && sub.email.toLowerCase().includes(q)) ||
            (sub.role && sub.role.toLowerCase().includes(q)) ||
            (sub.phone && sub.phone.toLowerCase().includes(q));

          const matchesDept = staffDeptFilter === 'all' || staffDeptFilter === 'Admin';
          return matchesSearch && matchesDept;
        });

        return (
          <div className="space-y-6">
            {/* Top Action Bar & Directory Controls */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-700" />
                    <span>Faculty & Staff Directory ({teachers.length + subAdmins.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified educator accounts, assigned subjects, and secure login passcodes
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTeacherDrawer(!showAddTeacherDrawer);
                      if (showAddSubAdminDrawer) setShowAddSubAdminDrawer(false);
                    }}
                    className={`btn-animated px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showAddTeacherDrawer
                        ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-500'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{showAddTeacherDrawer ? 'Close Teacher Form' : '+ Register Teacher'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubAdminDrawer(!showAddSubAdminDrawer);
                      if (showAddTeacherDrawer) setShowAddTeacherDrawer(false);
                    }}
                    className={`btn-animated px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showAddSubAdminDrawer
                        ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>{showAddSubAdminDrawer ? 'Close form' : '+ Add administrator'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Drawer 1: Register Teacher Form */}
              {showAddTeacherDrawer && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border-2 border-emerald-300 shadow-md transition-all">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                        <UserPlus className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Register New Subject Teacher (አዲስ መምህር መመዝገቢያ)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Creates faculty credentials and automatically generates a secure temporary passcode
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddTeacherDrawer(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      await handleCreateTeacher(e);
                      setShowAddTeacherDrawer(false);
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs"
                  >
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Teacher Full Name (English):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Ato Yonas Bekele"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Teacher Full Name (አማርኛ):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., አቶ ዮናስ በቀለ"
                        value={teacherNameAmharic}
                        onChange={(e) => setTeacherNameAmharic(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Department:</label>
                      <select
                        value={teacherDepartment}
                        onChange={(e) => setTeacherDepartment(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="Natural Sciences">Natural Sciences (የተፈጥሮ ሳይንስ)</option>
                        <option value="Social Sciences">Social Sciences (የማህበራዊ ሳይንስ)</option>
                        <option value="Languages">Languages (ቋንቋዎች)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Primary Subject:</label>
                      <select
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="English Language">English Language</option>
                        <option value="Amharic">Amharic</option>
                        <option value="Geography">Geography</option>
                        <option value="History">History</option>
                        <option value="Civics">Civics</option>
                        <option value="ICT">ICT</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Phone Number (+251):</label>
                      <input
                        type="tel"
                        required
                        placeholder="+251 91 123 4567"
                        value={teacherPhone}
                        onChange={(e) => setTeacherPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Teacher Real Email (የአስተማሪው እውነተኛ ኢሜይል):
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g., yonas.bekele@gmail.com"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between pt-2">
                      <p className="text-[11px] text-slate-500 italic">
                        Tip: you can assign homeroom teachers later in Classes &amp; Sections.
                      </p>
                      <button
                        type="submit"
                        className="btn-animated px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        + Register & Issue Teacher Credentials
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Collapsible Drawer 2: Register Sub-Admin Form */}
              {showAddSubAdminDrawer && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-amber-50/50 border-2 border-slate-400 shadow-md transition-all">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                        <Shield className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Register Sub-Administrator (ረዳት አስተዳዳሪ መመዝገቢያ)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Registrar Desk, Vice Principal - Academics, Examination Officer
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddSubAdminDrawer(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      await handleCreateSubAdmin(e);
                      setShowAddSubAdminDrawer(false);
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs"
                  >
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Staff Full Name:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., W/ro Bethlehem Tadesse"
                        value={subAdminName}
                        onChange={(e) => setSubAdminName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Administrative Role:
                      </label>
                      <select
                        value={subAdminRoleTitle}
                        onChange={(e) => setSubAdminRoleTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="Registrar Officer (የሬጅስትራር ሃላፊ)">Registrar Officer (የሬጅስትራር ሃላፊ)</option>
                        <option value="Vice Principal - Academics (ምክትል ርዕሰ-መምህር)">Vice Principal - Academics (ምክትል ርዕሰ-መምህር)</option>
                        <option value="Examination Officer (የፈተና ሃላፊ)">Examination Officer (የፈተና ሃላፊ)</option>
                        <option value="Student Dean (የተማሪዎች ዲን)">Student Dean (የተማሪዎች ዲን)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Phone Number:</label>
                      <input
                        type="tel"
                        required
                        placeholder="+251 92 110 9988"
                        value={subAdminPhone}
                        onChange={(e) => setSubAdminPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Staff Real Email Address:
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g., betty.tadesse@gmail.com"
                        value={subAdminEmail}
                        onChange={(e) => setSubAdminEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
                      <button
                        type="submit"
                        className="btn-animated px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        + Register Sub-Admin
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search staff by name, email, subject, phone..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                  {staffSearchQuery && (
                    <button
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setStaffDeptFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      staffDeptFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Staff ({teachers.length + subAdmins.length})
                  </button>
                  <button
                    onClick={() => setStaffDeptFilter('Natural Sciences')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      staffDeptFilter === 'Natural Sciences'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Natural Sciences
                  </button>
                  <button
                    onClick={() => setStaffDeptFilter('Social Sciences')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      staffDeptFilter === 'Social Sciences'
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Social Sciences
                  </button>
                  <button
                    onClick={() => setStaffDeptFilter('Languages')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      staffDeptFilter === 'Languages'
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Languages
                  </button>
                  <button
                    onClick={() => setStaffDeptFilter('Admin')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      staffDeptFilter === 'Admin'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Officers ({subAdmins.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Staff Cards Grid */}
            <div className="space-y-6">
              {/* Subject Teachers Section */}
              {staffDeptFilter !== 'Admin' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-700" />
                        <span>Subject Teachers ({filteredTeachers.length})</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Assigned educators with generated credentials and class allocations
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      Debre Berhan Secondary
                    </span>
                  </div>

                  {filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
                        <UserPlus className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="font-bold text-slate-800 text-xs">No Teachers Found</div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {staffSearchQuery
                          ? `No teachers match "${staffSearchQuery}". Try adjusting your search query.`
                          : 'Click "+ Register Teacher" above to enroll your first faculty member.'}
                      </p>
                      {staffSearchQuery && (
                        <button
                          onClick={() => setStaffSearchQuery('')}
                          className="mt-2 text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTeachers.map((t) => {
                        const staffPass = generateStaffPassword('Teacher', t.name.split(' ')[0]);
                        const initials = t.name
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('');

                        return (
                          <div
                            key={t.id}
                            className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-emerald-300 hover:bg-white transition-all flex flex-col justify-between gap-3 text-xs shadow-2xs"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {initials || 'TR'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 truncate">{t.name}</span>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                    {t.subject}
                                  </span>
                                  {t.nameAmharic && (
                                    <span className="text-[11px] text-slate-400 font-medium truncate">
                                      {t.nameAmharic}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] mt-1 truncate">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{t.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{t.phone || '+251 91 100 0000'}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Classes:{' '}
                                  <strong className="text-slate-800">
                                    {getSectionsAssignedToTeacher(t, sections).join(', ') || 'Unassigned'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 gap-2">
                              <div className="p-1.5 px-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center gap-1.5">
                                <Key className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="text-slate-400">Pass:</span>
                                <strong className="text-slate-900 font-bold">{staffPass}</strong>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(`${t.email} / ${staffPass}`, t.id)}
                                  className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                                  title="Copy login credentials"
                                >
                                  {copiedId === t.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                {onDeleteTeacher && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remove ${t.name} from faculty directory?`)) {
                                        onDeleteTeacher(t.id);
                                        setSuccessBanner(`Removed ${t.name} from faculty directory.`);
                                        setTimeout(() => setSuccessBanner(''), 3000);
                                      }
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer border border-rose-200"
                                    title={`Remove ${t.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Administrators Section */}
              {(staffDeptFilter === 'all' || staffDeptFilter === 'Admin') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span>Administrative Officers & Deans ({filteredSubAdmins.length})</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Registrars, academic vice-principals, examination coordinators
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                      Office of the Registrar
                    </span>
                  </div>

                  {filteredSubAdmins.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                      No administrative officers found matching criteria. Use &quot;+ Add Sub-Admin&quot; above to register.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredSubAdmins.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-amber-300 hover:bg-white transition-all flex flex-col justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900">{sub.name}</span>
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                                  {sub.role}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 text-[11px] mt-1 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{sub.email}</span>
                              </div>
                              {sub.phone && (
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{sub.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 gap-2">
                            <div className="p-1.5 px-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center gap-1.5">
                              <Key className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-slate-400">Pass:</span>
                              <strong className="text-slate-900 font-bold">{sub.passcode}</strong>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(`${sub.email} / ${sub.passcode}`, sub.id)}
                              className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                              title="Copy login credentials"
                            >
                              {copiedId === sub.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB: STUDENT SEARCH & DOSSIER DIRECTORY */}
      {activeAdminTab === 'students' && (() => {
        const filteredStudents = students.filter((s) => {
          const q = studentSearchQuery.trim().toLowerCase();
          const matchesSearch = !q ||
            s.fullName.toLowerCase().includes(q) ||
            (s.fullNameAmharic && s.fullNameAmharic.toLowerCase().includes(q)) ||
            s.studentId.toLowerCase().includes(q) ||
            (s.guardianName && s.guardianName.toLowerCase().includes(q)) ||
            (s.guardianPhone && s.guardianPhone.toLowerCase().includes(q)) ||
            (s.homeroomTeacher && s.homeroomTeacher.toLowerCase().includes(q));

          const matchesGrade = studentGradeFilter === 'all' || s.grade === studentGradeFilter;
          const matchesSection = studentSectionFilter === 'all' || s.section.toUpperCase() === studentSectionFilter.toUpperCase();
          const matchesStream = studentStreamFilter === 'all' || (s.stream && s.stream.toLowerCase().includes(studentStreamFilter.toLowerCase()));

          return matchesSearch && matchesGrade && matchesSection && matchesStream;
        });

        const activeUniqueSections = Array.from(new Set(students.map((s) => s.section))).filter(Boolean);

        return (
          <div className="space-y-6">
            {/* Top Toolbar & Search Controls */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <Search className="w-5 h-5 text-emerald-700" />
                    <span>Student Information Directory & Records ({students.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Instant student lookup, academic mark transcripts, conduct ratings, and guardian contacts
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuickEnrollModal(true)}
                    className="btn-animated px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Quick Enroll Student</span>
                  </button>

                  {onNavigateToGrades && (
                    <button
                      type="button"
                      onClick={onNavigateToGrades}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>View Active Sections →</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Search & Filter Bar */}
              <div className="space-y-3">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search student by Name (English or አማርኛ), Student ID (HMM-...), Guardian Phone, or Homeroom Teacher..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500 font-semibold text-[11px] mr-1">Grade:</span>
                    <button
                      onClick={() => setStudentGradeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        studentGradeFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {[9, 10, 11, 12].map((g) => (
                      <button
                        key={g}
                        onClick={() => setStudentGradeFilter(g)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          studentGradeFilter === g
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Grade {g}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold text-[11px]">Stream:</span>
                      <select
                        value={studentStreamFilter}
                        onChange={(e) => setStudentStreamFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-[11px] font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="all">All Streams</option>
                        <option value="Natural Science">Natural Science</option>
                        <option value="Social Science">Social Science</option>
                        <option value="General Secondary">General Secondary</option>
                      </select>
                    </div>

                    {activeUniqueSections.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold text-[11px]">Section:</span>
                        <select
                          value={studentSectionFilter}
                          onChange={(e) => setStudentSectionFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-[11px] font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="all">All Sections</option>
                          {activeUniqueSections.map((sec) => (
                            <option key={sec} value={sec}>
                              Section {sec}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Students List / Grid */}
            {students.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-8 h-8 text-emerald-700" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="font-bold text-slate-900 text-base">No Students Enrolled Yet</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Student rosters can be enrolled individually using the Quick Enroll button or imported in bulk from Feeder Schools via the {currentEcYear()} Registrar Allocator.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowQuickEnrollModal(true)}
                    className="btn-animated px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                  >
                    + Enroll First Student
                  </button>
                  {onNavigateToRegistrar && (
                    <button
                      onClick={onNavigateToRegistrar}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Go to Section Allocator ({currentEcLabel('en')}) →
                    </button>
                  )}
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-2">
                <div className="text-slate-400 text-xs">No students match your filter criteria.</div>
                <button
                  onClick={() => {
                    setStudentSearchQuery('');
                    setStudentGradeFilter('all');
                    setStudentSectionFilter('all');
                    setStudentStreamFilter('all');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((s) => {
                  const studentPasscode = generateStudentPasscode(s.grade, s.section, 1);
                  const initials = s.fullName
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('');

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between gap-4 text-xs"
                    >
                      <div>
                        {/* Student Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {initials || 'ST'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">{s.fullName}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                                  {s.studentId}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] block">{s.fullNameAmharic}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-slate-900 block">
                              Grade {s.grade}-{s.section}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {s.stream || 'General Secondary'}
                            </span>
                            {s.cteSpecialization && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                CTE: {s.cteSpecialization}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student Quick Performance Badges */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Class Rank</span>
                            <strong className="text-slate-900 font-bold font-mono text-xs">
                              #{s.rank} <span className="text-[10px] text-slate-400 font-normal">of {s.totalStudentsInSection || 45}</span>
                            </strong>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Attendance</span>
                            <strong className="text-emerald-700 font-bold font-mono text-xs">
                              {s.attendanceRate}%
                            </strong>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Conduct (ስነ-ምግባር)</span>
                            <strong className="text-amber-700 font-bold font-mono text-xs">
                              Rating {s.conduct}
                            </strong>
                          </div>
                        </div>

                        {/* Guardian & Homeroom Info */}
                        <div className="pt-3 space-y-1.5 text-[11px] text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Guardian / ወላጅ:</span>
                            <span className="font-semibold text-slate-800">{s.guardianName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Phone / ስልክ:</span>
                            <span className="font-mono text-slate-800">{s.guardianPhone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Homeroom Teacher:</span>
                            <span className="font-semibold text-slate-800">{s.homeroomTeacher}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentDossier(s)}
                          className="btn-animated px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Full Dossier & Marks (ሙሉ መረጃ)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSection(s.section);
                            setActiveAdminTab('credentials');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Generate Access Passcode Slip"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>Login Slip</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODAL 1: DETAILED STUDENT DOSSIER MODAL */}
            {selectedStudentDossier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {selectedStudentDossier.fullName
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('') || 'ST'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                            {selectedStudentDossier.fullName}
                          </h3>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                            {selectedStudentDossier.studentId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedStudentDossier.fullNameAmharic} • Debre Berhan Secondary & Preparatory School
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentDossier(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Core Status Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block font-medium">Class Section</span>
                      <strong className="text-slate-900 font-extrabold text-sm block mt-0.5">
                        Grade {selectedStudentDossier.grade}-{selectedStudentDossier.section}
                      </strong>
                      <span className="text-[10px] text-slate-500">{selectedStudentDossier.stream || 'General'}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block font-medium">Class Rank</span>
                      <strong className="text-slate-900 font-extrabold text-sm block mt-0.5 font-mono">
                        #{selectedStudentDossier.rank} <span className="text-[11px] text-slate-400 font-normal">/ {selectedStudentDossier.totalStudentsInSection || 45}</span>
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Active Roster</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block font-medium">Attendance Rate</span>
                      <strong className="text-emerald-700 font-extrabold text-sm block mt-0.5 font-mono">
                        {selectedStudentDossier.attendanceRate}%
                      </strong>
                      <span className="text-[10px] text-slate-500">{selectedStudentDossier.attendanceStatus || 'Present Today'}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block font-medium">Conduct Rating (ስነ-ምግባር)</span>
                      <strong className="text-amber-700 font-extrabold text-sm block mt-0.5">
                        Rating {selectedStudentDossier.conduct}
                      </strong>
                      <span className="text-[10px] text-slate-500">Ministry of Education Scale</span>
                    </div>
                  </div>

                  {/* Multi-Semester Subject Marks Breakdown */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-700" />
                        <span>Academic Performance & Mark Breakdown (የትምህርት ውጤት ሰሌዳ)</span>
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Curriculum: MoE Secondary (100% Scale)
                      </span>
                    </div>

                    {selectedStudentDossier.semesters && selectedStudentDossier.semesters.length > 0 ? (
                      selectedStudentDossier.semesters.map((sem) => {
                        const totalScoreSum = sem.subjects.reduce(
                          (acc, s) => acc + (s.continuousAssessment + s.midExam + s.finalExam),
                          0
                        );
                        const avg = sem.subjects.length ? Math.round(totalScoreSum / sem.subjects.length) : 0;

                        return (
                          <div key={sem.semester} className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                            <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 flex items-center justify-between">
                              <span>Semester {sem.semester} Record (የ{sem.semester}ኛ ሴሚስተር ውጤት)</span>
                              <span className="font-mono text-emerald-800 font-bold">
                                Average: {avg}% ({avg >= 50 ? 'Promoted / አልፏል' : 'Academic Warning'})
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3">Subject (የትምህርት አይነት)</th>
                                    <th className="py-2.5 px-2 text-center">Continuous (/30)</th>
                                    <th className="py-2.5 px-2 text-center">Mid Exam (/20)</th>
                                    <th className="py-2.5 px-2 text-center">Final (/50)</th>
                                    <th className="py-2.5 px-2 text-center">Total (/100)</th>
                                    <th className="py-2.5 px-2 text-center">Letter</th>
                                    <th className="py-2.5 px-3 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sem.subjects.map((sub) => {
                                    const tot = sub.continuousAssessment + sub.midExam + sub.finalExam;
                                    let letter = 'F';
                                    if (tot >= 90) letter = 'A+';
                                    else if (tot >= 85) letter = 'A';
                                    else if (tot >= 80) letter = 'A-';
                                    else if (tot >= 75) letter = 'B+';
                                    else if (tot >= 70) letter = 'B';
                                    else if (tot >= 65) letter = 'B-';
                                    else if (tot >= 60) letter = 'C+';
                                    else if (tot >= 50) letter = 'C';
                                    else if (tot >= 40) letter = 'D';

                                    return (
                                      <tr key={sub.subjectId} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-900">{sub.subjectName}</div>
                                          {sub.subjectAmharic && (
                                            <div className="text-[10px] text-slate-400">{sub.subjectAmharic}</div>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-mono">{sub.continuousAssessment}</td>
                                        <td className="py-2.5 px-2 text-center font-mono">{sub.midExam}</td>
                                        <td className="py-2.5 px-2 text-center font-mono">{sub.finalExam}</td>
                                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">{tot}</td>
                                        <td className="py-2.5 px-2 text-center font-bold font-mono">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                                              tot >= 80
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : tot >= 50
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-rose-100 text-rose-800'
                                            }`}
                                          >
                                            {letter}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-medium">
                                          {tot >= 50 ? (
                                            <span className="text-emerald-700">Pass</span>
                                          ) : (
                                            <span className="text-rose-600">Fail</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                        No semester subject mark breakdown recorded for this student yet.
                      </div>
                    )}
                  </div>

                  {/* Guardian & Official Contact Strip */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-emerald-700" />
                      <span>Guardian & Parent Communication Information</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Primary Guardian:</span>
                        <strong className="text-slate-900">{selectedStudentDossier.guardianName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contact Phone (+251):</span>
                        <span className="font-mono text-slate-900 font-bold">{selectedStudentDossier.guardianPhone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Assigned Homeroom Teacher:</span>
                        <span className="text-slate-900 font-semibold">{selectedStudentDossier.homeroomTeacher}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">School Campus:</span>
                        <span className="text-slate-900">Debre Berhan Main Campus (ደብረ ብርሃን)</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Access Slips */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-700" />
                      <span>Official Online Access Passcodes (የተማሪና የወላጅ መግቢያ ኮዶች)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Student Portal Passcode:</span>
                          <code className="font-mono font-bold text-slate-900 text-xs">
                            {generateStudentPasscode(selectedStudentDossier.grade, selectedStudentDossier.section, 1)}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(generateStudentPasscode(selectedStudentDossier.grade, selectedStudentDossier.section, 1), 'pass-student')}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Parent Portal Passcode:</span>
                          <code className="font-mono font-bold text-slate-900 text-xs">
                            {`PAR-${selectedStudentDossier.grade}${selectedStudentDossier.section}-01`}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(`PAR-${selectedStudentDossier.grade}${selectedStudentDossier.section}-01`, 'pass-parent')}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-animated px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Print Official Student Record Slip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentDossier(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Close Dossier
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 2: QUICK ENROLL STUDENT MODAL */}
            {showQuickEnrollModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                        <UserPlus className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Quick Enroll New Student</h4>
                        <p className="text-[11px] text-slate-500">Add individual learner directly to active school rosters</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickEnrollModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleQuickEnrollStudent} className="space-y-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Student Full Name (English):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Marta Tadesse Haile"
                        value={newStudentFullName}
                        onChange={(e) => setNewStudentFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Student Full Name (አማርኛ):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ማርታ ታደሰ ኃይሌ"
                        value={newStudentFullNameAmharic}
                        onChange={(e) => setNewStudentFullNameAmharic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Gender:</label>
                        <select
                          value={newStudentGender}
                          onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value="F">Female (ሴት)</option>
                          <option value="M">Male (ወንድ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Grade:</label>
                        <select
                          value={newStudentGrade}
                          onChange={(e) => setNewStudentGrade(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value={9}>Grade 9</option>
                          <option value={10}>Grade 10</option>
                          <option value={11}>Grade 11</option>
                          <option value={12}>Grade 12</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Section:</label>
                        <input
                          type="text"
                          required
                          placeholder="A, B, C..."
                          value={newStudentSection}
                          onChange={(e) => setNewStudentSection(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                        />
                      </div>
                    </div>

                    {newStudentGrade >= 11 && (
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Academic Stream:</label>
                        <select
                          value={newStudentStream}
                          onChange={(e) => setNewStudentStream(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Natural Science">Natural Science (የተፈጥሮ ሳይንስ)</option>
                          <option value="Social Science">Social Science (የማህበራዊ ሳይንስ)</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Guardian Full Name:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ato Tadesse Haile"
                          value={newStudentGuardian}
                          onChange={(e) => setNewStudentGuardian(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Guardian Phone (+251):</label>
                        <input
                          type="tel"
                          required
                          placeholder="+251 91 123 4567"
                          value={newStudentGuardianPhone}
                          onChange={(e) => setNewStudentGuardianPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowQuickEnrollModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn-animated px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                      >
                        + Enroll Student & Generate ID
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 2: STUDENT & PARENT CREDENTIAL SLIPS */}
      {activeAdminTab === 'credentials' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <span>Student & Parent Access Slips Generator (የተማሪና የወላጅ መግቢያ ፈቃድ)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issue unique passcodes to students and parents for secure viewing of marks and report cards
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">Select Section:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section &quot;{sec}&quot;
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Credential Cards Grid */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student, idx) => {
                const studentPasscode = generateStudentPasscode(student.grade, student.section, idx + 1);
                const parentPasscode = `PAR-${student.grade}${student.section}-${String(idx + 1).padStart(2, '0')}`;

                return (
                  <div
                    key={student.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 relative overflow-hidden shadow-xs hover:border-emerald-300 transition-all text-xs"
                  >
                    {/* Ethiopian Header Strip */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                      <div>
                        <span className="font-black text-slate-900 text-sm">{student.fullName}</span>
                        <span className="text-[11px] text-slate-500 block">{student.fullNameAmharic}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Gr. {student.grade}-{student.section}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Student Credentials */}
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
                        <span className="text-[10px] font-bold uppercase text-emerald-900 block mb-1">
                          Student Portal Access:
                        </span>
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div>ID: <strong className="text-slate-900">{student.studentId}</strong></div>
                          <div>PIN: <strong className="text-emerald-800">{studentPasscode}</strong></div>
                        </div>
                      </div>

                      {/* Parent Credentials */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                        <span className="text-[10px] font-bold uppercase text-amber-900 block mb-1">
                          Parent / Guardian Access:
                        </span>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="truncate text-slate-700">{student.guardianName}</div>
                          <div className="font-mono">Tel: <strong className="text-slate-900">{student.guardianPhone}</strong></div>
                          <div className="font-mono">Code: <strong className="text-amber-900">{parentPasscode}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Hailemariam Mamo Secondary SIS</span>
                      <button
                        onClick={() => handleCopy(`${student.studentId} / PIN: ${studentPasscode}`, student.id)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === student.id ? 'Copied!' : 'Copy Slip'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: NOTICES & ACADEMIC CALENDAR DESK (ADMIN POSTED) */}
      {activeAdminTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Post Announcement and Calendar Event Forms (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Form 1: Post Announcement */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    Post School Announcement (ማስታወቂያ ይለጥፉ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Immediately appears on the portal home page for students, parents, and visitors
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Announcement Title (English):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., First Semester Mid-Exam Registration Period"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Announcement Title (አማርኛ):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., የአንደኛ መንፈቀ-ዓመት አጋማሽ ፈተና ምዝገባ ጊዜ"
                    value={annTitleAmharic}
                    onChange={(e) => setAnnTitleAmharic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Category:</label>
                    <select
                      value={annCategory}
                      onChange={(e) => setAnnCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Administrative">Administrative (አስተዳደራዊ)</option>
                      <option value="Academic">Academic (ትምህርታዊ)</option>
                      <option value="Parent Notice">Parent Notice (የወላጆች ማስታወቂያ)</option>
                      <option value="Examination">Examination (ፈተና)</option>
                      <option value="General">General (አጠቃላይ)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={annIsUrgent}
                        onChange={(e) => setAnnIsUrgent(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Urgent Notice (አስቸኳይ)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Announcement Summary & Instructions:
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide full details, required documents, or instructions for students/parents..."
                    value={annSummary}
                    onChange={(e) => setAnnSummary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-animated w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  + Post Official Announcement
                </button>
              </form>
            </div>

            {/* Form 2: Add Calendar Event */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    Schedule Calendar Event (የካላንደር ክንውን መዝግብ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add official school dates to the Academic Calendar
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Event Title (English):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Parent-Teacher Association General Meeting"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Event Title (አማርኛ):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., የወላጅና መምህራን ማህበር ጠቅላላ ስብሰባ"
                    value={eventTitleAmharic}
                    onChange={(e) => setEventTitleAmharic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <DualDatePicker value={eventDate} onChange={setEventDate} lang={lang} />
                  </div>

                  <div className="col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Category:</label>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Academic">Academic (ትምህርታዊ)</option>
                      <option value="Exam">Exam (ፈተና)</option>
                      <option value="PTA">PTA / Parent Meeting (የወላጆች ስብሰባ)</option>
                      <option value="Holiday">Holiday (በዓል)</option>
                      <option value="Sports">Sports & Culture (ስፖርት)</option>
                      <option value="Club">Club (ክበባት)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Time:</label>
                    <input
                      type="text"
                      placeholder="e.g., 8:30 AM"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Location / Venue:</label>
                    <input
                      type="text"
                      placeholder="e.g., Main Assembly Hall"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Event Description:</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the event agenda..."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-animated w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  + Add to Academic Calendar
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Live Feed of Announcements and Calendar (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Active Announcements */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Active School Announcements ({announcements.length})
                </h3>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Admin Broadcast
                </span>
              </div>

              {announcements.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No announcements posted yet. Use the form on the left to post notices.
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-2xl border transition-all text-xs ${
                        ann.isUrgent
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-slate-900 text-sm">{ann.title}</span>
                        {ann.isUrgent && (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                            URGENT
                          </span>
                        )}
                      </div>
                      {ann.titleAmharic && (
                        <p className="text-[11px] text-slate-600 mb-1">{ann.titleAmharic}</p>
                      )}
                      <p className="text-slate-700 text-xs leading-relaxed">{ann.summary}</p>
                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Category: <strong>{ann.category}</strong></span>
                        <span>Posted on: <DualDate date={ann.datePosted} lang={lang} layout="inline" /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Calendar Events */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Scheduled Calendar Events ({events.length})
                </h3>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                  Academic Timeline
                </span>
              </div>

              {events.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No events added yet. Use the calendar form on the left to schedule dates.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">{ev.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                            {ev.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{ev.description}</p>
                        <div className="mt-2 text-[10px] text-emerald-800 font-mono">
                          📍 {ev.location} • {ev.time}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-black text-slate-900 text-xs">{formatEthiopian(ev.date, 'am', { era: false }) || ev.ethiopianDate}</div>
                        <div className="text-[10px] text-slate-400">{formatGregorian(ev.date) || ev.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL PROFILE & MOE ACCREDITATION */}
      {activeAdminTab === 'school' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Official School Registration & Accreditation Record
            </h3>
            <p className="text-xs text-slate-500">
              Verified by Amhara Regional Education Bureau & Federal Ministry of Education
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">Institution Details</span>
              <p><strong>Official Name:</strong> Hailemariam Mamo Secondary and Preparatory School</p>
              <p><strong>Amharic Name:</strong> ደብረ ብርሃን ኃይለማሪያም ማሞ አጠቃላይ ሁለተኛ እና መሰናዶ ትምህርት ቤት</p>
              <p><strong>Grades Served:</strong> Grades 9 to 12 (General Secondary + Preparatory)</p>
              <p><strong>Region / Zone:</strong> Amhara Region • North Shewa Zone • Debre Berhan City Administration</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">Security & Privacy Protocol</span>
              <p>✓ All student continuous assessment marks & attendance are restricted to authorized faculty.</p>
              <p>✓ Grade 12 National University Entrance (ESSLCE) marks are encrypted and verified against EAES standards.</p>
              <p>✓ Parents receive access codes to monitor their student&apos;s daily attendance and semester report cards.</p>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY SECTION CREDENTIAL SLIPS */}
      <div className="hidden print:block p-4 bg-white text-black font-sans">
        <div className="text-center border-b-2 border-black pb-3 mb-6">
          <h2 className="text-lg font-bold uppercase">Hailemariam Mamo Secondary & Preparatory School</h2>
          <p className="text-xs">Debre Berhan, Ethiopia • Student & Parent SIS Portal Access Cards (Section {selectedSection})</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {sectionStudents.map((st, i) => (
            <div key={st.id} className="border-2 border-dashed border-black p-3 rounded-lg text-xs break-inside-avoid">
              <div className="font-bold text-sm border-b border-black pb-1 mb-2">
                {st.fullName} ({st.fullNameAmharic}) - Grade {st.grade}{st.section}
              </div>
              <p><strong>Student ID:</strong> {st.studentId}</p>
              <p><strong>Student Portal PIN:</strong> {generateStudentPasscode(st.grade, st.section, i + 1)}</p>
              <p className="mt-2 text-[10px] text-slate-700"><strong>Parent Guardian:</strong> {st.guardianName} ({st.guardianPhone})</p>
              <p className="text-[10px] text-slate-700"><strong>Parent Access Code:</strong> PAR-{st.grade}{st.section}-{String(i + 1).padStart(2, '0')}</p>
              <div className="mt-2 text-[9px] text-slate-500 border-t border-slate-300 pt-1">
                Portal: https://hailemariammamo.et • Cut along dashed line to deliver to parent
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT ADMINISTRATOR PROFILE MODAL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-[#070b16]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#d8e0ee] shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#d8e0ee]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0e6b4e]" />
                <h3 className="font-extrabold text-[#0d1526] text-base">Edit Administrator Profile</h3>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-[#5f7090] hover:text-[#0d1526] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0d1526] mb-1">Administrator Full Name:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f7fb] border border-[#d8e0ee] rounded-xl text-xs text-[#0d1526] focus:outline-hidden focus:ring-2 focus:ring-[#0e6b4e]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0d1526] mb-1">Administrative Role Title:</label>
                <input
                  type="text"
                  required
                  value={editRoleTitle}
                  onChange={(e) => setEditRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f7fb] border border-[#d8e0ee] rounded-xl text-xs text-[#0d1526] focus:outline-hidden focus:ring-2 focus:ring-[#0e6b4e]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0d1526] mb-1">Official Phone Number:</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f7fb] border border-[#d8e0ee] rounded-xl text-xs text-[#0d1526] focus:outline-hidden focus:ring-2 focus:ring-[#0e6b4e]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#5f7090] hover:bg-[#eaeff7] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b4635] hover:bg-[#0d1526] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
