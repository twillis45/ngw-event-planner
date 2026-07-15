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
//     { id, label, domain, raise(event) → [{ severity, title, why, route }] }
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
import { playbookRisks } from './playbooks';
import { daysUntil, isEventDay, isPastEvent } from './dates';

const notDismissed = (event, map, id) => {
  const st = (event && event[map] && typeof event[map] === 'object') ? event[map] : {};
  return st[id] !== 'dismissed';
};

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
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let items = [];
      try { items = (playbookRisks(event) || {}).items || []; } catch (_e) { return []; }
      return items
        .filter((r) => r && r.id && notDismissed(event, 'riskStatus', r.id))
        .filter((r) => String(r.severity || '').toLowerCase() === 'high')
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
        }));
    },
  },

  // ── T-72h reconfirm sweep ──────────────────────────────────────────────────
  // HostShellV2 computes `reconfirmables` locally (HostShellV2.jsx ~1505) and renders a
  // banner only — a host who never saw the banner never learned, and the ranked list never
  // counted it. Same predicate as the shell: a NAMED vendor, inside the last three days
  // (days 0..3), who hasn't answered yet (`reconfirmed72` truthy = answered, same truthy
  // read as the shell's own skip at ~1635). One deliberate divergence: informal helpers
  // (`isInformal`) never raise here — a friend bringing the cooler is not put through a
  // paid-vendor reconfirm ask (host-appropriate vendor UI rule); the shell banner predates
  // that rule and still counts them.
  {
    id: 'vendor-reconfirm',
    label: 'The reconfirm window',
    domain: 'vendors',
    route: { tab: 'Vendors' },
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
      }));
    },
  },
];

/**
 * Everything every surface is raising, most severe first.
 * @returns {{ surface: string, label: string, domain: string, severity: string,
 *             title: string, why: string|null, route: object }[]}
 */
export function raiseAll(event) {
  if (!event) return [];
  const out = [];
  for (const s of SURFACES) {
    let items = [];
    try { items = s.raise(event) || []; } catch (_e) { items = []; }
    for (const i of items) {
      if (!i || !i.title) continue;
      out.push({
        surface: s.id, label: s.label, domain: s.domain,
        severity: i.severity === 'critical' ? 'critical' : 'attention',
        title: i.title, why: i.why || null,
        route: i.route || s.route,
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
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
