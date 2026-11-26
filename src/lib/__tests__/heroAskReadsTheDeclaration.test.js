// ─── THE HERO ASK READS THE DECLARATION, NEVER THE TITLE (six root causes, cause 1, part 2)
//
// The mechanism removed: lib/heroAsk chose the hero's headline from words in
// the item's title — a ladder of regexes over "budget", "venue", "guest",
// "serving", "conflict", "count", "Confirm …", "Send payment to …", "Ask … about
// …". Measured over the sweep below before the fix, it produced (among others):
//   · "Add the location." over "Send payment to Venue Pro 3." and "Confirm Venue Pro 3.";
//   · "Reconfirm your bartender." over "Reconfirm Bright Embargo PR" ("emBARgo");
//   · "Decide the menu." over the day's "Next up at 2:00 PM — Plate food …";
//   · "Add who's coming." over "1 guest with allergies" and lodging's "3 guests still need a room";
//   · "Confirm your caterer." over a helper "still bringing" a headcount to the caterer.
//
// Now each producer declares `ask` (its own sentence) or `askKind` (one of
// lib/heroAsk's ASK_KINDS, a vendor kind naming its vendor), and heroAskFor
// reads the declaration. A title is only ever spoken back as itself.
//
// This walks EVERY playbook (all 47) at eight distances in five event states,
// plus every sample event on its own date, three days out and on the day, and
// for every ranked action, every bundle child and every raw registry raise
// asserts:
//   1. the ask does not depend on the title's words: the same item with its
//      title replaced by trigger words (or by nonsense) of the same length
//      asks the same thing, or in every case speaks its own title back;
//   2. every declared kind is a known kind;
//   3. every producer the part-2 inventory named declares its ask or kind.
// heroAskReadsNoTitleWords.test.js holds the reader's source to the same rule.
jest.mock('@app/lib/failureTelemetry', () => require('../failureTelemetry'), { virtual: true });
jest.mock('@app/lib/playbooks', () => require('../playbooks'), { virtual: true });
jest.mock('@app/lib/artworkMarks', () => require('../artworkMarks'), { virtual: true });
jest.mock('@app/lib/welcomeGate', () => require('../welcomeGate'), { virtual: true });
jest.mock('@app/lib/eventDates', () => require('../eventDates'), { virtual: true });
jest.mock('@app/lib/customEventStore', () => require('../customEventStore'), { virtual: true });
jest.mock('@app/lib/eventIds', () => require('../eventIds'), { virtual: true });
jest.mock('@app/lib/inviteTone', () => require('../inviteTone'), { virtual: true });
jest.mock('@app/theme/palette', () => require('../../theme/palette'), { virtual: true });
jest.mock('@app/data/sampleEventsExtra', () => require('../../data/sampleEventsExtra'), { virtual: true });
jest.mock('@app/data/sampleEventsDMV', () => require('../../data/sampleEventsDMV'), { virtual: true });
jest.mock('@app/data/wandaGoldEvent', () => require('../../data/wandaGoldEvent'), { virtual: true });
jest.mock('@app/data/repastSampleEvent', () => require('../../data/repastSampleEvent'), { virtual: true });
const { ALL_SAMPLES } = require('../../../hostv2/src/eventPool.js');
const { eventPlan } = require('../../CommandCenter');
const { buildExperienceContext } = require('../experienceContext');
const { ALL_PLAYBOOKS } = require('../playbooks');
const { raiseAll } = require('../surfaceRegistry');
const heroAsk = require('../heroAsk');
const { normalizeAsk } = require('../askVoice');
const { useFrozenClock, daysFromNow } = require('../../testUtils/frozenClock');

useFrozenClock();
const { heroAskFor } = heroAsk;
const isKnownAskKind = heroAsk.isKnownAskKind || (() => false);

// Every word the retired ladder keyed on.
const TRIGGERS = ('budget menu venue rsvp guest date conflict count catering serving food start time '
  + 'location who cooks buffet dietary send payment confirm book pay over your budget where is it final '
  + 'ask about resolve decisions call chase reconfirm dj photo flor bar cake').split(' ');
const decoy = (n, k) => {
  let s = ''; let i = k;
  while (s.length < n) { s += (s ? ' ' : '') + TRIGGERS[i % TRIGGERS.length]; i += 3; }
  return s.slice(0, Math.max(1, n));
};
const selfAsk = (t) => normalizeAsk(String(t).replace(/\.+$/, '').trim() + '.');

function titleIndependent(a, ev) {
  const t = String(a.title || '');
  if (!t.trim()) return true;
  const variants = [t, decoy(t.length, 0), decoy(t.length, 1), decoy(t.length, 2), 'q'.repeat(t.length)];
  const asks = variants.map((T) => heroAskFor({ ...a, title: T }, ev));
  if (asks.every((x) => x === asks[0])) return true;
  return asks.every((x, i) => x === selfAsk(variants[i]));
}

function sweepEvents() {
  const evs = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of [180, 60, 30, 14, 7, 3, 1, 0]) {
      const base = { id: `ha-${pb.type}-${d}`, name: 'N', type: pb.type, date: daysFromNow(d), guests: [], vendors: [], budget: [], timeline: [], foodChoices: {} };
      evs.push(base);
      evs.push({ ...base, id: base.id + '-f', venue: 'The Hall', venueCity: 'Santa Fe, NM', guestMode: 'count', guestCount: 40, totalBudget: 8000, startTime: '18:00' });
      evs.push({
        ...base, id: base.id + '-v', venue: 'The Hall', venueCity: 'Santa Fe, NM', guestMode: 'count', guestCount: 40, totalBudget: 800, startTime: '18:00',
        vendors: [{ id: 'v1', name: 'Hearthstone Catering Co', category: 'Catering', status: 'Pending', cost: 3000 }],
      });
      if ([60, 14, 3, 0].includes(d)) {
        const rich = {
          ...base, id: base.id + '-r', venue: 'Our place', venueKind: 'home', venueCity: 'Fort Washington, MD',
          guestMode: 'count', guestCount: 30, totalBudget: 500, startTime: '17:00',
          vendors: ['Catering', 'DJ', 'Photographer', 'Venue'].map((c, i) => ({
            id: 'rv' + i, name: c + ' Pro ' + i, category: c, status: i === 3 ? 'Inquired' : 'Booked',
            cost: 1000, payDueDate: daysFromNow(-2), balancePaid: false, coiRequired: true,
          })),
        };
        evs.push(rich);
        evs.push({ ...rich, id: base.id + '-dest', isDestination: true, travelMode: 'fly', lodging: { hotelName: 'Casa Esperanza' }, venue: 'Casa Esperanza', venueKind: '' });
        // A vendor and no guests yet: the ladder leads with the vendor, and the
        // foundation's guest rung follows it.
        evs.push({ ...base, id: base.id + '-ng', vendors: [{ id: 'g1', name: 'Grill Co', category: 'Catering', status: 'Booked' }] });
        evs.push({ ...base, id: base.id + '-dest2', isDestination: true, travelMode: 'fly', guestMode: 'count', guestCount: 12, totalBudget: 5000, startTime: '17:00', venueCity: 'Santa Fe, NM' });
      }
    }
  }
  for (const e of ALL_SAMPLES) {
    evs.push(e);
    evs.push({ ...e, id: e.id + '-d3', date: daysFromNow(3) });
    evs.push({ ...e, id: e.id + '-d0', date: daysFromNow(0) });
  }
  return evs;
}

// Each producer the part-2 inventory named (HANDOFF, 11/23 late night).
const FAMILIES = [
  ['foundation date', (a) => a.id === 'date'],
  ['foundation guests', (a) => a.id === 'guests'],
  ['foundation budget', (a) => a.id === 'budget'],
  ['foundation lodging', (a) => a.id === 'lodging'],
  ['foundation food', (a) => a.id === 'food'],
  ['ladder vendor confirm', (a) => /^top:vendor:/.test(String(a.id)) && /^Confirm /.test(String(a.title))],
  ['ladder vendor pay', (a) => a.source === 'ladder' && /^surface:vendor-payments:/.test(String(a.id))],
  ['ladder caterer count', (a) => /^top:caterer:/.test(String(a.id))],
  ['ladder start', (a) => /^top:start:/.test(String(a.id))],
  ['phase food', (a) => a.id === 'phase:food'],
  ['phase budget', (a) => a.id === 'phase:budget'],
  ['phase location', (a) => a.id === 'phase:location'],
  ['registry vendor-coi', (a) => a.surface === 'vendor-coi' && !a.kind],
  ['registry vendor-payments', (a) => a.surface === 'vendor-payments' && !a.kind],
  ['registry vendor-conflicts', (a) => a.surface === 'vendor-conflicts' && !a.kind],
  ['conflicts bundle', (a) => a.id === 'bundle:vendor-conflicts'],
  ['decisions bundle', (a) => a.id === 'bundle:decisions'],
];
const declares = (a) => !!((a.ask && normalizeAsk(a.ask)) || (a.askKind && isKnownAskKind(a.askKind)));

let ITEMS = null;
function items() {
  if (ITEMS) return ITEMS;
  ITEMS = [];
  for (const ev of sweepEvents()) {
    let acts = [];
    try { acts = eventPlan(ev, buildExperienceContext(ev, null, 1)).nextActions || []; } catch (_e) { acts = []; }
    for (const a of acts) {
      if (!a) continue;
      ITEMS.push({ a, ev });
      if (Array.isArray(a.items)) for (const c of a.items) if (c) ITEMS.push({ a: c, ev });
    }
    let raises = [];
    try { raises = raiseAll(ev) || []; } catch (_e) { raises = []; }
    for (const r of raises) ITEMS.push({ a: r, ev, raw: true });
  }
  return ITEMS;
}

describe('the hero ask reads what its producer declares', () => {
  test('PREMISE: the sweep reaches the corpus', () => {
    expect(ALL_PLAYBOOKS.length).toBe(47);
    expect(items().length).toBeGreaterThan(20000);
  });

  test('no ask depends on the words of its title', () => {
    const bad = [];
    for (const { a, ev } of items()) {
      if (!titleIndependent(a, ev)) bad.push(`${ev.id} ${a.id || a.surface}: "${a.title}" asks "${heroAskFor(a, ev)}"`);
    }
    expect(bad.slice(0, 25)).toEqual([]);
    expect(bad.length).toBe(0);
  });

  test('every declared kind is a known kind', () => {
    const bad = new Set();
    for (const { a } of items()) if (a.askKind && !isKnownAskKind(a.askKind)) bad.add(`${a.id || a.surface}: ${a.askKind}`);
    expect([...bad]).toEqual([]);
  });

  test('every producer the inventory named declares its ask or its kind', () => {
    const seen = {};
    const bad = new Set();
    for (const { a, ev } of items()) {
      for (const [name, match] of FAMILIES) {
        if (!match(a)) continue;
        seen[name] = (seen[name] || 0) + 1;
        if (!declares(a)) bad.add(`${name}: ${ev.id} ${a.id} "${a.title}"`);
      }
    }
    expect(FAMILIES.map(([n]) => n).filter((n) => !seen[n])).toEqual([]);
    expect([...bad].slice(0, 25)).toEqual([]);
  });
});

// The kinds the shell's own rungs read (rungOwnsHero, the conflict card, the
// COI card, the "Then" bundle rows): each producer declares exactly that kind.
describe('the kinds the shell reads are the ones the producers declare', () => {
  test('the conflicts bundle, the decisions bundle and every COI step declare their kind', () => {
    const want = [
      ['bundle:vendor-conflicts', (a) => a.id === 'bundle:vendor-conflicts', 'conflict'],
      ['bundle:decisions', (a) => a.id === 'bundle:decisions', 'decisions'],
      ['a COI step', (a) => a.sourceCategory === 'coi' && a.kind !== 'bundle', 'coi'],
      ['bundle:vendor-coi', (a) => a.id === 'bundle:vendor-coi', 'coi'],
    ];
    const seen = {};
    const bad = new Set();
    for (const { a, ev } of items()) {
      for (const [name, match, kind] of want) {
        if (!match(a)) continue;
        seen[name] = (seen[name] || 0) + 1;
        if (a.askKind !== kind) bad.add(`${name}: ${ev.id} ${a.id} declares ${a.askKind}`);
      }
    }
    expect(want.map(([n]) => n).filter((n) => !seen[n])).toEqual([]);
    expect([...bad].slice(0, 25)).toEqual([]);
  });
});
