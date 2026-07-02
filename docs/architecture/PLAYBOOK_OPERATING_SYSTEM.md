# Playbook Operating System — v1.0 (Canonical)

**Status:** Canonical, living. The governance layer for the **playbook corpus** — the L2 grounded knowledge base of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md). Curate after each sprint; do not re-invent the framework.
**Owner:** Todd. **Established:** 2026-07-02 (Sprint PLAYBOOK-OPS-1).

> **The thesis:** The playbook library is one of Event Boss's core IP assets. It was static authored content; this OS makes it **observable, measurable, governable, and continuously improvable** — without changing a single playbook's output. It is the corpus-side twin of the Intelligence OS's Readers/Writers registries: same governance shape, different asset.

---

## 0. What this is — and is NOT

- **IS:** an admin-only observability + governance layer that *derives* every metric from the playbook data objects (the single source of truth), computes **component health** (never one fake score), surfaces grounding/freshness/research gaps, and gates promotion to Production.
- **IS NOT:** a new engine, a new playbook, an AI feature, a prediction layer, or any change to host behavior. Playbook OUTPUT (shopping, budget, notifications, readers, tests) is **byte-identical**. Nothing here is user-facing.

**Doctrine it obeys:** EP-1 (one source, no parallel store — the registry is *generated*, not hand-maintained) · DL-002/EP-4 (verify against source; reuse what exists) · the Validation Platform rule (**no single self-graded score; component-level only**) · the Intelligence OS **sequencing** rule (field-validation & prediction stay honest-empty until real events exist).

---

## 1. Architecture — five artifacts (not fifteen)

The sprint's 15 deliverables collapse to five, because the corpus already carried most of the raw material and the codebase already had the governance patterns to reuse.

| Artifact | File | Role |
|---|---|---|
| **Registry (generated)** | `src/lib/playbooks/playbookRegistry.js` | Derives every playbook's metadata, grounding, coverage, dependencies, health, weaknesses, research from the data objects + optional governance block. `buildPlaybookRegistry(asOf)` is the SSOT reader. |
| **Health engine** | same module (`playbookHealth`) | Independent component checks, each `{component, status, reason}`. No composite score. |
| **Command Center** | `AdminConsole.jsx` → **Playbooks** tab | Admin dashboard: corpus rollup → drill-in per playbook. Reuses the admin card/palette pattern. |
| **Quality gates** | `playbookContract.test.js` (+ `playbookRegistry.test.js`) | The promotion gate + regression detection. The gate *engine already existed*; this extends it. |
| **Governance doc** | this file | SSOT for lifecycle, cadence, ownership, release. |

**Reused, not rebuilt:** grounding logic (`scripts/groundingAudit.mjs`), the contract/cost-audit tests, the `AdminConsole` shell, and the Intelligence **Observatory** (engine/reader observability lives there — the Playbook OS does not fork it).

---

## 2. The registry — what is derived vs authored

**Derived from content (no authoring):** `id` (kebab of `type`), `title`, `category` (`family`/`solveFamily`), `version`, `difficulty` (`meta.hostDifficulty`), `leadTimeDays`, `perGuestCost`, `grounding` (from `purchases[].provenance.verificationStatus` + `knowledge`), `coverage` (which engines the populated sections feed), `dependencies`, `weaknesses`, `research`, `health`, `status`.

**Authored (the one non-derivable input) — the co-located `governance` block:**
```js
governance: {
  owner: 'Todd',
  created: '2026-01-01',
  lastReviewed: '2026-06-01',
  reviewIntervalDays: 180,
  status: null,            // null ⇒ derive; or 'draft'|'archived'|'deprecated' to force
}
```
It is **optional**. When absent, the registry marks freshness/cadence **UNSET** and surfaces it as an actionable gap — it **never fabricates a review date**. This is the honest choice: we don't know when 39 playbooks were last reviewed, so we make the gap visible rather than inventing history.

---

## 3. Health model — component status, gated not summed

`playbookHealth(pb, asOf)` returns a component list; each is `ok` / `warn` / `gap` / `n/a` with a reason. Components: **Grounding · Freshness · Cost integrity · Sections · Shopping · Timeline · Decisions · Risks · Contingencies · Food safety · Governance · Validation**.

- **No single score.** A rollup average would hide a load-bearing gap (Validation Platform doctrine).
- **Status is GATED** (`playbookStatus`, mirrors EP-2/DL-007): incomplete sections ⇒ `draft`; priced-but-uncited ⇒ `research-needed`; stale/unset review ⇒ `review-needed`; else `production`. One structural gap caps the status — never summed away.
- **Validation is `n/a` → "awaiting completed events"** until the reconciliation loop has real data (Intelligence OS §5 sequencing). It lights up automatically; it is never faked.

---

## 4. Grounding model

Every priced item's provenance is `{tier, confidence, verificationStatus}` where status ∈ `cited` / `established-consensus` / `synthesized`. Grounding % = cited ÷ priced. Today most of the corpus is `synthesized` (honestly labeled, `knowledge.sources: []`) — so most playbooks are `research-needed` by design. Driving `cited` up via the research pass is the corpus's primary improvement metric. This mirrors `scripts/groundingAudit.mjs` (which stays as the CLI/cron scoreboard); the registry computes the same thing over the live objects for the Command Center.

---

## 5. Research queue — derived, no spreadsheet

`playbookResearch(pb, asOf)` generates tasks from metadata: **pricing** (synthesized priced items) · **review** (overdue cadence) · **cadence** (no governance block) · **food-safety** (hot-cook/raw foodways) · **sources** (empty `knowledge.sources`). The Command Center aggregates these across the corpus, high-priority first. Adding a citation or a review date removes the task automatically.

---

## 6. Coverage & dependencies

**Coverage** = which of the 12 corpus engines a playbook's populated sections feed (sizing/shopping/budget/decisions/timeline/capacity/run-of-show/risks/contingencies/heart/vendors/context). Memory (L4) & Prediction (L5) are **host-intelligence** layers, not corpus-driven — out of scope here (they live in the Intelligence Observatory). **Dependencies** = purchase categories, vendor categories, rentals, and the decision→purchase `affects` wiring.

---

## 7. Quality gates + regression policy

A playbook reaches **Production** only when: sections complete · every food/beverage item priced · contract invariants pass (unique decision ids, well-formed `costFactors`, `p_` id prefixes, valid categories, no qty-mix) · no ratcheted gap regressed. These are enforced by `playbookContract.test.js` (hard invariants + ratcheted `*Gaps: 0`) — the gate *is the test suite*. Regression = any ratchet ceiling rising, a section disappearing, a broken `affects` reference, or grounding dropping; caught by the same tests in CI.

---

## 8. Lifecycle, ownership, review cadence

`draft → research-needed → review-needed → production` (→ `archived`/`deprecated` when retired). Default review cadence **180 days**; food-safety-relevant playbooks should review seasonally. Ownership + dates live in the `governance` block; until one is added, the playbook shows a **cadence-unset** gap in the Command Center — the backlog of "governance blocks to add" is itself the first research queue.

---

## 9. Field validation & change history (scaffolded, honest-empty)

Both depend on **real completed events** the system doesn't have yet (activation bottleneck). They are scaffolded (`entry.validation`, `entry.history`) and shown as "awaiting completed events" in the Command Center. When the Reality-Reconciliation loop (Intelligence OS §4) accrues outcomes, they populate — with **observation only, no prediction, no personalization** (DL-008: identity/data informs by annotation, never computation).

---

## 10. Continuous improvement — the loop

`grounding audit → research queue → author citations + review dates → status advances to Production → regression tests hold the line`. The Command Center makes "where to invest next" answerable in <60s: sort by status, scan the research queue, drill into the lowest-grounded playbook.

---

## 11. Change log
- **v1.0 (2026-07-02)** — Sprint PLAYBOOK-OPS-1. Established the generated registry (`playbookRegistry.js`), the component health engine (no single score, gated status), the grounding/coverage/dependency/research derivations, the co-located `governance` block (optional, never-fabricated dates), the Command Center admin tab, and the quality-gate/regression policy on the existing contract tests. Field validation + change history scaffolded honest-empty per the Intelligence OS sequencing rule. Playbook output byte-identical; 16 registry tests; admin-only.
