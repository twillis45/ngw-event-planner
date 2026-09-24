// ─── THE ELEGANT MASTHEAD SAYS EACH THING ONCE ───────────────────────────────
//
// The elegant hero keeps ONE element — a small all-caps eyebrow — and its own
// comment states the design it was ported from: "countdown · event name,
// uppercase". TWO facts. It now carries FOUR, each added deliberately and each
// with a reason on the record: the identity, because a board found the screen
// never said whose event it was; the date, because "a countdown is a feeling, a
// date is a calendar entry".
//
// Nothing is wrong with those reasons. What went wrong is the sum. Measured on
// the live build at 390px: 85 characters, 11.5px, weight 700, uppercase,
// 1.035px of tracking — rendering FOUR wrapped lines, with the last one an
// orphan. Host: "not easily readable". All-caps removes word shape, wide
// tracking slows the eye, and both penalties land on the longest string on the
// screen.
//
// THIS DOES NOT DROP A FACT. It drops a RESTATEMENT. Measured across the
// shipped sample events, four of five name their own type:
//
//   "Margaret Adeyemi's Retirement Celebration"  ·  Retirement Party
//   "A repast for Deacon Willie Hayes"           ·  Repast
//   "The Cookout"                                ·  The Cookout
//   "My Crab Feast"                              ·  Crab Feast
//
// and the fifth does not — "Wanda turns 50" · Birthday — so it keeps its type.
// The rule is the reader's: if the name already tells you what kind of event it
// is, the type slot is spending a quarter of the line to tell you again.

/** Words that carry no identity on their own, so they never justify the slot. */
const FILLER = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'party', 'celebration', 'event']);

const words = (s) => String(s == null ? '' : s)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .split(' ')
  .filter(Boolean);

/**
 * typeIsRestatedByName('A repast for Deacon Willie Hayes', 'Repast') -> true
 *
 * True when every MEANINGFUL word of the type already appears in the name.
 * Conservative in the direction that matters: a type with no meaningful words
 * left (e.g. "The Party") returns false and keeps its slot, because dropping a
 * fact on a technicality is worse than one extra chip.
 */
export function typeIsRestatedByName(name, typeLabel) {
  const nameWords = new Set(words(name));
  if (!nameWords.size) return false;
  const typeWords = words(typeLabel).filter((w) => !FILLER.has(w));
  if (!typeWords.length) return false;
  return typeWords.every((w) => nameWords.has(w));
}
