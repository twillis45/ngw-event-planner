// EVENT-CONTEXT-INTELLIGENCE-1 — context nudges are optional, source-bounded,
// respectfully phrased, surface-specific, action-linked, and dismissible.
// The app must never prescribe culture or infer identity.

import { eventContextNudge } from '../eventContextNudges';

const june = { id: 'e1', type: 'juneteenth', name: 'Family Cookout' };

test('1 · Juneteenth food nudge exists, phrased as option not requirement', () => {
  const n = eventContextNudge(june, 'food');
  expect(n.text).toMatch(/many hosts/i);
  expect(n.text).toMatch(/if it fits/i);
  expect(n.text).not.toMatch(/you need|you should|must|required/i);
  expect(n.route).toEqual({ tab: 'Planning', focusField: 'food-plan' });
});

test('2 · one nudge per surface, correct surfaces per context', () => {
  expect(eventContextNudge(june, 'vendors').text).toMatch(/Black-owned/);
  expect(eventContextNudge(june, 'guests').route.focusField).toBe('guests-invites-e1');
  expect(eventContextNudge(june, 'program')).toBeNull(); // not authored for this context
});

test('3 · source-bounded: matches explicit type/name/theme only — never other fields', () => {
  // guest names, vendor names, notes must NEVER trigger a context
  const sneaky = { id: 'e2', type: 'dinner party', guests: [{ name: 'Juneteenth Jones' }], vendors: [{ name: 'Juneteenth Catering' }], notes: 'juneteenth' };
  expect(eventContextNudge(sneaky, 'food')).toBeNull();
  // but the host's own theme text counts
  expect(eventContextNudge({ id: 'e3', type: 'cookout', theme: 'Juneteenth' }, 'food')).toBeTruthy();
});

test('4 · dismissal persists per nudge and kills only that nudge', () => {
  const dismissed = { ...june, contextNudges: { 'juneteenth-food': 'dismissed' } };
  expect(eventContextNudge(dismissed, 'food')).toBeNull();
  expect(eventContextNudge(dismissed, 'vendors')).toBeTruthy();
});

test('5 · all six contexts resolve; unknown types get nothing', () => {
  expect(eventContextNudge({ id: 'e', type: 'birthday' }, 'program').text).toMatch(/cake/i);
  expect(eventContextNudge({ id: 'e', type: 'celebration of life' }, 'program').text).toMatch(/tone/i);
  expect(eventContextNudge({ id: 'e', type: 'retirement' }, 'program').text).toMatch(/honoree/i);
  expect(eventContextNudge({ id: 'e', type: 'graduation' }, 'food')).toBeTruthy();
  expect(eventContextNudge({ id: 'e', type: 'baby shower' }, 'food')).toBeTruthy();
  expect(eventContextNudge({ id: 'e', type: 'networking mixer' }, 'food')).toBeNull();
  expect(eventContextNudge({ id: 'e' }, 'food')).toBeNull();
});

test('6 · language safety across every authored nudge: no prescription, no identity claims, no verified-ownership claims', () => {
  const types = ['juneteenth', 'birthday', 'memorial', 'retirement', 'graduation', 'baby shower'];
  const surfaces = ['food', 'vendors', 'guests', 'program'];
  types.forEach(type => surfaces.forEach(surface => {
    const n = eventContextNudge({ id: 'e', type }, surface);
    if (!n) return;
    const all = `${n.text} ${n.why}`;
    expect(all).not.toMatch(/you need|you should|you must|required to|have to|verified|authentic(?!ally)|your (race|religion|culture|community)/i);
  }));
});

test('7 · every nudge is action-linked to a real route', () => {
  const types = ['juneteenth', 'birthday', 'memorial', 'retirement', 'graduation', 'baby shower'];
  ['food', 'vendors', 'guests', 'program'].forEach(surface => types.forEach(type => {
    const n = eventContextNudge({ id: 'e9', type }, surface);
    if (!n) return;
    expect(n.route.tab).toBeTruthy();
    expect(n.route.focusField).toBeTruthy();
    expect(n.actionLabel).toBeTruthy();
  }));
});

// ── Full-spec additions ───────────────────────────────────────────────────────
import { deriveEventContextNudges } from '../eventContextNudges';

test('8 · aggregate caps at three active nudges app-wide, names its explicit source', () => {
  const all = deriveEventContextNudges({ id: 'e1', type: 'juneteenth' });
  expect(all.eventContext).toBe('juneteenth');
  expect(all.source).toBe('event_type');
  expect(all.nudges.length).toBeLessThanOrEqual(3);
  all.nudges.forEach(n => { expect(n.dismissible).toBe(true); expect(n.priority).toBe('low'); });
  expect(deriveEventContextNudges({ id: 'e2', type: 'cookout', name: 'Juneteenth Jam' }).source).toBe('event_name');
});

test('9 · cross-context isolation: birthday/retirement/graduation never receive Juneteenth copy', () => {
  ['birthday', 'retirement', 'graduation', 'baby shower'].forEach(type => {
    const all = deriveEventContextNudges({ id: 'e', type });
    const text = JSON.stringify(all.nudges);
    expect(text).not.toMatch(/juneteenth|red foods|Black-owned/i);
  });
});

test('10 · memorial tone is calm — no party-pressure copy', () => {
  const all = deriveEventContextNudges({ id: 'e', type: 'celebration of life' });
  const text = JSON.stringify(all.nudges);
  expect(text).not.toMatch(/get the party started|so much fun|exciting|celebrate hard|turn up|hype/i);
  expect(text).toMatch(/tone|remembrance/i);
});

test('11 · unknown context: aggregate returns nothing, never a fabricated context', () => {
  const all = deriveEventContextNudges({ id: 'e', type: 'team offsite' });
  expect(all).toEqual({ eventContext: 'unknown', source: 'unknown', nudges: [], suppressed: [] });
});

test('12 · host meaning fields never create identity-based context (explicit descriptors only)', () => {
  // "Celebrate Black history and family" in the host's own meaning field is
  // used by MOMENT-PROTECT to protect the moment — it must NOT flip the
  // context engine into cultural nudges (that would be inference).
  const all = deriveEventContextNudges({ id: 'e', type: 'cookout', must_have_moment: 'Celebrate Black history and family', meaning_why: 'Honor my dad' });
  expect(all.eventContext).toBe('unknown');
});

// ── EVENT-CONTEXT-COVERAGE-1 — expansion beyond the first six contexts ────────
// Every event type the app itself names (EVT_IDENT) plus the common intake
// types now resolves to its own context. Same bar as the first six: option
// language, no invented facts, real routes only.

// [type string a host would enter, expected context key, a surface that must be authored]
const NEW_COVERAGE = [
  ['Kwanzaa Gathering',          'kwanzaa',        'program'],
  ['Ethiopian Coffee Ceremony',  'coffeeceremony', 'program'],
  ['Pupusa Gathering',           'pupusa',         'food'],
  ['The Cookout',                'thecookout',     'food'],
  ['Fish Fry',                   'fishfry',        'food'],
  ['Sunday Dinner',              'sundaydinner',   'food'],
  ['Crab Feast',                 'crabfeast',      'food'],
  ['Crawfish Boil',              'boil',           'food'],
  ['Low Country Boil',           'boil',           'food'],
  ['Quinceañera',                'quinceanera',    'program'],
  ['Bridal Shower',              'bridalshower',   'guests'],
  ['Wedding',                    'wedding',        'program'],
  ['Anniversary Party',          'anniversary',    'program'],
  ['Family Reunion',             'reunion',        'program'],
  ['Holiday Party',              'holidayparty',   'guests'],
  ['Housewarming',               'housewarming',   'guests'],
  ['Dinner Party',               'dinnerparty',    'guests'],
  ['Game Night',                 'gamenight',      'food'],
  ['Card Party',                 'gamenight',      'food'],
  ['Watch Party',                'watchparty',     'food'],
];
const ALL_SURFACES = ['food', 'vendors', 'guests', 'program'];

test('13 · every newly covered type resolves to its own context with at least one authored nudge', () => {
  NEW_COVERAGE.forEach(([type, key, surface]) => {
    const n = eventContextNudge({ id: 'e', type }, surface);
    expect(n).toBeTruthy();
    expect(n.context).toBe(key);
    expect(deriveEventContextNudges({ id: 'e', type }).eventContext).toBe(key);
  });
});

test('14 · cultural nudges are grounded in what the gathering actually centers (keyword-locked)', () => {
  const at = (type, surface) => eventContextNudge({ id: 'e', type }, surface);
  // Kwanzaa: the kinara lighting and the night's principle; the karamu as a shared table.
  expect(at('Kwanzaa Gathering', 'program').text).toMatch(/kinara/i);
  expect(at('Kwanzaa Gathering', 'program').text).toMatch(/principle/i);
  expect(at('Kwanzaa Gathering', 'food').text).toMatch(/karamu/i);
  // Coffee ceremony: three rounds, unhurried; popcorn as the classic companion.
  expect(at('Ethiopian Coffee Ceremony', 'program').text).toMatch(/three rounds/i);
  expect(at('Ethiopian Coffee Ceremony', 'food').text).toMatch(/popcorn/i);
  // Pupusas: fresh off the griddle in rounds, curtido alongside.
  expect(at('Pupusa Gathering', 'food').text).toMatch(/griddle/i);
  expect(at('Pupusa Gathering', 'food').text).toMatch(/curtido/i);
  // Quinceañera: the traditional moments, not generic birthday copy.
  expect(at('Quinceañera', 'program').text).toMatch(/vals/i);
  expect(at('Quinceañera', 'program').text).toMatch(/changing of the shoes/i);
  expect(at('Quinceañera', 'program').text).not.toMatch(/cake/i);
  // Crab feast: the table setup is the plan — and it routes to the real crab plan.
  expect(at('Crab Feast', 'food').text).toMatch(/mallets/i);
  expect(at('Crab Feast', 'food').route).toEqual({ tab: 'Planning', focusField: 'crab-plan' });
  // Boils: rounds onto a covered table, shells accounted for.
  expect(at('Crawfish Boil', 'food').text).toMatch(/covered table/i);
  expect(at('Crawfish Boil', 'food').text).toMatch(/shells/i);
});

test('15 · common-type nudges are load-bearing, not filler (keyword-locked)', () => {
  const at = (type, surface) => eventContextNudge({ id: 'e', type }, surface);
  expect(at('Wedding', 'program').text).toMatch(/toasts/i);
  expect(at('Wedding', 'vendors').text).toMatch(/arrival and setup/i);
  expect(at('Family Reunion', 'program').text).toMatch(/group photo/i);
  expect(at('Family Reunion', 'guests').text).toMatch(/shirts/i);
  expect(at('Anniversary Party', 'program').text).toMatch(/toast/i);
  expect(at('Holiday Party', 'guests').text).toMatch(/spending cap/i);
  expect(at('Housewarming', 'guests').text).toMatch(/parking/i);
  expect(at('Dinner Party', 'guests').text).toMatch(/allergies/i);
  expect(at('Game Night', 'food').text).toMatch(/one-handed/i);
  expect(at('Watch Party', 'food').text).toMatch(/before the start/i);
  expect(at('Fish Fry', 'food').text).toMatch(/fryer/i);
  expect(at('Sunday Dinner', 'food').text).toMatch(/family staples/i);
  expect(at('Bridal Shower', 'guests').text).toMatch(/registry/i);
});

test('16 · language safety holds across every new nudge: options, never prescriptions', () => {
  NEW_COVERAGE.forEach(([type]) => ALL_SURFACES.forEach(surface => {
    const n = eventContextNudge({ id: 'e', type }, surface);
    if (!n) return;
    const all = `${n.text} ${n.why}`;
    expect(all).not.toMatch(/you need|you should|you must|must\b|required to|have to|verified|authentic(?!ally)|your (race|religion|culture|community)/i);
  }));
});

test('17 · every new nudge is action-linked to a route both apps consume', () => {
  const KNOWN = { Planning: /^(food-plan|crab-plan)$/, Vendors: /^vendor-list$/, Guests: /^guests-invites-e9$/, 'Event Day Schedule': /^ros-now$/ };
  NEW_COVERAGE.forEach(([type]) => ALL_SURFACES.forEach(surface => {
    const n = eventContextNudge({ id: 'e9', type }, surface);
    if (!n) return;
    expect(n.actionLabel).toBeTruthy();
    expect(KNOWN[n.route.tab]).toBeTruthy();
    expect(n.route.focusField).toMatch(KNOWN[n.route.tab]);
  }));
});

test('18 · precedence: named identities win over broader words, doctrine locks hold', () => {
  // "Juneteenth Cookout" is a Juneteenth event, never generic "The Cookout" copy.
  expect(deriveEventContextNudges({ id: 'e', type: 'Juneteenth Cookout' }).eventContext).toBe('juneteenth');
  // Bare "cookout" stays neutral (no inference from a plain word) — only the
  // app's named identity "The Cookout" matches.
  expect(eventContextNudge({ id: 'e', type: 'cookout' }, 'food')).toBeNull();
  // A wedding anniversary is an anniversary, not wedding-day logistics.
  expect(deriveEventContextNudges({ id: 'e', type: 'Wedding Anniversary' }).eventContext).toBe('anniversary');
  // A wedding shower is a shower, not a wedding.
  expect(deriveEventContextNudges({ id: 'e', type: 'Wedding Shower' }).eventContext).toBe('bridalshower');
  // Sweet 16 keeps its birthday treatment.
  expect(eventContextNudge({ id: 'e', type: 'Sweet 16' }, 'program').text).toMatch(/cake/i);
  // Dinner party food surface stays silent by doctrine — no cultural food
  // context exists for a plain dinner party (companion to test 3).
  expect(eventContextNudge({ id: 'e', type: 'Dinner Party' }, 'food')).toBeNull();
});

test('19 · deliberately uncovered types still get nothing — silence over filler', () => {
  ['Day Party', 'Get-Together', 'Corporate Event', 'Gala / Fundraiser', 'Conference / Summit'].forEach(type => {
    expect(deriveEventContextNudges({ id: 'e', type })).toEqual({ eventContext: 'unknown', source: 'unknown', nudges: [], suppressed: [] });
  });
});

test('20 · new contexts behave like the first six: aggregate shape, dismissal isolation', () => {
  const all = deriveEventContextNudges({ id: 'e1', type: 'Kwanzaa Gathering' });
  expect(all.eventContext).toBe('kwanzaa');
  expect(all.source).toBe('event_type');
  expect(all.nudges.length).toBeLessThanOrEqual(3);
  all.nudges.forEach(n => { expect(n.dismissible).toBe(true); expect(n.priority).toBe('low'); });
  const dismissed = { id: 'e1', type: 'Kwanzaa Gathering', contextNudges: { 'kwanzaa-program': 'dismissed' } };
  expect(eventContextNudge(dismissed, 'program')).toBeNull();
  expect(eventContextNudge(dismissed, 'food')).toBeTruthy();
});
