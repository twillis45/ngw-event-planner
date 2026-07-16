// LEARNING-1 (roadmap #2) — the decision board grounds the headcount row in the
// host's LEARNED turnout. Proves: (a) with a stable attendance-memory profile the
// board exposes headcountMemory + attaches it to the f-headcount row; (b) the
// committed count stays the plain fact (`because` is never overwritten); (c) cold
// start / no profile is byte-identical (no memory, no grounded field); (d) the gate
// holds — an empty/unstable profile does not fire.
import { playbookDecisionBoard } from '../index';
import { makeQaAttendanceProfile } from '../../qaMemorySeed';

const ASOF = '2026-07-01';
// 5 stable observations, planned 40, ratio ~0.875 ⇒ suggested ~35 (a real, clamped adjustment).
const memProfile = makeQaAttendanceProfile({ asOf: ASOF });
const event = { id: 'e', type: 'Dinner Party', date: '2026-08-01', guestMode: 'count', guestCount: 40 };

describe('LEARNING-1 — headcount grounded in attendance memory', () => {
  test('with a memory profile: headcountMemory applies + attaches to the f-headcount row', () => {
    const b = playbookDecisionBoard(event, ASOF, memProfile);
    expect(b.headcountMemory).toBeTruthy();
    expect(b.headcountMemory.source).toBe('attendance-memory');
    expect(typeof b.headcountMemory.note).toBe('string');
    expect(b.headcountMemory.note.length).toBeGreaterThan(0);
    expect(b.headcountMemory.planned).toBe(40);
    expect(b.headcountMemory.suggested).not.toBe(40); // gated + clamped, but a genuine shift
    const hc = b.locked.find((r) => r.id === 'f-headcount');
    expect(hc).toBeTruthy();
    expect(hc.grounded).toBe(b.headcountMemory); // same object — attributed provenance on the row
  });

  test('committed count is the plain fact — memory NEVER overwrites `because`', () => {
    const withMem = playbookDecisionBoard(event, ASOF, memProfile);
    const noMem = playbookDecisionBoard(event, ASOF);
    const hcW = withMem.locked.find((r) => r.id === 'f-headcount');
    const hcN = noMem.locked.find((r) => r.id === 'f-headcount');
    expect(hcW.because).toBe('40 guests');   // the host's committed number, unchanged
    expect(hcW.because).toBe(hcN.because);    // identical with and without memory
  });

  test('cold start (no profile) is byte-identical: no headcountMemory, no grounded', () => {
    const noMem = playbookDecisionBoard(event, ASOF);
    expect(noMem.headcountMemory).toBeNull();
    const hc = noMem.locked.find((r) => r.id === 'f-headcount');
    expect(hc.grounded).toBeNull();
  });

  test('honest gate: an empty/unstable profile does not fire', () => {
    const empty = { hostIntelligence: { domains: { attendance: { observations: [] } } } };
    const b = playbookDecisionBoard(event, ASOF, empty);
    expect(b.headcountMemory).toBeNull();
  });
});
