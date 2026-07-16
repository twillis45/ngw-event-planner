// Wave-2c: the standard-lead fallback (the app's only timing fallback) is now grounded
// against real, dated 2026 sources — no longer "a bare table of round numbers."
import {
  STANDARD_LEAD_DAYS, STANDARD_LEAD_PROVENANCE, STANDARD_LEAD_SOURCES,
  isGroundedLead, getStandardLeadProvenance,
} from '../workflowCompression';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('Wave-2c standard-lead grounding', () => {
  test('Crab Feast — the flagged missing entry — now exists', () => {
    expect(STANDARD_LEAD_DAYS['Crab Feast']).toBe(42);
  });

  test('isGroundedLead is honest: researched+sourced pass, synthesized/unknown fail', () => {
    expect(isGroundedLead('Wedding')).toBe(true);       // theknot-vendors
    expect(isGroundedLead('Crab Feast')).toBe(true);    // partyguides-2026
    expect(isGroundedLead('Retirement Party')).toBe(true);
    expect(isGroundedLead('Corporate')).toBe(false);    // synthesized, no source
    expect(isGroundedLead('Networking Event')).toBe(false); // no provenance entry → default synthesized
  });

  test('every researched provenance cites a REAL, dated source that resolves in the source map', () => {
    for (const [type, p] of Object.entries(STANDARD_LEAD_PROVENANCE)) {
      if (type === '_default') continue;
      expect(['researched', 'synthesized']).toContain(p.tier);
      if (p.tier === 'researched') {
        expect(p.sources.length).toBeGreaterThan(0);
        for (const sid of p.sources) {
          const src = STANDARD_LEAD_SOURCES[sid];
          expect(src).toBeTruthy();
          expect(src.url).toMatch(/^https?:\/\//);
          expect(src.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(String(src.claim).length).toBeGreaterThan(20);
        }
      }
    }
  });

  test('the decision board surfaces the runway provenance (reaches runtime, not dead data)', () => {
    const board = playbookDecisionBoard({ id: 't', type: 'Crab Feast', date: '2026-09-01', guests: [], guestEstimate: 30 });
    expect(board.leadGrounded).toBe(true);
    expect(board.leadProvenance.tier).toBe('researched');
    expect(board.leadProvenance.sources.length).toBeGreaterThan(0);
  });

  test('getStandardLeadProvenance falls back to the synthesized default, never undefined', () => {
    expect(getStandardLeadProvenance('Some Unknown Type').tier).toBe('synthesized');
  });
});
