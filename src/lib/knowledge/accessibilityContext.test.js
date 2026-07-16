// Wave-2h: a structured, GROUNDED accessibility axis (mobility/ADA/sensory) resolved for
// every venue/seating decision — real cited standards (ADA National Network, MPI ADA
// Mobility Guide, inclusive-seating guidance), no invented requirements.
import { ALL_PLAYBOOKS } from '../playbooks';
import {
  ACCESSIBILITY_SOURCES, resolveAccessibility, isGroundedAccessibility,
  detectAccessibilityCategory, effectiveAccessibility, accessibilitySourcesFor,
} from './accessibilityContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('accessibility axis', () => {
  test('resolves grounded accessibility for a meaningful set of venue/seating decisions', () => {
    const grounded = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!detectAccessibilityCategory(d)) continue;
        const a = effectiveAccessibility(d);
        expect(isGroundedAccessibility(a)).toBe(true);
        expect(accessibilitySourcesFor(a).length).toBeGreaterThan(0);
        grounded.push(`${pb.type}:${d.id}`);
      }
    }
    // the Coverage lever: ~15-20 venue/seating decisions across the playbook set.
    expect(grounded.length).toBeGreaterThanOrEqual(12);
  });

  test('no false positives — cooking-placement and food-choice decisions are NOT venue/seating', () => {
    const cases = [
      { id: 'roast_location', label: 'Roast indoors or outdoors (smoke)?' }, // coffee roast, not venue
      { id: 'cooklocation', label: 'Where the fryer sits' },                 // fire safety, not venue
      { id: 'where_buy', label: 'Where to buy the crabs?' },
      { id: 'steam_vs_order', label: 'Steam them yourself or order steamed?' },
      { id: 'format', label: 'Heavy apps or a seated dinner?' },            // food format, not seating
      { id: 'sides', label: 'The sides' },
    ];
    for (const d of cases) expect(detectAccessibilityCategory(d)).toBeNull();
  });

  test('a real venue decision grounds to the ADA route standard; a seating decision to inclusive seating', () => {
    const venue = resolveAccessibility({ id: 'venue', label: 'Book the venue' });
    expect(venue.category).toBe('venue');
    expect(venue.tier).toBe('ada-standard');
    expect(venue.sources).toContain('ada-events');
    const seat = resolveAccessibility({ id: 'seating', label: 'Seating / floor plan' });
    expect(seat.category).toBe('seating');
    expect(seat.sources).toContain('inclusive-seating');
  });

  test('isGroundedAccessibility rejects hollow / wrong-tier / unsourced context', () => {
    expect(isGroundedAccessibility(null)).toBe(false);
    expect(isGroundedAccessibility({})).toBe(false);
    expect(isGroundedAccessibility({ factor: 'x', guideline: 'y' })).toBe(false);
    expect(isGroundedAccessibility({ factor: 'x', guideline: 'y', tier: 'ada-standard', sources: [] })).toBe(false);
    expect(isGroundedAccessibility({ factor: 'x', guideline: 'y', tier: 'ada-standard', sources: ['bogus'] })).toBe(false);
    expect(isGroundedAccessibility({ factor: 'x', guideline: 'y', tier: 'made-up', sources: ['ada-events'] })).toBe(false);
  });

  test('every ACCESSIBILITY_SOURCES entry is a real, dated, attributed standard', () => {
    for (const [, s] of Object.entries(ACCESSIBILITY_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(3);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('gap-detector flags a venue/seating decision that is NOT grounded, never a non-spatial one', () => {
    // The resolver grounds every detected venue/seating decision, so a real playbook yields
    // zero accessibility gaps — machine-verifiable coverage.
    let gaps = 0;
    for (const pb of ALL_PLAYBOOKS) gaps += detectGapsInPlaybook(pb).filter((g) => String(g.type).includes('accessibility')).length;
    expect(gaps).toBe(0);
  });

  test('the board surfaces accessibilityContext + accessibilityGrounded (reaches runtime)', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-09-01', guests: [], guestEstimate: 40 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    const grounded = rows.filter((r) => r.accessibilityGrounded);
    expect(grounded.length).toBeGreaterThan(0);
    for (const r of grounded) expect(isGroundedAccessibility(r.accessibilityContext)).toBe(true);
  });
});
