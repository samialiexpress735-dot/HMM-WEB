import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArchiveStudent } from './registrationAndTimetable';
import type { Student } from '../data/schoolData';
import {
  buildStudentMatchIndex,
  findPreviousYearMatches,
  hasEnoughToMatch,
  searchPreviousYearStudents,
  splitFullName,
  composeFullName,
  scoreDateOfBirth,
  studentToPreviousRecord,
  mergePreviousRecords,
  StudentMatchQuery
} from './studentMatching';

function record(overrides: Partial<ArchiveStudent> & Pick<ArchiveStudent, 'id' | 'studentId' | 'fullName'>): ArchiveStudent {
  return {
    fullNameAmharic: '',
    gender: 'M',
    previousGrade: 8,
    previousSection: '8A',
    previousSchool: 'Debre Berhan Primary School',
    previousAverageScore: 85,
    eligibleForGrade: 9,
    guardianName: 'Parent / Guardian',
    guardianPhone: '',
    conduct: 'A',
    ...overrides
  };
}

const yared = record({
  id: 'a1',
  studentId: 'DB-2018-081',
  fullName: 'Yared Getachew Tadesse',
  fullNameAmharic: 'ያሬድ ጌታቸው ታደሰ',
  dateOfBirth: '2010-03-14',
  guardianName: 'Ato Getachew Tadesse',
  guardianPhone: '+251 91 100 2233'
});
const bethlehem = record({
  id: 'a2',
  studentId: 'DB-2018-082',
  fullName: 'Bethlehem Alemu Worku',
  gender: 'F',
  dateOfBirth: '2010-11-02'
});
const dawit = record({
  id: 'a3',
  studentId: 'HMM-2018-091',
  fullName: 'Dawit Solomon Haile',
  previousGrade: 9,
  eligibleForGrade: 10,
  dateOfBirth: '2009-01-20'
});

const index = buildStudentMatchIndex([yared, bethlehem, dawit]);

function query(overrides: Partial<StudentMatchQuery>): StudentMatchQuery {
  return { firstName: '', fatherName: '', grandfatherName: '', targetGrade: 9, ...overrides };
}

test('exact name and date of birth is a very likely match', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({ firstName: 'Yared', fatherName: 'Getachew', grandfatherName: 'Tadesse', dateOfBirth: '2010-03-14', gender: 'M' })
  );
  assert.equal(top.record.studentId, 'DB-2018-081');
  assert.equal(top.level, 'very-likely');
  assert.equal(top.fields.dateOfBirth, 'match');
  assert.equal(top.fields.name, 'match');
});

test('capitalisation, extra spaces and small misspellings still match', () => {
  const matches = findPreviousYearMatches(
    index,
    query({ firstName: '  YAERED ', fatherName: 'getachw', grandfatherName: 'Tadese', gender: 'M' })
  );
  assert.equal(matches[0]?.record.studentId, 'DB-2018-081');
});

test('transliteration variants fold together', () => {
  const idx = buildStudentMatchIndex([record({ id: 'x', studentId: 'X-1', fullName: 'Yoseph Mulugeta Tsegaye' })]);
  const matches = findPreviousYearMatches(
    idx,
    query({ firstName: 'Yosef', fatherName: 'Mulugetta', grandfatherName: 'Segaye', gender: 'M' })
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].fields.name, 'match');
});

test('a different student with a different first name is not suggested', () => {
  const matches = findPreviousYearMatches(
    index,
    query({ firstName: 'Samuel', fatherName: 'Getachew', grandfatherName: 'Tadesse', gender: 'M' })
  );
  assert.deepEqual(matches, []);
});

test('a name match without any other identifier is never "very likely"', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({ firstName: 'Yared', fatherName: 'Getachew', grandfatherName: 'Tadesse', gender: 'M' })
  );
  assert.ok(top);
  assert.notEqual(top.level, 'very-likely');
});

test('a clearly different date of birth downgrades the match', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({ firstName: 'Yared', fatherName: 'Getachew', grandfatherName: 'Tadesse', dateOfBirth: '2006-07-01', gender: 'M' })
  );
  assert.equal(top?.level, 'possible');
  assert.equal(top?.fields.dateOfBirth, 'differs');
});

test('day and month typed the wrong way round is treated as similar', () => {
  assert.equal(scoreDateOfBirth('2010-03-14', '2010-03-14'), 1);
  assert.equal(scoreDateOfBirth('2010-03-08', '2010-08-03'), 0.8);
  assert.equal(scoreDateOfBirth('2010-03-08', ''), null);
});

test('guardian name or phone corroborates the match', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({
      firstName: 'Yared',
      fatherName: 'Getachew',
      grandfatherName: 'Tadesse',
      gender: 'M',
      guardianPhone: '0911002233'
    })
  );
  assert.equal(top?.level, 'very-likely');
  assert.equal(top?.fields.guardian, 'match');
});

test('placeholder guardian details are ignored', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({
      firstName: 'Yared',
      fatherName: 'Getachew',
      grandfatherName: 'Tadesse',
      gender: 'M',
      guardianName: 'Parent/Guardian',
      guardianPhone: '+251 91 '
    })
  );
  assert.equal(top?.fields.guardian, 'unknown');
});

test('does not run until first and father names have been entered', () => {
  assert.equal(hasEnoughToMatch(query({ firstName: 'Yared' })), false);
  assert.deepEqual(findPreviousYearMatches(index, query({ firstName: 'Yared' })), []);
  assert.equal(hasEnoughToMatch(query({ firstName: 'Ya', fatherName: 'Ge' })), true);
});

test('partially entered names still suggest the likely student', () => {
  const matches = findPreviousYearMatches(index, query({ firstName: 'Bethlehem', fatherName: 'Alemu', gender: 'F' }));
  assert.equal(matches[0]?.record.studentId, 'DB-2018-082');
});

test('first and father names swapped are still found', () => {
  const matches = findPreviousYearMatches(
    index,
    query({ firstName: 'Getachew', fatherName: 'Yared', grandfatherName: 'Tadesse', gender: 'M' })
  );
  assert.equal(matches[0]?.record.studentId, 'DB-2018-081');
});

test('matches the Amharic name when the English spelling differs a lot', () => {
  const matches = findPreviousYearMatches(
    index,
    query({ firstName: 'Jared', fatherName: 'Getachow', fullNameAmharic: 'ያሬድ ጌታቸው ታደሰ', gender: 'M' })
  );
  assert.equal(matches[0]?.record.studentId, 'DB-2018-081');
});

test('gender mismatch lowers the score', () => {
  const base = { firstName: 'Yared', fatherName: 'Getachew', grandfatherName: 'Tadesse', dateOfBirth: '2010-03-14' };
  const same = findPreviousYearMatches(index, query({ ...base, gender: 'M' }));
  const other = findPreviousYearMatches(index, query({ ...base, gender: 'F' }));
  assert.ok(other[0].score < same[0].score);
  assert.equal(other[0].fields.gender, 'differs');
});

test('an exact previous Student ID is returned first', () => {
  const matches = findPreviousYearMatches(
    index,
    query({ firstName: 'Zed', fatherName: 'Zed', previousStudentId: 'hmm-2018-091' })
  );
  assert.equal(matches[0].record.studentId, 'HMM-2018-091');
  assert.equal(matches[0].byStudentId, true);
});

test('result list is limited and sorted by score', () => {
  const siblings = ['Dawit', 'Dawid', 'Dawite', 'Dawiit', 'Dawt'].map((first, i) =>
    record({ id: `s${i}`, studentId: `S-${i}`, fullName: `${first} Solomon Haile` })
  );
  const idx = buildStudentMatchIndex(siblings);
  const matches = findPreviousYearMatches(idx, query({ firstName: 'Dawit', fatherName: 'Solomon', grandfatherName: 'Haile', gender: 'M' }));
  assert.ok(matches.length <= 3);
  for (let i = 1; i < matches.length; i++) assert.ok(matches[i - 1].score >= matches[i].score);
  assert.equal(matches[0].record.studentId, 'S-0');
});

test('stays fast and precise with 20,000 previous-year students', () => {
  const firsts = ['Abel', 'Samuel', 'Hana', 'Meron', 'Kidus', 'Selam', 'Natnael', 'Eden', 'Biruk', 'Tsion', 'Henok', 'Ruth', 'Fikir', 'Liya', 'Nahom', 'Rediet', 'Tigist', 'Amanuel', 'Mikias', 'Saron'];
  const mids = ['Kebede', 'Tesfaye', 'Girma', 'Desta', 'Bekele', 'Assefa', 'Mekonnen', 'Lemma', 'Tilahun', 'Wolde', 'Haile', 'Negash', 'Abate', 'Demeke', 'Shiferaw', 'Zewdu', 'Fikadu', 'Ayele', 'Worku', 'Mulatu'];
  const lasts = ['Alemu', 'Berhanu', 'Chala', 'Degefu', 'Eshetu', 'Fantu', 'Gebre', 'Hailu', 'Ingida', 'Jemal', 'Kassa', 'Legesse', 'Mamo', 'Nega', 'Olana', 'Petros', 'Retta', 'Sisay', 'Taye', 'Urgessa', 'Woldu', 'Yimer', 'Zeleke', 'Assegid', 'Belay'];
  const big: ArchiveStudent[] = [];
  let n = 0;
  for (const f of firsts) for (const m of mids) for (const l of lasts) {
    if (big.length >= 20000) break;
    big.push(record({ id: `b${n}`, studentId: `B-${n++}`, fullName: `${f} ${m} ${l}` }));
  }
  big.push(yared);
  assert.ok(big.length >= 10000);

  const t0 = performance.now();
  const bigIndex = buildStudentMatchIndex(big);
  const buildMs = performance.now() - t0;

  const t1 = performance.now();
  const matches = findPreviousYearMatches(bigIndex, query({ firstName: 'Yaered', fatherName: 'Getachew', grandfatherName: 'Tadesse', gender: 'M' }));
  const queryMs = performance.now() - t1;

  assert.equal(matches[0]?.record.studentId, 'DB-2018-081');
  assert.ok(matches.length <= 3);
  assert.ok(queryMs < 150, `query took ${queryMs.toFixed(1)}ms`);
  assert.ok(buildMs < 3000, `index build took ${buildMs.toFixed(0)}ms`);
});

test('name helpers split and compose three-part names', () => {
  assert.deepEqual(splitFullName('Yared Getachew Tadesse Bekele'), {
    firstName: 'Yared',
    fatherName: 'Getachew',
    grandfatherName: 'Tadesse Bekele'
  });
  assert.equal(composeFullName(' Yared ', 'Getachew', ''), 'Yared Getachew');
});

test('active students become matchable records for next year', () => {
  const active = {
    id: 's1',
    studentId: 'HMM-2017-0901',
    fullName: 'Hana Tesfaye Girma',
    fullNameAmharic: 'ሃና ተስፋዬ ግርማ',
    gender: 'F',
    dateOfBirth: '2010-05-05',
    grade: 9,
    section: 'B',
    stream: undefined,
    academicYear: '2017 E.C.',
    rank: 1,
    totalStudentsInSection: 40,
    attendanceRate: 98,
    conduct: 'A',
    homeroomTeacher: 'x',
    guardianName: 'Ato Tesfaye',
    guardianPhone: '+251 91 555 1234',
    semesters: [
      { semester: 1, subjects: [{ subjectId: 'm', subjectName: 'Math', subjectAmharic: '', teacherName: '', continuousAssessment: 25, midExam: 15, finalExam: 40 }] },
      { semester: 2, subjects: [] }
    ]
  } as Student;

  const rec = studentToPreviousRecord(active);
  assert.equal(rec.previousSection, '9B');
  assert.equal(rec.eligibleForGrade, 10);
  assert.equal(rec.previousAverageScore, 80);

  const matches = findPreviousYearMatches(
    buildStudentMatchIndex([rec]),
    query({ firstName: 'Hana', fatherName: 'Tesfaye', grandfatherName: 'Girma', dateOfBirth: '2010-05-05', gender: 'F', targetGrade: 10 })
  );
  assert.equal(matches[0].level, 'very-likely');
});

test('merging record lists keeps one record per student ID', () => {
  const merged = mergePreviousRecords([yared, bethlehem], [{ ...yared, id: 'dup' }, dawit]);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'a1');
});

test('a clearly different grandfather name hides the match unless the birth date vouches for it', () => {
  const wrongGrandfather = query({ firstName: 'Yared', fatherName: 'Getachew', grandfatherName: 'Worku', gender: 'M' });
  assert.deepEqual(findPreviousYearMatches(index, wrongGrandfather), []);

  const withDob = findPreviousYearMatches(index, { ...wrongGrandfather, dateOfBirth: '2010-03-14' });
  assert.equal(withDob[0]?.record.studentId, 'DB-2018-081');
  assert.equal(withDob[0]?.level, 'possible');
});

test('reports how many matches were found beyond the display limit', () => {
  const many = ['Alemu', 'Berhanu', 'Chala', 'Degefu', 'Eshetu', 'Fantu'].map((last, i) =>
    record({ id: `m${i}`, studentId: `M-${i}`, fullName: `Samuel Tesfaye ${last}` })
  );
  const result = searchPreviousYearStudents(
    buildStudentMatchIndex(many),
    query({ firstName: 'Samuel', fatherName: 'Tesfaye', gender: 'M' })
  );
  assert.equal(result.matches.length, 3);
  assert.equal(result.totalFound, 6);
});

test('a different guardian phone is not held against the student', () => {
  const base = { firstName: 'Dawit', fatherName: 'Solomon', gender: 'M' as const, targetGrade: 10 };
  const without = findPreviousYearMatches(index, query(base));
  const withStalePhone = findPreviousYearMatches(index, query({ ...base, guardianPhone: '+251 91 100 2233' }));
  assert.equal(withStalePhone[0]?.record.studentId, 'HMM-2018-091');
  assert.equal(withStalePhone[0].score, without[0].score);
  assert.equal(withStalePhone[0].fields.guardian, 'unknown');
});

test('misspelled names with an exact birth date are still "very likely"', () => {
  const [top] = findPreviousYearMatches(
    index,
    query({ firstName: 'Yaered', fatherName: 'Getachw', grandfatherName: 'Tadese', dateOfBirth: '2010-03-14', gender: 'M' })
  );
  assert.equal(top.level, 'very-likely');
});
