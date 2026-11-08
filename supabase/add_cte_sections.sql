-- ==============================================================================
-- CTE section flag + track on grade_sections (run once in the Supabase SQL Editor)
-- Without these columns a CTE section is saved as an ordinary section and the
-- CTE flag is lost the next time sections are loaded from the cloud.
-- ==============================================================================

ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS is_cte_section     BOOLEAN DEFAULT false;
ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS cte_specialization TEXT;  -- e.g. 'Web Design and Development'

-- Repair CTE sections that were already saved without the flag (codes look like 11-CTE-WD)
UPDATE grade_sections SET is_cte_section = true WHERE section_code LIKE '%-CTE-%' AND is_cte_section IS NOT TRUE;
