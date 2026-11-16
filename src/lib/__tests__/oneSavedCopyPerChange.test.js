// ─── ONE SAVED COPY PER CHANGE (owner's demo, 11/15/2026, item 17) ───────────
// Settings → "Saved copies" listed two copies with the identical timestamp. The
// producer is backupCustomEvents: it snapshots the store before EVERY write, so
// two writes in a row with nothing changed between them (a save effect re-firing
// on the same list, or two writes in one millisecond) produced two copies of the
// same data — and in the same millisecond, one key indexed twice.
import { LS_CUSTOMS, saveCustomEvents, backupCustomEvents, listBackups } from '../customEventStore';

const EV = { id: 'cust-1', name: 'Retirement', type: 'Retirement Party' };

beforeEach(() => localStorage.clear());

test('two saves of the same store make one copy, not two', () => {
  localStorage.setItem(LS_CUSTOMS, JSON.stringify([EV]));
  saveCustomEvents([EV], { reason: 'a', now: 5000 });
  saveCustomEvents([EV], { reason: 'b', now: 5001 });
  expect(listBackups()).toEqual(['ngw-hostv2-backup-5000']);
});

test('two backups in the same millisecond index one key', () => {
  localStorage.setItem(LS_CUSTOMS, JSON.stringify([EV]));
  backupCustomEvents(7000);
  localStorage.setItem(LS_CUSTOMS, JSON.stringify([EV, { ...EV, id: 'cust-2' }]));
  backupCustomEvents(7000);
  const keys = listBackups();
  expect(new Set(keys).size).toBe(keys.length);
});

test('control: a real change between saves still keeps both copies', () => {
  localStorage.setItem(LS_CUSTOMS, JSON.stringify([EV]));
  saveCustomEvents([EV, { ...EV, id: 'cust-2' }], { reason: 'add', now: 6000 });
  saveCustomEvents([EV, { ...EV, id: 'cust-2', name: 'Renamed' }], { reason: 'edit', now: 6001 });
  expect(listBackups()).toEqual(['ngw-hostv2-backup-6001', 'ngw-hostv2-backup-6000']);
});
