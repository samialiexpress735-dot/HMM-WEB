import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toEthiopian,
  ethiopianToIso,
  addDaysISO,
  toLocalISO,
  currentEcYear,
  currentAcademicYear,
  academicYearFor,
  academicYearLabel,
  academicYearShort,
  formatEthiopian,
  formatGregorian,
  formatDualDate,
  formatDualDateLong,
  daysInEthiopianMonth,
  isEthiopianLeapYear,
  dualDateParts
} from './ethiopianCalendar';

test('known anchors: Ethiopian New Year (Enkutatash)', () => {
  // Sept 12 in the Gregorian year before a Gregorian leap year, otherwise Sept 11.
  assert.deepEqual(toEthiopian('2023-09-12'), { year: 2016, month: 1, day: 1 });
  assert.deepEqual(toEthiopian('2023-09-11'), { year: 2015, month: 13, day: 6 }); // leap Pagume
  assert.deepEqual(toEthiopian('2024-09-11'), { year: 2017, month: 1, day: 1 });
  assert.deepEqual(toEthiopian('2025-09-11'), { year: 2018, month: 1, day: 1 });
  assert.deepEqual(toEthiopian('2026-09-11'), { year: 2019, month: 1, day: 1 });
  assert.deepEqual(toEthiopian('2027-09-12'), { year: 2020, month: 1, day: 1 });
});

test('known anchors: Gregorian New Year, Christmas (Genna) and Adwa', () => {
  assert.deepEqual(toEthiopian('2025-01-01'), { year: 2017, month: 4, day: 23 });
  assert.deepEqual(toEthiopian('2025-01-07'), { year: 2017, month: 4, day: 29 }); // Genna
  assert.deepEqual(toEthiopian('2025-03-02'), { year: 2017, month: 6, day: 23 }); // Adwa victory day
});

test("today in the repo's era: 2026-11-09 is Tikimt 30, 2019 E.C.", () => {
  assert.deepEqual(toEthiopian('2026-11-09'), { year: 2019, month: 2, day: 30 });
  assert.deepEqual(toEthiopian('2026-11-10'), { year: 2019, month: 3, day: 1 });
});

test('matches the engine built-in ethiopic calendar for every day 1990-2080', () => {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-ethiopic', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
  });
  let checked = 0;
  for (let t = Date.UTC(1990, 0, 1); t <= Date.UTC(2080, 11, 31); t += 86400000) {
    const d = new Date(t);
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    // Intl reports era year (ERA1 = Amete Mihret) in `year`; relatedYear is not present for ethiopic.
    const expected = { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
    const iso = d.toISOString().slice(0, 10);
    assert.deepEqual(toEthiopian(iso), expected, `mismatch on ${iso}`);
    checked++;
  }
  assert.ok(checked > 32000);
});

test('round trip: Ethiopian -> Gregorian -> Ethiopian for every day in 2010-2030 E.C.', () => {
  for (let y = 2010; y <= 2030; y++) {
    for (let m = 1; m <= 13; m++) {
      for (let d = 1; d <= daysInEthiopianMonth(y, m); d++) {
        const iso = ethiopianToIso(y, m, d);
        assert.deepEqual(toEthiopian(iso), { year: y, month: m, day: d }, `${y}-${m}-${d} via ${iso}`);
      }
    }
  }
});

test('Pagume has 6 days in leap years (E.C. year % 4 == 3) and 5 otherwise', () => {
  assert.equal(isEthiopianLeapYear(2015), true);
  assert.equal(isEthiopianLeapYear(2019), true);
  assert.equal(isEthiopianLeapYear(2018), false);
  assert.equal(daysInEthiopianMonth(2019, 13), 6);
  assert.equal(daysInEthiopianMonth(2018, 13), 5);
  assert.equal(daysInEthiopianMonth(2018, 5), 30);
});

test('Date and ISO inputs agree, and invalid input is handled', () => {
  assert.deepEqual(toEthiopian(new Date(2026, 10, 9)), toEthiopian('2026-11-09'));
  assert.equal(toEthiopian('not a date'), null);
  assert.equal(toEthiopian(new Date('nope')), null);
  assert.equal(formatEthiopian('garbage'), '');
  assert.equal(formatDualDate('garbage'), '');
});

test('currentEcYear flips on the Ethiopian new year, not on 1 January', () => {
  assert.equal(currentEcYear(new Date(2026, 8, 10)), 2018); // Sept 10 2026
  assert.equal(currentEcYear(new Date(2026, 8, 11)), 2019); // Sept 11 2026
  assert.equal(currentEcYear(new Date(2026, 0, 1)), 2018);
  assert.equal(currentEcYear(new Date(2026, 11, 31)), 2019);
  assert.equal(currentEcYear(new Date(2027, 0, 1)), 2019);
  assert.equal(currentEcYear(new Date(2027, 8, 11)), 2019); // 2027 new year is Sept 12
  assert.equal(currentEcYear(new Date(2027, 8, 12)), 2020);
});

test('academic year: E.C. N is the (N+7)/(N+8) G.C. school year', () => {
  assert.deepEqual(academicYearFor(2017), { ec: 2017, gcStart: 2024, gcEnd: 2025 }); // matches old hardcoded text
  assert.deepEqual(currentAcademicYear(new Date(2026, 10, 9)), { ec: 2019, gcStart: 2026, gcEnd: 2027 });
  assert.equal(academicYearLabel('en', 2017), '2017 E.C. (2024/2025 G.C.)');
  assert.equal(academicYearLabel('en', undefined, new Date(2026, 10, 9)), '2019 E.C. (2026/2027 G.C.)');
  assert.equal(academicYearLabel('am', 2019), '2019 ዓ.ም. (2026/2027 እ.ኤ.አ.)');
  assert.equal(academicYearShort(2017), '2024/2025 (2017 E.C.)');
});

test('formatting', () => {
  assert.equal(formatEthiopian('2026-11-09'), 'Tikimt 30, 2019 E.C.');
  assert.equal(formatEthiopian('2026-11-09', 'en', { era: false }), 'Tikimt 30, 2019');
  assert.equal(formatEthiopian('2026-11-10', 'am'), 'ኅዳር 1 ቀን 2019 ዓ.ም.');
  assert.equal(formatGregorian('2026-11-09'), '9 Nov 2026 G.C.');
  assert.equal(formatDualDate('2026-11-09'), 'Tikimt 30, 2019 E.C. · 9 Nov 2026 G.C.');
  assert.equal(formatDualDateLong('2026-11-09'), 'Monday · Tikimt 30, 2019 E.C. · 9 Nov 2026 G.C.');
  assert.equal(formatDualDateLong('2026-11-09', 'am').startsWith('ሰኞ ·'), true);
  const parts = dualDateParts('2026-11-09', 'en')!;
  assert.deepEqual(parts.ec, { month: 'Tikimt', day: 30, year: 2019 });
  assert.deepEqual(parts.gc, { month: 'Nov', day: 9, year: 2026 });
});

test('toLocalISO uses local calendar day (not UTC) and addDaysISO is calendar-safe', () => {
  assert.equal(toLocalISO(new Date(2026, 10, 9, 0, 30)), '2026-11-09'); // 00:30 local stays on the 9th
  assert.equal(toLocalISO(new Date(2026, 10, 9, 23, 59)), '2026-11-09');
  assert.equal(addDaysISO('2026-11-09', 1), '2026-11-10');
  assert.equal(addDaysISO('2026-11-09', -9), '2026-10-31');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysISO('2028-02-28', 1), '2028-02-29');
});
