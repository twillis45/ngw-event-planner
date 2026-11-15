// ─── THE HELPER ASK SAYS WHO, WHAT, AND WHY — AND NOTHING IT DOES NOT KNOW ──
//
// The text a host's own phone sends a helper (owner-approved 11/15/2026). The
// app never sends it and never says it was sent; this only writes it.
// All names are synthetic.
import { buildHelperAsk, helperAllergyNote } from '../helperAsk';

const URL = 'https://example.test/hostv2/?helper=abcdefghij1234567890xy';

const EVENT = {
  id: 'e1', name: 'Friendsgiving at Pine Street', date: '2026-11-26',
  startTime: '16:00', startTimeSource: 'host',
  venue: 'Pine Street Commons', venueAddress: '12 Pine Street, Springfield',
  guests: [
    { id: 'g1', name: 'Jordan Avery', phone: '555-0101' },
    { id: 'g2', name: 'Riley Park', allergens: ['Peanut', 'Tree nuts'], needs: 'Riley private note' },
  ],
};

const JOBS = [
  { kind: 'food', label: 'Cornbread stuffing' },
  { kind: 'task', label: 'Bring folding chairs' },
];

const ask = (over = {}) => buildHelperAsk({
  event: EVENT, hostName: 'Casey Morgan', helperName: 'Jordan Avery', jobs: JOBS, url: URL, ...over,
});

describe('who, what, why', () => {
  test('WHO: the host by name, and the helper by first name', () => {
    const t = ask();
    expect(t).toMatch(/^Hi Jordan/);
    expect(t).toContain('Casey');
  });

  test('WHAT: the event, its date, its time, its place, and every one of this helper’s jobs', () => {
    const t = ask();
    expect(t).toContain('Friendsgiving at Pine Street');
    expect(t).toContain('Thursday, November 26');
    expect(t).toContain('4:00 PM');
    expect(t).toContain('Pine Street Commons');
    expect(t).toContain('12 Pine Street, Springfield');
    expect(t).toContain('Cornbread stuffing');
    expect(t).toContain('Bring folding chairs');
  });

  test('WHY: what to do with it, and the link', () => {
    const t = ask();
    expect(t).toMatch(/tap to say yes, or tell me if you can.t/i);
    expect(t).toContain(URL);
    expect(t.trim().endsWith(URL)).toBe(true);
  });

  test('it never claims to have been sent, and never says "sent"', () => {
    expect(ask()).not.toMatch(/\bsent\b|delivered/i);
  });
});

describe('the allergy note', () => {
  test('a food job carries the allergen the plan knows, and names no guest', () => {
    const t = ask();
    expect(t).toMatch(/keep it nut-free/i);
    expect(t).toMatch(/a guest is allergic/i);
    expect(t).not.toContain('Riley');
    expect(t).not.toContain('private note');
  });

  test('no allergen is named when the plan has none', () => {
    const t = ask({ event: { ...EVENT, guests: [{ id: 'g1', name: 'Jordan Avery' }] } });
    expect(t).not.toMatch(/-free|allerg/i);
    expect(helperAllergyNote({ guests: [] })).toBe('');
    expect(helperAllergyNote({})).toBe('');
  });

  test('a job that is not food never carries it', () => {
    const t = ask({ jobs: [{ kind: 'task', label: 'Bring folding chairs' }] });
    expect(t).not.toMatch(/-free|allerg/i);
  });

  test('the host’s own diet counts count too', () => {
    expect(helperAllergyNote({ dietCounts: { 'Nut allergy': 1, Vegetarian: 4 } })).toBe('keep it nut-free, a guest is allergic');
    expect(helperAllergyNote({ dietCounts: { Shellfish: 2 } })).toBe('keep it shellfish-free, guests are allergic');
    expect(helperAllergyNote({ guests: [{ allergens: ['Sesame'] }, { allergens: ['Egg'] }] }))
      .toBe('keep it egg-free and sesame-free, guests are allergic');
  });
});

describe('carrying food', () => {
  test('hot or cold only when the plan knows', () => {
    expect(ask({ jobs: [{ kind: 'food', label: 'Mac and cheese', carry: 'hot' }] })).toMatch(/bring it hot, wrapped in towels/);
    expect(ask({ jobs: [{ kind: 'food', label: 'Potato salad', carry: 'cold' }] })).toMatch(/bring it cold, in a cooler/);
    expect(ask()).not.toMatch(/wrapped in towels|in a cooler/);
  });
});

describe('it says nothing it does not know', () => {
  test('an hour the app guessed is never stated', () => {
    const t = ask({ event: { ...EVENT, startTimeSource: 'derived' } });
    expect(t).not.toContain('4:00 PM');
  });

  test('no host name, no place, no date: it still reads, without blanks', () => {
    const t = buildHelperAsk({ event: { name: 'Game Night' }, hostName: '', helperName: 'Sam', jobs: [{ kind: 'task', label: 'Ice' }], url: URL });
    expect(t).toMatch(/^Hi Sam/);
    expect(t).toContain('Game Night');
    expect(t).toContain('Ice');
    expect(t).not.toMatch(/undefined|null|\(\)| ,|  /);
  });

  test('another helper’s job never appears — it lists only what it is given', () => {
    expect(ask({ jobs: [{ kind: 'task', label: 'Bring folding chairs' }] })).not.toContain('Cornbread');
  });
});
