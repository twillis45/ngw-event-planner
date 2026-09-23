// ─── A CONTRADICTION WAS BEING REPORTED AS AN ABSENCE ────────────────────────
//
// `resolveTimingProvenance` returned null for two different situations and no
// caller could tell them apart:
//
//   1. no category matched — genuinely unsourced, and the honest majority.
//      "What sides to serve" has no published lead time and never will.
//   2. a category MATCHED, then the lead-window gate rejected it — a real dated
//      source speaks to this exact kind of decision and OUR DEADLINE DISAGREES.
//
// Case 2 was filed as case 1, so the app's own deadline could contradict its own
// registry in silence.
//
// ── AND THEN EVERY "LATE" ONE TURNED OUT TO BE FALSE (2026-09-23) ──────────
//
// This file recorded FOUR, then three, decisions telling a host to act LATER
// than a source supports. On 2026-09-23 the detector was finally wired to the
// decision card — and the first thing it did on a real board was warn a Day
// Party host that "Where (daytime outdoor)" was four weeks out against a
// two-month booking floor.
//
// Its options are Backyard / Rooftop / Patio / Rented outdoor space. THREE OF
// FOUR REQUIRE NO BOOKING AT ALL. Reading the three flagged decisions instead
// of trusting the count, all three were the same thing:
//
//   Day Party         "Where (daytime outdoor)"                  a setting choice
//   Retirement Party  "At home, a restaurant, or the workplace?"  a setting choice
//   Surprise Proposal "Photographer hidden or known to your partner?"
//                       — which decides what the photographer PRETENDS TO BE,
//                         not whether or when to hire one
//
// That is the exact failure the registry's own header warns about, committed by
// the registry: "a T-18d 'indoor or outdoor' setting call whose id happens to
// contain 'venue' must NOT cite a source about booking a wedding venue." The
// lead-window gate caught the GROUNDING case and let the CONTRADICTION case
// through, because a contradiction is what you get when the window rejects a
// match the pattern should never have made.
//
// So the count is now ZERO late conflicts, and that is a correction, not a
// success. Two vetoes did it — a structural one (a decision offering a place
// the host already has is not a booking, unless its label says it is) and a
// pattern one (a concealment decision is not a hiring decision). The machinery
// that surfaces a conflict to a host stays, guarded and correct; it simply has
// no true case in this corpus today.
//
// NO AUTHORED DEADLINE WAS EVER CHANGED, in either direction. Every source in
// this registry is a commercial practitioner, and the dates were never the
// problem — the matching was.
import { ALL_PLAYBOOKS } from '../playbooks';
import {
  timingConflict, detectTimingCategory, effectiveTimingProvenance, isGroundedTiming,
} from '../knowledge/timingProvenance';

const allDecisions = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) if (d && d.id) out.push({ pb: pb.type, d });
  }
  return out;
};

describe('the measurement this file was written from', () => {
  test('(premise) the corpus and the resolver are both really here', () => {
    // Every count below is meaningless over an empty sweep.
    const all = allDecisions();
    expect(all.length).toBeGreaterThan(200);
    expect(all.filter(({ d }) => detectTimingCategory(d)).length).toBeGreaterThan(20);
  });

  test('most decisions are honestly unsourced, and that is the design', () => {
    // The registry's header: false negatives are acceptable, a false positive is
    // not. If this ever approached 100% someone has widened the patterns.
    const all = allDecisions();
    const grounded = all.filter(({ d }) => isGroundedTiming(effectiveTimingProvenance(d)));
    expect(grounded.length).toBeGreaterThan(20);
    expect(grounded.length).toBeLessThan(all.length * 0.5);
  });
});

describe('a deadline that contradicts its source is now visible', () => {
  const conflicts = () => allDecisions()
    .map(({ pb, d }) => ({ pb, id: d.id, c: timingConflict(d) }))
    .filter((x) => x.c);

  test('THE CORRECTION: there are no late conflicts, because none was real', () => {
    // This assertion used to list three decisions. Every one was an over-match,
    // found by reading them rather than counting them — see the header. A future
    // pass that authors a genuine booking decision with a too-late date SHOULD
    // fail here, which is the point of keeping the assertion rather than
    // deleting the file.
    const late = conflicts().filter((x) => x.c.direction === 'late')
      .map((x) => `${x.pb}/${x.id}`).sort();
    expect(late).toEqual([]);
  });

  test('(premise) THE DETECTOR STILL WORKS — it is empty, not broken', () => {
    // An empty list is exactly what a silently-disabled detector produces, so
    // the detector is exercised directly on a decision that IS a booking and IS
    // too late. Without this, deleting the whole mechanism would pass the test
    // above.
    const realBooking = { id: 'venue', label: 'Book the venue and sign the contract', when: 'T-3d' };
    const c = timingConflict(realBooking);
    expect(c).toBeTruthy();
    expect(c.direction).toBe('late');
    expect(c.sourceWindowDays[0]).toBeGreaterThan(3);
  });

  test('the four venue decisions vetoed are SETTING choices, named', () => {
    // Pinned so the veto cannot quietly widen. Each offers somewhere the host
    // already has, and none of their labels claims to be a booking.
    const vetoed = allDecisions()
      .filter(({ d }) => !detectTimingCategory(d) && detectTimingCategory({ ...d, options: [] }))
      .map(({ pb, d }) => `${pb}/${d.id}`).sort();
    expect(vetoed).toEqual([
      'Day Party/venue',
      'Holiday Party/venue',
      'Retirement Party/venue',
      'Vow Renewal/venue',
    ]);
  });

  test('…and the one venue decision that DECLARES a booking is untouched', () => {
    // Wedding's "Venue + date (book FIRST)" at T-365d offers "Private estate /
    // backyard" and was caught by the first version of the structural veto.
    // Un-grounding the clearest venue booking in the corpus to fix three that
    // are not bookings would have been a worse trade than the bug.
    const wed = allDecisions().find(({ pb, d }) => pb === 'Wedding' && d.id === 'venue');
    expect(wed).toBeTruthy();
    expect(detectTimingCategory(wed.d).category).toBe('venue');
    expect(isGroundedTiming(effectiveTimingProvenance(wed.d))).toBe(true);
  });

  test('each late one names our number, the window, and the source', () => {
    for (const { c } of conflicts().filter((x) => x.c.direction === 'late')) {
      expect(c.ourLeadDays).toBeLessThan(c.sourceWindowDays[0]);
      expect(c.sources.length).toBeGreaterThan(0);
      expect(String(c.claim).length).toBeGreaterThan(20);
    }
  });

  test('an EARLY deadline is recorded but is not a harm', () => {
    // Asking for a headcount sooner than a caterer needs it costs nobody
    // anything. Separating the two directions is the point of the field.
    const early = conflicts().filter((x) => x.c.direction === 'early')
      .map((x) => `${x.pb}/${x.id}`).sort();
    expect(early).toEqual(['Vow Renewal/guestlist', 'Wedding/guestcount']);
  });
});

describe('the two nulls stay distinguishable', () => {
  test('no category matched — no conflict, and no claim of one', () => {
    // The honest majority. "What sides to serve" must never acquire a conflict.
    const unmatched = allDecisions().filter(({ d }) => !detectTimingCategory(d));
    expect(unmatched.length).toBeGreaterThan(100);
    for (const { d } of unmatched.slice(0, 40)) expect(timingConflict(d)).toBe(null);
  });

  test('inside the window — grounded, and no conflict', () => {
    const grounded = allDecisions().filter(({ d }) => isGroundedTiming(effectiveTimingProvenance(d)));
    for (const { d } of grounded) expect(timingConflict(d)).toBe(null);
  });

  test('an unparseable deadline claims nothing either way', () => {
    // Fails closed, same as the resolver. A missing `when` is not a contradiction.
    expect(timingConflict({ id: 'venue', label: 'Book the venue', when: null })).toBe(null);
    expect(timingConflict({ id: 'venue', label: 'Book the venue', when: 'soon' })).toBe(null);
    expect(timingConflict(null)).toBe(null);
    expect(timingConflict({})).toBe(null);
  });

  test('NEGATIVE CONTROL: the detector genuinely fires and genuinely rejects', () => {
    // A conflict function built on a dead detector would report zero forever.
    const inWindow = { id: 'venue', label: 'Book the venue', when: 'T-120d' };
    const tooLate = { id: 'venue', label: 'Book the venue', when: 'T-10d' };
    expect(detectTimingCategory(inWindow)).toBeTruthy();
    expect(timingConflict(inWindow)).toBe(null);
    expect(timingConflict(tooLate).direction).toBe('late');
    expect(timingConflict(tooLate).ourLeadDays).toBe(10);
  });
});

describe('nothing was silently moved', () => {
  test('THE DATES NEVER MOVED — in either direction, and that is the point', () => {
    // This file's original promise was to add a FACT about these deadlines, not
    // a change to them. The fix on 2026-09-23 changed the MATCHING, not a single
    // authored date, so every one still ships exactly the value it always had.
    // If a future pass "resolves" a conflict by editing a date, it fails here.
    const want = {
      'Retirement Party/venue': 'T-35d',
      'Day Party/venue': 'T-28d',
      'Surprise Proposal/photographer_hidden': 'T-30d',
      'Holiday Party/venue': 'T-75d',
      'Wedding/venue': 'T-365d',
    };
    const got = {};
    for (const { pb, d } of allDecisions()) {
      const k = `${pb}/${d.id}`;
      if (k in want) got[k] = d.when;
    }
    expect(got).toEqual(want);
  });

  test('Holiday Party moved, and moved far enough to stop conflicting', () => {
    // A move that left the row still short would be the worst outcome: the
    // number changed, the contradiction survived, and the pin above no longer
    // watches it.
    const { d } = allDecisions().find((x) => x.pb === 'Holiday Party' && x.d.id === 'venue');
    expect(d.when).toBe('T-75d');
    expect(timingConflict(d)).toBe(null);
    // …and it is still the playbook's own words that justify it.
    expect(String(d.why)).toMatch(/months ahead/i);
  });
});
