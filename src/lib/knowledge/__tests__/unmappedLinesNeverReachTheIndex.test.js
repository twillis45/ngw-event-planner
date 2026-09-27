// ─── THE TWO REGIONAL MODULES DO NOT DISAGREE — THEY NEVER MEET ────────────
//
// WITHDRAWN FINDING, kept as a gate. The 2026-09-27 ice board recorded a
// finding that `geoCostIndex.geoAdjust` and `playbooks.factorFor` hold two
// different policies for an item with no BLS series — one refusing to scale,
// the other imputing the basket mean — with nothing saying which is
// authoritative. The Next Maintainer seat called it unresolvable at 2am.
//
// IT IS NOT TRUE. It came from a probe calling `geoAdjust('ice', 'MD')`
// directly with a string that is not a key in the map, and reading its
// "no BLS regional series" answer as a policy about ice. Production never
// makes that call. `geoItemForPurchase` returns null for ice — the allowlist
// is eleven entries of beer, wine and bread — so `priceLayers` skips its
// applyGeo branch entirely and only `factorFor` ever prices the line.
//
// The modules operate on DISJOINT INPUTS by construction. That is the real
// invariant, it was never written down, and this file writes it down: the
// index is asked only about items the curated map vouches for.
import { geoItemForPurchase } from '../geoItemMap';
import { ALL_PLAYBOOKS } from '../../playbooks';
import { geoAdjust } from '../geoCostIndex';

describe('the regional index is only ever asked about mapped items', () => {
  const everyPurchase = ALL_PLAYBOOKS
    .flatMap((p) => (Array.isArray(p && p.purchases) ? p.purchases : []))
    .filter((p) => p && p.id && p.item);

  test('PREMISE: there really are purchases to check, and most are unmapped', () => {
    // Without this the invariant below could hold over an empty corpus.
    expect(everyPurchase.length).toBeGreaterThan(200);
    const mapped = everyPurchase.filter((p) => geoItemForPurchase(p));
    expect(mapped.length).toBeGreaterThan(0);
    expect(mapped.length).toBeLessThan(everyPurchase.length / 2);
  });

  test('every key the map DOES yield is one the index answers without disclaiming', () => {
    // This is the invariant that makes the two modules consistent. If a key
    // ever reaches the index that it has no series for, the index says
    // "national band" while the plan engine says "basket mean", and THEN the
    // withdrawn finding becomes real.
    const unanswerable = [];
    for (const p of everyPurchase) {
      const key = geoItemForPurchase(p);
      if (!key) continue;
      const g = geoAdjust(key, 'MD');
      if (g && g.national) unanswerable.push({ id: p.id, item: p.item, key });
    }
    expect(unanswerable).toEqual([]);
  });

  test('ICE is unmapped, which is why it takes the basket mean and says so', () => {
    // The concrete line the board sat on, pinned so the story stays legible.
    const ice = everyPurchase.find((p) => /^ice$/i.test(String(p.item || '').trim()));
    // (jest's expect takes no message argument — Playwright's does.)
    expect(ice).toBeTruthy();
    expect(geoItemForPurchase(ice)).toBeNull();
  });
});
