// ─── THE INVITATION'S DECK LINE (moved out of hostv2 InviteV2, 11/19/2026) ───
// The italic line under the event's name on the guest invite. Moved here so
// the invitation PICTURE in the invite email (lib/inviteCard) prints the SAME
// line as the page: one owner, no copy to drift. Unchanged otherwise.
import { resolveEventIdentity } from './eventIdentityEngine';

// Deck line — the celebration copy under the event name (the original's
// DECK_BY_VOICE concept, scoped to what V2 can honestly claim). Ordered
// [signal, line] pairs; copy strings unchanged since the remake shipped.
const DECK_LINES = [
  [/crab|crawfish|low.?country|fish\s*fry|cook.?out|bbq|barbecue/i, 'Good food, good people'],
  [/retire/i, 'A career worth celebrating'],
  [/birthday/i, 'Another year, celebrated right'],
  [/graduat/i, 'They did the work — come cheer'],
  [/baby|shower/i, 'Something wonderful is coming'],
  [/wedding|anniversary/i, 'Two names, one day'],
];
const DECK_DEFAULT = 'It wouldn’t be the same without you';

// HQ-3 re-audit NEW-1: this page used to classify the celebration with its own
// regex over `type + name`, testing /retire/ before /birthday/ — so a compound
// Birthday + Retirement invite silently read retirement-only, bypassing the
// canonical identity every host surface consults. Now the CLASSIFICATION comes
// from the same reader (PC-1's buildExperienceContext → eventIdentity, pure —
// no profile/session, so it's safe on this public page): the event's PRIMARY
// milestone is tried first, then its secondaries, so the identity's own order
// decides the line — not the order of the pairs above. The host's authored
// deckLine still always wins, and the copy strings are untouched.
//
// Degrade, never crash: backend-resolved invites carry only the whitelisted
// PUBLIC_EVENT_FIELDS (name/type among them — enough for the reader), but if
// the canonical reader returns nothing or throws for ANY event, the original
// type+name regex still answers. That fallback also keeps covering free-text
// signals the identity engine has no vocabulary for (a "Crab Feast" living
// only in the event NAME).
export function deckLineFor(event, somber, isPast) {
  if (!event) return '';
  // Past events become a recap. A host-authored deckLine was written for the
  // UPCOMING invite and may be future-tense ("Something wonderful is coming"),
  // which would contradict "Thank you for coming" — so on a (non-memorial) past
  // event the retrospective line wins even over the authored copy. Memorials
  // keep their own handling below.
  if (isPast && !somber) return 'A day worth remembering';
  const explicit = String(event.deckLine || '').trim();
  if (explicit) return explicit;
  if (somber) return 'In loving memory';
  try {
    // Same derivation experienceContext.js:40-48 performs before handing the result
    // to eventIdentity — reproduced here so the invite reads the identity WITHOUT
    // importing the planning engine. One owner (resolveEventIdentity), same inputs.
    const typeWords = String(event.type || '').toLowerCase().split(/\s+/).filter(Boolean);
    const nameSansType = String(event.name || '').split(/\s+/)
      .filter(w => !typeWords.includes(w.toLowerCase())).join(' ');
    const freeText = [nameSansType, event.secondaryType, event.honoree, event.theme]
      .filter(Boolean).join('. ');
    const id = resolveEventIdentity(event, event.type, 'self', freeText);
    if (id) {
      const labels = [id.primaryEventType, ...(id.secondaryEventTypes || [])].filter(Boolean);
      for (const label of labels) {
        const hit = DECK_LINES.find(([re]) => re.test(String(label)));
        if (hit) return hit[1];
      }
    }
  } catch { /* guest page: fall through to the regex below */ }
  const t = String(event.type || '') + ' ' + String(event.name || '');
  const hit = DECK_LINES.find(([re]) => re.test(t));
  return hit ? hit[1] : DECK_DEFAULT;
}
