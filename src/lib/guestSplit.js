// One line, two adults — "Ryan and Nicole" typed as a single guest silently
// undercounts every downstream number (headcount, food, seats, one Yes for two
// people; audit 2026-07-27). This is the ONE detector every entry point shares.
//
// Doctrine: SUGGEST, never silently rewrite. Callers show the split as a
// preview/hint the host or guest can decline — "Anderson & Sons Catering" and
// "Salt and Pepper" are one name, and only a human knows. The detector only
// nominates; the person decides.

// Things that look like businesses/acts, not two people. A hit anywhere in the
// line disqualifies it from couple detection entirely.
const NON_PERSON = /\b(sons?|bros?|brothers|co|inc|llc|catering|caterers|cafe|kitchen|bbq|barbecue|band|dj|djs|sound|audio|events?|rentals?|hall|church|choir|crew|team|group|market|farms?|photography|photo|video|films?|design|florals?|flowers|bakery|cakes?)\b/i;

const NAME_TOKEN = "[A-Za-z][A-Za-z'’.-]*";

/**
 * Detect a two-person line: "Ryan and Nicole", "Ryan & Nicole Smith",
 * "Ryan Smith and Nicole Jones". Returns { names: [a, b] } or null.
 * A shared surname distributes: "Ryan and Nicole Smith" → Ryan Smith + Nicole
 * Smith (left side has no surname, right side has exactly one).
 * Deliberately NOT detected (can't derive two real names): "The Smiths",
 * "Mr. & Mrs. Jones", three-or-more lists ("Ann, Bo and Cy" fails the shape).
 */
export function detectCoupleNames(raw) {
  const s = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!s || s.includes(',') || NON_PERSON.test(s)) return null;
  const m = s.match(new RegExp(
    `^(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?)\\s+(?:&|\\+|and)\\s+(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?)$`, 'i'
  ));
  if (!m) return null;
  const lt = m[1].trim().split(' ');
  const rt = m[2].trim().split(' ');
  // Single-letter fragments ("J and R") are initials, not names we can roster.
  if (lt.concat(rt).some(t => t.replace(/[.'’-]/g, '').length < 2)) return null;
  let a = m[1].trim(), b = m[2].trim();
  if (lt.length === 1 && rt.length === 2) a = `${lt[0]} ${rt[1]}`; // shared surname
  return { names: [a, b] };
}
