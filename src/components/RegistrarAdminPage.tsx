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
  LogOut
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
import { syncStudentToCloud, syncTimetableSlotToCloud } from '../lib/supabase';

interface RegistrarAdminPageProps {
  teachers: Teacher[];
  sections: GradeSection[];
  onAddSections: (newSections: GradeSection[]) => void;
  onUpdateStudents?: (students: any[] | ((prev: any[]) => any[])) => void;
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
  onUpdateStudents,
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
  const [cteSpecialization, setCteSpecialization] = useState<CTESpecialization>('Web Design and Development');
  const [searchArchiveQuery, setSearchArchiveQuery] = useState<string>('');
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
  const [allocationStream, setAllocationStream] = useState<'Natural Science' | 'Social Science'>('Natural Science');
  const [studentsPerSection, setStudentsPerSection] = useState<number>(6);
  const [targetCapacity, setTargetCapacity] = useState<number>(45);
  const [numSectionsInput, setNumSectionsInput] = useState<number>(2);
  const [allocationMethod, setAllocationMethod] = useState<'by-size' | 'by-count'>('by-size');
  const [allocationMode, setAllocationMode] = useState<'combined-smart' | 'gender-balanced' | 'merit-balanced' | 'random'>(
    'combined-smart'
  );
  const [previewBuckets, setPreviewBuckets] = useState<SectionAllocationBucket[] | null>(null);
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

  // Recommendations for previous year students as the registrar starts typing
  const matchingArchiveStudents = recommendPreviousYearStudents(
    archiveStudents,
    targetGrade,
    searchArchiveQuery
  );

  // Auto-fill from candidate click
  const handleSelectArchiveStudent = (cand: ArchiveStudent) => {
    setFullName(cand.fullName);
    setFullNameAmharic(cand.fullNameAmharic);
    setGender(cand.gender);
    setPreviousSchool(cand.previousSchool);
    setPreviousGrade(cand.previousGrade);
    setPreviousSection(cand.previousSection);
    setPreviousScore(cand.previousAverageScore);
    setGuardianName(cand.guardianName);
    setGuardianPhone(cand.guardianPhone);
    setConduct(cand.conduct);
    if (cand.recommendedStream) {
      setTargetStream(cand.recommendedStream);
    }
    setSearchArchiveQuery(cand.fullName);
  };

  // Submit new registration
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const newStudentId = `HMM-2017-${targetGrade.toString().padStart(2, '0')}${String(
      registeredStudents.length + 1
    ).padStart(2, '0')}`;

    const newStudent: RegisteredStudent2019 = {
      id: `reg-${Date.now()}`,
      studentId: newStudentId,
      fullName: fullName.trim(),
      fullNameAmharic: fullNameAmharic.trim() || fullName.trim(),
      gender,
      targetGrade,
      stream: targetGrade >= 11 ? targetStream : undefined,
      cteSpecialization: targetGrade >= 11 ? cteSpecialization : undefined,
      academicYear: '2017 E.C.',
      previousSchool: previousSchool.trim() || 'Debre Berhan Feeder School',
      previousGrade,
      previousSection,
      previousAverageScore: Number(previousScore) || 80,
      guardianName: guardianName.trim() || 'Parent/Guardian',
      guardianPhone: guardianPhone.trim() || '+251 91 000 0000',
      conduct,
      registrationDate: new Date().toISOString().split('T')[0],
      avatar:
        gender === 'F'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    };

    setRegisteredStudents((prev) => [newStudent, ...prev]);
    syncStudentToCloud(newStudent).catch(() => {});

    // Reset fields
    setFullName('');
    setFullNameAmharic('');
    setSearchArchiveQuery('');
    setGuardianName('');
    alert(
      lang === 'am'
        ? `ተማሪ ${newStudent.fullNameAmharic} ለ2017 ዓ.ም. በ${targetGrade}ኛ ክፍል ${
            targetGrade >= 11
              ? `(${targetStream === 'Natural Science' ? 'የተፈጥሮ ሳይንስ' : 'የማህበራዊ ሳይንስ'} - ${cteSpecialization})`
              : ''
          } በተሳካ ሁኔታ ተመዝግቧል!`
        : `Student ${newStudent.fullName} successfully registered for 2017 E.C. Grade ${targetGrade}${
            targetGrade >= 11 ? ` (${targetStream} - ${cteSpecialization})` : ''
          }!`
    );
  };

  // Generate Section Allocation Preview
  const handleGenerateAllocation = () => {
    const candidates = registeredStudents.filter((s) => {
      if (s.targetGrade !== allocationGrade) return false;
      if (allocationGrade >= 11) {
        return s.stream === allocationStream;
      }
      return true;
    });

    if (candidates.length === 0) {
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

    const options = {
      grade: allocationGrade,
      stream:
        allocationGrade >= 11
          ? allocationStream
          : undefined,
      studentsPerSection: allocationMethod === 'by-size' ? studentsPerSection : undefined,
      numSections: allocationMethod === 'by-count' ? numSectionsInput : undefined,
      mode: allocationMode,
      targetCapacity
    };

    const buckets = allocateStudentsToSections(candidates, options);
    setPreviewBuckets(buckets);
    setAllocationSuccessMessage('');
    setHasCommittedCurrentPreview(false);
    setShowCommitSuccessModal(false);
  };

  // Generate Grade 11 & 12 CTE Practical Cohort Sections (Cross-Homeroom Grouping)
  const handleGenerateCteSections = () => {
    const grade = allocationGrade >= 11 ? allocationGrade : 11;
    const candidates = registeredStudents.filter((s) => s.targetGrade === grade && s.cteSpecialization);

    if (candidates.length === 0) {
      alert(
        lang === 'am'
          ? `ለ${grade}ኛ ክፍል የስራና ቴክኒክ (CTE) ሙያ የመረጡ ተማሪዎች አልተገኙም!`
          : `No registered Grade ${grade} students found with selected CTE specializations! Please register students with CTE electives first.`
      );
      return;
    }

    const specDefs = [
      { id: 'web-dev', labelEn: 'Web Design and Development', code: 'WD' },
      { id: 'accounting', labelEn: 'Accounting', code: 'ACC' },
      { id: 'marketing', labelEn: 'Marketing', code: 'MKT' },
      { id: 'construction', labelEn: 'Construction', code: 'CST' }
    ];

    const cteBuckets: SectionAllocationBucket[] = [];

    specDefs.forEach((def, idx) => {
      const matched = candidates.filter((st) => {
        const c = (st.cteSpecialization || '').toLowerCase();
        return c.includes(def.labelEn.toLowerCase()) || c.includes(def.id) || c.includes(def.code.toLowerCase());
      });

      if (matched.length > 0) {
        const maleCount = matched.filter((s) => s.gender === 'M').length;
        const femaleCount = matched.filter((s) => s.gender === 'F').length;
        const avgScore = Math.round(
          matched.reduce((acc, s) => acc + (s.previousAverageScore || 80), 0) / matched.length
        );

        cteBuckets.push({
          sectionCode: `${grade}-CTE-${def.code}`,
          sectionLetter: `CTE-${def.code}`,
          students: matched,
          maleCount,
          femaleCount,
          averageScore: avgScore,
          maxCapacity: 50,
          roomNumber: `Tech Lab ${idx + 1}`,
          isCteSection: true,
          cteSpecialization: def.labelEn
        });
      }
    });

    if (cteBuckets.length === 0) {
      alert('No matching students found for CTE cohorts.');
      return;
    }

    setPreviewBuckets(cteBuckets);
    setAllocationSuccessMessage(
      lang === 'am'
        ? `ለ${grade}ኛ ክፍል ${cteBuckets.length} የCTE ሙያ ክፍሎች (${cteBuckets.map((b) => b.sectionCode).join(', ')}) በተሳካ ሁኔታ ተዘጋጅተዋል!`
        : `Generated ${cteBuckets.length} specialized CTE Cohort Sections (${cteBuckets.map((b) => b.sectionCode).join(', ')}) based on student vocational electives!`
    );
    setHasCommittedCurrentPreview(false);
    setShowCommitSuccessModal(false);
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
    const csvContent = generateSectionRosterCsv(previewBuckets, '2017 E.C.');
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
    const allocatedMap = new Map<string, string>();
    previewBuckets.forEach((b) => {
      b.students.forEach((st) => allocatedMap.set(st.id, b.sectionCode));
    });

    setRegisteredStudents((prev) =>
      prev.map((s) => (allocatedMap.has(s.id) ? { ...s, allocatedSection: allocatedMap.get(s.id) } : s))
    );

    // Also convert to active school students with properly initialized subjects (0 initial score)
    if (onUpdateStudents) {
      let templateSubjects = STANDARD_GRADE_9_10_SUBJECTS;
      if (allocationGrade >= 11) {
        templateSubjects =
          allocationStream === 'Social Science'
            ? STANDARD_GRADE_11_12_SOCIAL_SUBJECTS
            : STANDARD_GRADE_11_12_NATURAL_SUBJECTS;
      }

      const convertedStudents = previewBuckets.flatMap((bucket) => {
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
            cteSpecialization: st.cteSpecialization,
            academicYear: '2017 E.C.',
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
    }

    setAllocationSuccessMessage(
      lang === 'am'
        ? `በ2017 ዓ.ም. ${previewBuckets.length} አዳዲስ ክፍሎች (${previewBuckets
            .map((b) => b.sectionCode)
            .join(', ')}) በተሳካ ሁኔታ ተፈጥረዋል!`
        : `Successfully created ${previewBuckets.length} new 2017 E.C. sections (${previewBuckets
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
      {/* Dedicated Admin Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'am' ? '← ወደ አስተዳዳሪ ዴስክ' : '← Back to admin'}</span>
            </button>
          )}
          {onNavigateToGrades && (
            <button
              onClick={onNavigateToGrades}
              className="btn-animated px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'am' ? 'ክፍሎችና ሴክሽኖች →' : 'Classes & Sections →'}</span>
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

      {/* 1. OFFICIAL MOE REGISTRAR HERO BAR */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                2017 E.C. Academic Year Intake
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-800/90 text-emerald-200 border border-emerald-700">
                የ2017 ዓ.ም. የተማሪዎች ምዝገባ ቢሮ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {lang === 'am'
                ? 'የ2017 ዓ.ም. አዲስ ዓመት ምዝገባ፣ የክፍል ድልድልና የመምህራን ክፍለ-ጊዜ ምደባ'
                : 'Registrar: admissions, sections and timetables'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl">
              {lang === 'am'
                ? 'የቀድሞ ተማሪዎችን በመፈለግ በስማቸው አውቶኮምፕሊት ይመዝግቡ፣ በዘፈቀደ ወይም በፆታ ሚዛን ክፍሎችን ያዋቅሩ፣ እንዲሁም የመምህራንን ክፍለ-ጊዜ ያለ ምንም ግጭት ያደራጁ።'
                : 'Intelligently autocomplete applicant data from feeder schools, auto-allocate students into sections, and assign teachers without period timetable clashes.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur-sm border border-emerald-700/50 p-4 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Registered (2017)</span>
              <span className="text-2xl font-black text-amber-400">{registeredStudents.length}</span>
              <span className="text-[10px] text-slate-400 block">Applicants</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm border border-emerald-700/50 p-4 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Grade 9 Cohort</span>
              <span className="text-2xl font-black text-white">
                {registeredStudents.filter((s) => s.targetGrade === 9).length}
              </span>
              <span className="text-[10px] text-slate-400 block">In Admission</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REGISTRAR WORKSPACE NAVIGATION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'registration'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserPlus className={`w-4 h-4 ${activeTab === 'registration' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{lang === 'am' ? '1. የተማሪ ምዝገባና አውቶኮምፕሊት' : '1. Student Registration & Autocomplete'}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'registration' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {registeredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'allocation'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Shuffle className={`w-4 h-4 ${activeTab === 'allocation' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{lang === 'am' ? '2. በዘፈቀደ/በፆታ ክፍሎችን መመደቢያ' : '2. Random & Balanced Section Allocation'}</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'timetable'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'timetable' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{lang === 'am' ? '3. የመምህራን ክፍለ-ጊዜና ግጭት መቆጣጠሪያ' : '3. Teacher Timetable & Period Clash Preventer'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
              Clash Check
            </span>
          </button>
        </div>

        {onNavigateToGrades && (
          <button
            onClick={onNavigateToGrades}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{lang === 'am' ? 'ክፍሎችና ሴክሽኖችን ተመልከት →' : 'View Classes & Sections →'}</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: STUDENT REGISTRATION & LAST YEAR AUTOCOMPLETE RECOMMENDATION
         ========================================================================= */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* Top Instructions Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
            <School className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold text-sm block">
                {lang === 'am'
                  ? 'የ2018 ዓ.ም. የተማሪዎች ዳታቤዝ አውቶኮምፕሊት (Intelligent Autocomplete Enabled)'
                  : 'Connected to 2018 E.C. Previous Year Feeder School Records'}
              </strong>
              <span>
                {lang === 'am'
                  ? 'ተማሪው የሚቀላቀለውን ክፍል ይምረጡ፤ ስሙን ወይም መታወቂያውን መጻፍ ሲጀምሩ ሲስተሙ ካለፈው ዓመት ተማሪዎች መረጃ ውስጥ ፈልጎ ወዲያውኑ ይመክራል! አንዱን ሲጫኑ መረጃው ሙሉ በሙሉ በፎርሙ ውስጥ ይሞላል።'
                  : 'Select the grade the student will join in 2019 E.C. As you start typing their name or ID, the system searches previous year records (feeder Grade 8 graduates, 9th/10th grade promotees) and recommends matches with instant 1-click form auto-fill.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form: Step 1 Grade + Autocomplete Search + Registration Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  <span>
                    {lang === 'am' ? 'የአዲስ ተማሪ ምዝገባ ፎርም (2017 ዓ.ም.)' : '2017 E.C. Student Admission Form'}
                  </span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">Academic Year: 2017 E.C.</span>
              </div>

              {/* Target Grade Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'am' ? 'ተማሪው በ2017 ዓ.ም. የሚገባበት ክፍል (Target Grade to Join):' : 'Target Grade to Join in 2017 E.C.:'}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {[9, 10, 11, 12].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setTargetGrade(g);
                        setPreviousGrade(g - 1);
                        setSearchArchiveQuery('');
                      }}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                        targetGrade === g
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      Grade {g} (ክፍል {g})
                    </button>
                  ))}
                </div>
              </div>

              {/* STREAM SELECTION & CTE SPECIALIZATION (GRADES 11 & 12 ONLY) */}
              {targetGrade >= 11 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800">
                      {lang === 'am'
                        ? 'የመሰናዶ የትምህርት ዘርፍ ምረጥ (Academic Stream Toggle): *'
                        : 'Select Preparatory Academic Stream (Natural vs. Social): *'}
                    </label>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                      Grade {targetGrade} MoE Stream
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Natural Science Button */}
                    <button
                      type="button"
                      onClick={() => setTargetStream('Natural Science')}
                      className={`p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        targetStream === 'Natural Science'
                          ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🧪</span>
                          <span className="font-black text-xs">
                            Natural Science (የተፈጥሮ ሳይንስ)
                          </span>
                        </div>
                        {targetStream === 'Natural Science' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        )}
                      </div>
                      <p className={`text-[10.5px] leading-relaxed ${
                        targetStream === 'Natural Science' ? 'text-emerald-200' : 'text-slate-600'
                      }`}>
                        <strong>9 Subjects:</strong> English, Biology, Chemistry, Physics, Math, Amharic, Agriculture, IT, CTE
                      </p>
                    </button>

                    {/* Social Science Button */}
                    <button
                      type="button"
                      onClick={() => setTargetStream('Social Science')}
                      className={`p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        targetStream === 'Social Science'
                          ? 'bg-amber-900 text-white border-amber-950 shadow-md ring-2 ring-amber-500'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📜</span>
                          <span className="font-black text-xs">
                            Social Science (የማህበራዊ ሳይንስ)
                          </span>
                        </div>
                        {targetStream === 'Social Science' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        )}
                      </div>
                      <p className={`text-[10.5px] leading-relaxed ${
                        targetStream === 'Social Science' ? 'text-amber-200' : 'text-slate-600'
                      }`}>
                        <strong>8 Subjects:</strong> English, Math, Geography, History, Economics, IT, Citizenship, CTE
                      </p>
                    </button>
                  </div>

                  {/* CTE Specialization Elective Picker */}
                  <div className="pt-2.5 border-t border-emerald-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-black text-slate-800">
                        {lang === 'am'
                          ? 'የስራና ቴክኒክ (CTE) ሙያ ምርጫ (Career & Technical Elective):'
                          : 'CTE Specialization Package (Mandatory Practical Elective):'}
                      </label>
                      <span className="text-[10px] text-emerald-800 font-bold">
                        Available in both Streams
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CTE_SPECIALIZATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCteSpecialization(opt.labelEn)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            cteSpecialization === opt.labelEn
                              ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-400 font-black'
                              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 font-bold'
                          }`}
                        >
                          <div className="text-xs truncate">{opt.labelEn}</div>
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              cteSpecialization === opt.labelEn ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            {opt.labelAm}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SEARCH & AUTOCOMPLETE RECOMMENDATION BOX */}
              <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-700" />
                    <span>
                      {lang === 'am'
                        ? 'ያለፈው ዓመት (2018 ዓ.ም.) ተማሪዎችን ፈልግና ምረጥ (Autocomplete):'
                        : 'Search & Recommend from Last Year (2018 E.C.) Records:'}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {matchingArchiveStudents.length} Matches Found
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchArchiveQuery}
                    onChange={(e) => setSearchArchiveQuery(e.target.value)}
                    placeholder={
                      lang === 'am'
                        ? 'የተማሪውን ስም መጻፍ ይጀምሩ (ለምሳሌ: Yared, Bethlehem, ዳዊት, ሳምራዊት) ወይም መታወቂያ...'
                        : 'Start typing student name in English or Amharic (e.g. Yared, Bethlehem, ዳዊት) or ID...'
                    }
                    className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                  {searchArchiveQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchArchiveQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Recommendations List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {matchingArchiveStudents.length > 0 ? (
                    matchingArchiveStudents.map((cand) => (
                      <div
                        key={cand.id}
                        className="bg-white p-3 rounded-xl border border-amber-200/90 hover:border-emerald-500 hover:shadow-sm transition-all flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {cand.gender === 'F' ? '♀' : '♂'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate">
                              {cand.fullName} ({cand.fullNameAmharic})
                            </div>
                            <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-700">{cand.previousSchool}</span>
                              <span>•</span>
                              <span>Prev Gr: {cand.previousGrade} ({cand.previousSection})</span>
                              <span>•</span>
                              <span className="font-bold text-amber-700">Avg: {cand.previousAverageScore}%</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectArchiveStudent(cand)}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold rounded-lg shadow-2xs flex-shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'am' ? 'ምረጥ' : 'Auto-Fill'}</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3 text-xs text-slate-500">
                      No matching 2018 E.C. records found. You can enter transfer details manually below.
                    </div>
                  )}
                </div>
              </div>

              {/* REGISTRATION FORM FIELDS */}
              <form onSubmit={handleRegisterStudent} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Yared Getachew Tadesse"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ሙሉ ስም (በአማርኛ)
                    </label>
                    <input
                      type="text"
                      value={fullNameAmharic}
                      onChange={(e) => setFullNameAmharic(e.target.value)}
                      placeholder="ለምሳሌ፡ ያሬድ ጌታቸው ታደሰ"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-semibold"
                    >
                      <option value="M">Male (ወንድ)</option>
                      <option value="F">Female (ሴት)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Previous School</label>
                    <input
                      type="text"
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      placeholder="e.g. Debre Berhan Primary"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {targetGrade === 9 ? '8th Gr Ministry Result' : 'Previous Average %'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      value={previousScore}
                      onChange={(e) => setPreviousScore(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Ato Getachew Tadesse"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Phone</label>
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="+251 91 100 2233"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Will be registered under <strong>2017 E.C. Admission Pool</strong>
                  </span>
                  <button
                    type="submit"
                    className="btn-animated px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'am' ? 'ተማሪውን መዝግብ (Register)' : 'Confirm 2017 Registration'}</span>
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
                      {lang === 'am' ? 'የ2017 ዓ.ም. የተመዘገቡ ተማሪዎች' : 'Registered 2017 E.C. Applicants'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Grade {targetGrade} Admission Pool ({registeredStudents.filter((s) => s.targetGrade === targetGrade).length} students)
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('allocation')}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Allocate to Sections →</span>
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
                <span>Assign Timetable & Teachers →</span>
              </button>
            </div>
          )}

          {/* Allocation Controls Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-emerald-700" />
                  <span>
                    {lang === 'am'
                      ? 'የተማሪዎችን ወደ ክፍሎች በዘፈቀደና በፆታ ማመጣጠኛ ኢንጂን'
                      : 'Automated / Random & Balanced Section Allocation Engine'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribute the {registeredStudents.filter((s) => s.targetGrade === allocationGrade).length}{' '}
                  registered students of Grade {allocationGrade} into sections (A, B, C...)
                </p>
              </div>

              {/* Grade & Stream Selector for Allocation */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Grade:</span>
                  <select
                    value={allocationGrade}
                    onChange={(e) => {
                      setAllocationGrade(Number(e.target.value));
                      setPreviewBuckets(null);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={9}>Grade 9</option>
                    <option value={10}>Grade 10</option>
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12</option>
                  </select>
                </div>

                {allocationGrade >= 11 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Stream:</span>
                    <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationStream('Natural Science');
                          setPreviewBuckets(null);
                        }}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          allocationStream === 'Natural Science'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        🧪 Natural
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationStream('Social Science');
                          setPreviewBuckets(null);
                        }}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          allocationStream === 'Social Science'
                            ? 'bg-amber-800 text-white shadow-2xs'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        📜 Social
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Config Inputs: How many students in each section, Mode, etc. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* Method choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Section Sizing Method:
                </label>
                <div className="flex rounded-xl bg-slate-200 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('by-size')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      allocationMethod === 'by-size'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Students per Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('by-count')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      allocationMethod === 'by-count'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Fixed Section Count
                  </button>
                </div>
              </div>

              {/* Number Input */}
              <div>
                {allocationMethod === 'by-size' ? (
                  <>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      How many students in each section?
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={studentsPerSection}
                      onChange={(e) => setStudentsPerSection(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Standard Ethiopian MoE guideline: 35–45 students per section
                    </span>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      How many sections to generate?
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={numSectionsInput}
                      onChange={(e) => setNumSectionsInput(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Generates Section A, B, C...
                    </span>
                  </>
                )}
              </div>

              {/* Allocation Strategy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Distribution Algorithm Mode:
                </label>
                <select
                  value={allocationMode}
                  onChange={(e) => setAllocationMode(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="combined-smart">⚖️ + 📊 Combined Smart: Gender Parity (50/50) + Merit Stratification (Recommended)</option>
                  <option value="gender-balanced">⚖️ Gender-Balanced (50% M / 50% F)</option>
                  <option value="merit-balanced">📊 Academic Merit-Balanced (Snake Draft by Score)</option>
                  <option value="random">🎲 Random Shuffle (በዘፈቀደ/በእጣ)</option>
                </select>
              </div>
            </div>

            {/* Target Capacity & Section Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Classroom Max Capacity:</span>
                <input
                  type="number"
                  min="20"
                  max="65"
                  value={targetCapacity}
                  onChange={(e) => setTargetCapacity(Math.max(10, Number(e.target.value)))}
                  className="w-20 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 text-center"
                />
                <span className="text-[11px] text-slate-500">students / section</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {allocationGrade >= 11 && (
                  <button
                    type="button"
                    onClick={handleGenerateCteSections}
                    className="btn-animated px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                    title="Group Grade 11 & 12 students into specialized CTE vocational sections (Web Dev, Marketing, Accounting, Construction)"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {lang === 'am'
                        ? 'የCTE ሙያ ክፍሎች ድልድል (CTE Cohorts)'
                        : `Generate Grade ${allocationGrade} CTE Sections`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAllocation}
                  className="btn-animated px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <Shuffle className="w-4 h-4 text-amber-400" />
                  <span>
                    {lang === 'am' ? 'መደበኛ ክፍሎችን አዘጋጅ (Generate Homerooms)' : 'Generate & Preview Balanced Sections'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* PREVIEW SECTIONS GRID */}
          {previewBuckets && previewBuckets.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span>Generated Allocation Preview ({previewBuckets.length} Sections)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {allocationMode === 'combined-smart' ? 'Gender & Merit Optimized' : allocationMode}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Review and fine-tune section rosters. You can move any student between sections with the Transfer dropdown.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Export Rosters (CSV)</span>
                  </button>

                  {hasCommittedCurrentPreview ? (
                    <button
                      type="button"
                      onClick={() => setShowCommitSuccessModal(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{lang === 'am' ? '✓ ክፍሎች ተመዝግበዋል (ዝርዝር እይ)' : '✓ Sections Committed (View Details)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCommitSections}
                      className="btn-animated px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                      <span>{lang === 'am' ? 'ክፍሎችን አፅድቅና መዝግብ' : 'Confirm & Commit 2017 Sections'}</span>
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
                                Grade {allocationGrade} Section {bucket.sectionLetter}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span>{bucket.roomNumber || 'Classroom 101'}</span>
                                <span>•</span>
                                <span>Capacity: {bucket.maxCapacity || targetCapacity}</span>
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
                                  {st.cteSpecialization && (
                                    <>
                                      <span>•</span>
                                      <span className="font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                        CTE: {st.cteSpecialization}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Section Transfer Control */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              <span className="text-[10px] text-slate-400">Move:</span>
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
                    2017 E.C. Academic Registry
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
                    ? `የ2017 ዓ.ም. ${lastCommittedSectionsInfo?.count || previewBuckets?.length || 0} ክፍሎች ተፈጥረው ወደ ትምህርት ቤቱ ዋና ዳታቤዝ ተመዝግበዋል።`
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
