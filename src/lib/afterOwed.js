// ─── WHAT IS STILL OWED AFTER THE DAY (audit 2 lane C P1-4, P1-9, P1-10) ──────
//
// The past board's guide line said "Nothing needs you now" — or named the
// first after-task, a rentals return — while the wrap-up ledger below it read
// "Settle up with Bluemont Vineyard" and the vendor's balance was $12,000
// unpaid; the wrap-up count then printed "all clear" over it. And a trip's
// After counted its days from the FIRST day.
//
// One reader for what the board says is owed:
//   · an unpaid committed vendor balance (the wrap-up ledger's `payments` part,
//     phaseProgress) is owed, and it leads — it is money, and it is due now;
//   · then the playbook's after-steps whose day has come, counted from the
//     event's LAST day;
//   · `clear` is true only when neither exists.

import { daysUntilEnd } from './dates';
import { playbookChecklist } from './playbooks';
import { effectiveDone } from './taskEngine';
import { deriveEventPhaseProgress } from './phaseProgress';

const stripDot = (s) => String(s || '').replace(/\.$/, '');

export function afterOwed(event, now = new Date(), typeWord) {
  const toEnd = daysUntilEnd(event, now);
  const agoN = toEnd != null && toEnd < 0 ? -toEnd : 0;
  let rows = [];
  try {
    rows = (playbookChecklist(event) || [])
      .filter((r) => r && typeof r.leadDays === 'number' && r.leadDays > 0)
      .filter((r) => !effectiveDone(event, r))
      .sort((a, b) => a.leadDays - b.leadDays);
  } catch (_e) { rows = []; }
  const due = rows.filter((r) => r.leadDays <= agoN);
  let ledger = [];
  try {
    const pp = deriveEventPhaseProgress(event, now);
    ledger = ((pp && pp.items) || []).filter((i) => i && i.id === 'payments' && !i.handled && i.cueLabel);
  } catch (_e) { ledger = []; }
  const owed = [...ledger.map((i) => i.cueLabel), ...due.map((r) => r.task)];
  const word = String(typeWord || (event && event.type) || 'day').toLowerCase();
  const head = `The ${word} happened — ${agoN === 1 ? 'yesterday' : agoN + ' days ago'}.`;
  const tail = owed.length
    ? `${owed.length === 1 ? 'One thing is' : owed.length + ' things are'} still owed — ${stripDot(owed[0]).replace(/^./, (c) => c.toLowerCase())}.`
    : rows.length
      ? `${rows.length === 1 ? 'One thing comes' : rows.length + ' things come'} after — the first is ${stripDot(rows[0].task).toLowerCase()}.`
      : 'Nothing needs you now; here’s how it landed.';
  return {
    agoN, rows, due, ledger,
    owedCount: owed.length,
    clear: owed.length === 0,
    line: `${head} ${tail}`,
  };
}
