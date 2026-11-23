// ─── SETTING AN ASK DOWN, AND BRINGING IT BACK ON UNDO ──────────────────────
//
// Moved out of HostShellV2 (batch 11, 11/23/2026) so vitest can run the order
// these steps happen in. The shell keeps the state; this file is the rules.
//
// A settle marks its ask satisfied (the board rolls to the next one) and must
// put that id on the Undo its own write raises, so the Undo brings the ask back
// (audit 2 P1-1). patchEvent reads the ids pending at the moment it writes
// (`pending`), and either puts them on the hero receipt or wraps the toast's
// Undo with them (`undoThatBringsBack`).
//
// THE ORDER IS THE RULE. The write has to run INSIDE the settle, while the id is
// pending. The two count-resolution rows ("Match confirmed yeses", "Hold N
// plates") wrote first and settled after, so the id was never pending when the
// write raised its Undo: on the toast path that Undo put the count back and left
// the ask set down (batch 11, #229 Left: "the bundle Undo paths are
// unverified"). settleCountRow runs the write through the settle.

export function createSetDown({ pending, markSatisfied, addToReceipt }) {
  return (id, write) => {
    if (id != null) pending.current = [...pending.current, id];
    try { if (write) write(); } finally {
      if (id != null) {
        pending.current = pending.current.filter((x) => x !== id);
        markSatisfied(id);
        addToReceipt(id);
      }
    }
  };
}

// The toast's Undo for a write that set asks down: it brings them back first.
export function undoThatBringsBack(pend, undoFn, unmarkSatisfied) {
  return pend && pend.length ? () => { unmarkSatisfied(pend); return undoFn(); } : undoFn;
}

// A count-resolution row: the write runs through the settle (see above).
export function settleCountRow({ write, close, onSettled }) {
  if (onSettled) onSettled(write); else write();
  if (close) close();
}
