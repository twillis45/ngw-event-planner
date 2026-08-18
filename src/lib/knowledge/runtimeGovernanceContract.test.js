// ─── THE RUNTIME GOVERNANCE CONTRACT (Phase 5E.4) ────────────────────────────
//
// ONE RULE, ENFORCED AGAINST OUTPUT:
//
//   NGW cannot claim a field is governed unless changing that field changes what
//   the host sees.
//
// WHY THIS FILE EXISTS. Three separate times a field was editable, publishable,
// versioned, approved and present in the knowledge system while having ZERO effect
// on a host:
//
//   5E    p_crabs.qtyPerGuest    moved the stated rate, not the count
//   5E.3  p_crabs.servingGuide   read only as `if (!p.servingGuide) return null`
//   5E.4  every SUPPLY line      playbookFoodPlan's supplies loop never called
//                                governedPurchase() — 396 dead field/purchase pairs
//   5E.4  crabPriceLadder()      scanned the AUTHORED playbook, so the crab sheet
//                                and the shopping list could show different prices
//
// Each was found by hand, and each existing gate missed it. The reason is worth
// stating once: `governedOwnership.test.js` asserts RUNTIME_CONSUMED_FIELDS equals
// GOVERNED_PURCHASE_FIELDS. Both listed `servingGuide`, so both were wrong together.
// **Two declarations agreeing is consistency, not consumption.** Field names,
// governance lists, comments, docs and UI labels are all claims. The consumer is the
// contract, and OUTPUT is the only witness that cannot agree with itself.
//
// So this test reads NOTHING that declares governance. It takes the registry only as
// a list of things to DISPROVE, injects a value that could not possibly leave output
// unchanged, and fails if output is unchanged.
import { ALL_PLAYBOOKS, playbookFoodPlan, crabPriceLadder, getPlaybook } from '../playbooks/index';
import { fieldOwnership, blockedMessage, RUNTIME_CONSUMED_FIELDS, CHANNEL_PRICED_PURCHASES } from './governedOwnership';
import { __setSnapshotForTests, __resetSnapshotForTests } from './publishedSnapshot';

const EVENT = (type, guestCount = 18) => ({ id: 'contract', type, date: '2026-09-01', guestCount });

// GOVERNANCE BOOKKEEPING IS NOT HOST OUTPUT. `governedFields` records WHICH fields
// governance supplied, so it changes the instant anything is published - including
// when the published value is inert. Comparing raw output would therefore let a dead
// field prove itself alive using the very act of publishing, which is the exact
// false-pass this file exists to prevent. Measured: governing `p_oldbay.qtyFlat` (a
// purchase sized by qtyPerGuest) changes `governedFields` and NOTHING else.
const BOOKKEEPING = new Set(['governedFields', '_governed']);
const hostVisible = (list) => (list == null ? null : JSON.stringify(
  list.map((row) => {
    const out = {};
    for (const k of Object.keys(row).sort()) if (!BOOKKEEPING.has(k)) out[k] = row[k];
    return out;
  }),
));

const foodPlan = (type, guests) => {
  try { return (playbookFoodPlan(EVENT(type, guests), {}) || {}).list || null; } catch (_e) { return null; }
};

/** Publish exactly one governed value, run `fn`, and always restore. */
function withGoverned(assetId, fieldPath, value, fn) {
  __setSnapshotForTests({
    schemaVersion: 1, entryCount: 1, generatedAt: null, snapshotVersion: 'contract',
    entries: [{ assetId, fieldPath, value, kcrId: 'contract', versionId: 'v', provenance: {}, evidenceIds: [] }],
  });
  try { return fn(); } finally { __resetSnapshotForTests(); }
}

/**
 * A value chosen so that "output did not change" can only mean "nothing read it".
 * Deliberately extreme but still schema-VALID: the point is to isolate the wire, not
 * to test validation. Multiplied rather than replaced so the injected value differs
 * from the authored one for every purchase, whatever it started at.
 */
function extremeValue(field, current) {
  switch (field) {
    case 'qtyPerGuest':
    case 'qtyFlat':
      return (typeof current === 'number' && current > 0) ? current * 11 : 7;
    case 'unitCostRange':
      return Array.isArray(current) ? [current[0] * 23 + 13, current[1] * 23 + 29] : [111, 222];
    case 'provenance':
      return {
        tier: 'researched', confidence: 'high', verificationStatus: 'researched',
        sources: ['runtime-contract-test'], note: 'RUNTIME CONTRACT TEST MARKER',
      };
    case 'priceLadder': {
      const v = JSON.parse(JSON.stringify(current || {}));
      for (const k of Object.keys(v)) {
        const row = v[k];
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        for (const f of ['perDz', 'per2Dz', 'perHalfBushel', 'perBushel']) {
          if (typeof row[f] === 'number') row[f] = row[f] * 7 + 11;
        }
      }
      return v;
    }
    case 'servingGuide': {
      const v = JSON.parse(JSON.stringify(current || {}));
      for (const k of Object.keys(v.bySize || {})) {
        const row = v.bySize[k];
        if (Array.isArray(row.withSides)) row.withSides = [1, 1];
        if (Array.isArray(row.mainOnly)) row.mainOnly = [1, 1];
        if (Array.isArray(row.perBushel)) row.perBushel = [199, 199];
      }
      return v;
    }
    default:
      return null;
  }
}

const violation = (fieldPath, surface) => [
  '', 'Governance contract violation:', '',
  `Field:            ${fieldPath}`,
  'Declared governed: true',
  'Runtime effect:    false',
  `Surface:          ${surface}`, '',
  'Consumer missing or disconnected. An admin can edit, review, approve and publish',
  'this value and no host will ever see the difference. Either wire the consumer or',
  'remove the field from the governed set - do not leave fake governance.', '',
].join('\n');

// ── The sweep ────────────────────────────────────────────────────────────────
//
// SCOPE. Only (purchase, field) pairs where the purchase actually RENDERS on the
// surface. A line filtered out for this event (non-essential decor, an unpicked
// decision branch) is a RENDERING condition, not a governance failure - governing an
// invisible line changes nothing because the line is invisible, which the field is
// not responsible for. Those pairs are counted and reported, never silently dropped.
describe('every governed field moves host output', () => {
  const pairs = [];
  const unrendered = [];

  for (const pb of ALL_PLAYBOOKS || []) {
    const base = foodPlan(pb.type);
    if (!base) continue;
    const rendered = new Set(base.map((i) => i.id));
    for (const p of (pb.purchases || [])) {
      if (!rendered.has(p.id)) { unrendered.push(`${pb.type}|${p.id}`); continue; }
      for (const field of RUNTIME_CONSUMED_FIELDS) {
        // A field the ownership contract says is engine-owned is EXPECTED to be
        // inert on the purchase - that is the contract working, not failing. The
        // purchase itself is passed so ownership is decided by what this line
        // ACTUALLY carries (`sourcingPrices`) rather than by an id allowlist.
        if (!fieldOwnership(pb.type, `${p.id}.${field}`, p).drivesRuntime) continue;
        if (p[field] === undefined && field !== 'provenance') continue;
        pairs.push({ type: pb.type, id: p.id, field, current: p[field], base: hostVisible(base) });
      }
    }
  }

  test('the sweep actually covers the corpus - a silent zero would pass vacuously', () => {
    // Without this, deleting a playbook or breaking foodPlan would make every
    // assertion below trivially true.
    expect(pairs.length).toBeGreaterThan(1000);
    expect(new Set(pairs.map((x) => x.type)).size).toBeGreaterThan(30);
    expect(new Set(pairs.map((x) => x.field))).toEqual(
      new Set(['unitCostRange', 'qtyPerGuest', 'qtyFlat', 'provenance', 'priceLadder', 'servingGuide',
        'costProvenance']),
    );
  });

  test('EVERY rendered governed field/purchase pair changes the shopping list', () => {
    const dead = [];
    for (const { type, id, field, current, base } of pairs) {
      const after = withGoverned(type, `${id}.${field}`, extremeValue(field, current),
        () => hostVisible(foodPlan(type)));
      if (after === base) dead.push(`${type}|${id}.${field}`);
    }
    if (dead.length) {
      throw new Error(`${violation(dead[0], 'playbookFoodPlan')}${dead.length} dead pair(s):\n  ${dead.slice(0, 40).join('\n  ')}`);
    }
    expect(dead).toEqual([]);
  });

  test('SUPPLY lines are governed, not only food lines (5E.4 regression)', () => {
    // The supplies loop in playbookFoodPlan iterated the AUTHORED purchase while the
    // food loop resolved through governedPurchase. Pinned by id so the two loops
    // cannot drift apart again: this asserts the SUPPLY half specifically.
    const supplies = pairs.filter(({ type, id }) => {
      const list = foodPlan(type) || [];
      const row = list.find((i) => i.id === id);
      return row && row.supply === true;
    });
    expect(supplies.length).toBeGreaterThan(100);
    for (const { type, id, field, current, base } of supplies) {
      const after = withGoverned(type, `${id}.${field}`, extremeValue(field, current),
        () => hostVisible(foodPlan(type)));
      expect(after === base ? `DEAD ${type}|${id}.${field}` : 'moved').toBe('moved');
    }
  });

  test('supply rows carry the same governance metadata food rows do', () => {
    const list = foodPlan('Crab Feast') || [];
    const supply = list.find((i) => i.supply === true);
    const food = list.find((i) => i.group === 'Food');
    expect(supply).toBeTruthy();
    expect(food).toBeTruthy();
    // Not cosmetic: a surface must not have to know which loop built a row to answer
    // "where did this number come from".
    for (const k of ['provenance', 'qtyGrounded', 'governedFields']) {
      expect(Object.prototype.hasOwnProperty.call(supply, k)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(food, k)).toBe(true);
    }
  });

  test('reports how much of the corpus this surface cannot reach', () => {
    // Not a failure - a census. If this number grows sharply, lines are being hidden
    // from the shopping list, and governance of them silently stops mattering.
    expect(unrendered.length).toBeLessThan(200);
  });
});

// ── Cross-surface agreement ──────────────────────────────────────────────────
// ── The delegation fallback cannot go stale ──────────────────────────────────
describe('CHANNEL_PRICED_PURCHASES matches the data', () => {
  test('the id fallback equals the set of purchases that actually author sourcingPrices', () => {
    // The publish gate resolves a field path, not a playbook, so it falls back to an
    // id list. An id list is a DECLARATION, and this programme has been burned by
    // declarations agreeing with each other - so it is pinned to the data here and
    // to OUTPUT by the sweep above.
    const actual = new Set();
    for (const pb of ALL_PLAYBOOKS || []) {
      for (const p of (pb.purchases || [])) if (p && p.sourcingPrices) actual.add(p.id);
    }
    expect([...actual].sort()).toEqual([...CHANNEL_PRICED_PURCHASES].sort());
  });

  test('a channel-priced protein refuses a governed unitCostRange at the publish gate', () => {
    expect(fieldOwnership('The Cookout', 'p_ribs.unitCostRange').editable).toBe(false);
    expect(blockedMessage(fieldOwnership('The Cookout', 'p_ribs.unitCostRange')))
      .toMatch(/sourcing-price model/);
    // ...and a line that does NOT author sourcingPrices stays governable.
    expect(fieldOwnership('Crab Feast', 'p_oldbay.unitCostRange').editable).toBe(true);
  });
});

describe('host surfaces cannot disagree about a governed value', () => {
  test('crabPriceLadder tracks the governed ladder, not the authored one', () => {
    // hostv2 renders these as reference prices on the crab sheet while the shopping
    // list prices the same crabs through governedPurchase. When this scanned the
    // authored playbook, a published correction moved one surface and not the other:
    // two host-visible prices for the costliest item, disagreeing.
    const authored = getPlaybook('Crab Feast').purchases.find((p) => p.id === 'p_crabs').priceLadder;
    expect(crabPriceLadder().largeMale.perBushel).toBe(authored.largeMale.perBushel);

    const moved = extremeValue('priceLadder', authored);
    withGoverned('Crab Feast', 'p_crabs.priceLadder', moved, () => {
      expect(crabPriceLadder().largeMale.perBushel).toBe(moved.largeMale.perBushel);
      expect(crabPriceLadder().largeMale.perBushel).not.toBe(authored.largeMale.perBushel);
      // ...and the shopping list agrees with it.
      const row = (foodPlan('Crab Feast') || []).find((i) => i.id === 'p_crabs');
      expect(row.bulkRecommendation.price % moved.largeMale.perBushel).toBe(0);
    });
  });
});
