// KCR-6 — role capabilities + gate status. Proves only governance/publisher (or admin)
// can publish, and the gate reader surfaces exactly what each stage needs.
import { kcrCan, canPublish, kcrCaps } from './kcrRoles';
import { kcrGateStatus, createKCR, addEvidence, setProposal, recordReview, advanceKCR } from './knowledgeChange';

const ASOF = '2026-07-02';

describe('role capabilities', () => {
  test('only admin / publisher / governance can publish', () => {
    expect(canPublish('admin')).toBe(true);
    expect(canPublish('publisher')).toBe(true);
    expect(canPublish('governance')).toBe(true);
    expect(canPublish('support')).toBe(false);
    expect(canPublish('steward')).toBe(false);
    expect(canPublish('sme')).toBe(false);
    expect(canPublish(undefined)).toBe(false);
  });
  test('support (steward/editor) can propose + review but not governance-review or publish', () => {
    expect(kcrCan('support', 'proposal')).toBe(true);
    expect(kcrCan('support', 'review:editorial')).toBe(true);
    expect(kcrCan('support', 'review:governance')).toBe(false);
    expect(kcrCan('support', 'publish')).toBe(false);
  });
  test('unknown role is read-only (view), never a write default', () => {
    expect(kcrCaps('nobody')).toEqual(['view']);
    expect(kcrCan('nobody', 'view')).toBe(true);
    expect(kcrCan('nobody', 'evidence')).toBe(false);
  });
  test('sme can only record the SME review', () => {
    expect(kcrCan('sme', 'review:sme')).toBe(true);
    expect(kcrCan('sme', 'review:editorial')).toBe(false);
    expect(kcrCan('sme', 'publish')).toBe(false);
  });
});

describe('gate status through the lifecycle', () => {
  const base = () => createKCR({ type: 'pricing-update', trigger: 'market-change', assetId: 'Crab Feast', asOf: ASOF });

  test('researching is blocked until evidence exists', () => {
    let k = advanceKCR(base(), 'researching', { asOf: ASOF });
    expect(kcrGateStatus(k).blocked).toMatch(/add evidence/i);
    k = addEvidence(k, { source: 'x', sourceType: 'citation' }, ASOF);
    expect(kcrGateStatus(k).blocked).toBeNull();
    expect(kcrGateStatus(k).next).toBe('grounded');
  });

  test('grounded is blocked until a proposal is set', () => {
    let k = advanceKCR(base(), 'researching', { asOf: ASOF });
    k = addEvidence(k, { source: 'x', sourceType: 'citation' }, ASOF);
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    expect(kcrGateStatus(k).blocked).toMatch(/set a proposal/i);
    k = setProposal(k, { newValue: [3, 8], rationale: 'x' }, ASOF);
    expect(kcrGateStatus(k).blocked).toBeNull();
  });

  test('review lists the reviews still needed', () => {
    let k = advanceKCR(base(), 'researching', { asOf: ASOF });
    k = addEvidence(k, { source: 'x', sourceType: 'citation' }, ASOF);
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    k = setProposal(k, { newValue: [3, 8], rationale: 'x' }, ASOF);
    k = advanceKCR(k, 'review', { asOf: ASOF });
    expect(kcrGateStatus(k).reviewsNeeded).toEqual(['sme', 'editorial', 'governance']);
    k = recordReview(k, 'sme', { by: 'chef', decision: 'approve' }, ASOF);
    k = recordReview(k, 'editorial', { by: 'ed', decision: 'approve' }, ASOF);
    expect(kcrGateStatus(k).reviewsNeeded).toEqual(['governance']);
    k = recordReview(k, 'governance', { by: 'pub', decision: 'approve' }, ASOF);
    const g = kcrGateStatus(k);
    expect(g.reviewsNeeded).toEqual([]);
    expect(g.next).toBe('approved');
  });

  test('the publish action requires the publish capability', () => {
    let k = advanceKCR(base(), 'researching', { asOf: ASOF });
    k = addEvidence(k, { source: 'x', sourceType: 'citation' }, ASOF);
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    k = setProposal(k, { newValue: [3, 8], rationale: 'x' }, ASOF);
    k = advanceKCR(k, 'review', { asOf: ASOF });
    ['sme', 'editorial', 'governance'].forEach((gg) => { k = recordReview(k, gg, { by: gg, decision: 'approve' }, ASOF); });
    k = advanceKCR(k, 'approved', { asOf: ASOF });
    const g = kcrGateStatus(k);
    expect(g.action).toBe('Publish');
    expect(g.cap).toBe('publish');
    // A support user cannot satisfy the publish capability the gate requires.
    expect(kcrCan('support', g.cap)).toBe(false);
    expect(kcrCan('admin', g.cap)).toBe(true);
  });
});
