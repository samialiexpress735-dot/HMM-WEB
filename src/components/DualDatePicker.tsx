import React from 'react';
import {
  Lang,
  currentEcYear,
  daysInEthiopianMonth,
  ethiopianMonthName,
  ethiopianToIso,
  formatDualDateLong,
  toEthiopian,
  todayISO
} from '../utils/ethiopianCalendar';

interface DualDatePickerProps {
  /** ISO date 'YYYY-MM-DD' (Gregorian). This is the single stored value; the E.C. date is always derived from it. */
  value: string;
  onChange: (iso: string) => void;
  lang?: Lang;
}

const fieldCls =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none';

/**
 * Gregorian (G.C.) date input + Ethiopian (E.C.) day / month / year selects that stay in sync.
 * Change either one and the other updates, so the two calendars can never disagree.
 */
export const DualDatePicker: React.FC<DualDatePickerProps> = ({ value, onChange, lang = 'en' }) => {
  const safeValue = toEthiopian(value) ? value : todayISO();
  const eth = toEthiopian(safeValue)!;

  const setEth = (year: number, month: number, day: number) => {
    onChange(ethiopianToIso(year, month, Math.min(day, daysInEthiopianMonth(year, month))));
  };

  // Offer last year .. 3 years ahead, and always include the selected year.
  const thisYear = currentEcYear();
  const years = Array.from(new Set([thisYear - 1, thisYear, thisYear + 1, thisYear + 2, thisYear + 3, eth.year])).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          {lang === 'am' ? 'የግሪጎሪያን ቀን (እ.ኤ.አ.)' : 'Gregorian Date (G.C.):'}
        </label>
        <input
          type="date"
          required
          value={safeValue}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={fieldCls}
        />
      </div>

      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          {lang === 'am' ? 'የኢትዮጵያ ቀን (ዓ.ም.)' : 'Ethiopian Date (የኢትዮጵያ ቀን):'}
        </label>
        <div className="grid grid-cols-[4rem_1fr_5rem] gap-2">
          <select
            aria-label="Ethiopian day"
            value={eth.day}
            onChange={(e) => setEth(eth.year, eth.month, Number(e.target.value))}
            className={fieldCls}
          >
            {Array.from({ length: daysInEthiopianMonth(eth.year, eth.month) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Ethiopian month"
            value={eth.month}
            onChange={(e) => setEth(eth.year, Number(e.target.value), eth.day)}
            className={fieldCls}
          >
            {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {ethiopianMonthName(m, 'en')} ({ethiopianMonthName(m, 'am')})
              </option>
            ))}
          </select>
          <select
            aria-label="Ethiopian year"
            value={eth.year}
            onChange={(e) => setEth(Number(e.target.value), eth.month, eth.day)}
            className={fieldCls}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-emerald-800 font-medium">✓ {formatDualDateLong(safeValue, lang)}</p>
    </div>
  );
};
