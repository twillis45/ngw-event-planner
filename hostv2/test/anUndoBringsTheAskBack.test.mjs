import { describe, expect, it } from 'vitest';
import { createSetDown, undoThatBringsBack, settleCountRow } from '../src/setDown.js';

// THE SETTLE PATHS' UNDO BRINGS THE ASK BACK (batch 11, #229 Left: "the
// bundle Undo paths at ~9392 and ~9726 are unverified").
//
// A model of the shell's state, wired the way HostShellV2 wires it:
//   settleAndSetDown = createSetDown(...)       (HostShellV2, ONE WAY TO SET AN ASK DOWN)
//   patchEvent reads `pending` as it writes, and either
//     · hero path: puts the ids on the new receipt, whose Undo unmarks them, or
//     · toast path: wraps the toast's Undo with undoThatBringsBack.
// Each path below is one of the shell's settle sites.
function shell({ toHero }) {
  const pending = { current: [] };
  const st = { satisfied: [], receipt: null, toastUndo: null, data: { catererCount: 40, guestCount: 30 } };
  const unmark = (ids) => { st.satisfied = st.satisfied.filter((x) => !ids.includes(x)); };
  const settleAndSetDown = createSetDown({
    pending,
    markSatisfied: (id) => { if (!st.satisfied.includes(id)) st.satisfied.push(id); },
    addToReceipt: (id) => { if (st.receipt && !st.receipt.satisfied.includes(id)) st.receipt.satisfied.push(id); },
  });
  const patchEvent = (obj) => {
    const prev = Object.fromEntries(Object.keys(obj).map((k) => [k, st.data[k]]));
    st.data = { ...st.data, ...obj };
    const undoFn = () => { st.data = { ...st.data, ...prev }; };
    const pend = pending.current; pending.current = [];
    if (toHero) st.receipt = { satisfied: [...pend], fn: undoFn };
    else st.toastUndo = undoThatBringsBack(pend, undoFn, unmark);
  };
  const undo = () => {
    if (toHero) { const r = st.receipt; st.receipt = null; unmark(r.satisfied); r.fn(); } else st.toastUndo();
  };
  return { st, settleAndSetDown, patchEvent, undo };
}

for (const toHero of [true, false]) {
  const path = toHero ? 'hero receipt' : 'toast';
  describe(`Undo brings the ask back (${path})`, () => {
    it('a count-resolution row: "Match confirmed yeses"', () => {
      const s = shell({ toHero });
      settleCountRow({
        write: () => s.patchEvent({ catererCount: 28 }),
        onSettled: (write) => s.settleAndSetDown('count-mismatch', write),
      });
      expect(s.st.data.catererCount).toBe(28);
      expect(s.st.satisfied).toEqual(['count-mismatch']);
      s.undo();
      expect(s.st.data.catererCount).toBe(40);
      expect(s.st.satisfied).toEqual([]);
    });
    it('the guests editor: "Lock N in" (the ~9392 path)', () => {
      const s = shell({ toHero });
      s.settleAndSetDown('guests', () => s.patchEvent({ guestCount: 34 }));
      s.undo();
      expect(s.st.data.guestCount).toBe(30);
      expect(s.st.satisfied).toEqual([]);
    });
    it('the food editor: a pick on a lone food cue (the ~9726 path)', () => {
      const s = shell({ toHero });
      s.settleAndSetDown('phase:food', () => s.patchEvent({ sourcing: 'host cooks' }));
      expect(s.st.satisfied).toEqual(['phase:food']);
      s.undo();
      expect(s.st.satisfied).toEqual([]);
    });
    it('the food editor on a bundle (records): nothing is set down, so the Undo has nothing to bring back', () => {
      const s = shell({ toHero });
      s.settleAndSetDown(null, () => s.patchEvent({ sourcing: 'host cooks' }));
      expect(s.st.satisfied).toEqual([]);
      s.undo();
      expect(s.st.data.sourcing).toBeUndefined();
    });
    it('a count row with no settle (the drift bridge outside the hero) just writes', () => {
      const s = shell({ toHero });
      let closed = false;
      settleCountRow({ write: () => s.patchEvent({ catererCount: 28 }), close: () => { closed = true; } });
      expect(s.st.data.catererCount).toBe(28);
      expect(closed).toBe(true);
    });
  });
}
