// "Who's confirmed" — one read across vendors, helpers and guests (host board,
// 11/15/2026). Synthetic names only. What this pins: each source counts only
// what it actually says; a vendor is confirmed only by their OWN answer; a
// helper by the one seam (helperStatusFor); nothing is invented.
import { summarizeWhoIsConfirmed, whoIsConfirmedLines } from '../whoIsConfirmed';
import { helperStatusFor } from '../helperResponsibility';

const EV = {
  id: 'e-who', name: 'Harvest Supper', type: 'Dinner Party', date: '2026-11-26',
  vendors: [
    { id: 'v-cater', name: 'Harbor Rotisserie', category: 'Catering', status: 'Confirmed' },
    { id: 'v-bake', name: '', category: 'Bakery' },
    { id: 'v-flor', name: 'Petal Row', category: 'Florist' },
    { id: 'v-pal', name: 'Cousin Remy', category: 'Photography', isInformal: true },
  ],
  timeline: [
    { id: 't1', task: 'Stuffing', owner: 'Jordan', done: false },
    { id: 't2', task: 'Folding chairs', owner: 'Avery', done: false },
    { id: 't3', task: 'Ice', owner: 'Quinn', done: true },
    { id: 't4', task: 'Order the turkey', owner: 'host', done: false },
    { id: 't5', task: 'Old ask', owner: 'Sky', done: false, retired: true },
  ],
  helperConfirmed: { t2: true },
  guests: [
    { id: 'g1', name: 'Ana Cole', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Diaz', rsvp: 'yes' },
    { id: 'g3', name: 'Cy Evans', rsvp: 'Maybe' }, { id: 'g4', name: 'Di Fox', rsvp: 'No' },
    { id: 'g5', name: 'Ed Gray', rsvp: '' },
  ],
};
const CONFIRMS = {
  'v-cater': { vendor_id: 'v-cater', state: 'confirmed' },
  'v-flor': { vendor_id: 'v-flor', state: 'issue', note: 'Wrong date?' },
};

describe('summarizeWhoIsConfirmed', () => {
  test('vendors: only the vendor’s own answer confirms; an answer that is not "confirmed" is a flagged problem', () => {
    const s = summarizeWhoIsConfirmed(EV, CONFIRMS);
    expect(s.vendors).toEqual({ total: 3, confirmed: 1, flagged: ['Petal Row'], waiting: ['Bakery'] });
  });

  // Reversed by owner ruling 11/15/2026: the host's own "Locked in" now counts.
  test('the host’s own "Locked in" counts as confirmed (owner ruling 11/15/2026)', () => {
    const s = summarizeWhoIsConfirmed(EV, {});
    expect(s.vendors.confirmed).toBe(1);   // Harbor Rotisserie, status Confirmed
    expect(s.vendors.waiting).toEqual(['Bakery', 'Petal Row']);
  });

  test('helpers: the Helpers panel’s rows; done or confirmed counts, retired and host rows do not exist', () => {
    const s = summarizeWhoIsConfirmed(EV, CONFIRMS);
    // t1 Jordan (assigned), t2 Avery (confirmed), t3 Quinn (done), informal Cousin Remy (assigned)
    expect(s.helpers.total).toBe(4);
    expect(s.helpers.confirmed).toBe(2);
    expect(s.helpers.waiting).toEqual([{ label: 'Stuffing', name: 'Jordan' }, { label: 'Photography', name: 'Cousin Remy' }]);
  });

  test('guests: replies on the roster, any letter case', () => {
    expect(summarizeWhoIsConfirmed(EV, {}).guests).toEqual({ invited: 5, yes: 2, maybe: 1, no: 1 });
  });

  test('an empty event has nothing to say — every part is null', () => {
    expect(summarizeWhoIsConfirmed({}, null)).toEqual({ vendors: null, helpers: null, guests: null });
    expect(summarizeWhoIsConfirmed(null, undefined)).toEqual({ vendors: null, helpers: null, guests: null });
  });
});

describe('whoIsConfirmedLines', () => {
  test('the compact line, the names still waiting, and who flagged a problem', () => {
    const l = whoIsConfirmedLines(summarizeWhoIsConfirmed(EV, CONFIRMS));
    expect(l.parts.map((p) => p.text)).toEqual(['Vendors 1 of 3 confirmed', 'Helpers 2 of 4', 'Guests 2 yes, 1 maybe']);
    expect(l.parts.map((p) => p.key)).toEqual(['vendors', 'helpers', 'guests']);
    expect(l.waiting).toBe('Still waiting: Bakery, Stuffing (Jordan), Photography (Cousin Remy)');
    expect(l.flagged).toBe('Flagged a problem: Petal Row');
  });

  test('no maybes: the guest part says only yes; nobody waiting: no waiting line', () => {
    const ev = { vendors: [{ id: 'v1', name: 'Solo Cater' }], guests: [{ rsvp: 'Yes' }] };
    const l = whoIsConfirmedLines(summarizeWhoIsConfirmed(ev, { v1: { state: 'confirmed' } }));
    expect(l.parts.map((p) => p.text)).toEqual(['Vendors 1 of 1 confirmed', 'Guests 1 yes']);
    expect(l.waiting).toBe('');
    expect(l.flagged).toBe('');
    expect(JSON.stringify(l)).not.toMatch(/undefined|null|NaN/);
  });
});

describe('the helper-answer seam', () => {
  test('helperStatusFor is the one function that reads a helper’s answer', () => {
    expect(helperStatusFor({ helperConfirmed: { a: true } }, 'a', false)).toBe('confirmed');
    expect(helperStatusFor({ helperConfirmed: { a: true } }, 'b', false)).toBe('assigned');
    expect(helperStatusFor({}, 'a', true)).toBe('handled');
    expect(helperStatusFor({ helperConfirmed: { a: 'yes' } }, 'a', false)).toBe('assigned');   // only a real true
  });
});

// Joined 11/15/2026: a helper who answered through their own link counts on
// their word, the same way a vendor does. "I can't" is not "waiting" — the host
// needs someone else for that job, so it is named on its own line.
describe('helpers who answered through their link', () => {
  const helperIdOf = (name) => `helper-${name.toLowerCase()}`;
  test('"I\'ve got it" counts as confirmed; "I can\'t" is named as needing someone else', () => {
    const answers = {
      [helperIdOf('Jordan')]: { helper_key: helperIdOf('Jordan'), state: 'confirmed' },
      [helperIdOf('Avery')]: { helper_key: helperIdOf('Avery'), state: 'declined', note: 'Out of town' },
    };
    const s = summarizeWhoIsConfirmed(EV, CONFIRMS, answers);
    // Cousin Remy (an informal vendor, counted as a helper) has not answered.
    expect(s.helpers.waiting).toEqual([{ label: 'Photography', name: 'Cousin Remy' }]);
    expect(s.helpers.cantDo).toEqual([{ label: 'Folding chairs', name: 'Avery' }]);
    expect(s.helpers.confirmed).toBe(2);   // Jordan by link, Quinn done; Avery can't
    const l = whoIsConfirmedLines(s);
    expect(l.cantDo).toBe('Needs someone else: Folding chairs (Avery can’t)');
  });
  test('without link answers, nothing changes', () => {
    expect(summarizeWhoIsConfirmed(EV, CONFIRMS)).toEqual(summarizeWhoIsConfirmed(EV, CONFIRMS, {}));
  });
});

// Owner ruling 11/15/2026: a vendor the HOST locked in (status Confirmed, or the
// legacy Booked/Paid — workstreams isVendorConfirmed) counts as confirmed, the
// same as the vendor's own answer. A problem the vendor flagged still shows:
// it is newer than the host's mark.
describe('a vendor the host locked in', () => {
  test('counts as confirmed without the vendor answering', () => {
    const ev = { ...EV, vendors: [{ id: 'v-x', name: 'Oak Hall', category: 'Venue', status: 'Confirmed' }] };
    expect(summarizeWhoIsConfirmed(ev, {}).vendors).toEqual({ total: 1, confirmed: 1, flagged: [], waiting: [] });
  });
  test('a problem the vendor flagged still shows', () => {
    const ev = { ...EV, vendors: [{ id: 'v-x', name: 'Oak Hall', category: 'Venue', status: 'Confirmed' }] };
    const s = summarizeWhoIsConfirmed(ev, { 'v-x': { vendor_id: 'v-x', state: 'issue' } });
    expect(s.vendors.flagged).toEqual(['Oak Hall']);
    expect(s.vendors.confirmed).toBe(0);
  });
});
