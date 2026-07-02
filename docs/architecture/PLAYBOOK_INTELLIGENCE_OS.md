# Playbook Intelligence OS — v1.0 (Canonical Quality Layer)

**Status:** Canonical, living. The **quality** layer over the [Knowledge OS](./KNOWLEDGE_OPERATING_SYSTEM.md). It answers a question governance cannot: *is this knowledge asset actually world-class?* It **evaluates, never generates; audits, never writes; recommends via KCR, never publishes.**
**Owner:** Todd. **Established:** 2026-07-02 (Playbook Intelligence 1.0).

> **The one line:** Governance (KCR pipeline) makes knowledge *safe to change*. This makes knowledge *good* — a set of independent quality **Dimensions**, each of which can only *recommend* (open a KCR), never edit. No single score, ever.

---

## 0. What this is — and is NOT (the EP-1 discipline)
- **IS:** the maturation of the existing component-health engine (`playbookHealth`, 12 checks today) into a governed **Dimension framework** — richer per-dimension output, more dimensions, and a bridge that routes every failing dimension into a **KCR** (the one write-path).
- **IS NOT:** a new AI engine, a new scoring model, a new validation engine, a new Observatory, a new governance registry, or a new dashboard. It reuses all of those.

**It supersedes** the ad-hoc `playbookHealth` component list with a governed **Dimension Registry** — same shape (`{status, reason}`, no single score), extended contract, and the same read-only purity. `playbookHealth`'s 12 checks become the first 12 dimensions.

---

## 1. The one new primitive: a Dimension
A **Dimension** is an independent, pure evaluator of one quality axis of a knowledge asset. Its output contract (every dimension answers all seven):

```
Dimension.evaluate(asset, kind, ctx) → {
  status,            // 'ok' | 'warn' | 'gap' | 'n/a'   (never a number, never averaged)
  reason,            // one honest sentence
  evidence,          // what supports the status (counts, cited items, sections present)
  missingEvidence,   // what's absent that a human/KCR must supply
  recommendedKCRs,   // [{type, trigger, fieldPath, reason}] — routed, never auto-applied
  affectedEngines,   // derived (reuses knowledgeImpactPreview)
  reviewInterval,    // days until re-evaluation
}
```

**Hard rules (inherited doctrine):** no single "intelligence score"; dimensions are **never averaged** (EP-2/DL-007 — one gap is a gap, not diluted); no percentage without evidence (Validation Platform §8); a dimension that can't determine ⇒ `n/a`, honest-empty, never fabricated.

---

## 2. Dimension Registry
A code catalog of the dimensions (the QA sibling of the Readers Registry — **not** a parallel governance DB). Each entry: `id · applies-to (kinds) · what-it-checks · reuses (existing logic) · KCR type it opens · review interval`. Nothing evaluates unregistered.

| Dimension | Status | Reuses / Notes |
|---|---|---|
| Grounding | ✅ exists (`playbookHealth`) | provenance/citations/pricing confidence |
| Cost integrity · Sections · Freshness · Governance · Validation | ✅ exist | Validation reuses `IntelEvaluation` (honest-empty) |
| Food Safety | ✅ exists | **reuse only — never duplicate** the safety logic |
| Shopping / Timeline / Decisions / Risks / Contingencies | ✅ exist (shallow) | **deepen**: Shopping → quantities/substitutions/sourcing/seasonal/package-size/waste; Timeline → impossible sequences/unrealistic durations/missing prep+cleanup+lead-time; Decisions → *material* (moves cost/shopping/schedule/staffing/vendors) vs cosmetic |
| **Operational Completeness** | ⚪ new | can someone actually execute it? tasks + timeline + dependencies + equipment + staffing + logistics present |
| **Cultural Authenticity** | ⚪ new (**heuristic → human**) | flags *generic vs insider* (presence of `knowledge` grounding, regional markers, verificationStatus); **never asserts authenticity** — routes a KCR for insider review. Honest-empty when undeterminable |
| **Regional Correctness** | ⚪ new (heuristic → human) | region markers present + consistent (DMV/Texas/Lowcountry/New England…) |
| **Commercial Quality** | ⚪ new | does each persona (host/planner/coordinator/corporate/venue) get enough operational value? reuses coverage |
| **Venue Adaptability** | ⚪ new | home/restaurant/park/venue/hotel/corporate/outdoor/apartment coverage |

---

## 3. Evaluation engine
`evaluateAsset(asset, kind, asOf)` runs every registered dimension whose `applies-to` includes `kind` → returns the dimension results (no rollup number). `evaluateCorpus(asOf)` maps it over the Knowledge Registry. Pure (asOf injected). This is the generalization of `buildPlaybookRegistry().entries[].health` — the registry's `health` becomes `dimensions`.

---

## 4. KCR integration (the only write-path)
A failing dimension **does not edit the asset**. It emits `recommendedKCRs`, and a bridge (a new *insight source*, alongside research-queue + validation) turns them into KCRs via the existing `insightToKCR` — deduped by the deterministic id, typed `quality-gap` / `grounding-gap` / `commercial-gap` / etc. Everything routes through the KCR pipeline (KCR-1…6): evidence → review → publish. **No auto-fix, no auto-publish.**

---

## 5. Admin integration
**Extend, don't add a dashboard.** The Studio drill-in gains a **Dimensions** section (each dimension's status/reason/missing-evidence + a one-tap "open the recommended KCR"); the Command Center gains a corpus **Quality** rollup. Reuses the shipped panels + palette.

---

## 6. Corpus intelligence
`evaluateCorpus` aggregates dimensions across assets to answer: weak event categories · playbooks with recurring gaps · missing citations · most-failing dimensions · never-validated playbooks · duplicated/conflicting/stale knowledge. Surfaced in the Command Center; each finding is a candidate KCR. No new store — derived over the registry.

---

## 7. Knowledge Package compatibility
Dimensions evaluate any **GovernedAsset** (playbook · venue-kit · guide · policy · procedure · prompt-pack · reference), reading via the governed-asset accessors and declaring `applies-to` kinds. **Never hardcode playbook fields** — a dimension that needs a section it can't find on a kind returns `n/a` for that kind.

---

## 8. Migration
Additive. (1) Generalize `playbookHealth` component list → the Dimension Registry (the 12 existing checks become dimensions, extended contract). (2) Add the new dimensions incrementally. (3) Add the dimension→KCR bridge as an insight source. (4) Rename the registry entry's `health` → `dimensions` (keep `health` as an alias for one release). Read-only; admin-only; **zero host-facing change** (`lib/knowledge` + `playbookRegistry` are admin/lib-only).

---

## 9. Change log
- **v1.0 (2026-07-02)** — Established the Quality OS as the maturation of `playbookHealth` into a governed **Dimension** framework (one primitive: an independent evaluator with a 7-field contract, no single score, never averaged). Dimension Registry (existing 12 + new: Operational Completeness, Cultural Authenticity *(heuristic→human)*, Regional, Commercial, Venue Adaptability). Failing dimensions route to **KCR** as a new insight source (no auto-fix). Admin = extend Studio/Command Center. Corpus intelligence derived over the registry. Package-compatible via GovernedAsset. Reuses Validation/Food-Safety/Observatory/KCR/registries — no duplication.
