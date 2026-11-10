import test from 'node:test';
import assert from 'node:assert/strict';
import { meskerem1, yearDigits, formatYear, suggestRollover, nextYear, previousYear } from './academicYear';

const iso = (d: Date) => d.toISOString().slice(0, 10);

test('Meskerem 1 is September 11, or 12 right after an Ethiopian leap year', () => {
  assert.equal(iso(meskerem1(2015)), '2022-09-11');
  assert.equal(iso(meskerem1(2016)), '2023-09-12');
  assert.equal(iso(meskerem1(2018)), '2025-09-11');
  assert.equal(iso(meskerem1(2019)), '2026-09-11');
  assert.equal(iso(meskerem1(2020)), '2027-09-12');
  assert.equal(iso(meskerem1(2024)), '2031-09-12');
});

test('the calendar code agrees with the simple Meskerem 1 rule up to E.C. 2092', () => {
  for (let ec = 2000; ec <= 2092; ec++) {
    const day = (ec - 1) % 4 === 3 ? 12 : 11;
    assert.equal(iso(meskerem1(ec)), `${ec + 7}-09-${day}`, `E.C. ${ec}`);
  }
});

test('from September 2100 the new year moves one day later (2100 is not a Gregorian leap year)', () => {
  assert.equal(iso(meskerem1(2093)), '2100-09-12');
  assert.equal(iso(meskerem1(2096)), '2103-09-13');
});

test('years stored in older shapes are read as E.C. digits', () => {
  assert.equal(yearDigits('2019'), '2019');
  assert.equal(yearDigits('2019 E.C.'), '2019');
  assert.equal(yearDigits('2024/2025 (2017 ዓ.ም.)'), '2017');
  assert.equal(yearDigits('2024/2025'), '');
  assert.equal(yearDigits(undefined, '2019'), '2019');
});

test('years are shown with E.C. or ዓ.ም.', () => {
  assert.equal(formatYear('2020'), '2020 E.C.');
  assert.equal(formatYear('2020', 'am'), '2020 ዓ.ም.');
  assert.equal(nextYear('2019'), '2020');
  assert.equal(previousYear('2019'), '2018');
});

test('the rollover is only suggested once the next Meskerem 1 has arrived', () => {
  const before = suggestRollover('2019', new Date(Date.UTC(2027, 8, 11)));
  assert.equal(before.due, false);
  assert.equal(before.nextYear, '2020');
  const on = suggestRollover('2019', new Date(Date.UTC(2027, 8, 12)));
  assert.equal(on.due, true);
  assert.equal(iso(on.startsOn), '2027-09-12');
});
