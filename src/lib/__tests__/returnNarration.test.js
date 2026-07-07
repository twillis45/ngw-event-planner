// RETURN-NARRATION-1 — one truthful line max, from real diffs only. First
// visit silent, reload silent, no fake sent/replied/paid, no hero re-telling.

import { buildReturnSnapshot, deriveReturnNarration, narrationDuplicatesTelling, RETURN_GAP_MS } from '../returnNarration';

const NOW = 1750000000000;
const LATER = NOW + RETURN_GAP_MS + 60000;
const ev = (over = {}) => ({ id: 'e-rn', type: 'bbq', date: '2099-08-01', guestMode: 'count', guestCount: 20, guests: [], vendors: [], timeline: [], venue: 'Bowie, MD', ...over });

test('1 · first visit (no snapshot) → silent', () => {
  expect(deriveReturnNarration(ev(), null, LATER).shouldShow).toBe(false);
});

test('2 · no diff → silent (no fake "no changes" chatter); reload inside 30min → silent even with diffs', () => {
  const snap = buildReturnSnapshot(ev(), NOW);
  expect(deriveReturnNarration(ev(), snap, LATER).shouldShow).toBe(false);
  const changed = ev({ parking: 'Lot behind the church' });
  expect(deriveReturnNarration(changed, buildReturnSnapshot(ev(), NOW), NOW + 5 * 60000).shouldShow).toBe(false);
});

test('3 · phase change to post-event narrates once, calmly', () => {
  const prev = buildReturnSnapshot(ev({ date: '2099-08-01' }), NOW);
  const r = deriveReturnNarration(ev({ date: '2020-01-01' }), prev, LATER);
  expect(r.line).toBe('Since last time: the event moved into wrap-up.');
  expect(r.source).toBe('phase_change');
});

test('4+5 · location / parking added produce safe past-tense lines with routes', () => {
  const prevNoLoc = buildReturnSnapshot(ev({ venue: '', city: '' }), NOW);
  expect(deriveReturnNarration(ev(), prevNoLoc, LATER).line).toBe('Since last time: the event location was added.');
  const prevNoParking = buildReturnSnapshot(ev(), NOW);
  const r = deriveReturnNarration(ev({ parking: 'Street parking on Oak' }), prevNoParking, LATER);
  expect(r.line).toBe('Since last time: parking details were added.');
  expect(r.route.focusField).toBe('parking-notes');
});

test('6 · food moved closer uses real remaining count', () => {
  const base = ev();
  const prev = buildReturnSnapshot(base, NOW);
  expect(prev.foodLeft).toBeGreaterThan(2);
  const plan = require('../playbooks').playbookFoodPlan(base);
  const got = {}; plan.list.filter(i => i && !i.skipped).slice(0, prev.foodLeft - 2).forEach(i => { got[i.id] = true; });
  const r = deriveReturnNarration(ev({ foodGot: got }), prev, LATER);
  expect(r.line).toMatch(/food moved closer — 2 items left to buy/);
});

test('7 · vendor readiness improvement narrates counts only — no names of what remains, no paid claims', () => {
  const prev = buildReturnSnapshot(ev({ vendors: [
    { id: 'v1', name: 'A', status: 'Quoted' }, { id: 'v2', name: 'B', status: 'Quoted' },
  ] }), NOW);
  const r = deriveReturnNarration(ev({ vendors: [
    { id: 'v1', name: 'A', status: 'Confirmed' }, { id: 'v2', name: 'B', status: 'Quoted' },
  ] }), prev, LATER);
  expect(r.line).toMatch(/vendor plan moved closer — 1 still needs a follow-up/);
  expect(r.line).not.toMatch(/paid|sent|replied|[AB]\b/);
});

test('9 · guest count set never implies replies', () => {
  const prev = buildReturnSnapshot(ev({ guestCount: 0, guestEstimate: 0 }), NOW);
  const r = deriveReturnNarration(ev({ guestCount: 25 }), prev, LATER);
  expect(r.line).toBe('Since last time: the guest count was set.');
  expect(r.line).not.toMatch(/rsvp|repl/i);
});

test('10 · steps checked off narrates only real completions', () => {
  const t = (id, done) => ({ id, task: `Task ${id}`, done, week: 'Week Of' });
  const prev = buildReturnSnapshot(ev({ timeline: [t('a', false), t('b', false)] }), NOW);
  const r = deriveReturnNarration(ev({ timeline: [t('a', true), t('b', false)] }), prev, LATER);
  expect(r.line).toBe('Since last time: 1 step was checked off.');
});

test('11+12 · duplicate-telling guard against hero and cue wording', () => {
  expect(narrationDuplicatesTelling('Since last time: parking details were added.', 'Add parking details.', null)).toBe(true);
  expect(narrationDuplicatesTelling('Since last time: parking details were added.', 'Book the caterer.', 'Add the location')).toBe(false);
});

test('13+15 · banned claims and privacy: snapshot holds safe markers only; lines never say sent/replied/paid', () => {
  const snap = buildReturnSnapshot(ev({ weatherFallbackCoords: { lat: 38.9, lon: -76.8 }, guests: [{ name: 'Secret Guest', rsvp: 'Yes' }], vendors: [{ id: 'v', name: 'Private Vendor LLC', status: 'Quoted', notes: 'secret terms' }] }), NOW);
  const raw = JSON.stringify(snap);
  expect(raw).not.toMatch(/38\.9|Secret Guest|Private Vendor|secret terms/);
  const cases = [
    deriveReturnNarration(ev({ parking: 'x' }), buildReturnSnapshot(ev(), NOW), LATER),
  ];
  cases.forEach(c => c.line && expect(c.line).not.toMatch(/sent|replied|paid|improved by|%/i));
});

test('priority: phase change outranks everything else', () => {
  const prev = buildReturnSnapshot(ev({ parking: '', date: '2099-08-01' }), NOW);
  const r = deriveReturnNarration(ev({ parking: 'Lot A', date: '2020-01-01' }), prev, LATER);
  expect(r.source).toBe('phase_change');
});

test('contradiction guard: narration and the phase cue share ONE location reader — they can never disagree', () => {
  // Adding a city flips the SHARED reader (eventLocationStatus), so the
  // narration fires AND the phase essential is simultaneously handled — the
  // "Add the location" cue is gone in the same world. Consistency by
  // construction (Todd's at-home report: city on file must count as located).
  const before = { id: 'e', type: 'bbq', date: '2099-08-01', guestCount: 20, venue: '', city: '' };
  const after = { ...before, city: 'Bowie' };
  const prev = buildReturnSnapshot(before, NOW);
  const r = deriveReturnNarration(after, prev, LATER);
  expect(r.shouldShow).toBe(true);
  expect(r.line).toBe('Since last time: the event location was added.');
  const pp = require('../phaseProgress').deriveEventPhaseProgress(after, new Date('2099-07-01'));
  const locItem = 'location';
  expect(pp.nextCue == null || pp.nextCue.id !== locItem).toBe(true); // no contradicting cue
  // noun guard still silences any residual overlap
  expect(narrationDuplicatesTelling('Since last time: the event location was added.', null, 'Add the location')).toBe(true);
});
