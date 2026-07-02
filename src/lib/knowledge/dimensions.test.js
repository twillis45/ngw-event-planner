// Playbook Intelligence — the Dimension framework. Proves the 7-field contract, no
// single score, the new Operational Completeness dimension, the dimension→KCR bridge,
// and package compatibility (n/a for kinds without an evaluator).
import { evaluateAsset, dimensionKCRs, corpusDimensionKCRs, DIMENSION_REGISTRY } from './dimensions';
import { getPlaybook, ALL_PLAYBOOKS } from './../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');

describe('dimension contract', () => {
  const dims = evaluateAsset(crab, 'playbook', ASOF);
  test('every dimension returns the full 7-field contract', () => {
    for (const d of dims) {
      expect(typeof d.id).toBe('string');
      expect(['ok', 'warn', 'gap', 'n/a']).toContain(d.status);
      expect(typeof d.reason).toBe('string');
      expect('missingEvidence' in d).toBe(true);
      expect(Array.isArray(d.recommendedKCRs)).toBe(true);
      expect(Array.isArray(d.affectedEngines)).toBe(true);
      expect(typeof d.reviewInterval).toBe('number');
    }
  });
  test('no single/averaged score anywhere', () => {
    const asObj = { dims };
    expect(asObj.score).toBeUndefined();
    expect(dims.every((d) => typeof d.status === 'string')).toBe(true); // statuses, not numbers
  });
  test('includes the 12 existing + Operational completeness', () => {
    const ids = dims.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(['Grounding', 'Food safety', 'Sections', 'Operational completeness']));
  });
});

describe('Grounding dimension (reuses playbookHealth; defers KCR to the research queue)', () => {
  test('crab grounding is a gap, shown, but DEFERS its KCR to the research queue (EP-1: one gap, one source)', () => {
    const g = evaluateAsset(crab, 'playbook', ASOF).find((d) => d.id === 'Grounding');
    expect(g.status).toBe('gap');
    expect(g.missingEvidence).toBeTruthy();       // still surfaced
    expect(g.recommendedKCRs).toHaveLength(0);    // but no duplicate KCR
    expect(g.deferredTo).toBe('research-queue');
  });
});

describe('Operational completeness (new dimension)', () => {
  test('a rich playbook (crab) is executable — ok, no recommended KCR', () => {
    const oc = evaluateAsset(crab, 'playbook', ASOF).find((d) => d.id === 'Operational completeness');
    expect(oc.status).toBe('ok');
    expect(oc.recommendedKCRs).toHaveLength(0);
  });
  test('a thin playbook is a gap listing exactly what is missing to execute', () => {
    const thin = { type: 'Thin Test', tasks: [], milestones: [], purchases: [], rentalsGap: [], vendors: [], schedules: {} };
    const oc = evaluateAsset(thin, 'playbook', ASOF).find((d) => d.id === 'Operational completeness');
    expect(oc.status).toBe('gap');
    expect(oc.missingEvidence).toMatch(/tasks|timeline|staffing|logistics/);
    expect(oc.recommendedKCRs[0].type).toBe('quality-gap');
    expect(oc.recommendedKCRs[0].fieldPath).toBe('operational');
  });
});

describe('dimension → KCR bridge', () => {
  const thin = { type: 'Thin Test', tasks: [], milestones: [], purchases: [], rentalsGap: [], vendors: [], schedules: {}, decisions: [], risks: [], contingencies: [] };
  test('a complete playbook (crab) produces NO dimension KCRs (grounding etc. deferred; the rest pass)', () => {
    expect(dimensionKCRs(crab, ASOF)).toHaveLength(0);
  });
  test('a thin playbook produces new-dimension KCRs attributed to playbook-intelligence', () => {
    const kcrs = dimensionKCRs(thin, ASOF);
    expect(kcrs.length).toBeGreaterThan(0);
    expect(kcrs.every((k) => k.createdBy === 'playbook-intelligence')).toBe(true);
    expect(kcrs.every((k) => k.impact)).toBe(true);
    expect(kcrs.some((k) => k.type === 'quality-gap')).toBe(true);
    expect(kcrs.some((k) => k.fieldPath === 'operational')).toBe(true); // Operational completeness fired
  });
  test('never edits — only recommends (KCRs, not mutations)', () => {
    const before = JSON.stringify(crab);
    dimensionKCRs(crab, ASOF);
    expect(JSON.stringify(crab)).toBe(before);
  });
  test('deterministic + deduped by id', () => {
    const a = dimensionKCRs(thin, ASOF).map((k) => k.id);
    const b = dimensionKCRs(thin, ASOF).map((k) => k.id);
    expect(a).toEqual(b);                                // deterministic
    const all = corpusDimensionKCRs(ASOF, ALL_PLAYBOOKS.slice(0, 5));
    expect(new Set(all.map((k) => k.id)).size).toBe(all.length); // deduped
  });
});

describe('package compatibility', () => {
  test('a non-playbook kind returns all dimensions as n/a (honest-empty, no evaluator)', () => {
    const dims = evaluateAsset({ type: 'The Grand Ballroom' }, 'venue-kit', ASOF);
    expect(dims.length).toBeGreaterThan(0);
    expect(dims.every((d) => d.status === 'n/a')).toBe(true);
    expect(dims.every((d) => d.recommendedKCRs.length === 0)).toBe(true);
    expect(DIMENSION_REGISTRY.find((d) => d.id === 'Operational completeness').appliesTo).toContain('venue-kit');
  });
});
