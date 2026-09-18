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

import { isVendorBooked } from './workstreams';

/** How long silence is allowed to run before it is worth the host's attention.
 *  Matches the 21-day staleness line derive.js already scores against, so the
 *  surface and the score cannot disagree about what "stale" means. */
export const SILENCE_DAYS = 21;

// ── WHICH STATUSES ARE EVIDENCE OF A REPLY (2026-09-18) ──────────────────────
// Read through workstreams.js's isVendorBooked rather than re-listed here. This
// file used to test `status.toLowerCase() === 'confirmed'` — its own private
// seventh copy of a predicate with one canonical home — and every other
// committed status fell through as no reply at all. See contactState below for
// the measurement. The canonical set is case-sensitive on the stored casing, and
// this module has always accepted a lowercase 'confirmed' (a contract its own
// tests lock), so the status is normalised to the stored casing before it is
// asked, instead of the set being copied here in a looser form.
const titleCase = (s) =>
  String(s || '').trim().toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const statusIsCommitted = (status) => isVendorBooked({ status: titleCase(status) });

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
      handedOff: false, awaitingReply: false, silent: false, known: false,
    };
  }

  // A GUEST'S REPLY IS THEIR RSVP (host, 2026-08-07). Guests carry none of the
  // vendor evidence fields, so reading only those would leave every guest
  // "awaiting reply" forever and eventually mark all of them silent — the app
  // confidently telling a host that people who already answered never did.
  // Detected by SHAPE rather than by a passed-in kind: a person with an `rsvp`
  // field is a guest, and shape is what the caller actually has.
  const isGuest = Object.prototype.hasOwnProperty.call(v, 'rsvp');
  const rsvp = String(v.rsvp || '').toLowerCase();
  const replied = isGuest
    // 'pending' / '' is not an answer. Anything else is — including "no", which
    // is a reply: a guest who declined has come back to you.
    ? Boolean(rsvp && rsvp !== 'pending' && rsvp !== 'no-reply' && rsvp !== 'none')
    // ── SIX OF SEVEN STATUSES READ AS SILENCE (audit finding, 2026-09-18) ──
    // This was `status.toLowerCase() === 'confirmed'`. MEASURED with outreach
    // logged 25 days ago (SILENCE_DAYS = 21) and no money flags set, one vendor
    // per status: Considering, Quoted, Contracted, Deposit Paid, Booked and Paid
    // ALL returned silent:true / awaitingReply:true — 6 of 7 — and silentVendors
    // returned all six. Only 'Confirmed' was spared.
    //
    // For the four COMMITTED words that is a straight falsehood about a fact the
    // app already holds: a vendor does not reach Contracted, Deposit Paid, Booked
    // or Paid without having come back to you. The hostv2 vendor card showed an
    // amber "Silent 25 days" chip on a vendor the SAME screen labelled "Locked
    // in", and surfaceRegistry raised "Chase N people who haven't come back to
    // you" about people who had. That contradiction is precisely what the
    // honesty line at the top of this file exists to prevent, so the fix belongs
    // here rather than in the chip.
    //
    // 'Considering' and 'Quoted' stay silent-eligible and that is CORRECT, not
    // an oversight: those mean the host is still shopping, nothing has come back,
    // and 25 days of nothing is exactly the state worth naming.
    //
    // The evidence fields stay ahead of the status word deliberately — a signed
    // contract or a paid deposit is a reply whatever the dropdown says.
    : Boolean(
      v.contractSigned || v.depositPaid || v.balancePaid ||
      statusIsCommitted(v.status)
    );
  const daysSince = Math.max(0, dayDiff(at, asOf));

  // ── A DRAFT IS NOT A HANDOFF (audit finding, 2026-09-18) ──────────────────
  // `CONTACT_SOURCES` has carried 'drafted' since this module was written, for
  // exactly this case, and NOTHING ever passed it — every channel, including
  // the clipboard, stamped 'host-logged'. So copying a draft to read it on your
  // phone was recorded as having reached out, and three weeks later the app
  // told the host "You reached out 21 days ago and haven't heard back", listed
  // the vendor as silent, and marked the readiness score down for it. The host
  // then chases a vendor who was never contacted.
  //
  // 'host-logged' means the host performed a handoff (opened the SMS composer,
  // sent the mail, or ticked "I sent it myself"). 'drafted' means we prepared
  // words and have NO IDEA whether they left the room. The second cannot carry
  // awaitingReply or silent, because both assert the vendor owes a reply — and
  // a vendor who was never written to owes nothing.
  //
  // The stamp is still kept, and `known` stays true: "a draft was prepared on
  // the 3rd" is a real, useful fact. It is just not evidence of contact, and
  // the header of this file already says the app may not claim what it cannot
  // do. This is that rule reaching the one source that was bypassing it.
  const handedOff = (v.lastContactSource || 'host-logged') !== 'drafted';

  return {
    contactedAt: at.toISOString(),
    source: v.lastContactSource || null,
    daysSince,
    // TRUE only when the host actually handed the words over. Surfaces that
    // word this as "you reached out" must read THIS, not `known`.
    handedOff,
    awaitingReply: handedOff && !replied,
    // Silence is only worth naming once it has run past the same line the
    // readiness score already uses — and only for a vendor we know was written
    // to at all.
    silent: handedOff && !replied && daysSince >= SILENCE_DAYS,
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
