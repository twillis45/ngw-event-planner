// STORED-COPY-MIGRATION-1 — exact-phrase, idempotent normalization of legacy
// template copy in stored timelines. Host-written free text is never touched.

import { migrateLegacyTaskCopy } from '../legacyCopy';

test('migrates the known lock-language template strings', () => {
  const evs = [{ id: 'e', timeline: [
    { id: 't1', task: 'Book the Black-owned caterer or confirm the host-cooks plan and lock the final headcount', done: false },
    { id: 't2', task: 'Lock the headcount and rentals', done: false },
  ] }];
  const out = migrateLegacyTaskCopy(evs);
  expect(out[0].timeline[0].task).toBe('Book the Black-owned caterer or confirm the host-cooks plan and confirm the final guest count');
  expect(out[0].timeline[1].task).toBe('Finalize the headcount and rentals');
});

test('idempotent, and untouched events keep their references (no churn)', () => {
  const evs = [{ id: 'e', timeline: [{ id: 't', task: 'Buy ice and charcoal', done: false }] }];
  const once = migrateLegacyTaskCopy(evs);
  expect(once).toBe(evs); // no match → same reference
  const legacy = [{ id: 'e2', timeline: [{ id: 't', task: 'Lock the headcount', done: false }] }];
  const a = migrateLegacyTaskCopy(legacy);
  const b = migrateLegacyTaskCopy(a);
  expect(b[0].timeline[0].task).toBe('Finalize the headcount');
  expect(b).toBe(a); // second run is a no-op
});

test('host free text containing similar words is not rewritten unless it IS the template phrase', () => {
  const evs = [{ id: 'e', timeline: [{ id: 't', task: 'Ask Ray to lock the shed after the party', done: false }] }];
  expect(migrateLegacyTaskCopy(evs)).toBe(evs);
});

test('events without timelines pass through untouched', () => {
  const evs = [{ id: 'e' }, null];
  expect(migrateLegacyTaskCopy(evs)).toBe(evs);
});

// Location field heal
import { migrateLegacyLocationFields } from '../legacyCopy';

test('polluted city moves to the empty venue field and clears; real cities untouched', () => {
  const evs = [{ id: 'e', venue: '', venueCity: 'VFW Post 3150 — Alexandria, VA', city: '' }];
  const out = migrateLegacyLocationFields(evs);
  expect(out[0].venue).toBe('VFW Post 3150 — Alexandria, VA');
  expect(out[0].venueCity).toBe('');
  const clean = [{ id: 'e2', venueCity: 'Atlanta', city: 'Bowie' }];
  expect(migrateLegacyLocationFields(clean)).toBe(clean); // reference-preserving
});

test('polluted city with a venue already set just clears (never overwrites the venue)', () => {
  const evs = [{ id: 'e', venue: 'Real Venue Hall', city: 'Something — 123 Broken St' }];
  const out = migrateLegacyLocationFields(evs);
  expect(out[0].venue).toBe('Real Venue Hall');
  expect(out[0].city).toBe('');
});
