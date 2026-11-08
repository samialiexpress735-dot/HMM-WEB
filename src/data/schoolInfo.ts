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
  registrationYear: '2019 E.C.', // the year new students are being admitted for (CHECK THIS)
  previousYear: '2018 E.C.',     // last year's records used for name suggestions
};
