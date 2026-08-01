// ─── Knowledge Change Request (KCR) — the governed write-side primitive ───────
// The ONE permanent primitive for changing canonical knowledge. Every mutation —
// research, correction, citation, pricing/seasonal/regulation update, SME revision,
// customer feedback, validation finding, AI suggestion, retirement, new knowledge,
// contradiction, missing evidence — is a KCR of a `type`. It replaces the earlier
// "Research Ticket" (research is now KCR{type:'research'}) so no second backlog exists.
//
// KCRs are GOVERNANCE WORK-OBJECTS, not canonical knowledge (Platform Constitution
// Art. I): the Studio owns them; the Knowledge layer owns assets + provenance. A KCR
// writes a versioned change onto an asset ONLY at publish, ONLY with evidence, ONLY
// after review. Nothing edits canonical knowledge directly:
//     Knowledge Asset ▲ Published Version ▲ Approved KCR ▲ Evidence ▲ Insight
//
// Pure + testable (asOf injected, no Date.now) — same discipline as hostIntel.js.
// Reuses the Knowledge Registry (playbookRegistry.js); adds NO registry, NO lifecycle.

import { playbookDependencies, playbookGrounding, playbookFreshness, playbookId } from '../playbooks/playbookRegistry';
// PHASE 5E: typed validation at the publish gate. Reasoning corrections were
// always safe; VALUE corrections are not, because a value has a schema the engine
// depends on. This is the last gate before a number reaches a host.
import { validateGovernedValue } from './governedFieldTypes';
// PHASE 5E.1: ownership. A value that does not control runtime must not be
// publishable at all - governing it produces a stated rate beside a count sized
// by something else, which is worse than leaving it alone.
import { fieldOwnership, blockedMessage } from './governedOwnership';
import { groundingHonesty } from './sourceAuthority';

// ── Vocabulary ────────────────────────────────────────────────────────────────
export const KCR_TYPES = [
  'research', 'correction', 'citation', 'pricing-update', 'seasonal-update',
  'regulation-update', 'sme-revision', 'customer-feedback', 'validation-finding',
  'ai-suggestion', 'retirement', 'new-knowledge', 'contradiction', 'missing-evidence',
  // Quality-layer types (Playbook Intelligence dimensions route here — see PLAYBOOK_INTELLIGENCE_OS):
  'quality-gap', 'grounding-gap', 'commercial-gap',
];
// TRIGGER — the causal "WHY is our knowledge changing?" dimension for analytics.
// The single causal taxonomy (replaces the earlier free 'source' field — no duplicate axis).
export const TRIGGERS = [
  'research', 'customer', 'planner', 'coordinator', 'corporate', 'validation',
  'ai', 'freshness', 'regulation', 'incident', 'post-event', 'market-change', 'sme',
];
export const EVIDENCE_TYPES = ['citation', 'document', 'link', 'sme-note', 'dataset', 'primary', 'secondary'];
export const GRAPH_RELATIONS = ['depends_on', 'used_by', 'derived_from', 'supersedes', 'supports', 'contradicts', 'related_to', 'references'];

// Canonical Knowledge Lifecycle (NOT new — maps to KNOWLEDGE_OPERATING_SYSTEM).
export const KCR_STATUS = ['draft', 'researching', 'grounded', 'review', 'approved', 'published', 'monitoring', 'revision', 'archived'];
export const KCR_TRANSITIONS = {
  draft:       ['researching', 'archived'],
  researching: ['grounded', 'archived'],
  grounded:    ['review', 'researching', 'archived'],
  review:      ['approved', 'researching', 'archived'],
  approved:    ['published', 'archived'],
  published:   ['monitoring', 'revision'],
  monitoring:  ['revision', 'archived'],
  revision:    ['researching', 'archived'],
  archived:    [],
};

// ── Insight intake — everything begins as an Insight, becomes ONE KCR ─────────
export function insightToKCR(insight, asOf) {
  return createKCR({
    type: insight.suggestedType || 'research',
    trigger: insight.trigger || 'research',
    assetId: insight.assetId || null,
    assetKind: insight.assetKind || 'playbook',
    fieldPath: insight.fieldPath || null,
    currentValue: insight.currentValue ?? null,
    reason: insight.reason || insight.note || '',
    createdBy: insight.createdBy || 'admin',
    asOf,
  });
}

let _seq = 0; // fallback id counter; intake passes a DETERMINISTIC id (dedupe key)
export function createKCR({ id = null, type, trigger, assetId, assetKind = 'playbook', fieldPath = null, currentValue = null, currentProvenance = null, reason = '', createdBy = 'admin', asOf = null }) {
  if (!KCR_TYPES.includes(type)) throw new Error(`KCR: unknown type '${type}'`);
  if (!TRIGGERS.includes(trigger)) throw new Error(`KCR: unknown trigger '${trigger}' (why is this knowledge changing?)`);
  const kid = id || `kcr-${assetId ? playbookId(assetId) + '-' : ''}${type}-${(_seq += 1)}`;
  return {
    id: kid, type, trigger, createdBy, createdAt: asOf,
    assetId, assetKind, fieldPath, currentValue, currentProvenance,
    reason,
    status: 'draft',
    priority: null,        // derived from the Command Center research queue
    impact: null,          // derived by knowledgeImpactPreview()
    evidence: [],
    contradictions: [],
    proposal: null,        // { newValue, newProvenance:{verificationStatus,sources[]}, rationale }
    review: { sme: null, editorial: null, ai: null, governance: null },
    publishedVersion: null,
    rollbackTo: null,
    audit: [{ at: asOf, by: createdBy, action: 'created', note: `type=${type} trigger=${trigger}` }],
  };
}

// ── Immutable mutations (return NEW objects) ──────────────────────────────────
const stamp = (kcr, entry) => ({ ...kcr, audit: [...kcr.audit, entry] });

export function addEvidence(kcr, ev, asOf) {
  const evidence = { id: `ev-${kcr.evidence.length + 1}`, sourceType: 'secondary', confidence: 'medium', supports: null, contradicts: false, capturedAt: asOf, ...ev };
  return stamp({ ...kcr, evidence: [...kcr.evidence, evidence] }, { at: asOf, by: ev.by || 'steward', action: 'evidence-added', note: evidence.source || evidence.url || '' });
}

// ── PROVENANCE OWNERSHIP (Phase 5A-0, 2026-08-01) ────────────────────────────
// A proposal used to carry provenance in TWO places, and the two halves of the
// system read different ones:
//
//   GOVERNANCE  read proposal.verificationStatus / proposal.sources
//               (publishKCR's cited-needs-evidence gate, kcrGateStatus)
//   RUNTIME     read proposal.newProvenance
//               (publishKCR's version record, overrideFromPublishedKCR,
//                publishedSnapshotBuild)
//
// Two failure modes followed, and the second is the one that bites in practice:
//
//   1. DISAGREEMENT — a hand-authored nested `cited` with the top-level default
//      still 'synthesized'. Governance evaluates 'synthesized', skips
//      canReachCited(), and a cited value reaches runtime unchecked.
//   2. LOSS — finding.js (the AUTOMATED research path: Observation -> Evidence ->
//      Finding -> KCR) writes provenance at the top level ONLY. Governance sees a
//      correct cited claim with real evidence ids and applies the full check; then
//      the version, the override and the snapshot all read newProvenance and get
//      `null`. A properly researched, properly reviewed KCR reached the transport
//      with its provenance silently dropped.
//
// `newProvenance` is canonical from here: runtime already consumes it, published
// snapshots already carry it, and it is the versioned knowledge state. Top-level
// remains, mirrored, for backward compatibility with records and tests written
// against it — never as an independent source of truth.
//
// ABSENCE IS DERIVED, DISAGREEMENT IS FATAL. A missing nested field is filled
// from its legacy twin (that is what makes the automated path work at all). Two
// values that are both present and different are an authoring bug: normalising
// one away would hide it, so it throws.
const SOURCE_KEY = (s) => (Array.isArray(s) ? s.map(String).slice().sort().join(' ') : null);

// -- PROVENANCE GRADING (Phase 5A-1, 2026-08-01) ------------------------------
// The canonical provenance object carries five fields:
//
//   tier               WHERE the knowledge came from. The playbook corpus works in
//                      primary / researched / trade-heuristic / cultural-tradition /
//                      culture-bearer / matriarch / norm / estimate / consensus /
//                      community / host-coaching / heuristic. Deliberately NOT frozen
//                      here - that vocabulary is still being earned, and a premature
//                      enum would reject a real culture-bearer attribution.
//   confidence         HOW SURE we are. FROZEN - see below.
//   verificationStatus HOW IT WAS CHECKED (cited / researched / established-consensus
//                      / synthesized). Drives the cited-needs-evidence gate.
//   sources            [] of source ids that must resolve in a source catalogue.
//   note               free prose for a human reader.
//
// CONFIDENCE IS FROZEN AT THREE VALUES. The playbook corpus already spells one
// idea two ways - `medium` (82 items) and `med` (18) - which makes "how sure are
// we" unaggregatable: a query for medium-confidence knowledge silently misses 18%
// of it. Freezing at the point knowledge is MANUFACTURED stops 368 more rows
// inheriting the split.
//
// `med` is REJECTED, not silently upgraded. An abbreviation is an authoring slip;
// rewriting it here would hide the slip and teach the author that both spellings
// work - which is how the corpus split in the first place. The error names the
// canonical value instead.
export const CONFIDENCE_VALUES = ['high', 'medium', 'low'];

function assertConfidence(prov) {
  if (!prov || prov.confidence === undefined || prov.confidence === null) return;
  if (!CONFIDENCE_VALUES.includes(prov.confidence)) {
    const hint = prov.confidence === 'med' ? " - use 'medium'" : '';
    throw new Error(`KCR: invalid provenance confidence '${prov.confidence}'${hint}. Allowed: ${CONFIDENCE_VALUES.join(', ')}.`);
  }
}

/**
 * canonicalProvenance(proposal) -> provenance object | null
 * The ONE resolution both governance and runtime must agree on. Throws when the
 * nested and legacy shapes are both present and disagree.
 */
export function canonicalProvenance(proposal) {
  if (!proposal || typeof proposal !== 'object') return null;
  const nested = (proposal.newProvenance && typeof proposal.newProvenance === 'object') ? proposal.newProvenance : null;
  const legacyVs = proposal.verificationStatus;
  const legacySrc = Array.isArray(proposal.sources) ? proposal.sources : undefined;

  if (nested) {
    assertConfidence(nested);           // grading is validated before it is adopted
    if (legacyVs !== undefined && nested.verificationStatus !== undefined && legacyVs !== nested.verificationStatus) {
      throw new Error(`KCR: provenance conflict — proposal.verificationStatus='${legacyVs}' but newProvenance.verificationStatus='${nested.verificationStatus}'. Set one, or make them agree.`);
    }
    if (legacySrc !== undefined && Array.isArray(nested.sources) && SOURCE_KEY(legacySrc) !== SOURCE_KEY(nested.sources)) {
      throw new Error(`KCR: provenance conflict — proposal.sources=${JSON.stringify(legacySrc)} but newProvenance.sources=${JSON.stringify(nested.sources)}. Set one, or make them agree.`);
    }
    // Absent nested fields inherit their legacy twin; present ones win.
    return {
      ...nested,
      verificationStatus: nested.verificationStatus !== undefined ? nested.verificationStatus : legacyVs,
      sources: Array.isArray(nested.sources) ? nested.sources : (legacySrc || []),
    };
  }
  if (legacyVs !== undefined || legacySrc !== undefined) {
    return { verificationStatus: legacyVs, sources: legacySrc || [] };
  }
  return null;
}

/**
 * normalizeProposal(proposal) -> proposal with newProvenance canonical and the
 * legacy top-level fields mirrored from it. Idempotent.
 */
export function normalizeProposal(proposal) {
  if (!proposal || typeof proposal !== 'object') return proposal;
  const canon = canonicalProvenance(proposal) || { verificationStatus: 'synthesized', sources: [] };
  assertConfidence(canon);
  const vs = canon.verificationStatus !== undefined ? canon.verificationStatus : 'synthesized';
  const sources = Array.isArray(canon.sources) ? canon.sources : [];
  return {
    ...proposal,
    newProvenance: { ...canon, verificationStatus: vs, sources },
    // Mirrored for backward compatibility only. Readers should use
    // canonicalProvenance(); these exist so records and gates written against the
    // old shape keep working and can never drift from the canonical value.
    verificationStatus: vs,
    sources,
  };
}

export function setProposal(kcr, proposal, asOf) {
  return stamp({ ...kcr, proposal: normalizeProposal(proposal) }, { at: asOf, by: proposal.by || 'steward', action: 'proposal-set', note: proposal.rationale || '' });
}

export function recordReview(kcr, gate, decision, asOf) {
  if (!['sme', 'editorial', 'ai', 'governance'].includes(gate)) throw new Error(`KCR: unknown review gate '${gate}'`);
  return stamp({ ...kcr, review: { ...kcr.review, [gate]: { by: decision.by, decision: decision.decision, note: decision.note || '', at: asOf } } }, { at: asOf, by: decision.by, action: `review:${gate}`, note: decision.decision });
}

export function advanceKCR(kcr, toStatus, { by = 'steward', note = '', asOf = null } = {}) {
  const legal = KCR_TRANSITIONS[kcr.status] || [];
  if (!legal.includes(toStatus)) throw new Error(`KCR: illegal transition ${kcr.status} → ${toStatus}`);
  if (toStatus === 'review' && !kcr.proposal) throw new Error('KCR: cannot enter review without a proposal');
  if (toStatus === 'approved') {
    const passed = (g) => kcr.review[g] && kcr.review[g].decision === 'approve';
    if (!(passed('sme') && passed('editorial') && passed('governance'))) throw new Error('KCR: approve requires SME + editorial + governance approval (AI is advisory only)');
  }
  return stamp({ ...kcr, status: toStatus }, { at: asOf, by, action: `advanced:${toStatus}`, note });
}

// ── Publish + version lineage + rollback ──────────────────────────────────────
// Publishing is the ONLY write-path to canonical knowledge. It requires an APPROVED
// KCR, mints a version record (the audit trail from insight → published value), and
// records the rollback pointer. A cited proposal requires linked evidence (the gate).
// -- PROVENANCE DERIVATION AT THE PUBLISH BOUNDARY (Phase 5A-1.5, 2026-08-01) --
// 5A-1 made grading POSSIBLE. It did not make it PRESENT: the automated path
// (findingToKCR) emits { verificationStatus:'cited', sources:[...] } and nothing
// else, so a properly researched, properly reviewed KCR still published UNGRADED
// - and `isGroundedCost()` requires tier === 'researched', so the runtime would
// have rejected it as ungrounded. That is the T4 regression: researched knowledge
// reporting as unsourced, silently.
//
// Derivation happens HERE and only here, because this is the only point that can
// see BOTH the provenance claim and the evidence backing it. canReachCited() is a
// property of the KCR, not of the proposal, so setProposal cannot make this call.
//
// WHAT IS DERIVED, AND ONLY WHEN THE CLAIM IS ALREADY EARNED:
//   cited + qualifying evidence  ->  tier 'researched', confidence 'medium'
//   cited + no qualifying evidence -> nothing derived; the gate above already threw
//   anything not 'cited'         ->  nothing derived
//
// NEVER 'high'. Confidence is a claim about how sure we are, and a machine that
// has only checked "a citation exists" has not earned high. 'medium' is the
// conservative floor; an author who knows better sets it explicitly, and an
// explicit value is never overwritten.
//
// Nothing is invented for a value that was not already cited-and-evidenced. A
// synthesized claim stays ungraded rather than being dressed as researched.
export function derivedProvenance(kcr, prov) {
  if (!prov || typeof prov !== 'object') return prov;
  const earned = prov.verificationStatus === 'cited' && canReachCited(kcr);
  if (!earned) return prov;
  const out = { ...prov };
  if (out.tier === undefined || out.tier === null) out.tier = 'researched';
  if (out.confidence === undefined || out.confidence === null) out.confidence = 'medium';
  return out;
}

export function publishKCR(kcr, { prevVersion = null, versionId, by = 'publisher', asOf = null } = {}) {
  if (kcr.status !== 'approved') throw new Error('KCR: only an approved KCR may publish');
  // Resolve ONCE, canonically. A KCR may have been built by a writer that never
  // went through setProposal — finding.js constructs `proposal` inline — so the
  // gate and the version must not read a raw field. This also raises a conflict
  // as an error at the publication boundary rather than shipping a disagreement.
  const prov = canonicalProvenance(kcr.proposal);
  if (prov && prov.verificationStatus === 'cited' && !canReachCited(kcr)) {
    throw new Error('KCR: cannot publish a cited value without supporting evidence');
  }
  // TYPE GATE (5E). A governed value must match the schema its runtime consumer
  // reads. Unknown field paths pass — this refuses to guess — but a known field
  // with a wrong type, an inverted range or an implausible magnitude is refused
  // here rather than resolving as NaN inside a host's shopping list.
  if (kcr.proposal && kcr.proposal.newValue !== undefined) {
    const v = validateGovernedValue(kcr.fieldPath, kcr.proposal.newValue);
    if (!v.ok) throw new Error(`KCR: invalid value for ${kcr.fieldPath} — ${v.errors.join(' ')}`);
    // OWNERSHIP GATE. Refuse a field an engine owns, whatever its type.
    const own = fieldOwnership(kcr.assetId, kcr.fieldPath);
    if (!own.drivesRuntime) throw new Error(`KCR: ${kcr.fieldPath} is not governable — ${blockedMessage(own)}`);
    // GROUNDING-HONESTY GATE (Phase 5F.4). A provenance block that CITES SOURCES is
    // making a claim about evidence. This gate refuses the two ways that claim can be
    // false, both found by running the acquisition loop rather than by reading code:
    //
    //   1. an UNRESOLVABLE source id. `usda-meat-2026` (real, but a cost source) or a
    //      pasted URL published cleanly, then failed the grounding predicate. The claim
    //      showed sources and the host showed nothing. ~8 raw URLs are in the corpus
    //      this way; none has ever grounded.
    //
    //   2. approved sources on a NON-GROUNDING TIER. `format()` carries the authored
    //      tier forward, so a purchase already sitting at `norm` or `trade-heuristic`
    //      kept it invisibly. The Cookout and Quinceanera both published citing approved
    //      sources with qtyGrounded=false — a record that looks sourced and is not.
    //
    // WHAT IS STILL ALLOWED: provenance with NO sources on any tier. A heuristic that
    // says it is a heuristic is honest. The gate fires only when sources are present,
    // because that is when the record starts making a claim it may not be able to keep.
    //
    // TIERS ARE NEVER AUTO-UPGRADED. The gate refuses and explains; a human chooses.
    const gs = groundingHonesty(kcr.fieldPath, kcr.proposal.newValue);
    if (!gs.ok) throw new Error(`KCR: ${gs.error}`);
  }
  // Complete the grading now that the evidence check has passed.
  const finalProv = derivedProvenance(kcr, prov);
  const version = {
    id: versionId || `${playbookId(kcr.assetId || 'asset')}-v-${(_seq += 1)}`,
    kcrId: kcr.id, at: asOf, by,
    field: kcr.fieldPath, from: kcr.currentValue, to: kcr.proposal ? kcr.proposal.newValue : null,
    provenance: finalProv,
    reason: kcr.reason, trigger: kcr.trigger, supersedes: prevVersion,
  };
  // The PUBLISHED record carries the normalized proposal. Publication is the
  // moment knowledge becomes governed, so it is the right place to make the
  // canonical shape permanent — and it is what lets overrideFromPublishedKCR and
  // publishedSnapshotBuild (which read `newProvenance` directly, and are out of
  // this slice's scope) see provenance from an automated-pipeline KCR at all.
  const published = stamp({ ...kcr, proposal: kcr.proposal ? normalizeProposal(finalProv ? { ...kcr.proposal, newProvenance: finalProv } : kcr.proposal) : kcr.proposal, status: 'published', publishedVersion: version.id, rollbackTo: prevVersion }, { at: asOf, by, action: 'published', note: version.id });
  return { kcr: published, version };
}

// Roll a published KCR back to its prior version (creates a compensating revision KCR).
export function rollbackKCR(kcr, { by = 'publisher', asOf = null } = {}) {
  if (!kcr.publishedVersion) throw new Error('KCR: nothing published to roll back');
  const reverted = stamp({ ...kcr, status: 'revision' }, { at: asOf, by, action: 'rolled-back', note: `to ${kcr.rollbackTo || 'baseline'}` });
  return reverted;
}

// ── Gate status — what the KCR needs to advance + the capability it requires ──
// Pure. Drives the Studio: which action is offered, what blocks it, and (for the
// UI) which role capability the action needs. The pipeline gates (advanceKCR/
// publishKCR) still enforce independently — this only SURFACES the gate.
export function kcrGateStatus(kcr) {
  const s = kcr.status;
  const reviews = kcr.review || {};
  const approved = (g) => reviews[g] && reviews[g].decision === 'approve';
  switch (s) {
    case 'draft':
      return { stage: s, next: 'researching', action: 'Start research', cap: 'request-review', blocked: null };
    case 'researching':
      return { stage: s, next: 'grounded', action: 'Mark grounded', cap: 'evidence',
        blocked: kcr.evidence.length ? null : 'Add evidence first' };
    case 'grounded':
      return { stage: s, next: 'review', action: 'Request review', cap: 'request-review',
        blocked: kcr.proposal ? null : 'Set a proposal first' };
    case 'review': {
      const needed = ['sme', 'editorial', 'governance'].filter((g) => !approved(g));
      return { stage: s, next: needed.length ? null : 'approved', action: needed.length ? null : 'Mark approved',
        cap: 'request-review', reviewsNeeded: needed,
        blocked: needed.length ? `Awaiting review: ${needed.join(', ')}` : null };
    }
    case 'approved': {
      // Canonical read — the UI gate and publishKCR must evaluate the same value.
      // Guarded: a conflicting proposal throws in canonicalProvenance, and a
      // status readout must not explode; it reports the conflict as a blocker.
      let citedOk = true; let conflict = null;
      try {
        const p = canonicalProvenance(kcr.proposal);
        citedOk = !(p && p.verificationStatus === 'cited') || canReachCited(kcr);
      } catch (e) { conflict = e.message; }
      if (conflict) return { stage: s, next: null, action: null, cap: 'publish', blocked: conflict };
      return { stage: s, next: 'published', action: 'Publish', cap: 'publish',
        blocked: citedOk ? null : 'A cited value needs supporting evidence' };
    }
    case 'published':
      return { stage: s, next: 'monitoring', action: 'Move to monitoring', cap: 'view', blocked: null };
    case 'monitoring':
      return { stage: s, next: 'revision', action: 'Open a revision', cap: 'request-review', blocked: null };
    case 'revision':
      return { stage: s, next: 'researching', action: 'Re-research', cap: 'request-review', blocked: null };
    default:
      return { stage: s, next: null, action: null, cap: 'view', blocked: null };
  }
}

// ── The hard gate: a value may only be `cited` with real linked evidence ──────
export function canReachCited(kcr) {
  return kcr.evidence.some((e) => !e.contradicts && (e.source || e.url) && ['citation', 'primary', 'secondary', 'dataset'].includes(e.sourceType));
}

// ── Dependency / Knowledge Impact Preview — DERIVED, no manual list ───────────
const FIELD_DOWNSTREAM = [
  { re: /unitCostRange|perGuestCost|cost/i, engines: ['budget', 'shopping'], downstream: ['budget', 'shopping', 'sourcing'], readers: ['R2', 'R1'] },
  { re: /qtyPerGuest|qtyFlat|qtyPer|quantity/i, engines: ['shopping', 'budget', 'capacity'], downstream: ['shopping', 'budget', 'capacity'], readers: ['R2'] },
  { re: /decisions|costFactors/i, engines: ['decisions', 'budget'], downstream: ['decisions', 'budget', 'shopping'], readers: [] },
  { re: /tasks|milestones/i, engines: ['timeline'], downstream: ['timeline', 'notifications'], readers: [] },
  { re: /rentalsGap|capacity/i, engines: ['capacity'], downstream: ['capacity'], readers: [] },
  { re: /risks|contingencies/i, engines: ['risks', 'contingencies'], downstream: ['risks'], readers: [] },
  { re: /schedules/i, engines: ['runOfShow'], downstream: ['runOfShow'], readers: [] },
  { re: /vendors/i, engines: ['vendors'], downstream: ['vendors'], readers: [] },
  { re: /attendance|guest/i, engines: ['sizing'], downstream: ['sizing', 'budget', 'shopping'], readers: ['R1'] },
];
export function deriveImpact(pb, fieldPath) {
  const deps = playbookDependencies(pb);
  const m = FIELD_DOWNSTREAM.find((x) => fieldPath && x.re.test(fieldPath));
  const engines = m ? m.engines : ['shopping', 'budget'];
  const downstream = m ? m.downstream : ['shopping', 'budget'];
  const allAffects = (pb.decisions || []).flatMap((d) => d.affects || []);
  // A field path may target a SPECIFIC purchase ('purchases.p_crabs.unitCostRange')
  // or be BROAD/asset-level ('purchases[].unitCostRange', or null). Specific → that id;
  // broad-but-purchase-related → all wired purchases; non-purchase field → none.
  const specific = fieldPath ? allAffects.filter((a) => fieldPath.includes(a)) : [];
  const broadPurchase = !fieldPath || /purchase|unitcost|price|qty|quantity/i.test(fieldPath);
  const affectedPurchases = specific.length ? [...new Set(specific)] : (broadPurchase ? [...new Set(allAffects)] : []);
  const viaDecisions = specific.length
    ? (pb.decisions || []).filter((d) => (d.affects || []).some((a) => fieldPath.includes(a))).map((d) => d.id)
    : (broadPurchase ? (pb.decisions || []).map((d) => d.id) : []);
  return { engines, downstream, affectedPurchases, viaDecisions, vendorCategories: deps.vendorCategories, note: 'Derived from field kind + decision→purchase affects wiring — no manual list.' };
}

// The full Knowledge Impact Preview shown BEFORE publish. Derivable categories are
// computed; categories that need an index we don't have (prompts/tests/templates)
// are honest-empty with a reason — NEVER fabricated (Honesty doctrine).
export function knowledgeImpactPreview(pb, fieldPath) {
  const imp = deriveImpact(pb, fieldPath);
  return {
    playbooks: [pb.type],                                  // this asset (cross-asset edges: graph, future)
    recommendationEngines: imp.engines,                    // which corpus engines re-read
    readers: imp.readers || [],                            // Intelligence Readers Registry entries touched
    knowledgePackages: [pb.family || pb.solveFamily].filter(Boolean),
    affectedPurchases: imp.affectedPurchases,
    viaDecisions: imp.viaDecisions,
    downstream: imp.downstream,
    // Not runtime-derivable without a build-time index — honest-empty, not fabricated:
    prompts: { known: false, note: 'No prompt index at runtime — resolve via CI grep of aiProxy features' },
    tests: { known: false, note: 'No test index at runtime — CI maps changed fields → affected specs' },
    templates: { known: false, note: 'No template index yet (projections derive from this asset)' },
  };
}

// When one asset's field changes, derive the KCRs its downstream dependents need.
export function deriveDependentKCRs(pb, fieldPath, asOf) {
  return deriveImpact(pb, fieldPath).downstream.map((eng) => createKCR({
    type: 'correction', trigger: 'market-change', assetId: pb.type, assetKind: 'playbook',
    fieldPath: `~${eng}`, reason: `Downstream of a change to ${pb.type}.${fieldPath} — re-verify ${eng}`,
    createdBy: 'dependency-engine', asOf,
  }));
}

// ── Knowledge Confidence — component-based, DERIVED, never one AI score ────────
export function deriveKnowledgeConfidence(pb, asOf, { validationN = 0 } = {}) {
  const g = playbookGrounding(pb);
  const f = playbookFreshness(pb, asOf);
  const c = (component, level, reason) => ({ component, level, reason });
  return {
    components: [
      c('Evidence', g.pricedItems === 0 ? 'unknown' : g.cited > 0 ? 'high' : g.consensus === g.pricedItems ? 'medium' : 'low',
        `${g.cited} cited / ${g.consensus} consensus / ${g.synthesized} synthesized of ${g.pricedItems} priced`),
      c('Sources', g.hasSources ? 'high' : 'low', g.hasSources ? 'knowledge.sources present' : 'knowledge.sources empty'),
      c('Freshness', !f.known ? 'unknown' : f.overdue ? 'low' : 'high', f.reason),
      c('Validation', validationN >= 8 ? 'high' : validationN > 0 ? 'medium' : 'unknown',
        validationN > 0 ? `${validationN} scored events` : 'Awaiting completed events'),
    ],
  };
}
