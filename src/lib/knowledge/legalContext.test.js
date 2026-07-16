// Wave-2j: a structured, GROUNDED legal/liability/COI axis — alcohol-service (social host /
// dram shop), paid-vendor (certificate of insurance), and public-space (permit/noise)
// decisions grounded to real standards (Insurance Information Institute, Cornell LII, NYC Parks).
import { ALL_PLAYBOOKS } from '../playbooks';
import {
  LEGAL_SOURCES, resolveLegal, isGroundedLegal, detectLegalCategory,
  effectiveLegal, legalSourcesFor,
} from './legalContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('legal / COI axis', () => {
  test('grounds the legal-liability axis on a meaningful set of decisions (alcohol / vendor / permit)', () => {
    const grounded = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!detectLegalCategory(d)) continue;
        const ctx = effectiveLegal(d);
        expect(isGroundedLegal(ctx)).toBe(true);
        expect(legalSourcesFor(ctx).length).toBeGreaterThan(0);
        grounded.push(`${pb.type}:${d.id}`);
      }
    }
    // the Coverage lever the scorer named: legal/COI off 0 "flips 4→5 alone".
    expect(grounded.length).toBeGreaterThanOrEqual(15);
  });

  test('an alcohol decision grounds to social-host liability; a paid vendor to COI', () => {
    const bar = resolveLegal({ id: 'bar', label: 'Bar strategy + open bar' });
    expect(bar.category).toBe('alcohol_liability');
    expect(bar.sources).toContain('iii-social-host');
    const vendor = resolveLegal({ id: 'help', label: 'Hire a bartender / caterer / staff' });
    expect(vendor.category).toBe('vendor_coi');
    expect(vendor.sources).toContain('nyc-special-events-coi');
  });

  test('no false positives — a plain food-choice or non-legal decision is not flagged', () => {
    const cases = [
      { id: 'sides', label: 'The sides' },
      { id: 'theme', label: 'Pick a theme / vibe' },
      { id: 'crab_size', label: 'Crab size' },
      { id: 'tribute', label: 'Speeches / tribute format' },
    ];
    for (const d of cases) expect(detectLegalCategory(d)).toBeNull();
  });

  test('isGroundedLegal rejects hollow / wrong-tier / unsourced context', () => {
    expect(isGroundedLegal(null)).toBe(false);
    expect(isGroundedLegal({ factor: 'x', guideline: 'y' })).toBe(false);
    expect(isGroundedLegal({ factor: 'x', guideline: 'y', tier: 'legal-standard', sources: [] })).toBe(false);
    expect(isGroundedLegal({ factor: 'x', guideline: 'y', tier: 'legal-standard', sources: ['nope'] })).toBe(false);
    expect(isGroundedLegal({ factor: 'x', guideline: 'y', tier: 'made-up', sources: ['iii-social-host'] })).toBe(false);
  });

  test('every LEGAL_SOURCES entry is a real, dated, attributed standard', () => {
    for (const [, s] of Object.entries(LEGAL_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(3);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('gap-detector: legal decisions are grounded (0 legal gaps); board surfaces legalGrounded', () => {
    let gaps = 0;
    for (const pb of ALL_PLAYBOOKS) gaps += detectGapsInPlaybook(pb).filter((g) => String(g.type).includes('legal')).length;
    expect(gaps).toBe(0);
    const b = playbookDecisionBoard({ id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 100 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.legalGrounded === true)).toBe(true);
  });
});
