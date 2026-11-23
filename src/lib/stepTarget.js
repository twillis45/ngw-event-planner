// ─── A STEP SAYS WHERE ITS WORK IS DONE (six root causes, cause 1) ───────────
//
// Owner, 11/23/2026 (Thanksgiving walkthrough P0-2, P1-2): the editor and the
// button a step got were chosen by WORDS IN ITS TITLE. "Invite everyone with
// the date, the serve time, and the dietary and overnight ask" opened the
// allergy counter because it contains "dietary", and its only way out was a
// "Mark done" that recorded the invite as sent. "Order the turkey" re-asked who
// is cooking because every step routed to the food plan got the food-approach
// editor. 1,583 step variants ran through ~90 keyword rules.
//
// Now every step DECLARES its target (`target` on the playbook step, on the
// engine's own steps, and on the derived rows), and this file is the only
// place that turns a target into a button, a route and an in-place editor.
// Nothing here reads a step's words. A row with no declared target (a step the
// host wrote herself) is an honest check-off with no button.
//
// The targets were derived ONCE from the retired router (the generator ran
// over every step of every playbook, every label variant, both guest modes)
// and committed as data; where the router disagreed with itself or with the
// step's act, the step was corrected by hand (dest_t_info, t_invite on four
// playbooks, the two dietary-collection steps, fa-bringers, dest_t_access).
// Guard: src/lib/__tests__/everyStepDeclaresItsTarget.test.js.

import { getPlaybook, ALL_PLAYBOOKS, DESTINATION_TASKS, DERIVED_STEP_TARGETS, DERIVED_STEP_FACTS, resolveAnsweredCopy, stepWithoutCaterer } from './playbooks';
import { cookTasksFor, cookRisksFor } from './playbooks/cookLever';
import { DINNER_OWN_STEPS } from './tripMeals';
import { isVendorBooked } from './workstreams';
import { venueFor } from './venueFor';
import { showsReplyTracking } from './guestMode';

// The row-level vendor rule: the first vendor row still needing the host.
export const firstUndoneVendorRoute = (event) => {
  const vs = ((event && event.vendors) || []).filter((v) => v && String(v.name || '').trim());
  const undone = vs.find((v) => !isVendorBooked(v)
    || (Number(v.depositAmt) > 0 && !v.depositPaid) || v.coiStatus === 'required');
  const target = undone || vs[0];
  return target ? { tab: 'Vendors', vendorId: target.id } : { tab: 'Vendors', focusField: 'vendor-add' };
};
// The baker's and the florist's rows, by the vendor's own category (a fact on
// the vendor record, not the step's words).
const DELIVERY_KINDS = /\b(?:cakes?|bak\w*|pastr\w*|flor\w*|flowers?)\b/i;
const deliveryVendorRoute = (event) => firstUndoneVendorRoute({
  vendors: ((event && event.vendors) || []).filter((v) => v && DELIVERY_KINDS.test(`${v.category || ''} ${v.name || ''}`)),
});

// ── THE VOCABULARY ────────────────────────────────────────────────────────────
// key → { label, route (object or (event) → object), editor (the hero's in-place
// editor kind, or null), href?(event) }. Every route is resolver vocabulary.
const DAY = { tab: 'Event Day Schedule' };
const FOOD = { tab: 'Planning', focusField: 'food-plan' };
const SPACE = { tab: 'Event Details', focusField: 'space' };
export const STEP_TARGETS = Object.freeze({
  none: null,
  day: { label: 'See the day plan', route: DAY },
  'build-day': { label: 'Build the day', route: DAY },
  'open-day': { label: 'Open the day', route: DAY },
  guests: { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' }, editor: 'guests' },
  'guest-list': { label: 'Open your guest list', route: { tab: 'Guests' } },
  // The spread and the list open the food plan. Neither is the food-APPROACH
  // call ("who's cooking?"), so neither gets that editor (P1-2).
  spread: { label: 'Map the spread', route: FOOD },
  list: { label: 'Open the list', route: FOOD },
  bringing: { label: 'Name who brings each dish', route: { tab: 'Planning', focusField: 'bringing' } },
  diet: { label: 'Open the allergy counts', route: { tab: 'Planning', focusField: 'fp-diet' }, editor: 'diet' },
  vendors: { label: 'Line them up', route: firstUndoneVendorRoute },
  'vendor-docs': { label: 'Open the paperwork', route: (e) => ({ ...firstUndoneVendorRoute(e), vendorSection: 'documents' }) },
  'vendor-deliveries': { label: 'Check the delivery times', route: deliveryVendorRoute },
  'vendors-tab': { label: 'Open your vendors', route: { tab: 'Vendors' } },
  parking: { label: 'Open the parking note', route: { focusField: 'parking-notes' } },
  rides: { label: 'Open rides', route: { focusField: 'ground' } },
  stay: { label: 'Open the stay', route: { focusField: 'lodging' } },
  cvb: {
    label: 'Find the visitors bureau',
    href: (e) => {
      const vf = venueFor(e || {});
      const q = [vf.city, vf.state, 'convention visitors bureau'].filter(Boolean).join(' ');
      return 'https://www.google.com/search?q=' + encodeURIComponent(q);
    },
  },
  arrivals: { label: 'Open arrivals', route: { focusField: 'air' } },
  airports: { label: 'Open the airports', route: { focusField: 'air' } },
  travel: { label: 'Open travel & stays', route: { tab: 'Travel' } },
  'where-staying': { label: 'Open where everyone stays', route: { tab: 'Travel' } },
  'your-days': { label: 'Open Your days', route: { focusField: 'your-days' } },
  dinner: { label: 'Open the dinner', route: { focusField: 'dinner' } },
  venue: { label: 'Open Venue', route: { tab: 'Event Details', focusField: 'event-venue' }, editor: 'venue' },
  details: { label: 'Open the details', route: { tab: 'Event Details' } },
  invite: { label: 'Open the invite', route: { focusField: 'guests-invites' } },
  'share-invite': { label: 'Open share & invite', route: { focusField: 'guests-invites' } },
  updates: { label: 'Open updates to everyone', route: { tab: 'Guests', focusField: 'guests-updates' } },
  money: { label: 'Open your money', route: { tab: 'Budget', focusField: 'hsp-budget' }, editor: 'budget' },
  sponsors: { label: 'Open your sponsors', route: { focusField: 'budget-sponsors' } },
  'sponsor-ask': { label: 'Draft the sponsor ask', route: { focusField: 'draft-sponsor-ask' } },
  'cost-split': { label: 'Split the costs', route: { focusField: 'cost-split' } },
  assign: { label: 'Assign it', route: SPACE },
  space: { label: 'Open the space list', route: SPACE },
  'place-notes': { label: 'Open the place notes', route: SPACE },
  'place-rules': { label: 'Open the place rules', route: { focusField: 'house-rules' } },
  borrowed: { label: 'Open the borrowed list', route: { focusField: 'space-borrowed' } },
  weather: { label: 'Plan for weather', route: { tab: 'Event Details', focusField: 'rain-plan' }, editor: 'rain' },
  nudge: { label: 'Open the nudge', route: { tab: 'Guests', focusField: 'rsvp-nudge' } },
  // The chase opens the nudge where replies are tracked; a headcount-only
  // event is never nudged, so it opens the count (a fact about the event).
  chase: {
    label: (e) => (e && showsReplyTracking(e) ? 'Open the nudge' : 'Open guests'),
    route: (e) => (e && showsReplyTracking(e) ? { tab: 'Guests', focusField: 'rsvp-nudge' } : { tab: 'Guests', focusField: 'guests-entry' }),
  },
  crab: { label: 'Open the crab plan', route: { focusField: 'crab-plan' } },
  gifts: { label: 'Log gifts and cash', route: { focusField: 'after-gifts' } },
  album: { label: 'Add the album link', route: { focusField: 'after-album' } },
  hashtag: { label: 'Pick the hashtag', route: { focusField: 'meaning-hashtag' } },
  'date-options': { label: 'Ask on the invite', route: { focusField: 'date-options' } },
  'set-date': { label: 'Set the date', route: { tab: 'Event Details', focusField: 'event-date' }, editor: 'date' },
  'trip-details': { label: 'Draft the trip details', route: { focusField: 'draft-trip-details' } },
  rooms: { label: 'Plan who sleeps where', route: { focusField: 'lodging-rooms' } },
  reconfirm: { label: 'Reconfirm each booking', route: { focusField: 'reconfirm-sweep' } },
  // Risk targets (a risk's "Plan for this" and the step its mitigation becomes).
  rain: { label: 'Plan for weather', route: { focusField: 'rain-plan' }, editor: 'rain' },
  seating: { label: 'Open seating', route: { tab: 'Seating' } },
  timeline: { label: 'Open the timeline', route: { tab: 'Timeline' } },
  'budget-tab': { label: 'Open your money', route: { tab: 'Budget' } },
  food: { label: 'Open the food plan', route: { tab: 'Planning', focusField: 'food' } },
});

// ── RISKS DECLARE THEIR TARGET TOO (cause 1, remainder) ──────────────────────
// The risk rows' "Plan for this" was a keyword regex over the risk's prose
// (HostShellV2 riskRouteFor). Playbook risks now carry `target` (derived once
// from that regex, committed); the engine's derived risks are typed, and each
// type declares its target here. A mitigation added to the checklist
// (`risk-<id or type>`) is routed by the same declaration.
export const RISK_TYPE_TARGETS = Object.freeze({
  budget: 'budget-tab', 'ceremony-timing': 'timeline', 'compound-confusion': 'none', compression: 'timeline',
  'dress-code-confirmation': 'none', food: 'food', 'guest-count-confirmation': 'guests', guests: 'guests',
  lodging: 'stay', 'official-ceremony': 'timeline', shopping: 'food', timeline: 'timeline',
  vendors: 'vendors-tab', 'venue-selection': 'venue', 'weather-ceremony': 'rain',
});
function declaredRiskTarget(event, key) {
  if (!key) return null;
  if (RISK_TYPE_TARGETS[key]) return RISK_TYPE_TARGETS[key];
  const pb = event ? (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })() : null;
  const r = pb ? [...(pb.risks || []), ...cookRisksFor(pb)].find((x) => x && x.id === key) : null;
  return (r && r.target) || null;
}
/** riskTargetFor(event, risk) → targetFor(...) for a risk row (by id or type). */
export function riskTargetFor(event, risk) {
  if (!risk) return null;
  return targetFor((typeof risk.target === 'string' && risk.target) || declaredRiskTarget(event, risk.id || risk.type), event);
}
// `call:<decisionId>` opens that call on Calls to make. A few calls have their
// own verb; every other is "Make the call".
const CALL_LABEL = { tribute: 'Plan the tribute', slideshow: 'Plan the slideshow', meaning: 'Plan the meaning moment', toast: 'Plan the toasts', vision: 'Pick the style' };

/** True for every key this vocabulary can resolve (the census reads it). */
export function isKnownTarget(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('call:')) return key.length > 5;
  return Object.prototype.hasOwnProperty.call(STEP_TARGETS, key);
}

// ── WHICH DECLARED STEP A ROW IS ──────────────────────────────────────────────
// A stored row is `pbt-<eventId>-<stepId>` (playbookChecklist); the stored
// whitelist (draftTimeline) keeps the id, not the target, so the id is how a
// saved row finds its step again. By id, never by its words.
function stepIdOf(event, rowId) {
  const id = String(rowId || '');
  const pre = event && event.id != null ? `pbt-${event.id}-` : null;
  if (pre && id.startsWith(pre)) return id.slice(pre.length);
  return id || null;
}
function declaredStepTarget(event, stepId) {
  if (!stepId) return null;
  const pb = event ? (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })() : null;
  if (!pb) return null;
  const own = [...(pb.tasks || []), ...cookTasksFor(pb), ...DESTINATION_TASKS].find((t) => t && t.id === stepId);
  if (own) return own.target || null;
  if (DERIVED_STEP_TARGETS[stepId]) return DERIVED_STEP_TARGETS[stepId];
  if (stepId.startsWith('tm-out-')) return DERIVED_STEP_TARGETS['tm-out'];
  const cel = DINNER_OWN_STEPS.find((s) => `cel-${s.key}` === stepId);
  return cel ? cel.target : null;
}

/**
 * stepTargetKey(event, row) → the row's declared target key, or null.
 * `row` is a checklist row ({ id, target?, provenance? }) or a playbook step.
 */
export function stepTargetKey(event, row) {
  if (!row) return null;
  if (typeof row.target === 'string' && row.target) return row.target;
  const pid = row.provenance && row.provenance.taskId;
  const found = declaredStepTarget(event, pid || stepIdOf(event, row.id || row.taskId));
  if (found) return found;
  // A risk's mitigation, added to the checklist as `risk-<id or type>`.
  const rid = String(row.id || row.taskId || '');
  if (rid.startsWith('risk-')) return declaredRiskTarget(event, rid.slice(5));
  // A row carried over from ANOTHER event id (a duplicated or re-keyed plan)
  // still ends in its step id: `pbt-<old id>-<step id>`. Matched by id, the
  // longest step id that ends it.
  const id = String(row.id || row.taskId || '');
  if (!id.startsWith('pbt-') || !event) return null;
  const pb = (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })();
  const ids = pb ? everyDeclaredStep(pb).map((s) => s.id).filter((sid) => id.endsWith('-' + sid)) : [];
  if (!ids.length) return null;
  return declaredStepTarget(event, ids.sort((a, b) => b.length - a.length)[0]);
}

/**
 * targetFor(key, event) → { key, label, route?, href?, editor } or null for
 * 'none' / an unknown key. The one place a target becomes a button.
 */
export function targetFor(key, event) {
  if (!isKnownTarget(key)) return null;
  if (key.startsWith('call:')) {
    const id = key.slice(5);
    return { key, label: CALL_LABEL[id] || 'Make the call', route: { tab: 'Decisions', decisionId: id }, editor: null };
  }
  const t = STEP_TARGETS[key];
  if (!t) return null;
  const label = typeof t.label === 'function' ? t.label(event) : t.label;
  if (t.href) return { key, label, href: t.href(event), editor: null };
  const route = typeof t.route === 'function' ? t.route(event) : { ...t.route };
  return { key, label, route, editor: t.editor || null };
}

// ── WHICH FACTS PROVE A STEP DONE (six root causes, cause 1, part 2) ─────────
// taskSatisfied and timelineStepResolved decided a step was handled from WORDS
// in its text (~40 keyword rules: "set … date", "chase", "pay", "book … DJ",
// "menu"…). Every step now declares `facts`, and this is the only place a row
// finds its declaration: on the row itself (a milestone, a hand-authored
// sample row), else on its step by id, never by its words. A row with no
// declaration (a step the host wrote herself) is proven only by her tick.
// The facts were derived ONCE from the retired rules and committed; a step
// whose words varied with a pick or with no caterer declares the variant the
// same way (`factsByAnswer` beside `copyByAnswer`, `factsWithoutCaterer`
// beside `labelWithoutCaterer`). The vocabulary is lib/taskEngine STEP_FACTS.
function declaredStepOf(event, stepId) {
  if (!stepId) return null;
  const pb = event ? (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })() : null;
  if (!pb) return null;
  const own = [...(pb.tasks || []), ...cookTasksFor(pb), ...DESTINATION_TASKS].find((t) => t && t.id === stepId);
  if (own) return own;
  if (DERIVED_STEP_FACTS[stepId]) return { id: stepId, facts: DERIVED_STEP_FACTS[stepId], derived: true };
  if (stepId.startsWith('tm-out-')) return { id: stepId, facts: DERIVED_STEP_FACTS['tm-out'], derived: true };
  return DINNER_OWN_STEPS.find((d) => `cel-${d.key}` === stepId) || null;
}
/** The declared step a checklist row stands for (by id, never its words), or null. */
export function declaredStepFor(event, row) {
  if (!row) return null;
  const pid = row.provenance && row.provenance.taskId;
  const found = declaredStepOf(event, pid || stepIdOf(event, row.id || row.taskId));
  if (found) return found;
  const id = String(row.id || row.taskId || '');
  if (!id.startsWith('pbt-') || !event) return null;
  const pb = (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })();
  const ids = pb ? everyDeclaredStep(pb).map((st) => st.id).filter((sid) => id.endsWith('-' + sid)) : [];
  return ids.length ? declaredStepOf(event, ids.sort((a, b) => b.length - a.length)[0]) : null;
}
/** stepFactsFor(event, row) → the facts that prove this row done, or null when it declares none. */
export function stepFactsFor(event, row) {
  if (!row) return null;
  if (Array.isArray(row.facts)) return row.facts;
  const st = declaredStepFor(event, row);
  if (!st || !Array.isArray(st.facts)) return null;
  // The builder's own variant rule: without its caterer, a step reads its
  // labelWithoutCaterer and drops its answered copy; its facts do the same.
  if (st.labelWithoutCaterer && stepWithoutCaterer(event, st)) return st.factsWithoutCaterer || st.facts;
  const f = st.factsByAnswer ? resolveAnsweredCopy(st.facts, st.factsByAnswer, event) : st.facts;
  return Array.isArray(f) ? f : st.facts;
}

/** stepTargetFor(event, row) → targetFor(stepTargetKey(event, row), event). */
export function stepTargetFor(event, row) {
  return targetFor(stepTargetKey(event, row), event);
}

/** Every declared step a playbook can put on a checklist (the census walks it). */
export function everyDeclaredStep(pb) {
  return [
    ...(pb.tasks || []),
    ...cookTasksFor(pb),
    ...DESTINATION_TASKS,
    ...Object.keys(DERIVED_STEP_TARGETS).map((id) => ({ id, target: DERIVED_STEP_TARGETS[id], derived: true })),
    ...DINNER_OWN_STEPS.map((s) => ({ id: `cel-${s.key}`, target: s.target, derived: true })),
  ];
}
export { ALL_PLAYBOOKS };

// ── "MARK DONE" ON A SEND SAYS NOTHING WENT OUT (owner, 11/23/2026) ──────────
// A step whose work is a message to people (the invite, an update, the nudge,
// a drafted ask) is marked done by a tick; the tick sends nothing and records
// no send, and its receipt says so in as many words.
const SEND_TARGETS = new Set(['invite', 'share-invite', 'updates', 'nudge', 'chase', 'sponsor-ask', 'trip-details']);
export function stepIsASend(event, row) {
  return SEND_TARGETS.has(stepTargetKey(event, row));
}
