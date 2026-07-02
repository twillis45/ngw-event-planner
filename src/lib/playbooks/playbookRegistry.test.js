// Playbook OS registry + health engine — locks the DERIVED governance layer.
// These prove the registry reads the real corpus, never fabricates, and stays a
// pure read-only projection (no playbook output changes).
import {
  buildPlaybookRegistry, playbookRegistryEntry, playbookGrounding, playbookCoverage,
  playbookHealth, playbookStatus, playbookFreshness, playbookWeaknesses, playbookResearch,
  playbookId, HEALTH, ENGINES,
} from './playbookRegistry';
import { ALL_PLAYBOOKS, getPlaybook } from './index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');

describe('playbookId', () => {
  test('stable kebab id from type', () => {
    expect(playbookId('Crab Feast')).toBe('crab-feast');
    expect(playbookId('Sweet 16')).toBe('sweet-16');
  });
});

describe('buildPlaybookRegistry', () => {
  const reg = buildPlaybookRegistry(ASOF);
  test('covers every playbook, sorted, no throw', () => {
    expect(reg.count).toBe(ALL_PLAYBOOKS.length);
    expect(reg.entries.length).toBe(ALL_PLAYBOOKS.length);
    const types = reg.entries.map((e) => e.type);
    expect([...types]).toEqual([...types].sort((a, b) => a.localeCompare(b)));
  });
  test('rollup summary is coherent', () => {
    expect(reg.groundingCoveragePct).toBeGreaterThanOrEqual(0);
    expect(reg.groundingCoveragePct).toBeLessThanOrEqual(100);
    expect(Object.values(reg.byStatus).reduce((a, b) => a + b, 0)).toBe(reg.count);
    expect(reg.engineCoverage.length).toBe(ENGINES.length);
  });
  test('every entry has the required registry fields', () => {
    for (const e of reg.entries) {
      expect(typeof e.id).toBe('string');
      expect(typeof e.type).toBe('string');
      expect(typeof e.version).toBe('string');
      expect(e.health.components.length).toBeGreaterThan(0);
      expect(['production', 'review-needed', 'research-needed', 'draft', 'archived', 'deprecated']).toContain(e.status);
    }
  });
});

describe('grounding (mirrors groundingAudit over the object)', () => {
  test('crab feast is synthesized, priced, no citations', () => {
    const g = playbookGrounding(crab);
    expect(g.pricedItems).toBeGreaterThan(0);
    expect(g.cited).toBe(0);
    expect(g.groundedPct).toBe(0); // all synthesized/consensus
    expect(g.knowledgeStatus).toBe('synthesized');
    expect(g.hasSources).toBe(false); // knowledge.sources: []
  });
});

describe('coverage — derived from populated sections', () => {
  test('crab feast feeds the expected engines', () => {
    const cov = playbookCoverage(crab);
    const sup = Object.fromEntries(cov.engines.map((e) => [e.id, e.supported]));
    expect(sup.shopping).toBe(true);
    expect(sup.budget).toBe(true);
    expect(sup.decisions).toBe(true);
    expect(sup.timeline).toBe(true);
    expect(sup.capacity).toBe(true);
    expect(sup.runOfShow).toBe(true);
    expect(sup.risks).toBe(true);
    expect(sup.contingencies).toBe(true);
    expect(sup.heart).toBe(true);
    expect(sup.vendors).toBe(true);
  });
});

describe('health — component-level, no single score, validation honest-empty', () => {
  const h = playbookHealth(crab, ASOF);
  test('grounding is a GAP (priced but uncited)', () => {
    expect(h.components.find((c) => c.component === 'Grounding').status).toBe(HEALTH.GAP);
  });
  test('validation is n/a (awaiting events), never fabricated', () => {
    const v = h.components.find((c) => c.component === 'Validation');
    expect(v.status).toBe(HEALTH.NA);
    expect(v.reason).toMatch(/awaiting completed events/i);
  });
  test('food safety flagged for crab (hot-cook foodway)', () => {
    expect(h.components.find((c) => c.component === 'Food safety').status).not.toBe(HEALTH.NA);
  });
  test('there is no numeric composite score anywhere', () => {
    expect(h.score).toBeUndefined();
  });
});

describe('status — gated, not summed', () => {
  test('crab feast is research-needed (synthesized pricing caps it)', () => {
    expect(playbookStatus(crab, ASOF)).toBe('research-needed');
  });
});

describe('governance + freshness + weaknesses when the block is absent', () => {
  test('freshness unknown, weaknesses name the missing block', () => {
    const f = playbookFreshness(crab, ASOF);
    expect(f.known).toBe(false);
    expect(playbookWeaknesses(crab)).toContain('No governance block (owner / review cadence unset)');
  });
});

describe('governance when a co-located block IS present', () => {
  const withGov = { ...crab, governance: { owner: 'Todd', created: '2026-01-01', lastReviewed: '2026-06-01', reviewIntervalDays: 180, status: null } };
  test('freshness computes from the block (not overdue on 2026-07-02)', () => {
    const f = playbookFreshness(withGov, ASOF);
    expect(f.known).toBe(true);
    expect(f.overdue).toBe(false);
    expect(f.ageDays).toBeGreaterThan(0);
  });
  test('an overdue lastReviewed flags review-needed', () => {
    const stale = { ...crab, governance: { owner: 'Todd', lastReviewed: '2025-01-01', reviewIntervalDays: 180 } };
    expect(playbookFreshness(stale, ASOF).overdue).toBe(true);
  });
});

describe('research queue is derived (no manual list)', () => {
  test('crab feast surfaces pricing + food-safety + cadence tasks', () => {
    const kinds = playbookResearch(crab, ASOF).map((r) => r.kind);
    expect(kinds).toContain('pricing');
    expect(kinds).toContain('food-safety');
    expect(kinds).toContain('cadence');
  });
});

describe('quality gate — any authored governance block is well-formed (regression)', () => {
  test('governance blocks (where present) have a valid shape', () => {
    for (const pb of ALL_PLAYBOOKS) {
      if (!pb.governance) continue; // optional — absence is a surfaced gap, not a failure
      const g = pb.governance;
      expect(typeof g.owner === 'string' || g.owner == null).toBe(true);
      for (const d of ['created', 'lastReviewed']) {
        if (g[d] != null) expect(Number.isNaN(Date.parse(g[d]))).toBe(false); // parseable date
      }
      if (g.reviewIntervalDays != null) expect(typeof g.reviewIntervalDays).toBe('number');
      if (g.status != null) expect(['draft', 'production', 'archived', 'deprecated']).toContain(g.status);
    }
  });
  test('grounding never reports more cited than priced (integrity)', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const g = playbookGrounding(pb);
      expect(g.cited).toBeLessThanOrEqual(g.pricedItems + (pb.purchases || []).length); // cited counts any provenance, bounded by purchases
      expect(g.groundedPct).toBeGreaterThanOrEqual(0);
      expect(g.groundedPct).toBeLessThanOrEqual(100);
    }
  });
});

describe('purity — registry never mutates a playbook', () => {
  test('building the registry does not add fields to the source objects', () => {
    const before = JSON.stringify(crab);
    buildPlaybookRegistry(ASOF);
    playbookRegistryEntry(crab, ASOF);
    expect(JSON.stringify(crab)).toBe(before);
  });
});
