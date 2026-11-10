import test from 'node:test';
import assert from 'node:assert/strict';
import { GradeSection, Student } from '../data/schoolData';
import { getSectionsAssignedToTeacher, findSectionsWithStaleCounts, getSectionHeadcount, getStudentCteTrack, getStudentsForSection } from './sectionUtils';

const cteSection = {
  id: 'c1', section: '12-CTE-WD', grade: 12, sectionLetter: 'WD', isCteSection: true,
  cteSpecialization: 'Web Design and Development', totalStudents: 1, maleStudents: 1, femaleStudents: 0
} as unknown as GradeSection;

// What the app holds after a cloud refresh: the cteSpecialization field is gone, only the saved CTE subject remains
const refreshed = {
  id: 's1', studentId: 'HMM-1', fullName: 'Student One', gender: 'M', grade: 12, section: 'A',
  semesters: [{ semester: 1, subjects: [{ subjectId: 'cte', subjectName: 'Career & Technical: Web Design and Development', subjectAmharic: '', teacherName: '', continuousAssessment: 0, midExam: 0, finalExam: 0 }] }]
} as unknown as Student;

test('CTE track is recovered from the saved CTE subject', () => {
  assert.equal(getStudentCteTrack(refreshed), 'Web Design and Development');
  assert.equal(getStudentCteTrack({ ...refreshed, cteSpecialization: 'Accounting' } as Student), 'Accounting');
});

test('a placeholder "Elective" label is not treated as a track', () => {
  const s = { ...refreshed, semesters: [{ semester: 1, subjects: [{ subjectId: 'cte', subjectName: 'Career & Technical: Elective' }] }] } as unknown as Student;
  assert.equal(getStudentCteTrack(s), '');
});

test('the CTE roster finds the student even after the field was lost (the 0 vs 1 bug)', () => {
  assert.equal(getStudentsForSection('12-CTE-WD', [cteSection], [refreshed]).length, 1);
});

test('students of another grade or track are not pulled into the CTE section', () => {
  const g11 = { ...refreshed, id: 's2', grade: 11 } as Student;
  const acc = { ...refreshed, id: 's3', semesters: [{ semester: 1, subjects: [{ subjectId: 'cte', subjectName: 'Career & Technical: Accounting' }] }] } as unknown as Student;
  assert.deepEqual(getStudentsForSection('12-CTE-WD', [cteSection], [refreshed, g11, acc]).map((s) => s.id), ['s1']);
});

test('headcount is counted from the students that really exist, so deleted students stop counting', () => {
  // The section still says 45 students / 20 boys / 25 girls, but only one student is left in the database.
  const stale = { ...cteSection, totalStudents: 45, maleStudents: 20, femaleStudents: 25 };
  assert.deepEqual(getSectionHeadcount(stale, [stale], [refreshed]), { total: 1, male: 1, female: 0 });
  // Every student deleted: the count goes to zero instead of keeping the old number.
  assert.deepEqual(getSectionHeadcount(stale, [stale], []), { total: 0, male: 0, female: 0 });
});

test('stale saved counts are found and corrected; correct ones are left alone', () => {
  const stale = { ...cteSection, totalStudents: 45, maleStudents: 20, femaleStudents: 25 };
  const fixed = findSectionsWithStaleCounts([stale], [refreshed]);
  assert.equal(fixed.length, 1);
  assert.deepEqual([fixed[0].totalStudents, fixed[0].maleStudents, fixed[0].femaleStudents], [1, 1, 0]);
  assert.equal(findSectionsWithStaleCounts(fixed, [refreshed]).length, 0);
});

test('a teacher with no assignments gets no sections (no school-wide access)', () => {
  const t = { id: 't9', name: 'Unassigned Teacher', sectionsTeaching: ['Not assigned yet'] } as any;
  const secs = [{ section: '9A', homeroomTeacher: { id: 't1', name: 'Other' }, subjectAssignments: [] }] as unknown as GradeSection[];
  assert.deepEqual(getSectionsAssignedToTeacher(t, secs), []);
});

test('teacher subjects follow the department, and CTE lists the four tracks', async () => {
  const { getSubjectsForDepartment } = await import('../data/schoolData');
  assert.ok(getSubjectsForDepartment('Natural Sciences').some((s) => s.value === 'Physics'));
  assert.ok(!getSubjectsForDepartment('Natural Sciences').some((s) => s.value === 'History'));
  assert.deepEqual(getSubjectsForDepartment('Languages').map((s) => s.value), ['English Language', 'Amharic']);
  assert.equal(getSubjectsForDepartment('CTE').length, 4);
});
