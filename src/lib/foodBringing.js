// ─── WHO BRINGS EACH DISH: THE ONE RECORD, ITS MIGRATION, AND WHERE THE SPREAD OPENS ──
//
// Owner, live iPad, 11/21/2026, on a Thanksgiving where friends bring sides:
// "Items need place to assign helpers and linked to other places that reference
// the same in app. Bringing doesn't update when the other screens update the
// assigned bringing information. Single sources not duplicative sources."
//
// Measured before this file: the same dish read as "skipped — tap to restore"
// on Shop (a pre-#220 skip standing in for "a friend brings it"), as a "Your
// friends" chip beside "skip it" on Shop, and as "friends are bringing" on
// Bringing. A name went to `foodOwner` from Bringing, to `foodAdd[].owner` from
// the add-a-dish form, and the helper engine read only the second.
//
// THE RECORD is `event.foodOwner[dishId]` (see foodOwnerMap in ./playbooks):
// a name, `false` ("I'll make it myself"), or absent (the playbook default).
// `foodSkip` stays its own fact: the dish is not being served.
import { playbookFoodPlan, openFoodChoices, hostBuysLine, foodOwnerMap, isNamedBringer } from './playbooks';

/** The dishes someone else is carrying and that are being served. A part of a
 *  dish (`partOf`: the mash's butter) goes with its dish and is not asked for
 *  on its own (owner ruling 11/23/2026, split shopping lines). */
export function bringingRows(plan) {
  return ((plan && plan.list) || []).filter((i) => i && i.broughtByCommunity && !i.skipped && !i.partOf);
}

/** "N of M named" for the Bringing bar and the Plan row. */
export function bringingTally(plan) {
  const rows = bringingRows(plan);
  return { named: rows.filter((r) => r.broughtBy).length, total: rows.length };
}

// ── THE MIGRATION (on load; idempotent; returns a patch or null) ─────────────
//  1. A host-added dish's `owner` moves into `foodOwner` (the add-a-dish form
//     writes there now). A record already in foodOwner wins.
//  2. A skip on a dish the playbook already has guests bringing meant
//     "brought": before #220 a skip was the only way to take a friend's side
//     off the host's list. It is removed, so the dish reads as brought.
//     A skip with an explicit foodOwner entry is the host's own later choice
//     ("Not serving it" writes `false` beside the skip) and is left alone.
// No version flag is needed: after one pass neither condition holds, and
// every write made since this shipped leaves a foodOwner entry beside a skip.
export function migrateBringing(event) {
  if (!event || typeof event !== 'object') return null;
  const owner0 = foodOwnerMap(event);
  const owner = { ...owner0 };
  const patch = {};

  const adds = Array.isArray(event.foodAdd) ? event.foodAdd : null;
  if (adds && adds.some((a) => a && typeof a === 'object' && 'owner' in a)) {
    patch.foodAdd = adds.map((a) => {
      if (!a || typeof a !== 'object' || !('owner' in a)) return a;
      const { owner: name, ...rest } = a;
      if (a.id && !(a.id in owner) && isNamedBringer(name)) owner[a.id] = String(name).trim();
      return rest;
    });
  }

  const skip = (event.foodSkip && typeof event.foodSkip === 'object') ? event.foodSkip : {};
  const candidates = Object.keys(skip).filter((k) => skip[k] && !(k in owner));
  if (candidates.length) {
    let plan = null;
    try { plan = playbookFoodPlan({ ...event, foodSkip: {}, foodOwner: owner }); } catch { plan = null; }
    const byDefault = new Set(((plan && plan.list) || [])
      .filter((i) => i && i.broughtByCommunity && !i.added).map((i) => i.id));
    const meantBrought = candidates.filter((k) => byDefault.has(k));
    if (meantBrought.length) {
      const next = { ...skip };
      for (const k of meantBrought) delete next[k];
      patch.foodSkip = next;
    }
  }

  if (Object.keys(owner).length !== Object.keys(owner0).length) patch.foodOwner = owner;
  return Object.keys(patch).length ? patch : null;
}

// ── WHICH TAB THE SPREAD OPENS ON (owner: "When going from hero to food
// decide when to go to plan vs shopping tab") ─────────────────────────────────
//   Plan      while any menu question is open (openFoodChoices — the list the
//             hero's "N open" counts). The shopping list is built from them.
//   Shop      once the menu is set and anything is left for the host to buy.
//   Bringing  only when nothing is left to buy and a brought dish has nobody
//             named. Naming bringers is a note of what she was told, never a
//             chase (the Bringing sheet's own ruling), so it does not outrank
//             the shop; and no hero asks it, so landing there over a shop
//             would contradict the hero that sent her.
//   Shop      otherwise (all bought, everyone named): "all bought" is the read.
export function foodSheetKind(event, plan) {
  let p = plan;
  if (p === undefined) { try { p = playbookFoodPlan(event); } catch { p = null; } }
  if (!p) return 'food';
  const open = (() => { try { return openFoodChoices(event, p) || []; } catch { return []; } })();
  if (open.length) return 'foodplan';
  const got = (event && event.foodGot && typeof event.foodGot === 'object') ? event.foodGot : {};
  const left = (p.list || []).some((i) => i && !i.skipped && hostBuysLine(i) && !got[i.id]);
  if (left) return 'food';
  if (bringingRows(p).some((r) => !r.broughtBy)) return 'bringing';
  return 'food';
}
