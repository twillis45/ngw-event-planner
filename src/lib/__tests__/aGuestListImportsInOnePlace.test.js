// ─── A GUEST LIST IMPORTS IN ONE PLACE (G2c-2b-3; owner, 11/28/2026; UX_12
// §8a, render screen 3) ───────────────────────────────────────────────────────
// Reading a CSV into guests, its preview (new, updated, skipped), bringing them
// in (with a batch kept for Undo) and undoing the last import were written
// inside hostv2's old sheet. They live once in lib/guestImport now, for the
// Guests kit (hostv2 and hostv4) and the old sheet alike.
import { importPreview, importApplyEdit, importUndoEdit, importPlatformLabel } from '../guestImport';

const EV = { id: 'e1', guestMode: 'list', guests: [{ id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com' }] };
const ROWS = [
  { name: 'Rosa Lane', email: 'rosa@example.com', phone: '(555) 010-0100', rsvp_status: 'Yes' },
  { name: 'Priya Shah', email: 'priya@example.com' },
  { name: 'Dev Okafor' },
  { name: '', email: 'nobody@example.com' },
];

test('the preview: new, already on the list, and rows skipped for no name', () => {
  const p = importPreview(EV, ROWS, 'ngw', 'family.csv', 1700000000000);
  expect(p.fileName).toBe('family.csv');
  expect(p.summary.willAdd).toBe(2);
  expect(p.summary.willUpdate).toBe(1);
  expect(p.total).toBe(4);
  expect(p.clean).toBe(3);
  expect(p.line).toBe('3 of 4 rows read cleanly from family.csv: 2 new, 1 already on your list (their replies update). Rows without a name are skipped.');
});

test('bringing them in adds and updates, keeps a batch for Undo, and says so', () => {
  const p = importPreview(EV, ROWS, 'ngw', 'family.csv', 1700000000000);
  const ed = importApplyEdit(EV, p, [], 1700000000001);
  expect(ed.patch.guests.map((g) => g.name).sort()).toEqual(['Dev Okafor', 'Priya Shah', 'Rosa Lane']);
  expect(ed.patch.guests.find((g) => g.name === 'Rosa Lane').rsvp).toBe('Yes');
  expect(ed.batches).toHaveLength(1);
  expect(ed.batches[0].snapshot).toEqual(EV.guests);
  expect(ed.msg).toBe('2 added · 1 updated from family.csv. Replies and needs came along.');
});

test('undo puts the list back the way it was before the last import', () => {
  const p = importPreview(EV, ROWS, 'ngw', 'family.csv', 1700000000000);
  const ed = importApplyEdit(EV, p, [], 1700000000001);
  const after = { ...EV, guests: ed.patch.guests };
  const un = importUndoEdit(after, ed.batches);
  expect(un.patch.guests).toEqual(EV.guests);
  expect(un.batches).toHaveLength(0);
  expect(un.msg).toBe('Import undone. The list is back the way it was before that import.');
  expect(importUndoEdit(after, [])).toBeNull();
});

test('a platform reads as its own name', () => {
  expect(importPlatformLabel('ngw')).toBeTruthy();
  expect(importPlatformLabel('unknownthing')).toBe('Unknownthing');
});
