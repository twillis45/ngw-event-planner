// ─── LIFECYCLE-VERDICT-1 — the "all clear" line and the verdict agree ─────────
//
// Audit ("vs The Market Leaders", Trust row, impact item 5): lifecycle "all
// clear" vs verdict "5 overdue" was the one contradiction of this shape still
// open. The two layers on the V2 plan hero:
//   • THE VERDICT reads playbookDecisionBoard().open → "N decisions are past
//     their easy window" (HostShellV2 renders it only pre-event, days > 0).
//   • The lifecycle line reads eventPlan().planningState.recommendationLifecycle
//     and prints "· all clear" whenever NOTHING is in state 'Blocked'.
// Before this fix the lifecycle projection never read the decision board, so an
// event with 5 overdue decisions and no blocked workstreams printed "all clear"
// two cards below a "5 past their easy window" verdict.
//
// THE INVARIANT (agreement by construction — both read the SAME board):
//   pre-event, an overdue board decision ⇒ a Blocked lifecycle item (board:<id>)
//   zero overdue board decisions        ⇒ zero board:* lifecycle items
//   day-of / past / no-date             ⇒ zero board:* items (the verdict is
//     gated to days > 0, so the lifecycle must not alarm where the verdict is
//     silent — and a wrapped event stays wrapped, per PAST-EVENT-1).
// Preserved behaviors these tests also touch: overdue-on-creation reachability
// (a brand-new tight-timeline event is calm on BOTH layers) and past-event
// suppression (nextActions empty, no stale blame).

import { eventPlan } from '../CommandCenter';
import { playbookDecisionBoard } from '../lib/playbooks';
import { deriveEventPhaseProgress } from '../lib/phaseProgress';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

// Exactly the two reads HostShellV2 performs (lines ~2440 and ~2632-2643).
const verdictOverdue = (ev) => (playbookDecisionBoard(ev).open || [])
  .filter((r) => r && r.status === 'overdue');
const lifecycleOf = (ev) => (eventPlan(ev).planningState.recommendationLifecycle) || [];
const blockedOf = (ev) => lifecycleOf(ev).filter((i) => i.state === 'Blocked');
const boardItemsOf = (ev) => lifecycleOf(ev).filter((i) => String(i.id).startsWith('board:'));

// The reproduction shape: every phase-progress essential handled ("Ready for
// event day") AND no blocked workstream — yet the seeded playbook decisions
// (T-14d windows, event 10 days out, legacy no-createdAt ⇒ reachable) are past
// their easy window. Lifecycle said "all clear"; the verdict said "N overdue".
const readyButOverdue = () => ({
  id: 'lva-1', name: 'Juneteenth Cookout', type: 'juneteenth cookout',
  date: iso(10), guestMode: 'count', guestCount: 30, dietaryNoted: true,
  venueKind: 'venue', venue: 'VFW Post 3150 — Alexandria, VA',
  rainPlan: 'Move under the carport',
  guests: [], vendors: [], timeline: [], budget: [],
});

describe('reproduction — lifecycle "all clear" above a "N overdue" verdict', () => {
  test('scenario integrity: the event really is calm everywhere EXCEPT the board', () => {
    const ev = readyButOverdue();
    // The essentials bar is fully green — nothing open on the readiness ledger.
    const pp = deriveEventPhaseProgress(ev);
    expect(pp.phase).toBe('pre_event');
    expect(pp.nextCue).toBeNull();
    expect(pp.completedCount).toBe(pp.totalCount);
    // The verdict has real overdue decisions to report (and renders: days > 0).
    expect(verdictOverdue(ev).length).toBeGreaterThan(0);
  });

  test('THE CONTRADICTION: overdue verdict ⇒ the lifecycle can NOT read "all clear"', () => {
    const ev = readyButOverdue();
    const overdue = verdictOverdue(ev);
    expect(overdue.length).toBeGreaterThan(0); // verdict: "N past their easy window"
    // HostShellV2 prints "· all clear" iff nothing is Blocked. With an overdue
    // verdict on the same screen, Blocked must be non-empty — by construction.
    expect(blockedOf(ev).length).toBeGreaterThan(0);
  });

  test('count agreement: every overdue board row is represented, one to one', () => {
    const ev = readyButOverdue();
    const overdue = verdictOverdue(ev);
    const board = boardItemsOf(ev);
    expect(board.length).toBe(overdue.length);
    overdue.forEach((r) => {
      const hit = board.find((i) => i.id === 'board:' + r.id);
      expect(hit).toBeTruthy();
      expect(hit.state).toBe('Blocked');
      expect(hit.category).toBe('decision');
    });
  });
});

describe('agreement invariant across representative states', () => {
  test('fresh tight-timeline event: calm on BOTH layers (overdue-on-creation reachability preserved)', () => {
    // Created today, event in 5 days — the T-14d windows were never reachable,
    // so the board stays calm ('ready', "A good place to start.") and the
    // lifecycle must not manufacture a Blocked item the verdict does not show.
    const ev = { ...readyButOverdue(), date: iso(5), createdAt: new Date().toISOString() };
    expect(verdictOverdue(ev).length).toBe(0);
    expect(boardItemsOf(ev).length).toBe(0);
    // Calm creation copy intact on the board rows themselves.
    const open = playbookDecisionBoard(ev).open.filter((r) => r.daysOut != null && r.daysOut < 0);
    open.forEach((r) => expect(r.status).toBe('ready'));
  });

  test('mid-planning with real overdue: both layers say so', () => {
    const ev = { ...readyButOverdue(), createdAt: iso(-60) + 'T12:00:00.000Z' };
    const overdue = verdictOverdue(ev);
    expect(overdue.length).toBeGreaterThan(0);
    expect(boardItemsOf(ev).length).toBe(overdue.length);
  });

  test('day-of: the verdict is gated (days > 0), so the lifecycle carries no board alarm', () => {
    const ev = { ...readyButOverdue(), date: iso(0) };
    // The board itself may mark rows overdue on the day, but the verdict never
    // renders them (HostShellV2 gate: days > 0) — the lifecycle matches the gate.
    expect(boardItemsOf(ev).length).toBe(0);
  });

  test('past event: wrapped stays wrapped — no board items, no next actions (PAST-EVENT-1)', () => {
    const ev = { ...readyButOverdue(), date: iso(-2200) };
    expect(boardItemsOf(ev).length).toBe(0);
    expect(eventPlan(ev).nextActions).toHaveLength(0);
  });

  test('no-date event: nothing can be past a window — no board items', () => {
    const ev = { ...readyButOverdue(), date: '' };
    expect(verdictOverdue(ev).length).toBe(0);
    expect(boardItemsOf(ev).length).toBe(0);
  });

  test('calm direction: zero overdue ⇒ zero board items (all clear is honest)', () => {
    // A dinner party 40 days out — decisions still inside their windows.
    const ev = {
      id: 'lva-2', name: 'Dinner', type: 'dinner party', date: iso(40),
      guestMode: 'count', guestCount: 8, venueKind: 'home',
      venueCity: 'Atlanta', venueState: 'GA', guests: [], vendors: [], timeline: [],
    };
    expect(verdictOverdue(ev).length).toBe(0);
    expect(boardItemsOf(ev).length).toBe(0);
  });
});
