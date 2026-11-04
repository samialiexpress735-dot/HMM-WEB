import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalScore,
  getEthiopianLetterGrade,
  evaluateSubjectGrade,
  evaluateSemesterPerformance,
  evaluateESSLCEResult,
  SubjectAssessment
} from './gradeCalculations';

test('calculateTotalScore sums continuous, mid, and final within bounds', () => {
  assert.equal(calculateTotalScore(25, 18, 45), 88);
  assert.equal(calculateTotalScore(35, 25, 55), 100);
  assert.equal(calculateTotalScore(-5, 0, 10), 10);
});

test('getEthiopianLetterGrade assigns accurate letter grade and remarks without GPA', () => {
  const g92 = getEthiopianLetterGrade(92);
  assert.equal(g92.letter, 'A+');
  assert.equal(g92.remarks, 'Excellent');

  const g76 = getEthiopianLetterGrade(76);
  assert.equal(g76.letter, 'B+');
  assert.equal(g76.remarks, 'Good');

  const g52 = getEthiopianLetterGrade(52);
  assert.equal(g52.letter, 'C');
  assert.equal(g52.remarks, 'Pass');

  const g35 = getEthiopianLetterGrade(35);
  assert.equal(g35.letter, 'F');
  assert.equal(g35.remarks, 'Fail');
});

test('evaluateSubjectGrade calculates passing status correctly', () => {
  const passSubject: SubjectAssessment = {
    subjectId: 'math-9',
    subjectName: 'Mathematics',
    continuousAssessment: 26,
    midExam: 17,
    finalExam: 42
  };
  const result = evaluateSubjectGrade(passSubject);
  assert.equal(result.totalScore, 85);
  assert.equal(result.letterGrade, 'A');
  assert.equal(result.isPassing, true);
});

test('evaluateSemesterPerformance computes Total Marks, Percentage Average, and promotion status without GPA', () => {
  const assessments: SubjectAssessment[] = [
    { subjectId: '1', subjectName: 'Mathematics', continuousAssessment: 28, midExam: 18, finalExam: 46 }, // 92
    { subjectId: '2', subjectName: 'English', continuousAssessment: 25, midExam: 17, finalExam: 43 },     // 85
    { subjectId: '3', subjectName: 'Physics', continuousAssessment: 26, midExam: 16, finalExam: 42 },     // 84
    { subjectId: '4', subjectName: 'Chemistry', continuousAssessment: 27, midExam: 18, finalExam: 44 }    // 89
  ];

  const summary = evaluateSemesterPerformance(assessments, 10);
  assert.equal(summary.totalSubjects, 4);
  assert.equal(summary.totalMarksObtained, 350);
  assert.equal(summary.totalPossibleMarks, 400);
  assert.equal(summary.overallAverage, 87.5);
  assert.equal(summary.status, 'Promoted with High Distinction');
  assert.equal(summary.failedCount, 0);
  assert.equal(summary.streamEligible, 'Both');
});

test('evaluateESSLCEResult identifies university entrance status', () => {
  const direct = evaluateESSLCEResult(380, 600);
  assert.equal(direct.status, 'Direct University Admission');

  const remedial = evaluateESSLCEResult(260, 600);
  assert.equal(remedial.status, 'Remedial University Program');
});
