// ─── THE BORROWED LIST GOES BACK (owner pick B, 11/21/2026) ──────────────────
// Eight return rows open "Borrowed · N of M back" on Space, seats & helpers.
// Helper-supplied items appear on their own; Add it (What + From whom); Mark
// returned; "Still to go back: …". A row is done when everything is back.
// e2e twin: hostv2/e2e/theBorrowedListGoesBack.spec.mjs.
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';
import { borrowedList, markReturned, addBorrowed, BORROWED_ROW } from '../borrowedList';
import { duplicateEvent } from '../duplicateEvent';
// INPUTS ONLY changed (six root causes, cause 1, part 2): the row is passed
// with its id, the way the app identifies it; its step's declared facts, not
// its words, prove it handled. Assertions unchanged.

const ev = (type, extra = {}) => ({ id: 'br', type, date: '2026-11-19', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', ...extra });
const ROWS = [
  ['Anniversary', /^Return the borrowed projector/],
  ['Retirement Party', /^Return every borrowed platter/],
  ['Thanksgiving Hosting', /^Wash and return every borrowed pan/],
  ['Housewarming', /^Get the borrowed chairs/],
  ['Anniversary', /^Return what family lent/],
  ['Reunion', /^Get every borrowed cooler/],
  ['Wedding', /^Give back what family lent you/],
  ["New Year's Eve Party", /^Wash and return the borrowed flutes/],
];

describe.each(ROWS)('%s: %s', (type, re) => {
  const r = (playbookChecklist(ev(type), '2026-10-01') || []).find((x) => re.test(x.task));
  test('premise: the row is in the playbook', () => { expect(r).toBeTruthy(); });
  test('it opens the borrowed list on Space, seats & helpers', () => {
    const hit = routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, ev(type));
    expect(hit && hit.label).toBe('Open the borrowed list');
    expect(resolveRoute(hit.route)).toEqual({ kind: 'space', focus: 'borrowed' });
  });
  test('it is done only when there is a list and everything on it is back', () => {
    const t = { id: r.id, task: r.task };
    expect(taskSatisfied(ev(type), t)).toBe(false);
    const one = ev(type, { borrowed: [{ id: 'b1', what: 'Coffee urn', from: 'Aunt Rose', returned: false }] });
    expect(taskSatisfied(one, t)).toBe(false);
    expect(taskSatisfied({ ...one, borrowed: markReturned(one, borrowedList(one).rows[0]) }, t)).toBe(true);
  });
});

test('Anniversary\u2019s lent photos open the list too, but sending the digital copies is the host\u2019s tick', () => {
  const r = (playbookChecklist(ev('Anniversary'), '2026-10-01') || []).find((x) => /^Give back every original photo/.test(x.task));
  expect(resolveRoute(routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, ev('Anniversary')).route)).toEqual({ kind: 'space', focus: 'borrowed' });
  expect(taskSatisfied(ev('Anniversary', { borrowed: [{ id: 'b1', what: 'Photos', from: 'Mom', returned: true }] }), { id: r.id, task: r.task })).toBe(false);
});

test('borrowing rows that are not returns keep their own routes', () => {
  for (const s of ['Count card tables and chairs: … Borrow or rent folding card tables if short',
    'Discreetly get ring size — borrow a ring off the right finger',
    'Count serving dishes, the roasting pan, and the thermometer against the menu — and borrow what is missing now']) {
    expect(BORROWED_ROW.test(s)).toBe(false);
  }
});

test('helper items appear on their own, hand-added items join them, and still-to-go names who is owed what', () => {
  const e = ev('Retirement Party', {
    capacityHelpers: { chairs: 'Grace Church hall', mic: 'Dave Kim', ice: '', tents: 'Skipped Sam' },
    capacitySkip: { tents: true },
    borrowed: [
      { id: 'b1', what: 'Coffee urn', from: 'Aunt Rose', returned: false },
      { id: 'b2', what: 'Three platters', from: 'Grandma June', returned: true },
      { id: 'b3', what: 'chafing dishes', from: 'Aunt Rose', returned: false },
    ],
  });
  const b = borrowedList(e, { chairs: 'chairs', mic: 'microphone + speaker' });
  expect(b.rows.map((r) => [r.what, r.from, r.returned])).toEqual([
    ['chairs', 'Grace Church hall', false], ['microphone + speaker', 'Dave Kim', false],
    ['Coffee urn', 'Aunt Rose', false], ['Three platters', 'Grandma June', true], ['chafing dishes', 'Aunt Rose', false]]);
  expect([b.back, b.total]).toEqual([1, 5]);
  expect(b.stillToGo).toBe('Grace Church hall (chairs) · Dave Kim (microphone + speaker) · Aunt Rose (Coffee urn, chafing dishes)');
  // Marking a helper item returned keeps it in the one field.
  const next = markReturned(e, b.rows[0]);
  expect(next.find((x) => x.helperKey === 'chairs')).toEqual({ id: 'cap:chairs', helperKey: 'chairs', returned: true });
  expect(borrowedList({ ...e, borrowed: next }).back).toBe(2);
});

test('Add it needs a What', () => {
  expect(addBorrowed({}, '  ', 'Aunt Rose')).toBeNull();
  expect(addBorrowed({}, 'Coffee urn', 'Aunt Rose', 'b9')).toEqual([{ id: 'b9', what: 'Coffee urn', from: 'Aunt Rose', returned: false }]);
});

test('a duplicated event does not carry last time’s borrowed list', () => {
  expect(duplicateEvent(ev('Reunion', { borrowed: [{ id: 'b1', what: 'Cooler', from: 'Lee' }] }), { id: 'n', now: '2026-11-21T00:00:00Z' }).borrowed).toBeUndefined();
});
