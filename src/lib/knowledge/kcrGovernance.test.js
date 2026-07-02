// KCR-5 governance readers: ownership, time-in-stage, SLA, backlog metrics — honest-empty.
import { kcrOwnership, kcrTimeInStage, kcrSla, kcrBacklogMetrics, KCR_SLA_DAYS } from './kcrGovernance';
import { getPlaybook } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');
const kcr = (over = {}) => ({ id: 'k1', status: 'researching', assetId: 'Crab Feast', audit: [], ...over });
const withStage = (status, sinceISO) => kcr({ status, audit: [{ action: 'created', at: '2026-05-01' }, { action: `advanced:${status}`, at: sinceISO }] });

describe('ownership', () => {
  test('honest-empty when the asset has no governance block', () => {
    const o = kcrOwnership(kcr(), crab); // crab has no governance block
    expect(o.known).toBe(false);
    expect(o.steward).toBeNull();
  });
  test('reads the asset governance owner when present', () => {
    const pb = { ...crab, governance: { owner: 'Todd', set: true } };
    const o = kcrOwnership(kcr(), pb);
    expect(o.assetOwner).toBe('Todd');
    expect(o.steward).toBe('Todd');
    expect(o.known).toBe(true);
  });
});

describe('time-in-stage + SLA', () => {
  test('honest-empty when there is no timestamp', () => {
    const t = kcrTimeInStage(kcr({ audit: [{ action: 'created' }] }), ASOF); // no `at`
    expect(t.known).toBe(false);
    expect(kcrSla(kcr({ audit: [] }), ASOF).known).toBe(false);
  });
  test('computes days in the current stage from the advancing audit entry', () => {
    const t = kcrTimeInStage(withStage('researching', '2026-06-25'), ASOF);
    expect(t.known).toBe(true);
    expect(t.days).toBe(7);
  });
  test('flags overdue when days exceed the stage SLA', () => {
    const s = kcrSla(withStage('review', '2026-06-01'), ASOF); // ~31d vs SLA 10
    expect(s.known).toBe(true);
    expect(s.sla).toBe(KCR_SLA_DAYS.review);
    expect(s.overdue).toBe(true);
    expect(s.over).toBeGreaterThan(0);
  });
});

describe('backlog metrics', () => {
  const list = [
    withStage('review', '2026-06-01'),                              // stale (31d > 10)
    withStage('researching', '2026-06-28'),                         // fresh
    { ...kcr({ id: 'k3', status: 'published' }), audit: [{ action: 'created', at: '2026-04-01' }] },
    { ...kcr({ id: 'k4', status: 'draft' }), audit: [] },           // no timestamp — aging unknown
    { ...kcr({ id: 'k5', status: 'draft' }), impact: { recommendationEngines: ['budget', 'shopping'], downstream: ['sourcing'], affectedPurchases: ['p_crabs', 'p_sides'] } },
  ];
  const m = kcrBacklogMetrics(list, ASOF);
  test('counts open/by-status', () => {
    expect(m.total).toBe(5);
    expect(m.open).toBe(4);            // published excluded
    expect(m.byStatus.draft).toBe(2);
  });
  test('oldest + stale derive from known ages only', () => {
    expect(m.oldest[0].days).toBeGreaterThanOrEqual(m.oldest[m.oldest.length - 1].days);
    expect(m.staleCount).toBeGreaterThanOrEqual(1);
    expect(m.stale[0].status).toBe('review');
  });
  test('avg time-in-stage is honest-empty for stages with no timestamps', () => {
    expect(m.avgTimeInStage.draft).toBeNull();      // both drafts lack a usable timestamp
    expect(typeof m.avgTimeInStage.review).toBe('number');
  });
  test('highest-impact ranks by derived impact breadth', () => {
    expect(m.highestImpact[0].id).toBe('k5');
    expect(m.highestImpact[0].score).toBeGreaterThan(0);
  });
  test('agedKnown signals how much aging data exists (honest-empty when 0)', () => {
    expect(m.agedKnown).toBe(3);                    // k1,k2,k3 have timestamps; k4,k5 do not
    expect(kcrBacklogMetrics([kcr({ audit: [] })], ASOF).agedKnown).toBe(0);
  });
});
