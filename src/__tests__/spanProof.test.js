// SPAN PROOF — R1 ruling (2026-07-26): multi-day events are representable and
// every span-aware reader agrees. Board-reviewed slice 1 of the Destination +
// Multi-Day program. Locks four seams:
//   1. dates.js span helpers (spanEnd / spanNights / isDuringEvent / dayIndexOf)
//   2. parser range + duration grammar ("June 12–14" must never silently become
//      June 12 — the range end used to be DROPPED; that was a data-honesty defect)
//   3. closeoutIntel.isPastEvent(event) — tense measured from the LAST day
//   4. phaseProgress — day 2 of 3 is live_event, not post_event
// Single-day events (no endDate) must answer IDENTICALLY to before: endDate
// absent ⇒ span of one, nothing changes. That degradation IS the feature flag.

import { spanEnd, spanNights, isDuringEvent, dayIndexOf, daysUntilEnd } from '../lib/dates';
import { parseSmartEventText } from '../lib/smartParseEvent';
import { isPastEvent } from '../lib/closeoutIntel';
import { deriveEventPhaseProgress } from '../lib/phaseProgress';

// Pin the clock: mid-span of a Jun 12–14 event.
const NOW = new Date('2026-06-13T15:00:00');
const iso = (d) => d.toISOString().slice(0, 10);
const shift = (days) => { const d = new Date(NOW); d.setDate(d.getDate() + days); d.setHours(12); return iso(d); };

describe('dates.js span helpers', () => {
  const multi = { date: '2026-06-12', endDate: '2026-06-14' };
  const single = { date: '2026-06-12' };

  test('spanEnd: endDate when valid and after start; start otherwise', () => {
    expect(spanEnd(multi)).toBe('2026-06-14');
    expect(spanEnd(single)).toBe('2026-06-12');
    expect(spanEnd({ date: '2026-06-12', endDate: '2026-06-10' })).toBe('2026-06-12'); // backwards = ignored
    expect(spanEnd({ date: '2026-06-12', endDate: 'garbage' })).toBe('2026-06-12');
    expect(spanEnd({})).toBe(null);
  });

  test('spanNights: nights between first and last day; 0 for single-day', () => {
    expect(spanNights(multi)).toBe(2);
    expect(spanNights(single)).toBe(0);
  });

  test('isDuringEvent + dayIndexOf: live through the whole span, indexed 1..N', () => {
    expect(isDuringEvent(multi, NOW)).toBe(true);        // Jun 13 = day 2
    expect(dayIndexOf(multi, NOW)).toBe(2);
    expect(isDuringEvent(single, NOW)).toBe(false);      // single-day Jun 12 is over on Jun 13
    expect(dayIndexOf(single, NOW)).toBe(null);
    expect(daysUntilEnd(multi, NOW)).toBe(1);
  });
});

describe('parser range + duration grammar', () => {
  const opts = { now: new Date('2026-05-01T10:00:00') };

  test('"June 12-14" yields BOTH dates — the range end is never dropped', () => {
    const p = parseSmartEventText('Family reunion in Gatlinburg June 12-14 for 40 people', opts);
    expect(p.date).toBe('2026-06-12');
    expect(p.endDate).toBe('2026-06-14');
  });

  test('en-dash and "to"/"through" forms parse the same', () => {
    expect(parseSmartEventText('reunion June 12 – 14', opts).endDate).toBe('2026-06-14');
    expect(parseSmartEventText('reunion June 12 to 14', opts).endDate).toBe('2026-06-14');
    expect(parseSmartEventText('reunion June 12 through 14', opts).endDate).toBe('2026-06-14');
  });

  test('cross-month range: "June 30 to July 2"', () => {
    const p = parseSmartEventText('retreat June 30 to July 2', opts);
    expect(p.date).toBe('2026-06-30');
    expect(p.endDate).toBe('2026-07-02');
  });

  test('backwards same-month "range" is noise, not a span', () => {
    const p = parseSmartEventText('party June 14-12', opts);
    expect(p.endDate).toBe(null);
  });

  test('duration form: "3-day reunion June 12" derives the last day', () => {
    const p = parseSmartEventText('3-day reunion June 12', opts);
    expect(p.date).toBe('2026-06-12');
    expect(p.endDate).toBe('2026-06-14');
  });

  test('"in 3 days" is a relative START, never a duration', () => {
    const p = parseSmartEventText('dinner party in 3 days', opts);
    expect(p.date).toBe('2026-05-04');
    expect(p.endDate).toBe(null);
  });

  test('no range said, no endDate invented', () => {
    expect(parseSmartEventText('Birthday June 12 for 20 people', opts).endDate).toBe(null);
  });
});

describe('tense + phase across the span', () => {
  test('closeoutIntel.isPastEvent: false mid-span and on the last day; true only after', () => {
    const ev = { date: shift(-1), endDate: shift(1) };            // day 2 of 3 today
    expect(isPastEvent(ev, NOW)).toBe(false);
    expect(isPastEvent({ date: shift(-2), endDate: shift(0) }, NOW)).toBe(false); // last day = day-of, not past
    expect(isPastEvent({ date: shift(-3), endDate: shift(-1) }, NOW)).toBe(true);
    expect(isPastEvent({ date: shift(-1) }, NOW)).toBe(true);      // single-day behavior unchanged
  });

  test('phaseProgress: day 2 of 3 is live_event, not post_event', () => {
    const ev = { date: shift(-1), endDate: shift(1) };
    expect(deriveEventPhaseProgress(ev, NOW).phase).toBe('live_event');
    expect(deriveEventPhaseProgress({ date: shift(-1) }, NOW).phase).toBe('post_event'); // single-day unchanged
    expect(deriveEventPhaseProgress({ date: shift(2), endDate: shift(4) }, NOW).phase).toBe('pre_event');
  });
});
