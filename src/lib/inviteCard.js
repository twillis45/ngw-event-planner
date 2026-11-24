// ─── THE INVITATION AS A PICTURE: WHAT IT SAYS (owner, 11/19/2026) ───────────
//
// "That dark invite sent is gross, doesn't resemble my invitations," then
// "Build the invitation picture email." Mail apps in dark mode recolor an
// email's HTML (the Gmail app inverts it) but never a picture, so the invite
// email leads with a picture of the host's own invitation card.
//
// This module is the card's CONTENT and look, read with the same helpers the
// guest invite page (hostv2 InviteV2) uses, so the picture says what the page
// says: the tone (inviteTone: cream, dark for evening/formal, muted for a
// memorial), the masthead ("An invitation" · Nov 2026), the name, the host's
// message and its signature (lib/inviteDeck inviteMessage), When (the day, a multi-day span, the host-set hour), Where
// (venueFor) and Hosted by. Two things are left out on purpose: the countdown
// (a picture cannot count down; it would go stale) and the reply (it is the
// email's own buttons). hostv2/src/inviteCardImage.js draws it. PURE.
import { inviteTone, invitePaletteFor } from './inviteTone';
import { inviteMessage } from './inviteDeck';
import { eventStartLabel } from './eventWhen';
import { formatVenueAddress } from './venueFor';
import { daysUntilEnd } from './dates';
import { fmtLongSpan } from './doItForMe';
import { hostNameFor } from './hostNameFor';

// The page's stationery colors (hostv2 styles.css .inv2-sheet, .inv2-dark,
// .inv2-muted), verbatim.
export const CARD_COLORS = {
  light: { hue: '#D9622B', hueDeep: '#9c4426', ink: '#241f18', sub: '#62626d', paper: 'light' },
  muted: { hue: '#8a7a66', hueDeep: '#6f6152', ink: '#241f18', sub: '#62626d', paper: 'light' },
  dark:  { hue: '#d99a63', hueDeep: '#c9854f', ink: '#e4dbc6', sub: '#a89f8e', paper: 'dark', body: '#ece5d8' },
};

const dfmt = (iso, opts) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', opts);

export function inviteCardModel(event) {
  const ev = event || {};
  const tone = inviteTone(ev);
  let past = false;
  try { const d = daysUntilEnd(ev); past = d != null && d < 0; } catch { /* undated: not past */ }
  const facts = [];
  if (ev.date) {
    const day = fmtLongSpan(ev);
    let time = '';
    // Arrive-by, and the meal's hour when the event is meal-centered (cause 5).
    try { const w = eventStartLabel(ev); time = w ? (w.serveLabel ? `${w.label}, dinner at ${w.serveLabel}` : (w.label || '')) : ''; } catch { /* no hour */ }
    facts.push({ label: 'When', value: day, sub: time });
  }
  const where = (() => { try { return formatVenueAddress(ev) || ''; } catch { return ''; } })();
  if (where) facts.push({ label: 'Where', value: where });
  // The host line every screen reads (hostNameFor, D-13), `host` included.
  const host = hostNameFor(ev);
  if (host && !past) facts.push({ label: 'Hosted by', value: host });
  return {
    tone,
    // The host's palette (11/24/2026): the card wears its paper, ink and accent.
    colors: (() => {
      const pal = (() => { try { return invitePaletteFor(ev); } catch { return null; } })();
      if (!pal) return CARD_COLORS[tone] || CARD_COLORS.light;
      return { hue: pal.hue, hueDeep: pal.accent, ink: pal.ink, sub: pal.sub, body: pal.ink, paper: pal.dark ? 'dark' : 'light', paperHex: pal.paper, palette: pal.key };
    })(),
    mast: ['An invitation', ev.date ? dfmt(ev.date, { month: 'short', year: 'numeric' }) : ''],
    eyebrow: past ? 'Thank you for coming' : tone === 'muted' ? 'Please join us' : '',
    name: String(ev.name || '').trim() || 'Our gathering',
    // The page's layout (InviteV2): where the host's photo sits on the picture
    // (owner, 11/24/2026: Classic beside the signature, At a glance in Hosted by).
    layout: ev.inviteLayout === 'glance' ? 'glance' : 'classic',
    // The host's message (owner, 11/24/2026): her words, signed with her first
    // name when she wrote them; else the suggested line, unsigned.
    ...(() => {
      try {
        const m = inviteMessage(ev, { somber: tone === 'muted', past });
        return { deck: m.text || '', sig: m.signedBy ? `— ${m.signedBy}` : '' };
      } catch { return { deck: '', sig: '' }; }
    })(),
    facts,
  };
}

/** A short key of what the card shows: the same key, the same picture. */
export function inviteCardKey(model) {
  const s = JSON.stringify(model);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
