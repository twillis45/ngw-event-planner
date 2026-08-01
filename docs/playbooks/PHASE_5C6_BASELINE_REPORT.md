# Phase 5C.6 - Baseline Report (Repository Truth Audit)

**Date:** 2026-08-01 - captured BEFORE any change. ASCII-only.

## The four questions

### 1. Is `knowledge-exports` tracked?

**No.** `git ls-files knowledge-exports/` -> **0 files**. Not gitignored either
(`git check-ignore` finds no rule) - it was simply never committed. **FACT.**

### 2. Is `publishedKnowledge.json` generated or committed?

**Both, and that is the trap.** It is a *generated* artifact (`bake` writes it) that is
*committed* to the repo (tracked since `536e998a`). So the repo carries a build output whose
input was absent. **FACT.**

### 3. What does a clean checkout produce?

Simulated via `git archive HEAD`:

```
knowledge-exports/ present : NO
publishedKnowledge.json    : entryCount = 0   snapshotVersion = 3350e13d
```

`3350e13d` is the empty-snapshot hash. **A clean checkout carries zero governed knowledge.**
**FACT.**

### 4. What does the bake consume?

```
IN  : knowledge-exports/published-kcrs.json     (DEFAULT_IN, overridable via --in)
OUT : src/lib/knowledge/publishedKnowledge.json (fixed)
```
**FACT.**

## Working tree vs HEAD at baseline

| | HEAD | Working tree |
|---|---|---|
| `knowledge-exports/published-kcrs.json` | absent | 3 records |
| `publishedKnowledge.json` | entryCount 0, `3350e13d` | entryCount 2, `23817229` |

## Assumptions

- **A1.** That CI checks out clean and therefore sees the HEAD state. Consistent with standard
  Actions behaviour; not verified against a CI run.
- **A2.** That `gate:knowledge` passed in CI at baseline because both sides were empty
  (`3350e13d` == `3350e13d`). Verified locally by baking a missing input; not observed in CI.

## Unknowns

- Actual deployed production snapshot contents. **Not fetched.**
- Whether any previous deploy ever shipped a non-empty snapshot.
- Whether `/api/admin/kcrs` holds published KCRs server-side (401 under dev bypass).
