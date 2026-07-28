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
//   yesCount — submissions processed whose rsvp === 'Yes'
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
    if (coupleShaped) return false;
    const gp = gn.split(/\s+/).filter(Boolean);
    const gFirst = gp[0] || '';
    const gLast = gp[gp.length - 1] || '';
    if (last && last.length >= 3 && gLast === last && gFirst === first) return true;
    if (first.length >= 4 && gFirst === first) return true;
    return false;
  });
}

export function mergeGuestReplies(existingGuests, submissions, opts = {}) {
  const guests = [...(existingGuests || [])];
  let merged = 0, added = 0, yesCount = 0;
  for (const sub of (submissions || [])) {
    if (!sub) continue;
    const full = String(sub.name || '').trim();
    if (!full) continue;
    const ix = matchGuestIndexByName(guests, full);
    if (sub.rsvp === 'Yes') yesCount += 1;
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
      if (JSON.stringify(next) !== JSON.stringify(g)) { guests[ix] = next; merged += 1; }
    } else {
      guests.push({
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
  return { guests, merged, added, yesCount };
}
