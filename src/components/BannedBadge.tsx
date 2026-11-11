/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ban } from 'lucide-react';
import { Student } from '../data/schoolData';
import { isBanned } from '../utils/banAndDisband';

/** Hover text for a ban: the reason and the dates, e.g. "Banned: Fighting (since 2026-11-10, until 2026-11-20)". */
export function banTooltip(s: Pick<Student, 'bannedReason' | 'bannedDate' | 'bannedUntil'>): string {
  const parts: string[] = [];
  if (s.bannedDate) parts.push(`since ${s.bannedDate}`);
  if (s.bannedUntil) parts.push(`until ${s.bannedUntil}`);
  return `Banned${s.bannedReason ? `: ${s.bannedReason}` : ''}${parts.length ? ` (${parts.join(', ')})` : ''}`;
}

/** A red "Banned" pill shown next to a student's name for teachers. Renders nothing when no ban applies. */
export const BannedBadge: React.FC<{ student: Student; className?: string }> = ({ student, className = '' }) => {
  if (!isBanned(student)) return null;
  return (
    <span
      title={banTooltip(student)}
      className={`inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 shrink-0 ${className}`}
    >
      <Ban className="h-3 w-3" />
      Banned
    </span>
  );
};
