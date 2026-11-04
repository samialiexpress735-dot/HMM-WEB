/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArchiveStudent, RegisteredStudent2019, TimetableSlot } from '../utils/registrationAndTimetable';

/**
 * 2018 E.C. Previous Year Archive & 2019 E.C. Registration Pool
 * Initialized clean with zero placeholder data as requested.
 * All records are dynamically added and stored via Supabase.
 */
export const PREVIOUS_YEAR_ARCHIVE_STUDENTS: ArchiveStudent[] = [];

export const INITIAL_REGISTERED_2019_STUDENTS: RegisteredStudent2019[] = [];

export const INITIAL_TIMETABLE_SLOTS: TimetableSlot[] = [];
