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
import { deepenForLight } from '@app/lib/inviteTone';
import { dark as steelPalette } from '@app/theme/palette';

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

// The public pages' paper (InviteV2, VendorBriefV2): an invitePalette lands as
// scoped CSS-var overrides so every class retints, and the steel identity accent
// deepens on paper (dark-tuned hues wash out on cream).
export function toneVarsFor(pal) {
  const steelAccent = pal.dark ? null : deepenForLight(steelPalette.steelBlue);
  return {
    '--bg': pal.bg, '--card': pal.panel, '--bg-band': pal.surface,
    // Color re-audit (→10): --line-soft was === --line, flattening the border
    // hierarchy the host has. Give it a real softer step (borders carry no text,
    // so contrast is not a constraint).
    '--line': pal.border, '--line-soft': `color-mix(in srgb, ${pal.border} 55%, transparent)`,
    '--ink': pal.text, '--ink-soft': pal.sub, '--muted': pal.muted, '--faint': pal.muted,
    // Status colors MUST be scoped per skin (per-screen audit): they weren't,
    // so on a LIGHT skin the "You're in" eyebrow and error text fell through to
    // the dark-calibrated --ok/--danger and computed ≈2.5:1 / ≈3.7:1 — failing.
    // Light skins get deep green/red (≈5:1 on cream/white); dark skins keep the
    // light calibrations (the host theme's own lightened danger, ≈4.5+:1 on dark).
    '--ok': pal.dark ? '#4FAE7A' : '#1e7a46',
    // Color audit I1: normalized to α0.10 to match the host (was .14/12% — the
    // exact density the host-side pass moved off of).
    '--ok-tint': pal.dark ? 'rgba(79,174,122,.10)' : 'color-mix(in srgb, #1e7a46 10%, transparent)',
    '--danger': pal.dark ? '#F27A70' : '#c03838',
    '--danger-tint': pal.dark ? 'rgba(242,122,112,.10)' : 'color-mix(in srgb, #c03838 10%, transparent)',
    ...(steelAccent ? {
      '--steel': steelAccent, '--steel-soft': steelAccent,
      '--steel-tint': `color-mix(in srgb, ${steelAccent} 10%, transparent)`,
    } : {}),
    // Declared HERE so inherited text re-resolves against the overridden vars —
    // body's own color computed against :root would leak white onto paper.
    color: 'var(--ink)',
    colorScheme: pal.dark ? 'dark' : 'light',
  };
}
