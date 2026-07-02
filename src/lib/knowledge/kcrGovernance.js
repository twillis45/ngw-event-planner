// ─── KCR governance: ownership, SLA/aging, backlog observability (KCR-5) ──────
// Pure readers over KCRs (+ optional asset governance). No mutations, no host coupling.
// Honest-empty everywhere: when an audit timestamp or an owner is missing, the reader
// says "unknown" — it never fabricates an age, an SLA breach, or a steward.

import { playbookGovernance } from '../playbooks/playbookRegistry';

// ── Ownership / stewardship ───────────────────────────────────────────────────
// The steward of the change = the asset's governance owner where known, else the KCR's
// creator (command-center / a human). Assets carry owner in their governance block
// (KNOWLEDGE_OPERATING_SYSTEM); absent ⇒ honest-empty.
export function kcrOwnership(kcr, pb) {
  const gov = pb ? playbookGovernance(pb) : null;
  const assetOwner = gov && gov.set ? gov.owner : null;
  return {
    assetOwner,
    createdBy: kcr.createdBy || null,
    steward: assetOwner || null,            // the accountable steward; null ⇒ unassigned
    known: !!assetOwner,
    source: assetOwner ? 'asset-governance' : null,
  };
}

// ── Time-in-stage (aging) ─────────────────────────────────────────────────────
// From the audit entry that set the CURRENT status (the last `advanced:<status>`, or
// `created` for a draft). No timestamp ⇒ honest-empty.
export function kcrTimeInStage(kcr, asOf) {
  const audit = kcr.audit || [];
  const marker = [...audit].reverse().find((a) => a.action === `advanced:${kcr.status}`)
    || audit.find((a) => a.action === 'created');
  const since = marker && marker.at;
  const now = Date.parse(asOf);
  const then = since ? Date.parse(since) : NaN;
  if (Number.isNaN(then) || Number.isNaN(now)) return { known: false, days: null, since: since || null };
  return { known: true, days: Math.max(0, Math.floor((now - then) / 86400000)), since };
}

// ── Review SLA per stage (days) — overdue when time-in-stage exceeds it ───────
export const KCR_SLA_DAYS = { draft: 30, researching: 21, grounded: 14, review: 10, approved: 5, monitoring: 90 };
export function kcrSla(kcr, asOf) {
  const t = kcrTimeInStage(kcr, asOf);
  const sla = KCR_SLA_DAYS[kcr.status] ?? null;
  if (!t.known || sla == null) return { known: false, overdue: false, sla, days: t.days, over: 0 };
  return { known: true, overdue: t.days > sla, sla, days: t.days, over: Math.max(0, t.days - sla) };
}

const IMPACT_SCORE = (k) => (k.impact
  ? ((k.impact.recommendationEngines || []).length + (k.impact.downstream || []).length + (k.impact.affectedPurchases || []).length)
  : 0);
const CLOSED = new Set(['published', 'archived']);

// ── Backlog observability (the admin metrics) ─────────────────────────────────
export function kcrBacklogMetrics(kcrs, asOf) {
  const list = kcrs || [];
  const byStatus = list.reduce((m, k) => { m[k.status] = (m[k.status] || 0) + 1; return m; }, {});
  const aged = list.map((k) => ({ k, t: kcrTimeInStage(k, asOf), sla: kcrSla(k, asOf) })).filter((x) => x.t.known);

  const oldest = [...aged].sort((a, b) => b.t.days - a.t.days).slice(0, 10)
    .map((x) => ({ id: x.k.id, assetId: x.k.assetId, status: x.k.status, days: x.t.days }));

  const stale = aged.filter((x) => x.sla.overdue)
    .map((x) => ({ id: x.k.id, assetId: x.k.assetId, status: x.k.status, days: x.t.days, sla: x.sla.sla, over: x.sla.over }))
    .sort((a, b) => b.over - a.over);

  const avgTimeInStage = {};
  for (const s of Object.keys(byStatus)) {
    const ds = aged.filter((x) => x.k.status === s).map((x) => x.t.days);
    avgTimeInStage[s] = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null; // null ⇒ honest-empty
  }

  const highestImpact = [...list].filter((k) => k.impact).sort((a, b) => IMPACT_SCORE(b) - IMPACT_SCORE(a)).slice(0, 10)
    .map((k) => ({ id: k.id, assetId: k.assetId, score: IMPACT_SCORE(k), engines: (k.impact.recommendationEngines || []).length }));

  return {
    total: list.length,
    open: list.filter((k) => !CLOSED.has(k.status)).length,
    byStatus,
    oldest,
    stale,
    staleCount: stale.length,
    avgTimeInStage,
    highestImpact,
    agedKnown: aged.length,          // 0 ⇒ no timestamps yet ⇒ aging metrics honest-empty
  };
}
