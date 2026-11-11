import test from 'node:test';
import assert from 'node:assert/strict';
import { Student, GradeSection } from '../data/schoolData';
import { isOnRoster, isWaiting } from './rosterView';
import {
  isBanned,
  isBanExpired,
  banStudent,
  unbanStudent,
  disbandSection,
  isInSection,
  summariseSectionForDisband
} from './banAndDisband';

function sec(code: string, grade: number, letter: string, extra: Partial<GradeSection> = {}): GradeSection {
  return {
    id: `sec-${code}`, grade, section: code, sectionLetter: letter,
    stream: grade >= 11 ? 'Natural Science' : 'General Secondary', streamAmharic: '',
    totalStudents: 0, maleStudents: 0, femaleStudents: 0,
    homeroomTeacher: { id: '', name: 'Unassigned', nameAmharic: '', subject: '', phone: '' },
    studentMonitors: { classMonitor: '', deputyMonitor: '' }, subjectAssignments: [],
    roomNumber: '', buildingBlock: '', shift: 'Morning Shift (ጧት)', attendanceToday: 100, ...extra
  };
}

let n = 0;
function stu(grade: number, code: string, extra: Partial<Student> = {}): Student {
  n += 1;
  return {
    id: `s${n}`, studentId: `HMM-${n}`, fullName: `Student ${n}`, fullNameAmharic: '', gender: n % 2 ? 'M' : 'F',
    grade, section: code.replace(/^\d+-?(Nat-|Soc-)?/, ''), sectionCode: code, academicYear: '2019', status: 'active',
    rank: 3, totalStudentsInSection: 40, attendanceRate: 95, conduct: 'A', homeroomTeacher: 'Ato X',
    guardianName: '', guardianPhone: '',
    semesters: [{ semester: 1, subjects: [{ subjectId: 'math', subjectName: 'Math', subjectAmharic: '', teacherName: 'T', continuousAssessment: 20, midExam: 10, finalExam: 30, totalScore: 60 } as any] }, { semester: 2, subjects: [] }],
    ...extra
  };
}

test('ban sets the flag, date and reason; unban clears them', () => {
  const s = banStudent(stu(9, '9A'), { reason: '  Fighting ', today: '2026-11-10' });
  assert.equal(s.banned, true);
  assert.equal(s.bannedDate, '2026-11-10');
  assert.equal(s.bannedReason, 'Fighting');
  assert.equal(s.bannedUntil, undefined);
  const u = unbanStudent(s);
  assert.equal(u.banned, false);
  assert.equal(u.bannedReason, undefined);
  assert.equal(u.bannedDate, undefined);
});

test('a ban without an end date lasts; one with an end date stops on that date', () => {
  const open = banStudent(stu(9, '9A'), { today: '2026-11-10' });
  assert.equal(isBanned(open, '2030-01-01'), true);
  const timed = banStudent(stu(9, '9A'), { until: '2026-11-20', today: '2026-11-10' });
  assert.equal(isBanned(timed, '2026-11-19'), true);
  assert.equal(isBanned(timed, '2026-11-20'), false);
  assert.equal(isBanExpired(timed, '2026-11-25'), true);
  assert.equal(isBanned(stu(9, '9A'), '2026-11-10'), false);
});

test('a banned student stays on the roster with their class and marks', () => {
  const s = banStudent(stu(10, '10B'));
  assert.equal(isOnRoster(s), true);
  assert.equal(s.sectionCode, '10B');
  assert.equal(s.semesters[0].subjects.length, 1);
});

test('disbanding an academic class sends its students to the waiting list and keeps marks', () => {
  const a1 = stu(9, '9A'); const a2 = stu(9, '9A'); const b1 = stu(9, '9B');
  const res = disbandSection([a1, a2, b1], sec('9A', 9, 'A'));
  assert.equal(res.released.length, 2);
  res.released.forEach((s) => {
    assert.equal(isWaiting(s), true);
    assert.equal(s.sectionCode, '');
    assert.equal(s.rank, 0);
    assert.equal(s.semesters[0].subjects.length, 1);
  });
  assert.equal(res.students[2], b1); // other classes untouched, same object
});

test('disbanding a CTE group only clears the CTE group', () => {
  const s = stu(11, '11-Nat-A', { cteSection: '11-CTE-WD', cteRank: 1, stream: 'Natural Science' });
  const other = stu(11, '11-Nat-A', { cteSection: '11-CTE-IT', stream: 'Natural Science' });
  const res = disbandSection([s, other], sec('11-CTE-WD', 11, 'A', { isCteSection: true }));
  assert.equal(res.released.length, 1);
  assert.equal(res.released[0].cteSection, undefined);
  assert.equal(res.released[0].sectionCode, '11-Nat-A');
  assert.equal(isOnRoster(res.released[0]), true);
  assert.equal(res.students[1], other);
});

test('older rows that only have a class letter are matched by grade and letter', () => {
  const old = stu(9, '', { sectionCode: '', section: 'A' });
  assert.equal(isInSection(old, sec('9A', 9, 'A')), true);
  assert.equal(isInSection(old, sec('10A', 10, 'A')), false);
});

test('summary counts boys, girls and students under a ban', () => {
  const a = banStudent(stu(9, '9A', { gender: 'M' }));
  const b = stu(9, '9A', { gender: 'F' });
  const sum = summariseSectionForDisband([a, b, stu(9, '9B')], sec('9A', 9, 'A'));
  assert.deepEqual(sum, { total: 2, boys: 1, girls: 1, banned: 1 });
});
