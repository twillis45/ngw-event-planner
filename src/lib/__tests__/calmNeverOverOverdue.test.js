// ─── "NOTHING NEEDS YOU TODAY" OVER THREE PAST-DUE ROWS ──────────────────────
//
// HOST REPORT, 2026-09-18, verbatim: "Nothing needs you today. Not matching
// todos, have items overdue."
//
// REPRODUCED AND MEASURED against the running engine — a Crab Feast 12 days out,
// every essential settled, three hand-ticked checklist rows past their lead:
//
//   AS-IS                       queue 4, calm FALSE, overdue rows 3
//   after ONE round of "not now"  queue 0, calm TRUE,  overdue rows 3
//
//   the hero:  "Nothing needs you today."
//   one scroll below, the same screen:
//     "Borrow the extra folding tables from Dana — 9 days past its window"
//     "Print the parking map for the corner      — 8 days past its window"
//     "Pick up the propane and ice chests        — 2 days past its window"
//
// THE MECHANISM — TWO SNOOZE STORES, ONE FACT:
//   the shell writes  event.snoozed[ACTION id]        (HostShellV2 ~:8561)
//   the row reads     task.snoozedUntil               (lib/taskLead taskIsOverdue)
// Setting down the CARDS emptied the queue; nothing ever set down the WORK. The
// app read one as the other and granted calm.
//
// THE FIX IS NOT TO SILENCE THE ROWS. Writing `snoozedUntil` onto the task when
// its card is snoozed would hide the contradiction by making the app stop calling
// real late work late — a visible lie traded for an invisible one. The rows are
// right; the calm claim is wrong.
import { mayExhale, calmVetoFor } from '../exhaleGate';
import { eventPlan } from '../../CommandCenter';
import { taskIsOverdue, taskWindowClosed } from '../taskLead';

const iso = (d) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

describe('the veto rule', () => {
  test('past-due rows on screen forbid the quiet claim', () => {
    const v = calmVetoFor({ overdueCount: 3 });
    expect(v).toBeTruthy();
    expect(v.kind).toBe('overdue-steps');
    expect(v.label).toBe('3 things are past due');
    expect(mayExhale(true, v)).toBe(false);   // an empty queue no longer licenses calm
  });

  test('one row is said in the singular — a host reads this sentence', () => {
    expect(calmVetoFor({ overdueCount: 1 }).label).toBe('1 thing is past due');
  });

  test('nothing past due, no money worry — calm is granted, as before', () => {
    expect(calmVetoFor({ overdueCount: 0 })).toBe(null);
    expect(mayExhale(true, calmVetoFor({}))).toBe(true);
    expect(mayExhale(true, calmVetoFor())).toBe(true);
  });

  test('the money veto still outranks, and still fires', () => {
    // The 2026-08-03 veto is unchanged: money is the one thing the checklist
    // cannot see. It wins the label when both hold, and a regression here would
    // silently re-open that defect.
    const v = calmVetoFor({ moneyWorry: { category: 'money' }, overdueCount: 5 });
    expect(v.kind).toBe('money');
    expect(mayExhale(true, v)).toBe(false);
  });

  test('a queue that is not empty is not calm either — mayExhale unchanged', () => {
    expect(mayExhale(false, null)).toBe(false);
  });

  test('junk counts claim nothing', () => {
    for (const n of [null, undefined, NaN, -2, 'three']) {
      expect(calmVetoFor({ overdueCount: n })).toBe(null);
    }
  });
});

// ─── THE STATE THAT PRODUCED THE REPORT, END TO END ──────────────────────────
describe('the reported event, reproduced', () => {
  const ev = () => ({
    id: 'calm', type: 'Crab Feast', name: 'Feast', date: iso(12),
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    guestMode: 'count', guestCount: 24, guestEstimate: 24, totalBudget: 1500,
    venue: 'Backyard', venueAddress: '8100 Ryan Way', venueCity: 'Annapolis', venueState: 'MD',
    startTime: '2:00 PM', startTimeSource: 'host',
    rainPlan: 'Tent.', dietaryNoted: true,
    foodChoices: { sourcing: 'host', menu: 'set', crab_size: 'Large', where_to_buy: 'Market', steam: 'Order steamed', sides: 'Corn', drinks: 'Beer' },
    must_have_moment: 'The first bushel',
    vendors: [{ id: 'v1', name: 'Aurora', category: 'Catering', status: 'Confirmed', contractSigned: true, coiReceived: true, coiVerified: true, cost: 400, balancePaid: true, arrivalTime: '13:00' }],
    guests: [],
    timeline: [
      { id: 'A', task: 'Borrow the extra folding tables from Dana', leadDays: -21, done: false },
      { id: 'B', task: 'Pick up the propane and ice chests', leadDays: -14, done: false },
      { id: 'C', task: 'Print the parking map for the corner', leadDays: -20, done: false },
    ],
  });
  // The shell's own calm read, mirrored: queue empty, or one calm-category item.
  const CALM = new Set(['neutral', 'calendar', 'heart']);
  const queueOf = (e) => (eventPlan(e) || {}).nextActions || [];
  const listIsCalm = (q) => q.length === 0 || (q.length === 1 && CALM.has(String(q[0].category || '')));
  // What the STEPS SHEET prints — the same number its `taskDueLabel` renders
  // from. Not taskIsOverdue; see the divergence test below for why that matters.
  const overdueRows = (e) => (e.timeline || []).filter((t) => taskWindowClosed(t, e)).length;

  test('(premise) these rows really do read "past its window" to the host', () => {
    // If this ever goes to 0 the rest of the file proves nothing.
    expect(overdueRows(ev())).toBe(3);
  });

  test('THE DIVERGENCE that made the first fix inert', () => {
    // taskIsOverdue is the BLAME policy: it forgives a row the host snoozed. The
    // steps sheet's label forgives nothing — it is the raw due number. So a row
    // can read "9 days past its window" on screen while the blame policy calls it
    // clear, and a veto built on the blame policy sees nothing to veto.
    //
    // This is not hypothetical: it is exactly what happened. The first version of
    // this veto passed jest and did nothing in the browser.
    const e = ev();
    const rowSnoozed = { ...e, timeline: e.timeline.map((t) => ({ ...t, snoozedUntil: iso(5) })) };
    expect((rowSnoozed.timeline).filter((t) => taskIsOverdue(t, rowSnoozed)).length).toBe(0);
    expect(overdueRows(rowSnoozed)).toBe(3);   // …but the host still reads them as late
  });

  test('(premise) setting the cards down really does empty the queue', () => {
    const e = ev();
    expect(queueOf(e).length).toBeGreaterThan(0);
    const snoozed = {};
    for (const a of queueOf(e)) snoozed[a.id] = iso(11);
    const after = { ...e, snoozed };
    expect(queueOf(after).length).toBe(0);
    expect(listIsCalm(queueOf(after))).toBe(true);   // the old rule said: calm
    expect(overdueRows(after)).toBe(3);              // …over three past-due rows
  });

  test('THE DEFECT: an empty queue no longer grants calm while rows are late', () => {
    const e = ev();
    const snoozed = {};
    for (const a of queueOf(e)) snoozed[a.id] = iso(11);
    const after = { ...e, snoozed };
    const veto = calmVetoFor({ moneyWorry: null, overdueCount: overdueRows(after) });
    expect(mayExhale(listIsCalm(queueOf(after)), veto)).toBe(false);
    expect(veto.label).toBe('3 things are past due');
  });

  test('NEGATIVE CONTROL: tick the rows off and the quiet is granted again', () => {
    // A veto that cannot be cleared is an alarm, not a gate.
    const e = ev();
    const done = { ...e, timeline: e.timeline.map((t) => ({ ...t, done: true })) };
    const snoozed = {};
    for (const a of queueOf(done)) snoozed[a.id] = iso(11);
    const after = { ...done, snoozed };
    expect(overdueRows(after)).toBe(0);
    expect(mayExhale(listIsCalm(queueOf(after)), calmVetoFor({ overdueCount: 0 }))).toBe(true);
  });
});

// ─── NO SURFACE CLAIMS QUIET OFF THE UNVETOED PREDICATE ──────────────────────
// Vetoing the calm POLE was not enough — the verdict line under it and the
// empty-queue fallback each read `listIsCalm` directly, so the same false
// sentence had three authors. This sweep is why the third one was found.
describe('the shell reads one predicate for the quiet claim', () => {
  const fs = require('fs');
  const path = require('path');
  const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');
  const src = () => fs.readFileSync(SHELL, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('the veto counts what the STEPS SHEET prints, row for row', () => {
    const s = src();
    expect(s).toMatch(/calmVetoFor\(/);
    expect(s).toMatch(/overdueCount:\s*overdueShown/);
    // taskWindowClosed — the DISPLAY fact the sheet's own label derives from —
    // with the sheet's resolved-step exemption. NOT taskIsOverdue (the blame
    // policy, which forgives a snooze) and NOT `upNext` (which filters past-due
    // rows out by construction). The first version of this veto used both and
    // was inert on the real screen; that is what these two lines pin.
    expect(s).toMatch(/taskWindowClosed\(t,\s*event\)\s*&&\s*!isTimelineStepResolved\(t\)/);
    expect(s).not.toMatch(/overdueShown[\s\S]{0,200}upNext/);
  });

  test('the calm pole and its empty-queue fallback share one gate', () => {
    // They did not, and while calm could not be vetoed that was survivable. The
    // moment it could, the mismatch would have rendered NEITHER — a blank hero.
    const s = src();
    expect(s).toMatch(/queue\.length === 0 && !\(elegantMode && mayBeCalm/);
    expect(s).not.toMatch(/queue\.length === 0 && !\(elegantMode && listIsCalm/);
  });

  test('the verdict line is veto-aware before it may say "All quiet"', () => {
    const s = src();
    const calmBranch = s.indexOf("All quiet — you’re genuinely set for now.");
    expect(calmBranch).toBeGreaterThan(-1);
    const guard = s.lastIndexOf("calmVeto.kind === 'overdue-steps'", calmBranch);
    expect(guard).toBeGreaterThan(-1);          // a veto branch precedes it
  });

  test('the fix did NOT take the other road — no snooze is written onto a task row', () => {
    // Silencing the rows would have made the contradiction disappear by making
    // the app stop calling real late work late. Pin that it was not done.
    const s = src();
    expect(s).not.toMatch(/snoozedUntil:\s*/);
  });
});
