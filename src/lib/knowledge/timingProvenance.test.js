// Wave-2c-2: per-decision `when` deadlines are grounded by a centralized resolver that
// maps a decision's category to a REAL dated source — no false positives.
import {
  TIMING_SOURCES, resolveTimingProvenance, isGroundedTiming,
  detectTimingCategory, effectiveTimingProvenance, timingConflict, timingDisagreementNote,
} from './timingProvenance';
import { playbookDecisionBoard } from '../playbooks';
import { detectGapsInPlaybook } from './playbookSchema';
import { ALL_PLAYBOOKS } from '../playbooks';

describe('timing category resolver', () => {
  test('grounds the clear cross-event logistics categories', () => {
    const cases = [
      [{ id: 'venue', label: 'Book the venue', when: 'T-90d' }, 'venue'],
      [{ id: 'invite', label: 'Send the invitations', when: 'T-21d' }, 'invitation'],
      [{ id: 'headcount', label: 'Lock the final headcount', when: 'T-7d' }, 'headcount_rsvp'],
      [{ id: 'rentals', label: 'Reserve tables and chairs', when: 'T-60d' }, 'rentals'],
      [{ id: 'cake', label: 'Order the cake', when: 'T-14d' }, 'cake'],
      [{ id: 'dietary', label: 'Collect dietary restrictions from RSVPs', when: 'T-14d' }, 'dietary_collection'],
      [{ id: 'menu', label: 'Lock the menu', when: 'T-21d' }, 'menu_finalize'],
    ];
    for (const [d, cat] of cases) {
      expect(detectTimingCategory(d)?.category).toBe(cat);
      const prov = resolveTimingProvenance(d);
      expect(isGroundedTiming(prov)).toBe(true);
      expect(prov.sources.every((s) => !!TIMING_SOURCES[s])).toBe(true);
    }
  });

  test('does NOT falsely ground event-specific choice decisions (no false positives)', () => {
    const notGrounded = [
      { id: 'where_buy', label: 'Where to buy the crabs?', when: 'T-10d' }, // "where...buy" ≠ venue
      { id: 'steam_vs_order', label: 'Steam them yourself or order steamed?', when: 'T-7d' },
      { id: 'crab_size', label: 'Crab size', when: 'T-7d' },
      { id: 'theme', label: 'Pick a theme / vibe', when: 'T-21d' },
      { id: 'tribute', label: 'Speeches / tribute format', when: 'T-31d' },
      { id: 'sides', label: 'The sides', when: 'T-5d' },
      // the new dietary/menu categories must NOT swallow food-STYLE choice calls
      { id: 'food_style', label: 'How is the food handled?', when: 'T-21d' },
      { id: 'food_style2', label: 'Food style — who handles it?', when: 'T-14d' },
      { id: 'potluck', label: 'Host-provided or potluck sides?', when: 'T-10d' },
    ];
    for (const d of notGrounded) {
      expect(isGroundedTiming(resolveTimingProvenance(d))).toBe(false);
    }
  });

  test('lead-window veto: a short-deadline setting call does NOT cite a months-out booking source', () => {
    // Wave-2c-2.1 — the re-score's false positives. A decision whose id contains "venue"
    // but is really an indoor/outdoor SETTING call at T-18/T-35 must NOT ground to the
    // 2–18-month venue-BOOKING source (deadline contradicts the source's lead range).
    const falsePositives = [
      { id: 'venue-setting', label: 'Indoor or outdoor', when: 'T-18d' },
      { id: 'venue', label: 'At home or a venue?', when: 'T-35d' },
      { id: 'registry', label: 'Confirm registry / gift theme to share on the invite', when: 'T-21d' },
    ];
    for (const d of falsePositives) {
      expect(isGroundedTiming(resolveTimingProvenance(d))).toBe(false);
    }
    // …but the SAME category grounds when the deadline is consistent with the source.
    expect(isGroundedTiming(resolveTimingProvenance({ id: 'venue', label: 'Venue + date (book FIRST)', when: 'T-365d' }))).toBe(true);
    // wave-2u: "Lock the menu" at T-28d IS a true positive now (menu-finalize, 2–4 weeks) — not a false one.
    expect(isGroundedTiming(resolveTimingProvenance({ id: 'menu', label: 'Lock the menu (or catering order)', when: 'T-28d' }))).toBe(true);
    // but a food-STYLE choice at the same deadline stays honestly ungrounded
    expect(isGroundedTiming(resolveTimingProvenance({ id: 'food_style', label: 'How is the food handled?', when: 'T-28d' }))).toBe(false);
    expect(isGroundedTiming(resolveTimingProvenance({ id: 'venue', label: 'Book the venue', when: 'T-90d' }))).toBe(true);
  });

  test('isGroundedTiming rejects hollow provenance', () => {
    expect(isGroundedTiming(null)).toBe(false);
    expect(isGroundedTiming({})).toBe(false);
    expect(isGroundedTiming({ tier: 'researched', sources: [] })).toBe(false);
    expect(isGroundedTiming({ tier: 'researched', sources: ['not-a-real-source'] })).toBe(false);
    expect(isGroundedTiming({ tier: 'synthesized', sources: ['theknot-vendors'] })).toBe(false);
  });

  test('every TIMING_SOURCES entry is a real dated source', () => {
    for (const [id, s] of Object.entries(TIMING_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.claim).length).toBeGreaterThan(20);
    }
  });

  test('grounds a meaningful, honest fraction across all 39 playbooks (not 0, not overclaimed)', () => {
    let total = 0, grounded = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        total++;
        if (isGroundedTiming(effectiveTimingProvenance(d))) grounded++;
      }
    }
    // Was 0/215 before this axis. Wave-2k broadened the resolver (invitation fix, headcount/
    // guestlist, photography, attire) to ~18 cross-event LOGISTICS decisions, every one
    // deadline-consistent with its source. It deliberately stays there: the other ~197 are
    // event-specific CHOICE decisions (what to serve/theme) with no citable external lead
    // standard, so they remain honestly synthesized. Correctness + honest ceiling over count.
    expect(grounded).toBeGreaterThanOrEqual(22); // wave-2u added dietary-collection + menu-finalize actions
    expect(grounded).toBeLessThan(32); // still conservative — no over-reach into choice decisions
  });
});

describe('gap-detector recognizes resolved timing (grounded decisions stop being flagged)', () => {
  test('a venue/invite decision no longer raises a timing-provenance gap', () => {
    const pb = {
      type: 'Test', label: 'T',
      decisions: [
        { id: 'venue', label: 'Book the venue', when: 'T-90d', options: ['a'], default: 'a' },
        { id: 'crab_size', label: 'Crab size', when: 'T-7d', options: ['a'], default: 'a' },
      ],
    };
    const gaps = detectGapsInPlaybook(pb);
    const timingGaps = gaps.filter((g) => String(g.type).includes('timing')).map((g) => g.id);
    // venue is grounded by the resolver → no timing gap; crab_size is event-specific → still flagged.
    expect(timingGaps).not.toContain('venue');
    expect(timingGaps).toContain('crab_size');
  });
});

// ─── THE DETECTOR THAT COULD NOT FIRE ───────────────────────────────────────
//
// `timingConflict` was written 2026-09-18 to stop a contradiction being filed
// as an absence. It had no consumer for five days, and not because nobody got
// to it: it reads `decision.when`, and `playbookDecisionBoard` DROPS that field
// when it builds a row — the row carries the derived `dueDate` and `daysOut`
// instead. So every downstream call returned null and read as "no conflict".
//
// A correct detector pointed at a population that had already lost the field it
// needs. The same defect class as the rest of this programme, one layer earlier
// than usual, and exactly the shape a unit test of the detector alone cannot
// see — which is why the first test below goes through the BOARD.
describe('a timing disagreement reaches the row a host actually reads', () => {
  const board = (type, date) => {
    const b = playbookDecisionBoard({
      id: 'x', type, date, guestMode: 'count', guestCount: 40,
      guests: [], budget: [], vendors: [],
    }, '2026-09-23');
    return [...(b.open || []), ...(b.deferred || []), ...(b.locked || [])];
  };
  const disagreeing = (type, date) => board(type, date).filter((r) => r.timingDisagreement);

  test('(premise) the board really does drop `when` — this is why it never fired', () => {
    // If this ever goes false the bug fixed itself and the carry below is
    // redundant. Asserted rather than assumed, because the whole fix rests on it.
    const rows = board('Day Party', '2026-11-14');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.when === undefined)).toBe(true);
    expect(rows.some((r) => typeof r.daysOut === 'number')).toBe(true);
  });

  test('THE THREE LATE CONFLICTS IN THE CORPUS REACH A ROW', () => {
    // Measured 2026-09-23. The 2026-09-18 audit recorded FOUR; Holiday Party's
    // venue has since been authored to T-75d, inside the source's window, so it
    // is correctly no longer a conflict. Three remain, and each is a decision
    // whose deadline tells a host to start later than a real dated source says.
    const cases = [
      ['Day Party', '2026-11-14', 'venue', 28],
      ['Retirement Party', '2026-11-14', 'venue', 35],
      ['Surprise Proposal', '2026-11-14', 'photographer_hidden', 30],
    ];
    for (const [type, date, id, ourLead] of cases) {
      const hit = disagreeing(type, date).find((r) => r.id === id);
      expect(hit).toBeTruthy();
      expect(hit.timingDisagreement.direction).toBe('late');
      expect(hit.timingDisagreement.ourLeadDays).toBe(ourLead);
      expect(hit.timingDisagreement.sourceWindowDays[0]).toBeGreaterThan(ourLead);
    }
  });

  test('HOLIDAY PARTY IS NOT ONE — the authored deadline moved inside the window', () => {
    // The audit's fourth case, re-measured rather than carried forward. A stale
    // finding asserted as current is its own kind of invented data.
    expect(disagreeing('Holiday Party', '2026-12-12')).toEqual([]);
  });

  test('AN EARLY DEADLINE IS NEVER CARRIED — it is not a harm', () => {
    // The detector records both directions for completeness. Putting "you are
    // asking sooner than required" in front of a host is noise wearing the
    // clothes of a warning.
    const early = { id: 'guestcount', label: 'Lock the headcount', when: 'T-365d' };
    expect(timingConflict(early)).toBeTruthy();
    expect(timingConflict(early).direction).toBe('early');
    const rows = board('Wedding', '2027-09-23');
    for (const r of rows) {
      if (r.timingDisagreement) expect(r.timingDisagreement.direction).toBe('late');
    }
  });
});

describe('the sentence, written once', () => {
  test('it says what we put and what the guidance says — and never that we are wrong', () => {
    const note = timingDisagreementNote({
      direction: 'late', ourLeadDays: 28, sourceWindowDays: [60, 600],
    });
    expect(note).toBe('We put this 4 weeks before the date. The booking guidance behind it says 2 months at least — if this one matters to you, start it sooner.');
    // No verdict on the authored date. Every timing source here is a commercial
    // practitioner, and overruling an authored deadline on that evidence is the
    // over-application this module's header was written to prevent.
    expect(note).not.toMatch(/wrong|too late|mistake|should be/i);
  });

  test('days, weeks and months as a planner says them', () => {
    const n = (ours, lo) => timingDisagreementNote({ direction: 'late', ourLeadDays: ours, sourceWindowDays: [lo, 600] });
    expect(n(9, 30)).toMatch(/^We put this 9 days before the date\. .*says 4 weeks at least/);
    expect(n(30, 60)).toMatch(/^We put this 4 weeks before the date\. .*says 2 months at least/);
    expect(n(35, 365)).toMatch(/says 12 months at least/);
  });

  test('IT REFUSES ANYTHING IT CANNOT SAY TRUTHFULLY', () => {
    expect(timingDisagreementNote(null)).toBe(null);
    expect(timingDisagreementNote({ direction: 'early', ourLeadDays: 365, sourceWindowDays: [60, 300] })).toBe(null);
    // A "floor" that is not actually later than our deadline would make the
    // sentence contradict itself.
    expect(timingDisagreementNote({ direction: 'late', ourLeadDays: 90, sourceWindowDays: [60, 600] })).toBe(null);
    expect(timingDisagreementNote({ direction: 'late', ourLeadDays: 0, sourceWindowDays: [60, 600] })).toBe(null);
    expect(timingDisagreementNote({ direction: 'late', ourLeadDays: 28, sourceWindowDays: null })).toBe(null);
  });
});
