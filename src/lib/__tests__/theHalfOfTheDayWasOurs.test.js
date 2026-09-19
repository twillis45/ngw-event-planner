// ─── "COOKOUT AT 5" WENT TO THE CATERER AS A CONFIRMED 5:00 PM ───────────────
//
// `smartParseEvent` grades a spoken clock in three states, and its own comment
// says why the third is different: *"'said-hour-only' — 'at 1' alone: the NUMBER
// is hers, the half of the day is a reading of it, so it is marked as the
// weakest."* MEASURED through the shipped parser:
//
//   "Cookout at 6pm on Saturday"        -> 6:00 PM   said-exact
//   "Evening cookout at 6 on Saturday"  -> 6:00 PM   said-with-bucket
//   "Cookout at 5 on Saturday"          -> 5:00 PM   said-hour-only   ← +12 hours
//   "Brunch at 11 on Saturday"          -> 11:00 AM  said-with-bucket
//
// The creation seam then wrote `{ startTime, startTimeSource: 'host' }` for all
// three and dropped the basis — so the grading the parser did deliberately was
// discarded one call later by the only caller that had it.
//
// AND IT IS LOAD-BEARING. `startTimeIsConfirmed` is `startTimeSource !==
// 'derived'`, and it gates the invite, the vendor brief and the run-of-show
// clock. The host who typed "cookout at 5" had 5:00 PM sent to her guests and
// her caterer as a confirmed time, with no ask, on a twelve-hour guess.
//
// THE NUMBER IS STILL HERS. Dropping the time would be the defect this feature
// was built to fix (2026-09-17: "dropping it on the floor and then proposing an
// hour back to her is the app ignoring the strongest signal it will ever get").
// It is stored — just not claimed as confirmed, so the shell offers it back for
// one tap, with a sentence that says what she said and what we made of it.
import { parseSmartEventText } from '../smartParseEvent';
import { startTimeIsConfirmed } from '../startTime';
import {
  startTimeFieldsToPersist, startTimeReading, HOST_STATED_BASES, READING_BASIS,
} from '../startTimeFieldsToPersist';

const persisted = (text) => ({ date: '2026-10-24', ...startTimeFieldsToPersist(parseSmartEventText(text)) });

describe('the half of the day was ours, and the event now says so', () => {
  test('(premise) the parser really grades these three differently', () => {
    // Every assertion below is vacuous if the parser stopped distinguishing them.
    const g = (t) => parseSmartEventText(t).startTimeBasis;
    expect(g('Cookout at 6pm on Saturday')).toBe('said-exact');
    expect(g('Evening cookout at 6 on Saturday')).toBe('said-with-bucket');
    expect(g('Cookout at 5 on Saturday')).toBe(READING_BASIS);
    expect(HOST_STATED_BASES).toEqual(['said-exact', 'said-with-bucket']);
  });

  test('THE DEFECT: a time whose half of the day we chose is no longer confirmed', () => {
    const read = persisted('Cookout at 5 on Saturday');
    // The number she typed is kept — throwing it away is the opposite defect.
    expect(read.startTime).toBe('5:00 PM');
    expect(read.startTimeBasis).toBe(READING_BASIS);
    // …but it is not sent onward as hers.
    expect(startTimeIsConfirmed(read)).toBe(false);
  });

  test('NEGATIVE CONTROL: a time she actually stated is still hers, both ways of stating it', () => {
    // If this fix made every parsed time unconfirmed it would have undone the
    // 2026-09-17 feature entirely — the app would be back to proposing an hour
    // at a host who already gave one.
    for (const text of ['Cookout at 6pm on Saturday', 'Evening cookout at 6 on Saturday']) {
      const ev = persisted(text);
      expect(`${text}: ${ev.startTime}`).toBe(`${text}: 6:00 PM`);
      expect(`${text}: ${startTimeIsConfirmed(ev)}`).toBe(`${text}: true`);
      // The grade rides along even when confirmed, so a later surface can tell
      // "6pm" from "evening at 6" without the text it no longer has.
      expect(HOST_STATED_BASES).toContain(ev.startTimeBasis);
    }
  });

  test('NEGATIVE CONTROL: no time heard writes no time fields at all', () => {
    // An absent answer must stay absent — the exact rule travelFieldsToPersist
    // was built for. Writing a startTime here would be the app inventing an hour.
    expect(startTimeFieldsToPersist(parseSmartEventText('Cookout on Saturday'))).toEqual({});
    expect(startTimeFieldsToPersist({})).toEqual({});
    expect(startTimeFieldsToPersist()).toEqual({});
    expect(startTimeFieldsToPersist({ startTime: '   ' })).toEqual({});
  });

  test('NEGATIVE CONTROL: an unrecognised grade is a reading, not the host’s word', () => {
    // A grade added to the parser later must be classified here ON PURPOSE.
    // Defaulting the other way would let the next one ship confirmed.
    const odd = startTimeFieldsToPersist({ startTime: '5:00 PM', startTimeBasis: 'said-by-telepathy' });
    expect(odd.startTimeSource).toBe('derived');
    const none = startTimeFieldsToPersist({ startTime: '5:00 PM' });
    expect(none.startTimeSource).toBe('derived');
    expect(none.startTimeBasis).toBeUndefined();
  });

  test('the sentence names what she said and what we made of it', () => {
    // "We pencilled in 5:00 PM — not you" is true of a time built from a bucket
    // and FALSE here. This is the copy that replaces it on a read time.
    const r = startTimeReading(persisted('Cookout at 5 on Saturday'));
    expect(r.said).toBe('5');
    expect(r.shown).toBe('5:00 PM');
    expect(r.line).toBe('You said 5 — we read it as PM. Confirm it, or set the time yourself.');
  });

  test('NEGATIVE CONTROL: the sentence stays away from every other time', () => {
    // A stated time, an app-derived time and an empty one must all keep the copy
    // they already have — a sentence claiming the host said a number she did not
    // is the same defect pointed the other way.
    expect(startTimeReading(persisted('Cookout at 6pm on Saturday'))).toBe(null);
    expect(startTimeReading(persisted('Evening cookout at 6 on Saturday'))).toBe(null);
    expect(startTimeReading({ startTime: '3:00 PM', startTimeSource: 'derived' })).toBe(null);
    expect(startTimeReading({ startTime: '', startTimeBasis: READING_BASIS })).toBe(null);
    expect(startTimeReading(null)).toBe(null);
  });

  test('a morning reading reads as AM, not as a mislabelled PM', () => {
    // "Brunch at 11" resolves through the bucket, so take the un-bucketed path:
    // an hour outside 1–6 is NOT shifted, and the sentence must not say PM.
    const ev = persisted('Cookout at 11 on Saturday');
    expect(ev.startTime).toBe('11:00 AM');
    expect(ev.startTimeBasis).toBe(READING_BASIS);
    expect(startTimeReading(ev).line).toMatch(/we read it as AM/);
    // Still unconfirmed: the app chose AM here just as surely as it chose PM at 5.
    expect(startTimeIsConfirmed(ev)).toBe(false);
  });
});
