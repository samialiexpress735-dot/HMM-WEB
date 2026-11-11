import test from 'node:test';
import assert from 'node:assert/strict';
import { Student } from '../data/schoolData';
import { mergeCloudStudents, RECENT_EDIT_MS } from './marksMerge';

const mk = (over: Partial<Student['semesters'][0]['subjects'][0]> = {}): Student =>
  ({
    id: 's1', studentId: 'HMM-1', fullName: 'A B',
    semesters: [{ semester: 1, subjects: [{ subjectId: 'math', subjectName: 'Math', subjectAmharic: '', teacherName: '', continuousAssessment: 24, midExam: 15, finalExam: 40, ...over }] }]
  } as unknown as Student);
const custom = { quiz1: 2, assignment: 16, mid: 15, final: 40 };

test('cloud copy without per-column marks keeps the ones typed on this device', () => {
  const local = [mk({ customAssessments: custom, continuousAssessment: 5, midExam: 6, finalExam: 7 })];
  const cloud = [mk()]; // older database: only the three totals
  const out = mergeCloudStudents(local, cloud, new Map());
  const sub = out[0].semesters[0].subjects[0];
  assert.deepEqual(sub.customAssessments, custom);
  assert.equal(sub.continuousAssessment, 5); // totals travel with their columns
});

test('cloud copy WITH per-column marks wins (another device changed them)', () => {
  const local = [mk({ customAssessments: custom })];
  const theirs = { ...custom, quiz1: 9 };
  const out = mergeCloudStudents(local, [mk({ customAssessments: theirs })], new Map());
  assert.equal(out[0].semesters[0].subjects[0].customAssessments?.quiz1, 9);
});

test('a student edited seconds ago is not overwritten by a stale refresh', () => {
  const local = [mk({ customAssessments: custom })];
  const out = mergeCloudStudents(local, [mk()], new Map([['s1', 1000]]), 1000 + RECENT_EDIT_MS - 1);
  assert.equal(out[0], local[0]);
  const later = mergeCloudStudents(local, [mk()], new Map([['s1', 1000]]), 1000 + RECENT_EDIT_MS + 1);
  assert.notEqual(later[0], local[0]);
});

test('students that only exist in the cloud are added; local-only ones are dropped (cloud is the truth)', () => {
  const cloud = [{ ...mk(), id: 's2' } as Student];
  const out = mergeCloudStudents([mk()], cloud, new Map());
  assert.deepEqual(out.map((s) => s.id), ['s2']);
});

test('the teacher column definitions travel with the per-column marks when the cloud copy has neither', () => {
  const cols = [{ id: 'quiz1', name: 'Quiz', maxScore: 10 }];
  const local = [mk({ customAssessments: { quiz1: 8 }, assessmentColumns: cols })];
  const out = mergeCloudStudents(local, [mk()], new Map());
  assert.deepEqual(out[0].semesters[0].subjects[0].assessmentColumns, cols);
});
