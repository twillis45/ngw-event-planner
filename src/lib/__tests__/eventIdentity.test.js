// Sprint 60B — Event Identity reader. Proves: a pure projection over the EXISTING
// meaning fields; one factual statement; success bullets; must-have surfaced; graceful
// degrade when nothing human is captured; flag gate; outcome alignment.

import { identityOn, eventIdentity, identityStatement, setMustHaveOutcome, mustHaveOutcome, MUST_HAVE_SIGNALS } from '../eventIdentity';

const wanda = {
  type: 'Retirement', honoree: 'Wanda',
  honoree_story: '40 years in the unit',
  meaning_why: 'Honor her service before she moves to Florida',
  must_have_moment: 'A video tribute from her unit at dinner',
  feeling_words: 'proud · warm',
};

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('60B flag gate', () => {
  test('identityOn default OFF', () => { expect(identityOn()).toBe(false); });
  test('ON via localStorage', () => { localStorage.setItem('ngw-pi-identity', '1'); expect(identityOn()).toBe(true); });
});

describe('60B identityStatement — one factual sentence (no poetry)', () => {
  test('type essence + honoree', () => {
    expect(identityStatement(wanda)).toBe('This is recognition of a career and a new chapter for Wanda.');
  });
  test('graduation essence; free-text type contains-match', () => {
    expect(identityStatement({ type: 'Graduation', honoree: 'Sam' })).toBe('This is a celebration of an achievement for Sam.');
    expect(identityStatement({ type: 'Birthday Party', honoree: 'Lee' })).toBe('This is a celebration for Lee.');
  });
  test('no honoree ⇒ no "for X"', () => {
    expect(identityStatement({ type: 'Get-Together' })).toBe('This is a gathering.');
  });
});

describe('60B eventIdentity — projects existing fields', () => {
  test('returns the full identity from captured meaning', () => {
    const id = eventIdentity(wanda);
    expect(id.reallyIs).toMatch(/recognition of a career/);
    expect(id.forWhom).toEqual({ name: 'Wanda', story: '40 years in the unit' });
    expect(id.intent).toBe('Honor her service before she moves to Florida');
    expect(id.mustHaveMoment).toBe('A video tribute from her unit at dinner');
    expect(id.hasMeaning).toBe(true);
  });
  test('success bullets: specific (must-have, feeling) first, ≤5, universal after', () => {
    const s = eventIdentity(wanda).success;
    expect(s.length).toBeLessThanOrEqual(5);
    expect(s[0]).toMatch(/must-have happens: A video tribute/);
    expect(s[1]).toMatch(/Everyone feels proud/);
    expect(s.some((b) => /feels celebrated/.test(b))).toBe(true);
  });
  test('GRACEFUL DEGRADE: no meaning + no honoree ⇒ null (today\'s behavior)', () => {
    expect(eventIdentity({ type: 'Dinner Party' })).toBeNull();
    expect(eventIdentity(null)).toBeNull();
  });
  test('honoree only (no meaning) still yields an identity', () => {
    expect(eventIdentity({ type: 'Birthday', honoree: 'Jo' }).reallyIs).toMatch(/for Jo/);
  });
});

describe('60B outcome alignment — did the must-have happen? (reuses event.outcomes)', () => {
  test('setMustHaveOutcome writes to event.outcomes immutably; reader reads it', () => {
    const ev = { id: 'e1' };
    const next = setMustHaveOutcome(ev, 'happened', 'now');
    expect(next).not.toBe(ev);
    expect(ev.outcomes).toBeUndefined();
    expect(next.outcomes.mustHave).toBe('happened');
    expect(mustHaveOutcome(next)).toBe('happened');
  });
  test('signals are the three small states', () => {
    expect(MUST_HAVE_SIGNALS).toEqual(['happened', 'partly', 'missed']);
    expect(mustHaveOutcome({})).toBeNull();
  });
});
