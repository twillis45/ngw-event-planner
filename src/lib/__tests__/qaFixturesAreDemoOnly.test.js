// Stage-4 P1 (N2): the six "Test — …" QA fixtures in hostv2/src/eventPool.js
// were listed to every visitor — in the sample shelf and in Search. They are
// QA chrome, so they list ONLY when the demo tools are armed (?demo=1). They
// still RESOLVE by id either way (boot / ?e= / last-event), which is how the
// e2e specs reach them — this filter governs listing, never resolution.
// The same claim is executed against the real pool in
// hostv2/test/qaFixturesAreDemoOnly.test.mjs.
import { isQaFixture, listedSamples, QA_FIXTURE_PREFIX } from '../demoSeed';

const pool = [
  { id: 'ev-x-wanda', name: 'Wanda Gold' },
  { id: 'test-day-of', name: 'Test — Cookout (day of)' },
  { id: 'test-roster-rsvp', name: 'Test — Reunion (roster, replies out)' },
  { id: 'demoqa-abc', name: 'Army Retirement Celebration at the VFW' },
  null,
];

describe('QA fixtures list only with the demo tools on', () => {
  test('a test- id is a QA fixture; samples, demo seeds and junk are not', () => {
    expect(QA_FIXTURE_PREFIX).toBe('test-');
    expect(isQaFixture(pool[1])).toBe(true);
    expect(isQaFixture(pool[2])).toBe(true);
    expect(isQaFixture(pool[0])).toBe(false);
    expect(isQaFixture(pool[3])).toBe(false);
    expect(isQaFixture(null)).toBe(false);
    expect(isQaFixture({ id: 42 })).toBe(false);
  });

  test('demo tools off: fixtures are dropped, everything else kept in order', () => {
    expect(listedSamples(pool, false)).toEqual([pool[0], pool[3], null]);
  });

  test('demo tools on: the list is returned untouched', () => {
    expect(listedSamples(pool, true)).toEqual(pool);
  });

  test('the filter is a copy — the pool that resolves ids is never mutated', () => {
    const before = pool.slice();
    listedSamples(pool, false);
    expect(pool).toEqual(before);
  });
});
