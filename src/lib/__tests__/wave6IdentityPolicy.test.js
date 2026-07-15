// WAVE-6 IDENTITY / POLICY FIXES (2026-07-15) — engine side.
//
// The wave-6 probes proved four defects; these tests pin the repairs:
//
// 1. RECORD-KEYED IDENTITY. Registry item keys fell back to count-bearing titles
//    ('surface:seating:2 confirmed guests still need seats') — the count moves, the
//    id changes, the snooze detaches. Keys now come from the RECORD the raise is
//    about (guestId, decisionId, vendorId, itemType:itemId); aggregates with no
//    record (lodging, ground) use the surface id ALONE. And a decision debt keys
//    ONE canonical form across producers — 'decision:<recordId>' — whether the
//    ladder's tier 2/6.4/7.8 or the registry surfaces it.
//
// 2. RECORD-LEVEL DEDUP. The phase food summary ("Decide what you're serving ·
//    N open") counted choice records the decisions surface ALSO raises
//    individually. The per-item raises win (they carry row-level routes and fold
//    into the surface bundle); the summary drops its claim to exactly those
//    records — recounted when partially covered, gone when fully covered.
//
// 3. THE REGISTRY SNOOZE CAP BINDS. Decision raises now carry the board's own
//    clock (dueInDays = daysOut, leadDays = daysOut − dte) — so a past-window
//    decision is REFUSED a snooze (wave-6 proof: 4 past-window decisions were
//    offered "back Jul 20" because no lead reached the cap on the registry path).
//
// 4. ONE POST-SNOOZE TRUTH + BUNDLES. eventPlan applies snooze itself:
//    nextActions is post-snooze, setAside carries the set-down items with their
//    comeback dates, and ≥3 raises from one surface collapse into ONE bundle
//    action ({ id:'bundle:<surface>', kind:'bundle', items:[…] }).

import { eventPlan, selectEventNextAction, _topActionId } from '../../CommandCenter';
import { proposedSnoozeUntil, clampSnoozeUntil } from '../snooze';
import { raiseAll } from '../surfaceRegistry';
import { playbookFoodPlan } from '../playbooks';

// LOCAL date, not UTC — same helper discipline as severityBand.test.js.
const iso = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(() => { try { localStorage.clear(); } catch {} });

const CALM = new Set(['neutral', 'calendar', 'heart']);

const feast = (over = {}) => ({
  id: 'w6', type: 'Crab Feast', name: 'Feast', date: iso(20),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});

// The wave-6 proof fixture: 5 days out, one menu pick made (so the food FOUNDATION
// is done and the phase ledger's "Decide what you're serving" summary is live) and
// the rest of the board's decision windows genuinely past (no createdAt ⇒ legacy
// reachable). The decisions surface raises ≥3 overdue records — the bundle path.
const lateFeast = (over = {}) => feast({
  id: 'w6-late', date: iso(5),
  foodChoices: { sides: 'Corn + shrimp + slaw + potato salad' },
  ...over,
});

// ── 1. Record-keyed identity ──────────────────────────────────────────────────

describe('record-keyed ids — the count moves, the id stays', () => {
  const seatEv = (g2Table) => feast({
    id: 'w6-seat',
    foodChoices: (() => {
      const fp = playbookFoodPlan(feast());
      const picks = {};
      (fp && fp.choices ? fp.choices : []).forEach((c) => { picks[c.id] = c.chosen != null ? c.chosen : (c.options && c.options[0]); });
      return picks;
    })(),
    guests: [
      { id: 'g1', name: 'Ava Bell', rsvp: 'Yes' },
      { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', ...(g2Table ? { table: 1 } : {}) },
      { id: 'g3', name: 'Cy Dean', rsvp: 'Yes', table: 2 },
    ],
  });

  test('seating: 2 need seats → 1 needs a seat — title changes, snooze id does not', () => {
    const a1 = eventPlan(seatEv(false)).nextActions.find((a) => /still need/.test(String(a.title || '')));
    const a2 = eventPlan(seatEv(true)).nextActions.find((a) => /still need/.test(String(a.title || '')));
    expect(a1).toBeTruthy();
    expect(a2).toBeTruthy();
    expect(a1.title).not.toBe(a2.title);          // the count really moved
    expect(a1.id).toBe(a2.id);                    // the identity did not
    expect(a1.id).toBe('surface:seating:g1');     // the record, never the prose
  });

  test('…so a snooze written before the count moved still holds after it', () => {
    const a1 = eventPlan(seatEv(false)).nextActions.find((a) => /still need/.test(String(a.title || '')));
    const ev = { ...seatEv(true), snoozed: { [a1.id]: iso(10) } };
    const plan = eventPlan(ev);
    expect(plan.nextActions.find((x) => x.id === a1.id)).toBeUndefined();
    const aside = plan.setAside.find((x) => x.id === a1.id);
    expect(aside).toBeTruthy();
    expect(aside.snoozedUntil).toBe(iso(10));
  });

  test('aggregate raises (lodging) use the surface id alone — stable at any count', () => {
    const dest = (extraTraveler) => feast({
      id: 'w6-lodge', isDestination: true,
      lodging: { hotelName: 'Bay Inn', deadline: iso(10) },
      guests: [
        { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { lodging: { status: 'booked' } } },
        { id: 'g2', name: 'Ben Cole', rsvp: 'Pending' },
        ...(extraTraveler ? [{ id: 'g3', name: 'Cy Dean', rsvp: 'Pending' }] : []),
      ],
    });
    const find = (ev) => eventPlan(ev).nextActions.find((a) => /booked a room/.test(String(a.title || '')));
    const a1 = find(dest(false));
    const a2 = find(dest(true));
    expect(a1).toBeTruthy();
    expect(a2).toBeTruthy();
    expect(a1.id).toBe('surface:lodging');
    expect(a2.id).toBe('surface:lodging');        // 1-of-2 or 2-of-3 — same debt, same id
    expect(a1.dueInDays).toBe(10);                // the deadline's own clock rides along
  });

  test('one canonical id per decision debt, whoever produces it', () => {
    // Tier 7.8 shape (routes to the settle board, carries decisionId):
    expect(_topActionId({
      category: 'decision', title: 'Resolve "Where to buy".',
      decisionId: 'where_buy', primaryRoute: { tab: 'Planning', focusField: 'host-decisions' },
    })).toBe('decision:where_buy');
    // Tier 2 shape (routes to the decision row):
    expect(_topActionId({
      category: 'decision', title: 'Resolve "Pre-order the crabs".',
      primaryRoute: { tab: 'Decisions', decisionId: 't-9' },
    })).toBe('decision:t-9');
    // Tier 6.4 shape (the blocker's own decision key):
    expect(_topActionId({
      category: 'decision', title: 'Collect dietary restrictions & allergies',
      decision: 'dietary', primaryRoute: { tab: 'Planning', focusField: 'food-plan' },
    })).toBe('decision:dietary');
    // Non-decision categories keep the wave-5 form.
    expect(_topActionId({ category: 'vendor', title: 'Confirm X.', primaryRoute: { tab: 'Vendors', vendorId: 'v9' } }))
      .toBe('top:vendor:v9');
  });

  // WAVE-7 SEAM FIX (2026-07-15): tier 6.4's re-wrap in _selectEventNextActionInner
  // DROPPED topPlaybookDecision's `decision` field, so the live ladder card slugged
  // ('top:decision:collect-dietary-…') while the registry child keyed
  // 'decision:dietary' — the SAME record billed twice (ladder card + child of
  // bundle:decisions) and a snooze written on either id detached from the other.
  // The re-wrap now carries the record through; this pins it END-TO-END on the
  // live lateFeast fixture (tier 6.4 dietary blocker + decisions-surface raise).
  test('tier 6.4 carries its record: ONE card per decision debt, live, and snooze follows it', () => {
    const ev = lateFeast();
    const plan = eventPlan(ev);
    const allIds = plan.nextActions
      .flatMap((a) => [a.id, ...((a.items || []).map((i) => i.id))])
      .filter(Boolean);
    // Exactly one appearance of the record — the ladder card won; the registry
    // child collapsed out of bundle:decisions instead of double-billing.
    expect(allIds.filter((id) => id === 'decision:dietary')).toHaveLength(1);
    const card = plan.nextActions.find((a) => a.id === 'decision:dietary');
    expect(card).toBeTruthy();
    expect(card.source).toBe('ladder');                     // tier 6.4's rich copy
    expect(String(card.title)).toMatch(/dietary/i);
    const bundle = plan.nextActions.find((a) => a.id === 'bundle:decisions');
    expect(bundle && bundle.items.some((i) => i.id === 'decision:dietary')).toBe(false);

    // A snooze on the canonical id follows the debt across producers: gone from
    // the ranked list (card AND any bundle child), set aside exactly once.
    const ev2 = { ...ev, snoozed: { 'decision:dietary': iso(2) } };
    const plan2 = eventPlan(ev2);
    const ids2 = plan2.nextActions
      .flatMap((a) => [a.id, ...((a.items || []).map((i) => i.id))])
      .filter(Boolean);
    expect(ids2).not.toContain('decision:dietary');
    const aside = plan2.setAside.filter((a) => a.id === 'decision:dietary');
    expect(aside).toHaveLength(1);
    expect(aside[0].snoozedUntil).toBe(iso(2));
  });
});

// ── 2. Record-level dedup — summary + individual raises never bill one record twice ──

describe('the food summary drops its claim to individually-raised records', () => {
  test('partial coverage → the summary recounts to only the un-raised remainder', () => {
    const ev = lateFeast();
    const raisedKeys = new Set(raiseAll(ev).filter((r) => r.surface === 'decisions').map((r) => r.key));
    expect(raisedKeys.size).toBeGreaterThanOrEqual(3);   // fixture integrity: the bundle path is exercised

    const fp = playbookFoodPlan(ev);
    const openIds = (fp.choices || []).filter((c) => ev.foodChoices[c.id] == null).map((c) => c.id);
    const remainder = openIds.filter((id) => !raisedKeys.has(String(id)));
    expect(remainder.length).toBeGreaterThan(0);         // fixture integrity: partial, not full, coverage

    const summary = eventPlan(ev).nextActions.find((a) => /Decide what you're serving/.test(String(a.title || '')));
    expect(summary).toBeTruthy();
    expect(summary.title).toContain(`· ${remainder.length} open`);   // not the raw openIds.length
    expect(summary.title).not.toContain(`· ${openIds.length} open`);
  });

  test('full coverage → the summary disappears entirely (the rows speak for every record)', () => {
    // A day closer, the last windows (T-5d sides/drinks) go past too — every open
    // choice is individually raised, so the summary has no un-raised remainder.
    const ev = lateFeast({ id: 'w6-later', date: iso(4) });
    const raisedKeys = new Set(raiseAll(ev).filter((r) => r.surface === 'decisions').map((r) => r.key));
    const fp = playbookFoodPlan(ev);
    const openIds = (fp.choices || []).filter((c) => ev.foodChoices[c.id] == null).map((c) => c.id);
    expect(openIds.every((id) => raisedKeys.has(String(id)))).toBe(true);  // fixture integrity
    const summary = eventPlan(ev).nextActions.find((a) => /Decide what you're serving/.test(String(a.title || '')));
    expect(summary).toBeUndefined();
  });
});

// ── 3 + 4. Bundle shape, ordering, cap refusal, post-snooze truth ─────────────

describe('bundling — one surface, ≥3 raises, ONE action in the shell contract shape', () => {
  test('the decisions bundle carries the contract shape and the surface vocabulary', () => {
    const plan = eventPlan(lateFeast());
    const bundle = plan.nextActions.find((a) => a.id === 'bundle:decisions');
    expect(bundle).toBeTruthy();
    expect(bundle.kind).toBe('bundle');
    expect(bundle.category).toBe('surface');
    expect(bundle.level).toBe('attention');
    expect(bundle.domain).toBe('plan');
    expect(bundle.route).toEqual({ tab: 'Decisions' });          // the surface's own route
    expect(bundle.count).toBeGreaterThanOrEqual(3);
    expect(bundle.items).toHaveLength(bundle.count);
    expect(bundle.title).toBe(`Resolve ${bundle.count} decisions — they're past their easy window`);
    for (const child of bundle.items) {
      expect(String(child.id)).toMatch(/^decision:/);            // canonical, record-keyed
      expect(child.route.decisionId).toBeTruthy();               // row-level routing preserved
    }
    // dueInDays = min child (the most urgent), the ordering key.
    expect(bundle.dueInDays).toBe(Math.min(...bundle.items.map((i) => i.dueInDays)));
    // No duplicate ids anywhere — a bundled record never also appears solo.
    const ids = plan.nextActions.flatMap((a) => [a.id, ...((a.items || []).map((i) => i.id))]).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('band-1 ordering: finite dueInDays ascend, nulls last (stable)', () => {
    const plan = eventPlan(lateFeast());
    const band1 = plan.nextActions.filter((a) => a.level !== 'critical' && !CALM.has(a.category));
    expect(band1.length).toBeGreaterThan(1);
    const dues = band1.map((a) => (Number.isFinite(a.dueInDays) ? a.dueInDays : Infinity));
    expect([...dues].sort((x, y) => x - y)).toEqual(dues);
  });

  test('the registry snooze cap binds: every past-window child is REFUSED a snooze', () => {
    const ev = lateFeast();
    const bundle = eventPlan(ev).nextActions.find((a) => a.id === 'bundle:decisions');
    for (const child of bundle.items) {
      expect(Number.isFinite(child.leadDays)).toBe(true);        // the lead reaches the cap now
      // The wave-6 proof: these were offered "back Jul 20". With the real lead the
      // window-closed branch refuses — no proposal, the item cannot be hidden.
      expect(proposedSnoozeUntil(ev, { leadDays: child.leadDays })).toBeNull();
    }
    // The bundle inherits the tightest child window — refused too.
    expect(proposedSnoozeUntil(ev, { leadDays: bundle.leadDays })).toBeNull();
  });
});

describe('one post-snooze truth — nextActions is post-snooze, setAside carries the rest', () => {
  test('snoozing the head: it moves to setAside with its date, and EVERY reader agrees on the new head', () => {
    const ev = lateFeast();
    const head = eventPlan(ev).nextActions[0];
    expect(head.id).toBeTruthy();
    expect(head.level).not.toBe('critical');

    const ev2 = { ...ev, snoozed: { [head.id]: iso(3) } };
    const plan2 = eventPlan(ev2);
    // Gone from the ranked list…
    expect(plan2.nextActions.find((a) => a.id === head.id)).toBeUndefined();
    // …present in the set-aside pile, with its comeback date.
    const aside = plan2.setAside.find((a) => a.id === head.id);
    expect(aside).toBeTruthy();
    expect(aside.snoozedUntil).toBe(iso(3));
    // The hero/spine and the ranked list read the SAME post-snooze head.
    const head2 = plan2.nextActions[0];
    expect(head2).toBeTruthy();
    expect(head2.id).not.toBe(head.id);
    const na2 = selectEventNextAction(ev2);
    // When the new head is the LADDER's own top, the hero renders the rich ladder
    // copy (persona voice may prefix, e.g. "One call to make: …") — it must still
    // NAME the same action, and must never name the set-aside one.
    expect(na2.title).toContain(head2.title.replace(/[.\s]+$/, ''));
    expect(na2.title).not.toContain(head.title.replace(/[.\s]+$/, ''));
    expect(plan2.planningState.currentPriority).toBe(head2.title);
    expect(plan2.planningState.reasoning).toBe(head2.consequence || null);
  });

  test('a critical ignores a stale snooze — it can never be set aside', () => {
    const ev = feast({
      id: 'w6-crit', date: iso(6),
      vendors: [{ id: 'v-pay', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true, cost: 500, payDueDate: iso(-3), balancePaid: false }],
    });
    const head = eventPlan(ev).nextActions[0];
    expect(head.level).toBe('critical');
    const plan2 = eventPlan({ ...ev, snoozed: { [head.id]: iso(4) } });
    expect(plan2.nextActions[0].title).toBe(head.title);           // still leads
    expect(plan2.setAside.find((a) => a.id === head.id)).toBeUndefined();
  });

  test('a past event carries neither actions nor a set-aside pile', () => {
    const ev = lateFeast({ id: 'w6-past', date: iso(-10), snoozed: { 'bundle:decisions': iso(5) } });
    const plan = eventPlan(ev);
    expect(plan.nextActions).toEqual([]);
    expect(plan.setAside).toEqual([]);
  });
});

// ── clampSnoozeUntil — custom-date support, lib only ──────────────────────────

describe('clampSnoozeUntil — the host picks the day, the clock owns the bounds', () => {
  const ev20 = { id: 'c', date: iso(20) };

  test('a date inside the window passes through untouched', () => {
    expect(clampSnoozeUntil(ev20, iso(10), { leadDays: -5 })).toBe(iso(10));
  });

  test('past the window close → clamped to window close − 1 day', () => {
    // window closes at 20 + (−5) = day 15 → last valid day is 14.
    expect(clampSnoozeUntil(ev20, iso(16), { leadDays: -5 })).toBe(iso(14));
  });

  test('no lead → clamped to the day before the event', () => {
    expect(clampSnoozeUntil(ev20, iso(30))).toBe(iso(19));
  });

  test('today or the past → clamped up to tomorrow (snoozing to today is not snoozing)', () => {
    expect(clampSnoozeUntil(ev20, iso(0))).toBe(iso(1));
    expect(clampSnoozeUntil(ev20, iso(-3))).toBe(iso(1));
  });

  test('no valid day exists → null, never a dishonest date', () => {
    // Event tomorrow: event − 1d is today, below the tomorrow floor.
    expect(clampSnoozeUntil({ id: 'c', date: iso(1) }, iso(1))).toBeNull();
    // Window already closed (3 days out, T-5d lead) — the cap refuses outright.
    expect(clampSnoozeUntil({ id: 'c', date: iso(3) }, iso(2), { leadDays: -5 })).toBeNull();
  });

  test('no event date → only the tomorrow floor applies', () => {
    expect(clampSnoozeUntil({ id: 'c' }, iso(40))).toBe(iso(40));
    expect(clampSnoozeUntil({ id: 'c' }, iso(-2))).toBe(iso(1));
  });

  test('garbage in → null out', () => {
    expect(clampSnoozeUntil(ev20, null)).toBeNull();
    expect(clampSnoozeUntil(ev20, 'not-a-date')).toBeNull();
  });
});

// ── Contract sanity — the fields the shell relies on exist where promised ─────

describe('shell contract — dueInDays/leadDays threading', () => {
  test('reconfirm raises carry the window clock (days-to-event, lead 0)', () => {
    const ev = feast({
      id: 'w6-rc', date: iso(2),
      vendors: [
        { id: 'v1', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true },
        { id: 'v2', name: 'Fork & Flower', category: 'Catering', status: 'Confirmed', contractSigned: true },
      ],
    });
    const rc = raiseAll(ev).filter((r) => r.surface === 'vendor-reconfirm');
    expect(rc.length).toBe(2);
    for (const r of rc) {
      expect(r.dueInDays).toBe(2);
      expect(r.leadDays).toBe(0);
      expect(r.key).toBeTruthy();
    }
  });

  test('every ranked action exposes dueInDays as number|null — never undefined-only chaos', () => {
    for (const ev of [lateFeast(), feast({ guests: [{ rsvp: 'Yes' }] })]) {
      for (const a of eventPlan(ev).nextActions) {
        expect(a.dueInDays === null || Number.isFinite(a.dueInDays)).toBe(true);
      }
    }
  });
});
