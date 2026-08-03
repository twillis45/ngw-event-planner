# Phase 5C.3 - Admin Runtime Truth Connection: Audit + Implementation Plan

**Date:** 2026-08-01 - **READ ONLY.** No production code modified, no migrations, no KCRs, no
knowledge data changed, no published artifacts altered, no write actions run. ASCII-only.

**Evidence classes:** **PROVEN** (driven in browser) - **VERIFIED IN CODE** (read in repo this
session) - **INFERRED** - **UNKNOWN**

---

# Executive Recommendation

# **BUILD - but roughly a tenth of what the brief anticipates.**

Verifying against the repository rather than trusting my own prior audits overturned two of my
own conclusions. **Admin can already see exactly what runtime serves** - Studio > Runtime
Preview resolves any asset + fieldPath and reports source, version, confidence, rollback state
and a full resolution trace. I proved it live against both published artifacts, including the
v2 correction published earlier today. **Phase 1 of the brief's proposed build sequence
("read-only runtime truth viewer") is already built and working.** My Phase 5C.2 claim that "an
admin cannot see published truth" was wrong; I generalised from the Publishing workspace's
zero-counter without opening Runtime Preview.

What is genuinely missing is one write step. Admin's Publish button calls `publishKCR()` and
persists the resulting KCR through `upsertKCR()` to `/api/admin/kcrs`. **It never calls
`applyOverride`, never writes an override record, and never touches the snapshot** -
`applyOverride` and `overrideFromPublishedKCR` have **zero production callers in the entire
repository** (tests only). So Admin publishes a *governance record*, and the value it approves
never enters any resolver tier. The knowledge models, lineage, supersession, rollback and
conflict detection all already support the full lifecycle without redesign. **Do not build a
new database, a new API, or an EvidenceAssessment schema. Build an export step.**

---

# Current Architecture

## Today (VERIFIED IN CODE + PROVEN)

```
  ADMIN                                          RUNTIME
  =====                                          =======
  Studio > Review                                host reads
     | advanceKCR(approved)                          ^
     v                                               |
  Studio > Publishing                            effectiveValue(pb, fieldPath)
     | publishKCR({versionId, prevVersion})           |
     | -> kcr.status='published'                      | 1. host-locked   (upstream)
     | -> kcr.publishedVersion                        | 2. override      localStorage
     v                                                |                  'ngw-kas-overrides'
  upsertKCR(next)                                     |                  *** NEVER WRITTEN ***
     |                                                | 3. published     publishedKnowledge.json
     +--> POST /api/admin/kcrs   (server)             | 4. authored      playbook source file
     +--> localStorage 'ngw-kcr-store' (fallback)     |
                                                      |
     X  NO WRITER                                     |
        applyOverride()            0 prod callers     |
        overrideFromPublishedKCR() 0 prod callers     |
                                                      |
  knowledge-exports/published-kcrs.json --------------+
        ^                                    npm run bake:knowledge
        |
   *** written by developer tooling only ***

  READ PATH THAT ALREADY WORKS:
  Studio > Runtime Preview -> resolveField() -> resolveKnowledge() -> same tiers as runtime
```

## Target

```
  Studio > Publishing --(approve)--> published KCR --(export)--> knowledge-exports/*.json
                                                                        |
                                                                   bake (CI)
                                                                        |
                                                              publishedKnowledge.json
                                                                        |
                                                          effectiveValue tier 3 -> hosts
                                                                        |
  Studio > Runtime Preview <---------- verify ---------------------------+
                            (ALREADY BUILT - closes the loop)
```

**The diagram's only new arrow is `published KCR -> export`.**

---

# Findings Table

| Area | Status | Evidence | Risk |
|---|---|---|---|
| **Runtime truth viewer** | **EXISTS AND WORKS** | **PROVEN** - Runtime Preview resolved `Crab Feast/p_crabs.provenance` -> `published`, `crab-feast-p-crabs-provenance-v1`; and `Retirement Party/p_wine.provenance` -> `published`, **`...-v2`** with the corrected derivation | None |
| **Publishing -> runtime** | **BROKEN - the one real gap** | VERIFIED IN CODE - publish handler calls `publishKCR(...).kcr` then `upsertKCR`; no override write, no bake | **The whole gap** |
| Override writer | **DEAD CODE** | VERIFIED IN CODE - `applyOverride` / `overrideFromPublishedKCR`: 0 production callers, tests only | Med - looks wired, is not |
| Runtime snapshot | Works, developer-driven | VERIFIED IN CODE + earlier bake runs | Low |
| Correction workflow | **Backend production-ready, no UI** | VERIFIED IN CODE - `correctionWorkflow.js`; 11 tests; v2 published and served | Low |
| Lineage / supersession | **Works** - builder selects by lineage, order-independent | VERIFIED IN CODE + tests | Low |
| Rollback | **Works** - absence of a supersessor | VERIFIED IN CODE + test | Low |
| **Admin publish lineage** | **DEFECT** | VERIFIED IN CODE - passes `prevVersion: k.rollbackTo`, should be `k.publishedVersion`. Re-publish would chain to the wrong ancestor | **High for corrections** |
| KCR server store | **EXISTS** - `/api/admin/kcrs`, admin-gated, optimistic concurrency | VERIFIED IN CODE (`src/lib/api/kcr.js`) | Low |
| Evidence | Empty | PROVEN - 0 EVIDENCE / 15 CAMPAIGNS | Med |
| Impact analysis | `blastRadius`, `simulatePublish` imported | VERIFIED IN CODE (4 + 2 refs) | UNKNOWN - undriven |

---

# Critical Questions

## Q1 - Where is the single source of truth today?

### **Answer: E - multiple competing sources. But they are ordered, not chaotic.**

`effectiveValue()` (VERIFIED IN CODE, `knowledgeOverride.js`) defines strict precedence:

| Tier | Store | Written by | Scope |
|---|---|---|---|
| 1 | host-locked | host, upstream in `effectiveItem` | one event |
| 2 | `localStorage['ngw-kas-overrides']` | **nobody - 0 prod callers** | one browser |
| 3 | `publishedKnowledge.json` | `npm run bake:knowledge` from `knowledge-exports/` | all hosts |
| 4 | playbook source files | authors, in-repo | all hosts |

Separately, **KCR governance records** live in `/api/admin/kcrs` (server, authoritative) with
`localStorage['ngw-kcr-store']` as cache/fallback.

**So there are two axes.** Governance records are server-backed and genuinely single-source.
Knowledge *values* have four tiers, of which **tier 2 is dead** and **tier 3 is the only one
Admin should ever write**. That is a healthier position than "competing sources" implies - the
contract exists and is documented in the resolver itself.

**One stale contract found (VERIFIED IN CODE).** `rollbackOverride`'s comment says "rollback =
remove the override; effectiveValue falls back to the **authored** value." Since tier 3 was
added it falls back to **published**, not authored. Behaviour is arguably right; the stated
contract is wrong and should be corrected in the same slice.

## Q2 - What does Admin currently publish?

### **Answer: a review artifact. Not a runtime artifact, not a local override, not nothing.**

VERIFIED IN CODE - the entire publish handler:

```js
<B label="Publish" primary cap="publish" enabled={!gate.blocked}
   on={() => run((k) => publishKCR(k, {
     versionId: `${k.id}-v${(k.audit || []).length}`,
     prevVersion: k.rollbackTo || null, by: role, asOf
   }).kcr, 'Published')} />

const run = async (mutator, label) => { const next = mutator(kcr); await upsertKCR(next); ... }
```

It produces a KCR with `status: 'published'` and a `publishedVersion`, persisted to the server.
`publishKCR` also returns a `version` record - **which this call site discards** (`.kcr` only).
Nothing reaches any resolver tier.

**Two defects in that one expression:**

1. **`prevVersion: k.rollbackTo`** should be `k.publishedVersion`. On a first publish both are
   null so it looks correct; on a *re-publish* it chains the new version to the ancestor of the
   old one instead of to the old one. **This is exactly the correction case**, and it would
   produce a broken lineage that the new lineage-aware builder would then resolve wrongly.
2. **The `version` record is discarded**, so the audit trail from insight to published value
   exists only inside the KCR's `publishedVersion` string.

## Q3 - Can we connect Admin without rebuilding?

### **Answer: yes. Option A. And most of it is already there.**

| Option | Effort | Risk | Architectural fit | Verdict |
|---|---|---|---|---|
| **A - existing export -> bake -> runtime** | **Low** | **Low** | **Native** - the bake already accepts `--in`; the server already holds published KCRs | **RECOMMENDED** |
| B - new database + API | High | High | **Redundant** - `/api/admin/kcrs` already exists and is admin-gated with optimistic concurrency | **KILL** |
| C - backend service + versioned store | Very high | High | Duplicates lineage logic already implemented and tested in `publishedSnapshotBuild.mjs` | **KILL** |

**Option B is not merely expensive, it is already built.** The KCR store is server-backed
today. The missing piece is not storage - it is the projection from stored published KCRs into
the artifact the bake consumes.

---

# Implementation Options

## Option A1 - Export button in Publishing (RECOMMENDED FIRST)

**Description.** Publishing gains an "Export published KCRs" action that serialises every
`status==='published'` KCR to exactly the shape `knowledge-exports/published-kcrs.json` already
has. A human commits it; CI bakes it.

- **Files:** `src/admin/AdminConsole.jsx` (Publishing workspace only)
- **Benefits:** zero runtime risk; no new service; human review stays in the loop; the artifact
  is diffable in a PR; works today with no backend change
- **Risks:** manual step; export could drift from bake expectations (mitigated by the existing
  byte-identity test pattern in `correctionWorkflow.test.js`)
- **Recommendation: EXECUTE**

## Option A2 - Bake fetches from the API

**Description.** `scripts/bake-published-knowledge.mjs` gains `--from-api`, calling
`GET /api/admin/kcrs` and filtering to published. CI runs it on a schedule or on demand.

- **Files:** `scripts/bake-published-knowledge.mjs`, `src/lib/api/kcr.js` (node-side auth)
- **Benefits:** removes the manual step; single source becomes the server
- **Risks:** CI needs an admin credential; a bad publish reaches hosts on the next build with no
  diff review
- **Recommendation: PARK until A1 has run at least twice**

## Option A3 - Wire `applyOverride` for preview only

**Description.** Publishing writes a tier-2 override so the publisher's own browser reflects it
instantly.

- **Risk: HIGH, and I recommend against it.** Tier 2 is browser-scoped. An admin would see
  "published" while every host sees the old value - **manufacturing exactly the false-confidence
  failure this programme exists to prevent.** Runtime Preview already distinguishes `override`
  from `published` in its trace, so the confusion would be visible but easy to miss.
- **Recommendation: KILL.** If preview is wanted, use `simulatePublish` (already imported).

---

# Recommended Build Sequence

## Phase 0 - Fix the lineage defect (do first, it is two tokens)

`prevVersion: k.rollbackTo || null` -> `prevVersion: k.publishedVersion || null`.
**Without this, every correction published from Admin builds a broken lineage.** Everything
downstream depends on it.

## Phase 1 - ~~Read-only runtime truth viewer~~ **ALREADY EXISTS**

Runtime Preview does this. **PROVEN.** The only work is discoverability: link to it from
Publishing so an admin lands on "what do hosts see for this field?" from the place they publish.

## Phase 2 - Connect publishing export (Option A1)

Approved Admin changes produce the artifact the bake consumes.

## Phase 3 - Correction workflow UI

Surface `correctPublishedKCR` in Publishing. **Backend is production-ready** - 11 passing tests
covering supersession, order-independence, three-deep lineage, rollback, conflict detection, and
byte-identity against the governed API. This is UI over tested capability.

## Phase 4 - Evidence lifecycle

Close campaign -> evidence (15 campaigns, 0 records). Largest, least urgent, and it should be
re-scoped only after Phase 2 proves the publish loop end to end.

---

# File-Level Implementation Map

### 1. `src/admin/AdminConsole.jsx` - Phase 0

- **Purpose:** correct the supersession ancestor on publish
- **Change:** `prevVersion: k.rollbackTo || null` -> `k.publishedVersion || null`
- **Risk:** Low. First publishes unaffected (both null)
- **Testing:** unit test - publish, re-publish, assert `rollbackTo` chains to the prior
  `publishedVersion`; then `buildSnapshot` resolves to the newer
- **Rollback:** revert one expression

### 2. `src/admin/AdminConsole.jsx` (Publishing workspace) - Phase 2

- **Purpose:** export published KCRs in bake-input shape
- **Change:** add an export action; serialise `kcrs.filter(k => k.status === 'published')`
- **Risk:** Med - shape drift
- **Testing:** assert the exported blob, run through `buildSnapshot`, equals the current
  snapshot for unchanged input (reuse the byte-identity pattern already in
  `correctionWorkflow.test.js`)
- **Rollback:** remove the button; nothing else consumes it

### 3. `src/lib/knowledge/knowledgeOverride.js` - Phase 2 (comment only)

- **Purpose:** correct the stale rollback contract (Q1)
- **Change:** comment only - rollback falls back to **published**, then authored
- **Risk:** None. **No behaviour change.**

### 4. `scripts/bake-published-knowledge.mjs` - Phase 3+ (PARKED)

- **Change:** `--from-api` mode
- **Risk:** High - credentials in CI, no diff review
- **Rollback:** flag is additive; default path unchanged

### 5. Publishing workspace correction action - Phase 3

- **Purpose:** surface `correctPublishedKCR(prior, {...})`
- **Risk:** Med - it is the first write path from Admin into governed truth
- **Testing:** browser-drive a full correct -> review -> publish -> Runtime Preview verify ->
  rollback -> Runtime Preview verify cycle
- **Rollback:** the correction path's own rollback (withdraw v2, v1 becomes head again)

---

# Testing Strategy

**Unit** - lineage chaining after re-publish; export shape -> `buildSnapshot` equality;
supersession/rollback/conflict (11 tests exist and pass).

**Browser** - drive Publishing -> export; then Runtime Preview on the same fieldPath and assert
`source: published` and the expected `versionId`. **Runtime Preview is the built-in verification
instrument** - it should be the assertion surface for every phase, not an afterthought.

**Runtime verification** - after bake, resolve through `purchaseProvenance()` in Node and
confirm the host-visible string changed. This is the check that caught the shadowed repair in
5C.1.

**Snapshot verification** - `npm run gate:knowledge` must stay `[OK]`; unchanged input must
produce a byte-identical artifact (determinism is already guaranteed by `contentHash` + sorted
entries + data-derived timestamp).

**Rollback verification** - withdraw the head KCR, rebake, confirm Runtime Preview reports the
prior version. **PROVEN in unit tests; not yet driven through the UI.**

---

# Corrections To My Own Prior Audits

| Prior claim | Correct position |
|---|---|
| 5C.2: "an admin cannot see published truth" and "surface the live snapshot" as build item #1 | **WRONG.** Runtime Preview already does this, with version, source, confidence and trace. **PROVEN** against both artifacts |
| 5C.2: "Studio makes zero backend calls... the entire knowledge factory runs out of browser localStorage" | **OVERSTATED.** `kcrStore` is server-first via `/api/admin/kcrs` with localStorage fallback. My run showed no calls because the Studio surfaces I drove read the sync local cache; `REACT_APP_API_BASE_URL` *was* set (the Audit 401 proves it). Whether each workspace uses the async server path is **UNKNOWN** per workspace |
| 5C.2: "Admin has published nothing, ever" | Accurate for the *Publishing counter*, and it remains true that no Admin publish has reached runtime - but the reason is the missing export step, not a missing store |

**The pattern in both corrections is the same:** I inferred a system-wide absence from one
surface's zero-state. The rule that would have caught it both times is to check the reader
before concluding about the writer.

---

# Final Decision

```
EXECUTE:
  - Phase 0  fix prevVersion lineage defect            (two tokens, blocks everything)
  - Phase 2  export published KCRs from Publishing     (Option A1)
  - Phase 3  correction workflow UI                    (backend already production-ready)
  - link Publishing -> Runtime Preview for verification

PARK:
  - Option A2  bake --from-api                (unpark after A1 runs twice cleanly)
  - Phase 4    evidence lifecycle             (re-scope after the publish loop is proven)
  - impact analysis surfacing (blastRadius / simulatePublish) - exists, undriven
  - EvidenceAssessment persistence            (unchanged from 5C: document-stored until >50 claims)

KILL:
  - Option B  new database + API              (already exists: /api/admin/kcrs)
  - Option C  new backend versioned store     (duplicates tested lineage logic)
  - Option A3 applyOverride on publish        (browser-scoped; manufactures false confidence)
  - "read-only runtime truth viewer" as new work (it is built - PROVEN)

NEXT CLAUDE TASK:
  Phase 0 + Phase 2 in one slice, read-only-verified before and after:
    1. Correct `prevVersion` to `k.publishedVersion` in the Publishing handler.
    2. Add unit coverage proving a re-publish chains lineage correctly and that
       buildSnapshot resolves to the newer version in either array order.
    3. Add the "Export published KCRs" action, with a test asserting the exported
       blob passed through buildSnapshot equals the committed snapshot for
       unchanged input.
    4. Do NOT bake, do NOT publish, do NOT alter knowledge-exports.
    5. Verify in Chrome: Publishing renders the action; Runtime Preview still
       reports v2 for Retirement Party / p_wine.provenance.
```

---

## Remaining Risks

- **R1.** 23 of 30 Studio workspaces and 10 of 14 tabs remain undriven. Review, Validation,
  Retirement, Dep. Explorer and Graph are all **UNKNOWN**, and any could contain a capability
  that changes this plan - as Runtime Preview just did.
- **R2.** Local `?admin=1` dev bypass is not production auth. Whether a real admin session
  reaches `/api/admin/kcrs` successfully is **UNKNOWN** (audit returned 401 under bypass).
- **R3.** No write action was run. Admin's publish path is **VERIFIED IN CODE, never driven**.
- **R4.** The Phase 0 defect means any correction published from Admin *before* the fix creates
  a broken lineage. **Fix before any Admin publish, not after.**
- **R5.** Evidence remains empty (0 records, 15 campaigns). Nothing in this plan improves it,
  and it is the substrate the pipeline diagram claims precedes every KCR.
