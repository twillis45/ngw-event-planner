// ─── US HOLIDAYS, COMPUTED — NOT GUESSED ────────────────────────────────────
//
// Built 2026-09-23 after a systematic sweep of parser coverage: "thanksgiving
// 2027", "juneteenth 2027", "labor day weekend 2027", "christmas eve 2027",
// "new years eve 2027" and "mothers day 2027" ALL returned no date at all.
// People plan around holidays constantly — a Thanksgiving dinner, a Juneteenth
// cookout, a Memorial Day weekend reunion — and every one of those hosts was
// typing the single most important fact and watching it vanish.
//
// Nothing here is invented. Every date is either a fixed calendar date or a
// published rule ("the fourth Thursday in November"), so this is arithmetic
// rather than a guess — which is why it can set an exact `date` where the
// season handler beside it may only offer a month.
//
// EASTER uses the anonymous Gregorian computus, the standard algorithm for the
// Western date. It is included because it anchors a real family-gathering
// season; Orthodox Easter follows a different rule and is deliberately NOT
// claimed here.

const _utc = (y, m, d) => new Date(Date.UTC(y, m, d, 12));

// The nth given weekday of a month. n = 1..4, or -1 for the last one.
function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1, 12));
    const shift = (weekday - first.getUTCDay() + 7) % 7;
    return _utc(year, month, 1 + shift + (n - 1) * 7);
  }
  const last = new Date(Date.UTC(year, month + 1, 0, 12));
  const back = (last.getUTCDay() - weekday + 7) % 7;
  return _utc(year, month, last.getUTCDate() - back);
}

// Anonymous Gregorian computus — Western Easter Sunday.
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);      // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return _utc(year, month - 1, day);
}

// Each entry: a matcher, and a function from year to the Date.
// Order matters — the longest, most specific phrases must be tried first, or
// "christmas eve" is eaten by "christmas" and "new years eve" by "new year".
export const HOLIDAYS = [
  { re: /\bchristmas\s*eve\b|\bxmas\s*eve\b/i,            label: 'Christmas Eve',    at: (y) => _utc(y, 11, 24) },
  { re: /\bnew\s*year'?s?\s*eve\b|\bnye\b/i,              label: "New Year's Eve",   at: (y) => _utc(y, 11, 31) },
  { re: /\bnew\s*year'?s?\s*day\b/i,                      label: "New Year's Day",   at: (y) => _utc(y, 0, 1) },
  { re: /\bchristmas\b|\bxmas\b/i,                        label: 'Christmas',        at: (y) => _utc(y, 11, 25) },
  { re: /\bthanksgiving\b|\bturkey\s*day\b/i,             label: 'Thanksgiving',     at: (y) => nthWeekday(y, 10, 4, 4) },
  { re: /\bjuneteenth\b/i,                                label: 'Juneteenth',       at: (y) => _utc(y, 5, 19) },
  { re: /\b(?:independence\s*day|fourth\s+of\s+july|4th\s+of\s+july|july\s*4th?)\b/i,
    label: 'the Fourth of July', at: (y) => _utc(y, 6, 4) },
  { re: /\bmemorial\s*day\b/i,                            label: 'Memorial Day',     at: (y) => nthWeekday(y, 4, 1, -1) },
  { re: /\blabor\s*day\b/i,                               label: 'Labor Day',        at: (y) => nthWeekday(y, 8, 1, 1) },
  { re: /\bmother'?s?\s*day\b/i,                          label: "Mother's Day",     at: (y) => nthWeekday(y, 4, 0, 2) },
  { re: /\bfather'?s?\s*day\b/i,                          label: "Father's Day",     at: (y) => nthWeekday(y, 5, 0, 3) },
  { re: /\bhalloween\b/i,                                 label: 'Halloween',        at: (y) => _utc(y, 9, 31) },
  { re: /\bvalentine'?s?(?:\s*day)?\b/i,                  label: "Valentine's Day",  at: (y) => _utc(y, 1, 14) },
  { re: /\bst\.?\s*patrick'?s?(?:\s*day)?\b|\bst\.?\s*paddy'?s?\b/i,
    label: "St. Patrick's Day", at: (y) => _utc(y, 2, 17) },
  { re: /\bcinco\s*de\s*mayo\b/i,                         label: 'Cinco de Mayo',    at: (y) => _utc(y, 4, 5) },
  { re: /\bmlk\s*day\b|\bmartin\s*luther\s*king\b/i,      label: 'MLK Day',          at: (y) => nthWeekday(y, 0, 1, 3) },
  { re: /\bpresidents'?\s*day\b/i,                        label: "Presidents' Day",  at: (y) => nthWeekday(y, 1, 1, 3) },
  { re: /\beaster\b/i,                                    label: 'Easter',           at: (y) => easter(y) },
];

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Resolve a holiday named in free text to an exact date.
 *
 * `{ date, label, weekend }` or null. Never guesses a YEAR it was not given or
 * cannot infer: with no year in the text it takes the next occurrence from
 * `now`, which is the same rule the rest of the date parser already uses.
 *
 * "X WEEKEND" RESOLVES TO THE SATURDAY, and that is a stated choice rather than
 * a fact: "Labor Day weekend" names a three-day span, holiday-weekend events
 * land on the Saturday far more often than on the Monday, and the host sees the
 * date on the confirm screen before anything is built on it. Returning nothing
 * — what happened before — was the worse answer.
 */
export function resolveHoliday(text, now = new Date()) {
  const t = String(text || '');
  if (!t) return null;
  for (const h of HOLIDAYS) {
    const m = t.match(h.re);
    if (!m) continue;
    const yearM = t.match(/\b(20\d{2})\b/);
    let year = yearM ? Number(yearM[1]) : now.getFullYear();
    let d = h.at(year);
    // No year said and the day has already passed → the next one.
    if (!yearM && d < now) d = h.at(year + 1);
    // "…weekend" → the Saturday of that weekend (see the note above).
    // The source MUST be wrapped: several of these patterns are alternations,
    // and `a|b` + '\\s*weekend' binds the suffix to `b` alone — so a bare
    // "thanksgiving" tested true for "weekend" and every such holiday was
    // silently shifted back to the preceding Saturday. Caught by checking the
    // output against the published 2027 calendar rather than trusting it.
    const weekend = new RegExp('(?:' + h.re.source + ')\\s*weekend', 'i').test(t);
    if (weekend) {
      const back = (d.getUTCDay() - 6 + 7) % 7;      // 6 = Saturday
      d = new Date(d.getTime() - back * 86400000);
    }
    return { date: iso(d), label: h.label, weekend };
  }
  return null;
}
