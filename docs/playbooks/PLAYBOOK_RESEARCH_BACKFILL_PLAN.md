# Playbook Research Backfill Plan

**Date:** 2026-08-01 - **Read-only audit output. Nothing implemented.**
**Companion documents:** `PLAYBOOK_DATA_DICTIONARY.md`, `ADMIN_PLAYBOOK_CAPABILITY_AUDIT.md`

---

# The question this audit was asked

> Does NGW already have the operating system needed to ingest expert playbook research, or
> is new infrastructure required?

## Answer

**Both -- but not in the proportion the question implies.**

NGW has ~90% of a research operating system and 0% of the last mile. The expensive,
hard-to-build parts exist and are wired: question formulation, campaigns, connectors,
evidence pipelines, consensus resolution, review packets, KCR roles and governance, a
server-backed store, a formal provenance schema, and a contract linter with ratcheted gap
baselines that is currently at zero.

The missing piece is small in code and total in effect: **there is no write path from any
research output to any playbook field.** Playbooks are static ES modules compiled at build
time. A KCR can be researched, evidenced, reviewed, approved and published -- and it still
cannot put a `provenance` block on `p_crabs`.

So: **no new research infrastructure is required. One piece of ingestion infrastructure is.**

---

# What the backfill is actually for

Measured, not assumed:

```
purchases                              537
  with a provenance object             169   (31%)
  with at least one source id           45   ( 8%)
  verificationStatus = 'cited'           7   ( 1.3%)
playbooks with zero priced provenance    7   of 39

decisions                              215
  costFactors (+ provenance, 1:1)       46   (21%)
  culturalContext                       11   ( 5%)
```

**The gap is provenance on priced items: 368 purchases carry a price the product will show a
host, with no recorded basis.** That is the backfill.

Two things are NOT the backfill and should not be swept into it:

- **The five ratcheted contract gaps are closed** (all at 0). That debt is paid; do not
  re-open it as "playbook work."
- **17 of 19 top-level fields are 100% complete.** The playbooks are not thin. They are
  thinly *sourced*.

---

# Three options for the last mile

Presented with costs. **No recommendation is made between them without a ruling** -- the
choice is architectural and has consequences beyond this backfill.

## Option 1 -- Generate playbook files from governed knowledge

Research publishes to the KCR store; a build step regenerates `data/*.js` from it.

- **For:** single source of truth; provenance becomes structural, not hand-typed; the
  contract linter keeps working unchanged.
- **Against:** playbooks stop being hand-editable, which is how all 39 were authored. The
  one existing generator precedent (`assembleSampleEvents.js`) is **gitignored**, so that
  pattern currently does not survive a clone. Large blast radius.

## Option 2 -- Runtime override layer

Playbooks stay static; a governed-knowledge lookup overlays provenance at read time.

- **For:** additive; no playbook file changes; reversible; matches how the 14 context
  modules already work (`costProvenance`, `quantityProvenance`, `timingProvenance` are
  already imported by the engine -- the seam exists).
- **Against:** two sources of truth for the same field; "what is the provenance of p_crabs"
  gets two answers depending on where you ask.

## Option 3 -- Admin-authored patch files

Admin writes provenance patches; they are committed as data and merged at build.

- **For:** keeps git as the version history (closing G3 for free); reviewable in PRs;
  no runtime cost.
- **Against:** requires a real Admin write path and a merge step; slowest of the three.

**Observation, not a recommendation:** Option 2 has the shortest distance to a working
seam, because `costProvenance.js` and `quantityProvenance.js` are *already* imported by
`playbooks/index.js`. Whether that is the right long-term architecture is a separate
question from whether it is the cheapest first move.

---

# Sequencing -- what must be true before any backfill starts

## Step 0 -- Resolve the schema defects first (S, and it is a prerequisite)

Backfilling into an inconsistent schema multiplies the inconsistency by 368.

- `confidence` has two spellings: `medium` (82) and `med` (18). Pick one.
- 21 provenance objects have no `tier`, and 21 have no `confidence`/`verificationStatus` --
  an empty grading block reads as graded.
- `sources` holds both source ids (`'webstaurant-protein-2026'`) and free prose
  (`"Captain White's Seafood (Oxon Hill, MD -- LEFT the Maine Ave Fish Market...)"`). Two
  shapes in one field means neither can be resolved programmatically.

## Step 1 -- Decide the ingestion architecture (Options 1/2/3)

This gates everything. It is a ruling, not a task.

## Step 2 -- Extend the contract linter to watch provenance (S)

**G6 is the quiet finding of this audit:** the instrument that tracks playbook debt does not
track the largest debt. It watches 5 gap classes; provenance completeness is not one of
them. Adding a `provenanceGaps` ratchet with a baseline of 368 would make the backfill
self-measuring and prevent regression -- using the mechanism that is already proven to drive
a gap class to zero, five times over.

## Step 3 -- Backfill, highest-consequence first

Priority is not alphabetical. Order by what the host is shown and can act on:

1. The 7 playbooks with **zero** priced provenance (whole families unsourced).
2. `essential: true` purchases (these drive the budget the host plans against).
3. Items whose `unitCostRange` feeds a decision's `costFactors` (46 decisions).
4. Everything else.

## Step 4 -- Close the two waiting consumers (M, optional, unrelated to provenance)

`risks.ifDelayed` (278 authored) and `decisions.dependsOn` (42 authored) have reason-ladder
rungs written and returning null for want of a carrier. This is not research work -- it is
one engine change each -- but it is playbook data that currently reaches nobody.

---

# What NOT to do

- **Do not build new research infrastructure.** 77 modules exist. The gap is a write path,
  not a pipeline.
- **Do not re-open the five closed ratchets.** They are at zero.
- **Do not start backfilling before Step 0.** 368 rows into an ambiguous schema is worse
  than 368 empty ones.
- **Do not treat 31% provenance as "the playbooks are incomplete."** 17 of 19 top-level
  fields are at 100%. The content is authored; the *sourcing* is not.
- **Do not assume the Admin Playbooks tab can already write.** That is assumption A1 and it
  is unproven -- the public build forces Supabase empty, so Admin was not reachable to
  exercise in a live session.

---

# Open questions this audit could not answer

| # | Question | Why unresolved |
|---|---|---|
| Q1 | Does the Admin Playbooks tab write anything today? | Admin unreachable on the demo build (Supabase forced empty at `pages-from-source.yml:73-74`) |
| Q2 | Is the KCR store populated with real research? | `kaw1-migration.sql` exists; the store was not queried |
| Q3 | Is published KCR output schema-compatible with the playbook provenance block? | Both express tier/confidence/sources; **no mapping code exists**, so compatibility is untested |
| Q4 | Does `PlaybookCampaigns.jsx` target playbook enrichment specifically? | Named for it; not traced end to end |

**Q3 is the one that matters most.** If governed knowledge and playbook provenance disagree
on shape, the last mile is a translation problem rather than a plumbing problem, and every
cost estimate above moves. It is answerable by reading two schemas side by side, and it
should be answered before Step 1 is ruled on.
