import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ArchiveStudent,
  RegisteredStudent2019,
  TimetableSlot,
  recommendPreviousYearStudents,
  allocateStudentsToSections,
  checkTimetablePeriodConflict
} from './registrationAndTimetable';

const mockArchive: ArchiveStudent[] = [
  {
    id: 'arch-1',
    studentId: 'DB-2018-081',
    fullName: 'Yared Getachew Tadesse',
    fullNameAmharic: 'ያሬድ ጌታቸው ታደሰ',
    gender: 'M',
    previousGrade: 8,
    previousSection: '8A',
    previousSchool: 'Debre Berhan Primary School',
    previousAverageScore: 92.4,
    eligibleForGrade: 9,
    guardianName: 'Ato Getachew Tadesse',
    guardianPhone: '+251 91 100 2233',
    conduct: 'A'
  },
  {
    id: 'arch-2',
    studentId: 'DB-2018-082',
    fullName: 'Bethlehem Alemu Worku',
    fullNameAmharic: 'ቤተልሔም አለሙ ወርቁ',
    gender: 'F',
    previousGrade: 8,
    previousSection: '8C',
    previousSchool: 'Atse Zeray Jacob Primary',
    previousAverageScore: 89.1,
    eligibleForGrade: 9,
    guardianName: 'W/ro Roman Bekele',
    guardianPhone: '+251 91 211 4455',
    conduct: 'A'
  },
  {
    id: 'arch-3',
    studentId: 'HMM-2018-091',
    fullName: 'Dawit Solomon Haile',
    fullNameAmharic: 'ዳዊት ሰለሞን ኃይሌ',
    gender: 'M',
    previousGrade: 9,
    previousSection: '9B',
    previousSchool: 'Hailemariam Mamo Secondary',
    previousAverageScore: 81.0,
    eligibleForGrade: 10,
    guardianName: 'Ato Solomon Haile',
    guardianPhone: '+251 91 322 5566',
    conduct: 'A'
  }
];

test('recommendPreviousYearStudents filters accurately by target grade and query', () => {
  // Query by grade only
  const grade9 = recommendPreviousYearStudents(mockArchive, 9, '');
  assert.equal(grade9.length, 2);
  assert.equal(grade9[0].fullName, 'Yared Getachew Tadesse');

  // Search by English partial
  const searchEnglish = recommendPreviousYearStudents(mockArchive, 9, 'beth');
  assert.equal(searchEnglish.length, 1);
  assert.equal(searchEnglish[0].fullName, 'Bethlehem Alemu Worku');

  // Search by Amharic partial
  const searchAmharic = recommendPreviousYearStudents(mockArchive, 9, 'ያሬድ');
  assert.equal(searchAmharic.length, 1);
  assert.equal(searchAmharic[0].fullName, 'Yared Getachew Tadesse');

  // Target grade 10
  const grade10 = recommendPreviousYearStudents(mockArchive, 10, 'Dawit');
  assert.equal(grade10.length, 1);
  assert.equal(grade10[0].fullName, 'Dawit Solomon Haile');
});

test('allocateStudentsToSections creates expected section count and distributes students', () => {
  const students: RegisteredStudent2019[] = Array.from({ length: 40 }).map((_, i) => ({
    id: `reg-${i + 1}`,
    studentId: `REG-2019-${100 + i}`,
    fullName: `Student ${i + 1}`,
    fullNameAmharic: `ተማሪ ${i + 1}`,
    gender: i % 2 === 0 ? 'M' : 'F',
    targetGrade: 9,
    academicYear: '2019 E.C.',
    previousSchool: 'Primary School',
    previousGrade: 8,
    previousAverageScore: 70 + (i % 25),
    guardianName: `Guardian ${i + 1}`,
    guardianPhone: '+251 91 000 0000',
    conduct: 'A',
    registrationDate: '2026-09-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  }));

  // Divide 40 students with 20 per section -> 2 sections
  const result = allocateStudentsToSections(students, {
    grade: 9,
    studentsPerSection: 20,
    mode: 'gender-balanced'
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].sectionCode, '9A');
  assert.equal(result[1].sectionCode, '9B');
  assert.equal(result[0].students.length, 20);
  assert.equal(result[1].students.length, 20);

  // Gender balance check
  assert.equal(result[0].maleCount, 10);
  assert.equal(result[0].femaleCount, 10);
  assert.equal(result[1].maleCount, 10);
  assert.equal(result[1].femaleCount, 10);
});

test('checkTimetablePeriodConflict detects same-teacher period clash across different sections', () => {
  const existingSlots: TimetableSlot[] = [
    {
      id: 'slot-1',
      day: 'Tuesday',
      period: 3,
      sectionCode: '9A',
      subjectId: 'math',
      subjectName: 'Mathematics',
      teacherId: 't2',
      teacherName: 'Ato Daniel Girma'
    },
    {
      id: 'slot-2',
      day: 'Tuesday',
      period: 4,
      sectionCode: '9A',
      subjectId: 'phys',
      subjectName: 'Physics',
      teacherId: 't1',
      teacherName: 'W/ro Almaz Kebede'
    }
  ];

  // Attempting to assign Ato Daniel Girma (t2) to Section 9B on Tuesday Period 3 should CONFLICT
  const conflictCheck = checkTimetablePeriodConflict(existingSlots, {
    teacherId: 't2',
    teacherName: 'Ato Daniel Girma',
    day: 'Tuesday',
    period: 3,
    sectionCode: '9B',
    subjectName: 'Mathematics'
  });

  assert.equal(conflictCheck.hasConflict, true);
  assert.ok(conflictCheck.errorMessage?.includes('Period Conflict Error'));
  assert.ok(conflictCheck.errorMessage?.includes('9A'));

  // Assigning Ato Daniel Girma on Tuesday Period 5 to Section 9B should SUCCEED (free period)
  const freeCheck = checkTimetablePeriodConflict(existingSlots, {
    teacherId: 't2',
    teacherName: 'Ato Daniel Girma',
    day: 'Tuesday',
    period: 5,
    sectionCode: '9B',
    subjectName: 'Mathematics'
  });

  assert.equal(freeCheck.hasConflict, false);
});
