// ─── HOW MANY PEOPLE A PLUS-ONE FIELD BRINGS, ONCE (Wanda audit P0-8) ───────
//
// `plusOne` is free text. Most rows hold a partner's name ("Jordan Lee") —
// one person. A family row holds a count: Wanda's brother's reads
// "+3 (Nia + 2 boys)", three people. Every reader used to compute
// `1 + (plusOne ? 1 : 0)`, so seven Yes rows bringing seventeen people read
// "10 heads" and "Seated 10 of 10", and the row printed "+1 +3 (Nia + 2 boys)".
//
// The rule: a leading number ("+3", "3", "+3 (…)") is that many people; any
// other text is one; blank is none. A name never starts with a digit, so the
// number reading cannot swallow a name. PURE.

const text = (g) => String((g && g.plusOne) == null ? '' : g.plusOne).trim();
const LEADING_COUNT = /^\+?\s*(\d+)/;

/** People riding this row's answer besides the guest named on it. */
export function plusOneCount(g) {
  const s = text(g);
  if (!s) return 0;
  const m = s.match(LEADING_COUNT);
  return m ? Math.max(0, parseInt(m[1], 10)) : 1;
}

/** The row's party words: "+3 (Nia + 2 boys)" as written, "+1 Jordan Lee" for a name. */
export function plusOneLabel(g) {
  const s = text(g);
  if (!s) return '';
  return LEADING_COUNT.test(s) ? (s.startsWith('+') ? s : `+${s}`) : `+1 ${s}`;
}
