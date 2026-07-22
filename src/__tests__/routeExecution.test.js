// ─── ROUTE EXECUTION — the executable route-binding gate ─────────────────────
//
// ENFORCEMENT-GAP-1 (2026-07-15). The surface registry killed hand-wired
// attention with a raise() contract. Wave-7 then found the ENFORCEMENT of that
// contract was itself a convention one layer up: routeSheet (HostShellV2.jsx)
// mapped a raise's `route` to a sheet, and ctaSourceOfTruth.test.js validated
// routes against a HAND-SYNCED HOST_TABS/STATIC_ANCHORS set — NOT by executing
// routeSheet. A registry route with a valid tab but a focusField routeSheet
// didn't branch on (the wave-6 helpers 'space' bug) passed every test yet
// mis-landed live on a catch-all sheet. The mirror could drift from the code it
// mirrors — the exact bug-factory pattern the registry was built to kill.
//
// This suite closes the class. routeSheet's decision logic now lives in the pure
// resolveRoute() (lib/routeResolver.js) — the SINGLE authority the shell's
// executor AND this test both run. Here we DRIVE raiseAll() over a fixture
// battery and EXECUTE the real resolveRoute against every route it emits. A raise
// that resolves to null (dead CTA) or lands on a tab-top while carrying a row
// identifier FAILS. Because we sweep whatever raiseAll produces, a NEW surface's
// route is covered automatically — no list to keep in sync.

import { raiseAll, SURFACES } from '../lib/surfaceRegistry';
import { resolveRoute, ROUTESHEET_TABS } from '../lib/routeResolver';

// NOW tracks the REAL clock on purpose — do not freeze it again.
// raiseAll(event) takes no asOf: every surface reads today itself, deep in the
// engine. So a frozen NOW here doesn't freeze the engine — it only decouples the
// fixtures from it, and the offsets rot as the wall clock walks away from the
// frozen date. This was pinned to 2026-07-15 and passed until 2026-07-17, when
// fixtures built as "1 day out" had quietly become 2 days PAST and their surfaces
// (day-of, vendor-reconfirm) stopped raising — a green suite turning red overnight
// with zero code change. Anchored to real today, `iso(+1)` is always really
// tomorrow, so the battery stays honest on any date. If raiseAll ever accepts an
// asOf, inject it and freeze BOTH together — never one without the other.
const NOW = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })();
const iso = (d) => { const x = new Date(NOW); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

// ── The fixture battery: one event per shape the brief named, tuned so its
//    target surfaces actually RAISE (an empty state proves nothing). ──────────
const FIXTURES = [
  // my-crab-feast — outdoor, no rain plan, an overdue seafood-market payment, a
  // crab plan. Fires risks + vendor-payments.
  { key: 'my-crab-feast', ev: {
    id: 'cf1', type: 'crab feast', name: 'Crab', date: iso(20), guestMode: 'count', guestCount: 30,
    venueKind: 'outdoor', indoorOutdoor: 'outdoor', rainPlan: '', venueCity: 'Baltimore', venueState: 'MD',
    vendors: [{ id: 'v1', name: 'Seafood Market', category: 'Seafood market', status: 'Quoted', cost: 500, payDueDate: iso(-3), balancePaid: false }],
    crabPlan: { crabEatingHeadcount: 25, lines: [{ id: 'cl1', size: 'large', unit: 'bushel', quantity: 2, bought: false }] },
    timeline: [] } },
  // test-day-before-vendors — inside the day-before window with a helper on each
  // class: a food dish (foodrow-), a task (taskId), a setup cue (ros-now), a
  // capacity supply ('space' — the wave-6 bug's exact route), an informal vendor.
  { key: 'test-day-before-vendors', ev: {
    id: 'db1', type: 'bbq', name: 'DB', date: iso(1), guestMode: 'count', guestCount: 18, venue: 'Bowie, MD',
    foodAdd: [{ id: 'fa-db', name: 'Fruit platter', owner: 'Denise', added: true, cost: 0 }],
    capacityHelpers: { 'folding tables': 'Marcus' },
    vendors: [
      { id: 'v1', name: 'DJ Smooth', category: 'DJ', status: 'Quoted', cost: 200 },
      { id: 'v2', name: 'Cousin Ray', category: 'Grill help', isInformal: true },
    ],
    ros: [{ id: 'r1', time: '11:00', segment: 'Setup', type: 'setup', owner: 'Marcus', confirmed: false }],
    timeline: [{ id: 't1', task: 'Confirm the food order', owner: 'Aunt Lisa', done: false, week: 'Week Of' }] } },
  // destination — isDestination roster event: unbooked lodging with a deadline
  // (lodging-deadline), a late arrival (air-board + guestId), riders with no
  // ride (ground-riders). Fires lodging + travel-air + travel-ground.
  { key: 'destination', ev: {
    id: 'dst1', type: 'family reunion', name: 'Reunion', date: iso(30), guestMode: 'list', isDestination: true,
    venueCity: 'Orlando', venueState: 'FL', lodging: { deadline: iso(10) },
    guests: [
      { id: 'g1', name: 'Ava', rsvp: 'Yes', travel: { lodging: { status: 'not_booked' }, air: { arriveDate: iso(31), arriveTime: '10:00' }, ground: { needsRide: true } } },
      { id: 'g2', name: 'Ben', rsvp: 'Yes', travel: { lodging: { status: 'not_booked' }, ground: { needsRide: true } } },
    ],
    vendors: [], timeline: [] } },
  // roster/RSVP — a list-mode event with confirmed guests to seat, a conflicting
  // pair of vendors, an overdue caterer payment. Fires seating + vendor-* .
  { key: 'roster-rsvp', ev: {
    id: 'rr1', type: 'graduation', name: 'Grad', date: iso(12), guestMode: 'list', venue: 'VFW Post 3150',
    guests: [
      { id: 'g1', name: 'Ava', rsvp: 'Yes' }, { id: 'g2', name: 'Ben', rsvp: 'Yes' },
      { id: 'g3', name: 'Cam', rsvp: 'Yes' }, { id: 'g4', name: 'Dee', rsvp: '' },
    ],
    vendors: [
      { id: 'v1', name: 'Soul Catering', category: 'Catering', status: 'Quoted', cost: 900, payDueDate: iso(-5), balancePaid: false, arrivalTime: '' },
      { id: 'v2', name: 'DJ Smooth', category: 'DJ', status: 'Booked', cost: 400, arrivalTime: '' },
    ],
    timeline: [] } },
  // reconfirm-window — two days out with named unconfirmed vendors (reconfirm
  // sweep) and an overdue COI. Fires vendor-reconfirm + vendor-coi.
  { key: 'reconfirm-window', ev: {
    id: 'rc1', type: 'retirement', name: 'Retire', date: iso(2), guestMode: 'count', guestCount: 40, venue: 'VFW',
    vendors: [{ id: 'v1', name: 'Soul Catering', category: 'Catering', status: 'Booked', cost: 900, coiRequired: true, coiStatus: '' }],
    timeline: [] } },
  // event-today — the day itself: day-of alerts.
  { key: 'event-today', ev: {
    id: 'ed1', type: 'birthday', name: 'Bday', date: iso(0), guestMode: 'count', guestCount: 20, venue: 'Bowie, MD',
    vendors: [{ id: 'v1', name: 'Caterer', category: 'Catering', status: 'Confirmed', cost: 300, balancePaid: false, payDueDate: iso(0) }], timeline: [] } },
];

// ── The row selectors a route can carry. If a route names one, the resolution
//    MUST land on it (focus === the id) — never a bare tab-top. This is the
//    generic backbone: it catches any surface, present or future.
const ID_KEYS = ['vendorId', 'guestId', 'riskId', 'decisionId', 'taskId'];

// ── focusField intent: a section anchor must reach its specialized sheet, not a
//    generic tab catch-all. { kind, focus? } is the REQUIRED landing; focus
//    omitted = the single-purpose sheet itself is the target (focus null is ok).
const FOCUSFIELD_INTENT = [
  { test: (f) => f === 'lodging-deadline', kind: 'lodging', focus: 'deadline' },
  { test: (f) => f === 'ground-riders', kind: 'ground', focus: 'riders' },
  { test: (f) => /^air/.test(f), kind: 'air' },
  { test: (f) => /^ground/.test(f), kind: 'ground' },
  { test: (f) => /^lodging/.test(f), kind: 'lodging' },
  { test: (f) => /^foodrow-/.test(f), kind: 'food' },
  { test: (f) => /^fp-diet/.test(f), kind: 'food', focus: 'diet' },
  { test: (f) => f === 'rain-plan', kind: 'rain' },
  { test: (f) => f === 'crab-plan', kind: 'crabs' },
  { test: (f) => /^space/.test(f) || /^caprow-/.test(f), kind: 'space' },
  { test: (f) => /^ros-/.test(f), kind: 'stage:day' },
  { test: (f) => f === 'event-date' || f === 'event-start', kind: 'stage:plan' },
  { test: (f) => f === 'event-venue', kind: 'stage:plan' },
];

// The full check for ONE emitted route. Returns a problem string, or null.
function checkRoute(surface, route) {
  const res = resolveRoute(route);
  const label = `${surface} ${JSON.stringify(route)}`;
  if (res === null) return `${label} → DEAD-END (resolveRoute returned null — no sheet/stage to land on)`;

  // 1 · a carried row id must be preserved as the landing focus.
  for (const k of ID_KEYS) {
    if (route[k] != null && res.focus !== route[k]) {
      return `${label} → TAB-TOP: carried ${k}=${JSON.stringify(route[k])} but landed focus=${JSON.stringify(res.focus)} (kind ${res.kind})`;
    }
  }
  // 2 · a section-anchor focusField must reach its specialized sheet.
  const ff = String(route.focusField || '');
  if (ff) {
    const intent = FOCUSFIELD_INTENT.find((i) => i.test(ff));
    if (intent) {
      if (res.kind !== intent.kind) {
        return `${label} → WRONG SHEET: focusField ${JSON.stringify(ff)} must land kind ${intent.kind}, got ${res.kind}`;
      }
      if (intent.focus && res.focus !== intent.focus && route.guestId == null) {
        return `${label} → WRONG SECTION: focusField ${JSON.stringify(ff)} must focus ${intent.focus}, got ${JSON.stringify(res.focus)}`;
      }
    }
  }
  // 3 · money/insurance routes must carry their sub-section through to the sheet.
  if (route.vendorSection && res.vendorSection !== route.vendorSection) {
    return `${label} → LOST SECTION: vendorSection ${route.vendorSection} not carried to the sheet (got ${JSON.stringify(res.vendorSection)})`;
  }
  return null;
}

describe('every raiseAll route executes routeSheet and lands row-level', () => {
  test('the battery raises across the surfaces it targets (anti-vacuity)', () => {
    const surfacesSeen = new Set();
    FIXTURES.forEach((f) => raiseAll(f.ev).forEach((r) => surfacesSeen.add(r.surface)));
    // The classes the brief named must all be exercised by the battery.
    ['risks', 'vendor-payments', 'seating', 'lodging', 'travel-air', 'travel-ground',
     'helpers', 'vendor-reconfirm', 'day-of'].forEach((id) => {
      expect(surfacesSeen.has(id)).toBe(true);
    });
    // And the helpers 'space' route (the wave-6 bug) must actually be emitted —
    // otherwise the fix at ~2391 is untested by execution.
    const dbRoutes = raiseAll(FIXTURES.find((f) => f.key === 'test-day-before-vendors').ev);
    expect(dbRoutes.some((r) => String(r.route.focusField || '') === 'space')).toBe(true);
  });

  test('every emitted route resolves to a real sheet/stage, never a tab-top', () => {
    const problems = [];
    const distinct = new Map();
    FIXTURES.forEach((f) => {
      raiseAll(f.ev).forEach((r) => {
        const p = checkRoute(r.surface, r.route);
        if (p) problems.push(p);
        distinct.set(`${r.surface}::${JSON.stringify(r.route)}`, true);
      });
    });
    if (problems.length) {
      throw new Error(`${problems.length} raised route(s) do not land row-level:\n  ${problems.join('\n  ')}`);
    }
    // Guardrail: the sweep is not vacuous — it drove a real spread of routes.
    expect(distinct.size).toBeGreaterThan(10);
  });

  // ── The gate is not vacuous: prove checkRoute CATCHES the two failure modes
  //    it exists to catch (a dead-end, and a tab-top that drops a row id). If
  //    these ever stop failing, the sweep above is asleep. ──────────────────────
  test('checkRoute flags a dead-end route (unroutable focusField)', () => {
    // A hypothetical new surface raising a focusField routeSheet has no branch
    // for — the wave-6 bug BEFORE its fix. resolveRoute returns null.
    expect(resolveRoute({ tab: 'Messages', focusField: 'thread-42' })).toBeNull();
    expect(checkRoute('hypothetical', { tab: 'Messages', focusField: 'thread-42' })).toMatch(/DEAD-END/);
  });

  test('checkRoute flags a route that drops a carried row id on the floor', () => {
    // tab:'Planning' with a guestId but no food/space focus falls to the tasks
    // catch-all (focus taskId||null = null) — a tab-top that ignores guestId.
    const res = resolveRoute({ tab: 'Planning', guestId: 'g9' });
    expect(res).not.toBeNull();       // it DOES land somewhere (tasks)…
    expect(res.focus).toBeNull();     // …but drops g9 — a tab-top.
    expect(checkRoute('hypothetical', { tab: 'Planning', guestId: 'g9' })).toMatch(/TAB-TOP/);
  });
});

// ── De-mirror binding: ROUTESHEET_TABS (consumed by ctaSourceOfTruth) must stay
//    in lockstep with resolveRoute — every tab it lists must actually resolve,
//    and every tab the resolver's own branches key on must be listed. Neither
//    can drift without this failing.
describe('ROUTESHEET_TABS is bound to the resolver, not hand-mirrored', () => {
  test('every tab in ROUTESHEET_TABS resolves to a real landing', () => {
    ROUTESHEET_TABS.forEach((tab) => {
      expect(resolveRoute({ tab })).not.toBeNull();
    });
  });

  test('every tab any SURFACE raises is in ROUTESHEET_TABS', () => {
    // The registry's declared surface routes name the tabs the resolver must
    // own; a tab a surface can raise but the list omits is exactly the drift
    // this binding prevents.
    const tabs = new Set();
    SURFACES.forEach((s) => { if (s.route && s.route.tab) tabs.add(s.route.tab); });
    // 'Seating' and 'Travel' surface routes land via focusField/guestId; both
    // are resolver-owned tabs, so they belong in the list too.
    tabs.forEach((tab) => {
      // Only assert for tabs the resolver actually branches on (a surface may
      // declare a tab that routes via focusField only — still resolver-owned).
      if (resolveRoute({ tab }) !== null) {
        expect(ROUTESHEET_TABS).toContain(tab);
      }
    });
  });
});

// ── Place-note deep links land on the SPACE sheet's own rows (audit 2026-07-22) ──
// The weather / placeIntelligence / returnNarration routes promise the parking /
// load-in / contact / rules NOTE — before this branch they fell into the
// Event-Details→Venue catch (right neighborhood, field dropped). The focus value
// is the place-row key the shell's inline note editor opens on.
describe('place-note focusFields land on the space sheet row', () => {
  const CASES = [
    ['parking-notes', 'parking'],
    ['loadin-notes', 'loadIn'],
    ['venue-contact', 'contact'],
    ['house-rules', 'rules'],
  ];
  CASES.forEach(([ff, focus]) => {
    test(`${ff} → space · ${focus}`, () => {
      expect(resolveRoute({ tab: 'Event Details', focusField: ff })).toEqual({ kind: 'space', focus });
    });
  });
  test('a bare Event Details route still lands on the Venue anchor', () => {
    expect(resolveRoute({ tab: 'Event Details' })).toEqual({ kind: 'stage:plan', focus: null, anchor: 'Venue' });
  });
});
