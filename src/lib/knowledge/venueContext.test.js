// Wave-2l: a structured, GROUNDED venue-constraint axis (capacity/fit + power) — distinct
// from accessibility's ADA slice — grounded to real standards (Social Tables capacity, United
// Rentals power).
import { ALL_PLAYBOOKS } from '../playbooks';
import {
  VENUE_SOURCES, resolveVenue, isGroundedVenue, detectVenueCategory,
  effectiveVenue, venueSourcesFor,
} from './venueContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('venue-constraint axis', () => {
  test('grounds capacity/fit on the venue decisions across the playbook set', () => {
    const grounded = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!detectVenueCategory(d)) continue;
        const ctx = effectiveVenue(d);
        expect(isGroundedVenue(ctx)).toBe(true);
        expect(venueSourcesFor(ctx).length).toBeGreaterThan(0);
        grounded.push(`${pb.type}:${d.id}`);
      }
    }
    expect(grounded.length).toBeGreaterThanOrEqual(10); // the 5→6 lever: distinct venue axis off 0
  });

  test('a venue decision grounds to capacity/space; the axis is distinct from accessibility', () => {
    const v = resolveVenue({ id: 'venue', label: 'Book the venue' });
    expect(v.category).toBe('capacity');
    expect(v.sources).toContain('socialtables-capacity');
    expect(v.factor).toMatch(/capacity/i);
  });

  test('no false positives — cooking-placement and food-choice decisions are NOT venue-constraint', () => {
    const cases = [
      { id: 'roast_location', label: 'Roast indoors or outdoors (smoke)?' },
      { id: 'cooklocation', label: 'Where the fryer sits' },
      { id: 'where_buy', label: 'Where to buy the crabs?' },
      { id: 'sides', label: 'The sides' },
    ];
    for (const d of cases) expect(detectVenueCategory(d)).toBeNull();
  });

  test('isGroundedVenue rejects hollow / wrong-tier / unsourced context', () => {
    expect(isGroundedVenue(null)).toBe(false);
    expect(isGroundedVenue({ factor: 'x', guideline: 'y' })).toBe(false);
    expect(isGroundedVenue({ factor: 'x', guideline: 'y', tier: 'planning-standard', sources: [] })).toBe(false);
    expect(isGroundedVenue({ factor: 'x', guideline: 'y', tier: 'planning-standard', sources: ['nope'] })).toBe(false);
    expect(isGroundedVenue({ factor: 'x', guideline: 'y', tier: 'made-up', sources: ['socialtables-capacity'] })).toBe(false);
  });

  test('every VENUE_SOURCES entry is a real, dated, attributed standard', () => {
    for (const [, s] of Object.entries(VENUE_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(3);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('gap-detector: venue decisions grounded (0 venue gaps); board surfaces venueGrounded', () => {
    let gaps = 0;
    for (const pb of ALL_PLAYBOOKS) gaps += detectGapsInPlaybook(pb).filter((g) => String(g.type).includes('venue-ungrounded')).length;
    expect(gaps).toBe(0);
    const b = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-09-01', guests: [], guestEstimate: 40 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.venueGrounded === true)).toBe(true);
  });
});
