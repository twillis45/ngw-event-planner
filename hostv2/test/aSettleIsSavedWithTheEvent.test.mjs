import { describe, expect, it } from 'vitest';
import { createSetDown, undoThatBringsBack, carrySettled } from '../src/setDown.js';
import { isAskSettled, withSettled, withoutSettled } from '@app/lib/settledAsks';

// A SETTLED ASK IS SAVED WITH THE EVENT (six root causes, cause 2, P1-2).
// A model of the shell wired the way HostShellV2 wires it now: patchEvent
// carries the pending settles in its own write (carrySettled), a settle with
// no write saves itself (markSatisfied → writeSettled), and both Undo paths
// write the ask back. "Reload" is the store's JSON round trip.
function shell({ toHero }) {
  const pending = { current: [] };
  const saved = new Set();
  const st = { event: { id: 'e', guestCount: 30 }, receipt: null, toastUndo: null };
  const patchEvent = (obj0, msg) => {
    const c = carrySettled(obj0, st.event, pending.current);
    const obj = c.obj;
    const prev = Object.fromEntries(Object.keys(obj).map((k) => [k, st.event[k]]));
    st.event = JSON.parse(JSON.stringify({ ...st.event, ...obj }));
    c.ids.forEach((id) => saved.add(id));
    if (!msg) return;
    const undoFn = () => { st.event = { ...st.event, ...prev }; };
    const pend = pending.current; pending.current = [];
    if (toHero) st.receipt = { satisfied: [...pend], fn: undoFn };
    else st.toastUndo = undoThatBringsBack(pend, undoFn, (ids) => writeSettled(ids, false));
  };
  const writeSettled = (ids, on) => {
    const p = on ? withSettled(st.event, ids) : withoutSettled(st.event, ids);
    if (p) patchEvent(p, '');
  };
  const settleAndSetDown = createSetDown({
    pending,
    markSatisfied: (id) => { if (saved.delete(String(id))) return; writeSettled([id], true); },
    addToReceipt: (id) => { if (st.receipt && !st.receipt.satisfied.includes(id)) st.receipt.satisfied.push(id); },
  });
  const undo = () => {
    if (toHero) { const r = st.receipt; st.receipt = null; writeSettled(r.satisfied, false); r.fn(); } else st.toastUndo();
  };
  const reload = () => { st.event = JSON.parse(JSON.stringify(st.event)); };
  return { st, settleAndSetDown, patchEvent, undo, reload };
}

for (const toHero of [true, false]) {
  const path = toHero ? 'hero receipt' : 'toast';
  describe(`a settled ask is saved with the event (${path})`, () => {
    it('settled by an answer: saved in the same write, still settled after a reload', () => {
      const s = shell({ toHero });
      s.settleAndSetDown('phase:food', () => s.patchEvent({ sourcing: 'host cooks' }, 'Host cooks.'));
      s.reload();
      expect(isAskSettled(s.st.event, 'phase:food')).toBe(true);
      expect(s.st.event.sourcing).toBe('host cooks');
    });
    it('the answer\'s Undo brings the ask back, and a reload keeps it back', () => {
      const s = shell({ toHero });
      s.settleAndSetDown('guests', () => s.patchEvent({ guestCount: 34 }, 'Locked 34.'));
      s.undo();
      s.reload();
      expect(s.st.event.guestCount).toBe(30);
      expect(isAskSettled(s.st.event, 'guests')).toBe(false);
    });
    it('a settle with no write of its own still saves itself', () => {
      const s = shell({ toHero });
      s.settleAndSetDown('decision:cook_method', null);
      s.reload();
      expect(isAskSettled(s.st.event, 'decision:cook_method')).toBe(true);
    });
  });
}
