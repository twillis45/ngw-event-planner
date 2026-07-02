# Knowledge Acquisition System — v1.0 (Canonical)

**Status:** Canonical, living. The **acquisition** layer that continuously discovers evidence and routes it — through KCR — into the [Knowledge OS](./KNOWLEDGE_OPERATING_SYSTEM.md). It **acquires + evaluates evidence; it does NOT publish.** Everything still flows through the existing publishing pipeline (KCR).
**Owner:** Todd. **Established:** 2026-07-02 (KAS-1). Supersedes the ad-hoc "research queue" framing (research is one acquisition method, not the system).

> **The one line:** The platform never thinks *"search Google."* It thinks: **gap → classify → required evidence → launch pipelines → collect `KnowledgeEvidence` → compare / detect contradictions / weigh authority → findings → KCR → Studio → publish.** Web research is *one pipeline among many*; the compounding asset is the corpus of verified **evidence**.

---

## 0. The four-system separation (the core EP-1 move)
KAS exists because four things were conflated. They are now distinct:

| System | Owns | Doc |
|---|---|---|
| **Knowledge** | canonical assets (playbooks, kits, …) | Knowledge OS |
| **Evidence** | `KnowledgeEvidence` records — *what supports a fact* | **this doc (the ONE new primitive)** |
| **Acquisition** | pipelines that discover/ingest evidence | this doc |
| **Publishing** | the governed change path | KCR (KCR-1…6) |

**KAS introduces exactly ONE new primitive — `KnowledgeEvidence` — and ONE new abstraction — an acquisition Pipeline.** Everything else *reuses*: KCR (routing), Validation Platform (event evidence), Playbook Intelligence dimensions (gap detection), the four registries, freshness/impact primitives. **No auto-publish, no fabricated confidence, no AI score, no invented evidence.**

---

## 1. `KnowledgeEvidence` (the one new primitive)
Today evidence is an inline array on a KCR. KAS promotes it to a **first-class, referenced record** — knowledge fields trace to it (`provenance.sources = [evidenceId]`, the KCR-1 vision realized), and KCRs link to it.

```
KnowledgeEvidence = {
  id,
  sourceType,          // official | industry | regional | commercial | event | expert | community | vendor | failure | ai-agent
  authorityLevel,      // primary | official | standards | trade | expert | derived | community  (§4)
  source, url,
  capturedAt, effectiveDate, expirationDate,   // freshness (§8) — never guessed; from the source's policy
  region, industry, roles[], playbooks[],       // scoping
  confidence,          // qualitative (low/med/high) — NEVER a fabricated %
  supports[], contradicts[],                    // fact ids it supports/opposes
  extractedFacts[],    // {field, value} candidate facts
  linkedAssets[], linkedKCRs[],
  humanReviewed, aiReviewed, status,            // candidate | corroborated | accepted | expired | rejected
}
```
**Rule:** evidence is never knowledge. It **supports** knowledge. It becomes canonical only by flowing evidence → KCR → review → publish. Community/AI evidence is **candidate** until corroborated (§4).

---

## 2. Acquisition Pipeline (the one new abstraction)
A **Pipeline** is a registered producer: `run(ctx) → { evidence[], gaps[] }`. It discovers a gap or ingests a channel, emits `KnowledgeEvidence` (candidates) and/or gap findings, and hands off to the KCR bridge. **All ten channels are instances of this one abstraction** — not ten systems. The three that exist today (`researchIntake` = research queue, `validationFindings`, `manualInsights`) are the first pipelines; KAS generalizes them into a **Pipeline Registry** (nine-field, sibling of Readers/Writers).

**Channels (all one shape):** Official · Industry · Regional · Commercial · Event (Reality Reconciliation + Validation) · Expert · Community *(candidate-only)* · Vendor · Failure *(events/issues/lessons)* · AI-Agents.

**AI Research Agents are pipelines, each with ONE responsibility** (Citation · Contradiction · Freshness · Pricing · Regional · Commercial · Gap · Seasonality · Role-Coverage · Dependency) — **propose-only** (Constitution Art. XIII): they emit evidence + open KCRs, never publish, never self-approve. No "general AI researcher."

---

## 3. Evidence authority model
`authorityLevel`, highest → lowest: **primary** (govt/regulatory/standards bodies, first-party data) · **official** · **standards** · **trade** (industry orgs, trade press) · **expert** (named SMEs) · **derived** (our own reconciled event outcomes) · **community** (forums/social). **Corroboration rule:** community/candidate evidence may not become canonical without **≥2 independent higher-authority sources** or an expert review. A fact's grounding cites the *highest* authority that supports it; contradictions across authority levels open a conflict KCR (§7), never a silent pick.

---

## 4. Gap taxonomy
**Extend** the existing KCR quality types — do not fork a parallel taxonomy. The canonical gap types:
`pricing · grounding · safety · regulatory · commercial · timeline · vendor · equipment · regional · cultural · seasonality · capacity · role · quality · knowledge-conflict · knowledge-duplicate · knowledge-stale`.
Each maps to a KCR type + the Research Playbook (§5) that resolves it. (Today's `grounding-gap`/`quality-gap`/`commercial-gap` KCR types are the seed.)

---

## 5. Research Playbooks (governed acquisition workflows)
Research itself is governed. A **Research Playbook** maps a gap-type → *which pipelines to launch · what evidence is required · the freshness policy · the authority floor*. Examples: Pricing Drift · Seasonality · Regional Authenticity · Vendor Validation · Commercial · Operational · Food Safety · Role Coverage. They are **config, catalogued in the Pipeline Registry** (a reusable workflow, not a per-run script). Because they *are* knowledge about how to acquire knowledge, they can later be governed as a `research-playbook` asset kind under the Knowledge Registry — but v1 keeps them as declarative config.

---

## 6. Contradiction engine
Detects Evidence A vs Evidence B (same `linkedAssets`/field, opposing `extractedFacts`). It **never picks a winner** — it opens a `knowledge-conflict` KCR carrying both records for human/SME resolution. Reuses the KCR pipeline (Validation-Platform discipline: nothing self-graded). Silent replacement is banned.

---

## 7. Freshness engine
Each `KnowledgeEvidence` carries an `expirationDate` derived from its source's **freshness policy** (pricing 30–90d · health = monitor · building codes = annual · culture = rarely · timeline best-practice = yearly). A knowledge asset **inherits the tightest expiry** of its linked evidence. On expiry, a freshness pipeline opens a `knowledge-stale` KCR. **Extends** `playbookFreshness` + `kcrGovernance` SLA — does not duplicate them; the new part is *evidence-derived* expiry.

---

## 8. Research prioritization engine
Deterministic + explainable — **not** an AI score. Orders the acquisition queue by weighted factors: **user impact · frequency · commercial value · safety · evidence age · # affected playbooks (dependency impact) · validation failures · real-event failures.** Extends the existing KCR `priority` derivation. Every priority shows its factors; no black-box number.

---

## 9. Knowledge graph (relationship model, not a DB)
The canonical edges, **derived from the `linked*` fields already on each object** (no graph database): `Asset ↔ Evidence ↔ KCR ↔ Validation(IntelEvaluation) ↔ Source ↔ Expert ↔ Dependency ↔ Contradiction`. Reuses `knowledgeImpactPreview` + the `GRAPH_RELATIONS` constant. A queryable view over existing objects — "what evidence grounds this field / what breaks if it changes / which experts back it."

---

## 10. Admin integration
**Extend, don't add a dashboard.** Studio / Command Center / Observatory gain acquisition views: Incoming Evidence · Research Queue *(already exists — generalized)* · Contradictions · Freshness/aging · Coverage · Pipeline Status · Authority Distribution · Evidence Aging. Reuses the shipped panels + palette.

---

## 11. Package compatibility
KAS acquires for any **GovernedAsset** kind (playbook · venue-guide · vendor-guide · policy/procedure · template · checklist · runbook · training · future). Evidence scoping (`playbooks[]` generalizes to `assets[]`) and pipelines declare `applies-to`. **No playbook-specific assumptions.**

---

## 12. Migration
Additive. (1) Promote KCR inline `evidence[]` → referenced `KnowledgeEvidence` records (KCR keeps `linkedEvidence[]` ids; existing inline evidence back-fills as records). (2) Generalize `insightSources` (research/validation/manual) → the Pipeline Registry; each becomes a registered pipeline. (3) Add channels + AI-agent pipelines incrementally. (4) Contradiction/freshness/prioritization are readers over evidence + KCRs. (5) Admin views extend the shipped panels. Read-only w.r.t. host; admin-only; **zero host-facing change**. Nothing bypasses the KCR pipeline.

---

## 13. Change log
- **v1.0 (2026-07-02)** — Established KAS: the four-system separation (Knowledge / Evidence / Acquisition / Publishing); the **one new primitive `KnowledgeEvidence`** (first-class, referenced, traceable) and the **one new abstraction — a registered acquisition Pipeline** (10 channels + AI agents as instances, propose-only). Evidence authority + corroboration model; gap taxonomy extending KCR types; Research Playbooks as governed workflows; contradiction engine (conflict KCR, never auto-pick); evidence-derived freshness; deterministic prioritization; a derived relationship model (no graph DB). Reuses KCR / Validation / Playbook Intelligence / registries / freshness+impact — no duplication, no auto-publish, no fabricated confidence.
