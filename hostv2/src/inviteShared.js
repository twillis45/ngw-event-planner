// ─── inviteShared — the small things the GUEST needs ─────────────────────────
//
// The invite page is the only surface a non-host ever touches, and it was the
// heaviest thing we ship. A guest tapping "yes" downloaded ~490 KB gzip
// (~1.85 MB raw), of which the invite's own code was 9 KB. The other 418 KB was
// `eventPool` — and eventPool is huge not because of the sample events but
// because it imports ALL_PLAYBOOKS (all 40 playbooks) at module scope to build
// the QA test events' checklists. So a guest downloaded the entire playbook
// engine to read an invitation.
//
// InviteV2 imported five things from eventPool. Exactly ONE of them is heavy:
// ALL_SAMPLES. The other four are a string helper, a storage key, a 6-colour
// array, and a 3-line artwork lookup. They live here now, so importing them
// costs nothing — and ALL_SAMPLES is dynamic-imported inside the resolver, off
// the guest's critical path.
//
// eventPool re-exports everything below, so the host shell is unchanged and
// there is still ONE definition of each.

import { ARTWORK_MARKS } from '@app/lib/artworkMarks';

// Per-event patch layer (the host's edits) — the guest reads it so the invite
// shows exactly what the host's plan says.
export const LS_PATCH = id => 'ngw-hostv2-patch-' + id;

// The legacy single created-event slot.
export const LS_CUSTOM = 'ngw-hostv2-custom-event';

// Real public-domain artwork marks — the same image at every size (never
// hand-drawn, never size-switched).
export function eventArtworkFile(event) {
  const t = String((event && event.type) || '') + ' ' + String((event && event.name) || '');
  const key = /crab/i.test(t) ? 'crab' : /fish\s*fry|catfish/i.test(t) ? 'fish' : null;
  return key ? (ARTWORK_MARKS[key] || null) : null;
}

// Shared avatar tints (color audit Cr1): deterministic, muted, on-brand — the
// invite and the host roster read as one product.
export const AVA_TINTS = ['#3b4a52', '#4a4136', '#3a4a3e', '#463a44', '#3f4657', '#4a3f3a'];
