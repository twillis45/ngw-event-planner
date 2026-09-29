// "JUNE 14 2027 TO JUNE 17 2027" (host report 2026-09-29).
//
// Found while writing the date-label gate. An explicit "X to Y" range is the
// most literal way a host can state a span — and it was the one form that did
// not work, because the range matcher allowed a year only on the END side.
// With a year after the FIRST day the connector never matched, the single-date
// matcher ate "June 14 2027", and "to June 17 2027" landed in the confirm
// screen's "didn't make it into the plan" list. The host stated the last day
// of their trip and the app told them it had thrown it away.
//
// The forms below are all ordinary ways to write the same span. Every one of
// them has to reach endDate.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';

const p = (s) => parseSmartEventText(s, {});

describe('a year on the start side of a range', () => {
  const SPANS = [
    'reunion June 14 2027 to June 17 2027 for 20 people',
    'reunion June 14, 2027 to June 17, 2027 for 20 people',
    'reunion June 14 2027 - June 17 2027 for 20 people',
    'reunion June 14 2027 through June 17 2027 for 20 people',
    'reunion June 14 2027 to 17 for 20 people',
  ];
  test.each(SPANS)('%s', (text) => {
    const r = p(text);
    expect(r.date).toBe('2027-06-14');
    expect(r.endDate).toBe('2027-06-17');
  });

  test('a year on the END side alone still anchors both, as it always has', () => {
    const r = p('reunion June 12-14, 2028');
    expect(r.date).toBe('2028-06-12');
    expect(r.endDate).toBe('2028-06-14');
  });

  test('a year the host typed is never bumped forward, on either side', () => {
    // 2026 is in the past relative to the repo's own clock in CI, and an
    // explicit year is authoritative — the whole reason the end-side year was
    // captured in the first place.
    const r = p('reunion December 30 2027 to January 2 2028');
    expect(r.date).toBe('2027-12-30');
    expect(r.endDate).toBe('2028-01-02');
  });

  test('a backwards span is noise, not a range', () => {
    const r = p('reunion June 17 2027 to June 14 2027');
    expect(r.endDate).toBeNull();
  });

  test('a four-digit headcount is not a year', () => {
    // The guard that already protects the single-date matcher has to hold here
    // too: nothing may read a count as a year.
    const r = p('reunion June 12-14, 20 cousins');
    expect(r.date).toBe('2027-06-12');
    expect(r.endDate).toBe('2027-06-14');
  });

  // ── AND IT MUST NOT THEN CLAIM IT IGNORED THE YEAR ─────────────────────────
  // Driven live the moment the range fix landed: the confirm screen's "didn't
  // make it into the plan" list read "2027 for" on a sentence whose parse
  // resolved 2027-06-14 → 2027-06-17. With a year on BOTH sides each one is
  // individually removable (the other still anchors the span), so the per-word
  // test marks both unused — and the file's own redundancy rule could not save
  // it, because "for" is three letters and the exemption stopped at two.
  //
  // `_FILLER` is this file's own list of tokens that carry no fact. A clause
  // survives the redundancy check only on its fact-carrying words; a
  // connective riding along cannot keep a false report alive. Naming a fact we
  // honoured is the same lie as staying silent about one we dropped, pointed
  // the other way.
  test('a year the plan used is never listed as ignored', () => {
    const text = 'reunion June 14 2027 to June 17 2027 for 20 people';
    expect(parseSmartEventText(text, {}).endDate).toBe('2027-06-17');
    const missed = unusedClauses(text, {});
    expect(missed.join(' | ')).not.toMatch(/2027/);
  });
});
