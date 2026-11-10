import { getAcademicYear, previousYear, formatYear } from '../utils/academicYear';
/**
 * Single source of truth for school contact details.
 * Fill these in with the REAL information. Anything left empty ('') is hidden
 * from the site, so nothing unverified is ever shown to parents.
 * Student and teacher counts are NOT stored here: they come from the database.
 */
export const SCHOOL_INFO = {
  phone: '',          // e.g. '+251 11 000 0000'
  email: '',          // e.g. 'info@yourschool.edu.et'
  address: '',        // e.g. 'Kebele 03, Debre Berhan'
  officeHours: '',    // e.g. 'Mon–Fri, 8:00–17:00'
  founded: '',        // e.g. '1965 G.C.'
  // These follow the academic year the school is RUNNING. 1 Meskerem only suggests a new year (see the "Academic year"
  // tab of the registrar); the year changes when an administrator starts it, and then every device follows.
  get registrationYear() { return formatYear(getAcademicYear()); },                    // year new students are admitted for
  get previousYear() { return formatYear(previousYear(getAcademicYear())); },          // last year's records, used for name suggestions
};
