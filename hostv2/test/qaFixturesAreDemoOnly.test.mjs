// ─── QA FIXTURES ARE NOT PUBLIC SAMPLES (stage-4 P1, N2) ────────────────────
//
// Executes listedSamples (src/lib/demoSeed.js) against the REAL pool, which
// jest cannot load. Guards two things the lib test cannot see:
//   1. every "Test — …" row in ROSTER is caught by isQaFixture — a new fixture
//      minted with a different id prefix would otherwise leak to the public list;
//   2. hiding them from the list does not stop them RESOLVING by id, which is
//      how ~30 e2e specs boot on them (last-event / ?rsvp= / ?e=).
import { describe, it, expect } from 'vitest';
import { listedSamples, isQaFixture } from '@app/lib/demoSeed';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };

const FIXTURE_IDS = ['test-day-of', 'test-two-days', 'test-multi-day', 'test-day-before-vendors', 'test-roster-rsvp', 'test-roster-final-count'];

describe('QA fixtures list only with the demo tools on', () => {
  it('every "Test —" roster row is a QA fixture', async () => {
    const { ROSTER } = await import('../src/eventPool.js?qa1');
    const named = ROSTER.filter((e) => /^test\b/i.test(String(e.name || '')));
    expect(named.map((e) => e.id).sort()).toEqual([...FIXTURE_IDS].sort());
    expect(named.every(isQaFixture)).toBe(true);
  });

  it('demo tools off: no fixture is listed; demo tools on: all six are', async () => {
    const { ROSTER } = await import('../src/eventPool.js?qa2');
    const off = listedSamples(ROSTER, false);
    expect(off.some((e) => /^test\b/i.test(String(e.name || '')))).toBe(false);
    expect(off.length).toBe(ROSTER.length - FIXTURE_IDS.length);
    expect(listedSamples(ROSTER, true).map((e) => e.id)).toEqual(expect.arrayContaining(FIXTURE_IDS));
  });

  it('fixtures still resolve by id (the e2e specs boot on them)', async () => {
    const { ALL_SAMPLES } = await import('../src/eventPool.js?qa3');
    for (const id of FIXTURE_IDS) expect(ALL_SAMPLES.some((e) => e && e.id === id)).toBe(true);
  });
});
