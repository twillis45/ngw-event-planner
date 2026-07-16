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
      { id: 'menu', label: 'Lock the menu (or catering order) + cake', when: 'T-28d' },
    ];
    for (const d of falsePositives) {
      expect(isGroundedTiming(resolveTimingProvenance(d))).toBe(false);
    }
    // …but the SAME category grounds when the deadline is consistent with the source.
    expect(isGroundedTiming(resolveTimingProvenance({ id: 'venue', label: 'Venue + date (book FIRST)', when: 'T-365d' }))).toBe(true);
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
    // Was 0/215 before this wave. After the 2c-2.1 false-positive fix the resolver grounds
    // ~10 cross-event logistics decisions, every one deadline-consistent with its source;
    // event-specific choices stay honestly synthesized. Correctness over count.
    expect(grounded).toBeGreaterThanOrEqual(8);
    expect(grounded).toBeLessThan(15); // honest: does NOT overclaim (the inflated count was 22)
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
