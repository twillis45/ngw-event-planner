# Phase 5A -- KCR -> Playbook Activation: Implementation Design

**Date:** 2026-08-01 - **Read-only design audit. Nothing implemented.**
**Predecessor:** `KCR_PLAYBOOK_COMPATIBILITY_AUDIT.md`

---

# Current state

The chain is built end to end and **already proven by a test**. `kasVerticalSlice.test.js`
asserts *"the complete chain, every stage, one field"*: Observation -> Evidence -> Finding ->
KCR -> SME + editorial + governance review -> Publish -> override -> `effectiveValue`.

What exists, confirmed in code:

| Stage | Module | State |
|---|---|---|
| Field addressing | `playbookSchema.js` -- `parseFieldPath`, `getPlaybookField`, `setPlaybookField` | built, Admin-consumed |
| Proposal / merge | `playbookMerge.js` -- `proposePlaybookUpdate`, `savePlaybookUpdate` | built, Admin-consumed |
| Transformer | `knowledgeOverride.js` -- `overrideFromPublishedKCR` | built, **0 consumers** |
| Precedence | `knowledgeOverride.js` -- `effectiveValue` (4 tiers) | built, **0 consumers** |
| Transport (builder) | `publishedSnapshotBuild.mjs` -- `isPublishable`, `buildSnapshot` | built, pure, deterministic |
| Transport (CLI) | `scripts/bake-published-knowledge.mjs` (101 lines, **tracked**) | built, **not wired to any npm script or CI step** |
| Transport (loader) | `publishedSnapshot.js` -- re-validates every entry, degrades to authored | built |
| Artifact | `publishedKnowledge.json` | **`entryCount: 0`** |

Three facts define the remaining work:

- **C1.** `publishedKnowledge.json` is empty. The transport carries nothing.
- **C2.** The bake CLI is tracked but wired to nothing -- no `package.json` script, no CI step.
- **C3.** No runtime reader calls `effectiveValue()`. `playbooks/index.js`,
  `CommandCenter.jsx` and `HostShellV2.jsx` return **0** matches.

And one that changes the slice choice:

- **C4.** Purchase `provenance` is **already read at runtime** -- `playbooks/index.js:963`
  computes `qtyGrounded: isGroundedItemQty(p.provenance)`, and `HostShellV2.jsx:9357`
  renders `it.provenance.note`. `unitCostRange` is read at `:3004` and `:3416`.

---

# Answers to the four questions

## A. Should `knowledgeOverride` become the single source for published playbook enrichment?

**Yes -- for the published path. It already is, by design.**

`effectiveValue()` is the only function in the codebase that resolves the four tiers in a
stated order (host-locked -> override -> published snapshot -> authored). Its own comments
explain why `source` distinguishes `'override'` from `'published'`: the two differ in
reversibility, and collapsing them "would promise a rollback the transport cannot honour."
That reasoning is correct and should not be re-litigated.

**Caveat:** it resolves overrides and the snapshot. It does **not** know about
`playbookMerge`'s store. Making it the single source requires resolving B.

## B. Should `playbookMerge` and `knowledgeOverride` be unified?

**No. They are different mechanisms, and merging them would lose a capability.**

| | `knowledgeOverride` | `playbookMerge` |
|---|---|---|
| Unit | one field | a whole playbook object |
| Storage | `ngw-kas-overrides` (one list) | `ngw-playbook-<type>` (one per playbook) |
| Mutates source? | never -- resolver only | produces an updated playbook |
| Rollback | drop the override record | none |
| Entry gate | `status === 'published'` | `userApproval` argument |

**Recommendation: keep both, and make the boundary explicit.** `playbookMerge` is an *Admin
authoring/preview* tool -- propose, review consensus, see the merged result. `knowledgeOverride`
is the *publication* path. The correct change is not unification; it is ensuring
`playbookMerge` cannot reach a host. Today it cannot (localStorage, Admin-only), so the risk
is a future wiring mistake, not a present defect.

**Do not** teach `effectiveValue()` about merged playbooks. That would give one field two
publication paths with different governance gates -- `status === 'published'` (three reviews)
versus a `userApproval` boolean.

## C. What is the smallest change that allows one researched purchase cost to appear in runtime?

**Four steps, only one of which is production code.**

The smallest *safe* slice is **`provenance`, not `unitCostRange`.** Reasons:

1. Provenance is **display + grounding metadata**; `unitCostRange` feeds budget arithmetic at
   `:3004` and `:3416`. Getting a number wrong changes what a host plans against.
2. A provenance reader already exists at `:963` (`isGroundedItemQty(p.provenance)`), so the
   consumption seam is proven rather than new.
3. Provenance is the actual backfill target -- 368 priced items lack it.

Concretely, for `p_crabs.provenance` on `crabFeast`:

| # | Change | File | Production? |
|---|---|---|---|
| 1 | Add `tier` + `confidence` to `proposal.newProvenance` | `knowledgeChange.js` (shape comment + `proposeChange`) | yes, additive |
| 2 | Publish one KCR and bake | `scripts/bake-published-knowledge.mjs` (run it) | no -- data |
| 3 | Wire **one** reader | `src/lib/playbooks/index.js` -- one call site | **yes, the only risky line** |
| 4 | Add a gate | new test file | no |

Step 3 in shape (not final code): where a purchase's provenance is read, consult
`effectiveValue(pb, \`${p.id}.provenance\`, ...)` and fall back to `p.provenance`. Since the
snapshot is empty, behaviour is byte-identical until step 2 lands -- which is why step 4 must
prove the wiring with a populated fixture, not with production data.

## D. What prevents Admin research approval from becoming a production knowledge update today?

**Four things, in order of severity.**

1. **No runtime reader (C3).** Even a correctly published KCR reaches nothing. This is the
   blocker.
2. **The bake step is not wired (C2).** `scripts/bake-published-knowledge.mjs` is tracked but
   invoked by no npm script and no CI job, so publishing never regenerates the artifact.
3. **Admin-scoped storage.** `publishedSnapshotBuild.mjs` documents it: the KAS server store
   is admin-scoped by design -- *"migration 0008: RLS grants admin/support READ only... No host
   has ever been able to see governed knowledge."* Overrides live in the publishing admin's
   own browser.
4. **`tier`/`confidence` absent (T4).** Even with 1-3 fixed, a published provenance would fail
   `isGroundedCost()` -- which requires `tier === 'researched'` -- and be silently ungrounded.

**None of these is an accident.** Item 3 is a stated policy; items 1-2 are the deliberate
boundary of the Conveyor 1 slice ("transport only"). Phase 5A is the decision to cross it.

---

# Proposed architecture

No new architecture. Activate what exists:

```
KCR (published, 3 reviews)
   |  isPublishable()            publishedSnapshotBuild.mjs   [built]
   v
publishedKnowledge.json          baked by CLI in CI           [built, EMPTY, UNWIRED]
   |  publishedEntry()           publishedSnapshot.js          [built, re-validates]
   v
effectiveValue(pb, fieldPath)    knowledgeOverride.js          [built, 0 consumers]
   |
   v
playbooks/index.js               ONE call site                 [THE CHANGE]
```

---

# Files to change

| File | Change | Size |
|---|---|---|
| `src/lib/knowledge/knowledgeChange.js` | add `tier` + `confidence` to the `newProvenance` shape | S |
| `src/lib/playbooks/index.js` | one `effectiveValue()` call for purchase provenance | **S, highest risk** |
| `package.json` | a `bake:knowledge` script invoking the existing CLI | S |
| `.github/workflows/*` | run the bake before build | S |
| `src/lib/knowledge/publishedKnowledge.json` | regenerated artifact (data, not code) | -- |
| new test file | activation gates | S |

# Files NOT to change

- `publishedSnapshot.js`, `publishedSnapshotBuild.mjs`, `scripts/bake-published-knowledge.mjs`
  -- built, tested, deterministic. Wire them; do not edit them.
- `knowledgeOverride.js` -- the transformer and precedence ladder are correct.
- `playbookMerge.js` -- Admin authoring tool; leave it out of the publication path (B).
- `kcrGovernance.js`, `kcrRoles.js` -- review gates must not be weakened.
- Any playbook in `data/` -- **no hand-authored provenance in this phase.** The point is to
  prove the manufactured path.
- `actionReason.js`, `timeStatusLabel.js`, `analytics.js`, `analyticsContext.js`, CSS.

---

# Data migration plan

**There is no data migration.** Nothing is being converted; the authored playbooks stay
exactly as they are and remain the bottom precedence tier.

1. Author **one** KCR through the existing chain for `crabFeast` / `p_crabs.provenance`
   (best-sourced item in the corpus -- `dmv-crab-2026` resolves in `COST_SOURCES`).
2. Run the bake; `entryCount` goes 0 -> 1.
3. Commit the artifact. It is deterministic -- same input, byte-identical output, timestamp
   taken from the data rather than `Date.now()`.

**Rollback:** delete the entry and re-bake, or `rollbackOverride(id)` for a local override.
`effectiveValue()` falls through to authored. **No playbook file is ever mutated**, which is
what makes rollback total.

---

# Test gates

| # | Gate | Proves |
|---|---|---|
| T1 | Empty snapshot -> `effectiveValue` returns `source: 'authored'` for every purchase | wiring cannot change today's behaviour |
| T2 | Populated fixture -> returns `source: 'published'` with the KCR's provenance | the wiring actually reads |
| T3 | A published provenance passes `isGroundedCost()` / `isGroundedItemQty()` | **T4 is closed** -- the R1 regression cannot ship |
| T4 | Malformed entry (no `kcrId`) -> dropped, falls back to authored | defence in depth still holds |
| T5 | `entryCount === 0` -> the corpus renders byte-identically (reuse the 111-row snapshot harness) | no silent drift |
| T6 | An `approved`-but-not-`published` KCR never appears in the snapshot | governance not bypassed |
| T7 | Existing suite (291 suites / 4,411 tests) + parity gate green | no collateral damage |

T5 should reuse the corpus-snapshot technique already used for the `timeStatusLabel`
consolidation -- it produced a byte-identical diff across 111 rows and would catch drift here.

---

# Risks

- **R1 -- Silent ungrounding.** If step 1 is skipped, a published provenance with no `tier`
  fails `isGroundedCost()`. A researched price would report as ungrounded -- worse than
  today, and invisible. **T3 exists to make this impossible.**
- **R2 -- The empty snapshot masks success.** With `entryCount: 0`, wiring changes nothing
  observable and could be mistaken for "working". T2 must use a populated fixture.
- **R3 -- Two publication paths.** If `playbookMerge` is ever wired to runtime, a field gains
  a second path with a weaker gate (`userApproval` vs three reviews). Mitigated by keeping B's
  boundary explicit.
- **R4 -- Bake drift.** If the artifact is committed but the bake is not in CI, the snapshot
  silently goes stale relative to published KCRs. The build is deterministic, so a CI check
  that re-bakes and diffs would catch it.
- **R5 -- Scope creep to `unitCostRange`.** Provenance is metadata; a price is arithmetic.
  Wiring the price in the same slice doubles the blast radius for no extra proof.
- **R6 -- Unverified.** I have not executed the Admin publish flow in a live authenticated
  session; the public build forces Supabase empty. `kasVerticalSlice.test.js` proves the chain
  in tests, not in a browser.

---

# Recommendation

**PROCEED -- with the slice narrowed to provenance, and step 1 as a hard precondition.**

The reasoning: this is not a build, it is an activation. Every expensive component exists,
is documented, and is tested. The remaining work is one production call site, one additive
schema field, one npm script and one CI step. The design already anticipated this moment --
the snapshot loader's own comment states *"NO SNAPSHOT IS A NORMAL STATE... an empty snapshot
means every value is authored, which is exactly today's behavior."* The system was built to
be switched on.

Two conditions:

1. **Do not wire the reader before `tier`/`confidence` land.** Shipping R1 would convert
   researched knowledge into ungrounded knowledge -- a regression that looks like progress.
2. **Do not touch `unitCostRange` in this phase.** Prove the pipe with metadata; move money
   later, on its own evidence.

**What this phase does NOT decide:** whether governed knowledge should influence
recommendations or reasoning. It decides only that a published, thrice-reviewed research
result can reach a host's screen as provenance. Ranking, reason ladder and decision logic stay
exactly where they are.
