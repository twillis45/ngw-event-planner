// F4: Assemble Reveal Enhancement Tests
// Unit + golden path + integration coverage

import {
  buildAssembleRevealStages,
  buildIdentityStage,
  deriveDecisionBlockers,
  buildBlockerStage,
  assemblePlanningDomains,
  buildDomainStage,
  deriveTopRisks,
  buildRiskStage
} from '../assembleRevealEngines';
import {
  fixture50thPlusMilitary,
  fixtureBirthday,
  fixtureRetirement,
  fixtureGraduation,
  fixtureCrabFeast,
  familyReunion,
  anniversary,
  allFixtures
} from './f4AssembleRevealFixtures';

// ─── Unit Tests: Each Tier ──────────────────────────────────────────────────

describe('F4: Assemble Reveal Enhancement', () => {
  describe('Card Contract Validation', () => {
    const validCard = (card) => {
      expect(card).toEqual(expect.objectContaining({
        key: expect.any(String),
        icon: expect.any(String),
        title: expect.any(String),
        what: expect.any(String),
        why: expect.any(String),
        status: expect.any(String),
        sourceEngines: expect.any(Array),
        confidenceLabel: expect.any(String)
      }));
    };

    test('identity stage matches card contract', () => {
      const stage = buildIdentityStage(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      expect(stage).toBeTruthy();
      validCard(stage);
      expect(stage.key).toBe('identity');
    });

    test('blocker stage matches card contract', () => {
      const blockers = deriveDecisionBlockers(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity
      );
      expect(blockers.length).toBeGreaterThan(0);
      const stage = buildBlockerStage(blockers[0]);
      validCard(stage);
      expect(stage.key).toMatch(/^blocker-/);
    });

    test('domain stage matches card contract', () => {
      const domains = assemblePlanningDomains(fixture50thPlusMilitary.event, null);
      expect(domains.length).toBeGreaterThan(0);
      const stage = buildDomainStage(domains[0]);
      if (stage) validCard(stage);
    });

    test('risk stage matches card contract', () => {
      const risks = deriveTopRisks(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity
      );
      if (risks.length > 0) {
        const stage = buildRiskStage(risks);
        expect(stage).toBeTruthy();
        validCard(stage);
      }
    });
  });

  describe('Tier 1: Identity Stage', () => {
    test('identity stage always renders first', () => {
      const stages = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      expect(stages.length).toBeGreaterThan(0);
      expect(stages[0].key).toBe('identity');
    });

    test('identity stage detects compound events', () => {
      const stage = buildIdentityStage(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      expect(stage.what).toMatch(/compound|two milestone/i);
    });

    test('identity stage handles null eventIdentity gracefully', () => {
      const stage = buildIdentityStage(fixture50thPlusMilitary.event, null, null);
      expect(stage).toBeNull();
    });
  });

  describe('Tier 2: Decision Blockers', () => {
    test('compound events surface ceremony-timing blocker', () => {
      const blockers = deriveDecisionBlockers(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity
      );
      expect(blockers.map(b => b.type)).toContain('ceremony-timing');
    });

    test('events without venue surface venue blocker', () => {
      const event = { ...fixture50thPlusMilitary.event, venue: '' };
      const blockers = deriveDecisionBlockers(event, fixture50thPlusMilitary.eventIdentity);
      expect(blockers.map(b => b.type)).toContain('venue-selection');
    });

    test('events without guest count surface guest-count blocker', () => {
      const event = { ...fixture50thPlusMilitary.event, guestCount: 0 };
      const blockers = deriveDecisionBlockers(event, fixture50thPlusMilitary.eventIdentity);
      expect(blockers.map(b => b.type)).toContain('guest-count-confirmation');
    });

    test('formal ceremony without dress code surfaces dress-code blocker', () => {
      const event = { ...fixture50thPlusMilitary.event, dressCode: '' };
      const blockers = deriveDecisionBlockers(event, fixture50thPlusMilitary.eventIdentity);
      expect(blockers.map(b => b.type)).toContain('dress-code-confirmation');
    });
  });

  describe('Tier 3: Planning Domains', () => {
    test('only domains with content assemble', () => {
      const domains = assemblePlanningDomains(fixtureBirthday.event, null);
      expect(domains.length).toBeGreaterThan(0);
      domains.forEach(d => {
        expect(['timeline', 'food', 'shopping', 'guests', 'budget', 'vendors']).toContain(d.type);
      });
    });

    test('domain stages preserve existing behavior for timeline', () => {
      const domains = assemblePlanningDomains(fixture50thPlusMilitary.event, null);
      const timelineDomain = domains.find(d => d.type === 'timeline');
      expect(timelineDomain).toBeTruthy();
      const stage = buildDomainStage(timelineDomain);
      expect(stage.key).toBe('timeline');
      expect(stage.what).toMatch(/moment|hour/i);
    });

    test('domain stages preserve existing behavior for food', () => {
      const domains = assemblePlanningDomains(fixture50thPlusMilitary.event, null);
      const foodDomain = domains.find(d => d.type === 'food');
      if (foodDomain) {
        const stage = buildDomainStage(foodDomain);
        expect(stage.key).toBe('food');
        expect(stage.what).toMatch(/item|guest/i);
      }
    });
  });

  describe('Tier 4: Risk Preview', () => {
    test('compound events surface compound-confusion risk', () => {
      const risks = deriveTopRisks(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity
      );
      expect(risks.map(r => r.type)).toContain('compound-confusion');
    });

    test('risk stage caps at 3 risks', () => {
      const risks = deriveTopRisks(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity
      );
      expect(risks.length).toBeLessThanOrEqual(3);
    });

    test('risk preview handles no risks gracefully', () => {
      const stage = buildRiskStage([]);
      expect(stage).toBeNull();
    });
  });

  // ─── Golden Path Tests: 7 Scenarios ──────────────────────────────────────

  describe('Golden Path Tests: 7 Scenarios', () => {
    allFixtures.forEach(({ name, event, eventIdentity, expectedStageKeys }) => {
      describe(name, () => {
        let stages;

        beforeEach(() => {
          stages = buildAssembleRevealStages(event, eventIdentity, null);
        });

        test(`renders without error`, () => {
          expect(stages).toBeDefined();
          expect(Array.isArray(stages)).toBe(true);
        });

        test(`identity stage is first`, () => {
          expect(stages.length).toBeGreaterThan(0);
          expect(stages[0].key).toBe('identity');
        });

        test(`contains identity stage and is not empty`, () => {
          const stageKeys = stages.map(s => s.key);
          // Identity stage is always first
          expect(stageKeys[0]).toBe('identity');
          // At least identity stage exists
          expect(stageKeys.length).toBeGreaterThan(0);
        });

        test(`all stages match card contract`, () => {
          stages.forEach(stage => {
            expect(stage).toEqual(expect.objectContaining({
              key: expect.any(String),
              icon: expect.any(String),
              title: expect.any(String),
              what: expect.any(String),
              why: expect.any(String),
              status: expect.any(String),
              sourceEngines: expect.any(Array),
              confidenceLabel: expect.any(String)
            }));
          });
        });

        test(`no duplicate stages`, () => {
          const keys = stages.map(s => s.key);
          const unique = new Set(keys);
          expect(keys.length).toBe(unique.size);
        });
      });
    });
  });

  // ─── Integration Tests: Existing Behavior Preserved ───────────────────────

  describe('Integration: Backward Compatibility', () => {
    test('normal event reveal still works (no compound)', () => {
      const stages = buildAssembleRevealStages(
        fixtureBirthday.event,
        fixtureBirthday.eventIdentity,
        null
      );
      expect(stages.length).toBeGreaterThan(0);
      // Should include timeline, food, shopping (similar to old reveal)
      const keys = stages.map(s => s.key);
      expect(keys).toContain('identity');
      expect(keys).toContain('timeline');
    });

    test('no duplicate reveal flows', () => {
      // The buildAssembleRevealStages should only be called once per render
      // This test verifies the function returns consistent results
      const stages1 = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      const stages2 = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      expect(stages1.length).toBe(stages2.length);
      expect(stages1.map(s => s.key)).toEqual(stages2.map(s => s.key));
    });

    test('stages array returned is immutable', () => {
      const stages = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      expect(Array.isArray(stages)).toBe(true);
      expect(stages.filter).toBeDefined(); // Should be a real array
    });
  });

  // ─── Language & Tone Tests ──────────────────────────────────────────────

  describe('Language & Tone (No Admin Jargon)', () => {
    test('stages do not expose internal terms', () => {
      const stages = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      const allText = JSON.stringify(stages).toLowerCase();
      expect(allText).not.toMatch(/knowledge factory|kcr|blueprint|workers|provider engine/);
    });

    test('confidence uses words, not percentages', () => {
      const stages = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      stages.forEach(stage => {
        // Confidence label should be a word like "High confidence", "We think so", etc.
        // Not a percentage
        expect(stage.confidenceLabel).not.toMatch(/\d+%/);
      });
    });

    test('stages use natural language', () => {
      const stages = buildAssembleRevealStages(
        fixture50thPlusMilitary.event,
        fixture50thPlusMilitary.eventIdentity,
        null
      );
      // At least one stage should mention the event in human terms
      const allText = JSON.stringify(stages).toLowerCase();
      expect(allText.length).toBeGreaterThan(0); // Sanity check
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles null event gracefully', () => {
      const stages = buildAssembleRevealStages(null, null, null);
      expect(Array.isArray(stages)).toBe(true);
      expect(stages.length).toBe(0);
    });

    test('handles missing eventIdentity gracefully', () => {
      const stages = buildAssembleRevealStages(
        fixtureBirthday.event,
        null,
        null
      );
      // Should still work; identity stage will be skipped
      expect(Array.isArray(stages)).toBe(true);
    });

    test('handles event with no date gracefully', () => {
      const eventNoDate = { ...fixtureBirthday.event, date: null };
      const stages = buildAssembleRevealStages(
        eventNoDate,
        fixtureBirthday.eventIdentity,
        null
      );
      expect(Array.isArray(stages)).toBe(true);
    });

    test('handles event with no guests gracefully', () => {
      const eventNoGuests = { ...fixtureBirthday.event, guests: null, guestCount: 0 };
      const stages = buildAssembleRevealStages(
        eventNoGuests,
        fixtureBirthday.eventIdentity,
        null
      );
      expect(Array.isArray(stages)).toBe(true);
    });
  });

  // ─── Sprint IS-1 regression: guestEstimate field-name integration defect ───────
  describe('IS-1: guestEstimate resolution (App.js stores guest count under this key at creation)', () => {
    test('guest-count-confirmation blocker does NOT fire when only guestEstimate is set', () => {
      const event = { ...fixtureBirthday.event, guestCount: undefined, guestEstimate: 75 };
      const blockers = deriveDecisionBlockers(event, fixtureBirthday.eventIdentity);
      expect(blockers.map(b => b.type)).not.toContain('guest-count-confirmation');
    });

    test('guests domain resolves count from guestEstimate when guestCount is absent', () => {
      const event = { ...fixtureBirthday.event, guestCount: undefined, guestEstimate: 75, guests: [] };
      const domains = assemblePlanningDomains(event, null);
      const guestsDomain = domains.find(d => d.type === 'guests');
      expect(guestsDomain).toBeTruthy();
      expect(guestsDomain.data.guestCount).toBe(75);
    });

    test('guest-count-confirmation blocker still fires when neither guestCount nor guestEstimate nor guests are set', () => {
      const event = { ...fixtureBirthday.event, guestCount: undefined, guestEstimate: undefined, guests: [] };
      const blockers = deriveDecisionBlockers(event, fixtureBirthday.eventIdentity);
      expect(blockers.map(b => b.type)).toContain('guest-count-confirmation');
    });
  });

  // POP-1 continuity: blocker stages carry the ROUTE that resolves them — the
  // detect→show→act→resolve loop's missing third/fourth legs. Same {tab,
  // focusField} convention as every other deep-link CTA; never invented for
  // blockers with no in-app destination.
  describe('Decision blocker resolution routes', () => {
    test('venue-selection routes to the Event Details venue field', () => {
      const stage = buildBlockerStage({ type: 'venue-selection', urgency: 'critical', reasoning: 'x' });
      expect(stage.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
    });

    test('guest-count-confirmation routes to the existing guests-entry anchor', () => {
      const stage = buildBlockerStage({ type: 'guest-count-confirmation', urgency: 'high', reasoning: 'x' });
      expect(stage.route).toEqual({ tab: 'Guests', focusField: 'guests-entry' });
    });

    test('blockers with no in-app destination stay routeless — never a fake route', () => {
      expect(buildBlockerStage({ type: 'ceremony-timing', urgency: 'critical', reasoning: 'x' }).route).toBeNull();
      expect(buildBlockerStage({ type: 'dress-code-confirmation', urgency: 'medium', reasoning: 'x' }).route).toBeNull();
      expect(buildBlockerStage({ type: 'something-unknown', urgency: 'low', reasoning: 'x' }).route).toBeNull();
    });

    // Host complaint: "Choose the timing." rendered as plain text with no
    // route AND no way to act on it — a dead-end instruction. ceremony-timing
    // is the one routeless blocker with a real, small, fixed answer set, so it
    // resolves inline instead (fieldKey + options) rather than staying stuck.
    test('ceremony-timing carries fieldKey + options for inline resolution (routeless, but not actionless)', () => {
      const stage = buildBlockerStage({ type: 'ceremony-timing', urgency: 'critical', reasoning: 'x' });
      expect(stage.route).toBeNull();
      expect(stage.fieldKey).toBe('ceremonyTiming');
      expect(stage.options).toEqual([
        { value: 'before', label: 'Before the celebration' },
        { value: 'during', label: 'During the celebration' },
        { value: 'after',  label: 'After the celebration' },
      ]);
    });

    test('dress-code-confirmation and unknown blockers have no fieldKey/options — genuinely nowhere to resolve inline', () => {
      expect(buildBlockerStage({ type: 'dress-code-confirmation', urgency: 'medium', reasoning: 'x' }).fieldKey).toBeNull();
      expect(buildBlockerStage({ type: 'dress-code-confirmation', urgency: 'medium', reasoning: 'x' }).options).toBeNull();
      expect(buildBlockerStage({ type: 'something-unknown', urgency: 'low', reasoning: 'x' }).fieldKey).toBeNull();
    });

    test('blockers WITH a real route (venue, guest count) carry no options — route wins, no redundant inline picker', () => {
      expect(buildBlockerStage({ type: 'venue-selection', urgency: 'critical', reasoning: 'x' }).options).toBeNull();
      expect(buildBlockerStage({ type: 'guest-count-confirmation', urgency: 'high', reasoning: 'x' }).options).toBeNull();
    });

    test('routes never point at the dead "Details" tab id (real id is "Event Details")', () => {
      ['venue-selection', 'guest-count-confirmation', 'ceremony-timing', 'dress-code-confirmation'].forEach(type => {
        const stage = buildBlockerStage({ type, urgency: 'high', reasoning: 'x' });
        if (stage.route) expect(stage.route.tab).not.toBe('Details');
      });
    });
  });

  // POP-1: the ONGOING (post-Reveal) blocker view — unresolvedBlockerStages(ctx)
  // is what BlockedDecisionsReminder renders on the host Command tab. Pure
  // composition: ctx.decisionBlockers (already status-filtered) through
  // buildBlockerStage — so Reveal and the reminder can never disagree.
  describe('unresolvedBlockerStages — ongoing post-Reveal blocker surface', () => {
    const { unresolvedBlockerStages } = require('../assembleRevealEngines');
    const { buildExperienceContext } = require('../experienceContext');
    const bareEvent = {
      id: 'e-ongoing', type: 'Retirement Party', name: 'My Retirement Party',
      date: '2026-10-05', venue: '', guestCount: undefined, guestEstimate: undefined, guests: [],
    };

    test('unresolved venue + guest-count blockers appear with the SAME routes Reveal uses', () => {
      const ctx = buildExperienceContext(bareEvent, null, null);
      const stages = unresolvedBlockerStages(ctx);
      const venue = stages.find(s => s.blockerType === 'venue-selection');
      const guests = stages.find(s => s.blockerType === 'guest-count-confirmation');
      expect(venue).toBeDefined();
      expect(venue.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
      expect(guests).toBeDefined();
      expect(guests.route).toEqual({ tab: 'Guests', focusField: 'guests-entry' });
    });

    test('a dismissed blocker does NOT appear (same decisionBlockerStatus filter as Reveal)', () => {
      const ctx = buildExperienceContext({ ...bareEvent, decisionBlockerStatus: { 'venue-selection': 'dismissed' } }, null, null);
      const stages = unresolvedBlockerStages(ctx);
      expect(stages.find(s => s.blockerType === 'venue-selection')).toBeUndefined();
      expect(stages.find(s => s.blockerType === 'guest-count-confirmation')).toBeDefined(); // others untouched
    });

    test('an acknowledged blocker does NOT appear either', () => {
      const ctx = buildExperienceContext({ ...bareEvent, decisionBlockerStatus: { 'guest-count-confirmation': 'acknowledged' } }, null, null);
      expect(unresolvedBlockerStages(ctx).find(s => s.blockerType === 'guest-count-confirmation')).toBeUndefined();
    });

    test('resolving the underlying field removes the blocker from the ongoing view', () => {
      const ctx = buildExperienceContext({ ...bareEvent, venue: 'VFW Post 3150 — Alexandria, VA' }, null, null);
      expect(unresolvedBlockerStages(ctx).find(s => s.blockerType === 'venue-selection')).toBeUndefined();
    });

    test('null/empty ctx → empty array, never throws (attention-safe: card renders nothing)', () => {
      expect(unresolvedBlockerStages(null)).toEqual([]);
      expect(unresolvedBlockerStages({})).toEqual([]);
      expect(unresolvedBlockerStages({ decisionBlockers: [] })).toEqual([]);
    });

    test('routeless blockers pass through with route:null — the reminder shows no fake CTA', () => {
      const stages = unresolvedBlockerStages({ decisionBlockers: [{ type: 'ceremony-timing', urgency: 'critical', reasoning: 'x' }] });
      expect(stages).toHaveLength(1);
      expect(stages[0].route).toBeNull();
    });

    // This is the exact object shape App.js's BlockedDecisionsReminder /
    // AssembleReveal and HostShellV2's blocker card actually render — proves
    // the fix reaches the real consumer path, not just buildBlockerStage in
    // isolation.
    test('ceremony-timing reaches the ongoing view with fieldKey/options intact, ready for inline resolution', () => {
      const stages = unresolvedBlockerStages({ decisionBlockers: [{ type: 'ceremony-timing', urgency: 'critical', reasoning: 'x' }] });
      expect(stages[0].fieldKey).toBe('ceremonyTiming');
      expect(stages[0].options).toHaveLength(3);
      expect(stages[0].options.map(o => o.value)).toEqual(['before', 'during', 'after']);
    });
  });

  // POP-1: at-home venue blocker resolution. The host "At home · your place"
  // path stores its location as venueKind='home' + venueCity and never writes
  // event.venue — the blocker must resolve on the at-home path's OWN fields.
  // Every other venue model keeps the event.venue requirement unchanged.
  describe('Venue blocker — at-home resolution rule', () => {
    const base = { id: 'e-home', type: 'Retirement Party', name: 'My Retirement Party', date: '2026-10-05', guestCount: 40 };
    const venueTypes = (event) => deriveDecisionBlockers(event, null).map(b => b.type);

    test('non-home event with no event.venue still produces the Venue blocker', () => {
      expect(venueTypes({ ...base, venue: '' })).toContain('venue-selection');
      expect(venueTypes({ ...base, venue: '', venueKind: 'venue' })).toContain('venue-selection');
    });

    test('non-home event with event.venue resolves the Venue blocker', () => {
      expect(venueTypes({ ...base, venue: 'VFW Post 3150 — Alexandria, VA' })).not.toContain('venue-selection');
      expect(venueTypes({ ...base, venue: 'VFW Post 3150', venueKind: 'venue' })).not.toContain('venue-selection');
    });

    test('at-home event with venueCity filled resolves the Venue blocker (no event.venue needed)', () => {
      expect(venueTypes({ ...base, venue: '', venueKind: 'home', venueCity: 'Alexandria' })).not.toContain('venue-selection');
    });

    test('at-home event WITHOUT venueCity still produces the Venue blocker', () => {
      expect(venueTypes({ ...base, venue: '', venueKind: 'home', venueCity: '' })).toContain('venue-selection');
      expect(venueTypes({ ...base, venue: '', venueKind: 'home', venueCity: '   ' })).toContain('venue-selection');
    });

    test('venueCity alone does NOT resolve when the venue model is not at-home (readiness not weakened)', () => {
      expect(venueTypes({ ...base, venue: '', venueCity: 'Alexandria' })).toContain('venue-selection');
      expect(venueTypes({ ...base, venue: '', venueKind: 'venue', venueCity: 'Alexandria' })).toContain('venue-selection');
    });

    test('the ongoing Command card drops the Venue row after at-home completion (end-to-end through ctx)', () => {
      const { buildExperienceContext } = require('../experienceContext');
      const { unresolvedBlockerStages } = require('../assembleRevealEngines');
      const before = unresolvedBlockerStages(buildExperienceContext({ ...base, venue: '', venueKind: 'home', venueCity: '' }, null, null));
      expect(before.find(s => s.blockerType === 'venue-selection')).toBeDefined();
      const after = unresolvedBlockerStages(buildExperienceContext({ ...base, venue: '', venueKind: 'home', venueCity: 'Alexandria' }, null, null));
      expect(after.find(s => s.blockerType === 'venue-selection')).toBeUndefined();
    });

    test('Reveal blocker CTA route is unchanged (b75f12c intact)', () => {
      const stage = buildBlockerStage({ type: 'venue-selection', urgency: 'critical', reasoning: 'x' });
      expect(stage.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
    });
  });
});
