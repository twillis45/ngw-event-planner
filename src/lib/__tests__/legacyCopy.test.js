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
