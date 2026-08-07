// ─── Vendor contact — the intake half of a wire that was already built ───────
//
// WHY THIS EXISTS (2026-08-07)
//
// `vendor.lastContactedAt` has been READ all along:
//   vendorAccountability/derive.js:187-189 computes days since contact and
//   penalises the readiness score once contact is more than 21 days stale, and
//   derive.js feeds surfaceRegistry, vendorPlan, vendorAsks, replyBy,
//   routeResolver and the shell itself.
// NOTHING EVER WROTE IT. Zero writers across src, hostv2 and backend.
//
// So the engine has been scoring staleness against a field that is permanently
// empty — the penalty could never fire for any host, ever.
//
// I previously reported the opposite ("no record that outreach was ever sent,
// so this is blocked") off a probe that returned 0 hits. The probe was wrong:
// the repo's grep does word-boundary matching, so `contactedAt` never matched
// inside `lastContactedAt`. Wire the Outlet asks for exactly one thing before
// building an intake — grep-prove an engine reads what it produces. That is
// proven here, which is what AUTHORISES this file rather than forbidding it.
//
// ─── THE HONESTY LINE ────────────────────────────────────────────────────────
// This records something the HOST DID. It does not send anything and must never
// imply that it did. The app can draft 26 kinds of message and send none of
// them; a field named `lastContactedAt` stamped by a host who says "I called
// them" is a true fact, whereas a field stamped by a Send button that only
// opened a mail client is a lie. Every function here is written to keep that
// distinction: `source` is recorded, and an unknown source is never upgraded.

/** How long silence is allowed to run before it is worth the host's attention.
 *  Matches the 21-day staleness line derive.js already scores against, so the
 *  surface and the score cannot disagree about what "stale" means. */
export const SILENCE_DAYS = 21;

/** Sources we accept for a contact stamp. `sent` is deliberately absent — the
 *  app cannot send, so nothing may claim it did. Add it the day that changes. */
export const CONTACT_SOURCES = Object.freeze(['host-logged', 'drafted', 'imported']);

const asDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayDiff = (from, to) => Math.floor((to.getTime() - from.getTime()) / 86400000);

/**
 * The patch that records a contact. Pure — returns the vendor fields to merge,
 * never mutates and never writes storage.
 *
 * @param {object} opts.at      when contact happened (Date or ISO). Defaults to now.
 * @param {string} opts.source  one of CONTACT_SOURCES.
 */
export function recordContact({ at, source } = {}) {
  const when = asDate(at) || new Date();
  const src = CONTACT_SOURCES.includes(source) ? source : 'host-logged';
  return { lastContactedAt: when.toISOString(), lastContactSource: src };
}

/**
 * What we can honestly say about a vendor's contact state.
 *
 * `awaitingReply` is DERIVED, never stored: a vendor is awaiting a reply when
 * the host recorded reaching out and the vendor has not since done any of the
 * things a reply produces. We read those from fields that already exist rather
 * than inventing a `repliedAt` nobody writes — a signed contract, a paid
 * deposit or a confirmed status IS the reply, and is better evidence than a
 * flag because the host cannot forget to tick it.
 */
export function contactState(vendor, now = new Date()) {
  const v = vendor || {};
  const at = asDate(v.lastContactedAt);
  const asOf = asDate(now) || new Date();

  if (!at) {
    // NOT "never contacted" — "we have no record". The host may well have
    // phoned them; the app simply does not know, and must not say otherwise.
    return {
      contactedAt: null, source: null, daysSince: null,
      awaitingReply: false, silent: false, known: false,
    };
  }

  const replied = Boolean(
    v.contractSigned || v.depositPaid || v.balancePaid ||
    String(v.status || '').toLowerCase() === 'confirmed'
  );
  const daysSince = Math.max(0, dayDiff(at, asOf));

  return {
    contactedAt: at.toISOString(),
    source: v.lastContactSource || null,
    daysSince,
    awaitingReply: !replied,
    // Silence is only worth naming once it has run past the same line the
    // readiness score already uses.
    silent: !replied && daysSince >= SILENCE_DAYS,
    known: true,
  };
}

/**
 * The vendors who have gone quiet — the named state surface this unblocks.
 * Only vendors we have a RECORD of contacting can be silent; one we never
 * logged is not silent, it is unknown, and conflating those two is the exact
 * dishonesty this module exists to avoid.
 */
export function silentVendors(event, now = new Date()) {
  const list = Array.isArray(event && event.vendors) ? event.vendors : [];
  return list
    .filter(Boolean)
    .map((v) => ({ vendor: v, state: contactState(v, now) }))
    .filter((x) => x.state.silent)
    .sort((a, b) => b.state.daysSince - a.state.daysSince);
}

/** Vendors with real money committed that we have NO contact record for. This
 *  is the honest sibling of `silentVendors` — not "they ignored you" but "you
 *  have not logged reaching out", which is a different sentence and a
 *  different fix. */
export function uncontactedVendors(event) {
  const list = Array.isArray(event && event.vendors) ? event.vendors : [];
  return list.filter((v) => v && String(v.name || '').trim() && !contactState(v).known);
}
