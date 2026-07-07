// ─── helperResponsibility — HELPER-RESPONSIBILITY-1 ──────────────────────────
//
// A lightweight read layer over the helper assignments the host ALREADY typed —
// "Auntie's potato salad" (foodAdd.owner), a task owner, a run-of-show owner.
// Core truth: ASSIGNED IS NOT HANDLED. Chosen is not bought. If Aunt Lisa is
// bringing dessert, the host's next action is "Confirm with Aunt Lisa", not
// "Buy dessert" — and dessert is not "covered" until it's confirmed, and not
// DONE until it's marked brought.
//
// States per responsibility:
//   assigned  · a name is on it, nothing else is known
//   confirmed · the host recorded a confirm (event.helperConfirmed[itemId])
//   handled   · the thing actually happened (marked brought / task done)
//
// HARD RULES (test-locked):
//   · explicit data only — owner fields the host typed; no inference, no
//     invented helpers, no guessed availability
//   · vendors are NOT helpers — they have their own accountability lifecycle
//   · supplies have no person-assignment field today, so they yield ZERO
//     responsibilities (reported honestly, never faked)
//   · helper names are HOST-PRIVATE — never in vendor briefs or guest drafts
//   · language: "assigned to / bringing / confirm with / marked brought /
//     backup needed"; never "locked / external owner / dependency / resource"
//   · not collaboration software: no helper accounts, invites, notifications
//
// deriveHelperResponsibilities(event) → { helpers, responsibilities }
// helperResponsibilityForItem(event, item) → responsibility | null

import { playbookFoodPlan } from './playbooks';

const HOSTY = /^(host|you|yours|me|myself|self)$/i;
const isHelperName = (v) => {
  const s = String(v || '').trim();
  return !!s && !HOSTY.test(s);
};

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
  const responsibilities = [];

  // 1 · Food — dishes someone is bringing (foodAdd owner, surfaced through the
  // SAME rendered list the Plan tab shows, so every route id is a real row).
  try {
    const plan = playbookFoodPlan(ev);
    const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
    for (const i of (plan && Array.isArray(plan.list) ? plan.list : [])) {
      if (!i || i.skipped || !i.added || !isHelperName(i.owner)) continue;
      const status = statusFor(ev, i.id, got[i.id] === true);
      responsibilities.push({
        helperName: String(i.owner).trim(),
        itemType: 'food', itemId: i.id, label: i.short || i.item,
        status,
        hostBackupNeeded: status === 'assigned',
        hostNextAction: nextActionFor(status, String(i.owner).trim(), 'food'),
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
    responsibilities.push({
      helperName: String(t.owner).trim(),
      itemType: 'task', itemId: t.id, label: t.task,
      status,
      hostBackupNeeded: status === 'assigned',
      hostNextAction: nextActionFor(status, String(t.owner).trim(), 'task'),
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
    responsibilities.push({
      helperName: String(r.owner).trim(),
      itemType: 'setup', itemId: r.id, label: r.segment,
      status,
      hostBackupNeeded: status === 'assigned',
      hostNextAction: nextActionFor(status, String(r.owner).trim(), 'setup'),
      route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      anchor: 'ros-now',
      source: 'ros.owner',
    });
  }

  // Helpers — deduped by name (case-insensitive), roles = the item types they hold.
  const byName = new Map();
  for (const r of responsibilities) {
    const key = r.helperName.toLowerCase();
    if (!byName.has(key)) byName.set(key, { id: `helper-${key.replace(/[^a-z0-9]+/g, '-')}`, name: r.helperName, roles: new Set(), source: r.source });
    byName.get(key).roles.add(r.itemType);
  }
  const helpers = [...byName.values()].map(h => ({ id: h.id, name: h.name, role: [...h.roles].join(' · '), source: h.source }));

  return {
    helpers,
    responsibilities: responsibilities.map(r => ({ ...r, helperId: `helper-${r.helperName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` })),
  };
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
