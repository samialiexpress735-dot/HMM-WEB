/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  studentId: string; // e.g. HMM-2024-0901
  fullName: string;
  fullNameAmharic: string;
  gender: 'M' | 'F';
  grade: number; // 9, 10, 11, 12
  section: string; // 'A', 'B', 'C', 'D'
  stream?: 'Natural Science' | 'Social Science';
  streamAmharic?: string;
  cteSpecialization?: string;
  academicYear: string;
  avatar?: string;
  rank: number;
  totalStudentsInSection: number;
  attendanceRate: number; // e.g. 96.4%
  conduct: 'A' | 'B' | 'C' | 'D'; // Ethiopian Secondary Conduct rating (ስነ-ምግባር)
  homeroomTeacher: string;
  guardianName: string;
  guardianPhone: string;
  attendanceStatus?: 'Present' | 'Absent' | 'Late' | 'Permission';
  semesters: {
    semester: 1 | 2;
    subjects: {
      subjectId: string;
      subjectName: string;
      subjectAmharic: string;
      teacherName: string;
      continuousAssessment: number; // /30
      midExam: number;              // /20
      finalExam: number;            // /50
    }[];
  }[];
}

export interface Teacher {
  id: string;
  name: string;
  nameAmharic: string;
  department: string;
  subject: string;
  gradesTeaching: number[];
  sectionsTeaching: string[]; // e.g. ['9A', '9B', '10A', '12A']
  email: string;
  phone: string;
  qualification: string;
  avatar?: string;
  isOnline: boolean;
  officeHours: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  titleAmharic: string;
  date: string;
  ethiopianDate: string;
  time: string;
  location: string;
  category: 'Exam' | 'Holiday' | 'Sports' | 'PTA' | 'Academic' | 'Club';
  targetGrades: number[];
  description: string;
  descriptionAmharic: string;
  isImportant?: boolean;
}

export interface MessageThread {
  id: string;
  subject: string;
  category: 'Physics' | 'Mathematics' | 'Chemistry' | 'Biology' | 'English' | 'General' | 'PTA' | 'Exam Prep';
  gradeLevel: number;
  authorName: string;
  authorRole: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  authorAvatar?: string;
  datePosted: string;
  content: string;
  replies: {
    id: string;
    authorName: string;
    authorRole: 'Student' | 'Teacher' | 'Parent' | 'Admin';
    authorAvatar?: string;
    datePosted: string;
    content: string;
    isVerifiedTeacher?: boolean;
  }[];
  resolved?: boolean;
}

// -------------------------------------------------------------------------------------------------
// GRADE SUBJECT TEMPLATES FOR ETHIOPIAN MOE CURRICULUM
// -------------------------------------------------------------------------------------------------

export const grade9SubjectsTemplate = (marks: {
  math: [number, number, number];
  phys: [number, number, number];
  chem: [number, number, number];
  bio: [number, number, number];
  eng: [number, number, number];
  amh: [number, number, number];
  geo: [number, number, number];
  hist: [number, number, number];
  civ: [number, number, number];
  ict?: [number, number, number];
  pe?: [number, number, number];
  econ?: [number, number, number];
}) => [
  { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherName: 'Unassigned', continuousAssessment: marks.eng[0], midExam: marks.eng[1], finalExam: marks.eng[2] },
  { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherName: 'Unassigned', continuousAssessment: marks.math[0], midExam: marks.math[1], finalExam: marks.math[2] },
  { subjectId: 'phys', subjectName: 'Physics', subjectAmharic: 'ፊዚክስ', teacherName: 'Unassigned', continuousAssessment: marks.phys[0], midExam: marks.phys[1], finalExam: marks.phys[2] },
  { subjectId: 'chem', subjectName: 'Chemistry', subjectAmharic: 'ኬሚስትሪ', teacherName: 'Unassigned', continuousAssessment: marks.chem[0], midExam: marks.chem[1], finalExam: marks.chem[2] },
  { subjectId: 'bio', subjectName: 'Biology', subjectAmharic: 'ባዮሎጂ', teacherName: 'Unassigned', continuousAssessment: marks.bio[0], midExam: marks.bio[1], finalExam: marks.bio[2] },
  { subjectId: 'geo', subjectName: 'Geography', subjectAmharic: 'ጂኦግራፊ', teacherName: 'Unassigned', continuousAssessment: marks.geo[0], midExam: marks.geo[1], finalExam: marks.geo[2] },
  { subjectId: 'hist', subjectName: 'History', subjectAmharic: 'ታሪክ', teacherName: 'Unassigned', continuousAssessment: marks.hist[0], midExam: marks.hist[1], finalExam: marks.hist[2] },
  { subjectId: 'pe', subjectName: 'Physical Education (P.E.)', subjectAmharic: 'ስፖርት', teacherName: 'Unassigned', continuousAssessment: marks.pe?.[0] ?? 25, midExam: marks.pe?.[1] ?? 16, finalExam: marks.pe?.[2] ?? 42 },
  { subjectId: 'civ', subjectName: 'Citizenship Education', subjectAmharic: 'ስነ-ዜጋ', teacherName: 'Unassigned', continuousAssessment: marks.civ[0], midExam: marks.civ[1], finalExam: marks.civ[2] },
  { subjectId: 'amh', subjectName: 'Amharic Language', subjectAmharic: 'አማርኛ', teacherName: 'Unassigned', continuousAssessment: marks.amh[0], midExam: marks.amh[1], finalExam: marks.amh[2] },
  { subjectId: 'econ', subjectName: 'Economics', subjectAmharic: 'ኢኮኖሚክስ', teacherName: 'Unassigned', continuousAssessment: marks.econ?.[0] ?? 24, midExam: marks.econ?.[1] ?? 15, finalExam: marks.econ?.[2] ?? 40 },
];

/**
 * Clean data arrays initialized with ZERO mock teachers, students, or sections.
 * All entries are created exclusively by the user and stored in Supabase.
 */
export const SEED_STUDENTS: Student[] = [];
export const STUDENTS: Student[] = [];
export const TEACHERS: Teacher[] = [];

/**
 * Calendar Events & Announcements are posted directly by the School Administrator.
 * Preset MoE templates are removed as requested.
 */
export const SCHOOL_EVENTS: SchoolEvent[] = [];

export const INITIAL_MESSAGES: MessageThread[] = [];

export interface SchoolAnnouncement {
  id: string;
  title: string;
  titleAmharic?: string;
  date: string;
  datePosted?: string;
  category: string;
  summary: string;
  summaryAmharic?: string;
  isImportant?: boolean;
  postedBy?: string;
  isUrgent?: boolean;
}

export const INITIAL_ANNOUNCEMENTS: SchoolAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Welcome to Hailemariam Mamo Secondary & Preparatory School Portal',
    titleAmharic: 'እንኳን ወደ ደብረ ብርሃን ኃይለማሪያም ማሞ አጠቃላይ ሁለተኛና መሰናዶ ት/ቤት በደህና መጡ',
    date: '2024-09-01',
    datePosted: '2024-09-01',
    category: 'Administrative',
    postedBy: 'Principal Office',
    summary: 'Official digital system for students, parents, faculty mark records, and semester registration. Debre Berhan, Amhara Region.',
    isUrgent: false
  }
];

export const SCHOOL_ANNOUNCEMENTS: SchoolAnnouncement[] = INITIAL_ANNOUNCEMENTS;

// -------------------------------------------------------------------------------------------------
// GRADES OF THIS YEAR (2019 E.C.) - GRADE LEVELS & SECTIONS
// -------------------------------------------------------------------------------------------------

export interface SectionSubjectAssignment {
  subjectId: string;
  subjectName: string;
  subjectAmharic: string;
  teacherId: string;
  teacherName: string;
  periodsPerWeek: number;
}

export interface GradeSection {
  id: string;
  grade: number; // 9, 10, 11, 12
  section: string; // '9A', '9B', '10A', '11-Nat-A', etc.
  sectionLetter: string; // 'A', 'B', 'C', 'D'
  stream: 'General Secondary' | 'Natural Science' | 'Social Science';
  streamAmharic: string;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  homeroomTeacher: {
    id: string;
    name: string;
    nameAmharic: string;
    subject: string;
    phone: string;
    avatar?: string;
  };
  studentMonitors: {
    classMonitor: string;
    deputyMonitor: string;
  };
  subjectAssignments: SectionSubjectAssignment[];
  roomNumber: string;
  buildingBlock: string;
  shift: 'Morning Shift (ጧት)' | 'Afternoon Shift (ከሰዓት)';
  attendanceToday: number;
  isDemoAvailable?: boolean;
}

export const CTE_SPECIALIZATION_OPTIONS = [
  { id: 'web-dev', labelEn: 'Web Design and Development', labelAm: 'ድረ-ገጽ ንድፍና ልማት', code: 'WD' },
  { id: 'marketing', labelEn: 'Marketing', labelAm: 'ማርኬቲንግ', code: 'MKT' },
  { id: 'accounting', labelEn: 'Accounting', labelAm: 'አካውንቲንግ', code: 'ACC' },
  { id: 'construction', labelEn: 'Construction', labelAm: 'ኮንስትራክሽን', code: 'CST' }
] as const;

export type CTESpecialization = typeof CTE_SPECIALIZATION_OPTIONS[number]['labelEn'];

// Grade 9 & 10 (11 Subjects): English, Math, Physics, Chemistry, Biology, Geography, History, PE, Citizenship, Amharic, Economics
export const STANDARD_GRADE_9_10_SUBJECTS: SectionSubjectAssignment[] = [
  { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'phys', subjectName: 'Physics', subjectAmharic: 'ፊዚክስ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'chem', subjectName: 'Chemistry', subjectAmharic: 'ኬሚስትሪ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'bio', subjectName: 'Biology', subjectAmharic: 'ባዮሎጂ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'geo', subjectName: 'Geography', subjectAmharic: 'ጂኦግራፊ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'hist', subjectName: 'History', subjectAmharic: 'ታሪክ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'pe', subjectName: 'Physical Education (P.E.)', subjectAmharic: 'ስፖርት', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 2 },
  { subjectId: 'civ', subjectName: 'Citizenship Education', subjectAmharic: 'ስነ-ዜጋ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 2 },
  { subjectId: 'amh', subjectName: 'Amharic Language', subjectAmharic: 'አማርኛ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'econ', subjectName: 'Economics', subjectAmharic: 'ኢኮኖሚክስ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 2 }
];

// Grade 11 & 12 Natural Science (9 Subjects): English, Biology, Chemistry, Physics, Math, Amharic, Agriculture, IT, CTE
export const STANDARD_GRADE_11_12_NATURAL_SUBJECTS: SectionSubjectAssignment[] = [
  { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'bio', subjectName: 'Biology', subjectAmharic: 'ባዮሎጂ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'chem', subjectName: 'Chemistry', subjectAmharic: 'ኬሚስትሪ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'phys', subjectName: 'Physics', subjectAmharic: 'ፊዚክስ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 5 },
  { subjectId: 'amh', subjectName: 'Amharic Language', subjectAmharic: 'አማርኛ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'agri', subjectName: 'Agriculture', subjectAmharic: 'ግብርና', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'it', subjectName: 'Information Technology (IT)', subjectAmharic: 'ኢንፎርሜሽን ቴክኖሎጂ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'cte', subjectName: 'Career & Technical Education (CTE)', subjectAmharic: 'የስራና ቴክኒክ (CTE)', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 }
];

// Grade 11 & 12 Social Science (8 Subjects): English, Math, Geography, History, Economics, IT, Citizenship, CTE
export const STANDARD_GRADE_11_12_SOCIAL_SUBJECTS: SectionSubjectAssignment[] = [
  { subjectId: 'eng', subjectName: 'English Language', subjectAmharic: 'እንግሊዝኛ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'math', subjectName: 'Mathematics', subjectAmharic: 'ሒሳብ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'geo', subjectName: 'Geography', subjectAmharic: 'ጂኦግራፊ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'hist', subjectName: 'History', subjectAmharic: 'ታሪክ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'econ', subjectName: 'Economics', subjectAmharic: 'ኢኮኖሚክስ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 4 },
  { subjectId: 'it', subjectName: 'Information Technology (IT)', subjectAmharic: 'ኢንፎርሜሽን ቴክኖሎጂ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'civ', subjectName: 'Citizenship Education', subjectAmharic: 'ስነ-ዜጋ', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 },
  { subjectId: 'cte', subjectName: 'Career & Technical Education (CTE)', subjectAmharic: 'የስራና ቴክኒክ (CTE)', teacherId: '', teacherName: 'Unassigned', periodsPerWeek: 3 }
];

/**
 * Initial Grade Sections array initialized empty.
 * Populated dynamically when administrator generates sections in the Registrar Portal.
 */
export const INITIAL_GRADE_SECTIONS: GradeSection[] = [];
