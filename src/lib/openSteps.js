// ─── OPEN STEPS — the one count of what is left in the plan ─────────────────
// Owner, 11/26/2026: "App is lying somewhere". On the day one board read "20
// things still open", "27 plan steps still open" and "Needs you — 9 overdue":
// three rules, labelled alike. Every surface now takes its numbers here.
//   left — steps not done (effectiveDone: ticked, or the plan proves it handled)
//   past — of those, past their window, whether or not the plan existed then
//   late — of those, due after the plan was made (the host's to answer for)
// left ⊇ past ⊇ late, so no surface can print a part larger than its whole.
import { effectiveDone } from './taskEngine';
import { taskIsOpenPastWindow, taskIsOverdue } from './taskLead';

export function openSteps(event, now) {
  const ev = event || {};
  const tl = Array.isArray(ev.timeline) ? ev.timeline.filter((t) => t && t.task && !t.retired) : [];
  const left = tl.filter((t) => { try { return !effectiveDone(ev, t); } catch { return !t.done; } });
  const past = left.filter((t) => taskIsOpenPastWindow(t, ev, now));
  const late = past.filter((t) => taskIsOverdue(t, ev, now));
  return { left, past, late };
}

export function openStepCounts(event, now) {
  const s = openSteps(event, now);
  return { left: s.left.length, past: s.past.length, late: s.late.length };
}

// The one phrase for `past`, on the alert and the checklist row alike.
export const pastWindowLabel = (n) => `${n} step${n === 1 ? '' : 's'} past ${n === 1 ? 'its' : 'their'} window`;
