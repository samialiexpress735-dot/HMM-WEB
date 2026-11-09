import test from 'node:test';
import assert from 'node:assert/strict';
import { GradeSection, Student } from '../data/schoolData';
import { getSectionHeadcount, getStudentCteTrack, getStudentsForSection } from './sectionUtils';

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

test('headcount never drops below the students actually found, and keeps the registry number when higher', () => {
  const found = getSectionHeadcount({ ...cteSection, totalStudents: 0, maleStudents: 0, femaleStudents: 0 }, [cteSection], [refreshed]);
  assert.deepEqual(found, { total: 1, male: 1, female: 0 });
  const registryHigher = getSectionHeadcount({ ...cteSection, totalStudents: 45, maleStudents: 20, femaleStudents: 25 }, [cteSection], [refreshed]);
  assert.deepEqual(registryHigher, { total: 45, male: 20, female: 25 });
});
