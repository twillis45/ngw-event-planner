// ─── adminTruth — why the product said what it said (Phase 5G-C1 Part 10) ────
//
// The admin surface's ONE job: explain every host-facing string by naming the
// function that produced it and showing that value.
//
// THE RULE THAT MAKES IT WORTH HAVING: this module calls the SAME functions the
// host calls. It never rederives. If it computed its own version of a summary or a
// basis label, a mismatch would prove nothing — it would just mean two
// implementations drifted. Because both sides call one function, a mismatch is a
// real bug signal, and `adminHostParity()` below is an assertable property rather
// than a comparison of two guesses.
//
// PURE: no I/O, no storage, no JSX. Returns rows a surface can render.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { orientation, segmentsText } from '../eventOrientation';
import { getPlaybook, playbookFoodPlan, purchaseProvenance } from '../playbooks';
import { classifyClaim } from './claimBasis';
import { isGroundedItemQty } from './quantityProvenance';
import { iceRecommendation, familyFor, ICE_FAMILY, ICE_RECOVERED_LOGIC } from './claimFamilies';
import { resolveRoute } from '../routeResolver';

const show = (v) => {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return v.length ? v.join(' · ') : '[]';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

/**
 * eventStateFacts(event, queue) -> rows explaining the orientation surface.
 * Every `value` here is the exact object the host renders from.
 */
export function eventStateFacts(event, queue = [], now = undefined) {
  const cues = (() => { try { return deriveEventPhaseProgress(event, now); } catch (e) { return null; } })();
  const o = orientation(cues, queue);
  if (!cues || !o) return { rows: [], orientation: null, cues: null };

  const rows = [
    ['phase', 'deriveEventPhaseProgress().phase', show(cues.phase), 'derived'],
    ['lifecycleLabel', 'eventOrientation.LIFECYCLE_LABELS[phase]', show(o.lifecycleLabel), 'host'],
    ['engineLabel', 'phaseCues.label', show(cues.label), 'derived'],
    ['completedCount', 'phaseCues.completedCount', show(o.completedCount), 'host'],
    ['totalCount', 'phaseCues.totalCount', show(o.totalCount), 'host'],
    ['countText', 'eventOrientation.countText', show(o.countText), 'host'],
    ['summary', 'eventOrientation.summary', show(o.summary), 'host'],
    ['segments', 'phaseCues.items[] -> readinessSegments()',
      o.segments.map((s) => `${s.id}:${s.handled ? 'handled' : 'still-open'}`).join(' · '), 'host'],
    ['blocker', 'severeBlocker(queue[0])', show(o.blocker), 'host'],
    ['primaryAction', 'phaseCues.nextCue', show(o.primaryAction && o.primaryAction.id), 'host'],
    ['a11y text', 'eventOrientation.segmentsText()', show(segmentsText(o)), 'host'],
  ];

  // Route truth for every routed segment — descriptor AND what the resolver returns.
  for (const s of o.segments) {
    if (!s.route) {
      rows.push([`route: ${s.id}`, 'no route on this essential',
        s.explanation ? 'SUPPRESSED — instruction, not a CTA' : 'handled, no action needed', 'suppressed']);
      continue;
    }
    const r = resolveRoute(s.route);
    const actionable = !!(r && (r.anchor || r.focus));
    rows.push([`route: ${s.id}`, `resolveRoute(${JSON.stringify(s.route)})`,
      `${show(r)} → ${actionable ? 'ACTIONABLE' : 'NOT ACTIONABLE (no anchor/focus)'}`,
      actionable ? 'derived' : 'suppressed']);
  }
  return { rows, orientation: o, cues };
}

/**
 * recommendationFacts(assetId, purchaseId, event) -> rows explaining one
 * recommendation, including both halves of the route truth.
 */
export function recommendationFacts(assetId, purchaseId, event) {
  const hit = familyFor(assetId, purchaseId);
  if (!hit) return { rows: [], rec: null, claim: null };

  const pb = getPlaybook(assetId);
  const p = (pb && pb.purchases || []).find((x) => x.id === purchaseId) || null;
  const prov = p ? purchaseProvenance(pb, p) : null;
  const claim = classifyClaim(prov);

  // The guest count the HOST would use, read from real food-plan output.
  const plan = (() => { try { return playbookFoodPlan(event, {}) || {}; } catch (e) { return {}; } })();
  const guests = Number(plan.guests) || 0;
  const rec = iceRecommendation(assetId, purchaseId, { guestCount: guests, claim });

  const rows = [
    ['canonical family', 'claimFamilies.ICE_FAMILY.id', show(ICE_FAMILY.id), 'derived'],
    ['mapped field', 'playbook + purchaseId', `${assetId} · ${purchaseId}`, 'derived'],
    ['authored value', 'playbook.qtyPerGuest', `${show(p && p.qtyPerGuest)} ${show(p && p.unit)} per guest`, 'host'],
    ['guest count', 'playbookFoodPlan().guests', show(guests), 'host'],
    ['displayed total', 'perGuest x guests', `${show(rec.total)} ${show(p && p.unit)}`, 'host'],
    ['basis', 'classifyClaim().basis', show(claim.basis), 'derived'],
    ['verificationStatus', 'provenance.verificationStatus', show(claim.verification), 'derived'],
    ['basisRecorded', 'classifyClaim().basisRecorded', show(claim.basisRecorded), 'derived'],
    // ADMIN MUST NOT DISAGREE WITH THE HOST (fixed 2026-08-15). This row is
    // labelled 'host' — it claims to report what the host is actually told — and
    // it computed `isGroundedItemQty(prov)` alone, while `classifyClaim` has used
    // `isGroundedItemQty || isGroundedCost` since 2026-08-14. Every cost-cited
    // line therefore read "not citation-eligible" in Admin's own truth table and
    // "Directly sourced" on the surface. A table whose purpose is to catch
    // host/admin drift was itself the drift.
    ['directCitationEligible', 'classifyClaim().directCitationEligible',
      show(claim.directCitationEligible), 'host'],
    ['recommendationEligible', 'classifyClaim().recommendationEligible', show(claim.recommendationEligible), 'derived'],
    ['current source', 'provenance.sources[]', show(claim.sources), 'host'],
    ['recovered condition', 'ICE_MEMBERS[].condition', show(rec.authoredCondition), 'derived'],
    ['condition evidence', 'ICE_MEMBERS[].evidence', show(rec.conditionEvidence), 'derived'],
    ['recovered status', 'ICE_RECOVERED_LOGIC.status', show(ICE_RECOVERED_LOGIC.status), 'derived'],
    ['recommendationState', 'iceRecommendation().recommendationState', show(rec.recommendationState), 'host'],
    ['assumption', 'iceRecommendation().assumption', show(rec.assumption), 'host'],
    ['host basis label', 'classifyClaim().hostLabel', show(claim.hostLabel), 'host'],
  ];

  // ROUTE TRUTH — descriptor and resolver output are shown separately on purpose.
  // A descriptor that looks fine can still resolve to a landing with no focus, which
  // is exactly the dead-CTA defect this programme found live.
  const na = rec.nextAction;
  if (!na) {
    rows.push(['next action', 'iceRecommendation().nextAction', 'null — state is Recommended', 'suppressed']);
  } else if (!na.route) {
    rows.push(['intended route', 'nextAction.route', 'null — answered on this surface', 'suppressed']);
    rows.push(['route actionability', 'label rendered iff route && (anchor||focus)',
      `SUPPRESSED — instruction: "${na.why}"`, 'suppressed']);
  } else {
    const r = resolveRoute(na.route);
    const actionable = !!(r && (r.anchor || r.focus));
    rows.push(['intended route', 'nextAction.route', show(na.route), 'derived']);
    rows.push(['resolved route', 'resolveRoute(route)', show(r), 'derived']);
    rows.push(['route actionability', 'label rendered iff route && (anchor||focus)',
      actionable ? `ACTIONABLE — "${na.label}"` : 'NOT ACTIONABLE — must suppress the CTA',
      actionable ? 'host' : 'suppressed']);
  }
  return { rows, rec, claim };
}

/**
 * adminHostParity — the assertable property.
 *
 * Recomputes the HOST-facing values independently of the row list and checks the
 * admin is reporting exactly those. It is deliberately narrow: only fields a host
 * actually sees are compared, because those are the ones a divergence would harm.
 */
export function adminHostParity(event, queue = [], iceAsset = null, now = undefined) {
  const { rows, orientation: o } = eventStateFacts(event, queue, now);
  const byField = new Map(rows.map((r) => [r[0], r[2]]));
  const mismatches = [];
  const check = (field, expected) => {
    const got = byField.get(field);
    if (got !== show(expected)) mismatches.push({ field, admin: got, host: show(expected) });
  };
  if (o) {
    check('lifecycleLabel', o.lifecycleLabel);
    check('summary', o.summary);
    check('countText', o.countText);
    check('completedCount', o.completedCount);
    check('totalCount', o.totalCount);
  }
  if (iceAsset) {
    const { rows: rr, rec, claim } = recommendationFacts(iceAsset, 'p_ice', event);
    const rby = new Map(rr.map((r) => [r[0], r[2]]));
    if (rec && claim) {
      if (rby.get('host basis label') !== show(claim.hostLabel)) {
        mismatches.push({ field: 'host basis label', admin: rby.get('host basis label'), host: show(claim.hostLabel) });
      }
      if (rby.get('recommendationState') !== show(rec.recommendationState)) {
        mismatches.push({ field: 'recommendationState', admin: rby.get('recommendationState'), host: show(rec.recommendationState) });
      }
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}
