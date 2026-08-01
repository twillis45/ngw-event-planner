# Phase 5C.5 - Admin -> Runtime Knowledge Loop Proof

**Date:** 2026-08-01 - **VALIDATION SPRINT. Nothing was fixed.** No production knowledge exports
modified, no `publishedKnowledge.json` hand-edited, no `published-kcrs.json` hand-edited, no
KCRs created, no bake run against the repo. ASCII-only.

**Evidence classes:** **PROVEN** (driven in Chrome / executed) - **VERIFIED IN CODE** -
**NOT DRIVEN** - **UNKNOWN**

---

# Executive Verdict

# **Admin knowledge governance is NOT proven end-to-end. The loop broke at the first link, and the break is worse than a missing UI: the published half of the system has never left this machine.**

The sprint stopped where instructed. Four defects were found, all P0, none patched.

**The finding that reframes every prior report in this programme:**

```
publishedKnowledge.json  at HEAD          -> entryCount: 0    snapshotVersion: 3350e13d
publishedKnowledge.json  working tree     -> entryCount: 2    snapshotVersion: 23817229
knowledge-exports/       tracked files    -> 0   (untracked, never committed)
```

`3350e13d` is the hash of the **empty snapshot** - exactly what the bake produces from a missing
input. **Any build from HEAD ships zero governed knowledge.** The two published artifacts I have
been verifying all session exist only in my uncommitted working tree. Tier 3 of `effectiveValue`
is empty in every environment except this one, so every field falls through to the authored
default.

My statements in 5C.1, 5C.2, 5C.3 and 5C.4 that "runtime serves 2 published artifacts" were true
**locally and nowhere else**. I never checked what was committed.

---

# Evidence Matrix

| Step | Status | Evidence |
|---|---|---|
| Admin correction | **BLOCKED** | **PROVEN** - Admin store holds 227 KCRs, **all `draft`**. Zero target `p_crabs.provenance` or `p_wine.provenance`. There is nothing to correct |
| Review | **NOT DRIVEN** | blocked by the above |
| Publish | **NOT DRIVEN** | blocked by the above |
| Lineage | **VERIFIED IN CODE only** | 5 regression tests (5C.4). **Never driven through the UI** |
| Export | **BROKEN** | **PROVEN** - would emit **0 records**, replacing a 3-record committed export |
| Bake | **BROKEN** | **PROVEN** - `bake --check` on Admin's would-be export: `entries: 0`, `snapshot is STALE`, exit 1 |
| Runtime Preview | **PROVEN, but against an uncommitted local bake** | `Crab Feast/p_crabs.provenance` -> `published`, `...-v1`; `Retirement Party/p_wine.provenance` -> `published`, `...-v2` |
| Rollback | **NOT DRIVEN** | blocked - nothing published through Admin to roll back |

---

# Facts (proven only)

- **F1.** Admin's KCR store: **227 KCRs, 100% `draft`.** `byStatus = { draft: 227 }`.
  Zero approved, zero published. **PROVEN** (localStorage read, 2026-08-01T11:40:24Z).
- **F2.** Zero KCRs target `p_crabs.provenance`. Zero target `p_wine.provenance`. The only
  p_crabs KCR is `p_crabs.unitCostRange`, in `draft`. **PROVEN.**
- **F3.** `localStorage['ngw-kas-overrides']` is **empty** - consistent with `applyOverride`
  having no production callers. **PROVEN.**
- **F4.** **No code path reads the committed export back into the Admin store.** The only two
  production files mentioning `knowledge-exports` are `publishedExport.js` (a comment) and
  `AdminConsole.jsx` (UI copy I wrote in 5C.4). **VERIFIED IN CODE.**
- **F5.** The Admin store is seeded by `researchQueueToKCRs` (research intake), not by governance
  history. **VERIFIED IN CODE.**
- **F6.** Export today would emit **0 records**, replacing a **3-record** committed export.
  **PROVEN.**
- **F7.** `bake --check` against that export: `read 0 record(s)`, `accepted (published): 0`,
  `entries: 0`, `x snapshot is STALE`, **exit 1**. Run against a scratch file; repo untouched.
  **PROVEN.**
- **F8.** `knowledge-exports/` has **0 git-tracked files** and is **not gitignored** - simply
  never committed. **PROVEN.**
- **F9.** `publishedKnowledge.json` at HEAD: **`entryCount: 0`, `snapshotVersion: 3350e13d`** -
  byte-identical in version to the empty-input bake. **PROVEN.**
- **F10.** `gate:knowledge` runs in CI (`.github/workflows/checks.yml:52`). With no input and an
  empty committed snapshot, both sides are empty, so **CI passes while shipping nothing**.
  **PROVEN.**
- **F11.** Runtime Preview correctly reports `published` + versionId + full resolution trace -
  **against the local uncommitted bake**. **PROVEN.**

---

# Defects Found

## D1 (P0) - Admin cannot correct any live artifact

Admin's store and the committed export are disjoint. Admin holds 227 research-intake drafts;
the export holds 3 developer-tooling records. **Neither can see the other.** The Phase 5C.5
scenario ("an administrator discovers p_wine provenance is wrong") is not executable, because
that KCR does not exist in Admin.

**This is the loop's missing half.** 5C.3 identified the write path (Admin -> export) as the
gap. It is also missing the **read** path (export -> Admin), and without it Admin can only ever
publish knowledge it originated - never correct knowledge already live.

## D2 (P0) - The export is full replacement, not merge

`publishedKcrsForExport(kcrs)` serializes only the browser store. Clicking Export after a single
Admin publish would emit a 1-record file **replacing the 3-record committed export**, silently
deleting the other governed artifacts. Today it would emit 0 records.

**This is a defect in what I built in Phase 5C.4**, and I am not fixing it in this sprint. The
button being disabled at 0 records prevents the worst case by accident, not by design - the
first successful Admin publish arms it.

## D3 (P0) - The bake input is not version controlled

`knowledge-exports/published-kcrs.json` is untracked. Consequences:

- **The 5C.4 safety claim is false.** I wrote that the manual step means "a bad publish is caught
  in a diff rather than discovered by a host." **There is no diff - the file isn't tracked.**
- CI cannot reproduce the snapshot; it bakes from nothing.
- The governance record backing every published value exists on one laptop.

## D4 (P0) - HEAD ships the empty snapshot

The most serious of the four. `entryCount: 0` at HEAD means **no deployed build has ever carried
governed knowledge**, and every host resolves authored defaults. The Conveyor 1 transport works;
it has never been loaded.

**Prod state itself is UNKNOWN** - I did not fetch the deployed bundle, and did not run against
prod (standing rule: ask first). The claim proven here is narrower and sufficient: *a build from
HEAD ships an empty snapshot.*

---

# A near-miss worth recording

My first `bake --check` run appeared to exit **0** on drift, which would have meant the CI gate
never fails. That was a shell artifact - `$?` captured `tail`, not `node`. Re-run without the
pipe: **exit 1 on drift, 0 when clean. The gate is correct.**

I nearly reported a fifth P0 that did not exist. The reason it was caught is that the claim was
surprising enough to re-test, which is the only reliable defence against this class of error.

---

# Unknowns

- Every step from Admin correction through rollback (**NOT DRIVEN** - blocked at D1).
- Whether a KCR can be walked `draft -> published` through the Admin UI at all: the gates require
  evidence and a proposal, and **the Evidence store is empty (0 records)**, so `Mark grounded`
  may be unreachable for all 227. **UNKNOWN - not attempted.**
- Actual deployed production snapshot contents.
- Whether `/api/admin/kcrs` returns anything under a real admin session (401 under dev bypass).
- Per-field `verify ->` rows in Publishing (list is empty until something is published).

---

# Why I stopped

The brief said: *"If any link fails, stop and report the exact break. Do not patch around
failures without documenting them."*

Link 1 failed. I could have manufactured a proof by walking a draft KCR through the lifecycle to
publish a **new** field, but that would have proven a different claim than the one asked for -
and D2 means the export step would then have destroyed the existing governed records. **Running
the loop as specified would have deleted governed knowledge.** Documenting that is the result.

---

# Recommendation

## **PARK all new capability. EXECUTE the four defects, in this order.**

| # | Fix | Why this order |
|---|---|---|
| 1 | **Commit `knowledge-exports/published-kcrs.json` and the populated snapshot** (D3, D4) | Until the governed corpus is in the repo, nothing else is real. This is a commit, not a code change |
| 2 | **Make the export a merge, not a replacement** (D2) | Arms safely before anyone publishes through Admin. Small change to `publishedExport.js` |
| 3 | **Seed the Admin store from the committed export** (D1) | The missing read path. Turns Admin from write-only into a correction tool |
| 4 | **Then re-run Phase 5C.5 unchanged** | The proof is only meaningful once the loop is closed in both directions |

**Do not** build the `correctPublishedKCR` UI, `--from-api`, or evidence persistence until 1-4
land. Every one of them assumes a loop that does not close.

**The honest status of this programme:** the architecture is sound and extensively tested, the
transport works, the resolver is well specified - and **none of it has shipped.** The gap between
"built and green" and "operating" is exactly four defects wide, and three of them are one commit
and two small diffs.
