// ─── SPLIT THE COSTS: THE MATH (owner, 11/16/2026, "free, just the math") ───
import { readSplit, settle, transferLine, splitSummary } from '../costSplit';

const P = (...names) => names.map((name, i) => ({ id: 'p' + i, name }));
const ev = (people, expenses, name = 'Vida’s Friendsgiving') => ({ name, costSplit: { people, expenses } });

test('Jordan $60, Ana $30, Sam $0 → Sam pays Jordan $30', () => {
  const people = P('Jordan', 'Ana', 'Sam');
  const r = settle(readSplit(ev(people, [
    { id: 'x1', who: 'p0', what: 'turkey', amount: 60 },
    { id: 'x2', who: 'p1', what: 'drinks', amount: '30' },
  ])));
  expect(r.total).toBe(9000);
  expect(r.each).toBe(3000);
  expect(r.transfers.map(transferLine)).toEqual(['Sam pays Jordan $30.00']);
});

test('the shares always add back to the total, to the penny', () => {
  const people = P('A', 'B', 'C');
  const r = settle(readSplit(ev(people, [{ id: 'x', who: 'p0', amount: 100 }])));
  expect(r.people.map((p) => p.share)).toEqual([3334, 3333, 3333]);
  expect(r.people.reduce((a, p) => a + p.share, 0)).toBe(10000);
  const paidBack = r.transfers.reduce((a, t) => a + t.amount, 0);
  expect(paidBack).toBe(6666);                       // B and C each pay A $33.33
  expect(r.transfers.map(transferLine)).toEqual(['B pays A $33.33', 'C pays A $33.33']);
});

test('every balance settles to zero, and the payments never outnumber the people', () => {
  const people = P('A', 'B', 'C', 'D', 'E');
  const r = settle(readSplit(ev(people, [
    { id: '1', who: 'p0', amount: 123.45 }, { id: '2', who: 'p1', amount: 10 },
    { id: '3', who: 'p3', amount: 77.77 }, { id: '4', who: 'p0', amount: 0.03 },
  ])));
  const net = Object.fromEntries(r.people.map((p) => [p.id, p.net]));
  for (const t of r.transfers) { net[t.from] += t.amount; net[t.to] -= t.amount; }
  expect(Object.values(net).every((v) => v === 0)).toBe(true);
  expect(r.transfers.length).toBeLessThanOrEqual(people.length - 1);
});

test('everyone even, nobody listed, or nothing spent: no payments', () => {
  expect(settle(readSplit(ev(P('A', 'B'), [{ id: '1', who: 'p0', amount: 20 }, { id: '2', who: 'p1', amount: 20 }]))).transfers).toEqual([]);
  expect(settle(readSplit(ev([], []))).transfers).toEqual([]);
  expect(settle(readSplit(null)).total).toBe(0);
});

test('bad rows are ignored, not guessed at', () => {
  const s = readSplit(ev([{ id: 'a', name: ' Ana ' }, { id: 'b', name: '' }, null], [
    { id: '1', who: 'a', amount: 'abc' }, { id: '2', who: 'ghost', amount: 10 }, { id: '3', who: 'a', amount: -5 }, { id: '4', who: 'a', amount: '12.5' },
  ]));
  expect(s.people).toEqual([{ id: 'a', name: 'Ana' }]);
  expect(s.expenses).toEqual([{ id: '4', who: 'a', what: '', amount: 12.5 }]);
});

test('the summary reads as a message to the group, and never claims money moved', () => {
  const text = splitSummary(ev(P('Jordan', 'Ana', 'Sam'), [
    { id: 'x1', who: 'p0', what: 'the turkey', amount: 60 }, { id: 'x2', who: 'p1', what: 'drinks', amount: 30 },
  ]));
  expect(text).toBe([
    'Vida’s Friendsgiving — $90.00 total, split 3 ways ($30.00 each).',
    'Jordan paid $60.00 for the turkey.',
    'Ana paid $30.00 for drinks.',
    '',
    'Sam pays Jordan $30.00.',
  ].join('\n'));
  expect(text).not.toMatch(/\b(paid you|sent|charged|requested)\b/i);
  expect(splitSummary(ev(P('A'), []))).toBe('');
});
