/**
 * Ethiopian (E.C.) <-> Gregorian (G.C.) calendar helpers.
 *
 * This is the ONE place the app gets "what year is it?" from. Nothing else should hardcode
 * a year. Every E.C. date shown anywhere is computed from a real G.C. date here, so the two
 * calendars can never disagree.
 *
 * The Ethiopian calendar has 13 months: 12 of 30 days, plus Pagume (5 days, or 6 in a leap year).
 * Conversion goes through the Julian Day Number, so it is exact for every date (including the
 * Sept 11 / Sept 12 new-year shift around leap years).
 */

export type Lang = 'en' | 'am';

export interface EthiopianDate {
  year: number;
  /** 1 = Meskerem ... 12 = Nehase, 13 = Pagume */
  month: number;
  day: number;
}

// JDN of 1 Meskerem of Ethiopian year 0 (the algorithm below counts from there; year 1 starts 365 days later).
const ETHIOPIAN_EPOCH_JDN = 1723856;
const UNIX_EPOCH_JDN = 2440588; // 1970-01-01

export const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Genbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
] as const;

export const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'
] as const;

export const GREGORIAN_MONTHS_AM = [
  'ጃንዩወሪ', 'ፌብሩወሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
  'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'
] as const;

const GREGORIAN_MONTHS_EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'] as const;

/** Era suffixes. */
export const ERA = {
  en: { ec: 'E.C.', gc: 'G.C.' },
  am: { ec: 'ዓ.ም.', gc: 'እ.ኤ.አ.' }
} as const;

// ---------------------------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------------------------

/** Julian Day Number of a Gregorian calendar day (no time-of-day, no timezone). */
function gregorianToJdn(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000) + UNIX_EPOCH_JDN;
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const d = new Date((jdn - UNIX_EPOCH_JDN) * 86400000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function ethiopianToJdn(year: number, month: number, day: number): number {
  return ETHIOPIAN_EPOCH_JDN + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = (jdn - ETHIOPIAN_EPOCH_JDN) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - ETHIOPIAN_EPOCH_JDN) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

/** Parse 'YYYY-MM-DD' (optionally followed by a time) as a LOCAL calendar day. Returns null if invalid. */
function parseIsoDay(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Any of: a Date (read in LOCAL time), or an ISO 'YYYY-MM-DD' string. */
export type DateInput = Date | string;

function toGregorianParts(input: DateInput): { year: number; month: number; day: number } | null {
  if (typeof input === 'string') return parseIsoDay(input);
  if (Number.isNaN(input.getTime())) return null;
  return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
}

/** Gregorian -> Ethiopian. Returns null for an unparseable input. */
export function toEthiopian(input: DateInput = new Date()): EthiopianDate | null {
  const g = toGregorianParts(input);
  if (!g) return null;
  return jdnToEthiopian(gregorianToJdn(g.year, g.month, g.day));
}

/** Ethiopian -> Gregorian ISO string 'YYYY-MM-DD'. */
export function ethiopianToIso(year: number, month: number, day: number): string {
  const g = jdnToGregorian(ethiopianToJdn(year, month, day));
  return `${String(g.year).padStart(4, '0')}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
}

/** True for an Ethiopian leap year (Pagume has 6 days). */
export const isEthiopianLeapYear = (ecYear: number) => ecYear % 4 === 3;

export const daysInEthiopianMonth = (ecYear: number, month: number) =>
  month === 13 ? (isEthiopianLeapYear(ecYear) ? 6 : 5) : 30;

// ---------------------------------------------------------------------------------------------
// "Today"
// ---------------------------------------------------------------------------------------------

/** Today (or the given Date) as a LOCAL 'YYYY-MM-DD'. toISOString() is UTC and is a day behind in Ethiopia for 3h after midnight. */
export const toLocalISO = (d: Date = new Date()) =>
  `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => toLocalISO(new Date());

/** Add whole days to an ISO date, calendar-safe (no DST / timezone drift). */
export function addDaysISO(iso: string, days: number): string {
  const g = parseIsoDay(iso);
  if (!g) return iso;
  const out = jdnToGregorian(gregorianToJdn(g.year, g.month, g.day) + days);
  return `${String(out.year).padStart(4, '0')}-${String(out.month).padStart(2, '0')}-${String(out.day).padStart(2, '0')}`;
}

/** Current Ethiopian year, e.g. 2019. */
export function currentEcYear(now: Date = new Date()): number {
  return toEthiopian(now)!.year;
}

/** Current Gregorian year, e.g. 2026. */
export const currentGcYear = (now: Date = new Date()) => now.getFullYear();

// ---------------------------------------------------------------------------------------------
// Academic year
// ---------------------------------------------------------------------------------------------

export interface AcademicYear {
  /** Ethiopian year the school year is named after, e.g. 2019 */
  ec: number;
  /** Gregorian year it starts in (September), e.g. 2026 */
  gcStart: number;
  /** Gregorian year it ends in, e.g. 2027 */
  gcEnd: number;
}

/**
 * The Ethiopian school year runs with the Ethiopian year (it starts around Meskerem / September),
 * so E.C. 2019 is the 2026/2027 school year.
 */
export function academicYearFor(ec: number): AcademicYear {
  return { ec, gcStart: ec + 7, gcEnd: ec + 8 };
}

export const currentAcademicYear = (now: Date = new Date()): AcademicYear => academicYearFor(currentEcYear(now));

/** Label for the current E.C. year: '2019 E.C.' / '2019 ዓ.ም.' */
export const currentEcLabel = (lang: Lang = 'en', now: Date = new Date()) => ecYearLabel(currentEcYear(now), lang);

/** '2019 E.C.' / '2019 ዓ.ም.' */
export function ecYearLabel(ec: number, lang: Lang = 'en'): string {
  return `${ec} ${ERA[lang].ec}`;
}

/** '2026/2027' */
export const gcSpanLabel = (ay: AcademicYear) => `${ay.gcStart}/${ay.gcEnd}`;

/**
 * Academic-year label showing both calendars: '2019 E.C. (2026/2027 G.C.)'.
 * Pass `ec` to label a specific year, otherwise it is the current one.
 */
export function academicYearLabel(lang: Lang = 'en', ec?: number, now: Date = new Date()): string {
  const ay = ec === undefined ? currentAcademicYear(now) : academicYearFor(ec);
  return `${ecYearLabel(ay.ec, lang)} (${gcSpanLabel(ay)} ${ERA[lang].gc})`;
}

/** Same as academicYearLabel, in the '2019 E.C. (2026/2027)' style already used in the data. */
export function academicYearShort(ec?: number, lang: Lang = 'en', now: Date = new Date()): string {
  const ay = ec === undefined ? currentAcademicYear(now) : academicYearFor(ec);
  return `${gcSpanLabel(ay)} (${ecYearLabel(ay.ec, lang)})`;
}

// ---------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------

export const ethiopianMonthName = (month: number, lang: Lang = 'en') =>
  (lang === 'am' ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN)[month - 1] ?? '';

function weekdayIndex(input: DateInput): number {
  const g = toGregorianParts(input);
  if (!g) return 0;
  return new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay();
}

export const weekdayName = (input: DateInput, lang: Lang = 'en') =>
  (lang === 'am' ? WEEKDAYS_AM : WEEKDAYS_EN)[weekdayIndex(input)];

/** 'Tikimt 30, 2019 E.C.'  /  'ጥቅምት 30 ቀን 2019 ዓ.ም.' */
export function formatEthiopian(input: DateInput = new Date(), lang: Lang = 'en', opts: { era?: boolean } = {}): string {
  const e = toEthiopian(input);
  if (!e) return '';
  const era = opts.era === false ? '' : ` ${ERA[lang].ec}`;
  return lang === 'am'
    ? `${ethiopianMonthName(e.month, 'am')} ${e.day} ቀን ${e.year}${era}`
    : `${ethiopianMonthName(e.month, 'en')} ${e.day}, ${e.year}${era}`;
}

/** '9 Nov 2026 G.C.'  /  '9 ኖቬምበር 2026 እ.ኤ.አ.' */
export function formatGregorian(input: DateInput = new Date(), lang: Lang = 'en', opts: { era?: boolean } = {}): string {
  const g = toGregorianParts(input);
  if (!g) return '';
  const era = opts.era === false ? '' : ` ${ERA[lang].gc}`;
  const month = lang === 'am' ? GREGORIAN_MONTHS_AM[g.month - 1] : GREGORIAN_MONTHS_EN_SHORT[g.month - 1];
  return `${g.day} ${month} ${g.year}${era}`;
}

/** Both calendars side by side: 'Tikimt 30, 2019 E.C. · 9 Nov 2026 G.C.' */
export function formatDualDate(input: DateInput = new Date(), lang: Lang = 'en'): string {
  const e = formatEthiopian(input, lang);
  const g = formatGregorian(input, lang);
  return e && g ? `${e} · ${g}` : e || g;
}

/** With weekday: 'Monday · Tikimt 30, 2019 E.C. · 9 Nov 2026 G.C.' */
export function formatDualDateLong(input: DateInput = new Date(), lang: Lang = 'en'): string {
  const base = formatDualDate(input, lang);
  return base ? `${weekdayName(input, lang)} · ${base}` : '';
}

/** Compact parts for date tiles: { ec: {month, day, year}, gc: {month, day, year} } */
export function dualDateParts(input: DateInput, lang: Lang = 'en') {
  const e = toEthiopian(input);
  const g = toGregorianParts(input);
  if (!e || !g) return null;
  return {
    ec: { month: ethiopianMonthName(e.month, lang), day: e.day, year: e.year },
    gc: {
      month: lang === 'am' ? GREGORIAN_MONTHS_AM[g.month - 1] : GREGORIAN_MONTHS_EN_SHORT[g.month - 1],
      day: g.day,
      year: g.year
    }
  };
}
