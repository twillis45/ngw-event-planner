# Path-to-Production command run — ngw-event-planner, November 3, 2026

This is a run of `ngw-os/commands/path-to-production.md`, against the spine `ngw-os/docs/path-to-production.md`. **It is not the recertification.**
- The recertification (`2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md`) executed a handoff. This run executes the command.
- Where the two disagree, the reason is stated, and **no recertification finding is discarded**.
- All 66 recertification findings remain in the JSON matrix with their original IDs and stage numbers. 26 findings are added (`addendum_2026_11_03` in the matrix).

**Run conditions**
- **Measured:** app repo HEAD `b056e170` (instruments) and `01e56f4d` (documents). The live site serves `d22a9683`, profile `services`.
- **Changes:** no runtime code changed, `src/App.js` untouched, no HostV3 work.
- **Subagents:** the command's instruments ran as dispatched subagents (Step 11d). Each finding below that changes a ruling was re-verified against the code before use (Step 9a).

---

## Step 1 — Read the record

`node ngw-os/scripts/read-gate-record.mjs --project ngw-event-planner`
- **Source:** the **file**, `skill-index/cache/ptp-gates.json`, with `diskScan: false`. The Command Center API is unreachable from a cloud session, so disk-derived fields are treated as absent.

| Stage | Recorded status | Recorded | Ruled by |
|---|---|---|---|
| 1 | passed | 9/3/2026 | none recorded |
| 2 | passed | 9/3/2026 | none recorded |
| 3 | passed-with-conditions | 9/3/2026 | — |
| 4 | passed-with-conditions | 9/3/2026 | — ("zero P0/P1") |
| 5 | passed-with-conditions | 9/3/2026 | — |
| 6 | passed-with-conditions | 8/29/2026 | Todd Willis (owner) |
| 7 | passed-with-conditions | 9/2/2026 | standing delegation to the review board |
| 8 | passed-with-conditions | 9/3/2026 | — |

The 11/2 board drafts (`ngw-event-planner-workspace/docs/gate-records/2026-11-02/`) were **never posted**. The record above is still the September state.

## Step 2, 2d and 2e — The gap table, both halves

### Required skills (`REQUIRED_SKILLS`, `skill-index/server.js`)

| Stage | Skill (`when`) | Status |
|---|---|---|
| 0 | adopt-project, path-artifact (all) | NOT APPLICABLE: not an inbound project |
| 1 | dispatch-subagents (all) | RAN this run |
| 1 | superpowers:brainstorming, demand-scan, claim-verification, convene-review-board (first sitting) | NOT RUN, no record. demand-scan has no event-planner scan in `ngw-os/docs/research/` |
| 1 | path-artifact | RAN (this run republishes it) |
| 2 | reference-scan, convene-review-board | RAN earlier (cited in the 9/3 record) |
| 2 | clearance (`revenue`, **applies**) | NOT RUN (`STAGE2-1`, owner) |
| 2 | pick-generation-model | NOT RUN. It applies: the art-direction sheets were generated images (HANDOFF, sixtieth entry) |
| 2 | motion-design, measure-dont-look (rung-0), frontend-design, impeccable, writing-plans, brainstorming | NOT RUN, no record |
| 3 | test-driven-development, karpathy-guidelines | RAN as standing practice (red-proofed suites; CLAUDE.md rules) |
| 3 | web-design-guidelines (`public`) | NOT RUN (11/2 condition C3-2). The skill exists in `ngw-os/skills` but is not enabled here |
| 4 | measure-dont-look, nielsen-critique, red-proof | **RAN 11/3** (§3, stage 4) |
| 5 | route-sweep (marked `missing`) | Substituted by `backend/tests/test_protected_routes_sweep.py`; re-run and red-proofed: **one escape** |
| 5 | security-review | RAN 11/3 |
| 6 | deploy-to-render | Substituted by GitHub Pages (logged 8/29) |
| 7 | remember:doctor | NOT RUN: not installed |
| 8 | (none, by ruling) | — |
| 9 | promote-surface | **RAN 11/3** |
| 9 | readiness | NOT RUN as written (needs `localhost:4321/api/readiness`). Substituted by the Rule 10 claim check (board packet §5) |
| 9 | convene-review-board, path-artifact | NOT YET: the board sits 11/9 |
| 10 | (none, by ruling) | — |

### Standing obligations (Step 2e)

| Check | Result |
|---|---|
| `docs/ADMIN-CONSOLE.md` (Step 8d) | present |
| `verify:all` script (Step 6b) | present (`node scripts/verify-all.mjs`) |
| `git rev-list --count origin/main..HEAD` (Step 6c) | **not 0**. The 11/3 documents are on `main-2utz0n`, pushed, **not on `main`**, and no Checks run exists for them. They take effect on main only through a merge |

### CAPABILITY GAP (Step 2d)

1. **WebKit:** no WebKit browser in this container, so every iPhone engine is untested (`VERIFY-1`).
2. **Command Center:** unreachable. Gates are drafted, not posted. The `readiness` skill cannot run.
3. **Skills present but not enabled:** `web-design-guidelines` and the ngw skills in `ngw-os/skills/` are present but not enabled in this session.
4. **Skills not installed:** `remember:doctor`, `frontend-design`, `superpowers:writing-plans`, `superpowers:brainstorming`.
5. **route-sweep:** never built as a skill; substituted by the repo's test.
6. **Dashboards:** PostHog, Sentry and Supabase are unreachable, so those checks stay owner acts.

## 3. Stage by stage (spine names and gates, verbatim intent)

| Stage | Spine gate | Evidence 11/3 | Draft status |
|---|---|---|---|
| **0 Adoption** | Inbound projects only | Built in-house | **skipped** (ready to post) |
| **1 Idea → Problem statement** | Can name who hits it. Revenue: kill gate pre-registered, owner rules | `whoHitsThisToday` recorded. No ruler, basis or kill threshold (`STAGE1-1`) | **11/2 draft, owner fields open** |
| **2 Scope & design** | (all) criteria checkable. (public) activation/UX doctrine applied *here* | Criteria checkable (GOLD set, matrix). Doctrine contradicted by first-run P1s (`TRUST-1/2`, `COMP-1/2/3`, reproduced 11/3) | **not-yet** (ready) |
| **3 Build** | No stage-specific gate; the code exists and matches scope | 11/2 board ruling stands. `web-design-guidelines` NOT RUN | 11/2 draft stands |
| **4 Verify** | (all) guard script passes. (all) measurement pass. (public) Nielsen critique; **P0/P1 block stage 6**. Red-proof every gate | All three instruments ran. Guard: verify:all 8 of 11 at `b056e170`. Its two real reds were fixed in this run's commits; the Playwright matrix was NOT EVALUATED. WebKit not covered. Red-proof escape `RP-1` | **not-yet** (ready). Supersedes the 11/2 draft |
| **5 Security & data review** | (public) full track checklist; the artifact is an **enumerating** gate | New P0 `S9-1`, P1 `S9-2/3/4`. The enumerating sweep is unsound (`RP-1`). Owner attestations open | **not-yet** (ready). Supersedes the 11/2 draft |
| **6 Deploy** | Reach recorded. (public) **P0/P1 from 4 and 5 resolved first** | Deploy verified (live = main `d22a9683`). The public gate is unmet: `ATTN-6` ships today | **not-yet**, **owner's call** (replaces their 8/29 ruling) |
| **7 Observe & handoff** | HANDOFF reflects measured reality. (public) instrumentation wired, tracker matches | HANDOFF was 9 commits stale; re-stamped this run. Instrumentation gaps `OBS-1/2`, `S9-7`, `N4-3` | **passed-with-conditions**, needs a ruler |
| **8 Maintain** | Debt ranked by what it blocks, runbook, which claims are still true | 11/2 draft stands; `stillTrue` updated below | 11/2 draft stands |
| **9 Promotion** | All four public gates; the board rules | 0 of 4 passing as measured; board not sat | **no record**, board packet only |
| **10 Sunset** | — | Not reached | — |

### The correction this run makes to the recertification

The recertification's §3 ruled **stage 4 FAIL** on its P0/P1s. The spine says the critique's P0/P1s "block stage 6 the same as a stage-5 finding would". They are not stage 4's own fail condition.
- **Stage 4 is still not passable today**, for its own reasons: the guard did not pass, WebKit is uncovered, and a gate escaped.
- **Stage 6 is where the P0/P1s bite.** It is now drafted `not-yet` for that reason.

The ruling direction is unchanged. The *reason* is corrected.

### Stage 8 — which earlier claims are still true (re-checked 11/3)

| Claim | Now |
|---|---|
| Stage 4, 9/3: "zero P0/P1" | **FALSE.** 1 P0 and 19 P1 open in stage 4 |
| Stage 7: request durable storage | TRUE: `navigator.storage.persist()` at `src/lib/customEventStore.js:183` |
| Stage 7: admin console reads the wrong key | FIXED: `AdminConsole.jsx:1343` reads both. Still unreachable from hostv2 |
| Stage 7: four recovery functions with no callers | 3 of 4 now called; `readWriteLog` still has none |
| Stage 8: xlsx carries unfixable advisories | RESOLVED: 0.20.3 (#97) |
| Stage 8: "CRA deleted post-Sprint-2" | STALE: the 9/23 ruling removed the date |
| Stage 6: "the deployed artifact is HEAD" | TRUE for `main` (`RELEASE_SHA` = `d22a9683`) |

## 4. Stage 4 Verify — the three instruments

### measure-dont-look
- **Setup:** 10 surfaces at 390×844 (iPhone 13 device emulation: mobile, touch, 3× density), 1440 and 1920. Every probe evaluated. The probe itself was red-proofed by injecting an overflowing row and a transparent overlay.
- **Clean:** page overflow PASS everywhere; viewport-fit and safe area PASS; sheet/frame corners PASS.
- **Findings:**
  - `COMP-10` new evidence: Skip's center tap misses the button, and only 147 of 315 points hit it at 390.
  - New P2 `M4-1`: Guests sheet targets under 44px.
  - New P3 `M4-2`, `M4-3`, `M4-4`.
  - Two of the agent's own probe errors were caught and corrected before reporting.
- **WebKit not covered.**

### nielsen-critique (fresh, all 10, driven at 390)
- **Verdict:** H7 PASS. Every other heuristic has findings.
- **New P1, each re-verified in code by me:**
  - `N4-1`: cents are stored ×100. `HostShellV2.jsx:22625` strips every non-digit, so `4800.00` becomes 480000.
  - `N4-2`: an "agreed" vendor price is not counted as spoken for, while the toast says "Payment tracking reads it now".
  - `N4-3`: restore says "Your events are back." and restores nothing. `customEventStore.js:316` skips existing ids, and the toast at `HostShellV2.jsx:18310` ignores the counts.
  - `N4-4`: a vendor can't be removed.
- **New P2/P3:** `N4-5` to `N4-12`, including `N4-9`: no help or support route for a paying host.

### red-proof (8 gates the records cite as PASS evidence)

| Gate | Fault | Went red for the intended reason? | Restored green |
|---|---|---|---|
| analyticsPrivacy (×2) | name sent; opt-out ignored | yes, both | yes |
| theStampSaysWhatShipped | unknown profile stamps | yes (exit-code only: weak) | yes |
| everyPublicTableHasRls (×2) | RLS enable dropped | yes, both | yes |
| protected-routes sweep, `/api/ai/feature` | gate removed | yes | yes |
| **protected-routes sweep, `/api/ai/orchestrate`** | **gate removed** | **NO: ESCAPE (`RP-1`)** | yes |
| conflict hold | `knownVersion` ignores the hold | yes (4 of 7) | yes |
| aHostCanTurnAnalyticsOff (e2e) | toggle stops writing | yes | yes |
| aRefusedSaveIsNotCalledSaved (e2e) | conflict treated as success | yes | yes |
| textGateRatchet | one more source-text suite | yes | yes |

**The escape in `RP-1`.** The sweep counts a route as gated if the string `require_planner` appears anywhere in its source, docstrings included. Its live probe also accepts 422, which comes from body validation before auth runs.

**verify:all at `b056e170`: 8 of 11 steps passed.**
- **Fixed in this run's commits:** HANDOFF stale (re-stamped) and the audit index past its ceiling (indexed). That second one was caused by this run's own documents.
- **NOT EVALUATED:** the Playwright matrix (port collision).

## 5. Findings added by this run (all in the JSON matrix)

**New P0/P1, re-verified in code before entering the matrix**

| ID | Sev | Stage | Finding | Cluster |
|---|---|---|---|---|
| `S9-1` | **P0** | 5 | RSVP purge function callable by the anon key deletes every RSVP (`supabase/migrations/009:111`) | **C9 (new)** |
| `S9-2` | P1 | 5 | Anon insert policy `with check (true)`: forged RSVPs (`009:86-90`) | C9 |
| `S9-3` | P1 | 5 | Any signed-in user can create Stripe Checkout for any amount | C9 |
| `S9-4` | P1 | 5 | Refunds and disputes never revoke a pass; a duplicate charge is logged as granted | C9 |
| `RP-1` | P1 | 5 | Protected-routes sweep escape | C9 |
| `S9-5` | P1 | 9 | Pass entitlement enforced only in the client | **Board question** |
| `S9-6` | P1 | 9 | `PROMOTION-DEFERRED.md` describes the `demo` profile | C8 (doc) |
| `N4-1` | P1 | 4 | Cents stored ×100 | C1 |
| `N4-2` | P1 | 4 | Agreed vendor price not counted | C1 |
| `N4-3` | P1 | 4 | Restore claims success, restores nothing | C6 |
| `N4-4` | P1 | 4 | Vendor cannot be removed | C5 |

**P2/P3 added:**
- From the Nielsen pass: `N4-5` to `N4-12`.
- From the measurement pass: `M4-1` to `M4-4`.
- From the stage 0–8 obligations check: `NEW-1` (23 undeclared server env vars) and `NEW-3` (HANDOFF stale; fixed this run).
- From promote-surface: `S9-7` (no pass-funnel analytics).

**Preservation statement.**
- **Nothing withdrawn.** No recertification finding is withdrawn, merged away or relabeled.
- **Stage numbers unchanged.** The recertification's findings already used the spine's stage *numbers*; only its §3 stage *names* were wrong (corrected the same day).
- **`ATTN-6` stays.** The Nielsen pass did not reproduce it on its own path. The recertification reproduced it on the default sample event (`src/lib/hostSpending.js:267,290`), and nothing has changed in that code.

## 6. Effect on the one-week plan

- **Engineering can proceed against the 8 clusters.** Three clusters grow, and one new cluster is required for the paid release.
  - C1 money: + `N4-1`, `N4-2`.
  - C5: + `N4-4`.
  - C6: + `N4-3`, `S9-7`.
  - **C9 Paid-path security and integrity (new):** `S9-1`, `S9-2`, `S9-3`, `S9-4`, `RP-1`.
- **C9 must merge before the `live` profile ships**, because `S9-1` becomes exploitable the moment the anon key ships.
- Details are in plan §2, as amended.

## Report (the command's checkpoint)

- **Skills:** listed per stage in §2. Ran 11/3: measure-dont-look, nielsen-critique, red-proof, security-review, promote-surface, dispatch-subagents, path-artifact. NOT RUN, with reasons: the stage 1 and 2 design skills, clearance, web-design-guidelines, remember:doctor, readiness (substituted), convene-review-board at stage 9 (not yet).
- **CAPABILITY GAP:** WebKit; Command Center; disabled or missing skills; dashboards (§2d).
- **Gates:** drafted, not posted, at `ngw-event-planner-workspace/docs/gate-records/2026-11-03/`.
  - Ready to post: 0 skipped; 2, 4 and 5 not-yet.
  - Owner's: 6 not-yet (replaces their ruling); 7 passed-with-conditions (needs a ruler).
  - **No stage 9 record.**
- **Artifact:** The First Recorded Gate, republished this session. Its `Recorded` stamp stays at the last *ruling* (11/2), because no ruling was posted (`scripts/check-artifact-stamp.mjs`: "a measurement is not a ruling").
- **Awaiting the owner's ruling:** stages 1, 6 and 7; the two NEW stage 9 seats; `S9-5` (board).
- **Next stage needs:** stage 9's four public gates, which in turn need C1–C9 merged, the owner attestations, UAT, and the board.
