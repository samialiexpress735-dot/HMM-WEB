import React from 'react';
import { Lang, formatEthiopian, formatGregorian } from '../utils/ethiopianCalendar';

interface DualDateProps {
  /** ISO date 'YYYY-MM-DD' (Gregorian). The Ethiopian date is computed from it. */
  date?: string;
  lang?: Lang;
  /** 'stack' puts E.C. over G.C. on two lines (good for narrow right-aligned slots); 'inline' puts them on one line. */
  layout?: 'stack' | 'inline';
  className?: string;
}

/** Shows one date in both calendars, e.g. 'Tikimt 30, 2019 E.C.' + '9 Nov 2026 G.C.'. Falls back to the raw text if it is not a valid date. */
export const DualDate: React.FC<DualDateProps> = ({ date, lang = 'en', layout = 'stack', className = '' }) => {
  const ec = date ? formatEthiopian(date, lang) : '';
  const gc = date ? formatGregorian(date, lang) : '';
  if (!ec || !gc) return <span className={className}>{date ?? ''}</span>;

  if (layout === 'inline') {
    return (
      <span className={className}>
        {ec} · {gc}
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col items-end text-right leading-tight ${className}`}>
      <span>{ec}</span>
      <span className="opacity-70">{gc}</span>
    </span>
  );
};
