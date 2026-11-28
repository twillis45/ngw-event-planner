import { guestCountFor } from './guestCountFor';
// ─── GUEST EDITS — built once, saved by both host shells (11/25/2026) ────────
// hostv4's Guests page changes a plan exactly the way hostv2's does, so each
// change is built here and saved by the shell (patchEvent in hostv2,
// patchSavedEvent in hostv4). Each builder is pure: it returns
// { patch, msg } — the fields to save and the confirmation line — or null
// when there is nothing to change. The lines are hostv2's, word for word.
import { MEALS } from './dietOptions';
import { detectCoupleNames } from './guestSplit';
import { repeatedGuestNames, confirmSameGuest, keepSeparateGuest } from './guestMerge';
import { kidsCountAfterRoster } from './kidsCountAfterRoster';
import { confirmedRsvpCovers } from './confirmedCovers';
import { guestToldMap, isTold, recordTold, clearTold } from './guestTold';
import { toCSV, COLUMNS, exportFileSlug } from './csvParsers';

/** About how many are coming. A caterer count, once set, follows the host's number. */
export function countEdit(event, n) {
  const patch = { guestEstimate: n, guestCountSource: 'host', ...(Number((event || {}).guestCount) > 0 ? { guestCount: n } : null) };
  return { patch, msg: 'Planning around ' + n + ' now.' };
}

/** Track who's coming by name ('list') or by headcount ('count'). */
export function modeEdit(mode) {
  return mode === 'count'
    ? { patch: { guestMode: 'count' }, msg: 'By headcount — replies are optional and nobody gets chased.' }
    : { patch: { guestMode: 'list' }, msg: 'By list — replies are tracked and the quiet ones can be nudged.' };
}

/** Pasted text → one name per line, trimmed, blanks dropped. */
export const nameLines = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean);

/**
 * Add names. A line naming a couple ("John and Nicole Smith") becomes two
 * people who stay linked by one coupleId, so counts stay per person and
 * seating can keep them together. Every new guest starts with no reply.
 */
export function addNamesEdit(event, lines, { splitCouples = true, now = Date.now() } = {}) {
  const ls = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const entries = ls.flatMap((line, li) => {
    const hit = splitCouples ? detectCoupleNames(line) : null;
    if (!hit) return [{ name: line, coupleId: null }];
    const cid = 'cp-' + Number(now).toString(36) + '-' + li; // ONE id for the pair
    return hit.names.map((name) => ({ name, coupleId: cid }));
  });
  if (!entries.length) return null;
  const couples = ls.filter((line) => detectCoupleNames(line)).length;
  const names = entries.map((e) => e.name);
  const existing = (event && event.guests) || [];
  const add = entries.map((e, i) => ({ id: 'g-' + now + '-' + i, name: e.name, rsvp: '', ...(e.coupleId ? { coupleId: e.coupleId } : {}) }));
  const splitNote = splitCouples && couples ? ' (' + couples + (couples === 1 ? ' couple' : ' couples') + ' split so everyone gets counted)' : '';
  const twice = repeatedGuestNames(existing, names);
  const twiceNote = twice.length ? ' ' + twice.join(', ') + (twice.length === 1 ? ' is' : ' are') + ' on the list twice — remove one if it’s the same person.' : '';
  return {
    patch: { guests: [...existing, ...add] },
    msg: 'Added ' + names.length + (names.length === 1 ? ' person' : ' people')
      + (existing.length ? ' — ' + (existing.length + add.length) + ' on the list' : '')
      + '. Each shows “No reply” until they answer your invite, or you mark it yourself.' + splitNote + twiceNote,
  };
}

/** One guest's reply ('Yes', 'Maybe', 'No' or '' for no reply), with the confirmed count after it. */
export function rsvpEdit(event, i, value) {
  const gs = ((event && event.guests) || []).map((g, ix) => (ix === i ? { ...g, rsvp: value } : g));
  // COVERS, not rows, counted on the NEW roster: a confirmed row can bring kids.
  const yes = confirmedRsvpCovers({ ...event, guests: gs });
  return {
    patch: { guests: gs },
    msg: ((gs[i] && gs[i].name) || 'Guest') + ' → ' + (value || 'no reply') + ' — ' + yes + ' confirmed.' + (value === 'Maybe' ? ' Maybes stay pending until they land.' : ''),
  };
}

/** Take one guest off the list; the kids count follows the roster. */
export function removeGuestEdit(event, i) {
  const all = (event && event.guests) || [];
  const g = all[i];
  const gs = all.filter((_, ix) => ix !== i);
  return { patch: { guests: gs, kidsCount: kidsCountAfterRoster(event, gs) }, msg: ((g && g.name) || 'Guest') + ' removed from the list.' };
}

/** Can guests bring someone? 'plus_one_ok', 'no_plus_ones' or null (not set). */
export function plusOneEdit(v) {
  return {
    patch: { plusOnePolicy: v },
    msg: v === 'plus_one_ok' ? 'Plus-ones welcome — the invite says so, and the RSVP page asks who they’re bringing.'
      : v === 'no_plus_ones' ? 'Named guests only — the RSVP page won’t offer a plus-one.'
        : 'Plus-ones not set — the invite stays quiet on them.',
  };
}

/** Are kids welcome? 'kids_welcome', 'adults_only' or null (not set). */
/** How many of a headcount plan's guests are kids (kidsCount), never above the count. */
export function kidsCountEdit(event, n) {
  const of = Math.max(0, Number(guestCountFor(event).count) || 0);
  const k = Math.max(0, Math.round(Number(n) || 0));
  const kids = of ? Math.min(of, k) : k;
  return {
    patch: { kidsCount: kids },
    msg: kids ? kids + ' of your ' + of + ' are kids. The food plan sizes them lighter.' : 'No kids. The food plan sizes everyone as adults.',
  };
}

export function kidsEdit(v) {
  return {
    patch: { kidsPolicy: v },
    msg: v === 'kids_welcome' ? 'Kids welcome — the invite says so.'
      : v === 'adults_only' ? 'Adults-only — the RSVP page won’t ask about kids.'
        : 'Kids not set — the invite stays quiet on them.',
  };
}

/** The reply-by date the host committed to (YYYY-MM-DD). */
export function replyByEdit(iso) {
  return { patch: { rsvpDeadline: iso }, msg: 'Reply-by date set — your invite and the nudges read it.' };
}

/** Take the reply-by date off (it had passed, or the party is too close for one). */
export function clearReplyByEdit() {
  return { patch: { rsvpDeadline: null }, msg: 'Reply-by date removed.' };
}

/**
 * Why a picked reply-by date can't be used, or null when it can. A reply-by
 * date must still be ahead (after today) and before the party. `today` is a
 * local YYYY-MM-DD; ISO dates compare as strings.
 */
export function replyByProblem(event, iso, today) {
  const t = today || (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  if (!iso || iso <= t) return 'That date has already passed. Pick one after today.';
  const party = String((event && event.date) || '').slice(0, 10);
  if (party && iso >= party) return 'Replies need to be in before the party. Pick an earlier date.';
  return null;
}

/** Ask yeses for a mailing address (for thank-yous). */
export function addressesEdit(v) {
  return { patch: { collectAddresses: v }, msg: v ? 'Yeses now get an optional mailing-address question, for thank-yous.' : 'Address question removed from the RSVP page.' };
}

/** The gift note: null (none), 'no_gifts', 'registry', or a kept older mode. Its detail stays when the mode does. */
export function giftEdit(event, v) {
  const gw = (event && event.giftWish && typeof event.giftWish === 'object') ? event.giftWish : {};
  return {
    patch: { giftWish: v ? { mode: v, detail: v === gw.mode ? (gw.detail || '') : '' } : null },
    msg: v === 'no_gifts' ? '“Your presence is the gift” goes on the invite.'
      : v === 'registry' ? 'Registry noted — paste the link below so guests can find it.'
        : v ? 'Gift note kept.' : 'No gift note on the invite.',
  };
}

/** The gift note's detail (the registry link, the cause): saved as she types, no line. */
export function giftDetailEdit(event, detail) {
  const gw = (event && event.giftWish && typeof event.giftWish === 'object') ? event.giftWish : {};
  return { patch: { giftWish: { mode: gw.mode, detail } }, msg: null };
}

/** Lock the count: at the confirmed yeses ('yes') or at the number planned around ('planned'). */
export function lockCountEdit(n, why) {
  return {
    patch: { guestCount: n, guestMode: 'count' },
    msg: why === 'yes' ? 'Count set at ' + n + ' — your confirmed yeses. Food and seats now size to it.' : 'Count set at ' + n + ' — the number you planned around.',
  };
}

/** Reopen a locked count. */
export function reopenCountEdit() {
  return { patch: { guestCount: '' }, msg: 'Count reopened — settle it when the maybes answer.' };
}

/** The meal choices a guest (or their +1) can have; '—' is unanswered. */
// Every meal a guest can pick (lib/dietOptions MEALS), plus 'Gluten-Free', which
// older plans, CSV imports and the seating tally still hold as a meal.
export const MEAL_CHOICES = ['—', ...MEALS, 'Gluten-Free'];

/**
 * One field (or several) on one guest. The kids count is the engine's portion
 * knob (kids eat lighter), so it follows the roster on every write.
 */
export function guestFieldEdit(event, i, fields, msg) {
  const gs = ((event && event.guests) || []).map((g, ix) => (ix === i ? { ...g, ...fields } : g));
  return { patch: { guests: gs, kidsCount: kidsCountAfterRoster(event, gs) }, msg };
}

/**
 * Turn one item of a guest's list on or off: 'diets' (lib/dietOptions
 * DIET_RULES) or 'allergens' (ALLERGENS), the fields the guest's RSVP saves.
 */
export function listToggleEdit(event, i, field, item, who) {
  const g = ((event && event.guests) || [])[i] || {};
  const cur = Array.isArray(g[field]) ? g[field] : [];
  const on = !cur.includes(item);
  const next = on ? [...cur, item] : cur.filter((x) => x !== item);
  const name = who || 'Guest';
  const what = field === 'allergens' ? item + ' allergy' : item;
  return guestFieldEdit(event, i, { [field]: next }, on ? name + ': ' + what + ' noted.' : name + ': ' + what + ' removed.');
}

/** A meal for the guest ('meal') or their +1 ('plusOneMeal'); `who` is the name said back. */
export function mealEdit(event, i, field, m, who) {
  const name = who || 'Guest';
  return guestFieldEdit(event, i, { [field]: m }, m === '—' ? name + '’s meal cleared — counts as unanswered.' : name + ' → ' + m + ' — the meal tally keeps count.');
}

/** The line when a child is added to a guest's party. */
export const kidsAddedLine = (n, name) => n + ' kids with ' + (name || 'this guest') + ' — the food plan sizes them lighter.';

/** "I told them myself": a record only (nothing is sent), and tapping again clears it. */
export function toldEdit(event, guestId, name, channel, at) {
  const cur = guestToldMap(event);
  const first = String(name || 'them').split(/\s+/)[0];
  if (isTold(cur, guestId)) return { patch: { guestTold: clearTold(cur, guestId) }, msg: `Cleared — ${first} is back on the still-to-tell list.` };
  return { patch: { guestTold: recordTold(cur, guestId, channel, at) }, msg: `Noted: you told ${first}. Nothing was sent from here.` };
}

/** The guest list as a CSV that re-imports as NGW Native: { filename, content, count, msg }. */
export function guestListCsv(event) {
  const rows = ((event && event.guests) || []).map((g) => ({
    name: g.name || '', email: g.email || '', phone: g.phone || '',
    group: g.group || '',
    rsvp_status: g.rsvp || 'Pending', // '' means no reply: canonical 'Pending' (the import maps it back)
    meal_preference: g.meal || '', plus_one_name: g.plusOne || '',
    table_number: g.table ?? '', dietary_restrictions: g.needs || '',
    notes: g.partyNotes || '',
  }));
  return {
    filename: exportFileSlug(event && event.name) + '-guests.csv',
    content: toCSV(rows, COLUMNS.guests),
    count: rows.length,
    msg: rows.length + (rows.length === 1 ? ' guest' : ' guests') + ' downloaded — the file re-imports as NGW Native.',
  };
}

/** Reply alerts for this event: on (the default, null) or off (false). */
export function replyAlertsEdit(event) {
  const off = event && event.hostAlerts === false;
  return { patch: { hostAlerts: off ? null : false }, msg: off ? 'Reply alerts are on.' : 'Reply alerts are off for this event.' };
}

/** WHO'S HERE (B6, 11/26/2026): tap a guest in on the day (guest.checkedIn,
 *  the time they arrived; the field the duplicate rule already resets), tap
 *  again to undo. `at` is the arrival time (ISO); omitted, it is now. */
export function checkInEdit(event, guestId, at) {
  const list = Array.isArray(event && event.guests) ? event.guests : [];
  const g = list.find((x) => x && x.id === guestId);
  if (!g) return null;
  const on = !g.checkedIn;
  const first = String(g.name || 'They').trim().split(/\s+/)[0];
  return {
    patch: { guests: list.map((x) => (x && x.id === guestId ? { ...x, checkedIn: on ? (at || new Date().toISOString()) : null } : x)) },
    msg: on ? first + ' is here.' : first + ' isn’t checked in.',
  };
}

/**
 * "Same person?" for a reply signed differently (guestMerge, as the old sheet
 * did): same folds the reply onto the guest's row; different keeps both.
 */
export function sameGuestEdit(event, rowId, same) {
  const gs0 = (event && event.guests) || [];
  const row = gs0.find((g) => g && g.id === rowId) || {};
  const who = gs0.find((g) => g && g.id === row.maybeSameAs) || {};
  if (same) {
    const gs = confirmSameGuest(gs0, rowId);
    return { patch: { guests: gs, kidsCount: kidsCountAfterRoster(event, gs) }, msg: 'The reply is on ' + (who.name || 'their') + '’s row now.' };
  }
  return { patch: { guests: keepSeparateGuest(gs0, rowId) }, msg: (row.name || 'They') + ' stay on the list as a separate guest.' };
}
