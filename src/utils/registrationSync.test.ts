import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileRegistrations, releaseSeatsOfRemoved } from './registrationSync';
import { RegisteredStudent2019 } from './registrationAndTimetable';
import { GradeSection } from '../data/schoolData';

const reg = (id: string, extra: Partial<RegisteredStudent2019> = {}): RegisteredStudent2019 =>
  ({
    id,
    studentId: `S-${id}`,
    fullName: `Student ${id}`,
    gender: 'M',
    targetGrade: 9,
    academicYear: '2019 E.C.',
    previousSchool: 'X',
    previousGrade: 8,
    previousAverageScore: 80,
    guardianName: 'G',
    guardianPhone: '1',
    conduct: 'A',
    registrationDate: '2026-01-01',
    avatar: '',
    ...extra
  }) as RegisteredStudent2019;

const sec = (code: string, total: number, male: number, female: number, extra: Partial<GradeSection> = {}): GradeSection =>
  ({ id: `id-${code}`, section: code, grade: 9, sectionLetter: code.slice(-1), totalStudents: total, maleStudents: male, femaleStudents: female, ...extra }) as GradeSection;

test('a student deleted in the database is removed, not re-uploaded', () => {
  const local = [reg('a', { allocatedSection: '9A' }), reg('b')];
  const cloud = [reg('b')];
  const r = reconcileRegistrations(local, cloud, new Set());
  assert.deepEqual(r.merged.map((x) => x.id), ['b']);
  assert.deepEqual(r.removed.map((x) => x.id), ['a']);
  assert.equal(r.toUpload.length, 0);
});

test('a student whose save is still pending is kept and sent up', () => {
  const r = reconcileRegistrations([reg('a'), reg('b')], [reg('b')], new Set(['a']));
  assert.deepEqual(r.merged.map((x) => x.id).sort(), ['a', 'b']);
  assert.deepEqual(r.toUpload.map((x) => x.id), ['a']);
  assert.equal(r.removed.length, 0);
});

test('an empty database removes everything that is not pending', () => {
  const r = reconcileRegistrations([reg('a'), reg('b')], [], new Set(['b']));
  assert.deepEqual(r.merged.map((x) => x.id), ['b']);
  assert.deepEqual(r.removed.map((x) => x.id), ['a']);
});

test('students added on another device appear', () => {
  const r = reconcileRegistrations([reg('a')], [reg('a'), reg('c')], new Set());
  assert.deepEqual(r.merged.map((x) => x.id).sort(), ['a', 'c']);
});

test('a class cleared in the database is cleared here', () => {
  const r = reconcileRegistrations([reg('a', { allocatedSection: '9A' })], [reg('a', { allocatedSection: undefined })], new Set());
  assert.equal(r.merged[0].allocatedSection, undefined);
});

test('a pending local edit is not overwritten by the older database row', () => {
  const r = reconcileRegistrations([reg('a', { allocatedSection: '9A' })], [reg('a')], new Set(['a']));
  assert.equal(r.merged[0].allocatedSection, '9A');
  assert.equal(r.toUpload.length, 1);
});

test('fields the database cannot supply keep the local value', () => {
  const r = reconcileRegistrations([reg('a', { cteSpecialization: 'Web' })], [reg('a', { cteSpecialization: undefined })], new Set());
  assert.equal(r.merged[0].cteSpecialization, 'Web');
});

test('removed students give their seats back to their class', () => {
  const sections = [sec('9A', 10, 6, 4), sec('9B', 5, 3, 2)];
  const removed = [reg('a', { allocatedSection: '9A', gender: 'F' }), reg('b', { allocatedSection: '9a', gender: 'M' })];
  const out = releaseSeatsOfRemoved(sections, removed);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].totalStudents, out[0].maleStudents, out[0].femaleStudents], [8, 5, 3]);
});

test('counts never go below zero, and the CTE group gives up its seat too', () => {
  const sections = [sec('9A', 1, 0, 0), sec('11-CTE-WD', 3, 2, 1, { isCteSection: true })];
  const removed = [reg('a', { allocatedSection: '9A', cteSection: '11-CTE-WD', gender: 'M' }), reg('b', { allocatedSection: '9A', gender: 'M' })];
  const out = releaseSeatsOfRemoved(sections, removed);
  const a = out.find((x) => x.section === '9A')!;
  const cte = out.find((x) => x.section === '11-CTE-WD')!;
  assert.deepEqual([a.totalStudents, a.maleStudents], [0, 0]);
  assert.deepEqual([cte.totalStudents, cte.maleStudents, cte.femaleStudents], [2, 1, 1]);
});

test('sections with no removed students are untouched', () => {
  assert.deepEqual(releaseSeatsOfRemoved([sec('9A', 5, 3, 2)], [reg('a')]), []);
});
