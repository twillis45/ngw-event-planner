// Sprint 57G — Confidence Grammar (Pattern 014). Proves: classify by the EXISTING
// statusLabel + note (no new calc); split ON TRACK / AT RISK by data-presence so
// "no data" reads UNKNOWN (steel), never false-green/false-red; per-persona words;
// flag default OFF.

import { confidenceOn, confidencePersona, classifyLevel, confidenceFor, CONFIDENCE_WORDS } from '../confidenceGrammar';

const HOST = { audience: 'self_family' };
const PLANNER = { audience: 'client' };
beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57G flag gating', () => {
  test('confidenceOn default ON; off-switch ⇒ confidencePersona null', () => {
    expect(confidenceOn()).toBe(true);
    try { localStorage.setItem('ngw-pi-confidence', '0'); } catch {}
    expect(confidencePersona(HOST)).toBeNull();
  });
  test('flag ON ⇒ persona drives vocabulary', () => {
    try { localStorage.setItem('ngw-pi-confidence', '1'); } catch {}
    expect(confidencePersona(HOST)).toBe('host');
    expect(confidencePersona(PLANNER)).toBe('planner');
  });
});

describe('57G classifyLevel — certainty from existing statusLabel + note', () => {
  test('the DATA-PRESENCE split: empty dimensions are UNKNOWN, not KNOWN/AT_RISK', () => {
    expect(classifyLevel({ statusLabel: 'AT RISK', note: 'No vendors yet' })).toBe('UNKNOWN');
    expect(classifyLevel({ statusLabel: 'AT RISK', note: 'No budget set' })).toBe('UNKNOWN');
    expect(classifyLevel({ statusLabel: 'AT RISK', note: 'No tasks yet' })).toBe('UNKNOWN');
    expect(classifyLevel({ statusLabel: 'AT RISK', note: 'No guests yet' })).toBe('UNKNOWN');
  });
  test('real risk WITH data stays AT_RISK; healthy stays KNOWN', () => {
    expect(classifyLevel({ statusLabel: 'AT RISK', note: '3 overdue' })).toBe('AT_RISK');
    expect(classifyLevel({ statusLabel: 'ON TRACK', note: '85% complete · 0 overdue' })).toBe('KNOWN');
    expect(classifyLevel({ statusLabel: 'ATTENTION', note: '2 of 5 confirmed' })).toBe('ATTENTION');
  });
  test('estimate + verification tokens map to their levels', () => {
    expect(classifyLevel({ statusLabel: 'ESTIMATE', note: 'Confirm serveware…' })).toBe('ESTIMATED');
    expect(classifyLevel({ statusLabel: 'REVIEW', note: 'Before event day…' })).toBe('NEEDS_VERIFICATION');
    expect(classifyLevel({ statusLabel: 'AT RISK', note: '12 estimated · no RSVPs' })).toBe('ESTIMATED');
  });
});

describe('57G confidenceFor — persona words + honest tiers', () => {
  test('UNKNOWN renders steel (never green, never red) with persona word', () => {
    const row = { statusLabel: 'AT RISK', note: 'No budget set' };
    expect(confidenceFor(row, 'host')).toEqual({ word: 'Not set yet', tier: 'steel', level: 'UNKNOWN' });
    expect(confidenceFor(row, 'planner').word).toBe('No data');
    expect(confidenceFor(row, 'operator').word).toBe('Not started');
  });
  test('KNOWN is the only green; words differ by persona', () => {
    const row = { statusLabel: 'ON TRACK', note: '4 of 4 confirmed' };
    expect(confidenceFor(row, 'host')).toEqual({ word: "You're set", tier: 'green', level: 'KNOWN' });
    expect(confidenceFor(row, 'planner').word).toBe('Confirmed');
    expect(confidenceFor(row, 'operator').word).toBe('On track');
  });
  test('null persona ⇒ null (caller renders raw token = identity)', () => {
    expect(confidenceFor({ statusLabel: 'ON TRACK', note: 'x' }, null)).toBeNull();
  });
  test('every level has all three persona words + a tier', () => {
    Object.values(CONFIDENCE_WORDS).forEach((w) => {
      ['host', 'planner', 'operator', 'tier'].forEach((k) => expect(w[k]).toBeTruthy());
    });
  });
});
