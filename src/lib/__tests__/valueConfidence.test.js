// Sprint 57K — Value-Level Confidence. Proves: provenance-driven classification
// into EXACTLY the five Pattern-014 levels; derived quantities = Likely (count
// final) / Estimated; guest-count value = Known/Estimated/Unknown; venue facts =
// Needs Verification; DEFERRED (budget, unobservable provenance) never classified;
// user counts intentionally unclassified (no spam); per-persona word; flag gate.

import { valueConfidenceOn, valueConfidenceActive, valueConfidence, valueWord, VALUE_LEVELS, DEFERRED_VALUES, VALUE_WORDS } from '../valueConfidence';

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57K flag gate', () => {
  test('default OFF', () => { expect(valueConfidenceOn()).toBe(false); expect(valueConfidenceActive()).toBe(false); });
  test('ON via localStorage', () => { localStorage.setItem('ngw-pi-valueConfidence', '1'); expect(valueConfidenceActive()).toBe(true); });
});

describe('57K exactly five Pattern-014 levels (no scores/percentages/extra)', () => {
  test('VALUE_LEVELS is the five', () => {
    expect(VALUE_LEVELS).toEqual(['known', 'likely', 'estimated', 'needs_verification', 'unknown']);
  });
  test('every level has all three persona words', () => {
    VALUE_LEVELS.forEach((lvl) => ['host', 'operator', 'planner'].forEach((p) => expect(VALUE_WORDS[lvl][p]).toBeTruthy()));
  });
});

describe('57K derived quantities — Likely when count final, else Estimated', () => {
  test('capacity Likely when guest count resolved', () => {
    const ev = { guestCount: 3, guests: [{ rsvp: 'Yes' }, { rsvp: 'Yes' }, { rsvp: 'Yes' }] };
    expect(valueConfidence('capacity', ev)).toBe('likely');
  });
  test('capacity Estimated when count is unresolved / estimate-only', () => {
    expect(valueConfidence('capacity', { guests: [{ rsvp: 'Yes' }, { rsvp: 'Maybe' }] })).toBe('estimated');
    expect(valueConfidence('capacity', { guestEstimate: '20' })).toBe('estimated');
  });
});

describe('57K guest-count value provenance', () => {
  test('Known (resolved) / Estimated (pending) / Unknown (none)', () => {
    expect(valueConfidence('guestCount', { guestCount: 2, guests: [{ rsvp: 'Yes' }, { rsvp: 'Yes' }] })).toBe('known');
    expect(valueConfidence('guestCount', { guests: [{ rsvp: 'Yes' }, { rsvp: '' }] })).toBe('estimated');
    expect(valueConfidence('guestCount', {})).toBe('unknown');
  });
});

describe('57K honesty guards', () => {
  test('venue facts ⇒ Needs Verification (AP-005, never asserted)', () => {
    expect(valueConfidence('venueCapacity', { venue: 'VFW Hall' })).toBe('needs_verification');
  });
  test('budget is DEFERRED — provenance not persisted ⇒ never classified', () => {
    expect(DEFERRED_VALUES).toContain('budget');
    expect(valueConfidence('budget', { budget: [{ budgeted: 500 }] })).toBeNull();
  });
  test('user-entered counts are intentionally unclassified (no confidence spam)', () => {
    expect(valueConfidence('vendors', { vendors: [{}] })).toBeNull();
    expect(valueConfidence('staffing', { crew: [{}] })).toBeNull();
  });
  test('null event safe', () => { expect(valueConfidence('capacity', null)).toBeNull(); });
});

describe('57K persona word (no level fork)', () => {
  test('same level, different word per persona', () => {
    expect(valueWord('likely', { audience: 'self_family' })).toBe('Likely');
    expect(valueWord('estimated', { audience: 'self_family' })).toBe('About');
    expect(valueWord('estimated', { audience: 'client' })).toBe('Estimated');
    expect(valueWord('needs_verification', { audience: 'client' })).toBe('Needs verification');
    expect(valueWord(null, {})).toBe('');
  });
});
