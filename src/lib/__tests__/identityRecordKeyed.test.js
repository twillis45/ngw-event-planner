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

import { eventPlan } from '../../CommandCenter';
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

const FIXTURES = {
  'my-crab-feast': myCrabFeast(),
  'test-day-before-vendors': dayBeforeVendors(),
  destination: destination(),
  roster: roster(0),
  'snoozed-state': snoozedState(),
  'overdue-bundle': overdueBundle(),
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
