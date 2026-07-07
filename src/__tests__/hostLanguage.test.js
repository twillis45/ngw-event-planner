// HOST-LANGUAGE-AUDIT-1 — status-word doctrine. "Locked/lock" is not host
// language unless the state is truly contractual or unchangeable; headcount
// copy finalizes/confirms/sets; decision chips settle. These read the live
// source files so a regression reintroducing the words fails loudly.

import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('1 · no "Lock it" / "Lock your final guest count" host CTAs remain in App.js', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/>Lock it<\/button>/);
  expect(app).not.toMatch(/Lock your final guest count/);
  expect(app).not.toMatch(/>Unlock the count</);
});

test('2 · guest-count all-set copy says "set", never "locked"', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/guest count is locked/i);
  expect(app).not.toMatch(/count's locked/i);
});

test('3 · seed/demo tasks no longer tell hosts to "lock the headcount"', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/lock the (final )?headcount/i);
});

test('4 · host decisions panel settles instead of locking', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/READY TO LOCK/);
  expect(app).toMatch(/READY TO SETTLE/);
  expect(app).toMatch(/label: 'SETTLED'/);
});

test('5 · phase labels dropped Lock Plans / Lock It In', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/'Lock Plans'|'Lock It In'/);
});

test('6 · host persona decision word is Settle it', () => {
  const dc = read('lib/decisionConfidence.js');
  expect(dc).toMatch(/lock: 'Settle it'/);
});

test('7 · price control asks for the exact cost, not a lock', () => {
  const app = read('App.js');
  expect(app).not.toMatch(/>Lock a cost</);
  expect(app).toMatch(/Set the exact cost/);
});
