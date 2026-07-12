// ─── Event Identity Engine tests ─────────────────────────────────────────────
// resolveEventIdentity() is LIVE — it powers lib/experienceContext.js (the
// canonical Experience Context every host surface reads). These tests were
// extracted from the retired sprintAEngines.test.js when Sprint A's parked
// resolvePersona()/resolveShell() engines were deleted (IS-2 ruling: dead under
// host-only; no non-test callers). Coverage kept:
// - core identity resolution (compound/ceremony/participants/confidence)
// - complexity classification matrix
// - flagship validation (50th Birthday + Military Retirement) — identity fields
// - identity-only edge cases
// (Persona/shell routing tests were deleted with their engines; see also
// is1NameStripping.test.js for the free-text name-stripping coverage.)

import { resolveEventIdentity, EVENT_COMPLEXITY } from '../eventIdentityEngine';

describe('Event Identity Engine', () => {
  describe('resolveEventIdentity', () => {
    test('detects simple birthday as simple complexity', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Planning my birthday party'
      );
      expect(identity.primaryEventType).toBe('Birthday');
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.SIMPLE);
      expect(identity.isCompound).toBe(false);
    });

    test('detects 50th birthday + military retirement as compound', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Planning my 50th birthday party. Also celebrating my retirement from the Navy after 30 years.'
      );
      expect(identity.primaryEventType).toBe('Birthday');
      expect(identity.secondaryEventTypes).toContain('retirement');
      expect(identity.secondaryEventTypes).toContain('military-retirement');
      expect(identity.isCompound).toBe(true);
      expect(identity.requiresMerge).toBe(true);
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.COMPOUND);
    });

    // The reverse direction of the test above: a Retirement Party (primary)
    // that's ALSO someone's milestone birthday (secondary, in free text).
    // Before this fix, detectMilestones had no 'birthday' keyword at all, so
    // this exact real-world shape (the app's own canonical flagship test
    // event — see project memory) could never register as compound, which
    // meant the ceremony-timing blocker could never fire for it either.
    test('detects retirement party + 50th birthday as compound (reverse of the Birthday-primary case)', () => {
      const identity = resolveEventIdentity(
        {},
        'Retirement Party',
        'self',
        "Planning my mom's retirement celebration — it's also her 50th birthday."
      );
      expect(identity.primaryEventType).toBe('Retirement Party');
      expect(identity.secondaryEventTypes).toContain('birthday');
      expect(identity.isCompound).toBe(true);
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.COMPOUND);
    });

    test('a Birthday-primary event describing itself does not falsely register birthday as a secondary milestone', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Planning her birthday party — turning 50 this year.'
      );
      expect(identity.secondaryEventTypes).not.toContain('birthday');
      expect(identity.isCompound).toBe(false);
    });

    test('detects military ceremony components', () => {
      const identity = resolveEventIdentity(
        {},
        'Retirement Party',
        'self',
        'Celebrating my retirement from the Navy with a military ceremony'
      );
      expect(identity.ceremonyComponents).toContain('ceremony');
      expect(identity.ceremonyComponents).toContain('military-ceremony');
      expect(identity.ceremonyComponents).toContain('formal-salute');
    });

    test('detects participant groups correctly', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Birthday party with family, friends, and Navy colleagues'
      );
      expect(identity.participants).toContain('immediate-family');
      expect(identity.participants).toContain('friends');
      expect(identity.participants).toContain('military-colleagues');
    });

    test('identifies missing clarifying questions for compound events', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Celebrating birthday and retirement but need to figure out timing'
      );
      expect(identity.missingClarifyingQuestions.length).toBeGreaterThan(0);
      expect(identity.missingClarifyingQuestions[0]).toContain('same day');
    });

    test('assigns confidence based on text quality', () => {
      const shortIdentity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'birthday'
      );
      const longIdentity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Planning a 50th birthday celebration with military retirement ceremony, family, and colleagues'
      );
      expect(longIdentity.confidence).toBeGreaterThan(shortIdentity.confidence);
    });

    test('generates canonical description', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'My 50th birthday and retirement party'
      );
      expect(identity.canonicalDescription).toContain('Birthday');
      expect(identity.canonicalDescription).toContain('+');
    });

    test('includes knowledge domains needed for planning', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        '50th birthday with military retirement'
      );
      expect(identity.knowledgeDomains).toContain('birthday-celebration');
      expect(identity.knowledgeDomains).toContain('military-ceremony');
      expect(identity.knowledgeDomains).toContain('catering');
      expect(identity.knowledgeDomains).toContain('photography');
    });
  });

  describe('Event Complexity Classification', () => {
    test('simple: backyard BBQ', () => {
      const identity = resolveEventIdentity(
        {},
        'Get-Together',
        'self',
        'Backyard BBQ with a few friends'
      );
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.SIMPLE);
    });

    test('standard: 75-person birthday party', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'Birthday party for about 75 people at a rented venue'
      );
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.STANDARD);
    });

    test('compound: birthday + retirement', () => {
      const identity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        '50th birthday and military retirement celebration'
      );
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.COMPOUND);
    });

    test('multi-day: wedding with rehearsal dinner', () => {
      const identity = resolveEventIdentity(
        {},
        'Wedding',
        'self',
        'Wedding with rehearsal dinner the night before and reception the next day'
      );
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.MULTI_DAY);
    });

    test('enterprise: conference with 500 attendees', () => {
      const identity = resolveEventIdentity(
        {},
        'Conference',
        'corporate',
        '500-person conference with formal governance and permits'
      );
      expect(identity.complexity).toBe(EVENT_COMPLEXITY.ENTERPRISE);
    });
  });
});

describe('Flagship Validation - 50th Birthday + Military Retirement (identity fields)', () => {
  const flagshipIdentity = () => resolveEventIdentity(
    {},
    'Birthday',
    'self',
    'Celebrating my 50th birthday and military retirement from the Navy after 30 years of service'
  );

  test('flagship: event identity resolves correctly', () => {
    const eventIdentity = flagshipIdentity();
    expect(eventIdentity.primaryEventType).toBe('Birthday');
    expect(eventIdentity.secondaryEventTypes).toContain('retirement');
    expect(eventIdentity.secondaryEventTypes).toContain('military-retirement');
    expect(eventIdentity.isCompound).toBe(true);
    expect(eventIdentity.complexity).toBe(EVENT_COMPLEXITY.COMPOUND);
    expect(eventIdentity.requiresMerge).toBe(true);
  });

  test('flagship: event identity includes military components', () => {
    const eventIdentity = flagshipIdentity();
    expect(eventIdentity.ceremonyComponents).toContain('military-ceremony');
    expect(eventIdentity.ceremonyComponents).toContain('formal-salute');
    expect(eventIdentity.recognitionComponents).toContain('military-service-honor');
  });

  test('flagship: event identity includes correct participant groups', () => {
    const eventIdentity = flagshipIdentity();
    expect(eventIdentity.participants).toContain('immediate-family');
    expect(eventIdentity.participants).toContain('military-colleagues');
  });

  test('flagship: knowledge domains include military protocol', () => {
    const eventIdentity = flagshipIdentity();
    expect(eventIdentity.knowledgeDomains).toContain('military-ceremony');
    expect(eventIdentity.knowledgeDomains).toContain('ceremony-protocol');
  });
});

describe('Event Identity Engine: Edge Cases', () => {
  test('empty input still returns a well-formed identity', () => {
    const eventIdentity = resolveEventIdentity({}, 'Other', null, '');
    expect(eventIdentity).toBeTruthy();
    expect(eventIdentity.isCompound).toBe(false);
    expect(eventIdentity.confidence).toBeGreaterThan(0);
    expect(eventIdentity.confidence).toBeLessThanOrEqual(0.95);
  });

  test('multiple conjunctions detected as compound', () => {
    const eventIdentity = resolveEventIdentity({}, 'Birthday', 'self', 'Birthday and retirement and anniversary');
    expect(eventIdentity.isCompound).toBe(true);
    expect(eventIdentity.secondaryEventTypes.length).toBeGreaterThan(1);
  });

  test('confidence caps at 0.95', () => {
    const eventIdentity = resolveEventIdentity(
      {},
      'Birthday',
      'self',
      'A very detailed birthday party description with all the information about the celebration and the ceremony and the milestones'
    );
    expect(eventIdentity.confidence).toBeLessThanOrEqual(0.95);
  });
});
