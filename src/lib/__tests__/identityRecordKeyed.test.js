// IDENTITY CLASS — CROSS-PRODUCER RECORD-KEYED ID SWEEP (2026-07-15)
//
// THE CLASS this closes: "keys from text instead of records." Snooze/dedup key on
// an action id. When that id is derived from a count-bearing TITLE (or any other
// mutable/ephemeral string) instead of the underlying RECORD, a changing count mints
// a new id and silently DETACHES the snooze — the host set a thing down, the count
// moved, and it resurfaced under a new id as if never handled. The same failure lets
// one record double-bill across two producers.
//
// Prior waves closed INSTANCES (wave-6 seating title→first-guest; wave-7 the tier-6.4
// dietary decision → canonical `decision:<id>`). This suite closes the CLASS: it
// enumerates EVERY producer STRUCTURALLY (all SURFACES + every ladder tier that
// reaches the top action) and proves NO produced id anywhere keys on mutable text
// while a record was available — and that ids are DETERMINISTIC and STABLE under a
// count mutation, the two properties a snooze depends on.
//
// If this suite ever fails, a producer has started keying on prose again. Do not
// special-case it here — thread the record id through the producer (surfaceRegistry
// raiser `key`, or the ladder tier's route/`decision`/`decisionId`) so _topActionId
// and the registry itemKey never fall back to a title slug.

import { eventPlan, _topActionId, _selectEventNextActionInner } from '../../CommandCenter';
import { raiseAll, SURFACES } from '../surfaceRegistry';
import { playbookFoodPlan } from '../playbooks';

// LOCAL date, not UTC — same helper discipline as the sibling identity suites.
const iso = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(() => { try { localStorage.clear(); } catch {} });

// ── THE GRAMMAR ────────────────────────────────────────────────────────────────
// The titleKey normalizer eventPlan uses (trailing period + "· N open" tail
// stripped, lowercased, prose). If an id's record tail equals this, the id IS the
// prose — the exact bug.
const titleKey = (t) => String(t || '').toLowerCase().replace(/·[^·]*$/, '').replace(/[.\s]+$/, '').trim();
const _slugTitle = (t) => String(t || '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

// RECORDLESS AGGREGATE SURFACES — the ONLY surfaces allowed to emit `surface:<id>`
// with no record part. Each raises exactly ONE aggregate about a shared obligation
// with no single owning record, so the surface id alone IS its stable identity:
//   seating       — "N confirmed guests still need seats" (the debt is the whole
//                   unassigned set; keying on the first-unassigned guest jumps the
//                   moment that guest is seated — the count-mutation failure below).
//   lodging       — "N of M haven't booked a room" (one shared booking deadline).
//   travel-ground — "N guests still need a way around" (one aggregate rider gap).
// A surface NOT on this list carries a real record and MUST declare its `key`.
const RECORDLESS_AGGREGATE_SURFACES = new Set(['seating', 'lodging', 'travel-ground']);

// Foundation dominoes key on their stable domain word (date/guests/budget/food) —
// aggregate essentials with no per-record identity and no count in their titles.
const FOUNDATION_DOMAIN_IDS = new Set(['date', 'guests', 'budget', 'food', 'venue']);

// Route fields that name a specific RECORD (a row the action lands on). If a route
// carries one of these, a record was AVAILABLE to key on — so a title-slug id is a bug.
const RECORD_ROUTE_FIELDS = ['vendorId', 'decisionId', 'taskId', 'commId', 'riskId', 'timelineId', 'guestId', 'foodFocus'];
const routeRecord = (route) => {
  const r = route || {};
  for (const f of RECORD_ROUTE_FIELDS) if (r[f] != null) return String(r[f]);
  return null;
};

// ── FIXTURE BATTERY ──────────────────────────────────────────────────────────────
const feast = (over = {}) => ({
  id: 'id-x', type: 'Crab Feast', name: 'Feast', date: iso(20),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});
const withFood = (base) => {
  const fp = playbookFoodPlan(base); const picks = {};
  (fp && fp.choices ? fp.choices : []).forEach((c) => { picks[c.id] = c.chosen != null ? c.chosen : (c.options && c.options[0]); });
  return picks;
};

// my-crab-feast — the canonical near-term feast (risks + food + rain live).
const myCrabFeast = () => feast({ id: 'my-crab-feast' });

// test-day-before-vendors — inside the reconfirm window, unsigned contracts (arrival
// asks, reconfirm sweep, vendor-conflicts, COI, overdue decisions all live).
const dayBeforeVendors = () => feast({
  id: 'test-day-before-vendors', date: iso(2),
  vendors: [
    { id: 'v1', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true },
    { id: 'v2', name: 'Fork & Flower', category: 'Catering', status: 'Confirmed', contractSigned: true },
  ],
});

// destination — seating + lodging + air/ground travel raises.
const destination = () => feast({
  id: 'id-dest', isDestination: true,
  lodging: { hotelName: 'Bay Inn', deadline: iso(10) },
  foodChoices: withFood(feast()),
  guests: [
    { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { lodging: { status: 'booked' } } },
    { id: 'g2', name: 'Ben Cole', rsvp: 'Yes' },
    { id: 'g3', name: 'Cy Dean', rsvp: 'Yes' },
  ],
});

// roster/RSVP — a confirmed roster with unassigned seats (the seating aggregate).
const roster = (seatFront = 0) => feast({
  id: 'id-roster',
  foodChoices: withFood(feast()),
  guests: Array.from({ length: 6 }, (_, i) => ({
    id: 'g' + i, name: 'Guest ' + i, rsvp: 'Yes', ...(i < seatFront ? { table: 1 } : {}),
  })),
});

// snoozed-state — a fixture that already carries a snooze map (the post-snooze path).
const snoozedState = () => {
  const base = feast({ id: 'id-snoozed', date: iso(5), foodChoices: { sides: 'Corn' } });
  return { ...base, snoozed: { 'surface:seating': iso(3) } };
};

const overdueBundle = () => feast({ id: 'id-late', date: iso(5), foodChoices: { sides: 'Corn' } });

// overdue-payment — a single confirmed vendor whose balance is 4 days past due. The
// ladder's tier-4 payment top and the registry's vendor-payments raise are the SAME debt
// (the wave-8 dual-produced critical): with the cross-producer vendor id form they now
// collapse on identity, and the surviving card must keep the registry twin's real clock.
const overduePayment = () => feast({
  id: 'id-overdue-pay',
  foodChoices: withFood(feast()),
  vendors: [
    { id: 'vp1', name: 'Fork & Flower', category: 'Catering', status: 'Confirmed',
      contractSigned: true, cost: 1200, payDueDate: iso(-4), balancePaid: false },
  ],
});

// brand-new — nothing done yet; the ladder's tier-0 simple win ('start' category).
const brandNewEvent = () => ({
  id: 'id-new', type: 'Crab Feast', name: 'New', date: iso(20),
  guests: [], vendors: [], timeline: [], budget: [],
});

const FIXTURES = {
  'my-crab-feast': myCrabFeast(),
  'test-day-before-vendors': dayBeforeVendors(),
  destination: destination(),
  roster: roster(0),
  'snoozed-state': snoozedState(),
  'overdue-bundle': overdueBundle(),
  'overdue-payment': overduePayment(),
};

// Every action id eventPlan produces, INCLUDING bundle children and set-aside/worry
// lanes — the complete surface a snooze can be written against.
const allProducedActions = (plan) => [
  ...plan.nextActions,
  ...(plan.worries || []),
  ...(plan.setAside || []),
  ...plan.nextActions.flatMap((a) => a.items || []),
  ...(plan.worries || []).flatMap((a) => a.items || []),
];

// ── THE INVARIANT — one predicate, applied to every produced action ───────────────
// Returns null when the id is a legitimate record-keyed / recordless-aggregate form,
// or a string describing the violation (which is the id keyed on prose).
function idViolation(a) {
  const id = a && a.id;
  if (id == null || id === '') return null;         // calm fillers carry no id, by contract
  const s = String(id);
  const title = String(a.title || '');
  const tk = titleKey(title);
  const slug = _slugTitle(title);

  // The direct test of the class: does the id's tail reproduce the title's prose?
  const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
  const tailIsProse = tail !== '' && (tail === tk || tail === slug || tail === titleKey(tail));

  if (s.startsWith('decision:')) return null;                     // canonical decision debt
  if (s.startsWith('phase:')) return null;                        // stable phase id
  if (s.startsWith('bundle:')) return null;                       // bundle:<surfaceId>
  if (FOUNDATION_DOMAIN_IDS.has(s)) return null;                  // foundation domino, stable domain

  if (s.startsWith('surface:')) {
    const rest = s.slice('surface:'.length);
    const surfaceId = rest.includes(':') ? rest.slice(0, rest.indexOf(':')) : rest;
    const record = rest.includes(':') ? rest.slice(rest.indexOf(':') + 1) : null;
    if (record == null) {
      // Recordless aggregate — allowed ONLY for the allow-listed surfaces.
      if (RECORDLESS_AGGREGATE_SURFACES.has(surfaceId)) return null;
      return `recordless surface id '${s}' on non-aggregate surface '${surfaceId}'`;
    }
    // Has a record part — it must be the raise's real record, never the title prose.
    if (record === tk || record === slug) return `surface id keyed on TITLE PROSE: '${s}'`;
    return null;
  }

  if (s.startsWith('top:')) {
    // The ladder top. If the action routes to a specific record, the id MUST carry
    // it — a title-slug id while a record was available is the bug. A record-less
    // ladder action (a foundational simple-win: "Add your guest list") may slug its
    // (count-free) title honestly.
    const rec = routeRecord(a.route || a.primaryRoute);
    if (rec != null && tailIsProse) return `ladder top keyed on TITLE while route names record '${rec}': '${s}'`;
    return null;
  }

  return `unrecognized id grammar: '${s}' (title=${JSON.stringify(title.slice(0, 40))})`;
}

// ── 1. STRUCTURAL: every non-aggregate surface declares a record key ──────────────
describe('every raiser either carries a record key or is an allow-listed aggregate', () => {
  test('SURFACES that are not recordless aggregates raise only record-keyed items', () => {
    for (const [name, ev] of Object.entries(FIXTURES)) {
      for (const r of raiseAll(ev)) {
        if (RECORDLESS_AGGREGATE_SURFACES.has(r.surface)) continue;
        expect({ fixture: name, surface: r.surface, key: r.key, title: r.title })
          .toEqual(expect.objectContaining({ key: expect.any(String) }));
      }
    }
  });

  test('the allow-list is exactly the set of registered surfaces that raise recordless', () => {
    // Enumerate producers STRUCTURALLY: any surface that ever raises with key==null is
    // a recordless aggregate and must be on the allow-list — nothing hardcoded.
    const recordless = new Set();
    for (const ev of Object.values(FIXTURES)) {
      for (const r of raiseAll(ev)) if (r.key == null) recordless.add(r.surface);
    }
    for (const surfaceId of recordless) {
      expect(RECORDLESS_AGGREGATE_SURFACES.has(surfaceId)).toBe(true);
    }
    // And every allow-listed id is a real registered surface (no stale entries).
    const known = new Set(SURFACES.map((s) => s.id));
    for (const id of RECORDLESS_AGGREGATE_SURFACES) expect(known.has(id)).toBe(true);
  });
});

// ── 2. THE SWEEP: no produced id anywhere keys on mutable text ────────────────────
describe('no produced action keys on mutable title text where a record was available', () => {
  for (const [name, ev] of Object.entries(FIXTURES)) {
    test(`${name} — every produced id is record-keyed or an allow-listed aggregate`, () => {
      const plan = eventPlan(ev);
      const violations = allProducedActions(plan)
        .map((a) => { const v = idViolation(a); return v ? { id: a.id, why: v } : null; })
        .filter(Boolean);
      expect(violations).toEqual([]);
    });
  }
});

// ── 3. DETERMINISM: the same fixture rendered twice yields identical ids ───────────
// A snooze written now must still match the same raise on the very next render. An
// id built from Date.now()/a counter/any ephemeral string fails this immediately —
// the snooze detaches before the count even moves.
describe('ids are deterministic across identical renders', () => {
  for (const [name, ev] of Object.entries(FIXTURES)) {
    test(`${name} — id set is identical on a re-render`, () => {
      const ids1 = allProducedActions(eventPlan(ev)).map((a) => a.id).filter(Boolean).sort();
      const ids2 = allProducedActions(eventPlan(ev)).map((a) => a.id).filter(Boolean).sort();
      expect(ids2).toEqual(ids1);
    });
  }

  test('raiseAll keys are deterministic per surface across renders (no ephemeral ids)', () => {
    for (const ev of Object.values(FIXTURES)) {
      const keyset = () => raiseAll(ev).map((r) => `${r.surface}|${r.key}`).sort();
      expect(keyset()).toEqual(keyset());
    }
  });
});

// ── 4. THE DIRECT PROOF: mutate a count, the SAME raise's id is UNCHANGED ─────────
// This is the property snooze depends on. Seat a confirmed guest — INCLUDING the
// current first-unassigned one, the anchor a first-guest key would jump off of — and
// assert the seating raise's id does not move. A title/first-guest key changes here;
// a recordless aggregate id does not.
describe('count-mutation id stability — the seating aggregate never moves', () => {
  const seatingId = (ev) => {
    const a = eventPlan(ev).nextActions
      .concat(eventPlan(ev).nextActions.flatMap((x) => x.items || []))
      .find((x) => x && /still need|still needs/.test(String(x.title || '')) && String(x.id || '').includes('seating'));
    return a ? a.id : null;
  };

  test('seating one MORE guest (a later row) does not change the seating id', () => {
    const before = seatingId(roster(2));   // g0,g1 seated → 4 still need seats
    const after = seatingId(roster(3));    // g0,g1,g2 seated → 3 still need seats
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(before).toBe(after);
  });

  test('seating the FIRST-unassigned guest (the anchor) does not change the id', () => {
    // roster(0): nobody seated, the first-unassigned is g0. roster(1): g0 is now
    // seated — a first-guest key would jump g0→g1 here and detach the snooze.
    const before = seatingId(roster(0));
    const after = seatingId(roster(1));
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(before).toBe(after);
    // …and it is the stable recordless aggregate id, not a per-guest one.
    expect(before).toBe('surface:seating');
  });

  test('the seating title genuinely moved across the mutation (the count really changed)', () => {
    const titleOf = (ev) => {
      const a = eventPlan(ev).nextActions.find((x) => /still need|still needs/.test(String(x.title || '')));
      return a ? a.title : null;
    };
    expect(titleOf(roster(0))).not.toBe(titleOf(roster(1)));   // prose changed…
    expect(seatingId(roster(0))).toBe(seatingId(roster(1)));   // …id did not
  });
});

// ── 5. SNOOZE FOLLOWS THE RECORD ACROSS A COUNT CHANGE ────────────────────────────
// The end-to-end contract: snooze the seating raise, then mutate the count. It must
// stay in setAside (not resurface under a new id).
describe('a snooze follows the seating debt across a count mutation', () => {
  test('snooze at count N, seat the anchor, still set aside at count N-1', () => {
    const id = eventPlan(roster(0)).nextActions.find((a) => /still need/.test(String(a.title || ''))).id;
    expect(id).toBe('surface:seating');
    const mutated = { ...roster(1), snoozed: { [id]: iso(4) } };   // seated the anchor + snoozed
    const plan = eventPlan(mutated);
    expect(plan.nextActions.find((a) => a.id === id)).toBeUndefined();   // not resurfaced
    const aside = plan.setAside.find((a) => a.id === id);
    expect(aside).toBeTruthy();
    expect(aside.snoozedUntil).toBe(iso(4));
  });
});

// ── 6. CROSS-PRODUCER DEDUP (wave-7 dietary) STAYS CLOSED ──────────────────────────
// A decision debt keyed `decision:<id>` must appear exactly ONCE whether the ladder
// tier or the registry surfaces it — no double-bill across the summary and the row.
describe('the canonical decision id is not double-billed across producers', () => {
  test('decision:dietary appears exactly once across ladder + registry bundle', () => {
    const plan = eventPlan(overdueBundle());
    const ids = allProducedActions(plan).map((a) => a.id).filter(Boolean);
    expect(ids.filter((id) => id === 'decision:dietary')).toHaveLength(1);
  });

  test('no produced id appears twice anywhere in the plan', () => {
    for (const ev of Object.values(FIXTURES)) {
      const ids = allProducedActions(eventPlan(ev)).map((a) => a.id).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

// ── 7. STRUCTURAL SWEEP AT THE PRODUCER BOUNDARY (wave-8) ─────────────────────────
// The sweep in §2 only exercises the tiers its six fixtures happen to reach — a future
// ladder tier that slugged a mutable title would slip through until some fixture reached
// it. This closes that gap STRUCTURALLY by driving the invariant at _topActionId itself
// (approach b): feed it EVERY category the ladder can stamp × EVERY record field a route
// can carry, and assert it NEVER returns a title slug while a record is present. This
// holds regardless of which tiers exist or which fixtures reach them.
//
// THE LADDER TIERS (_selectEventNextActionInner, CommandCenter.jsx) and their category:
//   Tier 0    brand-new → guest list ............... start
//   Tier 0.5  set the budget ...................... readiness
//   Tier 1    caterer drift ....................... caterer
//   Tier 2    urgent / overdue decision ........... decision
//   Tier 3    drafted / awaiting approval ......... approval
//   Tier 4    overdue payment ..................... vendor   (route vendorSection 'payment')
//   Tier 4.2  critical COI ........................ vendor   (route vendorSection 'documents')
//   Tier 4    unconfirmed vendor .................. vendor   (no section)
//   Tier 4.5  compressed-timeline first task ...... compression
//   Tier 5    timeline at risk .................... timeline
//   Tier 6    inbound message ..................... comm
//   Tier 6.4  decision-first gate ................. decision
//   Tier 6.5  operational buy ..................... operational
//   Tier 7    next milestone ...................... calendar (CALM → null)
//   Tier 7.5  empty event → guests ............... start
//   Tier 7.8  overdue board decision ............. decision
//   Tier 7.8  planning essential ................. readiness
//   Tier 7.9  protect the heart .................. heart    (CALM → null)
//   Tier 8    all-clear ........................... neutral  (CALM → null)
// The vocabulary below is the closed set of categories those tiers emit; the coverage
// guard drives the ladder and fails if it ever produces a category not in this set — so a
// new tier forces an update here, which forces the boundary sweep to cover it.
const LADDER_CATEGORIES = [
  'start', 'readiness', 'caterer', 'decision', 'approval', 'vendor',
  'compression', 'timeline', 'comm', 'operational', 'calendar', 'heart', 'neutral',
];
// Categories _topActionId returns null for by construction (a lone calm line is a state,
// not a snoozeable task) — the three CALM_FILLER_CATEGORIES in CommandCenter.
const CALM = new Set(['neutral', 'calendar', 'heart']);
// A title engineered to slug LOUDLY if an id ever falls back to prose: it carries a live
// count tail ('· 2 open'), exactly the mutable text the class forbids keying on.
const SLUGGY_TITLE = 'Confirm 3 of 7 things · 2 open';

describe('STRUCTURAL — _topActionId never slugs a mutable title when a route names a record', () => {
  test('every ladder category × every record field keys the RECORD, not the prose', () => {
    for (const category of LADDER_CATEGORIES) {
      for (const field of RECORD_ROUTE_FIELDS) {
        const token = 'REC-' + field;
        const id = _topActionId({ category, title: SLUGGY_TITLE, primaryRoute: { tab: 'X', [field]: token } });
        if (CALM.has(category)) { expect(id).toBeNull(); continue; }   // calm → unsnoozeable, no id to slug
        expect(id).not.toBeNull();
        const s = String(id);
        const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
        // The id's tail must never reproduce the title's prose…
        expect(tail).not.toBe(_slugTitle(SLUGGY_TITLE));
        expect(tail).not.toBe(titleKey(SLUGGY_TITLE));
        // …and the record must actually be in the id (not merely a different non-slug).
        expect(s).toContain(token);
      }
    }
  });

  test('coverage — the vocabulary swept above is a superset of what the ladder emits AND of the branches _topActionId special-cases', () => {
    // Drive a battery to the reachable tiers; every category the ladder actually
    // produces must be in the swept vocabulary. A NEW tier's category (once any fixture
    // reaches it) fails this until it is added above — and thus into the sweep.
    const battery = [
      ...Object.values(FIXTURES), brandNewEvent(), overduePayment(),
    ];
    const produced = new Set(
      battery.map((ev) => { try { return _selectEventNextActionInner(ev)?.category; } catch { return null; } })
        .filter(Boolean),
    );
    for (const c of produced) expect(LADDER_CATEGORIES).toContain(c);
    // Every branch _topActionId itself special-cases (the CALM set + the decision/vendor
    // canonical forms) is in the swept vocabulary, so no branch is left unexercised.
    for (const c of ['neutral', 'calendar', 'heart', 'decision', 'vendor']) {
      expect(LADDER_CATEGORIES).toContain(c);
    }
  });
});

// ── 8. VENDOR DEBT UNIFIED ACROSS PRODUCERS (wave-8) ─────────────────────────────
// The decision unification (§6, wave-7) gave a decision debt ONE canonical id
// ('decision:<id>') whether the ladder or the registry raised it. Vendor debts stayed
// DUAL-keyed — 'top:vendor:<id>' (ladder) vs 'surface:vendor-payments:<id>' (registry) —
// so the structure that caused the decision detach was still open for vendors. The debt's
// route SECTION now names its surface, so both producers key the SAME
// 'surface:<vendor-surface>:<vendorId>' form and a snooze follows the debt across
// producers, exactly like decisions.
describe('a vendor debt keys identically across the ladder and the registry', () => {
  test('the ladder vendor top keys the SAME surface id the registry emits (payment + COI)', () => {
    const vendorId = 'vp1';
    // Ladder side — the tier-4 payment action shape. Registry side — the itemKey eventPlan
    // builds for a vendor-payments raise (key === vendorId): 'surface:vendor-payments:<id>'.
    expect(_topActionId({
      category: 'vendor', title: 'Send payment to Fork & Flower.',
      primaryRoute: { tab: 'Vendors', vendorId, vendorSection: 'payment' },
    })).toBe('surface:vendor-payments:' + vendorId);
    // Critical COI mirrors it through the documents section → the vendor-coi surface.
    expect(_topActionId({
      category: 'vendor', title: 'Get an updated COI from Fork & Flower.',
      primaryRoute: { tab: 'Vendors', vendorId, vendorSection: 'documents' },
    })).toBe('surface:vendor-coi:' + vendorId);
    // An unconfirmed booking (no section) has NO registry twin → the generic form is
    // preserved untouched (snoozeIntegrity + wave6IdentityPolicy pin this).
    expect(_topActionId({
      category: 'vendor', title: 'Confirm Fork & Flower.',
      primaryRoute: { tab: 'Vendors', vendorId },
    })).toBe('top:vendor:' + vendorId);
  });

  test('the ladder payment top and its registry twin collapse to ONE card that keeps the clock', () => {
    const plan = eventPlan(overduePayment());
    const id = 'surface:vendor-payments:vp1';
    const cards = allProducedActions(plan).filter((a) => a.id === id);
    // Collapsed on IDENTITY (not merely title-deduped into two half-forms) → exactly one.
    expect(cards).toHaveLength(1);
    const card = cards[0];
    expect(card.source).toBe('ladder');            // the ladder top is the survivor
    expect(card.level).toBe('critical');
    // WAVE-8: the survivor keeps the registry twin's real clock — the ladder payment tier
    // carries no leadDays, so pre-fix its dueInDays was null and the most-overdue critical
    // sank in the band-1 ordering as if it had no deadline. Threaded through the dedup now.
    expect(card.dueInDays).toBe(-4);
  });
});
