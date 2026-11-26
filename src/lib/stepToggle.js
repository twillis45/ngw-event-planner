// ─── ONE TICK FOR A STEP ────────────────────────────────────────────────────
// hostv2's toggleTask, moved here so hostv4's day-before "Tonight" ticks a plan
// step the same way (B2 the day before, 11/26/2026). A tick records more than
// `done`:
//   · RAW FEEDS TRUTH: checking a buy/shop step is the host asserting the
//     purchases happened, so the items it names (lib/shopTaskItems) are marked
//     bought in foodGot. Unchecking never un-buys (asymmetric on purpose).
//   · A TICK RECORDS WHAT IT STANDS FOR: "Send the invite" writes invitesSentAt,
//     "Collect dietary needs" writes dietaryNoted (taskEngine factsATickRecords).
//     Checking only; unchecking never un-sends.
//   · A tick on a send step sends nothing and records no send, and says so.
// The message counts what is still open the way the checklist counts it.
import { factsATickRecords, timelineStepResolved } from './taskEngine';
import { itemsBoughtByTask } from './shopTaskItems';
import { stepIsASend } from './stepTarget';
import { openSteps } from './openSteps';
import { taskDueInDays } from './taskLead';

/** The patch and message for ticking (or reopening) timeline step `i`.
 *  `foodList` is the food plan's list (playbookFoodPlan(event).list). */
export function stepToggleEdit(event, i, foodList) {
  const ev = event || {};
  const src = Array.isArray(ev.timeline) ? ev.timeline : [];
  if (!src[i]) return null;
  const tl = src.map((t, ix) => (ix === i ? { ...t, done: !t.done } : t));
  const open = tl.filter((t) => t && !t.done && !timelineStepResolved(ev, t)).length;
  let extra = {};
  let boughtNote = '';
  const list = Array.isArray(foodList) ? foodList : [];
  const buys = tl[i].done ? itemsBoughtByTask(tl[i].task, list) : { scope: 'none', ids: [] };
  if (buys.scope !== 'none') {
    // Ungated: an unpriced line is marked bought at its honest estimate, and the
    // message says how many landed at an estimate (the firm test hostSpending uses).
    const got = { ...(ev.foodGot || {}) };
    const real = (ev.foodReal && typeof ev.foodReal === 'object') ? ev.foodReal : {};
    let n = 0; let firm = 0;
    list.forEach((it) => {
      if (!it || it.skipped || got[it.id] || !buys.ids.includes(it.id)) return;
      got[it.id] = true; n += 1;
      if (it.added || (it.locked != null && real[it.id])) firm += 1;
    });
    if (n > 0) {
      extra = { foodGot: got };
      const est = n - firm;
      boughtNote = ' ' + n + ' item' + (n === 1 ? '' : 's') + ' marked bought'
        + (est > 0 ? ' (' + est + ' at an estimate — tap any to add the real price).' : '.');
    }
  }
  if (tl[i].done) extra = { ...extra, ...factsATickRecords(ev, src[i]) };
  const sentNothing = tl[i].done && stepIsASend(ev, tl[i]) ? ' Nothing was sent from here.' : '';
  return {
    patch: { timeline: tl, ...extra },
    msg: (tl[i].done ? 'Done: ' : 'Reopened: ') + String(tl[i].task || '').slice(0, 50) + '… — ' + open + ' still open.' + boughtNote + sentNothing,
  };
}

/** Tonight, the evening before: the open steps due today, each with its index
 *  in event.timeline (so a tick flips that step). Same "open" as lib/openSteps. */
export function tonightsSteps(event, now) {
  const ev = event || {};
  const tl = Array.isArray(ev.timeline) ? ev.timeline : [];
  const left = new Set(openSteps(ev, now).left);
  return tl.map((t, index) => ({ t, index }))
    .filter(({ t }) => left.has(t) && taskDueInDays(t, ev, now) === 0)
    .map(({ t, index }) => ({ index, id: t.id, task: t.task }));
}
