/**
 * Grade calculation utilities for Hailemariam Mamo Secondary & Preparatory School
 * Compliant with the Ethiopian Ministry of Education Secondary Curriculum (Grades 9-12).
 * Note: Ethiopian secondary schools use Percentage Average (አማካይ), Total Marks (ድምር),
 * and Class Rank (ደረጃ), not the GPA 4.0 system.
 */

export interface SubjectAssessment {
  subjectId: string;
  subjectName: string;
  continuousAssessment: number; // Max 30 (Tests, Assignments, Labs)
  midExam: number;              // Max 20
  finalExam: number;            // Max 50
}

export interface CalculatedSubjectGrade {
  subjectId: string;
  subjectName: string;
  totalScore: number;           // Out of 100
  letterGrade: string;          // A+, A, B, C, D, F
  isPassing: boolean;
  remarks: string;
}

export interface SemesterSummary {
  totalSubjects: number;
  totalMarksObtained: number;   // e.g. 645
  totalPossibleMarks: number;   // e.g. 700
  overallAverage: number;       // Percentage e.g. 92.1%
  conduct: 'A' | 'B' | 'C' | 'D'; // Ethiopian Secondary Conduct rating (ስነ-ምግባር)
  status: 'Promoted with High Distinction' | 'Promoted with Distinction' | 'Promoted' | 'Academic Warning' | 'Retained';
  statusAmharic: string;
  passedCount: number;
  failedCount: number;
  streamEligible?: 'Natural Science' | 'Social Science' | 'Both' | 'Pending Remedial';
}

/**
 * Calculates the total score out of 100 from Ethiopian high school grading components
 */
export function calculateTotalScore(continuous: number, mid: number, final: number): number {
  const c = Math.max(0, Math.min(30, Number(continuous) || 0));
  const m = Math.max(0, Math.min(20, Number(mid) || 0));
  const f = Math.max(0, Math.min(50, Number(final) || 0));
  return Math.round((c + m + f) * 10) / 10;
}

/**
 * Converts percentage score to Ethiopian secondary letter grade and verbal remarks
 * (Ethiopian Secondary Scale: 90+ = A+, 85-89 = A, 80-84 = A-, 75-79 = B+, 70-74 = B, 65-69 = B-, 60-64 = C+, 50-59 = C, 40-49 = D, <40 = F)
 */
export function getEthiopianLetterGrade(score: number): { letter: string; remarks: string; remarksAmharic: string } {
  const rounded = Math.round(score);
  if (rounded >= 90) return { letter: 'A+', remarks: 'Excellent', remarksAmharic: 'በጣም ከፍተኛ' };
  if (rounded >= 85) return { letter: 'A', remarks: 'Very Good', remarksAmharic: 'ከፍተኛ' };
  if (rounded >= 80) return { letter: 'A-', remarks: 'Very Good', remarksAmharic: 'ከፍተኛ' };
  if (rounded >= 75) return { letter: 'B+', remarks: 'Good', remarksAmharic: 'ጥሩ' };
  if (rounded >= 70) return { letter: 'B', remarks: 'Good', remarksAmharic: 'ጥሩ' };
  if (rounded >= 65) return { letter: 'B-', remarks: 'Satisfactory', remarksAmharic: 'መካከለኛ' };
  if (rounded >= 60) return { letter: 'C+', remarks: 'Satisfactory', remarksAmharic: 'መካከለኛ' };
  if (rounded >= 50) return { letter: 'C', remarks: 'Pass', remarksAmharic: 'አጥጋቢ' };
  if (rounded >= 40) return { letter: 'D', remarks: 'Conditional Pass', remarksAmharic: 'ዝቅተኛ' };
  return { letter: 'F', remarks: 'Fail', remarksAmharic: 'ያላሟላ' };
}

/**
 * Computes individual subject grade results
 */
export function evaluateSubjectGrade(assessment: SubjectAssessment): CalculatedSubjectGrade {
  const total = calculateTotalScore(
    assessment.continuousAssessment,
    assessment.midExam,
    assessment.finalExam
  );
  const { letter, remarks } = getEthiopianLetterGrade(total);

  return {
    subjectId: assessment.subjectId,
    subjectName: assessment.subjectName,
    totalScore: total,
    letterGrade: letter,
    isPassing: total >= 50,
    remarks
  };
}

/**
 * Evaluates entire semester academic performance using Ethiopian secondary standards
 */
export function evaluateSemesterPerformance(
  assessments: SubjectAssessment[],
  gradeLevel: number = 9
): SemesterSummary {
  if (assessments.length === 0) {
    return {
      totalSubjects: 0,
      totalMarksObtained: 0,
      totalPossibleMarks: 0,
      overallAverage: 0,
      conduct: 'A',
      status: 'Retained',
      statusAmharic: 'ወድቋል',
      passedCount: 0,
      failedCount: 0
    };
  }

  const evaluated = assessments.map(evaluateSubjectGrade);
  const totalScoreSum = Math.round(evaluated.reduce((acc, curr) => acc + curr.totalScore, 0) * 10) / 10;
  const totalPossible = evaluated.length * 100;
  const overallAverage = Math.round((totalScoreSum / evaluated.length) * 10) / 10;
  const passedCount = evaluated.filter(s => s.isPassing).length;
  const failedCount = evaluated.length - passedCount;

  let status: SemesterSummary['status'] = 'Promoted';
  let statusAmharic = 'አልፏል (ተዛውሯል)';

  if (failedCount === 0 && overallAverage >= 85) {
    status = 'Promoted with High Distinction';
    statusAmharic = 'በከፍተኛ ማዕረግ አለፈ';
  } else if (failedCount === 0 && overallAverage >= 75) {
    status = 'Promoted with Distinction';
    statusAmharic = 'በማዕረግ አለፈ';
  } else if (failedCount <= 2 && overallAverage >= 50) {
    status = 'Promoted';
    statusAmharic = 'አልፏል';
  } else if (overallAverage >= 45 && failedCount <= 3) {
    status = 'Academic Warning';
    statusAmharic = 'የማካካሻ ፈተና (ማስጠንቀቂያ)';
  } else {
    status = 'Retained';
    statusAmharic = 'የደገመ (ያላለፈ)';
  }

  let streamEligible: SemesterSummary['streamEligible'] = undefined;
  if (gradeLevel === 10) {
    const math = evaluated.find(s => s.subjectName.toLowerCase().includes('math'))?.totalScore || 0;
    const physics = evaluated.find(s => s.subjectName.toLowerCase().includes('physics'))?.totalScore || 0;
    const chemistry = evaluated.find(s => s.subjectName.toLowerCase().includes('chemistry'))?.totalScore || 0;

    const naturalScoreOk = math >= 65 && (physics >= 60 || chemistry >= 60) && overallAverage >= 65;
    if (naturalScoreOk) {
      streamEligible = 'Both';
    } else if (overallAverage >= 50) {
      streamEligible = 'Social Science';
    } else {
      streamEligible = 'Pending Remedial';
    }
  }

  return {
    totalSubjects: evaluated.length,
    totalMarksObtained: totalScoreSum,
    totalPossibleMarks: totalPossible,
    overallAverage,
    conduct: overallAverage >= 70 ? 'A' : 'B',
    status,
    statusAmharic,
    passedCount,
    failedCount,
    streamEligible
  };
}

/**
 * Predicts ESSLCE Grade 12 Ethiopian National University Entrance Exam result status
 */
export function evaluateESSLCEResult(totalScore: number, maxScore: number = 600): {
  status: 'Direct University Admission' | 'Remedial University Program' | 'TVET / Technical College' | 'Needs Retake';
  badgeColor: string;
  message: string;
} {
  const percentage = (totalScore / maxScore) * 100;

  if (percentage >= 50) {
    return {
      status: 'Direct University Admission',
      badgeColor: 'emerald',
      message: 'Qualifies for direct degree admissions at Addis Ababa University, Debre Berhan University, and other top public universities.'
    };
  } else if (percentage >= 40) {
    return {
      status: 'Remedial University Program',
      badgeColor: 'amber',
      message: 'Eligible for the 1-year Ministry of Education Higher Education Remedial Program at regional public universities.'
    };
  } else if (percentage >= 30) {
    return {
      status: 'TVET / Technical College',
      badgeColor: 'blue',
      message: 'Eligible for Level IV Poly-Technic and vocational diploma programs in North Shewa and Amhara region.'
    };
  }

  return {
    status: 'Needs Retake',
    badgeColor: 'rose',
    message: 'Below the passing cutoff for public higher institutions. Recommended to re-register for the next national examination sitting.'
  };
}
