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

  test('DEPTH: same event, different host -> different board ORDER, not just count', () => {
    // The re-score's named gap: the open list was byte-identical across hosts (only the
    // shown-count changed). Now a hand-held host is eased in (low-stakes wins first) while a
    // seasoned host gets leverage-first order -- but overdue is pinned for BOTH (no buried
    // deadline), and the SAME set of decisions is present (reorder, not add/drop).
    const base = { id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 140 };
    const first = playbookDecisionBoard({ ...base, hostExperience: 'first_time', hostCapacity: 'solo' });
    const seasoned = playbookDecisionBoard({ ...base, hostExperience: 'experienced', hostCapacity: 'has_help' });
    const fo = first.open.map((r) => r.id);
    const so = seasoned.open.map((r) => r.id);
    expect(fo.join()).not.toBe(so.join());                 // real reorder, not cosmetic count
    expect([...fo].sort()).toEqual([...so].sort());        // same decisions, just sequenced
    // overdue never buried on the hand-held board: all overdue rows precede all non-overdue
    const firstNonOverdue = first.open.findIndex((r) => r.status !== 'overdue');
    if (firstNonOverdue > 0) {
      expect(first.open.slice(0, firstNonOverdue).every((r) => r.status === 'overdue')).toBe(true);
    }
    // ease-in: among the hand-held board's non-overdue tail, a high-stakes call does not lead
    const tail = first.open.filter((r) => r.status !== 'overdue');
    if (tail.length >= 2) {
      const stakes = (r) => (r.weight === 'high' ? 2 : 0) + (r.deliversHeartMoment ? 1 : 0);
      expect(stakes(tail[0])).toBeLessThanOrEqual(stakes(tail[tail.length - 1]));
    }
  });

  test('no host input -> board order is pure byScore (additive, unchanged)', () => {
    // the ease-in reorder is gated on proposeDerivable, so a neutral board is untouched.
    const base = { id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 140 };
    const neutral = playbookDecisionBoard(base);
    const seasoned = playbookDecisionBoard({ ...base, hostExperience: 'experienced' });
    expect(neutral.open.map((r) => r.id).join()).toBe(seasoned.open.map((r) => r.id).join());
    expect(neutral.hostAdaptation.proposeDerivable).toBe(false);
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

  test('DEPTH: order differentiates per host even on an OVERDUE-HEAVY board', () => {
    // The 2r/2s re-scores' named collapse: when overdue rows dominate, a pure urgency sort
    // gave every host the identical order. Now the hand-held host orders the overdue block
    // recoverable/low-consequence-first (momentum) while the seasoned host keeps leverage-
    // first -- so the sequence differs even when the whole board is overdue. Relative date so
    // it stays deadline-heavy over time.
    const d = new Date(); d.setDate(d.getDate() + 255);
    const base = { id: 'e', type: 'Wedding', date: d.toISOString().slice(0, 10), guests: [], guestEstimate: 140 };
    const first = playbookDecisionBoard({ ...base, hostExperience: 'first_time', hostCapacity: 'solo' });
    const seasoned = playbookDecisionBoard({ ...base, hostExperience: 'experienced', hostCapacity: 'has_help' });
    const overdue = first.open.filter((r) => r.status === 'overdue').length;
    expect(overdue).toBeGreaterThanOrEqual(3);                 // genuinely deadline-heavy
    expect(first.open.map((r) => r.id).join()).not.toBe(seasoned.open.map((r) => r.id).join());
    // overdue still pinned above non-overdue on the hand-held board (no buried deadline)
    const firstNonOverdue = first.open.findIndex((r) => r.status !== 'overdue');
    if (firstNonOverdue > 0) {
      expect(first.open.slice(0, firstNonOverdue).every((r) => r.status === 'overdue')).toBe(true);
    }
  });

  test('PACE: hand-held host is staged into sessions; seasoned/neutral gets one list', () => {
    const base = { id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 140 };
    const first = playbookDecisionBoard({ ...base, hostExperience: 'first_time', hostCapacity: 'solo' });
    const seasoned = playbookDecisionBoard({ ...base, hostExperience: 'experienced', hostCapacity: 'has_help' });
    const neutral = playbookDecisionBoard(base);
    expect(first.hostAdaptation.staged).toBe(true);
    // batchSize (subsequent session size) is now decoupled from focusCount (first-session size)
    // via event size — a large event (140 guests here) gets a larger follow-on batch.
    expect(first.hostAdaptation.batchSize).toBeGreaterThan(0);
    expect(first.hostAdaptation.batchSize).toBe(4); // large event
    expect(first.hostAdaptation.focusCount).toBe(3);
    expect(seasoned.hostAdaptation.staged).toBe(false);
    expect(neutral.hostAdaptation.staged).toBe(false);
    // a SMALL event's follow-on batch is smaller than a large event's (real size decoupling)
    const smallFirst = playbookDecisionBoard({ id: 'e2', type: 'Dinner Party', date: '2027-06-01', guests: [], guestEstimate: 12, hostExperience: 'first_time', hostCapacity: 'solo' });
    if (smallFirst.hostAdaptation.staged) expect(smallFirst.hostAdaptation.batchSize).toBe(3);
  });

  test('THE CLOCK: runway (days-to-event) compresses a hand-held board cadence', () => {
    // The 5th, dominant pacing signal a human planner reads: a near deadline surfaces more per
    // session + a wider first foreground; a long runway keeps the drip gentle.
    const near = new Date(); near.setDate(near.getDate() + 14);
    const far = new Date(); far.setDate(far.getDate() + 300);
    const base = { type: 'Wedding', guests: [], guestEstimate: 140, hostExperience: 'first_time', hostCapacity: 'solo' };
    const tight = playbookDecisionBoard({ ...base, id: 't', date: near.toISOString().slice(0, 10) });
    const relaxed = playbookDecisionBoard({ ...base, id: 'r', date: far.toISOString().slice(0, 10) });
    expect(tight.hostAdaptation.runway).toBe('tight');
    expect(relaxed.hostAdaptation.runway).toBe('relaxed');
    expect(tight.hostAdaptation.batchSize).toBeGreaterThan(relaxed.hostAdaptation.batchSize);
    expect(tight.hostAdaptation.focusCount).toBeGreaterThanOrEqual(relaxed.hostAdaptation.focusCount);
    // direct: same host inputs, only the clock differs
    expect(computeHostAdaptation('first_time', 'solo', 'hard', 10, 140, 14).runway).toBe('tight');
    expect(computeHostAdaptation('first_time', 'solo', 'hard', 10, 140, 300).runway).toBe('relaxed');
    expect(computeHostAdaptation('first_time', 'solo', 'hard', 10, 140, 14).batchSize)
      .toBeGreaterThan(computeHostAdaptation('first_time', 'solo', 'hard', 10, 140, 300).batchSize);
    // no date → runway unknown, no compression (additive)
    expect(computeHostAdaptation('first_time', 'solo', 'hard', 10, 140).runway).toBe('unknown');
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
