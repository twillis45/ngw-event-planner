// WAVE-5 RANKING FIXES (2026-07-15) — snooze identity, demotion, one #1, calm fillers.
//
// The adversarial re-score confirmed four defects; these tests pin the repairs:
//
// 1. PER-ITEM TOP IDS. The reactive top action's snooze id was `top.category` — a
//    per-CATEGORY key. Snoozing "Confirm the DJ." wrote event.snoozed['vendor'];
//    once the DJ was confirmed, "Confirm the caterer." INHERITED the id and was
//    silently hidden, and the Set-aside row showed the new title on the old date.
//    Ids now derive from the underlying record (vendorId / decisionId / taskId /
//    title slug) — never the bare category — and are stable across recomputes.
//
// 2. THE DEMOTION + THE CAP. The only action carrying a finite leadDays was the
//    overdue-decision top, hardcoded 'critical' → canSnooze false → the lead cap
//    (lib/snooze.js:37-41) never executed where it mattered. Demoted to
//    'attention' (doctrine: 'critical' is for REACTIVE raises), it becomes
//    snoozeable in principle — and the cap immediately binds: the window is
//    closed, so proposedSnoozeUntil refuses (null) and the item cannot be hidden.
//
// 3. ONE #1. selectEventNextAction returned the raw ladder result while
//    eventPlan's nextActions[0] was the band-sorted head — the heroes could name
//    a different #1 than the ranked list. Both now read one path.
//
// 4. CALM FILLERS CARRY NO ID. The lone "Event on track." line offered "not now"
//    — snoozing a state is meaningless. Calm categories get no id, and
//    canSnooze() refuses id-less actions by contract.

import { eventPlan, selectEventNextAction, _topActionId } from '../../CommandCenter';
import { canSnooze, isSnoozed, applySnooze, proposedSnoozeUntil, proposedSnoozeDays } from '../snooze';
import { playbookFoodPlan, playbookRisks } from '../playbooks';

// LOCAL date, not UTC — same helper discipline as severityBand.test.js.
const iso = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(() => { try { localStorage.clear(); } catch {} });

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Foundations set; two named-but-unconfirmed vendors → the ladder's "Confirm X."
// tier is the top action, first for the DJ, then (once confirmed) the caterer.
const twoVendors = (over = {}) => ({
  id: 'si-1', type: 'Crab Feast', name: 'Feast', date: iso(40),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], timeline: [],
  vendors: [
    { id: 'v-dj', name: 'Sable & Sound', category: 'DJ', status: 'Considering' },
    { id: 'v-cat', name: 'Fork & Flower', category: 'Catering', status: 'Considering' },
  ],
  ...over,
});

// The overdue-decision shape (severityBand's evOverdueDecisions): 'bad' (-60) wins.
const overdueDecisions = () => ({
  id: 'si-2', type: 'Crab Feast', name: 'Feast', date: iso(2),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1200,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  vendors: [], guests: [],
  timeline: [
    { id: 'mild', task: 'Buy the Old Bay', leadDays: -3, done: false },
    { id: 'bad', task: 'Pre-order the crabs', leadDays: -60, done: false },
  ],
});

// Every essential handled; must-have moment captured but unscheduled — the ladder
// demonstrably falls to the 'heart' calm filler. With `settled: false` the risk
// surface still raises real items (the divergence fixture for one-#1); with
// `settled: true` nothing real remains and the single calm line survives.
// (Same construction as severityBand.test.js's quietRetirement.)
const quietRetirement = ({ settled = false } = {}) => {
  const base = {
    id: 'si-3', recordKind: 'host_event', type: 'Retirement Party', name: 'Ret',
    date: iso(40), startTime: '14:00',
    venueKind: 'venue', venue: 'The Ironwood Room', venueCity: 'Annapolis', venueState: 'MD',
    rainPlan: 'Indoors — the Ironwood Room is covered.',
    guestMode: 'count', guestCount: 40, totalBudget: 8000, dietaryNoted: true,
    must_have_moment: 'The toast from her old unit.',
    budget: [{ id: 'b1', category: 'Venue', budgeted: 3000, actual: 3000 }],
    timeline: [], guests: [],
    vendors: [{
      id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Confirmed',
      contractSigned: true, contractFileName: 'contract.pdf',
    }],
  };
  const fp = playbookFoodPlan(base);
  const foodChoices = {};
  (fp && fp.choices ? fp.choices : []).forEach((c) => { foodChoices[c.id] = c.chosen != null ? c.chosen : (c.options && c.options[0]); });
  const riskStatus = {};
  if (settled) {
    (((playbookRisks(base) || {}).items) || []).forEach((r) => { riskStatus[r.id] = 'dismissed'; });
  }
  return { ...base, foodChoices, riskStatus };
};

// A registry CRITICAL on a pre-event day: the DJ's arrival is before venue access
// (vendor-conflicts surface, severity 'critical') while the ladder's own top is the
// non-critical "Confirm Sable & Sound." — the exact head-vs-ladder divergence.
const conflictCritical = () => twoVendors({
  id: 'si-4', date: iso(10),
  vendors: [
    { id: 'v-ven', name: 'The Ironwood Room', category: 'Venue', status: 'Confirmed', contractSigned: true, arrivalTime: '10:00' },
    { id: 'v-dj', name: 'Sable & Sound', category: 'DJ', status: 'Considering', arrivalTime: '08:00' },
  ],
});

// ── 1. Per-item top-action snooze ids ─────────────────────────────────────────

describe('the top action snooze id is per ITEM, never per category', () => {
  test('two different vendors produce two different snooze ids (the DJ→caterer inheritance bug)', () => {
    const ev1 = twoVendors();
    const top1 = eventPlan(ev1).nextActions[0];
    expect(String(top1.title)).toMatch(/Sable & Sound/);

    // Confirm the DJ — the caterer becomes the top action, with its OWN id.
    const ev2 = twoVendors({
      vendors: [
        { id: 'v-dj', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true },
        { id: 'v-cat', name: 'Fork & Flower', category: 'Catering', status: 'Considering' },
      ],
    });
    const top2 = eventPlan(ev2).nextActions[0];
    expect(String(top2.title)).toMatch(/Fork & Flower/);

    expect(top1.id).toBeTruthy();
    expect(top2.id).toBeTruthy();
    expect(top1.id).not.toBe(top2.id);          // the inheritance bug, dead
    expect(top1.id).not.toBe('vendor');         // never the bare category
    expect(top2.id).not.toBe('vendor');
    // Stable across recomputes — snooze written today still matches tomorrow's list.
    expect(eventPlan(ev1).nextActions[0].id).toBe(top1.id);
  });

  test("a snooze written against the DJ's ask does NOT hide the caterer's", () => {
    const ev1 = twoVendors();
    const djId = eventPlan(ev1).nextActions[0].id;
    const ev2 = twoVendors({
      vendors: [
        { id: 'v-dj', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true },
        { id: 'v-cat', name: 'Fork & Flower', category: 'Catering', status: 'Considering' },
      ],
      snoozed: { [djId]: iso(10) },   // the host set the DJ ask down last week
    });
    const top2 = eventPlan(ev2).nextActions[0];
    expect(String(top2.title)).toMatch(/Fork & Flower/);
    expect(isSnoozed(ev2, top2.id)).toBe(false);           // not inherited
    expect(applySnooze([top2], ev2)).toHaveLength(1);      // still in the list
  });

  test('the id derives from the underlying record — the vendor row it routes to', () => {
    const top = eventPlan(twoVendors()).nextActions[0];
    expect(String(top.id)).toContain('v-dj');
    // And the helper itself refuses the bare-category form.
    expect(_topActionId({ category: 'vendor', title: 'Confirm X.', primaryRoute: { tab: 'Vendors', vendorId: 'v9' } }))
      .toBe('top:vendor:v9');
  });
});

// ── 2. The demotion + the lead cap ────────────────────────────────────────────

describe("the overdue-decision top: 'attention', snoozeable in principle, capped in fact", () => {
  test("demoted to 'attention' — a late chore, not an emergency (doctrine)", () => {
    const top = eventPlan(overdueDecisions()).nextActions[0];
    expect(String(top.title)).toMatch(/crabs/i);
    expect(top.level).toBe('attention');
    expect(canSnooze(top)).toBe(true);           // was hard-blocked at 'critical'
  });

  test('…and the cap finally binds: the window is closed, so NO snooze is proposed', () => {
    const ev = overdueDecisions();
    const top = eventPlan(ev).nextActions[0];
    expect(top.leadDays).toBe(-60);              // the authored lead reaches the action
    // The refuse-when-window-closed branch (snooze.js:40): a task already past its
    // window must never be hidden — the shell renders no "not now" without a date.
    expect(proposedSnoozeUntil(ev, { leadDays: top.leadDays })).toBeNull();
  });

  test('the cap CAPS (not just refuses) when the window is still open', () => {
    // 21 days of runway, a T-14d lead: half-runway would be 10, the window closes
    // in 7 — the proposal is capped to 6 (a day to spare). This is the arithmetic
    // the threaded leadDays feeds; before wave-5 no rendered action ever carried it.
    expect(proposedSnoozeDays({ id: 'x', date: iso(21) }, { leadDays: -14 })).toBe(6);
    expect(proposedSnoozeDays({ id: 'x', date: iso(21) })).toBe(10); // uncapped without a lead
  });
});

// ── 3. One #1 — selectEventNextAction === eventPlan().nextActions[0] ──────────

describe('one #1 — the hero and the ranked list can never name different leaders', () => {
  test('registry CRITICAL vs ladder non-critical: both name the conflict (previously diverged)', () => {
    const ev = conflictCritical();
    const plan = eventPlan(ev);
    const head = plan.nextActions[0];
    // Scenario integrity: the registry critical really is the band-sorted head,
    // and the ladder's own top really is something else (the unconfirmed DJ).
    expect(head.level).toBe('critical');
    expect(head.source).toBe('surfaceRegistry');

    const na = selectEventNextAction(ev);
    expect(na.title).toBe(head.title);
    expect(na.level).toBe('critical');
    expect(na.primaryRoute).toEqual(head.route);   // the shape consumers read
    expect(na.primaryCta).toBeTruthy();
  });

  test('ladder fell to a calm filler while the registry raised: both say the raise', () => {
    const ev = quietRetirement();                  // heart filler vs live risk raises
    const plan = eventPlan(ev);
    const head = plan.nextActions[0];
    expect(head.source).toBe('surfaceRegistry');   // the filler left the list
    const na = selectEventNextAction(ev);
    expect(na.title).toBe(head.title);
    expect(na.category).toBe(head.category);
  });

  test('when the ladder top IS the head, the rich ladder render is preserved (title parity)', () => {
    const ev = twoVendors();
    const na = selectEventNextAction(ev);
    const head = eventPlan(ev).nextActions[0];
    expect(na.title).toBe(head.title);
    expect(na.primaryRoute).toBeTruthy();
  });
});

// ── 4. The lone calm filler is not snoozeable ─────────────────────────────────

describe('calm fillers carry no id — "not now" can never render on "Event on track."', () => {
  test('the single surviving calm action has no id and canSnooze refuses it', () => {
    const actions = eventPlan(quietRetirement({ settled: true })).nextActions;
    expect(actions).toHaveLength(1);
    expect(['neutral', 'calendar', 'heart']).toContain(actions[0].category);
    expect(actions[0].id).toBeFalsy();
    expect(canSnooze(actions[0])).toBe(false);
  });

  test('the id helper is the mechanism: calm categories yield null, work yields an id', () => {
    expect(_topActionId({ category: 'neutral', title: 'Event on track. Nothing urgent right now.' })).toBeNull();
    expect(_topActionId({ category: 'heart', title: 'Protect the heart: "x".' })).toBeNull();
    expect(_topActionId({ category: 'calendar', title: 'Prep for "y".' })).toBeNull();
    expect(_topActionId({ category: 'timeline', title: 'Catch up on overdue planning tasks.' })).toBeTruthy();
  });
});

// ── 5. Registry actions carry PLAIN domains for the shell's lens ──────────────

describe("registry actions carry the surface's plain domain, not 'surface:*'", () => {
  test("a vendor raise files under 'vendors'; no registry action wears a 'surface:' domain", () => {
    const actions = eventPlan(conflictCritical()).nextActions.filter(a => a.source === 'surfaceRegistry');
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) {
      expect(String(a.domain)).not.toMatch(/^surface:/);
      expect(['vendors', 'risks', 'day']).toContain(a.domain);
    }
    const conflict = actions.find(a => a.level === 'critical');
    expect(conflict.domain).toBe('vendors');
    // The snooze/dedup key is SEPARATE and unchanged — still the per-item surface key.
    expect(String(conflict.id)).toMatch(/^surface:/);
  });

  test("risk raises file under 'risks'", () => {
    const actions = eventPlan(quietRetirement()).nextActions.filter(a => a.source === 'surfaceRegistry');
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every(a => a.domain === 'risks' || a.domain === 'vendors' || a.domain === 'day')).toBe(true);
  });
});
