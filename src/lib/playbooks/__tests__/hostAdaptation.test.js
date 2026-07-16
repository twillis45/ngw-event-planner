// Wave-2m: the board fits THIS host — a first-timer and a seasoned host get DIFFERENT boards.
import { playbookDecisionBoard, computeHostAdaptation } from '../index';

describe('per-host adaptivity', () => {
  test('first-timer vs experienced host get genuinely different boards for the SAME event', () => {
    const base = { id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 100 };
    const first = playbookDecisionBoard({ ...base, hostExperience: 'first_time', hostCapacity: 'solo' });
    const seasoned = playbookDecisionBoard({ ...base, hostExperience: 'experienced', hostCapacity: 'has_help' });
    // the byte-identical gap the adaptivity re-score named is broken:
    expect(first.hostAdaptation.handHolding).toBe('high');
    expect(seasoned.hostAdaptation.handHolding).not.toBe('high');
    expect(first.focus.length).toBeLessThan(seasoned.focus.length);
    expect(first.hostAdaptation.reassure).toBe(true);
    expect(first.hostAdaptation.proposeDerivable).toBe(true);
    expect(seasoned.hostAdaptation.reassure).toBe(false);
  });

  test('no host input → neutral standard board (additive, byte-compatible)', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Birthday', date: '2026-09-01', guests: [], guestEstimate: 30 });
    expect(b.hostAdaptation.experience).toBe('unknown');
    expect(b.hostAdaptation.handHolding).toBe('standard');
    expect(b.hostExperience).toBeNull();
  });

  test('computeHostAdaptation composes experience x capacity x difficulty', () => {
    expect(computeHostAdaptation('first_time', 'solo', 'hard', 8).handHolding).toBe('high');
    expect(computeHostAdaptation('experienced', 'has_help', 'easy', 8).handHolding).toBe('light');
    expect(computeHostAdaptation('experienced', 'has_help', 'easy', 8).terse).toBe(true);
    expect(computeHostAdaptation(null, null, 'moderate', 8).handHolding).toBe('standard');
    // a solo host on a hard event gets hand-holding even without stating inexperience
    expect(computeHostAdaptation(null, 'solo', 'hard', 8).handHolding).toBe('high');
  });

  test('capacity ALONE (2nd host dimension) changes the board on a large event', () => {
    // experience unknown on both — only hostCapacity differs. A solo host on a large
    // event gets walked through it; a host with help does not. Proves capacity is a live
    // board input, not just an engine constant (Wave-2q: it now has a runtime control).
    const base = { id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 140 };
    const solo = playbookDecisionBoard({ ...base, hostCapacity: 'solo' });
    const helped = playbookDecisionBoard({ ...base, hostCapacity: 'has_help' });
    expect(solo.hostAdaptation.handHolding).toBe('high');
    expect(helped.hostAdaptation.handHolding).not.toBe('high');
    expect(solo.focus.length).toBeLessThan(helped.focus.length);
    expect(solo.hostCapacity).toBe('solo');
  });

  test('event SIZE scales hand-holding independent of the host', () => {
    // a solo host on a LARGE event gets walked through it even on an easy playbook
    expect(computeHostAdaptation(null, 'solo', 'easy', 8, 120).handHolding).toBe('high');
    expect(computeHostAdaptation(null, 'solo', 'easy', 8, 120).size).toBe('large');
    // a seasoned host on a LARGE event does NOT get the terse treatment
    expect(computeHostAdaptation('experienced', 'has_help', 'easy', 8, 120).handHolding).not.toBe('light');
    // small event, seasoned host → terse
    expect(computeHostAdaptation('experienced', 'has_help', 'easy', 8, 12).size).toBe('small');
    expect(computeHostAdaptation('experienced', 'has_help', 'easy', 8, 12).terse).toBe(true);
  });
});
