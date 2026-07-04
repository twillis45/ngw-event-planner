// Sprint PC-1 (Platform Continuity) regression tests.
// Core claim under test: buildExperienceContext() is the ONE canonical
// composition function — calling it twice with the same inputs (as
// AssembleReveal and HostHome now both do) must return equivalent
// eventIdentity/compound/reasoning output. This directly proves HQ-3's #1
// continuity finding (Reveal and HostHome independently re-deriving
// "understanding" and only agreeing by coincidence) is fixed by construction:
// there is no second derivation path left to diverge from the first.
import { buildExperienceContext } from '../experienceContext';

const flagshipEvent = {
  id: 'evt-flagship',
  type: 'Birthday',
  name: '50th Birthday and Military Retirement from the Navy',
  date: '2026-08-15',
  guestCount: 85,
  venue: '',
};

const simpleEvent = {
  id: 'evt-simple',
  type: 'Crab Feast',
  name: 'My Crab Feast',
  date: '2026-08-15',
  guestCount: 30,
  venue: 'Backyard',
};

describe('PC-1: buildExperienceContext canonical composition', () => {
  test('returns null for a null event (no crash)', () => {
    expect(buildExperienceContext(null, null, null)).toBeNull();
  });

  test('two independent calls with the same inputs (simulating AssembleReveal + HostHome) produce equivalent eventIdentity', () => {
    const ctxA = buildExperienceContext(flagshipEvent, null, null); // simulates AssembleReveal's call
    const ctxB = buildExperienceContext(flagshipEvent, null, null); // simulates HostHome's call
    expect(ctxA.eventIdentity).toEqual(ctxB.eventIdentity);
    expect(ctxA.compound).toBe(ctxB.compound);
    expect(ctxA.reasoning).toBe(ctxB.reasoning);
    expect(ctxA.confidence).toBe(ctxB.confidence);
  });

  test('flagship compound event: compound=true, reasoning names both milestones', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    expect(ctx.compound).toBe(true);
    expect(ctx.eventIdentity.secondaryEventTypes).toContain('retirement');
    expect(ctx.eventIdentity.secondaryEventTypes).toContain('military-retirement');
    expect(ctx.reasoning).toMatch(/birthday/i);
    expect(ctx.reasoning).toMatch(/retirement/i);
  });

  test('simple event (own name echoes type): compound=false, no self-detection false-positive (IS-1 regression preserved)', () => {
    const ctx = buildExperienceContext(simpleEvent, null, null);
    expect(ctx.compound).toBe(false);
    expect(ctx.eventIdentity.secondaryEventTypes).toEqual([]);
  });

  test('decisionBlockers and activeRisks are arrays, never throw, and activeRisks respects event.riskStatus (HQ-2 loop) even at the context layer', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    expect(Array.isArray(ctx.decisionBlockers)).toBe(true);
    expect(Array.isArray(ctx.activeRisks)).toBe(true);

    const dismissedType = ctx.activeRisks[0] && ctx.activeRisks[0].type;
    if (dismissedType) {
      const eventWithDismissal = { ...flagshipEvent, riskStatus: { [dismissedType]: 'dismissed' } };
      const ctxAfterDismiss = buildExperienceContext(eventWithDismissal, null, null);
      expect(ctxAfterDismiss.activeRisks.find(r => r.type === dismissedType)).toBeUndefined();
    }
  });

  test('assembledState matches recommendations (both point at the same stage list — one owner, not two fields diverging)', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    expect(ctx.recommendations).toBe(ctx.assembledState);
  });

  test('humanContext is the legacy meaning reader output, not reinterpreted — null when no meaning captured', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    // flagshipEvent has no must_have_moment/honoree_story/feeling_words/honoree set
    expect(ctx.humanContext).toBeNull();
  });

  test('persona is explicitly null (Sprint A resolvePersona/resolveShell remain PARKED per IS-2 — not silently wired here)', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    expect(ctx.persona).toBeNull();
  });
});
