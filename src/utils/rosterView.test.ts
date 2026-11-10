import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rosterCounts, buildRegisteredView, newWaitingStudent, placeStudentInClass, nextStudentId, setStudentStatus,
  isOnRoster, isWaiting, mergeRosterUpdate, stampNewStudents
} from './rosterView';
import { Student, GradeSection } from '../data/schoolData';
import { RegisteredStudent2019 } from './registrationAndTimetable';

const reg = (id: string, extra: Partial<RegisteredStudent2019> = {}): RegisteredStudent2019 =>
  ({
    id, studentId: `HMM-2019-${id}`, fullName: `Student ${id}`, fullNameAmharic: '', gender: 'M', targetGrade: 9,
    academicYear: '2019', previousSchool: 'X', previousGrade: 8, previousAverageScore: 77.5, guardianName: 'G',
    guardianPhone: '1', conduct: 'A', registrationDate: '2026-01-01', avatar: '', ...extra
  }) as RegisteredStudent2019;

const stu = (id: string, extra: Partial<Student> = {}): Student =>
  ({ ...newWaitingStudent(reg(id), '2019'), ...extra }) as Student;

const template = [{ subjectId: 'math', subjectName: 'Math' }, { subjectId: 'eng', subjectName: 'English' }];

test('registered / in a class / waiting all come from the students table', () => {
  const students = [
    stu('1', { section: 'A', sectionCode: '9A' }),
    stu('2'),
    stu('3'),
    stu('4', { section: 'B', sectionCode: '9B', status: 'inactive' })
  ];
  assert.deepEqual(rosterCounts(students), { registered: 3, inClass: 1, waiting: 2, inactive: 1 });
});

test('a student who registered but has no class is waiting, and not on any portal roster', () => {
  const s = newWaitingStudent(reg('9'), '2019');
  assert.equal(isWaiting(s), true);
  assert.equal(isOnRoster(s), false);
  assert.equal(s.section, '');
  assert.equal(s.academicYear, '2019');
});

test('the registrar list takes the class from the student and the admission data from the registration', () => {
  const regs = [reg('1'), reg('2')];
  const students = [stu('1', { section: 'A', sectionCode: '9A' }), stu('2')];
  const view = buildRegisteredView(regs, students);
  assert.equal(view.find((v) => v.id === '1')!.allocatedSection, '9A');
  assert.equal(view.find((v) => v.id === '2')!.allocatedSection, undefined);
  assert.equal(view[0].previousAverageScore, 77.5);
});

test('a registration whose student row was deleted does not show up', () => {
  const view = buildRegisteredView([reg('1'), reg('gone')], [stu('1')]);
  assert.deepEqual(view.map((v) => v.id), ['1']);
});

test('a student without any registration is still listed, built from their own record', () => {
  const view = buildRegisteredView([], [stu('7', { section: 'A', sectionCode: '9A' })]);
  assert.equal(view.length, 1);
  assert.equal(view[0].allocatedSection, '9A');
});

test('inactive students leave the working list', () => {
  const view = buildRegisteredView([reg('1')], [stu('1', { status: 'inactive' })]);
  assert.equal(view.length, 0);
});

test('placing a waiting student gives them the class and the subject list', () => {
  const placed = placeStudentInClass({
    existing: stu('1'), reg: reg('1'), academicYear: '2019', grade: 9, sectionLetter: 'A', sectionCode: '9A',
    rank: 3, totalInSection: 40, template
  });
  assert.equal(placed.sectionCode, '9A');
  assert.equal(placed.section, 'A');
  assert.equal(placed.semesters[0].subjects.length, 2);
  assert.equal(isOnRoster(placed), true);
});

test('placing a student never wipes marks that already exist', () => {
  const withMarks = stu('1', {
    semesters: [
      { semester: 1, subjects: [{ subjectId: 'math', subjectName: 'Math', subjectAmharic: '', teacherName: 'T', continuousAssessment: 25, midExam: 10, finalExam: 40 }] },
      { semester: 2, subjects: [] }
    ] as any
  });
  const placed = placeStudentInClass({
    existing: withMarks, reg: reg('1'), academicYear: '2019', grade: 9, sectionLetter: 'B', sectionCode: '9B',
    rank: 1, totalInSection: 30, template
  });
  assert.equal(placed.semesters[0].subjects[0].continuousAssessment, 25);
  assert.equal(placed.sectionCode, '9B');
});

test('a returning student keeps their permanent school ID', () => {
  assert.equal(nextStudentId({ linkedStudentId: 'HMM-2018-0042', year: '2020', taken: [] }), 'HMM-2018-0042');
});

test('a new student gets the next number for the year, skipping IDs already in use', () => {
  assert.equal(nextStudentId({ year: '2020', taken: [] }), 'HMM-2020-0001');
  assert.equal(nextStudentId({ year: '2020', taken: ['HMM-2020-0001', 'HMM-2020-0002', 'HMM-2019-0900'] }), 'HMM-2020-0003');
  assert.equal(nextStudentId({ year: '2019', taken: ['HMM-2019-0901'] }), 'HMM-2019-0902');
});

test('leaving the school is recorded, not deleted, and can be undone', () => {
  const left = setStudentStatus(stu('1', { section: 'A', sectionCode: '9A' }), 'inactive', ' moved away ', '2026-12-01');
  assert.equal(left.status, 'inactive');
  assert.equal(left.leftDate, '2026-12-01');
  assert.equal(left.leftReason, 'moved away');
  assert.equal(left.sectionCode, '9A');
  const back = setStudentStatus(left, 'active');
  assert.equal(back.status, 'active');
  assert.equal(back.leftDate, undefined);
});

test('a student who only has a class letter gets the full class code from the year\'s classes', async () => {
  const { deriveSectionCode } = await import('./rosterView');
  const sections = [
    { id: 'a', grade: 9, section: '9A', sectionLetter: 'A', stream: 'General Secondary' },
    { id: 'b', grade: 11, section: '11-Nat-A', sectionLetter: 'A', stream: 'Natural Science' },
    { id: 'c', grade: 11, section: '11-Soc-A', sectionLetter: 'A', stream: 'Social Science' },
    { id: 'd', grade: 11, section: '11-CTE-WD', sectionLetter: 'A', stream: 'Natural Science', isCteSection: true }
  ] as unknown as GradeSection[];
  assert.equal(deriveSectionCode({ grade: 9, section: 'A', stream: undefined }, sections), '9A');
  assert.equal(deriveSectionCode({ grade: 11, section: 'A', stream: 'Social Science' }, sections), '11-Soc-A');
  assert.equal(deriveSectionCode({ grade: 11, section: 'A', stream: 'Natural Science' }, sections), '11-Nat-A');
  assert.equal(deriveSectionCode({ grade: 9, section: '', stream: undefined }, sections), '');
  assert.equal(deriveSectionCode({ grade: 10, section: 'Z', stream: undefined }, sections), '');
});

test('a portal saving its roster never makes waiting or left students disappear', () => {
  const placed = stu('1', { section: 'A', sectionCode: '9A' });
  const waiting = stu('2');
  const left = stu('3', { section: 'A', sectionCode: '9A', status: 'inactive' });
  const edited = { ...placed, rank: 5 };
  const next = mergeRosterUpdate([placed, waiting, left], [edited]);
  assert.deepEqual(next.map((x) => x.id).sort(), ['1', '2', '3']);
  assert.equal(next.find((x) => x.id === '1')!.rank, 5);
  assert.equal(next.find((x) => x.id === '2'), waiting);
  assert.equal(next.find((x) => x.id === '3'), left);
});

test('a portal can still remove a student it can see, and add a new one', () => {
  const a = stu('1', { section: 'A', sectionCode: '9A' });
  const b = stu('2', { section: 'A', sectionCode: '9A' });
  const c = stu('3', { section: 'A', sectionCode: '9A' });
  const next = mergeRosterUpdate([a, b, stu('9')], [c, a]);
  assert.deepEqual(next.map((x) => x.id).sort(), ['1', '3', '9']);
});

test('a student created by another screen is stamped with the current year and their class code', () => {
  const sections = [{ id: 'a', grade: 9, section: '9A', sectionLetter: 'A', stream: 'General Secondary' }] as unknown as GradeSection[];
  const old = stu('1', { section: 'A', sectionCode: '9A' });
  const fresh = stu('2', { grade: 9, section: 'A', sectionCode: '', academicYear: '2026/2027 (2019 ዓ.ም.)' });
  const out = stampNewStudents([old], [old, fresh], '2019', sections);
  assert.equal(out[0], old); // untouched
  assert.equal(out[1].academicYear, '2019');
  assert.equal(out[1].sectionCode, '9A');
  assert.equal(out[1].status, 'active');
});
