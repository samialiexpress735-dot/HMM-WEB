import test from 'node:test';
import assert from 'node:assert/strict';
import { GradeSection } from '../data/schoolData';
import { RegisteredStudent2019, allocateStudentsToSections } from './registrationAndTimetable';
import {
  DEFAULT_SECTION_CAPACITY,
  getSectionCapacity,
  getSectionFill,
  validateSectionCapacity,
  getWaitingStudents,
  planSeatFilling,
  applyAssignmentsToSections,
  nextLetterIndex,
  sectionAcceptsStudent
} from './sectionCapacity';

function sec(code: string, grade: number, letter: string, extra: Partial<GradeSection> = {}): GradeSection {
  return {
    id: `sec-${code}`,
    grade,
    section: code,
    sectionLetter: letter,
    stream: grade >= 11 ? 'Natural Science' : 'General Secondary',
    streamAmharic: '',
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    homeroomTeacher: { id: '', name: 'Unassigned', nameAmharic: '', subject: '', phone: '' },
    studentMonitors: { classMonitor: '', deputyMonitor: '' },
    subjectAssignments: [],
    roomNumber: '',
    buildingBlock: '',
    shift: 'Morning Shift (ጧት)',
    attendanceToday: 100,
    ...extra
  };
}

let n = 0;
function stu(grade: number, gender: 'M' | 'F', extra: Partial<RegisteredStudent2019> = {}): RegisteredStudent2019 {
  n += 1;
  return {
    id: `r${n}`,
    studentId: `HMM-${n}`,
    fullName: `Student ${n}`,
    fullNameAmharic: '',
    gender,
    targetGrade: grade,
    academicYear: '2019 E.C.',
    previousSchool: '',
    previousGrade: grade - 1,
    guardianName: '',
    guardianPhone: '',
    conduct: 'A',
    registrationDate: '2026-01-01',
    avatar: '',
    previousAverageScore: 75,
    ...extra
  };
}

test('capacity falls back to the default when a section has none saved', () => {
  assert.equal(getSectionCapacity(sec('9A', 9, 'A')), DEFAULT_SECTION_CAPACITY);
  assert.equal(getSectionCapacity(sec('9A', 9, 'A', { capacity: 40 })), 40);
  assert.equal(getSectionCapacity(sec('9A', 9, 'A', { capacity: 0 })), DEFAULT_SECTION_CAPACITY);
});

test('free seats = capacity minus students already placed', () => {
  const s = sec('9A', 9, 'A', { capacity: 40, totalStudents: 30, maleStudents: 15, femaleStudents: 15 });
  const fill = getSectionFill(s, []);
  assert.equal(fill.enrolled, 30);
  assert.equal(fill.free, 10);
});

test('seats cannot be lowered below the number of students in the class', () => {
  const s = sec('9A', 9, 'A', { capacity: 40, totalStudents: 30 });
  assert.equal(validateSectionCapacity(s, 29, []).ok, false);
  assert.equal(validateSectionCapacity(s, 29, []).minimum, 30);
  assert.equal(validateSectionCapacity(s, 30, []).ok, true);
  assert.equal(validateSectionCapacity(s, 60, []).ok, true);
});

test('40 seats, 30 students: new matching students are moved in until the class is full', () => {
  const sections = [sec('9A', 9, 'A', { capacity: 40, totalStudents: 30, maleStudents: 15, femaleStudents: 15 })];
  const waiting = Array.from({ length: 14 }, (_, i) => stu(9, i % 2 ? 'M' : 'F'));
  const { assignments, remaining } = planSeatFilling(waiting, sections, waiting);
  assert.equal(assignments.length, 10);
  assert.equal(remaining.length, 4);
  assert.ok(assignments.every((a) => a.sectionCode === '9A'));

  const updated = applyAssignmentsToSections(sections, assignments, waiting);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].totalStudents, 40);
  assert.equal(updated[0].maleStudents + updated[0].femaleStudents, 40);
});

test('students only go to a class of their own grade', () => {
  const sections = [sec('9A', 9, 'A', { capacity: 40 }), sec('10A', 10, 'A', { capacity: 40 })];
  const waiting = [stu(10, 'M'), stu(10, 'F')];
  const { assignments } = planSeatFilling(waiting, sections, waiting);
  assert.ok(assignments.every((a) => a.sectionCode === '10A'));
});

test('Grade 11 students only go to a class of their own stream', () => {
  const nat = sec('11-NatA', 11, 'A', { capacity: 40, stream: 'Natural Science' });
  const soc = sec('11-SocA', 11, 'A', { capacity: 40, stream: 'Social Science' });
  const waiting = [stu(11, 'M', { stream: 'Social Science' }), stu(11, 'F', { stream: 'Natural Science' })];
  const { assignments } = planSeatFilling(waiting, [nat, soc], waiting);
  const byStudent = new Map(assignments.map((a) => [a.studentId, a.sectionCode]));
  assert.equal(byStudent.get(waiting[0].id), '11-SocA');
  assert.equal(byStudent.get(waiting[1].id), '11-NatA');
});

test('a full class takes nobody, and CTE groups are never used for academic placement', () => {
  const full = sec('9A', 9, 'A', { capacity: 30, totalStudents: 30 });
  const cte = sec('11-CTE-WD', 11, 'A', { isCteSection: true, capacity: 40 });
  const waiting = [stu(9, 'M'), stu(11, 'F', { stream: 'Natural Science' })];
  const { assignments, remaining } = planSeatFilling(waiting, [full, cte], waiting);
  assert.equal(assignments.length, 0);
  assert.equal(remaining.length, 2);
  assert.equal(sectionAcceptsStudent(cte, waiting[1]), false);
});

test('the emptier class is filled first, and class sizes level out', () => {
  const sections = [
    sec('9A', 9, 'A', { capacity: 40, totalStudents: 30, maleStudents: 15, femaleStudents: 15 }),
    sec('9B', 9, 'B', { capacity: 40, totalStudents: 20, maleStudents: 10, femaleStudents: 10 })
  ];
  const six = Array.from({ length: 6 }, () => stu(9, 'M'));
  const a = planSeatFilling(six, sections, six);
  // 9B has fewer students, and still has fewer after 6 more
  assert.ok(a.assignments.every((x) => x.sectionCode === '9B'));

  // With 20 more boys 9B catches up to 30, then they alternate; nobody goes over 40 seats
  const many = Array.from({ length: 20 }, () => stu(9, 'M'));
  const b = planSeatFilling(many, sections, many);
  const updated = applyAssignmentsToSections(sections, b.assignments, many);
  const totals = Object.fromEntries(updated.map((u) => [u.section, u.totalStudents]));
  assert.ok(totals['9A'] <= 40 && totals['9B'] <= 40);
  assert.ok(Math.abs(totals['9A'] - totals['9B']) <= 1);
  assert.equal(b.remaining.length, 0);
});

test('waiting list = no class, or a class that no longer exists', () => {
  const sections = [sec('9A', 9, 'A')];
  const placed = stu(9, 'M', { allocatedSection: '9A' });
  const waiting = stu(9, 'F');
  const orphan = stu(9, 'F', { allocatedSection: '9Z' });
  const other = stu(10, 'F');
  const list = getWaitingStudents([placed, waiting, orphan, other], sections, 9);
  assert.deepEqual(list.map((s) => s.id).sort(), [waiting.id, orphan.id].sort());
});

test('new classes continue after the existing letters', () => {
  const sections = [sec('9A', 9, 'A'), sec('9B', 9, 'B'), sec('10A', 10, 'A')];
  assert.equal(nextLetterIndex(sections, 9), 2);
  assert.equal(nextLetterIndex(sections, 10), 1);
  assert.equal(nextLetterIndex(sections, 12), 0);

  const pool = Array.from({ length: 4 }, () => stu(9, 'M'));
  const buckets = allocateStudentsToSections(pool, { grade: 9, numSections: 2, mode: 'random', startLetterIndex: 2 });
  assert.deepEqual(buckets.map((b) => b.sectionCode), ['9C', '9D']);
});

test('letters never run past Z', () => {
  const pool = [stu(9, 'M'), stu(9, 'F'), stu(9, 'M')];
  const buckets = allocateStudentsToSections(pool, { grade: 9, numSections: 5, mode: 'combined-smart', startLetterIndex: 24 });
  assert.deepEqual(buckets.map((b) => b.sectionCode), ['9Y', '9Z']);
  assert.equal(buckets.reduce((a, b) => a + b.students.length, 0), 3);
  assert.deepEqual(allocateStudentsToSections(pool, { grade: 9, numSections: 2, mode: 'random', startLetterIndex: 26 }), []);
});
