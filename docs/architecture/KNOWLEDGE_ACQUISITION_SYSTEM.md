# Knowledge Acquisition System — v1.1 (Canonical)

**Status:** Canonical, living. The **acquisition** layer — how knowledge *enters* the platform and *becomes trusted*. It **manufactures** knowledge from observations → evidence → findings, and routes every change through KCR. It does **not** publish, and (v1.1 mandate) it contains **no crawlers, scrapers, schedulers, background jobs, or auto-executing agents** — this doc freezes architecture only.
**Owner:** Todd. **Established:** 2026-07-02 (KAS-1). **v1.1** upgrades the single-object (Evidence) model to the three-object manufacturing chain (Observation → Evidence → Finding); supersedes v1.0.

> **Think like a knowledge *manufacturing* platform, not a search engine.** The goal is not to retrieve information — it is to continuously turn raw **observations** into corroborated **evidence** into validated **findings** into governed **publication**. Nothing unverified reaches the canonical Knowledge OS.

---

## 0. The manufacturing chain (canonical, no shortcuts)
```
Knowledge Gap ──┐
                ├─▶ KnowledgeObservation ─▶ KnowledgeEvidence ─▶ KnowledgeFinding ─▶ KCR
Signal ─────────┘        (noticed)            (supports/refutes)   (validated conclusion)   │
                                                                                            ▼
                              Production ◀─ Validation ◀─ Knowledge Asset ◀─ Publish ◀─ Review
```
A **Gap** (a known deficiency — from Playbook Intelligence dimensions / the research queue) and a **Signal** (something noticed in the world) both enter as an **Observation**. Observations gather **Evidence**. Corroborated evidence yields a **Finding**. A Finding spawns one or more **KCRs**, which flow through the *existing* publishing pipeline. **No step is skippable.**

---

## 1. EP-1 — what's new vs. what's reused
KAS introduces **three canonical objects** (Observation · Evidence · Finding) + **one abstraction** (a registered acquisition Pipeline). Everything else **reuses**:
- **KCR** (KCR-1…6) — the only write path. Findings *produce* KCRs; KAS never publishes.
- **Validation Platform** — event evidence + finding validation (`IntelEvaluation`); no second validator.
- **Playbook Intelligence** — gap *detection* (dimensions) is an acquisition input, not re-done.
- **Registries** (Readers/Writers/Roles/Knowledge) + **Pipeline Registry** (new, same nine-field discipline).
- **Freshness/impact primitives** (`playbookFreshness`, `kcrGovernance`, `knowledgeImpactPreview`) — extended, not forked.

**Never:** background jobs · scrapers · scheduled research · search agents · LLM orchestration · auto-publish/grounding/approve/edit · fabricated confidence · AI scores · invented evidence.

---

## 2. KnowledgeObservation (something noticed)
The raw signal — **not evidence, not a conclusion.** It says "look here."
```
KnowledgeObservation = {
  id, noticedAt, source,          // where the signal came from (a pipeline, a failure, a host)
  gapType,                        // classified gap (§7) or null (uncategorized signal)
  statement,                      // "DMV crab prices appear to be up"
  region, industry, assets[],     // scope hints
  status,                         // open | evidencing | concluded | dismissed
  linkedEvidence[], linkedFindings[],
}
```
Examples: crab prices increased · new FDA guidance · repeated event failures · vendor closure · recurring planner issue · weather trend. An observation with no evidence goes nowhere — it never becomes knowledge on its own.

---

## 3. KnowledgeEvidence (supports or refutes)
First-class, **referenced** record (realizes the KCR-1 vision `provenance.sources=[evidenceId]`).
```
KnowledgeEvidence = {
  id, sourceType, authorityLevel, source, url,
  capturedAt, effectiveDate, expirationDate,        // freshness (§10)
  region, industry, roles[], assets[],
  confidence,                                        // qualitative — never a fabricated %
  extractedFacts[],                                  // {field, value}
  supports[], contradicts[],                         // observation/fact ids
  linkedObservations[], linkedFindings[], linkedKCRs[], linkedAssets[],
  humanReviewed, aiReviewed, status,                 // candidate | corroborated | accepted | expired | rejected
}
```
Community/AI evidence is **candidate** until corroborated (§4). Evidence is never knowledge — it *supports* it.

---

## 4. KnowledgeFinding (validated conclusion)
The analytical conclusion drawn from evidence — **the thing that generates KCRs.** One finding references many evidence records; one finding may spawn many KCRs (across affected assets).
```
KnowledgeFinding = {
  id, concludedAt, gapType,
  conclusion,                       // "DMV blue-crab $/dozen rose ~18% vs the corpus value"
  evidence[],                       // the KnowledgeEvidence backing it
  authorityFloorMet, corroboration, // how many independent sources (§4 rule)
  contradictions[],                 // unresolved conflicts (→ conflict KCR, §9)
  affectedAssets[], recommendedKCRs[],
  status,                           // proposed | corroborated | routed | superseded
}
```
**EP-1 note:** a Finding is *not* a KCR — it is the corroborated conclusion upstream of one; the KCR is the governed change request. A Finding with unresolved contradictions routes a `knowledge-conflict` KCR (§9), never a silent replacement.

---

## 5. Acquisition Pipeline (the one new abstraction)
A **Pipeline** is a registered producer of Observations/Evidence for one channel: `run(ctx) → { observations[], evidence[] }`. The **10 channels are instances of one abstraction**, not 10 systems. Each declares: **ownership · trust level · freshness policy · validation requirements · review cadence · applies-to kinds.** Today's `researchIntake`/`validation`/`manual` sources are the first pipelines — generalized here. **AI Research Agents are pipelines too** (Citation/Contradiction/Freshness/Pricing/Regional/Commercial/Gap/Seasonality/Role/Dependency), each one responsibility, **propose-only** (Art. XIII) — and in v1.1 they are *designed, not executing*.

Channels: **Official · Industry · Regional · Commercial · Event Intelligence · Expert Network · Community *(candidate-only)* · Vendor · Failure Intelligence · AI Research Agents.**

---

## 6. Evidence authority framework
`authorityLevel` (high→low): **primary** (govt/regulatory/standards, first-party) · **official** · **standards** · **trade** · **expert** (named SME) · **derived** (our reconciled outcomes) · **community**. **Corroboration rule:** community/candidate evidence may not reach a Finding without ≥2 independent higher-authority sources or expert review. A finding cites the *highest* authority supporting it; cross-authority conflicts open a conflict KCR (§9).

---

## 7. Gap taxonomy (extends KCR types — not a fork)
`pricing · grounding · regional · timeline · commercial · vendor · safety · equipment · cultural · seasonality · capacity · role · coverage · quality · knowledge-conflict · knowledge-duplicate · knowledge-stale`. **Not hardcoded to playbooks** — applies to any governed kind. Each gap type maps to a Research Playbook (§8).

---

## 8. Research Playbook framework (governed acquisition workflows)
Research itself is governed: a Research Playbook maps `gapType → {pipelines to launch, evidence required, authority floor, freshness policy}`. Examples: Pricing Drift · Regional Review · Food Safety · Commercial Review · Accessibility Review · Operational Review · Venue Review · Role Coverage. Declarative config in the Pipeline Registry (later promotable to a `research-playbook` governed asset kind).

---

## 9. Contradiction framework
Never silently replaces knowledge: `Observation → Evidence → Contradiction (A vs B) → Finding → knowledge-conflict KCR → Review → Publish`. Detected when evidence records on the same asset/field carry opposing `extractedFacts`. Resolution is a governed human/SME decision via KCR — reuses the pipeline; nothing self-graded.

---

## 10. Freshness framework
Every `KnowledgeEvidence` carries an `expirationDate` from its source's **freshness policy** (pricing 30–90d · regulations = monitor/annual · culture = rarely · operational practice = yearly · safety = immediate · seasonality = seasonal). A knowledge asset **inherits the tightest expiry** of its linked evidence; on expiry → a `knowledge-stale` observation → finding → KCR. **Not hardcoded** — policy per source/gap type. Extends `playbookFreshness`/`kcrGovernance`; the new part is *evidence-derived* expiry.

---

## 11. Research Queue architecture
Prioritizes acquisition — deterministic + explainable, **no AI score.** Ordered by: **impact · safety · commercial value · evidence age · dependency impact · validation failures · real-event failures · role coverage · corpus coverage.** Extends the shipped research queue + KCR `priority`; every rank shows its factors. The queue holds *open Observations/Gaps awaiting acquisition*, not finished KCRs.

---

## 12. Corpus Intelligence model
Aggregates across the corpus to answer the manufacturing questions: **what don't we know · what changed · what conflicts · what's stale · where are citations missing · what to research next · which packages are weakest · which playbooks need regional variants · which roles are underserved.** Derived over the Knowledge Registry + Evidence/Findings; each answer is a candidate Observation → queue. No new store.

---

## 13. Knowledge graph (relationship model, not a DB)
Canonical edges **derived from the `linked*` fields** on each object — no graph database: `Asset ↔ Evidence ↔ Observation ↔ Finding ↔ KCR ↔ Validation ↔ Source ↔ Expert ↔ Dependency ↔ Contradiction`. Reuses `knowledgeImpactPreview` + `GRAPH_RELATIONS`.

---

## 14. Admin integration
**Extend, don't add a dashboard.** Studio / Command Center / Observatory gain acquisition workspaces: Incoming Observations · Evidence (by authority/aging) · Findings · Contradictions · Research Queue *(generalized)* · Freshness · Coverage · Pipeline Status.

---

## 15. Package compatibility
Acquires for any **GovernedAsset** kind (playbook · venue-guide · vendor-guide · corporate-SOP · government-event · package · template · checklist · training · runbook · future). Evidence/observation scoping uses `assets[]`; pipelines declare `applies-to`. **No playbook-specific assumptions.**

---

## 16. Migration
Additive, design→build in slices. (1) Add the three objects + stores (mirror the KCR store). (2) Promote KCR inline `evidence[]` → referenced `KnowledgeEvidence`; KCRs keep `linkedEvidence[]`/`linkedFindings[]`. (3) Generalize `insightSources` → the Pipeline Registry (research/validation/manual = first pipelines). (4) Contradiction/freshness/prioritization/corpus-intelligence are readers over the objects. (5) Admin views extend shipped panels. Read-only w.r.t. host; admin-only; **zero host-facing change**; nothing bypasses KCR.

---

## 17. Change log
- **v1.1 (2026-07-02)** — Upgraded to the three-object manufacturing chain: **KnowledgeObservation** (noticed) → **KnowledgeEvidence** (supports/refutes) → **KnowledgeFinding** (validated conclusion → KCRs). Added the Research Queue architecture and Corpus Intelligence model as first-class sections. Reaffirmed: one Pipeline abstraction (10 channels + agents as instances, propose-only, *not executing*), authority + corroboration, gap taxonomy extending KCR types, governed Research Playbooks, contradiction-via-KCR (never auto-pick), evidence-derived freshness, deterministic prioritization, derived relationship model. **Architecture frozen — no implementation** (no crawlers/schedulers/agents). KAS is the last foundational OS; after it, work shifts to enriching the corpus.
- **v1.0 (2026-07-02)** — Initial acquisition architecture (single-object Evidence model). Superseded by v1.1's three-object chain.
