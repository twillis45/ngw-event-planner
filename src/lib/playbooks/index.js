// Event OS — Playbook Reader (Sprint 55C-1).
//
// A minimal, deterministic reader over playbook data. It does NOT rank,
// persist, or own state — it is a PURE producer of dated, quantity-resolved
// operational task CANDIDATES that the EXISTING next-action cascade
// (selectEventNextAction / selectStudioCommand) ranks and renders. No new
// engine, no new runtime, no new UI.
//
// ESM-only (per the prod-bundle lesson — no CJS module.exports in src/).

import dinnerParty from './data/dinnerParty';

// ── Registry ────────────────────────────────────────────────────────────────
// Normalized (case-insensitive) event-type → playbook. One entry for now: we
// prove the wiring on Dinner Party before authoring the other Phase-1 books.
const norm = (s) => String(s || '').trim().toLowerCase();
const REGISTRY = { [norm(dinnerParty.type)]: dinnerParty };

export function getPlaybook(eventType) {
  return REGISTRY[norm(eventType)] || null;
}

// ── Window model ──────────────────────────────────────────────────────────────
// A purchase's buyAt token ("T-3d" | "T-1d" | "T0") is an offset in days from
// the event date. dueInDays (from `asOf`) = daysToEvent + offset. A purchase is
// ELIGIBLE only inside its shopping window: due today, or up to WINDOW_LEAD days
// ahead. Past its buy date it is dropped (assume handled — the OS doesn't nag).
const WINDOW_LEAD = 2;

function buyOffsetDays(token) {
  const m = /^T(-?\d+)d?$/.exec(String(token || '').trim());
  return m ? parseInt(m[1], 10) : null; // T0 → 0, T-1d → -1, T-3d → -3
}

function guestCountOf(event, playbook) {
  const explicit = Number(event.guestCount) || Number(event.guestEstimate) || 0;
  if (explicit > 0) return explicit;
  const added = (event.guests || []).length;
  if (added > 0) return added;
  return (playbook.meta && playbook.meta.typicalGuests && playbook.meta.typicalGuests.default) || 8;
}

// Buy quantity resolved from guest count. Supports per-guest, per-N, and flat.
function resolveQuantity(p, guests) {
  if (typeof p.qtyPerGuest === 'number') {
    return Math.round(p.qtyPerGuest * guests * 10) / 10; // 1.5 × 12 = 18 (integers stay clean)
  }
  if (typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number') {
    return Math.ceil(guests / p.qtyPer) * p.qtyFlat;
  }
  if (typeof p.qtyFlat === 'number') return p.qtyFlat;
  return null;
}

// "Main protein (e.g. ...)" → "Main protein"; "Ice" → "Ice".
function shortItem(item) {
  return String(item || '').split(/[(—-]/)[0].trim();
}

// "lb" → "lbs"; "bottle (½ bottle/guest rule)" → "bottles"; pluralized by qty.
function shortUnit(unit, qty) {
  let u = String(unit || '').split('(')[0].trim();
  if (!u) return '';
  if (qty !== 1 && !/s$/.test(u)) u += 's';
  return u;
}

function dueLabel(dueInDays) {
  if (dueInDays <= 0) return 'today';
  if (dueInDays === 1) return 'tomorrow';
  return `in ${dueInDays} days`;
}

// daysToEvent mirroring CommandCenter.daysFrom, but with an injectable `asOf`
// so the reader stays pure + testable.
function daysToEvent(eventDate, asOf) {
  if (!eventDate) return null;
  // Parse asOf as a LOCAL date (mirror CommandCenter.daysFrom). A bare
  // 'YYYY-MM-DD' must get 'T00:00:00' so it is local, not UTC — otherwise it
  // shifts a day in negative-offset timezones.
  let base;
  if (asOf) {
    base = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? new Date(asOf + 'T00:00:00') : new Date(asOf);
  } else {
    base = new Date();
  }
  base.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(eventDate + 'T00:00:00') - base) / 86400000);
}

// ── Reader ────────────────────────────────────────────────────────────────────
// playbookTasks(event, asOf) → OperationalTask[]  (pure; soonest-due first).
export function playbookTasks(event, asOf) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return [];
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return [];

  const guests = guestCountOf(event, playbook);
  const tasks = [];

  for (const p of playbook.purchases) {
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    // Window gate — eligible only today..WINDOW_LEAD ahead; never past-due.
    if (dueInDays < 0 || dueInDays > WINDOW_LEAD) continue;

    const qty = resolveQuantity(p, guests);
    const name = shortItem(p.item);
    const unit = shortUnit(p.unit, qty);
    const qtyClause = qty === null ? '' : ` — ${qty}${unit ? ' ' + unit : ''}`;
    const rel = dueLabel(dueInDays);

    tasks.push({
      id: `pb-${event.id}-${p.id}`,
      kind: 'operational',
      category: 'operational',
      phase: p.category || 'shopping',
      item: name,
      // e.g. "Buy ice — 18 lbs today"
      title: `Buy ${name.toLowerCase()}${qtyClause} ${rel}`,
      quantity: qty,
      unit,
      dueInDays,
      dueLabel: rel,
      essential: !!p.essential,
      level: p.essential && dueInDays <= 1 ? 'attention' : 'neutral',
      consequence:
        p.note ||
        `${p.qtyPerGuest != null ? `~${p.qtyPerGuest}/guest × ${guests} guests. ` : ''}A small buy now keeps the day-of calm.`,
      primaryCta: 'Open checklist',
      primaryRoute: { eventId: event.id, tab: 'Planning Tasks' },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, buyAt: p.buyAt },
    });
  }

  // Rank: soonest-due first, then essential. The cascade takes [0]; this is the
  // reader's only ordering — it never competes with the runtime's priority math.
  tasks.sort(
    (a, b) =>
      a.dueInDays - b.dueInDays || Number(b.essential) - Number(a.essential),
  );
  return tasks;
}

// The single top operational candidate for an event (or null).
export function topPlaybookTask(event, asOf) {
  const list = playbookTasks(event, asOf);
  return list.length ? list[0] : null;
}
