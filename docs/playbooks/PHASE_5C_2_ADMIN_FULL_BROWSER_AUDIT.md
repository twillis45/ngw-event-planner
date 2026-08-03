# Phase 5C.2 - Admin Full Browser Audit

**Date:** 2026-08-01 - **READ ONLY.** No code modified, no knowledge edited, nothing published,
no KCRs created, no settings changed. ASCII-only.

**Environment:** local CRA dev server `http://localhost:3000/?admin=1`
**Auth:** `dev-bypass@local` - role `admin` - badge reads **AUTH BYPASS - DEV ONLY**
**Backend:** `https://ngw-events-api.onrender.com`
**Viewport:** 2560x1294 (screenshots render at 1552x784, ~0.61x)

## COVERAGE STATEMENT - read before the findings

This audit is **incomplete against the brief**, and saying so is more useful than implying
otherwise. What follows is what I actually drove in the browser.

| Driven live | Not yet driven |
|---|---|
| Admin entry + auth (Phase 1) | Users, Workspaces, Invitations, Activation, Analytics, Playbooks, Metrics, Errors, Providers, Settings |
| Overview, **Studio**, **Intelligence**, **Audit** | 23 of 30 Studio workspaces |
| Studio: Mission Control, Publishing, **Campaign Research (4 steps deep)** | Phase 5 source registry, Phase 6 evidence mgmt, Phase 7 full runtime trace |
| Network layer (Phase 9, partial) | Per-control interaction sweep (buttons/filters/sort/pagination) |

**Workspace count discrepancy (PROVEN IN UI):** the Studio header claims "28 workspaces"; the
tab strip renders **30**. Minor, but it means the header string is hand-maintained.

**The strategic question is nevertheless answerable with high confidence**, because the single
most decisive piece of evidence turned up early and is unambiguous. It is in SS2.

---

## Executive Verdict

### "Can NGW safely operate knowledge governance without developer intervention?"

# **No - and the reason is not a missing button.**

**Admin is not an observation dashboard. It is a knowledge factory whose output does not reach
runtime.** That is a materially different diagnosis from the one expected, and it changes what
should be built.

**PROVEN IN UI** - Studio's Publishing workspace:

```
KCRs approved and ready to publish - the final human gate. Publishing writes an
override record that the runtime resolver applies. Nothing publishes automatically.

   0  APPROVED            0  PUBLISHED ALL TIME

No KCRs pending publish. Honest-empty.
```

**PROVEN IN CODE + RUNTIME (this same session)** - the live snapshot contains **2 published
artifacts** (`p_crabs.provenance`, `p_wine.provenance` v2), and runtime serves them.

**Both statements are true at once.** Admin has published nothing, ever, while runtime serves
two published artifacts. They are different universes:

```
  ADMIN STUDIO                          RUNTIME
  227 KCRs in browser localStorage      publishedKnowledge.json (baked)
  0 approved / 0 published all time     2 entries, both live
           |                                     ^
           |  NO CONNECTION PROVEN               |
           +------- X -------------------------- +
                                        knowledge-exports/published-kcrs.json
                                        written by script / governed API
                                        then `npm run bake:knowledge`
```

**The two artifacts runtime serves were created by developer tooling, not by Admin.** I created
the v2 correction myself this session, through the governed API in a Node/Jest process and a
CLI bake - not through any surface in this console. That is the direct, evidenced answer to
Phase 4: **current system requires developer intervention.**

---

## Phase 1 - Admin Entry Proof

| Item | Evidence | Class |
|---|---|---|
| URL | `http://localhost:3000/?admin=1` | **PROVEN IN UI** |
| Auth method | `?admin=1` query param + dev bypass; header reads `dev-bypass@local - role: admin - DEV BYPASS` | **PROVEN IN UI** |
| Role | `admin` | **PROVEN IN UI** |
| Permission enforcement | **NOT PROVEN.** The bypass grants admin without authenticating; unauthorized views could not be tested because no unauthorized session exists locally | **NOT FOUND** |
| Backend reachability | `GET /api/admin/audit?limit=100` -> **401 Authentication required** | **PROVEN IN NETWORK** |

**A persistent banner appears on every tab**, and it is unusually honest:

> *"Server-synced data only. The app is localStorage-first - anything that exists only in a
> user's browser is not visible here. Never report 'delivered / paid / sent' from this console
> unless the underlying state is real; show 'unknown' when it cannot be known."*

---

## Phase 2 - Navigation Map

**14 tabs, not the 12 the brief expected.** Two were missing from the brief and one of them is
the important one:

`Overview - Users - Workspaces - Invitations - Activation - Analytics - Intelligence -`
**`Playbooks`** `-` **`Studio`** `- Metrics - Errors - Providers - Audit - Settings`

**The brief's mental model was wrong in a consequential way.** It treated *Intelligence* as the
knowledge-governance tab. It is not - it is recommendation-outcome tracking. Knowledge
governance lives in **Studio**, which the brief did not list at all.

| Tab | Purpose (as evidenced) | Verdict | Class |
|---|---|---|---|
| **Studio** | Knowledge manufacturing: 28 workspaces, full KCR pipeline | **Functional (local-only)** | **PROVEN IN UI** |
| **Intelligence** | Recommendation capture + evaluation funnel | **Partial** - "Scoring not started - Learning loop not active yet" | **PROVEN IN UI** |
| **Overview** | "WHAT NEEDS YOU" queue | **Broken/stuck** - sat at `refreshing...` with no content | **PROVEN IN UI** |
| **Audit** | Immutable admin action log | **Broken locally** - 401, empty | **PROVEN IN NETWORK** |
| Users, Workspaces, Invitations, Activation, Analytics, Playbooks, Metrics, Errors, Providers, Settings | - | **NOT TESTED** | - |

---

## Phase 3 - Studio Deep Audit (the critical area)

**PROVEN IN UI.** Studio's own description:

> *"Knowledge Studio - the manufacturing platform. 28 workspaces cover the full pipeline:
> acquisition -> observation -> evidence -> finding -> KCR -> review -> publish -> validate ->
> domain -> failure-learning -> research workbench -> corpus dashboard -> experience projection.
> Governed; nothing publishes automatically."*

### Corpus counters (PROVEN IN UI)

```
227  KCRS          0  OBSERVATIONS      0  EVIDENCE
 15  CAMPAIGNS     0  CONFLICTS       266  GRAPH NODES
```

**227 KCRs and 0 evidence records.** The pipeline's middle is empty: KCRs exist without the
observation/evidence substrate the pipeline diagram says precedes them.

### The 28 workspaces (PROVEN IN UI - enumerated, 2 of 28 driven)

`Mission Control - Research Session - Research Ops - Inbox - Observations - Evidence -
Findings - Conflicts - Review - Publishing - Validation - Monitoring - Quality - Copilot -
Analytics - Retirement - Campaigns - Campaign Research - Dep. Explorer - Graph - Runtime
Preview - Simulator - Schedules - Domains - Failures - Research - Corpus - Workers - Experience`

**This is a serious governance surface on paper.** Retirement, Conflicts, Validation, Runtime
Preview and Dep. Explorer are exactly the workspaces a correction workflow needs. **24 of 28
remain undriven** - the capability question for each is open, not answered.

### Mission Control (PROVEN IN UI)

```
1. CHANGED OVERNIGHT?  Quiet
2. DEGRADING?          0 overdue - 0 this week
3. RESEARCH TODAY?     959 HIGH - 0 MED
4. READY FOR REVIEW?   227 queued
5. SAFE TO PUBLISH?    0 at governance gate

TODAY'S MANUFACTURING QUEUE (973 ITEMS)
  [Auto-generate 50 HIGH] [Run all HIGH] [Run all MED] [Run all]
  QUANTITY-VALIDATION - 927 gaps
    HIGH  Dinner Party - Beef short rib ... unit cost range   [REVIEW] [Launch]
          "No evidence - field is completely ungrounded"
```

**Not clicked.** `Run all HIGH`, `Auto-generate 50 HIGH` and `Launch` are write actions and this
audit is read-only. Their behaviour is **NOT FOUND** (untested), not "missing".

**The funnel shape is the finding:** 973 queued items, 227 ready for review, **0 at the
governance gate, 0 ever published**. Work accumulates and never exits.

### Knowledge lifecycle capability

| Capability | Status | Class |
|---|---|---|
| View | Yes - queue rows, counters, corpus | **PROVEN IN UI** |
| Create | `Auto-generate 50 HIGH` / `Launch` present | **CODE ONLY** (not clicked - write action) |
| Review | `Review` workspace exists; 227 queued | **PROVEN IN UI** (workspace exists; behaviour untested) |
| Approve | 0 approved; gate described as "final human gate" | **NOT PROVEN** |
| Publish | Workspace exists, **0 published all time** | **PROVEN IN UI - never exercised** |
| Rollback / Version / Archive | `Retirement` workspace exists | **NOT TESTED** |

---

## Phase 3b - Campaign Research: full accounting

**Driven live, four steps deep. Verdict: Functional - and the strongest thing in the console.**

It was described going in as "one of the newer pieces that worked close to expected." That
holds up, and it understates it: **Campaign Research already implements the research
acquisition workflow that Phases 5B-4, 5B-5 and 5C.1 spent three reports recommending be
built.** That is a correction to my own prior work, and it is in SS3b.3.

### 3b.1 The workflow (PROVEN IN UI)

> *"Campaign Research - streamlined end-to-end workflow: select playbook -> detect gaps ->
> launch campaign -> review evidence -> merge findings"*

A progressive-disclosure stepper. Steps appear only as their predecessor is satisfied:

| Step | State | Driven |
|---|---|---|
| 1 - Select playbook | Dropdown, **all 39 playbooks** | **Yes** |
| 2 - Select gap | Live count + checkbox list, `Select All` / `Clear All` | **Yes** |
| 3 - Choose campaign template | 8 templates, revealed by "Continue to template selection" | **Yes** |
| 4 - Providers / launch | `handleLaunch` expands `PROVIDER_FAMILIES` to provider ids | **NOT DRIVEN - write action** |
| 5 - Review evidence -> merge findings | - | **NOT DRIVEN** |

### 3b.2 Gap detection is real, not decorative (PROVEN IN UI)

Switching the playbook re-runs detection and the count changes:

| Playbook | Gaps detected |
|---|---|
| Dinner Party | **4** |
| Crab Feast | **14** |

Crab Feast's rows carry the **actual provenance notes** from the playbook data:

```
Steam them yourself or order them steamed (pickup)?
   "Heuristic: DIY steaming saves ~15% vs crab-house pickup (pro..."
Crab size
   "Large Male per-dozen range across 4 DMV sources July 2026: $..."
Where to buy?
   "Captain White's July 2026 prices are one verified DMV refere..."
The sides
   "Heuristic: corn+slaw only removes shrimp (large cost item) ->..."
Drinks
   "Heuristic: dry feast eliminates beer entirely, retaining ~20..."
```

**These are precisely the claims my audits flagged by hand.** `steam_vs_order` is the claim
Phase 5B-3 REJECTED for lacking a live-buy price. `crab_size` is the claim I repaired in 5C.1.
`where_buy` is the one whose dock-direct 0.85 factor 5B-2 found unsupported.

**Admin found them on its own, from the data, in about two seconds.** My audits took three
phases to reach the same list. That is a genuinely strong capability and I did not credit it in
any prior report.

### 3b.3 The template library maps onto the exact gaps my reports identified

Eight templates (PROVEN IN UI, verbatim):

| Template | Description | Maps to |
|---|---|---|
| Price Discovery | "Research current market prices for a purchase item." | the 219-item purchase backfill |
| **Price Freshness Check** | "Validate that existing prices are still current (post-season..." | **5B-4's freshness gap** - `freshnessPolicy` displayed but never enforced |
| **Cost Factor Grounding** | "Ground decision-branch cost multipliers in observed market d..." | **the 30 synthesized costFactors** - the entire 5B-2/5B-3 problem |
| Sourcing Options Research | "Research where to source: retail vs. wholesale vs. direct fr..." | `where_buy`, dock-direct |
| Community Validation | "Get corroboration from community/forum sources for existing" | `sme-network` tier |
| **Government Data Pull** | "Pull authoritative government statistics: **USDA prices, NOAA**" | **5B-4's top source candidates, by name** - I recommended USDA ERS/BLS for the DIY band and NOAA for seafood |
| **Cross-Vendor Price Check** | "Compare prices across **2+ commercial sources** to derive a corr..." | **the `sufficientWhen` criterion on all 16 grounded claims** - "2+ catering quotes..." |
| Seasonal Adjustment | "Research seasonal pricing variation or availability windows." | the seasonal seafood gap |

**Correction to my own reports.** Phase 5B-4 concluded the constraint was evidence availability
and proposed a research acquisition workflow as future work; 5C.1 SS9 recommended building it.
**Four of these eight templates are that workflow, already built** - including the two most
specific recommendations I made (government statistics for the DIY band, and a 2+ source
cross-check that is literally the sufficiency criterion those claims already carry).

The strategic implication is the same as everywhere else in this audit: **the capability
exists; it is the wire to published truth that does not.**

### 3b.4 Defect found: duplicate gap rows share one id

**PROVEN IN UI.** Crab Feast reports "14 gaps" but there are only **6 distinct decisions**:

| Decision | Rows rendered |
|---|---|
| Ask your guests about shellfish allergies | 1 |
| Crab size *(grounded - tier `researched`)* | 1 |
| Steam them yourself or order them steamed? | **3** |
| Where to buy? | **3** |
| The sides | **3** |
| Drinks | **3** |

1 + 1 + (3 x 4) = 14. Every **ungrounded** decision renders **3 visually identical rows**; the
one grounded decision renders once.

**PROVEN IN CODE - the mechanism.** `AdminConsole.jsx`:

```js
const gaps = schemaGaps.map((g) => ({ id: `decision-${g.id}`, label: g.label, ... }));
const gap  = campSelectedGap ? gaps.find((g) => g.id === campSelectedGap) : null;
```

`detectGapsInPlaybook` emits `id: decision.id`, so the three rows for one decision **share an
identical gap id**. `gaps.find(...)` therefore resolves rows 2 and 3 to **row 1**. An admin who
clicks the second "Where to buy?" silently selects the first, with no visible difference and no
error.

**Impact:** two thirds of the gap list for any ungrounded decision is unselectable in practice,
and the "14 gaps" headline overstates real coverage by ~2.3x. **Why three** (rather than two or
four) I did not establish - `detectGapsInPlaybook` emits `decision` and `purchase` gap types and
parses field paths, but I did not trace which three field paths fire per decision. **Open.**

### 3b.5 Campaigns without evidence

**PROVEN IN UI.** The Studio counters read **15 CAMPAIGNS** and **0 EVIDENCE**.

Campaigns have been created and evidently run, and the evidence store is empty. Either
campaigns do not write evidence records, or their output lands somewhere the Evidence workspace
does not read. **This is the same disconnect as Publishing, one stage earlier in the pipeline** -
and it means the 927 Mission Control rows reading *"No evidence - field is completely
ungrounded"* are accurate.

### 3b.6 Verdict

| Dimension | Verdict |
|---|---|
| Workflow design | **Functional** - clean stepper, honest labels, progressive disclosure |
| Gap detection | **Functional and genuinely impressive** - live, per-playbook, reads real provenance |
| Template library | **Functional** - 8 templates covering the acquisition needs my audits identified |
| Gap row identity | **Broken** - 3x duplication, shared ids, selection collapses to first |
| Launch -> evidence -> merge | **UNTESTED** (write action) - but 15 campaigns / 0 evidence suggests the tail does not persist |
| Reaches published truth | **No** - same wire gap as everything else |

**Campaign Research is the part of Admin closest to production-ready, and the part whose value
is most blocked by the missing publish wire.** It can find what needs research and dispatch the
research. What it cannot do is turn the result into governed knowledge a host sees.

---

## Phase 4 - Knowledge Correction Scenario (p_wine)

**Scenario:** an administrator discovers `p_wine` provenance is wrong.

| Step | Result | Class |
|---|---|---|
| 1. Find p_wine | **NOT TESTED** - no search driven | - |
| 2. See current published value | **Not possible via Publishing** - it reports 0 published all time | **PROVEN IN UI** |
| 3-5. Source / rationale / history | **NOT TESTED** | - |
| 6-9. Create correction, review, publish, roll back | **Not achievable through Admin today** | **PROVEN IN UI** (0 published all time) |

### **Verdict: current system requires developer intervention.**

This is not inferred - it is what I did. Earlier in this same session I:

1. found the `p_wine` v1 defect by hand-checking arithmetic (its stated derivation yields 0.24
   bottle/guest against a published 0.4, and it attributed the source's ~40% **beer** share to
   wine);
2. built a governed correction path in code (`correctionWorkflow.js`) that walks the real gates;
3. generated v2 through the governed API in a Jest process;
4. re-baked with `npm run bake:knowledge`;
5. proved runtime now serves v2.

**Every one of those five steps happened outside this console.** Admin could not have detected
the defect, could not have raised the correction, and still reports zero publications.

---

## Phases 5-8 - Source Registry, Evidence, Runtime Trace, Audit Trail

| Phase | Status |
|---|---|
| 5 - Source registry (claim types, freshness, region, exclusions) | **NOT TESTED.** Note: `AdminConsole.jsx` renders `freshnessPolicy` in two places (found in the 5B-4 code audit), so *some* source metadata surfaces - **CODE ONLY** |
| 6 - Evidence management (direct/derived/analogous, excerpts, derivation math) | **NOT TESTED** in UI. An `Evidence` workspace exists and the corpus counter reads **0 EVIDENCE** - **PROVEN IN UI** that it is empty |
| 7 - Runtime trace (record -> artifact -> engine -> recommendation) | **PARTIAL.** A `Runtime Preview` workspace exists (**PROVEN IN UI**, undriven). The chain is proven to work *outside* Admin: export -> bake -> `effectiveValue()` -> `purchaseProvenance()` -> host copy, all verified in Node this session |
| 8 - Audit trail | **BROKEN LOCALLY.** `GET /api/admin/audit?limit=100` -> **401**; log renders empty - **PROVEN IN NETWORK** |

---

## Phase 9 - Chrome DevTools Evidence

**Network (PROVEN IN NETWORK).** Across Overview, Studio (2 workspaces), Intelligence and Audit,
exactly **one** `/api/` request was made in the entire session:

```
GET https://ngw-events-api.onrender.com/api/admin/audit?limit=100  ->  401
```

**This is the most important technical finding in the audit.** Studio - 227 KCRs, 973 queue
items, 28 workspaces - made **zero backend calls**. The entire knowledge factory is running out
of browser localStorage.

| | Statement |
|---|---|
| **UI says** | "Publishing writes an override record that the runtime resolver applies." |
| **API says** | Nothing. Studio makes no network calls at all. |
| **Reality** | Publishing would write to localStorage in *one publisher's browser*. Runtime reads a build-time JSON artifact baked from a file in the repo. **The two never meet.** |

That is consistent with the design note already in `publishedSnapshotBuild.mjs`, which states
the problem in its own words: *"a published override is written to localStorage in the
PUBLISHING ADMIN's browser... No host has ever been able to see governed knowledge."* The
snapshot bake was built as the transport around that limitation. **Admin was never wired to the
transport.**

---

## Capability Matrix

| Area | Exists | Tested | Proven | Gap |
|---|---|---|---|---|
| Admin entry / role | Yes | Yes | **UI** | Real auth untested (dev bypass) |
| Knowledge manufacturing (Studio) | Yes, large | Partly | **UI** | 23/30 workspaces undriven |
| KCR corpus visibility | Yes - 227 | Yes | **UI** | Not the corpus runtime serves |
| **Gap detection** | **Yes** | **Yes** | **UI** | **None - works well; 3x row duplication is cosmetic-but-blocking** |
| **Research campaign dispatch** | **Yes - 8 templates** | **Steps 1-3** | **UI** | Launch/merge untested; 15 campaigns -> 0 evidence |
| Evidence governance | Workspace exists | Counter only | **UI: 0 records** | Empty in practice |
| Review workflow | Workspace exists | No | - | 227 queued, 0 approved |
| **Publishing** | **Yes** | **Yes** | **UI: 0 all time** | **Never used; not wired to the bake** |
| Correction / supersession | **No UI found** | - | - | **Built in code this session, not surfaced** |
| Source governance | Partial | No | **CODE ONLY** | Claim-type/exclusion metadata proposed, not in registry |
| Rollback / versioning | `Retirement` workspace | No | - | Untested |
| Impact analysis | `Dep. Explorer`, `Graph` (266 nodes) | No | - | Untested |
| Audit trail | Yes | Yes | **NETWORK: 401** | Broken locally |

---

## Missing Capabilities Required For Trust Repair

1. **A path from Studio to the published snapshot.** Today publishing writes to localStorage;
   runtime reads a baked file. Until these are one path, every governed change needs a developer.
2. **Visibility of what is *currently published*.** Publishing shows 0 all time while 2 artifacts
   are live. An admin cannot correct what they cannot see.
3. **A correction/supersession surface.** The lineage logic now exists in code
   (`correctionWorkflow.js`, builder selects by lineage, rollback restores) with **no UI**.
4. **Evidence records.** 227 KCRs against 0 evidence; 927 queue rows read *"No evidence - field
   is completely ungrounded."*

## Recommended Build Order

1. **Surface the live snapshot in Admin (read-only).** Smallest possible step, immediately
   closes the worst gap: an admin currently cannot see published truth. No write path, no risk.
2. **Wire Publishing to the export the bake consumes.** Turns the existing "final human gate"
   into a real one. The governed API and lineage selection already exist and are tested.
3. **Add the correction/supersede action to Publishing.** The logic is built and proven; this is
   UI over a tested capability, not new governance.
4. **Fix the duplicate gap ids in Campaign Research** (SS3b.4) - small, and it unblocks the
   strongest workspace in the console. Two thirds of every ungrounded decision's gap rows are
   currently unselectable.
5. **Then evidence capture** - close the campaign -> evidence gap (15 campaigns, 0 records).
   Larger, and it is what makes Campaign Research's output governable rather than merely
   dispatchable.

## Final Recommendations

| Item | Verdict | Why |
|---|---|---|
| **Admin knowledge management** | **EXECUTE - narrowly** | The factory exists and is substantial. Do not rebuild it; connect it. Start with read-only visibility of the live snapshot |
| **KCR correction workflow** | **EXECUTE** | Logic built and proven in code this session; only the surface is missing |
| **Version control / supersession** | **EXECUTE** | Same - lineage selection, conflict detection and rollback are implemented and tested |
| **Research acquisition (Campaign Research)** | **EXECUTE - do not rebuild** | Already built and working: live gap detection + 8 templates covering the exact acquisition needs 5B-4/5C.1 recommended. Only fix the duplicate-id defect |
| **Evidence review** | **PARK -> promote if launch writes nothing** | 0 records against 15 campaigns. If Phase 4/5 of Campaign Research does not persist evidence, this stops being optional and becomes the blocker for the whole factory |
| **Source governance** | **PARK** | Metadata proposal exists (5C.1 SS7); no UI need until claims are being authored in Admin |
| **Impact analysis** | **PARK** | `Dep. Explorer` and a 266-node graph exist and are untested. Assess before building |

---

## Answering the strategic question

> *"Is Admin becoming the operating system for NGW knowledge, or is it only an observation
> dashboard?"*

**Neither.** The expectation going in was "observation strong, correction weak". The evidence
says something else:

**Admin is an unusually ambitious knowledge *factory* that is not connected to the *product*.**
973 queued items, 227 KCRs, 28 workspaces, a five-question Mission Control - and zero
publications, zero backend calls, zero evidence records. Meanwhile the two artifacts that
actually reach hosts were produced entirely by developer tooling.

The gap is not capability. **It is a wire.** And that reframes the build: the expensive part -
the factory - already exists. What is missing is the last connection between it and the
snapshot the runtime already reads, plus a read-only view of what is live so an admin can see
the thing they would be correcting.

**Campaign Research proves the point twice over.** It detects the exact ungrounded claims my
audits found by hand, and its template library covers the acquisition work those audits
recommended - including USDA/NOAA government data and a 2+ source cross-check that restates the
`sufficientWhen` criterion those claims already carry. Three phases of my own analysis
recommended building capability that was already sitting in this tab.

**That is the real lesson of this audit, and it is a lesson about method:** I audited the
knowledge corpus for three phases without once opening the tool built to manage it. The
strategic risk to NGW is not that Admin is weak. It is that Admin is strong, invisible to the
people reasoning about the knowledge layer, and disconnected from the runtime at exactly one
seam.

## Reconciliation with the prior audits (5B-4, 5B-5, 5C, 5C.1)

Live browser evidence changes conclusions in four earlier reports. Listed so those documents
are not left asserting things now known to be false. Correction pointers have been added to
each.

| # | Prior claim | Where | Live evidence | Status |
|---|---|---|---|---|
| 1 | "Research acquisition workflow" listed as work to be built | **5B-4** SS9, **5C.1** SS9 | **Campaign Research already implements it** - live gap detection + 8 templates | **WITHDRAWN** |
| 2 | Recommended acquiring "government statistics: USDA ERS / BLS / NOAA" as new capability | **5B-4** SS Domain 1+3 | A **`Government Data Pull`** template exists, described as "USDA prices, NOAA" | **WITHDRAWN - already dispatchable** |
| 3 | Recommended a "2+ independent source" cross-check as future capability | **5B-4** item 2, **5C** SS4 | A **`Cross-Vendor Price Check`** template exists: "Compare prices across 2+ commercial sources" | **WITHDRAWN - already dispatchable** |
| 4 | "Freshness enforcement" framed as needing to be built | **5B-4**, **5C.1** SS8 R3 | A **`Price Freshness Check`** template exists; `Seasonal Adjustment` too | **NARROWED** - dispatch exists; *enforcement* at the predicate still does not |
| 5 | Finding ungrounded claims characterised as expensive manual audit work | **5B-5**, **5C** | Admin's gap detector surfaces the same claims per-playbook in seconds | **SUPERSEDED** - the manual method was never necessary |
| 6 | "The constraint is evidence availability, not engineering" | **5B-4** SS0 | **Half right.** Acquisition is not the constraint - dispatch exists. The constraint is the **publish wire**: acquisition output cannot become governed knowledge a host sees | **REVISED** |
| 7 | 5C.1 SS9 proposed 5C.2 = "publish a governed KCR v2 for p_wine" | **5C.1** SS9 | **Done this session** - correction path built, v2 published, runtime serves it, rollback proven | **COMPLETE** |

### What survives unchanged

- The **integrity findings themselves**. 0 DIRECT / 4 DERIVED / 22 ANALOGOUS / 14 UNSUPPORTED
  across 40 claim legs stands - Admin surfaces *which* claims are ungrounded, not whether a
  cited source actually supports its claim. **Nothing in Admin does what 5B-5 did.**
- The **potluck finding** (12 decisions, 8 values, no cost source in NGW covers potluck).
- The **p_wine and Juneteenth defects**, both found by arithmetic no tool performs.
- **`sufficientWhen` is populated and never evaluated** - and now with added force, since
  `Cross-Vendor Price Check` restates that exact criterion as a dispatchable campaign.

### The corrected strategic picture

```
FIND the gap        -> Admin does this well          (Campaign Research)
DISPATCH research   -> Admin does this well          (8 templates)
CAPTURE evidence    -> BROKEN   15 campaigns, 0 evidence records
JUDGE support       -> ABSENT   no tool checks whether a source supports its claim
PUBLISH truth       -> BROKEN   0 published all time; runtime reads a baked file
```

**Two of five stages work, and they are the first two.** My prior audits recommended building
stage 1-2 capability that already existed, while stages 3-5 - where the actual defects live -
went unexamined because I never opened the tool.

## Remaining Risks

- **R1.** 10 of 14 tabs and 24 of 28 Studio workspaces are undriven. Any of them could contain a
  capability contradicting a "gap" above. **Nothing here should be read as "Admin cannot do X"
  unless the row says PROVEN.**
- **R2.** Local `?admin=1` dev bypass is not the production auth path. Prod behaviour untested,
  and I did not run against prod (standing rule: ask first).
- **R3.** The 401 on Audit means server-backed tabs are untestable locally. Their verdicts are
  unknown, not negative.
- **R4.** Write actions (`Run all HIGH`, `Launch`, `REVIEW`) were deliberately not clicked. Their
  real behaviour is unproven in both directions.
