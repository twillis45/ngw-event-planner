// F4: Assemble Reveal Test Fixtures
// 7 golden scenarios for comprehensive testing
// Jest requires at least one test in files it discovers — this file is a fixture module.
test('fixture module loads', () => { expect(true).toBe(true); });

export const fixture50thPlusMilitary = {
  event: {
    id: 'evt-50-mil',
    name: '50th Birthday + Military Retirement',
    type: 'Birthday',
    date: '2026-08-15',
    freeText: 'Celebrating my 50th birthday and military retirement from the Navy after 30 years of service',
    guestCount: 85,
    venue: 'Naval Officer\'s Club',
    timeline: [],
    guests: [],
    budget: [],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Birthday',
    secondaryEventTypes: ['retirement', 'military-retirement'],
    complexity: 'compound',
    isCompound: true,
    ceremonyComponents: ['military-ceremony', 'formal-salute'],
    recognitionComponents: ['military-service-honor'],
    participants: ['immediate-family', 'military-colleagues'],
    knowledgeDomains: ['birthday-celebration', 'military-ceremony', 'ceremony-protocol'],
    confidence: 0.92
  },
  expectedStageKeys: ['identity', 'blocker-ceremony-timing', 'timeline', 'food', 'shopping']
};

export const fixtureBirthday = {
  event: {
    id: 'evt-bday',
    name: 'Birthday Party',
    type: 'Birthday',
    date: '2026-08-20',
    freeText: 'Planning my 40th birthday party',
    guestCount: 50,
    venue: 'Home',
    timeline: [],
    guests: [],
    budget: [],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Birthday',
    secondaryEventTypes: [],
    complexity: 'standard',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: [],
    participants: ['immediate-family'],
    knowledgeDomains: ['birthday-celebration', 'catering'],
    confidence: 0.85
  },
  expectedStageKeys: ['identity', 'timeline', 'food', 'shopping']
};

export const fixtureRetirement = {
  event: {
    id: 'evt-ret',
    name: 'Retirement Party',
    type: 'Retirement Party',
    date: '2026-09-10',
    freeText: 'Retirement party for my father',
    guestCount: 75,
    venue: 'Country Club',
    timeline: [],
    guests: [],
    budget: [],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Retirement Party',
    secondaryEventTypes: [],
    complexity: 'standard',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: ['career-retirement-recognition'],
    participants: ['immediate-family', 'coworkers'],
    knowledgeDomains: ['retirement-planning', 'catering'],
    confidence: 0.8
  },
  expectedStageKeys: ['identity', 'timeline', 'food']
};

export const fixtureGraduation = {
  event: {
    id: 'evt-grad',
    name: 'Graduation Party',
    type: 'Graduation',
    date: '2026-06-15',
    freeText: 'College graduation celebration',
    guestCount: 120,
    venue: 'Rooftop Restaurant',
    timeline: [],
    guests: [],
    budget: [{ budgeted: 2500 }],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Graduation',
    secondaryEventTypes: [],
    complexity: 'standard',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: [],
    participants: ['immediate-family', 'friends'],
    knowledgeDomains: ['birthday-celebration', 'catering'],
    confidence: 0.8
  },
  expectedStageKeys: ['identity', 'timeline', 'food', 'budget']
};

export const fixtureCrabFeast = {
  event: {
    id: 'evt-crab',
    name: 'Crab Feast',
    type: 'Crab Feast',
    date: '2026-07-20',
    freeText: 'Summer crab feast at our beach house',
    guestCount: 30,
    venue: 'Beach House',
    timeline: [],
    guests: [],
    budget: [],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Crab Feast',
    secondaryEventTypes: [],
    complexity: 'simple',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: [],
    participants: ['immediate-family', 'friends'],
    knowledgeDomains: ['catering'],
    confidence: 0.85
  },
  expectedStageKeys: ['identity', 'timeline', 'food', 'shopping']
};

export const familyReunion = {
  event: {
    id: 'evt-reunion',
    name: 'Family Reunion',
    type: 'Reunion',
    date: '2026-07-15',
    freeText: 'Family reunion with 60+ extended family members',
    guestCount: 65,
    venue: 'Park Pavilion',
    timeline: [],
    guests: [],
    budget: [],
    vendors: []
  },
  eventIdentity: {
    primaryEventType: 'Reunion',
    secondaryEventTypes: ['family-reunion'],
    complexity: 'standard',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: [],
    participants: ['immediate-family', 'extended-family'],
    knowledgeDomains: ['catering', 'guest-management'],
    confidence: 0.82
  },
  expectedStageKeys: ['identity', 'timeline', 'guests', 'food']
};

export const anniversary = {
  event: {
    id: 'evt-anniv',
    name: '25th Anniversary',
    type: 'Anniversary',
    date: '2026-08-10',
    freeText: 'Celebrating 25 years of marriage with dinner and vendors',
    guestCount: 0,
    venue: 'Restaurant',
    timeline: [],
    guests: [],
    budget: [],
    vendors: [{ id: 'v1', name: 'Chef James Catering', status: 'Booked' }]
  },
  eventIdentity: {
    primaryEventType: 'Anniversary',
    secondaryEventTypes: [],
    complexity: 'simple',
    isCompound: false,
    ceremonyComponents: [],
    recognitionComponents: [],
    participants: ['immediate-family'],
    knowledgeDomains: ['catering'],
    confidence: 0.8
  },
  expectedStageKeys: ['identity', 'blocker-guest-count-confirmation', 'vendors']
};

export const allFixtures = [
  { name: '50th Birthday + Military Retirement', ...fixture50thPlusMilitary },
  { name: 'Birthday', ...fixtureBirthday },
  { name: 'Retirement', ...fixtureRetirement },
  { name: 'Graduation', ...fixtureGraduation },
  { name: 'Crab Feast', ...fixtureCrabFeast },
  { name: 'Family Reunion', ...familyReunion },
  { name: 'Anniversary', ...anniversary }
];
