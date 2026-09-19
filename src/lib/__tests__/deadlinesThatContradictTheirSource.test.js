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
// MEASURED across all 45 playbooks / 260 decisions: 31 decisions match a timing
// category, 27 ground, SIX are case 2 — and four of those tell the host to act
// LATER than the source supports. A Holiday Party venue at T-35d against a
// 2-3 month party-space lead is the sharpest: December venues are the most
// contested booking of the year, and five weeks is where a host finds that out.
//
// NO AUTHORED DEADLINE WAS CHANGED. Every source in this registry is a
// commercial practitioner, and "a wedding blog says 2-3 months" is not grounds
// to move a Day Party's backyard deadline — the source's "weekend party space"
// may not be the same thing. Moving a host-facing date on that evidence is the
// over-application the registry's own header exists to prevent. What was missing
// is that the disagreement was invisible.
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

  test('THE FINDING: three decisions tell the host to act too LATE', () => {
    // WAS FOUR. Holiday Party's venue left this list on 2026-09-19 — and it left
    // for the one reason this file's closing guard allows. Its own `why` reads
    // "the good rooms book out months ahead in December" and its own
    // `priorityBasis.rationale` says "December rooms book out well ahead", while
    // the row shipped T-35d: the playbook contradicted ITSELF, in two authored
    // fields, and the source merely agreed. It moved to T-75d on its own prose.
    //
    // The three below are untouched and stay untouched: each disagrees ONLY with
    // a commercially-interested third party, and timingProvenance.js:314 records
    // the house answer — such a source does not move a host-facing date by
    // itself. Two of them are probably over-matched categories anyway (a
    // backyard is not the "weekend party space" the source prices; a 20-minute
    // proposal shoot is not wedding photography), which is a different fix.
    const late = conflicts().filter((x) => x.c.direction === 'late')
      .map((x) => `${x.pb}/${x.id}`).sort();
    expect(late).toEqual([
      'Day Party/venue',
      'Retirement Party/venue',
      'Surprise Proposal/photographer_hidden',
    ]);
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
  test('the three remaining late deadlines still ship their authored values', () => {
    // The original commit added a FACT about the deadlines, not a change to
    // them: "If a future pass decides to move them, it should fail here first
    // and say so." It did, on 2026-09-19, and this is the saying-so — Holiday
    // Party moved to 75 days on its OWN prose and is asserted separately below,
    // because a row that no longer conflicts has no conflict to read a lead from.
    const want = {
      'Retirement Party/venue': 35,
      'Day Party/venue': 28,
      'Surprise Proposal/photographer_hidden': 30,
    };
    const got = {};
    for (const { pb, d } of allDecisions()) {
      const k = `${pb}/${d.id}`;
      if (k in want) got[k] = timingConflict(d).ourLeadDays;
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
