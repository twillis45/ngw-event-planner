// KCR store + reconciliation (gaps 1 & 2) + multi-source intake (gap 3).
import { mergeKCR, reconcileKCRs, loadKCRs, saveKCRs, upsertKCR, syncIntake, getKCR, clearKCRs } from './kcrStore';
import { researchQueueToKCRs } from './researchIntake';
import { validationFindingsToKCRs, manualInsightsToKCRs, collectAllKCRs } from './insightSources';
import { advanceKCR, addEvidence } from './knowledgeChange';

const ASOF = '2026-07-02';
beforeEach(() => clearKCRs());

describe('mergeKCR — progress preserved, derived refreshed', () => {
  test('null existing ⇒ incoming as-is', () => {
    const inc = { id: 'x', status: 'draft', priority: 'low' };
    expect(mergeKCR(null, inc)).toBe(inc);
  });
  test('lifecycle progress kept; derived metadata refreshed', () => {
    const existing = { id: 'x', status: 'review', priority: 'low', reason: 'old', evidence: [{ id: 'ev-1' }], proposal: { newValue: 1 } };
    const incoming = { id: 'x', status: 'draft', priority: 'high', reason: 'new', evidence: [], proposal: null, impact: { downstream: ['budget'] } };
    const m = mergeKCR(existing, incoming);
    expect(m.status).toBe('review');           // progress preserved
    expect(m.evidence).toHaveLength(1);         // progress preserved
    expect(m.proposal).toEqual({ newValue: 1 });// progress preserved
    expect(m.priority).toBe('high');            // derived refreshed
    expect(m.reason).toBe('new');               // derived refreshed
    expect(m.impact).toEqual({ downstream: ['budget'] });
  });
});

describe('reconcileKCRs', () => {
  test('new gaps added; recurring gaps refreshed not duplicated', () => {
    const stored = [{ id: 'a', status: 'grounded', priority: 'low' }];
    const gen = [{ id: 'a', status: 'draft', priority: 'high' }, { id: 'b', status: 'draft', priority: 'med' }];
    const { kcrs, added, refreshed } = reconcileKCRs(stored, gen);
    expect(kcrs).toHaveLength(2);
    expect(added).toBe(1);
    expect(refreshed).toBe(1);
    expect(kcrs.find((k) => k.id === 'a').status).toBe('grounded'); // progress preserved
    expect(kcrs.find((k) => k.id === 'a').priority).toBe('high');   // refreshed
  });
  test('a resolved gap (absent from generation) is left in place, not lost', () => {
    const stored = [{ id: 'a', status: 'published' }];
    const { kcrs } = reconcileKCRs(stored, [{ id: 'b', status: 'draft' }]);
    expect(kcrs.map((k) => k.id).sort()).toEqual(['a', 'b']);
  });
});

describe('persistence — re-intake does not regress in-progress work', () => {
  test('a KCR advanced past draft survives a fresh intake sync', () => {
    // First intake persists the backlog.
    const first = researchQueueToKCRs(ASOF);
    syncIntake(first);
    // Advance one KCR (attach evidence + move to researching).
    const target = getKCR(first[0].id);
    let progressed = addEvidence(target, { source: 'x', sourceType: 'citation' }, ASOF);
    progressed = advanceKCR(progressed, 'researching', { asOf: ASOF });
    upsertKCR(progressed);
    expect(getKCR(target.id).status).toBe('researching');
    // Re-run intake — the SAME gaps regenerate as drafts; the store must keep progress.
    const res = syncIntake(researchQueueToKCRs(ASOF));
    expect(res.added).toBe(0);                          // nothing new
    expect(getKCR(target.id).status).toBe('researching'); // progress preserved
    expect(getKCR(target.id).evidence).toHaveLength(1);
  });
});

describe('multi-source intake (gap 3)', () => {
  test('validation findings are honest-empty until scored events exist', () => {
    expect(validationFindingsToKCRs([], ASOF)).toEqual([]);
  });
  test('a poorly-graded validation finding becomes a validation-finding KCR', () => {
    const kcrs = validationFindingsToKCRs([{ assetType: 'Crab Feast', domain: 'budget', grade: 'F', reader: 'R6' }], ASOF);
    expect(kcrs).toHaveLength(1);
    expect(kcrs[0].type).toBe('validation-finding');
    expect(kcrs[0].trigger).toBe('validation');
    expect(kcrs[0].priority).toBe('high');
  });
  test('manual insights convert through the same shape', () => {
    const kcrs = manualInsightsToKCRs([{ trigger: 'sme', suggestedType: 'sme-revision', assetId: 'Crab Feast', fieldPath: 'risks', reason: 'add allergen note', priority: 'high' }], ASOF);
    expect(kcrs).toHaveLength(1);
    expect(kcrs[0].trigger).toBe('sme');
  });
  test('collectAllKCRs unifies sources + dedupes by id', () => {
    const all = collectAllKCRs({ asOf: ASOF, validationFindings: [], manualInsights: [] });
    expect(all.length).toBeGreaterThan(0);                 // research queue present
    expect(new Set(all.map((k) => k.id)).size).toBe(all.length); // no dupes
  });
});
