// ─── tripMeals — the dinner inside the trip, and the meals around it ──────────
//
// Owner decision 11/21/2026 ("B with A's money"), from rendered prototypes on
// the Santa Fe 80th. A destination multi-day event with a celebration moment
// carries that moment as its own planned dinner; the trip's other meals are
// planned day by day in "Your days".
//
// A LEAF, like destLodgingOptions: itinerary.js reads this, and the guest
// invite reads itinerary.js. No playbook import here — a caller that knows the
// playbook passes it in (`celebrationAppliesWith`).
//
// ONE SOURCE FOR WHICH NIGHT. `event.celebration.night` (YYYY-MM-DD) is the
// host's pick. Until it is picked the suggestion is the trip's second day,
// because the arrival-day pacing advice (playbooks/index.js, dest_p_arrival)
// says nothing important should happen the night people land. "Your days", the
// invite, the board card and the dinner sheet all read `celebrationNight`.
//
// THE DATES ARE READ, NEVER WRITTEN. The trip's span comes from event.date and
// the `spanNights` accessor; this module stores nothing about the range.
//
// DATA (all host-owned, at the event level):
//   event.celebration = { night?: 'YYYY-MM-DD', place?: string }
//     place — the KIND of place she said ("adobe courtyard"), kept from the
//             creation sentence. Not a booked venue; the Venue sheet owns that.
//   event.tripMeals = { plan?: 'own'|'dinners'|'house',
//                       meals?: { 'YYYY-MM-DD:breakfast': 'house'|'out'|'own' },
//                       payer?: 'each'|'host'|'split' }
//     meals holds only the host's own per-meal taps; everything else derives
//     from the starting point, so changing the plan never fights a stale copy.
//   The kitchen is NOT stored here: it is the one "How are guests staying?"
//   answer (foodChoices.dest_lodging), read through kitchenFromLodgingPick.
import { spanNights } from './dates';
import { kitchenFromLodgingPick } from './destLodgingOptions';
import { normalizeCostSharingMode } from './costSharing';

export const MEALS = ['breakfast', 'lunch', 'dinner'];
export const MEAL_SLOT = { breakfast: 'morning', lunch: 'midday', dinner: 'evening' };
export const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
export const MEAL_MODES = [
  { id: 'house', label: 'House' },
  { id: 'out', label: 'Out together' },
  { id: 'own', label: 'Own' },
];

// The three starting points, per the approved prototype.
export const MEAL_PLANS = [
  { id: 'own', label: 'Everyone’s on their own', sub: 'The dinner is the one group meal' },
  { id: 'dinners', label: 'A group dinner each night', sub: 'Lunch on your own · breakfast at the house when there’s a kitchen' },
  { id: 'house', label: 'We cook together at the house', sub: 'Breakfasts and dinners at the rental · needs the rental’s kitchen' },
];

export const MEAL_PAYERS = [
  { id: 'each', label: 'Everyone pays for their own', sub: 'Costs you nothing' },
  { id: 'host', label: 'You cover them', sub: '$25–$75 a head a dinner, before drinks and tip' },
  { id: 'split', label: 'Split evenly at the table', sub: 'Logged in Split the costs' },
];

// THE RULE FOR WHICH TYPES HAVE ONE CELEBRATION (decided by the type's data).
// A playbook's `family` says what kind of event it is. A travel-led type
// (Group Trip, Elopement) IS the trip — there is no single moment inside it —
// and a corporate one (Team Retreat, Conference, Board Meeting, Client Dinner)
// is not a celebration. Every other family names one occasion the trip exists
// for: Birthday, Anniversary, Reunion, Bachelorette, Vow Renewal and the rest.
export const NO_CELEBRATION_FAMILIES = new Set(['travel_led', 'corporate']);

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const startOf = (ev) => (ev && ev.date ? String(ev.date).slice(0, 10) : null);
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n, 12);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const asDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };

/** A destination event that runs across days — the only kind with trip meals. */
export function tripIsMultiDay(event) {
  const ev = event || {};
  return !!ev.isDestination && !!startOf(ev) && ISO.test(startOf(ev)) && spanNights(ev) >= 1;
}

/** Does this event carry a celebration dinner? `pb` is the event's playbook. */
export function celebrationAppliesWith(event, pb) {
  if (!tripIsMultiDay(event)) return false;
  // A trip has no single moment of its own, unless she named one inside it
  // ("New Year's Eve trip", owner 11/22/2026: "trip wins"): then that night is
  // the trip's celebration dinner.
  if (celebrationOccasion(event)) return true;
  return !!(pb && !NO_CELEBRATION_FAMILIES.has(pb.family));
}

/** The holiday she named the trip's night by ("New Year’s Eve"), or null. */
export function celebrationOccasion(event) {
  const c = event && event.celebration && typeof event.celebration === 'object' ? event.celebration : {};
  return String(c.occasion || '').trim() || null;
}

/** The trip's days: { iso, index (1-based), label "Mon, Jun 14", short "Mon 14", role }. */
export function tripDays(event) {
  if (!tripIsMultiDay(event)) return [];
  const start = startOf(event);
  const n = spanNights(event) + 1;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const iso = addDays(start, i);
    const d = asDate(iso);
    out.push({
      iso,
      index: i + 1,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      short: `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`,
      role: i === 0 ? 'arrival' : i === n - 1 ? 'departure' : 'full',
    });
  }
  return out;
}

/**
 * celebrationNight(event) → { picked, iso, index, suggestedIso, suggestedIndex,
 *   effectiveIso, effectiveIndex, label, suggestedLabel }
 * The pick when it falls inside the trip; otherwise the suggestion (day 2).
 */
export function celebrationNight(event) {
  const days = tripDays(event);
  const none = { picked: false, iso: null, index: null, suggestedIso: null, suggestedIndex: null, effectiveIso: null, effectiveIndex: null, label: null, suggestedLabel: null };
  if (!days.length) return none;
  const sug = days[Math.min(1, days.length - 1)];
  const raw = event && event.celebration && typeof event.celebration === 'object' ? String(event.celebration.night || '') : '';
  // The last day is the day everyone leaves; there is no dinner night on it.
  const hit = days.find((d) => d.iso === raw && d.role !== 'departure') || null;
  const eff = hit || sug;
  return {
    picked: !!hit,
    iso: hit ? hit.iso : null,
    index: hit ? hit.index : null,
    suggestedIso: sug.iso,
    suggestedIndex: sug.index,
    effectiveIso: eff.iso,
    effectiveIndex: eff.index,
    label: hit ? hit.label : null,
    suggestedLabel: sug.label,
  };
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Mom’s 80th Birthday" → "Mom’s 80th dinner". */
export function celebrationTitle(event) {
  const ev = event || {};
  const name = String(ev.name || '').trim();
  const type = String(ev.type || '').trim();
  const occasion = celebrationOccasion(ev);
  if (occasion) return `${occasion} dinner`;
  const words = [type, type.replace(/\s+party$/i, '')].filter(Boolean);
  let stem = name;
  for (const w of words) stem = stem.replace(new RegExp(`\\s*\\b${escapeRe(w)}\\s*$`, 'i'), '').trim();
  if (stem && stem !== name) return `${stem} dinner`;
  if (ev.honoree) return `${ev.honoree}’s dinner`;
  return name ? `${name} dinner` : 'The celebration dinner';
}

/** "adobe courtyard" → "an adobe courtyard"; a name ("the Pink Adobe") is kept. */
export const placeWithArticle = (p) => (!p ? null : /^the\s/i.test(p) ? p : `${/^[aeiou]/i.test(p) ? 'an' : 'a'} ${p}`);

/** The kind of place she said, kept from the sentence. */
export function celebrationPlace(event) {
  const c = event && event.celebration && typeof event.celebration === 'object' ? event.celebration : {};
  return String(c.place || '').trim() || null;
}

/**
 * The place she named for the dinner, as she said it: "dinner at an adobe
 * courtyard" → "adobe courtyard". An article "a/an" marks the KIND of place and
 * is dropped; "the Pink Adobe" is a name and is kept whole. Home is not a
 * place to keep here (the venue lane owns home).
 */
export function heardCelebrationPlace(text) {
  const m = String(text || '').match(/\b(?:dinner|supper|banquet)\s+(?:will be\s+|is\s+)?at\s+((?:an?|the)\s+)?([a-z][\w'’&.-]*(?:\s+[a-z][\w'’&.-]*){0,4}?)(?=\s*(?:[,.;!]|$|\s(?:on|for|with|this|next|from|in|by|and|around|about)\b))/i);
  if (!m) return null;
  const article = String(m[1] || '').trim().toLowerCase();
  const words = m[2].trim();
  if (/^(?:home|my|our|his|her|their|night|noon|\d)/i.test(words)) return null;
  return article === 'the' ? `the ${words}` : words;
}

/**
 * What creation writes for the dinner: only what the sentence said. `heard` is
 * the parser's result; its `celebrationNight` is a night she named by its
 * holiday ("New Year's Eve trip … Dec 30 – Jan 2" → Dec 31), stored as her pick.
 */
export function celebrationFieldsToPersist(text, heard = {}) {
  const place = heardCelebrationPlace(text);
  const night = heard && ISO.test(String(heard.celebrationNight || '')) ? heard.celebrationNight : null;
  const occasion = night && heard.celebrationOccasion ? String(heard.celebrationOccasion) : null;
  const c = { ...(place ? { place } : {}), ...(night ? { night } : {}), ...(occasion ? { occasion } : {}) };
  return Object.keys(c).length ? { celebration: c } : {};
}

/** Kitchen, as the host told it through "How are guests staying?". */
export function kitchenTold(event) {
  const picks = event && event.foodChoices && typeof event.foodChoices === 'object' ? event.foodChoices : {};
  return kitchenFromLodgingPick(picks.dest_lodging);
}

/** Who pays for meals out: the host's pick, else "Who pays for what". */
export function mealsOutPayer(event) {
  const tm = event && event.tripMeals && typeof event.tripMeals === 'object' ? event.tripMeals : {};
  if (MEAL_PAYERS.some((p) => p.id === tm.payer)) return tm.payer;
  return normalizeCostSharingMode(event && event.costSharing && event.costSharing.mode) === 'pooled-dues' ? 'host' : 'each';
}

/** The starting point's mode for one meal. Never "house" without a told kitchen. */
export function defaultMealMode(plan, meal, role, kitchen) {
  const house = kitchen === true ? 'house' : 'own';
  if (plan === 'own') return 'own';
  if (plan === 'dinners') {
    if (meal === 'dinner') return role === 'arrival' ? house : 'out';
    if (meal === 'breakfast') return house;
    return 'own';
  }
  if (plan === 'house') {
    if (meal === 'lunch') return 'own';
    return kitchen === false ? 'own' : 'house';
  }
  return null;
}

/**
 * The meal slots of the trip. Arrival day: dinner. Departure day: breakfast.
 * Every day between: all three. With a celebration, the celebration night's
 * dinner IS the celebration and is not one of the meals around it.
 */
export function tripMealSlots(event, { celebration = false } = {}) {
  const days = tripDays(event);
  const night = celebration ? celebrationNight(event).effectiveIso : null;
  const out = [];
  for (const d of days) {
    const meals = d.role === 'arrival' ? ['dinner'] : d.role === 'departure' ? ['breakfast'] : MEALS;
    for (const meal of meals) {
      out.push({ key: `${d.iso}:${meal}`, iso: d.iso, day: d.index, dayLabel: d.label, role: d.role, meal, isCelebration: meal === 'dinner' && d.iso === night });
    }
  }
  return out;
}

/**
 * aroundMeals(event, { celebration }) → { plan, slots, total, planned, counts }
 * slots: the meals around the dinner, each with its effective `mode` (null
 * until a starting point is chosen or the meal is tapped).
 */
export function aroundMeals(event, { celebration = false } = {}) {
  const tm = event && event.tripMeals && typeof event.tripMeals === 'object' ? event.tripMeals : {};
  const plan = MEAL_PLANS.some((p) => p.id === tm.plan) ? tm.plan : null;
  const picks = tm.meals && typeof tm.meals === 'object' ? tm.meals : {};
  const kitchen = kitchenTold(event);
  const slots = tripMealSlots(event, { celebration })
    .filter((s) => !s.isCelebration)
    .map((s) => {
      const tapped = MEAL_MODES.some((m) => m.id === picks[s.key]) ? picks[s.key] : null;
      return { ...s, tapped: !!tapped, mode: tapped || (plan ? defaultMealMode(plan, s.meal, s.role, kitchen) : null) };
    });
  const counts = { house: 0, out: 0, own: 0 };
  for (const s of slots) if (s.mode) counts[s.mode] += 1;
  return { plan, kitchen, slots, total: slots.length, planned: slots.filter((s) => s.mode).length, counts };
}

// The checklist step a meal out together adds (playbookChecklist). It opens
// Your days, where the meal lives (taskRoute).
export const TRIP_MEAL_STEP = /\breserve a table for the group (?:breakfast|lunch|dinner)\b/i;

/** Itinerary rows for the planned shared meals (out together, at the house). */
export function mealItineraryRows(event, { celebration = false, modes = ['out', 'house'] } = {}) {
  return aroundMeals(event, { celebration }).slots
    .filter((s) => s.mode && modes.includes(s.mode))
    .map((s) => ({
      day: s.day,
      slot: MEAL_SLOT[s.meal],
      time: null,
      title: s.mode === 'out' ? `Group ${s.meal} out` : `${MEAL_LABEL[s.meal]} at the house`,
      note: null,
      anchor: false,
      meal: true,
    }));
}
