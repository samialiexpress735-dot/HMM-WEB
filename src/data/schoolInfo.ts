import { currentEcYear, ecYearLabel } from '../utils/ethiopianCalendar';
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
  // These follow today's Ethiopian date automatically (the year rolls over on 1 Meskerem), so they never go stale.
  // To admit students for a different year, replace a getter with a fixed string such as '2020 E.C.'.
  get registrationYear() { return ecYearLabel(currentEcYear()); },      // year new students are admitted for
  get previousYear() { return ecYearLabel(currentEcYear() - 1); },      // last year's records, used for name suggestions
};
