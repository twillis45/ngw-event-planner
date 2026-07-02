# Knowledge Studio — Canonical Knowledge Production Pipeline (v1.0)

**Status:** Canonical, living. The **governed write-side** of the [Knowledge OS](./KNOWLEDGE_OPERATING_SYSTEM.md). The [Knowledge Command Center](../../src/admin/AdminConsole.jsx) *reads* corpus health; the Studio *acts* — it produces and evolves knowledge through one governed pipeline. Sprint KCR-1 (2026-07-02).
**Owner:** Todd. Extends — does not duplicate — the Knowledge OS, Intelligence OS, and the four registries.

> **The rule:** Knowledge never changes directly. Every published value is traceable:
> `Knowledge Asset ▲ Published Version ▲ Approved KCR ▲ Evidence ▲ Insight`.

---

## 1. One primitive: the Knowledge Change Request (KCR)
`src/lib/knowledge/knowledgeChange.js` — the ONE permanent work-object for changing canonical knowledge. **Research Tickets are retired**: research is `KCR{type:'research'}`. Types: research · correction · citation · pricing-update · seasonal-update · regulation-update · sme-revision · customer-feedback · validation-finding · ai-suggestion · retirement · new-knowledge · contradiction · missing-evidence. No second backlog is ever created.

KCRs are **governance work-objects, not canonical knowledge** (Constitution Art. I): the Studio owns them; the Knowledge layer owns assets + provenance. A KCR writes a versioned change to an asset **only at publish, only with evidence, only after review.**

**Trigger** (the causal "why is our knowledge changing?" analytics axis — one taxonomy, not two): research · customer · planner · coordinator · corporate · validation · ai · freshness · regulation · incident · post-event · market-change · sme.

## 2. The one governed pipeline (gated state machine)
```
Insight → KCR(draft) → researching → grounded → review → approved → published → monitoring
                                                    │                        └→ revision → researching
                                              (SME + Editorial + Governance;   (rollback)
                                               AI advisory only)
```
Maps to the canonical Knowledge Lifecycle (no new one). **Gates (enforced in code):** cannot enter `review` without a proposal; cannot reach `approved` without SME **and** editorial **and** governance approval (the AI vote is advisory, never counted); **cannot publish a `cited` value without linked supporting evidence** (`canReachCited`). Every transition stamps the audit trail.

## 3. Evidence ≠ Knowledge
Evidence *supports* a proposed value; it never becomes knowledge automatically. Each evidence record: `{source, sourceType, url, excerpt, confidence, supports, contradicts, capturedAt}`. A value reaches `verificationStatus:'cited'` only when a non-contradicting citation/primary/secondary/dataset source is attached — the structural guarantee behind "nothing grounded without evidence."

## 4. Version lineage + rollback
`publishKCR` mints a version record `{id, kcrId, field, from, to, provenance, reason, trigger, supersedes}` — the audit trail from insight to published value — and records the rollback pointer. `rollbackKCR` returns the asset to its prior version via a compensating revision KCR. Every asset can answer: created · modified · why · evidence · published-by · version · supersedes · rollback · consumers · dependencies · review cadence.

## 5. Knowledge Impact Preview (derived, pre-publish)
`knowledgeImpactPreview(asset, field)` computes, before publishing, the downstream blast radius **from the field kind + the decision→purchase `affects` wiring** — no manual list: affected recommendation engines, readers (Intelligence Readers Registry), affected purchases, gating decisions, downstream systems (budget/shopping/sourcing/…), knowledge packages. Categories that need a build-time index we don't have at runtime (prompts, tests, templates) are **honest-empty with a reason — never fabricated** (Honesty doctrine). `deriveDependentKCRs` fans out re-verify KCRs to dependents.

## 6. Governed Asset abstraction
`src/lib/knowledge/governedAsset.js` — playbook is kind #1; every governed kind inherits the same capabilities (lifecycle · maturity · health · provenance · review cadence · dependency graph · KCR history · version history · validation history) by **delegating to the Knowledge Registry derivations — never re-implementing them.** Governed kinds (independent authored truth): playbook · venue-kit · guide · policy · procedure · prompt-pack · corporate-standard · reference. **Projected kinds** (runbook · checklist · template · workflow) are **views of an authored asset, not governed entries** — governing them separately would fork truth (rejected in code).

## 7. Knowledge Confidence
Component-based (Evidence · Sources · Freshness · Validation), each with a level + reason — **never one AI score**. Validation stays `unknown`/"awaiting completed events" until the `IntelEvaluation` corpus has real data (Intelligence OS sequencing).

## 8. Migration notes
Additive + backward-compatible. New: the KCR module + governed-asset abstraction (pure libs, `src/lib/knowledge/`). Reused: Knowledge Registry (impact/confidence), the four registries, the canonical lifecycle, the Validation Platform (honest-empty). **No runtime/host-output change; admin-only; no UI built** (Studio sub-workspaces are parked). The KCR persistence store, Studio UI, tenant overlays, marketplace, and AI automation are explicitly parked. Scales 40 → 40,000 because it is a pure pipeline over a derived registry + a queryable KCR backlog — the same scaling profile as the Command Center.

## 9. QA
Golden test (`knowledgeChange.test.js`): insight → research KCR → evidence → grounding → SME/editorial/governance review → published → version created → dependency preview → rollback, every stage asserted. Plus: gate enforcement, cited-gate, impact derivation, component-only confidence, governed-asset contract, projection rejection, purity. 14 tests; full suite green; build clean.

## 10. Change log
- **v1.0 (2026-07-02)** — Sprint KCR-1. KCR as the single knowledge write-primitive (Research Ticket retired); the one gated production pipeline (insight→published→version→monitoring) with SME/editorial/governance review + AI-advisory; evidence model + cited gate; version lineage + rollback; derived Knowledge Impact Preview; the Governed Asset abstraction (playbook = kind #1, projections rejected as kinds); component-based confidence. Pure libs, admin-only, byte-identical runtime. No Studio UI (parked).
