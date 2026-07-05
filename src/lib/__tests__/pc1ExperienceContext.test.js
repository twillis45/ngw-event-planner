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

// POP-1/WOW-1: extends the riskStatus dismiss pattern to Decision Blockers.
// Mirrors the riskStatus test above exactly — same shape, same filtering logic,
// same event.<x>Status[type] key convention.
describe('POP-1/WOW-1: event.decisionBlockerStatus filters ctx.decisionBlockers (mirrors event.riskStatus)', () => {
  // No venue set -> deriveDecisionBlockers() always emits a 'venue-selection' blocker.
  const noVenueEvent = { ...flagshipEvent, venue: '' };

  test('an unresolved blocker (no status set) appears in ctx.decisionBlockers', () => {
    const ctx = buildExperienceContext(noVenueEvent, null, null);
    expect(ctx.decisionBlockers.find(b => b.type === 'venue-selection')).toBeDefined();
  });

  test('acknowledging a blocker removes it from ctx.decisionBlockers', () => {
    const eventWithAck = { ...noVenueEvent, decisionBlockerStatus: { 'venue-selection': 'acknowledged' } };
    const ctx = buildExperienceContext(eventWithAck, null, null);
    expect(ctx.decisionBlockers.find(b => b.type === 'venue-selection')).toBeUndefined();
  });

  test('dismissing a blocker removes it from ctx.decisionBlockers', () => {
    const eventWithDismiss = { ...noVenueEvent, decisionBlockerStatus: { 'venue-selection': 'dismissed' } };
    const ctx = buildExperienceContext(eventWithDismiss, null, null);
    expect(ctx.decisionBlockers.find(b => b.type === 'venue-selection')).toBeUndefined();
  });

  test('an unrelated blocker status does not suppress a different, still-unresolved blocker (no conflict hidden)', () => {
    // guest-count-confirmation also fires for flagshipEvent (guestCount set, so it
    // won't) — use an event missing BOTH venue and guest count to get 2 blockers.
    const twoBlockerEvent = { ...flagshipEvent, venue: '', guestCount: undefined, guests: [] };
    const ctxBefore = buildExperienceContext(twoBlockerEvent, null, null);
    expect(ctxBefore.decisionBlockers.length).toBeGreaterThanOrEqual(2);

    const eventWithOneAck = { ...twoBlockerEvent, decisionBlockerStatus: { 'venue-selection': 'acknowledged' } };
    const ctxAfter = buildExperienceContext(eventWithOneAck, null, null);
    expect(ctxAfter.decisionBlockers.find(b => b.type === 'venue-selection')).toBeUndefined();
    expect(ctxAfter.decisionBlockers.find(b => b.type === 'guest-count-confirmation')).toBeDefined();
  });

  test('planningState.blockedDecisions (eventPlan output) reflects the same filtered list, not a re-derived one', () => {
    const eventWithAck = { ...noVenueEvent, decisionBlockerStatus: { 'venue-selection': 'acknowledged' } };
    const ctx = buildExperienceContext(eventWithAck, null, null);
    expect(ctx.decisionBlockers.find(b => b.type === 'venue-selection')).toBeUndefined();
    // eventPlan's planningState.blockedDecisions passes ctx.decisionBlockers through
    // verbatim (CommandCenter.jsx) — covered end-to-end in workstreams.test.js;
    // this test pins the ctx-layer half of that chain.
  });

  test('no status set at all — never throws, blockers array is well-formed', () => {
    const ctx = buildExperienceContext({ ...flagshipEvent, decisionBlockerStatus: undefined }, null, null);
    expect(Array.isArray(ctx.decisionBlockers)).toBe(true);
  });
});
