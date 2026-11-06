// ─── Guest-reply merge (extracted from App.js + HostShellV2) ───────────────────
// THE single guest-reply merge BOTH apps must consume. The exact same logic
// existed in two places — App.js's RSVP read-back useEffects (local outbox +
// server fetch) and HostShellV2's inline mergeGuestReplies helper — and any
// drift between them means the two shells disagree about who's coming. Import
// this from both; never re-implement the name-match or field-merge rules.
//
// Name-match rules (the ORIGINAL App.js rules, in priority order):
//   1. exact  — lowercase full-name equality
//   2. last+first — last name ≥3 chars AND equal, AND first names equal
//   3. first-only — first names equal, when the first name is ≥4 chars
//      (short-name guard: "Sam" alone never claims another Sam's row)
//
// On match, the guest row is updated in place (new object; inputs never
// mutated): rsvp always takes the submission's value; meal is only overwritten
// when the reply is a Yes (a "No" must not clobber a previously chosen meal);
// every other field only when the submission carries a truthy value. A row is
// counted as `merged` ONLY if something actually changed — server rows
// re-arrive on every visit, and an unchanged re-merge must not re-announce.
//
// On no match, a new guest row is added with the roster's default shape.
//
// Submissions use the normalized camelCase field names:
//   name, rsvp, meal, needs, plusOne, plusOneMeal, plusOneNeeds, kids,
//   note, mailingAddress, phone, email, idempotencyKey
// phone/email are the OPTIONAL contact a guest chose to leave at RSVP — they
// land on the guest row under the same `phone`/`email` names the roster editor
// and CSV import already use (host-side only; the invite never shows another
// guest's contact). Truthy-only overwrite: a reply without contact never
// clears a number the host already has.
// (server snake_case rows must be normalized BEFORE calling this — see the
// callers' `guest_name → name` etc. mapping).
//
// Pure: never mutates existingGuests, its guest objects, or submissions.
//
// @param {Array}  existingGuests  current roster (objects with id/name/rsvp/…)
// @param {Array}  submissions     normalized guest replies (shape above)
// @param {Object} [opts]
// @param {Function} [opts.makeId] custom id factory for added guests,
//                                 called with the submission; default id is
//                                 'g-rsvp-' + (idempotencyKey || random)
// @returns {{ guests: Array, merged: number, added: number, yesCount: number }}
//   guests   — the next roster (new array; untouched rows are the same refs)
//   merged   — existing rows that actually changed
//   added    — new rows appended
//   yesCount — guests this merge changed or added whose final rsvp === 'Yes' (once each)
// Extracted so any caller resolving a free-text name against the guest list
// (RSVP merge here, helper/owner-assignment resolution in
// helperResponsibility.js) shares the exact same match rules — see the
// name-match priority order documented above. Returns -1 when no guest
// matches; never invents or fuzzy-guesses beyond these three rules.
export function matchGuestIndexByName(guests, fullName) {
  const full = String(fullName || '').trim();
  if (!full) return -1;
  // A couple-shaped name ("Ryan and Nicole") must NEVER partial-match a
  // single-name row: the first-token rule below would land it on "Ryan", the
  // update path doesn't rewrite `name`, and Nicole would be silently discarded
  // (audit 2026-07-27). Couple strings match by exact equality only.
  const coupleShaped = /\s(?:and|&|\+)\s/i.test(full);
  const toks = full.toLowerCase().split(/\s+/).filter(Boolean);
  const first = toks[0] || '';
  const last = toks[toks.length - 1] || '';
  return (guests || []).findIndex(g => {
    const gn = String((g && g.name) || '').trim().toLowerCase();
    if (!gn) return false;
    if (gn === full.toLowerCase()) return true;
    // A name the host confirmed IS this guest ("eve" → Eve Brooks), so the
    // reply that re-arrives on every visit lands on her, not on a new row.
    if (Array.isArray(g.aka) && g.aka.includes(full.toLowerCase())) return true;
    if (coupleShaped) return false;
    const gp = gn.split(/\s+/).filter(Boolean);
    const gFirst = gp[0] || '';
    const gLast = gp[gp.length - 1] || '';
    if (last && last.length >= 3 && gLast === last && gFirst === first) return true;
    if (first.length >= 4 && gFirst === first) return true;
    return false;
  });
}

/**
 * The names in `added` already on the list, or repeated within `added`
 * (gold run, 11/5/2026: "Ana Rivera" pasted twice went in silently, and the
 * first Ana got the reply). Flagged, never refused — two guests can share a
 * name. Compared ignoring case and spacing; each name reported once.
 */
export function repeatedGuestNames(existingGuests, added) {
  const key = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const seen = new Set((existingGuests || []).map((g) => key(g && g.name)).filter(Boolean));
  const out = [];
  for (const n of added || []) {
    const k = key(n);
    if (!k) continue;
    if (seen.has(k) && !out.some((o) => key(o) === k)) out.push(String(n).trim().replace(/\s+/g, ' '));
    seen.add(k);
  }
  return out;
}

// ── A SHORT FIRST NAME IS ASKED ABOUT, NEVER ASSUMED (owner ruling, 11/5/2026) ──
// "eve" on a reply is not matched to Eve Brooks — the ladder above refuses a
// first name under four letters alone, so a stranger's reply on an open link
// can never land on the wrong guest. But when exactly one guest has that first
// name, the new row carries `maybeSameAs` and the host is asked.
export function likelySameGuest(guests, fullName) {
  const full = String(fullName || '').trim().toLowerCase();
  if (!full || /\s/.test(full) || full.length >= 4) return null;
  const hits = (guests || []).filter((g) => g && g.id && String(g.name || '').trim().toLowerCase().split(/\s+/)[0] === full
    && String(g.name || '').trim().toLowerCase() !== full);
  return hits.length === 1 ? hits[0] : null;
}

const REPLY_FIELDS = ['meal', 'needs', 'plusOne', 'plusOneMeal', 'plusOneNeeds', 'kids', 'address', 'partyNotes', 'phone', 'email', 'lodgingPick'];
const BLANK = (v) => v == null || v === '' || v === '—' || v === 0 || (Array.isArray(v) && !v.length);

/** The host said yes: the short-name row's reply moves onto the guest, its name
 *  becomes her alias, and the row goes. */
export function confirmSameGuest(guests, rowId) {
  const list = guests || [];
  const row = list.find((g) => g && g.id === rowId);
  const target = row && list.find((g) => g && g.id === row.maybeSameAs);
  if (!row || !target) return list;
  const next = { ...target, rsvp: row.rsvp || target.rsvp };
  for (const f of REPLY_FIELDS) if (!BLANK(row[f])) next[f] = row[f];
  for (const f of ['allergens', 'diets', 'access']) if (!BLANK(row[f])) next[f] = row[f];
  if (typeof row.picksCrabs === 'boolean') next.picksCrabs = row.picksCrabs;
  const alias = String(row.name || '').trim().toLowerCase();
  next.aka = [...new Set([...(Array.isArray(target.aka) ? target.aka : []), alias].filter(Boolean))];
  return list.filter((g) => g !== row).map((g) => (g === target ? next : g));
}

/** The host said no: two people. The question is not asked again. */
export function keepSeparateGuest(guests, rowId) {
  return (guests || []).map((g) => {
    if (!g || g.id !== rowId || !('maybeSameAs' in g)) return g;
    const { maybeSameAs, ...rest } = g;
    return rest;
  });
}

export function mergeGuestReplies(existingGuests, submissions, opts = {}) {
  const guests = [...(existingGuests || [])];
  let added = 0;
  // THE LATEST ANSWER WINS (owner's Vida run, 11/5/2026). The server returns
  // replies newest first, and applying them in that order let a guest's OLDER
  // answer overwrite her change ("Maybe" over "Yes"). When every reply carries
  // its time (`at`), apply them oldest → newest; otherwise the given order is
  // already chronological (the same-browser outbox appends).
  const list = (submissions || []).filter(Boolean);
  const stamped = list.length > 0 && list.every((x) => Number.isFinite(Date.parse(x.at)));
  const ordered = stamped ? [...list].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : list;
  // Counted per GUEST, not per row: a guest who changed her answer is one
  // reply, and "K yes" is the number of those guests whose final answer is Yes
  // — the same figure the list shows.
  const changed = new Set();   // existing guests this batch changed, plus guests it added
  for (const sub of ordered) {
    const full = String(sub.name || '').trim();
    if (!full) continue;
    const ix = matchGuestIndexByName(guests, full);
    if (ix >= 0) {
      const g = guests[ix];
      const next = {
        ...g,
        rsvp: sub.rsvp,
        meal: sub.rsvp === 'Yes' ? (sub.meal || g.meal) : g.meal,
        needs: sub.needs || g.needs,
        // Structured dietary/access (redesigned invite) — arrays flow to food
        // sizing/flags and seating. Overwrite only when the reply carried them,
        // so an older free-text-only reply doesn't wipe a structured one.
        allergens: (Array.isArray(sub.allergens) && sub.allergens.length) ? sub.allergens : g.allergens,
        diets: (Array.isArray(sub.diets) && sub.diets.length) ? sub.diets : g.diets,
        access: (Array.isArray(sub.access) && sub.access.length) ? sub.access : g.access,
        plusOne: sub.plusOne || g.plusOne,
        plusOneMeal: sub.plusOneMeal || g.plusOneMeal,
        plusOneNeeds: sub.plusOneNeeds || g.plusOneNeeds,
        kids: sub.kids || g.kids,
        address: sub.mailingAddress || g.address,
        partyNotes: sub.note || g.partyNotes,
        // Guest-offered contact (invite's optional "how to reach you" ask) —
        // same field names the roster editor writes, so the host's chase
        // affordances (tel:/sms:/mailto:) read one shape from either source.
        phone: sub.phone || g.phone,
        email: sub.email || g.email,
        // Crab-picker answer (only carried when the guest actually answered —
        // an absent answer must not overwrite a recorded one).
        ...(typeof sub.picksCrabs === 'boolean' ? { picksCrabs: sub.picksCrabs } : {}),
        // Rental-house preference (migration 016) — same rule as the crab answer:
        // only carried when the guest actually answered, so an absent pick can
        // never blank a recorded one. Applies to BOTH branches: the merge into an
        // existing roster row AND the row created for a brand-new replier.
        ...(String(sub.lodgingPick || '').trim() ? { lodgingPick: String(sub.lodgingPick).trim() } : {}),
      };
      // Server rows re-arrive on every visit — only count real changes.
      if (JSON.stringify(next) !== JSON.stringify(g)) guests[ix] = next;
    } else {
      const maybe = likelySameGuest(guests, full);
      guests.push({
        ...(maybe ? { maybeSameAs: maybe.id } : {}),
        id: opts.makeId ? opts.makeId(sub) : 'g-rsvp-' + (sub.idempotencyKey || Math.random().toString(36).slice(2, 10)),
        name: full,
        group: 'Friends',
        rsvp: sub.rsvp || '',
        meal: sub.meal || '—',
        needs: sub.needs || '',
        allergens: Array.isArray(sub.allergens) ? sub.allergens : [],
        diets: Array.isArray(sub.diets) ? sub.diets : [],
        access: Array.isArray(sub.access) ? sub.access : [],
        plusOne: sub.plusOne || '',
        plusOneMeal: sub.plusOneMeal || '—',
        plusOneNeeds: sub.plusOneNeeds || '',
        kids: sub.kids || 0,
        address: sub.mailingAddress || '',
        partyNotes: sub.note || '',
        phone: sub.phone || '',
        email: sub.email || '',
        ...(typeof sub.picksCrabs === 'boolean' ? { picksCrabs: sub.picksCrabs } : {}),
        // Rental-house preference (migration 016) — same rule as the crab answer:
        // only carried when the guest actually answered, so an absent pick can
        // never blank a recorded one. Applies to BOTH branches: the merge into an
        // existing roster row AND the row created for a brand-new replier.
        ...(String(sub.lodgingPick || '').trim() ? { lodgingPick: String(sub.lodgingPick).trim() } : {}),
      });
      added += 1;
    }
  }
  // Changed = different at the END from where it STARTED. Applied in time
  // order, a guest's older rows re-arriving flip her answer and flip it back
  // (Yes → Maybe → Yes); that is not a reply. Added guests are always news.
  const start = existingGuests || [];
  start.forEach((g, ix) => { if (JSON.stringify(guests[ix]) !== JSON.stringify(g)) changed.add(ix); });
  for (let ix = start.length; ix < guests.length; ix++) changed.add(ix);
  // Only the guests THIS batch changed or added, so "N replies came in — K yes"
  // describes the same N. Rows re-arriving unchanged on every visit are not news.
  const yesCount = [...changed].filter((ix) => guests[ix] && guests[ix].rsvp === 'Yes').length;
  return { guests, merged: changed.size - added, added, yesCount };
}
