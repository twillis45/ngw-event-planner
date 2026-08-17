// ─── THE SURFACE REGISTRY ─────────────────────────────────────────────────────
//
// The attention audit's #1 structural finding, and the one it said buys the most:
//
//     "Every new surface starts life invisible and stays invisible until someone
//      remembers to hand-wire a row. That is not a bug; it is a bug FACTORY."
//
// The roll-up was twelve bespoke index rows, each with its own hand-written `attn` boolean.
// Nothing was automatic. So a surface could hold a real problem and the ranked list would
// never mention it — which is exactly why Risks got a row but never a rank, why the vendor
// conflict engine ran and reached nothing, and why the day-of alert stack could not be seen
// from any other stage.
//
// Measured before this file existed: only 2 of 7 attention producers fed the count. A weather
// risk on an outdoor event could not outrank "Plan the food" — not because it ranked low, but
// because it could not ENTER THE LIST AT ALL.
//
// ── The contract ─────────────────────────────────────────────────────────────
// A surface declares what it can raise. One shape, no exceptions:
//
//     { id, label, domain, raise(event) → [{ severity, title, why, route,
//                                            key?, dueInDays?, leadDays? }] }
//
// WAVE-6 (2026-07-15) — three optional fields, each read off the raiser's OWN engine,
// never invented (null/omitted where the engine has no number):
//   key       — the RECORD this raise is about (vendorId, decisionId, guestId, the
//               responsibility's itemType:itemId…). This is what snooze/dedup keys on:
//               a title carrying a live count ('2 confirmed guests still need seats')
//               changes every time the count moves, and a snooze written against it
//               silently detaches. An aggregate raise with no single record (lodging,
//               ground) declares NO key — the surface id alone is its stable identity.
//   dueInDays — days from today until this item's own deadline (negative = past it),
//               from the engine that already knows it: the decision board's daysOut,
//               a vendor's payDueDate, the COI classifier's dueInDays, the reconfirm
//               window's days-to-event, the lodging deadline.
//   leadDays  — the same number expressed relative to the event (negative, T-Nd form),
//               so the snooze cap (lib/snooze.js, opts.leadDays) can refuse to hide an
//               item whose window is already closed — the wave-6 proof showed 4
//               past-window decisions offered "back Jul 20" because no lead reached
//               the cap on the registry path.
//
// A surface may also declare bundleTitle(n) — the host-language title eventPlan uses
// when the surface contributes ≥3 raises and they collapse into one bundle action.
// The vocabulary is the surface's own raise copy, never new jargon.
//
// The ranked list reads raiseAll(); raiseCounts() is exported for badges when they ship —
// it has no runtime consumer yet (re-audit F7). A surface that declares nothing raises
// nothing — visibly, in one place, instead of silently, in twelve.
//
// severity: 'critical' | 'attention'   (steel/ok are not asks; they do not belong in a list
//                                       of things that need you)
//
// ── The rule this file exists to enforce ─────────────────────────────────────
// Adding a surface here WITHOUT a real raise() is the bug it was written to kill. Every
// raiser below reads an engine that already exists and was already correct in isolation —
// none of them are new intelligence. The failure was never the engines. It was that nothing
// composed them.

import { computeDayAlerts } from './dayAlerts';
import { deriveVendorPromiseConflicts } from './vendorAccountability/conflicts';
import { inferPromisesFromVendor } from './vendorAccountability/derive';
import { openArrivalAsks } from './vendorAsks';
import { playbookRisks, playbookDecisionBoard } from './playbooks';
import { raisesToCommandBoard } from './riskSeverity';
import { evidenceFromDecisionRow } from './decisionEvidence';
import { daysUntil, isEventDay, isPastEvent, daysUntilEnd, rsvpDeadlineFor } from './dates';
import { rsvpHasResponded } from './rsvp';
import { buildVendorPlan } from './vendorPlan';
import { venueFor } from './venueFor';
import { isVendorBooked } from './workstreams';
import { buildSeatingPlan } from './seatingPlan';
import { buildTravelPlan } from './travelPlan';
import { moneyDatesFor } from './moneyDates';
import { costSharingSummary } from './costSharing';
import { deriveHelperResponsibilities, helperStatusLine } from './helperResponsibility';
import { DAY_BEFORE_WINDOW } from './dayBefore';
import { getVendorCOIState, coiNextAction } from './vendorIntelligence';
import { silentVendors } from './vendorContact';

const notDismissed = (event, map, id) => {
  const st = (event && event[map] && typeof event[map] === 'object') ? event[map] : {};
  return st[id] !== 'dismissed';
};

// A vendor-conflict's STABLE, record-derived identity (never its ephemeral c.id —
// see the vendor-conflicts raiser). `kind` + the sorted sourceRef record ids uniquely
// and durably name a conflict; the affected vendor row is the row-level fallback.
function conflictRecordKey(c) {
  const refs = Array.isArray(c && c.sourceRefs)
    ? c.sourceRefs.map((s) => s && s.id).filter(Boolean).sort().join('-')
    : '';
  const kind = c && c.kind ? String(c.kind) : '';
  if (kind && refs) return `${kind}:${refs}`;
  return c && c.affectedVendorId != null ? String(c.affectedVendorId) : null;
}

export const SURFACES = [
  // ── Risks ──────────────────────────────────────────────────────────────────
  // The engine has always run. It reached exactly ONE passive index row ("What could go
  // wrong · N to know about") and never the ranked list — so a weather risk on an outdoor
  // event could not outrank "Plan the food". Only `high` severity raises: a `medium` risk is
  // worth knowing, not worth interrupting for, and inflating the list is how it gets ignored.
  {
    id: 'risks',
    label: 'What could go wrong',
    domain: 'risks',
    route: { tab: 'Risks' },
    bundleTitle: (n) => `Have a plan for ${n} things that could go wrong`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let items = [];
      try { items = (playbookRisks(event) || {}).items || []; } catch (_e) { return []; }
      return items
        .filter((r) => r && r.id && notDismissed(event, 'riskStatus', r.id))
        // RANK, not string equality (2026-08-08, review board). This read
        // `=== 'high'` while the comment above it said "only high severity
        // raises" — meaning high AND ABOVE. `critical` is above `high` and
        // silently failed the test, so the four most serious risks the product
        // has ever authored were the four guaranteed never to reach the board:
        // holidayParty `r_saferides` ("An impaired guest is about to drive
        // home"), `r_overserve`, and dinnerParty `r_dietary`. The 2026-07-14
        // ruling below is untouched — `medium`/`low` still never raise, and the
        // raised action still carries `severity:'attention'`.
        .filter((r) => raisesToCommandBoard(r.severity))
        // A risk record is { id, trigger, severity, mitigation } — it has no `title` and no
        // `description`, and my first pass guessed at both, so every risk rendered as the
        // generic fallback "A risk needs a plan". The TRIGGER is the risk in the host's own
        // terms ("Crabs sell out, wrong size, or price spikes"); the MITIGATION is what to do
        // about it. Reading the record instead of assuming its shape.
        // 'attention', NOT 'critical' (re-audit + host board, 2026-07-14). An authored
        // playbook risk exists from the moment the event is created — raising it 'critical'
        // made every brand-new outdoor event OPEN with "Have a plan for: rain" as its #1,
        // outranking "add your guest list". A worry is not a chore, and a static contingency
        // is not an emergency. 'critical' is reserved for REACTIVE raises: a payment overdue,
        // a vendor who hasn't shown, a same-hour conflict.
        .map((r) => ({
          severity: 'attention',
          title: `Have a plan for: ${r.trigger}`,
          why: r.mitigation || null,
          route: { tab: 'Risks', riskId: r.id },
          key: r.id,                    // WAVE-6: the risk record, not its prose
        }));
    },
  },

  // ── Vendor conflicts ───────────────────────────────────────────────────────
  // Two vendors promising the same hour, a caterer with no kitchen access. The engine
  // computed these and the only consumer was a collapsible bar inside the vendor sheet — a
  // host who never opened that sheet never learned.
  {
    id: 'vendor-conflicts',
    label: 'Between your vendors',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Untangle ${n} conflicts between your vendors`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      if (!vendors.length) return [];
      let conflicts = [];
      try {
        const promises = vendors.flatMap((v) => inferPromisesFromVendor(v, event) || []);
        conflicts = deriveVendorPromiseConflicts(event, promises) || [];
      } catch (_e) { return []; }
      // ROW-LEVEL OR NOT AT ALL (house standing rule). The conflict names the vendor it
      // affects — `affectedVendorId`, not `vendorId`; I read the wrong field first and the
      // ctaDeepLinks suite caught it, which is exactly what that suite is for. A raise we
      // cannot route to a specific row is a raise we do not make: a CTA landing on a tab top
      // is the "pure anxiety" failure this registry exists to end, not to industrialise.
      return conflicts
        .filter((c) => c && c.affectedVendorId)
        .map((c) => ({
          severity: String(c.severity || '').toLowerCase() === 'critical' ? 'critical' : 'attention',
          title: c.title || 'Two vendors need the same thing',
          why: c.explanation || c.recommendedAction || null,
          route: { tab: 'Vendors', vendorId: c.affectedVendorId },
          // IDENTITY-CLASS FIX (2026-07-15): the key must be a STABLE RECORD. The
          // old `c.id || c.affectedVendorId` used c.id — which is minted fresh every
          // render (`cf-${Date.now()}-${counter}`, conflicts.js:16), so the id, and
          // any snooze written against it, changed on the very next recompute and
          // silently detached. Key on the conflict's stable RECORD content instead:
          // its `kind` plus the sorted ids of its sourceRefs (vendor + ROS-segment
          // record ids — all durable), so two distinct conflicts stay distinct and
          // the SAME conflict keeps the SAME id across renders. Falls back to the
          // affected vendor row (still a record) when a conflict carries no refs.
          key: conflictRecordKey(c),
        }));
    },
  },

  // ── Vendor arrival times ───────────────────────────────────────────────────
  // The deadline is authored per category and genuinely varies (catering 3 days, a DJ 7).
  // Only the OVERDUE ones raise — a deadline still in the future is a chip on the card, not
  // an interruption.
  {
    id: 'vendor-arrivals',
    label: 'Arrival times',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Get ${n} vendors' arrival times`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let asks = [];
      try { asks = openArrivalAsks(event) || []; } catch (_e) { return []; }
      return asks
        .filter((x) => x.ask && x.ask.overdue)
        .map((x) => ({
          severity: 'attention',
          title: `Get ${x.vendor.name}'s arrival time`,
          why: x.ask.why,
          route: { tab: 'Vendors', vendorId: x.vendor.id },
          key: x.vendor.id,             // WAVE-6: the vendor record
        }));
    },
  },

  // ── T-72h reconfirm sweep ──────────────────────────────────────────────────
  // HostShellV2 computes `reconfirmables` locally (HostShellV2.jsx ~1505) and renders a
  // banner only — a host who never saw the banner never learned, and the ranked list never
  // counted it. Same predicate as the shell: a NAMED vendor, inside the last three days
  // (days 0..3), who hasn't answered yet (`reconfirmed72` truthy = answered, same truthy
  // read as the shell's own skip at ~1635). Informal helpers (`isInformal`) never raise —
  // a friend bringing the cooler is not put through a paid-vendor reconfirm ask
  // (host-appropriate vendor UI rule); the shell banner applies the same filter (~1508).
  {
    id: 'vendor-reconfirm',
    label: 'The reconfirm window',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Reconfirm ${n} vendors for the day`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days < 0 || days > 3) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      // The window, in the host's own time words — same ladder as the shell's banner
      // eyebrow (Today / Tomorrow / N days out).
      const when = days === 0 ? 'your event is today'
        : days === 1 ? 'your event is tomorrow'
        : `the event is ${days} days out`;
      return vendors
        .filter((v) => v && v.id && String(v.name || '').trim() && !v.isInformal && !v.reconfirmed72)
        .map((v) => ({
          severity: 'attention',
          title: `Reconfirm ${v.name} for the day`,
          why: `${when} — a quick reconfirm now beats a no-show`,
          route: { tab: 'Vendors', vendorId: v.id },
          key: v.id,                    // WAVE-6: the vendor record
          // WAVE-6: the window's own clock — a reconfirm is due by event day
          // (days-to-event is the raiser's own gate, 0..3), lead 0 by definition.
          dueInDays: days,
          leadDays: 0,
        }));
    },
  },

  // ── The day itself ─────────────────────────────────────────────────────────
  // computeDayAlerts knows a vendor hasn't shown, that a guest has an allergy the caterer was
  // never told about, that a payment is due today. It was rendered ONLY inside
  // `stage === 'day'`, so it contributed nothing to any count and was invisible from
  // anywhere else in the app. On the day, it IS the list.
  {
    id: 'day-of',
    label: 'The day',
    domain: 'day',
    route: { tab: 'Event Day Schedule' },
    bundleTitle: (n) => `${n} things need you today`,
    raise(event) {
      if (!isEventDay(event && event.date)) return [];
      let alerts = [];
      try { alerts = computeDayAlerts(event) || []; } catch (_e) { return []; }
      return alerts.map((a) => ({
        severity: a.tier === 'critical' ? 'critical' : 'attention',
        title: a.headline || 'Something needs you today',
        why: a.move || null,
        // Always the Day stage. The old branch emitted a bare {tab:'Vendors'} with no
        // vendorId — the tab-top landing the house rule forbids. On the day, the Day stage
        // IS where these alerts are actionable.
        route: { tab: 'Event Day Schedule' },
        key: a.id || null,              // WAVE-6: the alert's own id ('ov-v1', 'dietary'…)
        dueInDays: 0,                   // WAVE-6: isEventDay is the raiser's own gate — due today
      }));
    },
  },

  // ═══ WAVE-5 COVERAGE (2026-07-15) ════════════════════════════════════════════
  // The re-score's finding: four attention producers still bypassed this ledger —
  // hand-wired `attn` booleans on the shell's quiet-index rows (seating, lodging,
  // flights, rides), the day-before helper confirms, overdue board decisions beyond
  // the ladder's one, and the one-slot ladder tiers where two overdue payments
  // produced at most one card anywhere. Every raiser below READS an engine that
  // already exists; none invents a threshold. Where a raise duplicates a ladder
  // tier's copy, the TITLE is the ladder's verbatim — eventPlan's titleKey dedup
  // collapses the two into one card instead of two phrasings of the same debt.

  // ── Seating ────────────────────────────────────────────────────────────────
  // The shell's quiet-index row (HostShellV2 qidx, key 'seating') computes
  // attn: seating.totals.unassigned > 0, gated on seating.hasRoster &&
  // seating.totals.confirmed > 0 — a hand-wired boolean the ranked list never
  // saw. Same engine (buildSeatingPlan), same predicate, mirrored exactly.
  // ── A REQUIRED VENDOR NOBODY HAS ACTUALLY BOOKED (2026-08-17) ────────────
  // W8's third Coverage cap, and the shell documents it against itself at
  // HostShellV2.jsx:9189 — "no SURFACES id covers 'not yet booked' ... add a real
  // raiser before adding another."
  //
  // Measured before this existed, with a Caterer at `Shortlisted` and a DJ at
  // `Contacted`: at T-120, T-45, T-20, T-7 and even T-3 the ranked list said
  // NOTHING about either. Twenty raises three days before a wedding and not one
  // of them was "you have no caterer". The only matches at any distance were two
  // standing risk cards that render whether every vendor is booked or none is.
  //
  // THE THRESHOLD IS AUTHORED, NOT INVENTED. Playbooks declare a booking lead per
  // category — `{ category: 'Caterer', required: true, when: 'T-300d' }`
  // (wedding.js:114) — so "should have been booked by now" is a declared fact, the
  // same shape as the reply-by date the silent-guest raiser reads.
  //
  // MATCHED IS NOT BOOKED. `buildVendorPlan`'s `booked` field means a vendor row
  // EXISTS in that category; vendorPlan.js documents that distinction deliberately
  // rather than changing it. A Shortlisted caterer is matched and not booked, and
  // that is exactly the case this raiser exists for — so it resolves `vendorId`
  // and asks `isVendorBooked`, the one canonical status vocabulary.
  {
    id: 'vendor-unbooked',
    label: 'People you\u2019re hiring',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `${n} key vendors are still not booked`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let dte = null;
      try { dte = daysUntil(event && event.date); } catch (_e) { return []; }
      if (dte == null || dte < 0) return [];
      let plan = null;
      try { plan = buildVendorPlan(event); } catch (_e) { return []; }
      if (!plan || !plan.relevant || !Array.isArray(plan.categories)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      const out = [];
      for (const row of plan.categories) {
        if (!row || !row.required) continue;              // optional roles are never nagged
        // THE VENUE IS EVIDENCED BY THE EVENT, NOT ONLY BY A VENDOR ROW. Caught
        // before shipping: this raised "No venue booked yet" on an event whose
        // venue reads "The Hall". The playbook lists Venue as a required VENDOR
        // category, and a host who typed a venue name never creates a vendor row
        // for it — so the category looked unmatched while the fact was plainly on
        // the event. Telling that host they have no venue is the kind of wrong
        // that makes a host stop believing the rest of the list.
        //
        // Reads through venueFor rather than the raw field: that helper exists
        // because a venue field holding "Santa Fe, NM" is a CITY, not a venue
        // name, and this must not accept a town as a booked hall.
        //
        // (Phrased without the raw accessor on purpose — venueSourceProof scans
        // source text and does not strip comments, so writing the forbidden form
        // even to say "not this" trips the CITY-LEAK guard. It caught this
        // comment, which is the scanner being blunt rather than wrong.)
        if (/venue/i.test(String(row.category))) {
          let vname = '';
          try { vname = String((venueFor(event) || {}).name || '').trim(); } catch (_e) { vname = ''; }
          if (vname) continue;
        }
        // The authored window, e.g. 'T-300d' -> 300 days before the event.
        const m = /^T-(\d+)d$/.exec(String(row.when || ''));
        if (!m) continue;                                  // no declared lead, no claim to be late
        const lead = Number(m[1]);
        const dueInDays = dte - lead;                      // negative once the window has passed
        if (dueInDays >= 0) continue;                      // still inside the window
        const matched = row.vendorId ? vendors.find((v) => v && v.id === row.vendorId) : null;
        let booked = false;
        try { booked = !!(matched && isVendorBooked(matched)); } catch (_e) { booked = false; }
        if (booked) continue;                              // genuinely handled — say nothing
        out.push({
          severity: 'attention',
          title: matched
            ? `${row.category} is not booked yet \u2014 ${matched.name || 'your pick'} is still just a shortlist`
            : `No ${String(row.category).toLowerCase()} booked yet`,
          why: `Most ${String(row.category).toLowerCase()}s are booked by ${row.when.replace('T-', '')} out; you are ${Math.abs(dueInDays)} days past that.`,
          ask: `Book your ${String(row.category).toLowerCase()}.`,
          route: matched ? { tab: 'Vendors', vendorId: matched.id } : { tab: 'Vendors' },
          key: `vendor-unbooked:${row.category}`,
          dueInDays,
          leadDays: -lead,
        });
      }
      return out;
    },
  },
  // ── THE REPLY-BY PASSED AND NOBODY SAID ANYTHING (2026-08-17) ────────────
  // W8 named this as a Coverage cap — "the missing reply-by/silent-guest
  // PRODUCER" — and re-derivation confirmed it, five weeks on. Measured: a
  // Wedding with a hard reply-by five days past and three of five guests silent
  // produced FOURTEEN raises and not one of them was about the silence. The only
  // RSVP-ish match was the pre-authored risk card "Final headcount wrong or late
  // to the caterer", which renders identically whether every guest has replied or
  // none has — a standing worry, not a raise about this event's actual state.
  //
  // EVERY OTHER PIECE ALREADY EXISTED. `rsvpDeadlineFor` reads the date,
  // `rsvpHasResponded` reads the state, and `draftRsvpChase` writes the message.
  // The capability was complete and nothing asked for it — the same one-wire-short
  // shape found repeatedly in this codebase.
  //
  // WHICH DEADLINES THIS CAN FIRE ON — corrected after red-proof, because my
  // first comment here described behaviour the code does not have.
  //
  // I wrote "hard: true only for a date the HOST set". That is WRONG.
  // `rsvpDeadlineFor` (dates.js:152) returns hard: true for BOTH the explicit
  // `event.rsvpDeadline` override AND its own derived default of event − 7d;
  // only the "<7 days out, no firm date to give" case is hard: false.
  //
  // In practice this raiser still fires only on a host-set date, but for a
  // different reason than the guard below suggests: a DERIVED deadline is
  // event − 7d, which is never in the past while the event is still ≥7 days
  // away, and inside 7 days the answer switches to hard: false with a POSITIVE
  // `days`. So neither non-override branch can satisfy `days <= 0`, and the
  // `hard !== true` line is presently unreachable.
  //
  // It stays as belt-and-braces — if that derivation ever changes, this refuses
  // rather than starts nagging about a date nobody agreed to — but it is
  // documented as unreachable so nobody reads it as the load-bearing rule. The
  // load-bearing rule is `days >= 0`.
  //
  // Found because a red-proof that removed the guard turned NOTHING red.
  {
    id: 'rsvpchase',
    label: 'Guest list',
    domain: 'guests',
    route: { tab: 'Guests' },
    bundleTitle: (n) => `${n} guests still have not replied`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let dl = null;
      try { dl = rsvpDeadlineFor(event); } catch (_e) { return []; }
      if (!dl || dl.hard !== true) return [];              // only a date the host actually set
      // STRICTLY past, not "not future". `days > 0` let ZERO through, and zero is
      // the derived deadline landing exactly on today — which happens at exactly
      // 7 days out, since the derived date is event − 7d. The raise fired and
      // rendered "Your reply-by date passed 0 days ago". Today is not late.
      // Caught by sweeping the range instead of spot-checking at 20 days.
      if (!Number.isFinite(dl.days) || dl.days >= 0) return [];
      const guests = Array.isArray(event && event.guests) ? event.guests : [];
      if (!guests.length) return [];                       // headcount events have nobody to chase
      const silent = guests.filter((g) => {
        try { return g && g.id != null && !rsvpHasResponded(g); } catch (_e) { return false; }
      });
      if (!silent.length) return [];                       // everyone answered — say nothing
      // ROW-LEVEL OR NOT AT ALL: land on the first person still owed a reply.
      const first = silent[0];
      const n = silent.length;
      const late = Math.abs(dl.days);
      return [{
        severity: 'attention',
        title: n === 1 ? '1 guest still has not replied' : `${n} guests still have not replied`,
        why: `Your reply-by date passed ${late === 1 ? 'yesterday' : `${late} days ago`} · ${guests.length - n} of ${guests.length} have answered`,
        ask: 'Chase the missing replies.',
        route: { tab: 'Guests', guestId: first.id },
        key: 'rsvp-chase',
        dueInDays: dl.days,                                 // negative: it is genuinely past
        leadDays: null,
      }];
    },
  },
  {
    id: 'seating',
    label: 'Who sits where',
    domain: 'guests',
    route: { tab: 'Seating' },
    bundleTitle: (n) => `${n} confirmed guests still need seats`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let plan = null;
      try { plan = buildSeatingPlan(event); } catch (_e) { return []; }
      if (!plan || !plan.hasRoster) return [];             // headcount events never get invented names to seat
      if (!(plan.totals && plan.totals.confirmed > 0)) return [];
      if (!(plan.totals.unassigned > 0)) return [];
      // ROW-LEVEL OR NOT AT ALL: routeSheet's 'Seating' branch lands on the exact
      // guest row when the route names one (sheet.focus = guestId). The first
      // unassigned guest IS the row where the work starts. No id → no raise.
      const first = (plan.unassigned || []).find((g) => g && g.id != null);
      if (!first) return [];
      const n = plan.totals.unassigned;
      return [{
        severity: 'attention',
        title: n === 1 ? '1 confirmed guest still needs a seat' : `${n} confirmed guests still need seats`,
        why: `${plan.totals.seated} of ${plan.totals.confirmed} confirmed guests are seated`,
        // THIS SURFACE'S DOMAIN IS NOT ITS JOB (host report, 2026-07-30). `domain` is
        // 'guests' because seating is guest work, but the JOB is seating, and
        // heroAskFor's guests branch matched the title's "guests" and asked
        // "Add who's coming." — so a host whose guests were already confirmed got a
        // headcount stepper that could not touch the thing being raised. The ask is
        // authored here, where the job is actually known, and heroAskFor prefers it
        // over its own prose classification.
        ask: 'Seat your guests.',
        // The route still lands ON the first unassigned guest's row (row-level or not
        // at all) — but that guest is NOT this raise's identity.
        route: { tab: 'Seating', guestId: first.id },
        // IDENTITY-CLASS FIX (2026-07-15): NO key — a RECORDLESS AGGREGATE. This is
        // ONE debt about the whole unassigned SET ("N still need seats"), not about
        // any single guest. Wave-6 keyed it on the first-unassigned guest to escape
        // the count-in-title id — but that only moved the moving target: seat that
        // very guest and `first` advances to the next one, so the id jumped and the
        // snooze detached exactly when the host acted on the debt. The surface id
        // ALONE (`surface:seating`) is the stable identity — it does not move as the
        // count falls, whichever guest gets seated. Same treatment as lodging /
        // travel-ground below; all three are on the recordless-aggregate allow-list.
      }];
    },
  },

  // ── Lodging deadline ───────────────────────────────────────────────────────
  // Shell qidx row key 'lodging': attn only when there is BOTH a real gap
  // (lodging.notBookedCount > 0 — roster mode only; the lib returns null in
  // headcount mode rather than claiming 0) AND a real dated obligation
  // (lodging.deadline, an ISO day the host entered). The lib (travelPlan.js
  // buildTravelPlan) carries no urgency logic beyond these two facts, so the
  // shell predicate and the lib agree — no divergence to note.
  // Money-Safe Date Chain (MVP #1): the host transcribed real deadlines from
  // their booking — raise them while they can still act (14-day window), and
  // lead with the exposure when they've fronted money against a closing
  // refund window. Route lands on the Travel sheet where the dates live.
  {
    id: 'money-dates',
    label: 'Money-safe dates',
    domain: 'travel',
    route: { tab: 'Travel' },
    bundleTitle: (n) => `${n} money deadlines closing in`,
    raise(event) {
      // Span-aware: mid-span (day 2 of 3) is NOT past — the single-day
      // isPastEvent(event.date) guard the sibling raisers use suppressed this
      // raise while the event was live (caught on the 2026-07-27 drive; the
      // sibling raisers' guards are the wave-3 lifecycle sweep's job).
      const de = daysUntilEnd(event);
      if (de != null && de < 0) return [];
      let m = null;
      try { m = moneyDatesFor(event); } catch (_e) { return []; }
      if (!m || !m.relevant) return [];
      const due = m.rows.filter((r) => !r.passed && r.daysLeft <= 14);
      if (!due.length) return [];
      const first = due[0];
      // THREE DEFECTS, all hidden by the old explicit-field-list normalizer and
      // found 2026-08-17 when it was inverted:
      //   1. `because:` — the ONLY raiser spelling it that way (18 author `why`).
      //      No consumer reads `.because` on a raise, so **the exposure line has
      //      never reached a host**: every money-deadline raise shipped with no
      //      reason at all. The sibling at ~:752 maps `r.because || null` INTO
      //      `why`, which is the convention this drifted from.
      //   2. `'urgent'` — outside the declared vocabulary ('critical' |
      //      'attention', contract at the top of this file), so the normalizer
      //      canonicalized it and the sharpening branch never had an effect.
      //      Now expressed where it is actually read: dueInDays.
      //   3. no `dueInDays` — so a deadline 1 day out ranked identically to one
      //      13 days out. The nearness this raiser is entirely about could not
      //      reach the ranker.
      let dte = null;
      try { dte = daysUntil(event && event.date); } catch (_e) { dte = null; }
      return [{
        severity: 'attention',
        title: `${first.label} in ${first.daysLeft} ${first.daysLeft === 1 ? 'day' : 'days'}`,
        why: m.exposureLine || `${first.note}.`,
        // NO `moneyKey`, deliberately — this was tried on 2026-08-17 and
        // reverted, measured. actionReason's MONEY branch (priority 2, above
        // `time`) needs one and emits "payment due in N days", so attaching it
        // looked like the way to make a money deadline reason as MONEY rather
        // than as a clock. It buys nothing and can lie:
        //   · these titles already state the deadline ("Next payment due in 4
        //     days"), so `addsBeyondTitle` correctly drops a reason that merely
        //     repeats it — measured null, not "payment due in 4 days";
        //   · and of the three row kinds only `installment` IS a payment. A
        //     refund window is a deadline to CANCEL by and a headcount is a
        //     number, so keying those would tell the host a bill exists.
        // Pinned by moneyDateReasonKind.test.js so it is not re-attempted.
        route: { tab: 'Travel' },
        key: first.id != null ? String(first.id) : 'money-date',
        dueInDays: first.daysLeft,
        leadDays: dte != null ? first.daysLeft - dte : null,
      }];
    },
  },
  {
    id: 'lodging',
    label: 'Where everyone stays',
    domain: 'travel',
    route: { tab: 'Travel' },
    bundleTitle: (n) => `${n} lodging deadlines to watch`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      // ── THE RENTAL SHORTLIST IS AN OPEN DECISION (review board 2026-07-28) ──
      // This surface only ever knew the HOTEL ROOM-BLOCK model: it keyed on
      // notBookedCount and a deadline. A host could shortlist eighteen rental
      // houses and the plan raised nothing at all, because `lodgingOptions` was
      // read by no engine anywhere. Weighing options and never choosing is a real
      // open decision — usually the largest one in the event — and it belongs in
      // the same ledger as every other thing waiting on her.
      //
      // Raised ONLY while she is genuinely mid-decision: two or more options and
      // none chosen. One option is not a comparison, and a made choice is not a
      // question. Nothing is invented — the count is hers.
      //
      // DELIBERATELY ABOVE the destination-relevance gate. That gate exists for
      // the hotel room-block model, and it was swallowing this row: a host who
      // has shortlisted two rental houses has PROVEN lodging matters by her own
      // action, whatever the engine has classified her event as. Self-gating on
      // opts.length >= 2 is the honest condition here.
      const opts = Array.isArray(event && event.lodgingOptions) ? event.lodgingOptions.filter(Boolean) : [];
      const picked = opts.some((o) => o && o.status === 'chosen');
      if (opts.length >= 2 && !picked) {
        return [{
          severity: 'attention',
          title: `${opts.length} places on your shortlist — none picked yet`,
          why: 'Until one is the pick, the plan can’t count what it costs',
          route: { tab: 'Travel', focusField: 'lodging' },
          id: 'lodging-unpicked',
          domain: 'travel',
        }];
      }

      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];          // destination events only — the engine's own gate
      const lg = travel.lodging || {};
      if (!(lg.notBookedCount != null && lg.notBookedCount > 0 && lg.deadline)) return [];
      const total = (lg.roster || []).length;
      const by = (() => {
        try { return new Date(lg.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        catch (_e) { return lg.deadline; }
      })();
      return [{
        severity: 'attention',
        title: `${lg.notBookedCount} of ${total} haven’t booked a room yet`,
        why: `Rooms need to be booked by ${by}`,
        // The deadline card is the row this raise is about — routeSheet's lodging
        // branch focuses it ('lodging-deadline' → sheet.focus 'deadline').
        route: { tab: 'Travel', focusField: 'lodging-deadline' },
        // WAVE-6: NO key — an aggregate raise about one shared deadline; the surface
        // id alone is its stable identity (the not-booked count moves, the id must not).
        // The deadline is the host's own dated obligation — its clock is real.
        dueInDays: (() => { try { return daysUntil(lg.deadline); } catch (_e) { return null; } })(),
      }];
    },
  },

  // ── Flight conflicts ───────────────────────────────────────────────────────
  // Shell qidx row key 'air': attn when (travel.air.conflicts || []).length > 0.
  // The conflicts come from the lib itself (travelPlan.js: arrives after the
  // event starts / leaves before it ends — only ever claimed from dates it can
  // actually read). One raise per conflict, each routed to that guest's own
  // arrivals-board row (routeSheet /^air/ + guestId).
  {
    id: 'travel-air',
    label: 'Getting here',
    domain: 'travel',
    // focusField:'air-board' is load-bearing — bare {tab:'Travel'} resolves to the
    // LODGING sheet (resolver's Travel catch fires before any air branch). The
    // air discriminator lands the flights bundle on the arrivals board.
    route: { tab: 'Travel', focusField: 'air-board' },
    bundleTitle: (n) => `${n} guests' flights don't line up with the event`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];
      const conflicts = (travel.air && travel.air.conflicts) || [];
      return conflicts
        // Row-level or not at all: a conflict without a guestId has no row to land on.
        .filter((c) => c && c.guestId != null)
        .map((c) => ({
          severity: 'attention',
          title: c.type === 'leaves_early'
            ? `${c.name}’s flight leaves before the event ends`
            : `${c.name} lands after the event starts`,
          why: c.copy || null,
          route: { tab: 'Travel', focusField: 'air-board', guestId: c.guestId },
          // WAVE-6: guest record + conflict type — one guest can hold BOTH an
          // arrives-late and a leaves-early conflict; the type keeps them distinct.
          key: `${c.guestId}:${c.type || 'conflict'}`,
        }));
    },
  },

  // ── Ride gaps ──────────────────────────────────────────────────────────────
  // Shell qidx row key 'ground': attn when travel.rosterMode && ground.unmatched > 0
  // && ground.transportProvided !== true. `unmatched` is the lib's own count
  // (needRide.length − offeredSeats, floor 0) — the gap the HOST closes by
  // introducing riders to drivers or settling group transport, never an
  // auto-assignment. One aggregate raise: the gap is one number, and its row is
  // the riders block ('ground-riders' → sheet.focus 'riders').
  {
    id: 'travel-ground',
    label: 'Getting around',
    domain: 'travel',
    route: { tab: 'Travel' },
    bundleTitle: (n) => `${n} guests still need a way around`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];
      const gr = travel.ground || {};
      if (!(travel.rosterMode && gr.unmatched > 0 && gr.transportProvided !== true)) return [];
      const seats = gr.offeredSeats || 0;
      return [{
        severity: 'attention',
        title: gr.unmatched === 1
          ? '1 guest still needs a way around'
          : `${gr.unmatched} guests still need a way around`,
        why: `${(gr.needRide || []).length} need a ride · ${seats} seat${seats === 1 ? '' : 's'} offered — introduce riders to drivers, or settle group transport`,
        route: { tab: 'Travel', focusField: 'ground-riders' },
        // WAVE-6: NO key — the gap is one aggregate number (unmatched riders); the
        // surface id alone is the stable identity, whatever the count says today.
      }];
    },
  },

  // ── Helper confirms ────────────────────────────────────────────────────────
  // dayBefore.js (sections, key 'helpers') derives these from
  // deriveHelperResponsibilities and asks "Confirm X is still bringing Y" — but
  // only ever rendered them inside the day-before plan, so they never raised
  // (dayBefore.js ~155-171). Same engine, same T-window (DAY_BEFORE_WINDOW,
  // days 0..2 — the plan's own applicability gate), same ask copy. Each raise
  // routes to the responsibility's OWN row route (the lib authors it per item:
  // food line, task row, ROS cue, supplies card, informal-vendor row).
  {
    id: 'helpers',
    label: 'People bringing things',
    domain: 'day',
    // focusField:'space' is load-bearing — bare {tab:'Planning'} resolves to the
    // TASKS checklist (resolver's Planning catch). Helpers live on the "Space,
    // seats & helpers" sheet, so the space discriminator lands the bundle there.
    route: { tab: 'Planning', focusField: 'space' },
    bundleTitle: (n) => `Confirm ${n} helpers are still bringing what they offered`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days < DAY_BEFORE_WINDOW.from || days > DAY_BEFORE_WINDOW.to) return [];
      let resp = [];
      try { resp = (deriveHelperResponsibilities(event) || {}).responsibilities || []; } catch (_e) { return []; }
      return resp
        // 'assigned' is the only asking state — confirmed/handled need nothing.
        // Row-level or not at all: the lib's own per-item route is the row.
        .filter((r) => r && r.status === 'assigned' && r.route && r.route.tab)
        .map((r) => ({
          severity: 'attention',
          title: `Confirm ${r.helperName} is still bringing ${r.label}`,
          why: helperStatusLine(r),
          route: r.route,
          // WAVE-6: the responsibility's own record — the lib keys each item as
          // itemType + itemId (food line / task row / ROS cue / supplies / vendor).
          key: (r.itemType != null && r.itemId != null) ? `${r.itemType}:${r.itemId}` : null,
        }));
    },
  },

  // ── Overdue board decisions ────────────────────────────────────────────────
  // The ladder's board tier (CommandCenter _selectEventNextActionInner, tier 7.8)
  // surfaces ONE overdue decision — `Resolve "${label}".` — and every overdue
  // decision beyond the first raised nothing anywhere. Same board
  // (playbookDecisionBoard: decisionDueDate windows + the overdue-on-creation
  // reachability guard are the board's own rules, inherited not re-derived),
  // one raise per overdue row. TITLE IS THE LADDER'S VERBATIM so when both
  // produce the same decision, titleKey collapses them to one card.
  // Severity 'attention', not 'critical' — an overdue self-authored decision is
  // a late chore, not an emergency (same doctrine as the risks surface above).
  // Same pre-event gate as the ladder's lifecycle projection (days > 0): on the
  // day, the Day stage IS the list.
  {
    id: 'decisions',
    label: 'Calls to make',
    domain: 'plan',
    route: { tab: 'Decisions' },
    bundleTitle: (n) => `Resolve ${n} decisions — they're past their easy window`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days <= 0) return [];
      let board = null;
      try { board = playbookDecisionBoard(event); } catch (_e) { return []; }
      return ((board && board.open) || [])
        .filter((r) => r && r.id && r.status === 'overdue')
        .map((r) => ({
          severity: 'attention',
          title: `Resolve "${r.label}".`,
          why: r.because || null,
          // The decision's own row: routeSheet's 'Decisions' branch focuses the
          // sheet on decisionId (same addressing the shell uses for a single call).
          route: { tab: 'Decisions', decisionId: r.id },
          // WAVE-6: the decision RECORD — eventPlan folds this into the canonical
          // cross-producer id ('decision:<id>') so a snooze follows the debt whether
          // the ladder's tier or this raiser surfaces it.
          key: r.id,
          // WAVE-6: the board's own clock. daysOut IS days-from-today until the
          // decision's window (dte + authored offset), so dueInDays = daysOut and
          // leadDays = daysOut − dte recovers the authored T-Nd exactly. This is
          // what lets the snooze cap REFUSE on a past-window decision — the wave-6
          // proof caught 4 of them being offered "back Jul 20".
          dueInDays: Number.isFinite(r.daysOut) ? r.daysOut : null,
          leadDays: Number.isFinite(r.daysOut) ? r.daysOut - days : null,
          // ── THE BOARD'S CONSEQUENCE SURVIVES THE BOUNDARY (2026-07-31) ──────
          // playbookDecisionBoard scores every row on weight, reversibility,
          // heart, and how much it unblocks (gateHolder / _dependedOnCount), then
          // sorts on it. Until now only `daysOut` crossed this boundary, so all
          // of that ranking was computed and thrown away: downstream, every
          // decision was just a date, and the action list re-sorted them on the
          // date alone. The consequential call and the incidental one arrived
          // indistinguishable, and whichever had the nearer window won.
          // These are the board's OWN numbers, not new ones invented here.
          priorityScore: Number.isFinite(r.priorityScore) ? r.priorityScore : null,
          gateHolder: r.gateHolder === true,
          unlocks: Number.isFinite(r._dependedOnCount) ? r._dependedOnCount : 0,
          // The authored question, so the host reads the decision as written.
          ask: r.ask || null,
          // ── THE EVIDENCE ENVELOPE (2026-07-31) ────────────────────────────
          // The board already computed the rank sentence, the importance basis
          // and thirteen grounded axes with cited sources. Carried whole from
          // here so a recommendation can answer "why this?" downstream. Read-only
          // projection of THIS row — see lib/decisionEvidence.js.
          evidence: evidenceFromDecisionRow(r),
        }));
    },
  },

  // ── Overdue vendor payments ────────────────────────────────────────────────
  // The ladder's tier 4 reads vendor fields directly (payDueDate && !balancePaid
  // && (cost || 0) > 0, due date past) and returns the SINGLE most overdue —
  // so two overdue payments produced at most one card anywhere. Same predicate,
  // one raise per overdue payment. 'critical' is earned here: reactive, real
  // money owed to a real vendor. TITLE IS THE LADDER'S VERBATIM ("Send payment
  // to X.") so the ladder's copy of the most-overdue one and ours collapse.
  {
    id: 'vendor-payments',
    label: 'Money you owe',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Send payment to ${n} vendors`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      let dte = null;
      try { dte = daysUntil(event && event.date); } catch (_e) { dte = null; }
      const out = [];
      for (const v of vendors) {
        if (!v || !v.id) continue;
        if (!(v.payDueDate && !v.balancePaid && (v.cost || 0) > 0)) continue;
        let od = null;
        try { od = daysUntil(v.payDueDate); } catch (_e) { continue; }
        if (od == null || od >= 0) continue;               // future due dates are chips, not interruptions
        const late = Math.abs(od);
        out.push({
          severity: 'critical',
          title: `Send payment to ${v.name || 'this vendor'}.`,
          why: `Balance was due ${late} ${late === 1 ? 'day' : 'days'} ago`,
          // Same row the ladder routes to: the vendor's payment section.
          route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'payment' },
          key: v.id,                    // WAVE-6: the vendor record
          // WAVE-6: the vendor's own due date, live. leadDays re-expresses it
          // relative to the event so the snooze cap's arithmetic holds (moot for a
          // critical — unsnoozeable — but ordering reads dueInDays either way).
          dueInDays: od,
          leadDays: dte != null ? od - dte : null,
        });
      }
      return out;
    },
  },

  // ── A declared pool nobody has been given a number for ─────────────────────
  // Coverage gap found 2026-08-17: `costSharing` had a sheet, an engine and a
  // section-directory row, and NOTHING that could raise.
  //
  // WHAT THIS DELIBERATELY DOES NOT DO. The obvious raise — "your guests still
  // owe you $600" — is unbuildable and stays unbuilt. `costSharingSummary`
  // returns tiers and amounts with **no headcount and no per-guest payment
  // record**; costSharing.js:36 says so on purpose ("with per-tier headcounts
  // unknown, no pool total exists"). That raise would invent the debt, not just
  // its timing. See docs/audits/2026-08-17_COST_SHARING_RAISE_BOARD.md.
  //
  // WHAT IT DOES. The host declared an ongoing pool and never said what anyone
  // contributes — their own half-finished setup, which the engine already
  // distinguishes ("contribution tiers not set yet" / "amounts not set yet").
  // The subject of the sentence is the host's setup, never a guest's debt.
  //
  // THE THRESHOLD IS BORROWED, NOT INVENTED. The pool carries no date of its
  // own, so this stays silent until a REAL authored commitment is coming: a
  // vendor's host-entered `payDueDate` with a balance still owed — the same
  // field `vendor-payments` gates on. No bill, no raise.
  {
    id: 'dues-unpriced',
    label: 'Who pays for what',
    domain: 'travel',
    route: { tab: 'Travel', focusField: 'costshare' },
    bundleTitle: () => 'Set what each group contributes',
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      // Cost sharing is DESTINATION-ONLY — a local event renders "everyone
      // covers their own costs" and has no pool to set up. Raising there would
      // speak where the surface itself refuses to exist.
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];

      let cs = null;
      try { cs = costSharingSummary(event); } catch (_e) { return []; }
      if (!cs || !cs.pooled) return [];                    // self-pay owes nobody a number
      // Fully priced is finished setup. Partially priced still understates —
      // the engine withholds oneOfEachTotal for exactly that reason.
      const incomplete = cs.tierCount === 0 || cs.pricedTierCount < cs.tierCount;
      if (!incomplete) return [];

      // The borrowed deadline: the soonest real bill the pool has to meet.
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      let soonest = null;
      for (const v of vendors) {
        if (!v || !v.payDueDate || v.balancePaid || !(v.cost > 0)) continue;
        let d = null;
        try { d = daysUntil(v.payDueDate); } catch (_e) { continue; }
        if (d == null) continue;
        if (soonest == null || d < soonest.days) soonest = { days: d, name: v.name || 'a vendor' };
      }
      if (!soonest) return [];                             // no bill, no nagging

      let dte = null;
      try { dte = daysUntil(event && event.date); } catch (_e) { dte = null; }
      const d = soonest.days;
      const when = d < 0
        ? `was due ${Math.abs(d)} ${Math.abs(d) === 1 ? 'day' : 'days'} ago`
        : d === 0 ? 'is due today' : `is due in ${d} ${d === 1 ? 'day' : 'days'}`;
      return [{
        // ALWAYS `attention`, on two counts. Weiss's override — "do not nag
        // about money on a schedule of the app's choosing" — and the mechanical
        // one: raiseAll collapses everything that is not 'critical' to
        // 'attention' (~:1028), so an authored 'urgent' evaporates. Nearness
        // rides `dueInDays`, which the ranker actually reads.
        // NOTE, not fixed here: `money-dates` (~:540) authors 'urgent' through
        // that same normalizer, so its sharpening branch has never had an
        // effect. Pre-existing and out of scope for this change.
        severity: 'attention',
        title: 'Set what each group contributes.',
        why: cs.tierCount === 0
          ? `You're collecting dues and haven't set the tiers yet — ${soonest.name}'s balance ${when}`
          : `Some tiers still have no amount — ${soonest.name}'s balance ${when}`,
        route: { tab: 'Travel', focusField: 'costshare' },
        key: 'dues-unpriced',
        dueInDays: d,
        leadDays: dte != null ? d - dte : null,
      }];
    },
  },

  // ── Overdue COI asks ───────────────────────────────────────────────────────
  // The ladder's tier 4.2 surfaces only ONE critical COI, and only criticals.
  // Same classifier (getVendorCOIState — dueInDays is its own "due 30 days out"
  // line, overdue = dueInDays <= 0; 'expired' is critical outright), one raise
  // per vendor whose ask is genuinely overdue. Severity is the classifier's:
  // 'critical' ONLY where the ladder called it critical (coi.level), everything
  // else 'attention'. A future-dated ask never raises — a deadline still ahead
  // is a chip on the card (same rule as vendor-arrivals above). Copy comes from
  // the shared coiNextAction so the ladder, the vendor detail, and this raise
  // can never disagree — and the ladder's card dedups against ours by title.
  {
    id: 'vendor-coi',
    label: 'Proof of insurance',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Get proof of insurance from ${n} vendors`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      let dte = null;
      try { dte = daysUntil(event && event.date); } catch (_e) { dte = null; }
      const out = [];
      for (const v of vendors) {
        if (!v || !v.id || !String(v.name || '').trim()) continue;
        let coi = null;
        try { coi = getVendorCOIState(v, event); } catch (_e) { continue; }
        if (!coi || !coi.required || coi.level === 'safe') continue;
        const overdue = coi.dueInDays != null && coi.dueInDays <= 0;
        if (!(coi.level === 'critical' || overdue)) continue;
        let cna = null;
        try { cna = coiNextAction(v, event, v.name); } catch (_e) { cna = null; }
        out.push({
          severity: coi.level === 'critical' ? 'critical' : 'attention',
          // The classification RIDES the action (doctrine: the shell must never
          // re-sniff a category out of title prose — that regex broke on the
          // fifth title shape, 2026-07-22). coiNextAction declares it.
          sourceCategory: (cna && cna.sourceCategory) || 'coi',
          // The ladder's exact title source: cna.title, with the ladder's own fallback.
          title: (cna && cna.title) || `Get an updated COI from ${v.name}.`,
          why: (cna && cna.consequence) || null,
          // 'coi' (not 'documents') so it lands on the COI row, not the contract row (audit 2026-07-21).
          route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'coi' },
          key: v.id,                    // WAVE-6: the vendor record
          // WAVE-6: the classifier's own "due 30 days out" clock, passed through.
          dueInDays: coi.dueInDays != null ? coi.dueInDays : null,
          leadDays: (coi.dueInDays != null && dte != null) ? coi.dueInDays - dte : null,
        });
      }
      return out;
    },
  },

  // ── Vendor silence ─────────────────────────────────────────────────────────
  // "What am I waiting on?" — the question the 2026-08-07 board ruling refused a
  // Communication hub over. Saarinen's dissent was upheld as a BINDING condition:
  // no hub, but the question must stay answerable. This raise is that promise.
  //
  // WHY IT LIVES HERE and not in a render array: my first attempt injected a row
  // into the `.qidx` list in the shell. It built, the suite passed, and it
  // rendered nothing — that block opens with `if (elegantMode) return null;` and
  // elegant is the production default. A raise reaches the surface the host
  // actually gets, and it declares reads/feeds + provenance instead of being a
  // standalone pick.
  //
  // It reads ONLY what the host recorded. silentVendors() returns people the host
  // logged reaching out to who have not replied, past the same 21-day line
  // vendorAccountability already scores against. Someone never logged is UNKNOWN,
  // not silent, and is deliberately absent — accusing a vendor of ignoring a
  // message that was never sent is the exact dishonesty this whole thread exists
  // to avoid.
  {
    id: 'vendor_silence',
    label: 'People who haven’t come back to you',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    bundleTitle: (n) => `Chase ${n} people who haven’t come back to you`,
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let quiet = [];
      try { quiet = silentVendors(event) || []; } catch (_e) { return []; }
      return quiet
        .filter((q) => q && q.vendor && q.vendor.id && String(q.vendor.name || '').trim())
        .map((q) => ({
          // 'attention', not 'critical'. Critical is reserved for reactive raises
          // — a payment overdue, a vendor who hasn't SHOWN. Someone slow to reply
          // three weeks out is worth a look, not an emergency, and inflating it is
          // how the list stops being read.
          severity: 'attention',
          title: `${q.vendor.name} hasn’t come back to you`,
          // The why carries the fact the host needs to act: how long, in their own
          // terms. It never says the vendor ignored them — only what is known.
          why: `You reached out ${q.state.daysSince} days ago and haven’t heard back.`,
          route: { tab: 'Vendors', vendorId: q.vendor.id },
          key: q.vendor.id,
        }));
    },
  },

];

/**
 * Everything every surface is raising, most severe first.
 * WAVE-6: raises carry through `key` (the record id — null for aggregates),
 * `dueInDays` and `leadDays` (the raiser's own clock — null where it has none).
 * @returns {{ surface: string, label: string, domain: string, severity: string,
 *             title: string, why: string|null, route: object,
 *             key: string|null, dueInDays: number|null, leadDays: number|null }[]}
 */
export function raiseAll(event) {
  if (!event) return [];
  const out = [];
  for (const s of SURFACES) {
    let items = [];
    try { items = s.raise(event) || []; } catch (_e) { items = []; }
    for (const i of items) {
      if (!i || !i.title) continue;
      // ── PASS THROUGH BY DEFAULT; HAND-CODE ONLY THE ONE-OFFS ────────────────
      // This was an explicit field list, and an explicit field list is a
      // silent-drop machine: a raiser authors a field, no consumer ever sees it,
      // and NOTHING fails. Its own comments recorded eight deaths one at a time
      // — sourceCategory (the "fourth and last", 2026-07-22), then
      // priorityScore / gateHolder / unlocks / ask (the fifth through eighth,
      // 2026-07-31, each with a consumer already reading undefined: a decision
      // scored 308.5 arrived null and ranked 0).
      //
      // Eight identical bugs in one place is a design verdict, not bad luck. The
      // list is now INVERTED (2026-08-17): the raise spreads through whole, and
      // only fields that genuinely need coercion or a default are named below.
      // A new field a raiser authors now arrives by default; forgetting to
      // update this site can no longer erase it. Pinned by
      // raiseNormalizerPassesThrough.test.js.
      out.push({
        // Everything the raiser authored, verbatim — including fields added
        // after this line was written. THIS is the fix; the rest is coercion.
        ...i,
        // One-off 1: the declared vocabulary (see the contract at the top of
        // this file — 'critical' | 'attention'). Anything else canonicalizes to
        // 'attention' so no consumer meets a value it cannot read. Authoring
        // outside the vocabulary is caught loudly by raiseVocabulary.test.js
        // rather than silently flattened here — that gate is why money-dates'
        // long-dead `'urgent'` branch was found.
        severity: i.severity === 'critical' ? 'critical' : 'attention',
        // One-off 2: a raise may omit its route and inherit the surface's.
        route: i.route || s.route,
        // One-off 3: coercions and null-defaults consumers rely on. `!= null`
        // callers would not care, but these are pinned by decisionEvidence and a
        // spread alone would hand them `undefined`.
        why: i.why || null,
        sourceCategory: i.sourceCategory != null ? i.sourceCategory : null,
        key: i.key != null ? String(i.key) : null,
        dueInDays: Number.isFinite(i.dueInDays) ? i.dueInDays : null,
        leadDays: Number.isFinite(i.leadDays) ? i.leadDays : null,
        priorityScore: Number.isFinite(i.priorityScore) ? i.priorityScore : null,
        gateHolder: i.gateHolder === true,
        unlocks: Number.isFinite(i.unlocks) ? i.unlocks : 0,
        ask: i.ask != null ? i.ask : null,
        evidence: i.evidence || null,
        // LAST, deliberately: the registry is the authority on a raise's
        // identity, so a raise cannot shadow it through the spread above.
        surface: s.id, label: s.label, domain: s.domain,
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}

/**
 * WAVE-6: a surface's declared identity — for bundling. eventPlan collapses ≥3
 * raises from one surface into a single bundle action titled in the surface's
 * own host language (bundleTitle), routed to the surface's own route. Returns
 * null for an unknown surface so a caller can fall back honestly.
 */
export function surfaceMeta(surfaceId) {
  const s = SURFACES.find((x) => x.id === surfaceId);
  if (!s) return null;
  return {
    id: s.id, label: s.label, domain: s.domain, route: s.route,
    bundleTitle: typeof s.bundleTitle === 'function'
      ? s.bundleTitle
      : (n) => `${n} things need a look — ${String(s.label || '').toLowerCase()}`,
  };
}

/**
 * What each surface is raising, keyed by surface id — for badges.
 * A badge that counts something real, and that clearing the work actually clears.
 */
export function raiseCounts(event) {
  const counts = {};
  for (const r of raiseAll(event)) counts[r.surface] = (counts[r.surface] || 0) + 1;
  return counts;
}
