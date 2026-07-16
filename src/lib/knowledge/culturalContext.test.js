// Wave-2g: a structured, GROUNDED cultural/religious axis on the decisions where faith or
// tradition steers the choice — real cited sources (Smithsonian NMAAHC, Britannica, PBS,
// Dignity Memorial, culinary historian Adrian Miller), no invented cultural facts.
import { ALL_PLAYBOOKS } from '../playbooks';
import { isGroundedCulture, CULTURAL_SOURCES, culturalSourcesFor } from './culturalContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('cultural axis', () => {
  test('grounds a meaningful set of tradition-steered decisions, every one sourced', () => {
    const authored = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!d.culturalContext) continue;
        authored.push(`${pb.type}:${d.id}`);
        // grounded, and every cited source resolves in the registry
        expect(isGroundedCulture(d.culturalContext)).toBe(true);
        expect(culturalSourcesFor(d.culturalContext).length).toBeGreaterThan(0);
        for (const s of d.culturalContext.sources) expect(CULTURAL_SOURCES[s]).toBeTruthy();
      }
    }
    // the Coverage lever: "even 10-15/215 with provenance moves the weakest sub-dim off 0"
    expect(authored.length).toBeGreaterThanOrEqual(10);
  });

  test('isGroundedCulture rejects hollow / unsourced / wrong-tier cultural context', () => {
    expect(isGroundedCulture(null)).toBe(false);
    expect(isGroundedCulture({})).toBe(false);
    expect(isGroundedCulture({ tradition: 'x', constraint: 'y' })).toBe(false); // no tier/sources
    expect(isGroundedCulture({ tradition: 'x', constraint: 'y', tier: 'established-consensus', sources: [] })).toBe(false);
    expect(isGroundedCulture({ tradition: 'x', constraint: 'y', tier: 'established-consensus', sources: ['bogus'] })).toBe(false);
    expect(isGroundedCulture({ tradition: 'x', constraint: 'y', tier: 'synthesized', sources: ['nmaahc-kwanzaa'] })).toBe(false);
  });

  test('every CULTURAL_SOURCES entry is a real, dated, attributed source', () => {
    for (const [, s] of Object.entries(CULTURAL_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(2);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('the gap-detector flags an authored-but-ungrounded culturalContext, not a grounded one', () => {
    const gaps = detectGapsInPlaybook({ type: 'T', decisions: [
      { id: 'bad', culturalContext: { tradition: 'x' }, options: ['a'], default: 'a' },
      { id: 'good', culturalContext: { tradition: 'T', constraint: 'C', tier: 'established-consensus', sources: ['nmaahc-kwanzaa'] }, options: ['a'], default: 'a' },
      { id: 'none', options: ['a'], default: 'a' }, // no cultural axis → never flagged
    ] });
    const cult = gaps.filter((g) => String(g.type).includes('cultural')).map((g) => g.id);
    expect(cult).toContain('bad');
    expect(cult).not.toContain('good');
    expect(cult).not.toContain('none');
  });

  test('the board surfaces culturalContext + culturalGrounded (reaches runtime)', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Kwanzaa Gathering', date: '2026-12-20', guests: [], guestEstimate: 20 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    const grounded = rows.filter((r) => r.culturalGrounded);
    expect(grounded.length).toBeGreaterThan(0);
    for (const r of grounded) expect(isGroundedCulture(r.culturalContext)).toBe(true);
  });
});
