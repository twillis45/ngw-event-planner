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
import birthday from './data/birthday';
import babyShower from './data/babyShower';
import backyardBbq from './data/backyardBbq';
import graduation from './data/graduation';
import { resolveCanonicalType } from '../eventTaxonomyAdapter';

// ── Registry ────────────────────────────────────────────────────────────────
// Normalized (case-insensitive) canonical-event-type → playbook. Phase-1 host
// playbooks. backyardBbq is registered under the canonical 'Get-Together' type
// (BBQ / cookout / backyard all resolve there via the taxonomy).
const norm = (s) => String(s || '').trim().toLowerCase();
const ALL_PLAYBOOKS = [dinnerParty, birthday, babyShower, backyardBbq, graduation];
const REGISTRY = {};
for (const pb of ALL_PLAYBOOKS) REGISTRY[norm(pb.type)] = pb;

// Resolve a raw event type to its playbook. Tries an exact (normalized) match
// first, then falls back to the canonical taxonomy so aliases and free-text
// land correctly ("Birthday Party" → Birthday, "Backyard BBQ"/"cookout" →
// Get-Together, "Graduation Party" → Graduation). Unknown types → null so the
// caller's existing fallback path stays intact.
export function getPlaybook(eventType) {
  if (!eventType) return null;
  const direct = REGISTRY[norm(eventType)];
  if (direct) return direct;
  try {
    const canon = resolveCanonicalType(eventType);
    if (canon && REGISTRY[norm(canon)]) return REGISTRY[norm(canon)];
  } catch (_e) { /* taxonomy resolve is best-effort */ }
  return null;
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

// ── Decision-first gating (NGW Product Pattern 001) ───────────────────────────
// Prerequisite decisions outrank dependent actions. A per-guest purchase cannot
// be sized until the final guest count is locked; a food purchase shouldn't be
// bought before dietary/allergies are collected (where the playbook models a
// dietary decision). The gate reads ONLY event state we can actually observe —
// an undetectable decision never hard-blocks (that would hide the action
// forever). This is a filter over authored data, not a new system.

// Exported (Sprint 57J/57K) so presentation readers reuse the SAME resolver —
// no parallel guest-count math. Behavior unchanged.
export function guestCountResolved(event) {
  const n = Number(event.guestCount) || Number(event.guestEstimate) || (event.guests || []).length || 0;
  if (n <= 0) return { resolved: false, pending: 0, reason: 'no-count' };
  const list = event.guests || [];
  // A "final" count means no still-pending RSVPs. Only a real guest list can
  // tell us this; an estimate-only event is treated as resolved (we can't see
  // maybes, and we won't block a host who already gave a number).
  const pending = list.filter((g) => {
    const r = String((g && g.rsvp) || '').trim().toLowerCase();
    return r === 'maybe' || r === '';
  }).length;
  if (list.length > 0 && pending > 0) return { resolved: false, pending, reason: 'pending-rsvps' };
  return { resolved: true, pending: 0 };
}

function dietaryResolved(event) {
  const list = event.guests || [];
  if (list.length === 0) return { resolved: true, reason: 'no-list' }; // nothing to collect from — don't block
  const recorded = list.some((g) => {
    const needs = String((g && g.needs) || '').trim();
    const meal = String((g && g.meal) || '').trim();
    return needs || (meal && !/^(standard|—|-|none)$/i.test(meal));
  });
  return { resolved: recorded };
}

function playbookHasDietaryDecision(playbook) {
  return (playbook.decisions || []).some((d) => d.id === 'dietary' || /dietary|allerg/i.test(d.label || ''));
}

// Which prerequisite decision (if any) blocks this purchase. null = not blocked.
function purchaseGate(p, playbook, gc, di) {
  const perGuest = typeof p.qtyPerGuest === 'number' || typeof p.qtyPer === 'number';
  if (perGuest && !gc.resolved) return 'guestCount';
  if (p.category === 'food' && playbookHasDietaryDecision(playbook) && !di.resolved) return 'dietary';
  return null;
}

// ── Reader ────────────────────────────────────────────────────────────────────
// playbookTasks(event, asOf) → OperationalTask[]  (pure; soonest-due first).
// Purchases blocked by an unresolved prerequisite decision are suppressed.
export function playbookTasks(event, asOf) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return [];
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return [];

  const guests = guestCountOf(event, playbook);
  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  const tasks = [];

  for (const p of playbook.purchases) {
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    // Window gate — eligible only today..WINDOW_LEAD ahead; never past-due.
    if (dueInDays < 0 || dueInDays > WINDOW_LEAD) continue;
    // Decision-first gate — suppress a purchase whose prerequisite decision
    // (final count / dietary) is unresolved. The decision surfaces instead
    // via topPlaybookDecision().
    if (purchaseGate(p, playbook, gc, di)) continue;

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

// The blocking decision that should surface INSTEAD of a purchase (Pattern 001).
// Returns a decision candidate only when a prerequisite decision is unresolved
// AND it actually blocks an in-window purchase — so it never nags about a fuzzy
// count when there is nothing imminent to buy. Priority: a locked guest count is
// the master quantity input, so it surfaces before dietary.
export function topPlaybookDecision(event, asOf) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return null;

  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  if (gc.resolved && di.resolved) return null;

  // Only surface a decision that blocks something in the current buy window.
  let blocksCount = false;
  let blocksDietary = false;
  for (const p of playbook.purchases) {
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    if (dueInDays < 0 || dueInDays > WINDOW_LEAD) continue;
    const g = purchaseGate(p, playbook, gc, di);
    if (g === 'guestCount') blocksCount = true;
    if (g === 'dietary') blocksDietary = true;
  }

  if (blocksCount) {
    const pendingMsg = gc.reason === 'pending-rsvps'
      ? `${gc.pending} guest${gc.pending === 1 ? '' : 's'} still pending — chase the maybes, then buy to the locked count.`
      : 'Add a final guest count so every quantity is sized before you shop.';
    return {
      id: `pb-decision-${event.id}-guestCount`,
      kind: 'decision',
      category: 'decision',
      decision: 'guestCount',
      title: 'Confirm final guest count',
      consequence: `Food, drinks, ice, and rentals all scale from headcount. ${pendingMsg}`,
      level: 'attention',
      primaryCta: gc.reason === 'pending-rsvps' ? 'Chase RSVPs' : 'Set guest count',
      primaryRoute: { eventId: event.id, tab: 'Guests' },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, rule: 'decision-first: count before quantity' },
    };
  }

  if (blocksDietary) {
    return {
      id: `pb-decision-${event.id}-dietary`,
      kind: 'decision',
      category: 'decision',
      decision: 'dietary',
      title: 'Collect dietary restrictions & allergies',
      consequence: 'Lock the menu only after allergies are in — one unflagged allergy is a safety issue, not a courtesy. Collect from your guest list before buying food.',
      level: 'attention',
      primaryCta: 'Collect dietary needs',
      primaryRoute: { eventId: event.id, tab: 'Guests' },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, rule: 'decision-first: dietary before menu/food' },
    };
  }

  return null;
}

// ── Run-of-Show seeding (Sprint 55H-B1) ──────────────────────────────────────
// Surface authored playbook execution intelligence through the EXISTING Event
// Day Schedule (event.ros) — no new engine, surface, or storage (Pattern 006/007).
// Derives a DAY-OF run-of-show from the playbook's authored day-of schedules
// (cooking/preparation/setup/cleanup), anchored on the event's time of day.
// Returns ros-shaped segments tagged { source:'playbook', generated:true,
// playbookType } (Rule 2). Derived at read-time, never persisted, so a playbook
// timing change flows through automatically (Rule 5). Pre-day shopping
// (purchasing, T-1d/T-3d) is intentionally excluded — it's planning, not day-of.
const ROS_ANCHOR_HOUR = { morning: 10, afternoon: 15, evening: 18 };
// kind → segment type; both 'cooking' (Dinner Party) and 'preparation' (others).
const ROS_SCHEDULE_KINDS = [
  { key: 'cooking', segType: 'event' },
  { key: 'preparation', segType: 'event' },
  { key: 'setup', segType: 'prep' },
  { key: 'cleanup', segType: 'prep' },
];

// A day-of `when` token → minutes offset from the anchor. null for pre-day /
// non-clock tokens (T-1d, T-3d, 'during', 'ongoing') so they're skipped.
function rosWhenOffset(when) {
  const w = String(when || '').trim();
  if (/^T-\d+d/i.test(w)) return null;          // pre-day shopping/prep
  if (/during|ongoing/i.test(w)) return null;   // not a point in time
  if (/guests?\s*arrive/i.test(w)) return 0;    // at the anchor
  const m = /^T0\s*([+-])\s*(\d+)(?::(\d+))?\s*h?/i.exec(w);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2], 10);
    const min = m[3] != null ? parseInt(m[3], 10) : 0;
    return sign * (m[3] != null ? h * 60 + min : h * 60);
  }
  if (/^T0\b/i.test(w)) return 0;               // bare T0 → anchor
  return null;
}

const rosPad2 = (n) => String(((n % 24) + 24) % 24).padStart(2, '0');

export function playbookRunOfShow(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !playbook.schedules) return null;
  const tod = String(event.timeOfDay || '').toLowerCase();
  const base = ROS_ANCHOR_HOUR[tod] != null ? ROS_ANCHOR_HOUR[tod] : ROS_ANCHOR_HOUR.afternoon;
  const baseMin = base * 60;

  const rows = [];
  let seq = 0;
  for (const kind of ROS_SCHEDULE_KINDS) {
    const list = Array.isArray(playbook.schedules[kind.key]) ? playbook.schedules[kind.key] : [];
    for (const entry of list) {
      const off = rosWhenOffset(entry.when);
      if (off === null) continue;
      const total = baseMin + off;
      rows.push({
        id: `pb-ros-${event.id}-${kind.key}-${seq++}`,
        time: `${rosPad2(Math.floor(total / 60))}:${String(((total % 60) + 60) % 60).padStart(2, '0')}`,
        _min: total,
        segment: entry.what,
        location: '',
        type: kind.segType,
        owner: 'Host',
        confirmed: false,
        notes: '',
        source: 'playbook',
        generated: true,
        playbookType: playbook.type,
      });
    }
  }
  if (!rows.length) return null;
  // Anchor a "Guests arrive" hero segment unless an entry already lands there.
  if (!rows.some((r) => r._min === baseMin)) {
    rows.push({
      id: `pb-ros-${event.id}-arrival`, time: `${rosPad2(base)}:00`, _min: baseMin,
      segment: 'Guests arrive', location: '', type: 'event', owner: 'Host',
      confirmed: false, notes: '', source: 'playbook', generated: true, playbookType: playbook.type,
    });
  }
  rows.sort((a, b) => a._min - b._min);
  return rows.map(({ _min, ...r }) => r); // drop the sort helper
}

// The run-of-show a surface should show: the user's own schedule if any exists
// (Rule 1: never overwrite manual/imported), otherwise the playbook-derived
// run-of-show (Rule 5). Pure; derived rows are never auto-persisted — once the
// host edits (which seeds + saves them), the saved schedule wins.
export function effectiveRos(event) {
  const stored = event && Array.isArray(event.ros) ? event.ros : [];
  if (stored.length) return stored;
  return playbookRunOfShow(event) || [];
}

// ── Capacity requirements (Sprint 55H-B3A · NGW Pattern 009) ──────────────────
// Pure reader: the physical capacity a host LIKELY NEEDS, scaled from the
// playbook's authored rentalsGap by guest count. REQUIREMENTS ONLY — never a
// deficit. No inventory exists, so the system may state "you'll likely need 12
// chairs" but never "you're missing 4 chairs." No parking / restrooms / power /
// accessibility (out of scope; never inferred). null when no rentalsGap.
function shortRental(item) {
  const map = {
    'Dinner plates': 'plates', 'Wine + water glasses': 'glasses', 'Flatware sets': 'flatware',
    'Dining chairs': 'chairs', 'Serving platters + utensils': 'platters', 'Folding tables': 'tables',
    'Coolers': 'coolers', 'Chairs': 'chairs', 'Canopy / tent': 'canopy', 'Pop-up canopy (10x10)': 'canopy',
    'Serving platters + serving utensils': 'platters', 'Serving platters + drink dispenser': 'platters',
    'Chafing dishes / drink dispensers': 'chafers', 'Dining chairs ': 'chairs',
  };
  if (map[item]) return map[item];
  return String(item || '').split(/[(/—-]/)[0].trim().toLowerCase();
}

export function playbookCapacity(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.rentalsGap) || !playbook.rentalsGap.length) return null;
  const guests = guestCountOf(event, playbook);
  const items = [];
  for (const r of playbook.rentalsGap) {
    let qty = null;
    // Sprint 57H: capture the scaling FACTOR alongside the quantity (additive — the
    // qty math is byte-identical). The factor IS the reasoning behind the number.
    let factor = null, factorType = null;
    if (typeof r.qtyPerGuest === 'number') { qty = Math.ceil(r.qtyPerGuest * guests); factor = r.qtyPerGuest; factorType = 'perGuest'; }
    else if (typeof r.qtyFlat === 'number' && typeof r.qtyPer === 'number') { qty = Math.ceil(guests / r.qtyPer) * r.qtyFlat; factor = r.qtyFlat; factorType = 'perN'; }
    else if (typeof r.qtyFlat === 'number') { qty = r.qtyFlat; factor = r.qtyFlat; factorType = 'flat'; }
    if (qty == null || qty <= 0) continue;
    items.push({ item: r.item, short: shortRental(r.item), qty, note: r.note || '', factor, factorType });
  }
  if (!items.length) return null;
  // compact summary, e.g. "12 chairs · 24 plates · 30 glasses · 12 flatware · 4 platters"
  const summary = items.map((i) => `${i.qty} ${i.short}`).join(' · ');
  // Sprint 57H: the "because" — built ONLY from the real factors above. Per-guest
  // items show "N <item> each"; flat items show their count. No inference.
  const perGuest = items.filter((i) => i.factorType === 'perGuest').map((i) => `${i.factor} ${i.short}`);
  const flat = items.filter((i) => i.factorType !== 'perGuest').map((i) => `${i.qty} ${i.short}`);
  let because = '';
  if (perGuest.length) because = `${guests} guests × ${perGuest.join(' · ')} each`;
  if (flat.length) because += `${because ? ' + ' : ''}${flat.join(' · ')} flat`;
  return { guests, items, summary, because };
}

// ── Infrastructure-check prompts (Sprint 55L · "Event Reality Check") ──────────
// Pure reader: the operational-reality checks a first-time host should confirm
// before event day, DERIVED ONLY from authored playbook signals (risks /
// contingencies / decisions / purchases) + event type. PROMPTS to confirm, never
// deficits — it never infers venue capacity, parking, restroom, or power
// adequacy, and never says "insufficient" (Patterns 009 / POS-P009-R1). Surfaced
// display-only in Planning Health; never enters getEventReadiness (Pattern 010).
export function playbookInfraPrompts(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook) return null;

  // Authored-signal haystack: search the playbook's own words, not inference.
  const hay = JSON.stringify([
    playbook.risks || [], playbook.contingencies || [],
    playbook.decisions || [], playbook.purchases || [],
  ]).toLowerCase();
  const has = (re) => re.test(hay);
  const grill = has(/charcoal|propane/);                 // a real grill (fuel purchased)
  const minors = has(/minor/);                           // authored alcohol-for-minors risk
  const alcohol = has(/alcohol|cocktail|\bbar\b|byob/);
  const kids = grill || event.type === 'Birthday';       // kid party or backyard grill/pool

  const prompts = [];
  if (has(/weather|\brain\b|canopy|\bshade\b|\btent\b/))   // \brain\b so "grain" never triggers it
    prompts.push({ key: 'weather', short: 'rain plan', detail: 'Rain / weather plan — where does everyone go if the weather turns?' });
  prompts.push({ key: 'food', short: 'food safety', detail: 'Food safety — keep cold on ice, hot food held, nothing perishable out more than ~2 hours; cook to safe temps.' });
  prompts.push({ key: 'power', short: 'power & outlets', detail: "Power & outlets — plan where music, lights, and warmers plug in; don't overload one circuit." });
  if ((playbook.schedules && Array.isArray(playbook.schedules.cleanup)) || has(/trash|recycling|bus tub/))
    prompts.push({ key: 'trash', short: 'trash station', detail: 'Trash + recycling station — stage bags and a bus tub before guests arrive.' });
  prompts.push({ key: 'emergency', short: 'emergency basics', detail: 'Emergency basics — a first-aid kit on hand; know the nearest ER.' });
  if (grill)
    prompts.push({ key: 'grill', short: 'grill / fire safety', detail: 'Grill / fire safety — keep an extinguisher within reach and never leave the grill unattended.' });
  if (kids)
    prompts.push({ key: 'child', short: 'child supervision', detail: 'Child safety — assign a watcher for the grill, pool, and outlets.' });
  if (minors)
    prompts.push({ key: 'minors', short: 'alcohol & minors', detail: 'Alcohol & minors — keep an adults-only serving area; no self-serve for under-21s.' });
  else if (alcohol)
    prompts.push({ key: 'alcohol', short: 'alcohol plan', detail: 'Alcohol plan — set a cutoff and a ride-home plan.' });

  if (!prompts.length) return null;
  // Sprint 57H: the "because" — built ONLY from the authored signals that fired
  // above (no inference). Food/power/emergency are always-on basics; the rest are
  // the specific risks the playbook flagged.
  const triggered = [];
  if (has(/weather|\brain\b|canopy|\bshade\b|\btent\b/)) triggered.push('a weather/rain risk');
  if (grill) triggered.push('open flame');
  if (minors || alcohol) triggered.push('alcohol service');
  if (kids) triggered.push('kids present');
  const because = `standard ${String(event.type || 'event').toLowerCase()} safety basics`
    + (triggered.length ? ` + ${triggered.join(' + ')} in your plan` : '');
  return { prompts, summary: prompts.map((p) => p.short).join(' · '), because };
}

// ── Typical-setup budget categories (engine-derived) ──────────────────────────
// Roll the playbook's real purchases up into a handful of budget categories,
// each with a low/high $ range computed from actual quantity × unit-cost — NOT a
// percentage of an abstract total. This feeds the intake "Typical setup — what
// to expect" checklist so it reflects what the event ACTUALLY needs (a Dinner
// Party has no venue line; it has food, drinks, flowers, rentals, supplies,
// cleanup at grounded amounts). Types without a playbook return null so the
// caller falls back to the share-based estimate.
const PURCHASE_CATEGORY_TO_BUDGET = {
  food:      { key: 'pb_food',      label: 'Food & groceries' },
  beverage:  { key: 'pb_beverage',  label: 'Drinks & bar' },
  decor:     { key: 'pb_decor',     label: 'Flowers & decor' },
  rental:    { key: 'pb_rental',    label: 'Linens & rentals' },
  logistics: { key: 'pb_logistics', label: 'Paper goods & supplies' },
  cleanup:   { key: 'pb_cleanup',   label: 'Cleanup supplies' },
};
const PURCHASE_CATEGORY_ORDER = ['food', 'beverage', 'decor', 'rental', 'logistics', 'cleanup'];

export function playbookBudgetCategories(eventType, guestCount) {
  const playbook = getPlaybook(eventType);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  const guests = Math.max(
    1,
    Number(guestCount) || (playbook.meta && playbook.meta.typicalGuests && playbook.meta.typicalGuests.default) || 8,
  );

  const groups = new Map();
  for (const p of playbook.purchases) {
    const map = PURCHASE_CATEGORY_TO_BUDGET[p.category];
    if (!map) continue;
    const qty = resolveQuantity(p, guests);
    const units = qty == null ? 1 : qty;
    const [uLow, uHigh] = Array.isArray(p.unitCostRange) ? p.unitCostRange : [0, 0];
    if (!groups.has(p.category)) {
      groups.set(p.category, { key: map.key, label: map.label, low: 0, high: 0, essential: false });
    }
    const g = groups.get(p.category);
    g.low += units * uLow;
    g.high += units * uHigh;
    if (p.essential) g.essential = true;
  }

  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  return PURCHASE_CATEGORY_ORDER.filter((k) => groups.has(k)).map((k) => {
    const g = groups.get(k);
    return { key: g.key, label: g.label, essential: g.essential, low: round5(g.low), high: round5(g.high) };
  });
}
