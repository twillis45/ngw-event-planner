// ─── How an occasion reads in a name and in a sentence ───────────────────────
// Gold run (11/5/2026): "My The Cookout", "A the cookout.", "For 25 at a the
// cookout", and "My Watch" for a watch party. Names dropped " Party" from every
// type — right for "Birthday Party", wrong where the word before it is not an
// occasion on its own — and kept a leading "The". One place decides both.

// " Party" stays when the word before it is not an occasion by itself.
// "Holiday" alone reads as a day off, not an event (run 2, R2-7: "My Holiday").
const KEEPS_PARTY = /^(watch|card|day|holiday)\s+party$/i;

/** For an event NAME after "My " or "<Name>’s ": "Cookout", "Watch Party", "Retirement". */
export function occasionShortName(type) {
  const t = String(type || '').trim().replace(/^the\s+/i, '');
  return KEEPS_PARTY.test(t) ? t : t.replace(/\s+Party$/i, '');
}

/** Lowercase, no article: "cookout", "watch party". */
export function occasionNoun(type) {
  return String(type || 'event').trim().replace(/^the\s+/i, '').toLowerCase();
}

/** With its article: "a cookout", "an anniversary". */
export function aOccasion(type) {
  const n = occasionNoun(type);
  return (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n;
}
