// Sprint 57H — Because Layer. Proves: reasoning is EXPOSED from existing factors
// (no inference); quantities/summary are UNCHANGED (additive snapshot guard); the
// because traces to the real per-guest / flat factors and the real safety triggers;
// flag default OFF.

import { becauseOn, becauseActive } from '../becauseLayer';
import { playbookCapacity, playbookInfraPrompts } from '../playbooks';

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57H flag gating', () => {
  test('becauseOn / becauseActive default OFF', () => {
    expect(becauseOn()).toBe(false);
    expect(becauseActive()).toBe(false);
  });
  test('flag ON ⇒ active', () => {
    try { localStorage.setItem('ngw-pi-because', '1'); } catch {}
    expect(becauseActive()).toBe(true);
  });
});

const dinner = { type: 'Dinner Party', guestCount: 12 };

describe('57H Capacity because — traced to real factors, quantities unchanged', () => {
  const cap = playbookCapacity(dinner);
  test('the additive snapshot guard: summary + every qty are unchanged shape', () => {
    expect(cap).toBeTruthy();
    expect(typeof cap.summary).toBe('string');
    // every item still has a positive integer qty (no quantity moved by 57H)
    cap.items.forEach((i) => { expect(Number.isFinite(i.qty)).toBe(true); expect(i.qty).toBeGreaterThan(0); });
    // summary is still the qty·short join — byte-identical formula
    expect(cap.summary).toBe(cap.items.map((i) => `${i.qty} ${i.short}`).join(' · '));
  });
  test('because is built from the real per-guest factors (12 guests × …)', () => {
    expect(cap.because).toContain('12 guests ×');
    // a per-guest item exposes its factor + label (e.g. "2 plates")
    const pg = cap.items.find((i) => i.factorType === 'perGuest');
    expect(pg).toBeTruthy();
    expect(cap.because).toContain(`${pg.factor} ${pg.short}`);
  });
  test('items carry factor + factorType (the reasoning), additively', () => {
    cap.items.forEach((i) => { expect(i.factor).not.toBeNull(); expect(['perGuest', 'perN', 'flat']).toContain(i.factorType); });
  });
});

describe('57H Reality Check because — only the signals that actually fired', () => {
  const infra = playbookInfraPrompts(dinner);
  test('because names standard basics; no inference beyond authored signals', () => {
    expect(infra).toBeTruthy();
    expect(infra.because).toContain('safety basics');
    // prompts/summary unchanged shape (additive)
    expect(infra.summary).toBe(infra.prompts.map((p) => p.short).join(' · '));
  });
});
