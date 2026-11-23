// ─── A SETTLED ASK SURVIVES A RELOAD (six root causes, cause 2) ──────────────
//
// P1-2: the board's ask came back after a reload because "settled" was a
// useState in the shell. Now it is one field on the event (lib/settledAsks).
// For every playbook, at two guest counts and with and without a budget, this
// settles one ask of EACH kind the board raises (phase cue, decision record,
// step, registry raise, the ladder's top action…), saves the event the way the
// store does (JSON), loads it back, re-runs the plan, and asserts the ask is
// still settled — and that nothing else was hidden with it.
const fs = require('fs');
const path = require('path');
const pbm = require('../playbooks');
const { eventPlan } = require('../../CommandCenter');
const { withSettled, withoutSettled, isAskSettled, unsettledActions, settledAskIds } = require('../settledAsks');

const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const reload = (e) => JSON.parse(JSON.stringify(e));
const kindOf = (id) => String(id).split(':')[0] || 'top';

describe('a settled ask stays settled across a reload, on every playbook', () => {
  test('one ask of every kind, settled, saved, loaded back: still settled; nothing else hidden', () => {
    const wrong = [];
    const kinds = new Set();
    let settled = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const [guestCount, totalBudget] of [[14, ''], [60, 4000]]) {
        const ev = { id: `ev-settle-${pb.type}`, type: pb.type, name: 'Settle', date: dayOut(30), startTime: '15:00', guestMode: 'count', guestCount, totalBudget, guests: [], vendors: [], budget: [], timeline: [] };
        const plan = eventPlan(ev);
        const ids = (plan.nextActions || []).map((a) => a && a.id).filter(Boolean);
        const byKind = new Map();
        for (const id of ids) if (!byKind.has(kindOf(id))) byKind.set(kindOf(id), id);
        for (const [k, id] of byKind) {
          kinds.add(k);
          const saved = reload({ ...ev, ...withSettled(ev, [id]) });
          settled += 1;
          if (!isAskSettled(saved, id)) { wrong.push(`${pb.type}/${guestCount}: ${id} not settled after reload`); continue; }
          const after = eventPlan(saved);
          const open = unsettledActions(after.nextActions, saved).map((a) => a.id);
          if (open.includes(id)) wrong.push(`${pb.type}/${guestCount}: ${id} shown again after reload`);
          const others = ids.filter((x) => x !== id && (after.nextActions || []).some((a) => a.id === x));
          const lost = others.filter((x) => !open.includes(x));
          if (lost.length) wrong.push(`${pb.type}/${guestCount}: settling ${id} also hid ${lost.join(', ')}`);
          // Undo brings it back, through the same writer.
          const undone = reload({ ...saved, ...withoutSettled(saved, [id]) });
          if (isAskSettled(undone, id) || settledAskIds(undone).length) wrong.push(`${pb.type}: undo left ${id} settled`);
        }
      }
    }
    expect(wrong.slice(0, 30)).toEqual([]);
    expect(settled).toBeGreaterThan(47 * 2);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  test('the writer is idempotent and keeps her order', () => {
    const e = { settledAsks: ['a'] };
    expect(withSettled(e, ['a'])).toBeNull();
    expect(withSettled(e, ['b', 'a', 'b'])).toEqual({ settledAsks: ['a', 'b'] });
    expect(withoutSettled(e, ['z'])).toBeNull();
    expect(settledAskIds({ settledAsks: 'junk' })).toEqual([]);
  });

  test('the shell keeps no second copy: the queue reads the event, and the settle writes it', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(shell).not.toMatch(/const \[satisfiedIds, setSatisfiedIds\] = useState/);
    expect(shell).toMatch(/unsettledActions\(/);
    expect(shell).toMatch(/withSettled\(/);
  });
});
