/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ArchiveStudent {
  id: string;
  studentId: string;
  fullName: string;
  fullNameAmharic: string;
  gender: 'M' | 'F';
  previousGrade: number; // e.g. 8 (feeder school), 9, 10, 11
  previousSection: string; // e.g. '8B', '9A', '10C'
  previousSchool: string; // e.g. 'Debre Berhan Primary School'
  previousAverageScore: number; // e.g. 88.5
  eligibleForGrade: number; // e.g. 9, 10, 11, 12
  recommendedStream?: 'Natural Science' | 'Social Science';
  guardianName: string;
  guardianPhone: string;
  conduct: 'A' | 'B' | 'C' | 'D';
}

export interface RegisteredStudent2019 {
  id: string;
  studentId: string;
  fullName: string;
  fullNameAmharic: string;
  gender: 'M' | 'F';
  targetGrade: number; // 9, 10, 11, 12
  stream?: 'Natural Science' | 'Social Science';
  cteSpecialization?: 'Web Design and Development' | 'Marketing' | 'Accounting' | 'Construction' | string;
  academicYear: string; // '2017 E.C.'
  previousSchool: string;
  previousGrade: number;
  previousSection?: string;
  previousAverageScore?: number;
  guardianName: string;
  guardianPhone: string;
  conduct: 'A' | 'B' | 'C' | 'D';
  registrationDate: string;
  allocatedSection?: string; // academic section, e.g. '9A', '9B' or undefined if pending
  /** CTE track preferences, best first (Grades 11-12). All four tracks are ranked at registration. */
  cteChoices?: string[];
  /** Which preference was granted (1 = first choice). Set by the CTE allocation. */
  cteRank?: number;
  /** CTE group the student was placed in, e.g. '11-CTE-WD'. Separate from allocatedSection. */
  cteSection?: string;
  avatar: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number; // 1 to 7
  sectionCode: string; // e.g. '9A', '9B'
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingSlot?: TimetableSlot;
  errorMessage?: string;
  errorMessageAmharic?: string;
}

export const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export const PERIOD_TIMES: { period: number; time: string; labelAmharic: string }[] = [
  { period: 1, time: '8:30 AM - 9:15 AM', labelAmharic: '1ኛ ክፍለ-ጊዜ (ጧት)' },
  { period: 2, time: '9:20 AM - 10:05 AM', labelAmharic: '2ኛ ክፍለ-ጊዜ' },
  { period: 3, time: '10:20 AM - 11:05 AM', labelAmharic: '3ኛ ክፍለ-ጊዜ' },
  { period: 4, time: '11:10 AM - 11:55 AM', labelAmharic: '4ኛ ክፍለ-ጊዜ' },
  { period: 5, time: '1:30 PM - 2:15 PM', labelAmharic: '5ኛ ክፍለ-ጊዜ (ከሰዓት)' },
  { period: 6, time: '2:20 PM - 3:05 PM', labelAmharic: '6ኛ ክፍለ-ጊዜ' },
  { period: 7, time: '3:10 PM - 3:55 PM', labelAmharic: '7ኛ ክፍለ-ጊዜ' }
];

/**
 * Searches and recommends last year's students based on target grade and query string.
 * Supports partial matching in English, Amharic, or Student ID.
 */
export function recommendPreviousYearStudents(
  archive: ArchiveStudent[],
  targetGrade: number,
  query: string
): ArchiveStudent[] {
  if (!query || query.trim().length === 0) {
    return archive.filter((s) => s.eligibleForGrade === targetGrade).slice(0, 8);
  }

  const cleanQuery = query.trim().toLowerCase();
  return archive
    .filter((s) => s.eligibleForGrade === targetGrade)
    .filter((s) => {
      return (
        s.fullName.toLowerCase().includes(cleanQuery) ||
        s.fullNameAmharic.includes(cleanQuery) ||
        s.studentId.toLowerCase().includes(cleanQuery) ||
        s.previousSchool.toLowerCase().includes(cleanQuery)
      );
    })
    .slice(0, 10);
}

/**
 * Distributes registered students into sections.
 * Options allow specifying studentsPerSection or fixed numberOfSections,
 * with distribution modes: 'random', 'gender-balanced', or 'merit-balanced'.
 */
export interface SectionAllocationBucket {
  sectionLetter: string;
  sectionCode: string;
  roomNumber?: string;
  maxCapacity?: number;
  students: RegisteredStudent2019[];
  maleCount: number;
  femaleCount: number;
  averageScore: number;
  highScorersCount?: number;
  mediumScorersCount?: number;
  supportScorersCount?: number;
  isCteSection?: boolean;
  cteSpecialization?: string;
}

/**
 * Distributes registered students into sections.
 * Options allow specifying studentsPerSection or fixed numberOfSections,
 * with distribution modes: 'combined-smart', 'gender-balanced', 'merit-balanced', or 'random'.
 */
export function allocateStudentsToSections(
  students: RegisteredStudent2019[],
  options: {
    grade: number;
    stream?: 'Natural Science' | 'Social Science';
    studentsPerSection?: number;
    numSections?: number;
    mode: 'combined-smart' | 'gender-balanced' | 'merit-balanced' | 'random';
    targetCapacity?: number;
    /**
     * Letter to start from (0 = A, 1 = B ...). Use it when classes already exist for this grade,
     * so new classes continue after them (existing 9A, 9B -> new ones are 9C, 9D).
     */
    startLetterIndex?: number;
  }
): SectionAllocationBucket[] {
  if (students.length === 0) return [];
  const startIndex = Math.max(0, options.startLetterIndex || 0);
  if (startIndex >= 26) return [];

  // Determine number of sections
  let sectionCount = 2;
  if (options.numSections && options.numSections > 0) {
    sectionCount = options.numSections;
  } else if (options.studentsPerSection && options.studentsPerSection > 0) {
    sectionCount = Math.max(1, Math.ceil(students.length / options.studentsPerSection));
  }

  // Cap section letters (A to Z)
  sectionCount = Math.min(sectionCount, 26 - startIndex);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(startIndex, startIndex + sectionCount);

  // Initialize buckets
  const buckets: SectionAllocationBucket[] = letters.map((letter, idx) => {
    const streamSuffix = options.stream
      ? options.stream === 'Natural Science'
        ? '-Nat'
        : '-Soc'
      : '';
    const sectionCode = `${options.grade}${streamSuffix}${letter}`;
    return {
      sectionLetter: letter,
      sectionCode,
      roomNumber: `Block ${String.fromCharCode(65 + Math.floor((idx + startIndex) / 4))} - Room ${101 + idx + startIndex}`,
      maxCapacity: options.targetCapacity || options.studentsPerSection || 45,
      students: [],
      maleCount: 0,
      femaleCount: 0,
      averageScore: 0,
      highScorersCount: 0,
      mediumScorersCount: 0,
      supportScorersCount: 0
    };
  });

  const studentPool = [...students];

  if (options.mode === 'random') {
    // Fisher-Yates shuffle
    for (let i = studentPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [studentPool[i], studentPool[j]] = [studentPool[j], studentPool[i]];
    }
    // Round-robin assignment
    studentPool.forEach((st, idx) => {
      const bucketIdx = idx % sectionCount;
      buckets[bucketIdx].students.push({
        ...st,
        allocatedSection: buckets[bucketIdx].sectionCode
      });
    });
  } else if (options.mode === 'combined-smart') {
    // COMBINED SMART: Stratify by Gender first, then by Merit tiers (High >=85, Mid 65-84, Support <65),
    // and distribute via snake-draft to achieve near-identical gender ratio and GPA curves across all sections.
    const males = studentPool.filter((s) => s.gender === 'M');
    const females = studentPool.filter((s) => s.gender === 'F');

    // Sort descending by score
    males.sort((a, b) => (b.previousAverageScore || 75) - (a.previousAverageScore || 75));
    females.sort((a, b) => (b.previousAverageScore || 75) - (a.previousAverageScore || 75));

    // Snake-draft females
    let femaleForward = true;
    let fIdx = 0;
    females.forEach((f) => {
      buckets[fIdx].students.push({
        ...f,
        allocatedSection: buckets[fIdx].sectionCode
      });
      if (femaleForward) {
        if (fIdx === sectionCount - 1) femaleForward = false;
        else fIdx++;
      } else {
        if (fIdx === 0) femaleForward = true;
        else fIdx--;
      }
    });

    // Reverse snake-draft males to balance out overall totals and merit
    let maleForward = false;
    let mIdx = sectionCount - 1;
    males.forEach((m) => {
      buckets[mIdx].students.push({
        ...m,
        allocatedSection: buckets[mIdx].sectionCode
      });
      if (maleForward) {
        if (mIdx === sectionCount - 1) maleForward = false;
        else mIdx++;
      } else {
        if (mIdx === 0) maleForward = true;
        else mIdx--;
      }
    });
  } else if (options.mode === 'gender-balanced') {
    // Separate males and females
    const males = studentPool.filter((s) => s.gender === 'M');
    const females = studentPool.filter((s) => s.gender === 'F');

    // Distribute females evenly
    females.forEach((f, idx) => {
      const bucketIdx = idx % sectionCount;
      buckets[bucketIdx].students.push({
        ...f,
        allocatedSection: buckets[bucketIdx].sectionCode
      });
    });

    // Distribute males evenly (offset direction for balance)
    males.forEach((m, idx) => {
      const bucketIdx = (sectionCount - 1 - (idx % sectionCount)) % sectionCount;
      buckets[bucketIdx].students.push({
        ...m,
        allocatedSection: buckets[bucketIdx].sectionCode
      });
    });
  } else {
    // Merit-balanced: sort by previous average descending, then snake-draft across sections
    studentPool.sort((a, b) => (b.previousAverageScore || 75) - (a.previousAverageScore || 75));
    let forward = true;
    let bIdx = 0;
    studentPool.forEach((st) => {
      buckets[bIdx].students.push({
        ...st,
        allocatedSection: buckets[bIdx].sectionCode
      });
      if (forward) {
        if (bIdx === sectionCount - 1) forward = false;
        else bIdx++;
      } else {
        if (bIdx === 0) forward = true;
        else bIdx--;
      }
    });
  }

  // Calculate statistics for each section
  recalculateAllBucketStats(buckets);

  return buckets;
}

/**
 * Recalculates metrics (gender, average score, tiers) for all buckets
 */
export function recalculateAllBucketStats(buckets: SectionAllocationBucket[]) {
  buckets.forEach((bucket) => {
    bucket.maleCount = bucket.students.filter((s) => s.gender === 'M').length;
    bucket.femaleCount = bucket.students.filter((s) => s.gender === 'F').length;
    const totalScore = bucket.students.reduce((acc, s) => acc + (s.previousAverageScore || 75), 0);
    bucket.averageScore = bucket.students.length > 0 ? Number((totalScore / bucket.students.length).toFixed(1)) : 0;
    bucket.highScorersCount = bucket.students.filter((s) => (s.previousAverageScore || 75) >= 85).length;
    bucket.mediumScorersCount = bucket.students.filter((s) => {
      const sc = s.previousAverageScore || 75;
      return sc >= 60 && sc < 85;
    }).length;
    bucket.supportScorersCount = bucket.students.filter((s) => (s.previousAverageScore || 75) < 60).length;
  });
}

/**
 * Move a student from their current section bucket to another target section bucket
 */
export function reassignStudentToSection(
  buckets: SectionAllocationBucket[],
  studentId: string,
  targetSectionCode: string
): SectionAllocationBucket[] {
  let movingStudent: RegisteredStudent2019 | null = null;

  // Clone buckets deeply
  const newBuckets: SectionAllocationBucket[] = buckets.map((b) => ({
    ...b,
    students: b.students.filter((s) => {
      if (s.id === studentId || s.studentId === studentId) {
        movingStudent = { ...s, allocatedSection: targetSectionCode };
        return false;
      }
      return true;
    })
  }));

  if (movingStudent) {
    const targetBucket = newBuckets.find((b) => b.sectionCode === targetSectionCode);
    if (targetBucket) {
      targetBucket.students.push(movingStudent);
    }
  }

  recalculateAllBucketStats(newBuckets);
  return newBuckets;
}

/**
 * Exports generated section rosters to a downloadable CSV string
 */
export function generateSectionRosterCsv(
  buckets: SectionAllocationBucket[],
  academicYear: string = '2017 E.C.'
): string {
  const headers = [
    'Academic Year',
    'Section Code',
    'Classroom',
    'Roll Number',
    'Student ID',
    'Full Name (English)',
    'Full Name (Amharic)',
    'Gender',
    'Stream',
    'Previous School',
    'Entrance / Previous Score (%)',
    'Guardian Contact'
  ];

  const rows: string[] = [headers.join(',')];

  buckets.forEach((bucket) => {
    bucket.students.forEach((s, idx) => {
      const row = [
        `"${academicYear}"`,
        `"${bucket.sectionCode}"`,
        `"${bucket.roomNumber || ''}"`,
        idx + 1,
        `"${s.studentId}"`,
        `"${s.fullName.replace(/"/g, '""')}"`,
        `"${s.fullNameAmharic.replace(/"/g, '""')}"`,
        `"${s.gender}"`,
        `"${s.stream || 'General'}"`,
        `"${s.previousSchool.replace(/"/g, '""')}"`,
        s.previousAverageScore || 75,
        `"${s.guardianPhone}"`
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

/**
 * Checks whether assigning a teacher to a period/day slot conflicts with any existing slot
 * for another section.
 * If conflict exists, returns detailed error in English and Amharic.
 */
export function checkTimetablePeriodConflict(
  existingSlots: TimetableSlot[],
  candidate: {
    slotId?: string; // If editing an existing slot
    teacherId: string;
    teacherName: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
    period: number;
    sectionCode: string;
    subjectName?: string;
  }
): ConflictCheckResult {
  if (!candidate.teacherId || candidate.teacherId.trim() === '' || candidate.teacherId === 'unassigned') {
    return { hasConflict: false };
  }

  // Find any slot where the same teacher is scheduled on the same day and period for a DIFFERENT section
  const conflict = existingSlots.find((slot) => {
    if (candidate.slotId && slot.id === candidate.slotId) return false;
    return (
      slot.teacherId === candidate.teacherId &&
      slot.day === candidate.day &&
      slot.period === candidate.period &&
      slot.sectionCode !== candidate.sectionCode
    );
  });

  if (conflict) {
    const errorEng = `Period Conflict Error: ${candidate.teacherName} is already assigned to teach Section ${conflict.sectionCode} (${conflict.subjectName}) during ${candidate.day} Period ${candidate.period}! A teacher cannot teach two different sections at the same period.`;
    const errorAmh = `የክፍለ-ጊዜ ግጭት ስህተት፡ መምህር ${candidate.teacherName} በ${candidate.day} በ${candidate.period}ኛ ክፍለ-ጊዜ በክፍል ${conflict.sectionCode} (${conflict.subjectName}) ላይ ተመድበዋል! አንድ መምህር በአንድ ክፍለ-ጊዜ ሁለት የተለያዩ ክፍሎችን ማስተማር አይችልም።`;

    return {
      hasConflict: true,
      conflictingSlot: conflict,
      errorMessage: errorEng,
      errorMessageAmharic: errorAmh
    };
  }

  return { hasConflict: false };
}
