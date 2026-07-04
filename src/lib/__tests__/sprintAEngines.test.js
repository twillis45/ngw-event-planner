// ─── Sprint A: Event Identity + Persona Resolution + Shell Resolver Tests ─
// Tests the three foundational engines with:
// - 19-scenario regression matrix (misrouted host events)
// - Flagship validation: 50th Birthday + Military Retirement
// - Edge cases and fallbacks

import { resolveEventIdentity, EVENT_COMPLEXITY } from '../eventIdentityEngine';
import { resolvePersona, PERSONAS } from '../personaResolutionEngine';
import { resolveShell, SHELLS } from '../shellResolver';

describe('Sprint A: Event Identity Engine', () => {
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

describe('Sprint A: Persona Resolution Engine', () => {
  describe('resolvePersona', () => {
    test('simple personal event with self-relationship → host', () => {
      const eventIdentity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        'My birthday party'
      );
      const persona = resolvePersona(eventIdentity, { role: 'individual' }, 'self', {});
      expect(persona.persona).toBe(PERSONAS.HOST);
      expect(persona.confidence).toBeGreaterThan(0.80);
    });

    test('compound event with self-planning → host', () => {
      const eventIdentity = resolveEventIdentity(
        {},
        'Birthday',
        'self',
        '50th birthday and military retirement'
      );
      const persona = resolvePersona(eventIdentity, { role: 'individual' }, 'self', {});
      expect(persona.persona).toBe(PERSONAS.HOST);
      expect(persona.confidence).toBeGreaterThanOrEqual(0.85);
    });

    test('corporate event → corporate persona', () => {
      const eventIdentity = resolveEventIdentity(
        {},
        'Conference',
        'corporate',
        '500-person conference'
      );
      const persona = resolvePersona(eventIdentity, { role: 'business' }, 'corporate', {});
      expect(persona.persona).toBe(PERSONAS.CORPORATE);
      expect(persona.confidence).toBeGreaterThan(0.80);
    });

    test('professional planner account → planner persona', () => {
      const eventIdentity = resolveEventIdentity(
        {},
        'Wedding',
        'client',
        'Wedding for a client with ceremony'
      );
      const persona = resolvePersona(eventIdentity, { role: 'professional_planner' }, 'client', {});
      expect(persona.persona).toBe(PERSONAS.PLANNER);
      expect(persona.confidence).toBeGreaterThan(0.70);
    });

    test('explicit override wins over all rules', () => {
      const eventIdentity = resolveEventIdentity({}, 'Birthday', 'self', 'My birthday');
      const persona = resolvePersona(
        eventIdentity,
        { role: 'individual' },
        'self',
        { explicitPersonaOverride: PERSONAS.PLANNER }
      );
      expect(persona.persona).toBe(PERSONAS.PLANNER);
      expect(persona.confidence).toBe(1.0);
      expect(persona.appliedRule).toBe('explicit_override');
    });

    test('military ceremony personal event detects host', () => {
      const eventIdentity = resolveEventIdentity(
        {},
        'Retirement Party',
        'self',
        'Military retirement ceremony for my father'
      );
      const persona = resolvePersona(eventIdentity, { role: 'individual' }, 'family', {});
      expect(persona.persona).toBe(PERSONAS.HOST);
    });

    test('fallback: unknown event defaults to host', () => {
      const eventIdentity = resolveEventIdentity({}, 'Other', null, 'Some event');
      const persona = resolvePersona(eventIdentity, null, null, {});
      expect(persona.persona).toBe(PERSONAS.HOST);
    });
  });
});

describe('Sprint A: Shell Resolver', () => {
  test('host persona → host shell', () => {
    const result = resolveShell({}, PERSONAS.HOST);
    expect(result.shell).toBe(SHELLS.HOST);
    expect(result.confidence).toBeGreaterThan(0.90);
  });

  test('planner persona → planner shell', () => {
    const result = resolveShell({}, PERSONAS.PLANNER);
    expect(result.shell).toBe(SHELLS.PLANNER);
  });

  test('corporate persona → corporate shell', () => {
    const result = resolveShell({}, PERSONAS.CORPORATE);
    expect(result.shell).toBe(SHELLS.CORPORATE);
  });

  test('deterministic routing is high confidence', () => {
    const result = resolveShell({}, PERSONAS.HOST);
    expect(result.appliedRule).toBe('deterministic_routing');
    expect(result.confidence).toBe(0.95);
  });
});

describe('Sprint A: Flagship Validation - 50th Birthday + Military Retirement', () => {
  const flagshipScenario = () => {
    const eventIdentity = resolveEventIdentity(
      {},
      'Birthday',
      'self',
      'Celebrating my 50th birthday and military retirement from the Navy after 30 years of service'
    );

    const accountProfile = {
      role: 'individual',
      name: 'John Smith'
    };

    const persona = resolvePersona(eventIdentity, accountProfile, 'self', {});
    const shell = resolveShell(eventIdentity, persona.persona);

    return { eventIdentity, persona, shell };
  };

  test('flagship: event identity resolves correctly', () => {
    const { eventIdentity } = flagshipScenario();
    expect(eventIdentity.primaryEventType).toBe('Birthday');
    expect(eventIdentity.secondaryEventTypes).toContain('retirement');
    expect(eventIdentity.secondaryEventTypes).toContain('military-retirement');
    expect(eventIdentity.isCompound).toBe(true);
    expect(eventIdentity.complexity).toBe(EVENT_COMPLEXITY.COMPOUND);
    expect(eventIdentity.requiresMerge).toBe(true);
  });

  test('flagship: persona resolves to host', () => {
    const { persona } = flagshipScenario();
    expect(persona.persona).toBe(PERSONAS.HOST);
    expect(persona.confidence).toBeGreaterThanOrEqual(0.85);
  });

  test('flagship: shell resolves to host shell', () => {
    const { shell } = flagshipScenario();
    expect(shell.shell).toBe(SHELLS.HOST);
    expect(shell.confidence).toBeGreaterThan(0.90);
  });

  test('flagship: event identity includes military components', () => {
    const { eventIdentity } = flagshipScenario();
    expect(eventIdentity.ceremonyComponents).toContain('military-ceremony');
    expect(eventIdentity.ceremonyComponents).toContain('formal-salute');
    expect(eventIdentity.recognitionComponents).toContain('military-service-honor');
  });

  test('flagship: event identity includes correct participant groups', () => {
    const { eventIdentity } = flagshipScenario();
    expect(eventIdentity.participants).toContain('immediate-family');
    expect(eventIdentity.participants).toContain('military-colleagues');
  });

  test('flagship: knowledge domains include military protocol', () => {
    const { eventIdentity } = flagshipScenario();
    expect(eventIdentity.knowledgeDomains).toContain('military-ceremony');
    expect(eventIdentity.knowledgeDomains).toContain('ceremony-protocol');
  });
});

describe('Sprint A: 19-Scenario Regression Matrix', () => {
  const scenarios = [
    { id: 1, input: 'Planning my 50th birthday', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 2, input: 'My family reunion next month', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 3, input: "Kids' graduation party", relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 4, input: 'Baby shower for my cousin', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 5, input: 'Anniversary dinner at home', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 6, input: 'Crab feast at our beach house', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 7, input: "Retirement party for my dad", relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 8, input: 'Neighborhood block party', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 9, input: 'Housewarming BBQ', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 10, input: "Sweet 16 for my daughter", relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 11, input: 'Engagement party (family)', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 12, input: 'Bridal shower at my house', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 13, input: '50th birthday + retirement', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 14, input: 'Wedding reception (family)', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 15, input: 'Graduation + family reunion', relationship: 'family', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 16, input: 'Holiday party at home', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 17, input: 'Charity fundraiser (volunteer)', relationship: 'volunteer', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 18, input: 'Open house (personal)', relationship: 'self', expectedPersona: PERSONAS.HOST, expectedShell: SHELLS.HOST },
    { id: 19, input: 'Company retreat for internal team employees', relationship: 'corporate', expectedPersona: PERSONAS.CORPORATE, expectedShell: SHELLS.CORPORATE }
  ];

  scenarios.forEach(scenario => {
    test(`Scenario ${scenario.id}: ${scenario.input}`, () => {
      // Determine event type based on scenario
      let eventType = 'Birthday';
      if (scenario.id === 19) eventType = 'Team Retreat'; // Corporate scenario

      const eventIdentity = resolveEventIdentity({}, eventType, scenario.relationship, scenario.input);
      const accountProfile = scenario.id === 19 ? { role: 'business' } : { role: 'individual' };
      const persona = resolvePersona(eventIdentity, accountProfile, scenario.relationship, {});
      const shell = resolveShell(eventIdentity, persona.persona);

      expect(persona.persona).toBe(scenario.expectedPersona);
      expect(shell.shell).toBe(scenario.expectedShell);
    });
  });
});

describe('Sprint A: Edge Cases', () => {
  test('empty input defaults gracefully', () => {
    const eventIdentity = resolveEventIdentity({}, 'Other', null, '');
    const persona = resolvePersona(eventIdentity, null, null, {});
    expect(persona.persona).toBe(PERSONAS.HOST);
    expect(persona.confidence).toBeLessThan(0.50);
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
