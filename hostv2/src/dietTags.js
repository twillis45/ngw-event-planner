// dietTags — the words a host reads on a diet tag (owner, 11/24/2026).
//
// The engine's DIET_KEYWORDS (src/lib/playbooks/index.js) names each flag
// tersely — "not pesc.", "nuts", "check halal" — and dietFlags.test.js pins
// those engine labels, so they stay as they are. This is the SHELL's display
// layer: one map, read by every place a diet tag is shown (the shopping row,
// the opened item, the Bringing row), so the words cannot drift between them.
const WORDS = {
  'not pesc.': 'Not pescatarian',
  'not veg': 'Not vegetarian',
  'not vegan': 'Not vegan',
  'check halal': 'Check: halal',
  'check kosher': 'Check: kosher',
};

/** One engine flag in plain English: "nuts" → "Has nuts". */
export function dietTagLabel(flag) {
  const k = String(flag || '').trim().toLowerCase();
  if (!k) return '';
  if (WORDS[k]) return WORDS[k];
  // An allergen or ingredient the line contains: nuts, gluten, dairy,
  // shellfish, fish, soy, sesame, egg, alcohol.
  if (/^[a-z]+$/.test(k)) return 'Has ' + k;
  return String(flag).trim();
}

/** A line's flags as one tag's text, or '' when it has none. */
export function dietTagText(flags) {
  return (Array.isArray(flags) ? flags : []).map(dietTagLabel).filter(Boolean).join(' · ');
}
