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
//   note, mailingAddress, idempotencyKey
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
export function mergeGuestReplies(existingGuests, submissions, opts = {}) {
  const guests = [...(existingGuests || [])];
  let merged = 0, added = 0, yesCount = 0;
  for (const sub of (submissions || [])) {
    if (!sub) continue;
    const full = String(sub.name || '').trim();
    if (!full) continue;
    const toks = full.toLowerCase().split(/\s+/).filter(Boolean);
    const first = toks[0] || '';
    const last = toks[toks.length - 1] || '';
    const ix = guests.findIndex(g => {
      const gn = String((g && g.name) || '').trim().toLowerCase();
      if (!gn) return false;
      const gp = gn.split(/\s+/).filter(Boolean);
      const gFirst = gp[0] || '';
      const gLast = gp[gp.length - 1] || '';
      if (gn === full.toLowerCase()) return true;
      if (last && last.length >= 3 && gLast === last && gFirst === first) return true;
      if (first.length >= 4 && gFirst === first) return true;
      return false;
    });
    if (sub.rsvp === 'Yes') yesCount += 1;
    if (ix >= 0) {
      const g = guests[ix];
      const next = {
        ...g,
        rsvp: sub.rsvp,
        meal: sub.rsvp === 'Yes' ? (sub.meal || g.meal) : g.meal,
        needs: sub.needs || g.needs,
        plusOne: sub.plusOne || g.plusOne,
        plusOneMeal: sub.plusOneMeal || g.plusOneMeal,
        plusOneNeeds: sub.plusOneNeeds || g.plusOneNeeds,
        kids: sub.kids || g.kids,
        address: sub.mailingAddress || g.address,
        partyNotes: sub.note || g.partyNotes,
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
        plusOne: sub.plusOne || '',
        plusOneMeal: sub.plusOneMeal || '—',
        plusOneNeeds: sub.plusOneNeeds || '',
        kids: sub.kids || 0,
        address: sub.mailingAddress || '',
        partyNotes: sub.note || '',
      });
      added += 1;
    }
  }
  return { guests, merged, added, yesCount };
}
