// Sprint 57C Phase 2 — Vocabulary Layer (labelFor). Proves: flag OFF = identity
// (byte-identical), planner = identity, host = translated, unmapped = identity.

import { labelFor, HOST_LABEL_MAP } from '../presentationLabels';

const HOST = { audience: 'self_family' };
const PLANNER = { audience: 'client' };

beforeEach(() => { try { localStorage.clear(); } catch {} }); // pi.labels OFF by default

describe('57C labelFor — T1 flag OFF is identity (= today, byte-identical)', () => {
  test('every mapped term returns unchanged when flag off', () => {
    Object.keys(HOST_LABEL_MAP).forEach((term) => {
      expect(labelFor(term, HOST)).toBe(term);     // host audience but flag OFF ⇒ identity
      expect(labelFor(term, PLANNER)).toBe(term);
    });
  });
});

describe('57C labelFor — FLAG ON', () => {
  beforeEach(() => { try { localStorage.setItem('ngw-pi-labels', '1'); } catch {} });

  test('T2 planner audience → identity', () => {
    expect(labelFor('Capacity', PLANNER)).toBe('Capacity');
    expect(labelFor('Reality Check', PLANNER)).toBe('Reality Check');
    expect(labelFor('AT RISK', PLANNER)).toBe('AT RISK');
  });

  test('T3 host audience → translated (vocabulary)', () => {
    expect(labelFor('Planning Health', HOST)).toBe('Where things stand');
    expect(labelFor('Capacity', HOST)).toBe('Seating & supplies');
    expect(labelFor('Reality Check', HOST)).toBe('Before the big day');
    expect(labelFor('Run of Show', HOST)).toBe("Today's plan");
    expect(labelFor('Readiness', HOST)).toBe('How prepared you are');
    expect(labelFor('Operational', HOST)).toBe('To-do & to-buy');
    expect(labelFor('Timeline', HOST)).toBe("What's coming up");
  });

  test('T4 host badges → plain state (no alarm, no false precision)', () => {
    expect(labelFor('AT RISK', HOST)).toBe('Needs attention');
    expect(labelFor('ON TRACK', HOST)).toBe("You're set");
    expect(labelFor('ESTIMATE', HOST)).toBe('about');
    expect(labelFor('REVIEW', HOST)).toBe('double-check');
  });

  test('T5 unmapped term → identity (never guesses/blanks)', () => {
    expect(labelFor('Vendors', HOST)).toBe('Vendors');
    expect(labelFor('Guests', HOST)).toBe('Guests');
    expect(labelFor('Budget', HOST)).toBe('Budget');
    expect(labelFor('Needs You', HOST)).toBe('Needs You');
  });

  test('T6 unset/unknown audience → host (safer default)', () => {
    expect(labelFor('Capacity', { audience: '' })).toBe('Seating & supplies');
    expect(labelFor('Capacity', {})).toBe('Seating & supplies');
  });

  test('T7 non-string passthrough', () => {
    expect(labelFor(undefined, HOST)).toBe(undefined);
    expect(labelFor(null, HOST)).toBe(null);
  });
});
