// ─── THE CHECKLIST FOLLOWS THE DECISIONS ────────────────────────────────────
//
// The audit of 2026-08-21 found `event.timeline` seeded once at creation and
// never asked again, so four working gates inside `playbookChecklist` were
// dead from the moment an event existed.
//
// THE TRAP THE AUDIT NAMED, and the reason this file leads with the real
// playbook rather than fixtures: a naively written version of this test passes
// against the FROZEN code. The seeded list already contains the pickup row, so
// asserting "the pickup row is present" proves nothing at all. The assertion
// has to be that the row LEAVES when the decision changes and that the steaming
// rows ARRIVE — both directions, against the real generator.
import { playbookChecklist } from '../playbooks';
import { reconcileChecklist, reconcileSummary } from '../checklistReconcile';

const CRAB = { id: 'ev-t', type: 'crab feast', date: '2026-09-20', guestCount: 20 };
const seed = (ev) => (playbookChecklist(ev) || []).map((r) => ({
  id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null,
  task: r.task || '', done: false, owner: '', category: r.category || '',
}));
const openTasks = (rows) => rows.filter((r) => !r.retired).map((r) => r.task);
const pick = (v) => ({ ...CRAB, foodChoices: { steam_vs_order: v } });

const ORDERING = 'Order steamed for pickup';
const STEAMING = 'Steam them myself';
const PICKUP_ROW = /Lock a hot pickup slot/;
const STEAMER_ROW = /Rent or borrow a rack steamer pot/;

describe('a decision taken after creation reshapes what is left to do', () => {
  test('PREMISE — the generator really does swap these tasks', () => {
    // Test the premise before testing the fix. If the generator did not
    // actually differ by this pick, everything below would be theater.
    const ordering = seed(pick(ORDERING)).map((r) => r.task);
    const steaming = seed(pick(STEAMING)).map((r) => r.task);
    expect(ordering.some((t) => PICKUP_ROW.test(t))).toBe(true);
    expect(ordering.some((t) => STEAMER_ROW.test(t))).toBe(false);
    expect(steaming.some((t) => STEAMER_ROW.test(t))).toBe(true);
    expect(steaming.some((t) => PICKUP_ROW.test(t))).toBe(false);
  });

  test('switching to steaming retires the pickup rows and adds the steaming ones', () => {
    const stored = seed(pick(ORDERING));                 // created while ordering
    expect(openTasks(stored).some((t) => PICKUP_ROW.test(t))).toBe(true);

    const res = reconcileChecklist(stored, playbookChecklist(pick(STEAMING)));

    expect(res.changed).toBe(true);
    const open = openTasks(res.rows);
    // The new work arrived...
    expect(open.some((t) => STEAMER_ROW.test(t))).toBe(true);
    // ...and the work that is no longer real is off the open list.
    expect(open.some((t) => PICKUP_ROW.test(t))).toBe(false);
    // But it was RETIRED, not deleted — the row still exists, carrying why.
    const gone = res.rows.find((r) => PICKUP_ROW.test(r.task));
    expect(gone).toBeTruthy();
    expect(gone.retired).toBe(true);
    expect(gone.retiredReason).toMatch(/\w/);
  });

  test('a retired row REVIVES with its done state when the host changes back', () => {
    const stored = seed(pick(ORDERING));
    // The host had already booked the pickup slot before changing their mind.
    const i = stored.findIndex((r) => PICKUP_ROW.test(r.task));
    stored[i] = { ...stored[i], done: true, owner: 'Todd' };

    const away = reconcileChecklist(stored, playbookChecklist(pick(STEAMING)));
    expect(away.rows.find((r) => PICKUP_ROW.test(r.task)).retired).toBe(true);

    const back = reconcileChecklist(away.rows, playbookChecklist(pick(ORDERING)));
    const row = back.rows.find((r) => PICKUP_ROW.test(r.task));
    // THE POINT: it is the same row. Deleting and regenerating would have
    // handed the host an unticked task they had already finished.
    expect(row.retired).toBeUndefined();
    expect(row.done).toBe(true);
    expect(row.owner).toBe('Todd');
    // TWO, not one: the ordering path authors both "lock a pickup slot" and
    // "collect the hot crabs". Asserted as the exact count rather than a
    // truthy check, because "some rows came back" would not have noticed if
    // only half the pair revived.
    expect(back.revived).toBe(2);
    // And the swap is symmetric: going back retires the STEAMING rows that had
    // arrived in the meantime. (I first asserted zero retired rows here, which
    // was wrong in an interesting way — it would only hold if the reconcile
    // worked in one direction.)
    const stillRetired = back.rows.filter((r) => r.retired).map((r) => r.task);
    expect(stillRetired.length).toBe(2);
    expect(stillRetired.some((t) => STEAMER_ROW.test(t))).toBe(true);
    expect(stillRetired.some((t) => PICKUP_ROW.test(t))).toBe(false);
  });
});

describe('what reconciling must never do', () => {
  test('it never touches a row the host wrote', () => {
    const manual = { id: 'own-1', task: 'Call Mom about the tablecloth', done: true, owner: 'me' };
    const stored = [...seed(pick(ORDERING)), manual];
    const res = reconcileChecklist(stored, playbookChecklist(pick(STEAMING)));
    const still = res.rows.find((r) => r.id === 'own-1');
    expect(still).toEqual(manual);
  });

  test('it never forgets what the host finished', () => {
    const stored = seed(pick(ORDERING)).map((r, i) => (i % 2 === 0 ? { ...r, done: true } : r));
    const doneBefore = stored.filter((r) => r.done).map((r) => r.id).sort();
    const res = reconcileChecklist(stored, playbookChecklist(pick(ORDERING)));
    const doneAfter = res.rows.filter((r) => r.done).map((r) => r.id).sort();
    expect(doneAfter).toEqual(doneBefore);
  });

  test('an empty derivation is NO INFORMATION, never "retire everything"', () => {
    // The 9 typeless event types the audit found produce exactly this, so the
    // guard is not hypothetical: without it, opening a Town Hall would retire
    // the host's entire list in one pass, silently and un-undoably.
    const stored = seed(pick(ORDERING));
    for (const empty of [[], null, undefined]) {
      const res = reconcileChecklist(stored, empty);
      expect(res.changed).toBe(false);
      expect(res.rows).toBe(stored);
      expect(res.retired).toBe(0);
    }
  });

  test('it is IDEMPOTENT — a second pass finds nothing to do', () => {
    // Load-bearing: the caller runs this whenever the event changes and patches
    // only when `changed` is true. If a no-op pass reported a change, the app
    // would write the event, re-render, reconcile, and write again forever.
    const stored = seed(pick(ORDERING));
    const first = reconcileChecklist(stored, playbookChecklist(pick(STEAMING)));
    expect(first.changed).toBe(true);
    const second = reconcileChecklist(first.rows, playbookChecklist(pick(STEAMING)));
    expect(second.changed).toBe(false);
    expect(second.rows).toEqual(first.rows);
  });

  test('a changed LABEL is refreshed, and refreshing it alone stays quiet', () => {
    const stored = seed(pick(ORDERING));
    const i = stored.findIndex((r) => r.id.startsWith('pbt-'));
    stored[i] = { ...stored[i], task: 'stale wording from an older generation' };
    const res = reconcileChecklist(stored, playbookChecklist(pick(ORDERING)));
    expect(res.relabeled).toBeGreaterThan(0);
    expect(res.rows[i].task).not.toMatch(/stale wording/);
    // A relabel is not news. Only arrivals and departures are worth a toast.
    expect(reconcileSummary(res)).toBe('');
  });
});

describe('what the host is told', () => {
  test('the summary names arrivals and departures, and is silent on a no-op', () => {
    const stored = seed(pick(ORDERING));
    const res = reconcileChecklist(stored, playbookChecklist(pick(STEAMING)));
    const line = reconcileSummary(res);
    expect(line).toMatch(/new task/);
    expect(line).toMatch(/no longer needed/);
    expect(reconcileSummary({ changed: false })).toBe('');
    expect(reconcileSummary(null)).toBe('');
  });
});

describe('a retired row carries no responsibility', () => {
  // Found by the ownership review board, not by a test. `retired` was a new
  // flag and `deriveHelperResponsibilities` had no way to know it existed, so
  // a helper assigned to a row the host had since decided against stayed in
  // the Helpers panel — and rode into the next "Message all helpers" draft.
  //
  // This is the one class of stale state that leaves the app. A wrong count on
  // screen is a bad number; a wrong name in a draft asks a real person for
  // something that is no longer wanted.
  const { deriveHelperResponsibilities } = require('../helperResponsibility');

  const evWith = (rows) => ({
    id: 'ev-h', type: 'crab feast', date: '2026-09-20', guestCount: 12,
    guests: [{ id: 'g1', name: 'Marcus' }],
    timeline: rows,
  });
  const row = (extra) => ({
    id: 'pbt-ev-h-t_pickup', task: 'Lock a hot pickup slot at the crab house',
    owner: 'Marcus', done: false, ...extra,
  });

  test('PREMISE — an owned, live row DOES produce a responsibility', () => {
    // Without this, the assertion below passes on a reader that returns
    // nothing at all, which is the same green for a very different reason.
    // Returns { helpers, responsibilities }, not a bare array — checked in the
    // source rather than assumed a second time.
    const { responsibilities } = deriveHelperResponsibilities(evWith([row()]));
    expect(responsibilities.some((r) => r.itemType === 'task' && /pickup slot/i.test(r.label))).toBe(true);
  });

  test('the same row, retired, produces none', () => {
    const { responsibilities, helpers } = deriveHelperResponsibilities(
      evWith([row({ retired: true, retiredReason: 'your answers changed what this needs' })]));
    expect(responsibilities.some((r) => /pickup slot/i.test(r.label))).toBe(false);
    // And the helper leaves the panel with it — a name with nothing to do is
    // what turns into an unwanted line in "Message all helpers".
    expect(helpers.some((h) => h.name === 'Marcus')).toBe(false);
  });

  test('retiring one row does not silence the others', () => {
    const live = { ...row(), id: 'pbt-ev-h-t_ice', task: 'Get the ice' };
    const { responsibilities } = deriveHelperResponsibilities(evWith([row({ retired: true }), live]));
    expect(responsibilities.some((r) => /Get the ice/i.test(r.label))).toBe(true);
    expect(responsibilities.some((r) => /pickup slot/i.test(r.label))).toBe(false);
  });
});

describe('a job that leaves the list does not leave quietly', () => {
  // Grandmother's condition on the ownership ruling (2026-08-21). The engine
  // knows it stood the job down; the person who agreed to do it does not, and
  // the host is the only one who can close that gap. Counting them ("1 person
  // affected") is not something anyone can act on — the sentence has to carry
  // the name.
  const evOf = (v) => ({ id: 'x', type: 'crab feast', date: '2026-09-20', guestCount: 20, foodChoices: { steam_vs_order: v } });
  const seedRows = (v) => (playbookChecklist(evOf(v)) || []).map((r) => ({
    id: r.id, task: r.task || '', week: r.week || '', leadDays: r.leadDays ?? null,
    done: false, owner: '', category: r.category || '',
  }));

  const retireWithOwner = (owner) => {
    const stored = seedRows('Order steamed for pickup');
    const i = stored.findIndex((r) => /Lock a hot pickup slot/i.test(r.task));
    expect(i).toBeGreaterThanOrEqual(0);
    stored[i] = { ...stored[i], owner };
    return reconcileChecklist(stored, playbookChecklist(evOf('Steam them myself')));
  };

  test('the retired row reports whose it was', () => {
    const res = retireWithOwner('Wanda');
    expect(res.retiredOwners).toContain('Wanda');
    expect(reconcileSummary(res)).toMatch(/Wanda had one of those/);
  });

  test('an UNOWNED retirement says nothing about people', () => {
    // Red-proofs the clause: appending it unconditionally would pass the test
    // above and put a dangling sentence on every ordinary reconcile.
    const res = retireWithOwner('');
    expect(res.retiredOwners).toEqual([]);
    expect(reconcileSummary(res)).not.toMatch(/had one of those|you may want to say so/);
  });

  test('two people are named, not counted', () => {
    const stored = seedRows('Order steamed for pickup');
    let n = 0;
    for (let i = 0; i < stored.length; i++) {
      if (/pickup slot|hot steamed crabs/i.test(stored[i].task)) { stored[i] = { ...stored[i], owner: n === 0 ? 'Wanda' : 'Marcus' }; n += 1; }
    }
    expect(n).toBe(2);
    const res = reconcileChecklist(stored, playbookChecklist(evOf('Steam them myself')));
    const line = reconcileSummary(res);
    expect(line).toMatch(/Wanda/);
    expect(line).toMatch(/Marcus/);
    expect(line).not.toMatch(/2 people/);
  });
});
