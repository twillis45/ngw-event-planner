// ─── helperResponsibility — HELPER-RESPONSIBILITY-1 ──────────────────────────
//
// A lightweight read layer over the helper assignments the host ALREADY typed —
// "Auntie's potato salad" (foodAdd.owner), a task owner, a run-of-show owner,
// a supply someone's bringing (capacityHelpers). Core truth: ASSIGNED IS NOT
// HANDLED. Chosen is not bought. If Aunt Lisa is bringing dessert, the host's
// next action is "Confirm with Aunt Lisa", not "Buy dessert" — and dessert is
// not "covered" until it's confirmed, and not DONE until it's marked brought.
//
// States per responsibility:
//   assigned  · a name is on it, nothing else is known
//   confirmed · the host recorded a confirm (event.helperConfirmed[itemId])
//   handled   · the thing actually happened (marked brought / task done)
//
// SINGLE SOURCE OF TRUTH (guestId linkage): a typed helper name is resolved
// against event.guests using the SAME name-match rules RSVP merge already
// uses (matchGuestIndexByName, lib/guestMerge.js) — exact, then last+first,
// then first-only (≥4 chars). When it matches, the responsibility carries the
// real guest.id and displays the guest record's CURRENT name (never a second,
// independently-drifting copy) — so "Uncle Ray" typed as both a food owner
// and a capacity helper resolves to the one guest and both roles surface
// together on his guest-list row. When no guest matches (a helper who isn't
// on the list — a neighbor, a non-attending vendor's staff), it falls back to
// the original name-string identity exactly as before. No invented guests.
//
// HARD RULES (test-locked):
//   · explicit data only — owner fields the host typed; no inference, no
//     invented helpers, no guessed availability
//   · vendors are NOT helpers — they have their own accountability lifecycle
//   · helper names are HOST-PRIVATE — never in vendor briefs or guest drafts
//   · language: "assigned to / bringing / confirm with / marked brought /
//     backup needed"; never "locked / external owner / dependency / resource"
//   · not collaboration software: no helper accounts, invites, notifications
//
// deriveHelperResponsibilities(event) → { helpers, responsibilities }
// helperResponsibilityForItem(event, item) → responsibility | null
// guestHelperRoles(event, guestId) → responsibility[] for one guest's row

import { playbookFoodPlan, playbookCapacity } from './playbooks';
import { matchGuestIndexByName } from './guestMerge';

const HOSTY = /^(host|you|yours|me|myself|self)$/i;
const isHelperName = (v) => {
  const s = String(v || '').trim();
  return !!s && !HOSTY.test(s);
};

// Resolves a typed helper name to a real guest, if one matches. Returns
// { guestId, name } using the GUEST RECORD's current name when matched (so
// the display never drifts from a later guest-list edit), or { guestId:
// null, name: typedName } when no guest matches — never invents a guest.
function resolveHelper(name, guests) {
  const typed = String(name || '').trim();
  const ix = matchGuestIndexByName(guests || [], typed);
  if (ix >= 0) {
    const g = guests[ix];
    return { guestId: g.id, name: String(g.name || typed).trim() };
  }
  return { guestId: null, name: typed };
}

const confirmMap = (ev) => (ev && ev.helperConfirmed && typeof ev.helperConfirmed === 'object') ? ev.helperConfirmed : {};

function statusFor(ev, itemId, done) {
  if (done) return 'handled';
  if (confirmMap(ev)[itemId] === true) return 'confirmed';
  return 'assigned';
}

function nextActionFor(status, name, itemType) {
  if (status === 'assigned') return `Confirm with ${name}`;
  if (status === 'confirmed') {
    if (itemType === 'food') return `Mark brought when ${name}’s item lands`;
    if (itemType === 'task') return `Mark it done when ${name} finishes`;
    return null; // setup cues are checked off on the day itself
  }
  return null; // handled — nothing left for the host
}

export function deriveHelperResponsibilities(event) {
  const ev = event || {};
  const guests = Array.isArray(ev.guests) ? ev.guests : [];
  const responsibilities = [];

  // 1 · Food — dishes someone is bringing (foodAdd owner, surfaced through the
  // SAME rendered list the Plan tab shows, so every route id is a real row).
  try {
    const plan = playbookFoodPlan(ev);
    const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
    for (const i of (plan && Array.isArray(plan.list) ? plan.list : [])) {
      if (!i || i.skipped || !i.added || !isHelperName(i.owner)) continue;
      const status = statusFor(ev, i.id, got[i.id] === true);
      const who = resolveHelper(i.owner, guests);
      responsibilities.push({
        helperName: who.name, guestId: who.guestId,
        itemType: 'food', itemId: i.id, label: i.short || i.item,
        status,
        hostBackupNeeded: status === 'assigned',
        hostNextAction: nextActionFor(status, who.name, 'food'),
        route: { tab: 'Planning', focusField: `foodrow-${i.id}` },
        anchor: `foodrow-${i.id}`,
        source: 'foodAdd.owner',
      });
    }
  } catch (e) { /* no plan — honest zero */ }

  // 2 · Tasks — timeline steps with a non-host owner name.
  for (const t of (Array.isArray(ev.timeline) ? ev.timeline : [])) {
    if (!t || !t.task || !isHelperName(t.owner)) continue;
    const status = statusFor(ev, t.id, t.done === true);
    const who = resolveHelper(t.owner, guests);
    responsibilities.push({
      helperName: who.name, guestId: who.guestId,
      itemType: 'task', itemId: t.id, label: t.task,
      status,
      hostBackupNeeded: status === 'assigned',
      hostNextAction: nextActionFor(status, who.name, 'task'),
      route: { tab: 'Planning Tasks', taskId: t.id },
      anchor: null,
      source: 'timeline.owner',
    });
  }

  // 3 · Setup — run-of-show cues owned by a named person (not the host, not a
  // vendor row: vendors have their own confirm lifecycle). r.confirmed is the
  // ROS's own explicit flag.
  for (const r of (Array.isArray(ev.ros) ? ev.ros : [])) {
    if (!r || !r.segment || r.type === 'vendor' || !isHelperName(r.owner)) continue;
    const status = r.confirmed === true ? 'confirmed' : statusFor(ev, r.id, false);
    const who = resolveHelper(r.owner, guests);
    responsibilities.push({
      helperName: who.name, guestId: who.guestId,
      itemType: 'setup', itemId: r.id, label: r.segment,
      status,
      hostBackupNeeded: status === 'assigned',
      hostNextAction: nextActionFor(status, who.name, 'setup'),
      route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      anchor: 'ros-now',
      source: 'ros.owner',
    });
  }

  // 4 · Supplies — capacity/rental lines someone's bringing instead of buying
  // (event.capacityHelpers[key], the "helper brings?" field). Owned/covered
  // lines (capacityOwned) read as handled — the supply already showed up.
  try {
    const cap = playbookCapacity(ev);
    const capHelpers = (ev.capacityHelpers && typeof ev.capacityHelpers === 'object') ? ev.capacityHelpers : {};
    const owned = (ev.capacityOwned && typeof ev.capacityOwned === 'object') ? ev.capacityOwned : {};
    for (const it of (cap && Array.isArray(cap.items) ? cap.items : [])) {
      if (!it || it.skipped || !isHelperName(capHelpers[it.key])) continue;
      const status = statusFor(ev, it.key, owned[it.key] === true);
      const who = resolveHelper(capHelpers[it.key], guests);
      responsibilities.push({
        helperName: who.name, guestId: who.guestId,
        itemType: 'supply', itemId: it.key, label: it.short || it.item,
        status,
        hostBackupNeeded: status === 'assigned',
        hostNextAction: nextActionFor(status, who.name, 'supply'),
        route: { tab: 'Planning', focusField: 'space' },
        anchor: null,
        source: 'capacityHelpers',
      });
    }
  } catch (e) { /* no capacity playbook for this event type — honest zero */ }

  // 5 · Vendor-list entries marked isInformal — a friend or family member
  // added as a "vendor" (the most natural place a host thinks to add day-of
  // help) instead of on a task. isInformal already exempts them from the
  // paid-vendor accountability lifecycle (vendorAccountability/derive.js,
  // vendorCoiRequirement) — a REAL vendor still isn't a helper (its own
  // lifecycle applies), but an informal one has no lifecycle left to have,
  // so it belongs in the same aggregation as any other helper assignment.
  // No natural "handled" signal exists for a vendor row (nothing to mark
  // bought/done), so this ladder stops at assigned/confirmed, same as setup.
  for (const v of (Array.isArray(ev.vendors) ? ev.vendors : [])) {
    if (!v || !v.isInformal || !isHelperName(v.name)) continue;
    const status = statusFor(ev, v.id, false);
    const who = resolveHelper(v.name, guests);
    responsibilities.push({
      helperName: who.name, guestId: who.guestId,
      itemType: 'vendor', itemId: v.id, label: v.category || 'Helping out',
      status,
      hostBackupNeeded: status === 'assigned',
      hostNextAction: nextActionFor(status, who.name, 'vendor'),
      route: { tab: 'Vendors', vendorId: v.id },
      anchor: null,
      source: 'vendors.isInformal',
    });
  }

  // Helpers — deduped by REAL guest id when the name resolved to one (so
  // Uncle Ray's pitmaster task and his protein pickup surface as ONE person,
  // not two); falls back to the name string (case-insensitive) when nobody on
  // the guest list matches. `roles` = the item types they hold.
  const byKey = new Map();
  for (const r of responsibilities) {
    const key = r.guestId ? `g:${r.guestId}` : `n:${r.helperName.toLowerCase()}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: r.guestId || `helper-${r.helperName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        guestId: r.guestId || null,
        name: r.helperName, roles: new Set(), source: r.source,
      });
    }
    byKey.get(key).roles.add(r.itemType);
  }
  const helpers = [...byKey.values()].map(h => ({ id: h.id, guestId: h.guestId, name: h.name, role: [...h.roles].join(' · '), source: h.source }));
  const helperIdOf = (r) => r.guestId || `helper-${r.helperName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return {
    helpers,
    responsibilities: responsibilities.map(r => ({ ...r, helperId: helperIdOf(r) })),
  };
}

// The guest-list row's read: every responsibility resolved to THIS guest's
// id — "Helping with: paper goods, run the grill" — sourced from the exact
// same aggregation the Helpers panel uses, never a second copy of the data.
export function guestHelperRoles(event, guestId) {
  if (!guestId) return [];
  const { responsibilities } = deriveHelperResponsibilities(event);
  return responsibilities.filter(r => r.guestId === guestId);
}

// The per-item read the food rows / recovery plan use. `item` may be a plan
// list item ({id, owner, added}) or a bare id string.
export function helperResponsibilityForItem(event, item) {
  const id = typeof item === 'string' ? item : (item && item.id);
  if (!id) return null;
  const { responsibilities } = deriveHelperResponsibilities(event);
  return responsibilities.find(r => r.itemId === id) || null;
}

// Copy helpers — ONE place authors the status language so banned vocabulary
// ("locked", "external owner", "dependency", "resource") can't leak in.
export function helperStatusLine(resp) {
  if (!resp) return null;
  if (resp.status === 'handled') return `${resp.helperName} brought it`;
  if (resp.status === 'confirmed') return `Covered by ${resp.helperName}`; // confirmed only — never for bare assignment
  return `Assigned to ${resp.helperName}, but not confirmed`;
}
