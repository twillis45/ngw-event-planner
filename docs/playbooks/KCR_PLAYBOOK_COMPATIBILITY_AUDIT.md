# KCR -> Playbook Provenance Compatibility Audit

**Date:** 2026-08-01 - **Read-only. No code changed, no data backfilled.**
**Answers:** Q3 from `PLAYBOOK_RESEARCH_BACKFILL_PLAN.md` -- "is published KCR output
schema-compatible with the playbook provenance block?"

---

# CORRECTION TO THE PRIOR AUDIT -- read this first

`ADMIN_PLAYBOOK_CAPABILITY_AUDIT.md` stated as its headline finding:

> "There is no write path from any research output to any playbook field... A KCR can be
> researched, evidenced, reviewed, approved and published -- and it still cannot put a
> `provenance` block on `p_crabs`."

**That is wrong, and I am withdrawing it.**

The write path exists, is complete, and includes a working transformer. I missed it because
I traced only the module names I already knew (`governedAsset`, `kcrStore`, `kcrGovernance`,
`researchPipeline`, `campaignRunner`) and did not enumerate the 44 modules that carry
`fieldPath`. Four modules central to this question were never inspected:

| Module | Lines | What it does |
|---|---|---|
| `playbookSchema.js` | 529 | `FIELD_TYPES`, `GAP_CRITERIA`, `parseFieldPath()`, **`getPlaybookField()`**, **`setPlaybookField()`**, `detectGapsInPlaybook()`, `isHighConfidenceProvenance()` |
| `playbookMerge.js` | 250 | **`proposePlaybookUpdate(playbook, fieldPath, evidence, userApproval)`**, `savePlaybookUpdate()`, `consensusValue()`, `loadPlaybookWithUpdates()` |
| `knowledgeOverride.js` | 83 | **`overrideFromPublishedKCR(kcr)`** -- the transformer -- plus `effectiveValue()`, `applyOverride()`, `rollbackOverride()` |
| `runtimeResolver.js` | 57 | `resolveKnowledge(asset, fieldPath, { overrides, ... })` |

The accurate finding is narrower and more actionable: **the write path is built and
unconsumed.**

---

# Facts confirmed in code

- **F1.** The KCR record is **field-addressed**. `knowledgeChange.js:70-85` creates:
  `{ id, type, trigger, createdBy, createdAt, assetId, assetKind, fieldPath, currentValue,
  currentProvenance, reason, status, priority, impact, evidence[], contradictions[],
  proposal, review{sme,editorial,ai,governance}, publishedVersion, rollbackTo, audit[] }`.
- **F2.** `proposal` is documented in-code as
  `{ newValue, newProvenance: { verificationStatus, sources[] }, rationale }`.
- **F3.** The transformer exists: `overrideFromPublishedKCR(kcr)` gates on
  `status === 'published' && kcr.proposal`.
- **F4.** `readAuthored(pb, fieldPath)` **already supports the purchase path shape**
  `'<purchaseId>.<attr>'`, with `p_crabs.unitCostRange` given as the in-code example.
- **F5.** `effectiveValue()` implements a documented 4-tier precedence: host-locked ->
  explicit override -> **published snapshot** -> authored default. It returns a `source`
  discriminator (`'override'` vs `'published'`) deliberately, because the two differ in
  reversibility.
- **F6.** Conveyor 1 transport is built: `publishedSnapshot.js`, `publishedSnapshotBuild.mjs`,
  and `publishedKnowledge.json`.
- **F7.** **`publishedKnowledge.json` has `entryCount: 0`.** The snapshot exists and is empty.
- **F8.** `knowledgeOverride` and `runtimeResolver` have **zero** consumers anywhere outside
  `src/lib/knowledge/`.
- **F9.** `playbookSchema` and `playbookMerge` ARE consumed -- by `AdminConsole.jsx`,
  `PlaybookCampaigns.jsx` and `workflowCompression.js`. Admin can already propose and merge.
- **F10.** The playbook engine reads **no** overrides: `grep` for
  `knowledgeOverride|effectiveValue|getMergedPlaybooks|loadPlaybookWithUpdates` returns **0**
  in `playbooks/index.js`, `CommandCenter.jsx` and `HostShellV2.jsx`.
- **F11.** Persistence is **localStorage only** -- `ngw-kas-overrides` (overrides) and
  `ngw-playbook-<type>` (merged playbooks).
- **F12.** `playbookRegistry.js` already derives provenance gaps and a research queue:
  `playbookWeaknesses()` emits *"N priced item(s) without a provenance block"* and
  `playbookResearch()` emits `{ kind, priority, reason }` items.
- **F13.** `changeDetector.js:89` already branches on
  `prevObservation.fieldPath.includes('unitCostRange')` -- playbook price fields are already
  first-class in change detection.

---

# Schema comparison tables

## A. Research output -> B. Governance -> C. Published KCR -> D. Playbook provenance

### Table 1 -- Record-level field mapping

| Playbook provenance field | Source in the KCR chain | Mapping | Status |
|---|---|---|---|
| `verificationStatus` | `kcr.proposal.newProvenance.verificationStatus` | direct | **MATCH** (F2) |
| `sources[]` | `kcr.proposal.newProvenance.sources[]` | direct | **MATCH** (F2) |
| `tier` | -- | **no KCR field** | **GAP** |
| `confidence` | -- | **no KCR field** | **GAP** |
| `note` | `kcr.proposal.rationale` | rename | **NEAR-MATCH** |

### Table 2 -- Addressing and lifecycle

| Concern | KCR | Playbook | Compatible? |
|---|---|---|---|
| Which asset | `assetId`, `assetKind` | `pb.type` | Yes -- `effectiveValue` matches `o.assetId === pb.type` |
| Which field | `fieldPath` | `'<purchaseId>.<attr>'` | **Yes -- already implemented** (F4) |
| Prior value | `currentValue`, `currentProvenance` | the authored block | Yes -- `readAuthored()` |
| New value | `proposal.newValue` | the field | Yes -- `setPlaybookField()` |
| Approval | `review{sme,editorial,ai,governance}` | *(none)* | KCR-side only; playbooks have no review state |
| Version | `publishedVersion`, `rollbackTo` | `pb.version` (a string, no history) | **Partial** -- KCR is richer |
| Audit | `audit[]` | *(none)* | KCR-side only |

### Table 3 -- Type mismatches found

| # | Mismatch | Detail |
|---|---|---|
| T1 | **`tier` has no KCR equivalent** | Playbook provenance carries a 12-value tier vocabulary (`primary`, `researched`, `trade-heuristic`, `cultural-tradition`, `culture-bearer`, `matriarch`, ...). `newProvenance` declares only `verificationStatus` + `sources`. |
| T2 | **`confidence` has no KCR equivalent** | Same. And the playbook side is already inconsistent -- `medium` (82) vs `med` (18). |
| T3 | **`sources[]` element type is ambiguous on the playbook side** | Sometimes a resolvable id (`'webstaurant-protein-2026'`, `'usda-meat-2026'`), sometimes free prose. `isGroundedCost()` requires *every* id to resolve in `COST_SOURCES`, so prose entries fail grounding silently. |
| T4 | **Domain readers demand `tier === 'researched'`** | `isGroundedCost(prov)` requires `tier === 'researched'` **and** >=1 resolving source. A KCR-derived provenance with no `tier` would be **ungrounded by construction** -- it would write successfully and then fail every grounding check. |

**T4 is the compatibility finding that matters.** The chain would not error; it would produce
provenance that the runtime grounding predicates silently reject.

---

# Gaps

| # | Gap | Severity |
|---|---|---|
| **G1** | `knowledgeOverride` / `runtimeResolver` have **zero consumers**. The playbook engine never calls `effectiveValue()`, so no override or published value can reach `eventPlan()`. | **The gap** |
| **G2** | `proposal.newProvenance` carries no `tier` or `confidence`, which domain grounding predicates require (T4). | High |
| **G3** | `publishedKnowledge.json` is empty (`entryCount: 0`). The transport is built and carrying nothing. | High |
| **G4** | Persistence is localStorage. Admin merges and overrides are per-browser -- not shared, not deployed, not durable. | High |
| **G5** | `sources[]` mixes ids and prose (T3), so grounding cannot be evaluated programmatically for a third of existing entries. | Medium |
| **G6** | Playbooks have no review state, audit trail or version history to receive the KCR's richer lifecycle. | Low -- KCR retains it |

---

# Risks

- **R1 -- Silent ungrounding (T4).** A published KCR writes an override with
  `verificationStatus` + `sources` but no `tier`. `isGroundedCost()` returns false. The
  product shows a price that *is* researched and reports it as ungrounded. Worse than the
  status quo, because it is invisible.
- **R2 -- Two sources of truth by construction.** `playbookMerge` writes merged playbooks to
  `ngw-playbook-<type>`; `knowledgeOverride` writes to `ngw-kas-overrides`. Both claim the
  same field. `effectiveValue()` knows about overrides and the snapshot but **not** about
  merged playbooks. Wiring both without reconciling them would give one field two answers.
- **R3 -- localStorage is not a publication channel (G4).** An admin who merges a playbook has
  changed their own browser. Nothing reaches a host. Any plan that treats Admin merge as
  "publishing" is wrong today.
- **R4 -- The empty snapshot masks the wiring gap.** Because `publishedKnowledge.json` is
  empty, wiring `effectiveValue()` into the engine would change nothing observable, and could
  be mistaken for "wired and working". The wiring must be proven with a populated entry.
- **R5 -- Unverified assumption.** I did not execute the Admin merge flow in a live
  authenticated session (the public build forces Supabase empty). `proposePlaybookUpdate` and
  `savePlaybookUpdate` are read as source, not driven.

---

# Feasibility of Options 1 / 2 / 3

| Option | Prior assessment | Corrected assessment |
|---|---|---|
| **1 -- Generate playbook files** | "large blast radius" | Unchanged, and now clearly redundant: `setPlaybookField()` + `savePlaybookUpdate()` already do this without regenerating files. |
| **2 -- Runtime override layer** | "shortest distance to a seam" | **Already built.** Transformer, precedence ladder, resolver and snapshot transport all exist. Remaining work is one consumer + persistence. |
| **3 -- Admin-authored patch files** | "slowest" | Partially built (`playbookMerge` writes patches) but to localStorage, not to committed files. Would need a real export step. |

**Option 2 is not a proposal. It is a 90%-complete implementation with no consumer.**

---

# Recommended smallest implementation path

Not an approval to build -- the smallest *correct* sequence, in dependency order.

**Step 1 -- Close T4/G2 before anything is wired (S).**
Decide how `tier` and `confidence` are produced for a KCR-derived provenance. Either extend
`proposal.newProvenance` to carry them, or define a deterministic derivation
(e.g. `verificationStatus: 'cited'` -> `tier: 'researched'`). **Until this is settled, every
published value is ungrounded by construction**, and wiring the path would ship R1.

**Step 2 -- Prove the transport with ONE entry (S).**
Publish a single KCR for one field -- `p_crabs.unitCostRange` is the in-code example and the
best-sourced item in the corpus -- and confirm `publishedKnowledge.json` gains an entry.
Until `entryCount > 0`, nothing downstream can be verified (R4).

**Step 3 -- Wire exactly one reader (S).**
Have the playbook engine consult `effectiveValue()` for **purchase provenance only**. This is
the one-line change G1 describes. Scope it to a single field type so the blast radius is a
provenance block, not a price.

**Step 4 -- Reconcile the two stores before wiring the second reader (M).**
`playbookMerge` and `knowledgeOverride` must not both answer for one field (R2). Pick one as
authoritative, or make `effectiveValue()` aware of both with a stated precedence.

**Step 5 -- Replace localStorage with the server store (M/L).**
`src/lib/api/kcr.js` and `kaw1-migration.sql` exist. Until this lands, nothing an admin does
reaches a host (R3).

## What NOT to do

- **Do not build a transformer.** `overrideFromPublishedKCR()` exists and is correct as far
  as it goes; it needs two fields added, not a rewrite.
- **Do not build gap detection.** `playbookWeaknesses()`, `playbookResearch()` and
  `detectGapsInPlaybook()` all exist (F12).
- **Do not wire the engine before Step 1.** Shipping R1 would make researched prices report
  as ungrounded -- a regression disguised as progress.
- **Do not treat Admin merge as publication** until Step 5 (R3).

---

# Answer to Q3

**Yes, with two named exceptions.** The KCR chain is field-addressed, already understands the
playbook purchase path shape, and carries a transformer that maps proposal -> override. The
addressing, lifecycle and value fields all map cleanly.

The incompatibility is confined to two provenance attributes -- **`tier` and `confidence`** --
which the playbook side requires for grounding and the KCR proposal does not carry. That is a
schema addition measured in fields, not a translation layer.

**The last mile is not missing. It is built, unconsumed, and pointed at an empty snapshot.**
