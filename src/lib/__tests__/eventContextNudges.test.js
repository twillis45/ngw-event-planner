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
