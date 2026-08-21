// ─── The send ledger — the outlet's durable half (board ruling 2026-08-21) ───
//
// Six seats, 6-0: the app writes every message and records none of the
// sending. The missing capability is not transport (native share/sms/wa.me
// remain the primary send, and they are honest) — it is the DURABLE STATUS
// CHANGE. A host who texts the caterer from her own Messages app leaves no
// record, so the readiness engine re-proposes asks already made and "did the
// ask go out, when, and did they answer" — the ops question — is unanswerable.
//
// State model (ruling clause 3, superset-compatible with Blink's three
// not-dones): not_sent → handed_off (HOST-ATTESTED: channel + timestamp;
// never the word "Sent" — an sms: tap proves the composer opened, nothing
// more) → confirmed (system-verified, fed by the brief confirm-back).
// Server-email states (accepted/delivered/failed) join only when that path
// is wired; they are system-owned and render differently by rule.
//
// Lives on the event as `sendLedger` keyed by draft identity — the same
// pattern as briefSharedVendorIds. Written through patchEvent so every
// write is undoable. MUST-NOT-SHIP list (clause 4): "Sent ✓" on a share
// exit, bulk/scheduled/auto send, red failure for a host-side channel, a
// declined share sheet recording anything.

/** One draft, one key — same derivation the draft-edit keep uses. */
export const sendKey = (title) => String(title || 'draft');

const CHANNEL_LABEL = {
  sms: 'by text', whatsapp: 'on WhatsApp', share: 'from your share sheet',
  copy: 'copied to send', email: 'by email', other: 'yourself',
};

/**
 * Record a host-attested handoff. Pure: returns the next ledger.
 * A declined share never reaches here — callers only record on completion.
 */
export function recordHandoff(ledger, title, channel, nowIso) {
  const key = sendKey(title);
  const prev = (ledger && typeof ledger === 'object') ? ledger : {};
  return {
    ...prev,
    [key]: {
      status: 'handed_off',
      attested: true,
      channel: CHANNEL_LABEL[channel] ? channel : 'other',
      at: nowIso || null,
    },
  };
}

/**
 * Record a SYSTEM-VERIFIED email state (ruling slice (b)). `attested:false`
 * is the whole point — the server did this, not the host, and the two must
 * render differently.
 *
 * Statuses, in the backend's own vocabulary (communication.py:352-355):
 *   sending  — the request is in flight (optimistic, replaced by the answer)
 *   accepted — Resend accepted it for delivery. NOT "delivered".
 *   failed   — the send did not happen. This is the ONLY red state, and it
 *              is system-owned (a host-side channel never fails).
 * `delivered`/`bounced` join when the Resend webhook is PROVEN live; until
 * then `accepted` is the ceiling, by ruling risk #4.
 */
export function recordEmailSend(ledger, title, status, extra) {
  const key = sendKey(title);
  const prev = (ledger && typeof ledger === 'object') ? ledger : {};
  return {
    ...prev,
    [key]: {
      status: status === 'accepted' || status === 'failed' ? status : 'sending',
      attested: false,
      channel: 'email',
      at: (extra && extra.at) || null,
      ...(extra && extra.to ? { to: extra.to } : {}),
      ...(extra && extra.error ? { error: extra.error } : {}),
    },
  };
}

/** The entry for a draft, or null — never a fabricated not_sent object. */
export function sendStateFor(ledger, title) {
  const e = ledger && ledger[sendKey(title)];
  return e && e.status ? e : null;
}

/**
 * The chip line the draft sheet renders. Host-attested language only:
 * "Handed off", never "Sent" — copy holds the line the ruling drew.
 * Age renders in the ops shape ("6d") because "when did I ask them" is the
 * first question in every dispute (Weiss seat).
 */
export function sendStateLine(entry, nowTs) {
  if (!entry) return null;
  let age = '';
  if (entry.at) {
    const ms = (nowTs || 0) - Date.parse(entry.at);
    if (Number.isFinite(ms) && ms >= 0) {
      const d = Math.floor(ms / 86400000);
      const h = Math.floor(ms / 3600000);
      const m = Math.floor(ms / 60000);
      age = d >= 1 ? ` · ${d}d ago` : h >= 1 ? ` · ${h}h ago` : m >= 1 ? ` · ${m}m ago` : ' · just now';
    }
  }
  // System-verified email states speak the server's vocabulary exactly:
  // "Accepted by the mail service" is what we know, and it is not "delivered"
  // and never "Sent ✓". `failed` is the one red state, and it is system-owned.
  if (entry.status === 'sending') return 'Sending…';
  if (entry.status === 'accepted') return `Accepted by the mail service${age}`;
  if (entry.status === 'failed') return `The email didn’t go out${age} — nothing was sent`;
  if (entry.status !== 'handed_off') return null;
  const via = CHANNEL_LABEL[entry.channel] || CHANNEL_LABEL.other;
  return `Handed off ${via}${age}`;
}

/** True when the state was VERIFIED by the server, not attested by the host. */
export const isVerifiedState = (entry) => !!(entry && entry.attested === false);
