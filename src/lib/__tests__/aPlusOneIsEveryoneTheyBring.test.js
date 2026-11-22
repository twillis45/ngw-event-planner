// ─── A PLUS-ONE FIELD IS EVERYONE THE ROW BRINGS (Wanda audit P0-8) ─────────
//
// Wanda's brother's row reads `plusOne: '+3 (Nia + 2 boys)'`. The guest list
// printed "+1 +3 (Nia + 2 boys)", the reply line said "10 heads", and the
// seating chart said "Seated 10 of 10" — for seven Yes rows that bring
// seventeen people. Every reader had its own `1 + (plusOne ? 1 : 0)`.
//
// One reader now: lib/plusOneCount.js. "+N" is N people, a name is one, blank
// is none. Every engine and every shell readout goes through it.
import fs from 'fs';
import path from 'path';
import W from '../../data/wandaGoldEvent';
import { plusOneCount, plusOneLabel } from '../plusOneCount';
import { seatsFor, buildSeatingPlan } from '../seatingPlan';
import { attendanceBand } from '../playbooks';
import { confirmedRsvpCovers } from '../confirmedCovers';
import { kidsCountAfterRoster } from '../kidsCountAfterRoster';

describe('plusOneCount — the one reader', () => {
  test.each([
    ['', 0], ['   ', 0], [null, 0], [undefined, 0],
    ['Jordan Lee', 1], ['+1', 1], ['+2', 2], ['+5', 5],
    ['+3 (Nia + 2 boys)', 3], ['2', 2], ['+0', 0],
  ])('%p → %p', (v, n) => {
    expect(plusOneCount({ plusOne: v })).toBe(n);
  });

  test('the label never doubles the sign', () => {
    expect(plusOneLabel({ plusOne: '+3 (Nia + 2 boys)' })).toBe('+3 (Nia + 2 boys)');
    expect(plusOneLabel({ plusOne: '+2' })).toBe('+2');
    expect(plusOneLabel({ plusOne: 'Jordan Lee' })).toBe('+1 Jordan Lee');
    expect(plusOneLabel({ plusOne: '' })).toBe('');
  });
});

describe('the Wanda roster: 7 Yes rows are 17 people', () => {
  test('seating counts chairs per person', () => {
    expect(seatsFor(W.guests.find((g) => g.id === 'ev-x-wanda-g3'))).toBe(4);
    const plan = buildSeatingPlan(W);
    expect(plan.totals.confirmed).toBe(17);
    expect(plan.totals.seated).toBe(17);
  });

  test('the attendance engine counts the same people', () => {
    const band = attendanceBand({ ...W, guestMode: 'roster' });
    expect(band.confirmed).toBe(17);
    expect(confirmedRsvpCovers(W)).toBe(17);
  });

  test('the kids-count store reads people the same way', () => {
    // A planned 17 and a list of 17 people: the list speaks for the party, so
    // its own kids total (0) wins. At one-per-row the list read 10, looked
    // short, and the stale stepper's 4 stood.
    const ev = { guestCount: 17, kidsCount: 4 };
    expect(kidsCountAfterRoster(ev, W.guests.filter((g) => g.rsvp === 'Yes'))).toBe(0);
  });
});

describe('no screen re-derives the plus-one count', () => {
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const FILES = [
    'hostv2/src/HostShellV2.jsx',
    'src/lib/seatingPlan.js',
    'src/lib/crabPlan.js',
    'src/lib/kidsCountAfterRoster.js',
    'src/lib/playbooks/index.js',
  ];
  test.each(FILES)('%s has no one-per-row plus-one arithmetic', (f) => {
    const code = read(f);
    // `String(g.plusOne || '').trim() ? 1 : 0`, `.filter(g => String(g.plusOne…).trim()).length`,
    // `g.plusOne ? 1 : 0` and the "+1 " prefix — all four shapes the audit found.
    expect(code).not.toMatch(/plusOne\)?\s*\|\|\s*''\)\.trim\(\)\s*\?\s*1\s*:\s*0/);
    expect(code).not.toMatch(/plusOne\s*\?\s*1\s*:\s*0/);
    expect(code).not.toMatch(/filter\([^)]*String\(g\.plusOne[^)]*\)\.trim\(\)\)\.length/);
    expect(code).not.toMatch(/'\+1 '\s*\+\s*String\(g\.plusOne\)/);
  });
});
