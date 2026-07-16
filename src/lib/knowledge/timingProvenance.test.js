// Wave-2c-2: per-decision `when` deadlines are grounded by a centralized resolver that
// maps a decision's category to a REAL dated source — no false positives.
import {
  TIMING_SOURCES, resolveTimingProvenance, isGroundedTiming,
  detectTimingCategory, effectiveTimingProvenance,
} from './timingProvenance';
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
