import test from 'node:test';
import assert from 'node:assert/strict';
import { packCustomAssessments, unpackCustomAssessments, getSubjectBreakdown, COLUMNS_KEY } from './assessmentColumns';

const base = { continuousAssessment: 24, midExam: 16, finalExam: 40 }; // what 8 / 10 is rescaled to (80%)

test('ONE column out of 10 shows 8 / 10, not the rescaled 24 / 16 / 40', () => {
  const b = getSubjectBreakdown({ ...base, customAssessments: { quiz: 8 }, assessmentColumns: [{ id: 'quiz', name: 'Quiz', maxScore: 10 }] });
  assert.equal(b.custom, true);
  assert.deepEqual(b.columns, [{ id: 'quiz', name: 'Quiz', score: 8, max: 10, isBonus: false }]);
  assert.equal(b.earned, 8);
  assert.equal(b.max, 10);
  assert.equal(b.percentage, 80);
});

test('bonus columns add to the score but not to what it is out of', () => {
  const b = getSubjectBreakdown({
    ...base,
    customAssessments: { a: 9, b: 18, bonus: 2 },
    assessmentColumns: [
      { id: 'a', name: 'A', maxScore: 10 },
      { id: 'b', name: 'B', maxScore: 20 },
      { id: 'bonus', name: 'Extra', maxScore: 5, isBonus: true }
    ]
  });
  assert.equal(b.max, 30);
  assert.equal(b.earned, 29);
  assert.equal(b.percentage, 96.7);
});

test('a column removed by the teacher no longer counts, even if its old mark is still stored', () => {
  const b = getSubjectBreakdown({ ...base, customAssessments: { quiz: 8, old: 40 }, assessmentColumns: [{ id: 'quiz', name: 'Quiz', maxScore: 10 }] });
  assert.equal(b.earned, 8);
  assert.equal(b.columns.length, 1);
});

test('older records without column definitions keep the school 30 / 20 / 50 view', () => {
  const b = getSubjectBreakdown({ ...base });
  assert.equal(b.custom, false);
  assert.deepEqual(b.columns.map((c) => [c.name, c.score, c.max]), [['Assessment', 24, 30], ['Mid', 16, 20], ['Final', 40, 50]]);
  assert.equal(b.earned, 80);
  assert.equal(b.max, 100);
  assert.equal(b.percentage, 80);
});

test('marks without definitions (older database) also fall back to the school view', () => {
  assert.equal(getSubjectBreakdown({ ...base, customAssessments: { quiz: 8 } }).custom, false);
});

test('pack and unpack round-trip the marks and the column definitions', () => {
  const cols = [{ id: 'quiz', name: 'Quiz', maxScore: 10 }, { id: 'x', name: 'Extra', maxScore: 5, isBonus: true }];
  const packed = packCustomAssessments({ customAssessments: { quiz: 8, x: 1 }, assessmentColumns: cols })!;
  assert.deepEqual(packed[COLUMNS_KEY], cols);
  const back = unpackCustomAssessments(JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(back.customAssessments, { quiz: 8, x: 1 });
  assert.deepEqual(back.assessmentColumns, cols);
});

test('older database rows (numbers only) unpack with no definitions; nothing to save packs to null', () => {
  assert.deepEqual(unpackCustomAssessments({ quiz1: 2, mid: 15 }), { customAssessments: { quiz1: 2, mid: 15 }, assessmentColumns: undefined });
  assert.equal(packCustomAssessments({}), null);
  assert.deepEqual(unpackCustomAssessments(null), {});
  assert.deepEqual(unpackCustomAssessments({ [COLUMNS_KEY]: [{ id: 1 }] }), { customAssessments: undefined, assessmentColumns: undefined });
});
