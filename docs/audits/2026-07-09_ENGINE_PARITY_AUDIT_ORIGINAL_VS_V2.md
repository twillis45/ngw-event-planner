# Engine Parity Audit — the original's intelligence vs Host Shell V2, brutally

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/b76b62ad-a042-4e68-b587-2033cb9e02ec. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-09 · Source: artifact `b76b62ad`

NGW Event Planner · the artifact's own eyebrow date reads 2026-07-08 (last updated 2026-07-09)

Full production test run plus two exhaustive deep-reads: every lib module and App-internal engine in the original, mapped against every engine call site in V2 — with dropped parameters, ignored output fields, and re-implementations named. Six live defects were fixed and deployed before publication.

---

## Scoreboard

| Metric | Value |
|---|---|
| **2262 / 2262** | production tests green (143 suites) — 3 repaired + 4 NEW behavioral suites for the coverage-debt libs |
| **~70** | engine symbols V2 consumes across 15 lib modules + CommandCenter |
| **~35** | engines & subsystems V2 never touches — absent, not degraded |
| **7** | live defects fixed & deployed — incl. an ENGINE bug: parseMin read "1:30 PM" as 1:30 AM (vendor-overdue alerts misfired in both apps) |

> **One-look verdict:** V2's core is trustworthy — food, day-of, weather, drafting, decisions, and the RSVP contract run the production engines verbatim, and the fields V2 writes are almost all genuine production-read fields. But V2 consumes engines like a **dashboard**, not a command system: it takes each engine's headline and drops the routing, reasoning, and cross-engine context underneath. And the original's entire **judgment layer** — vendor accountability, place intelligence, budget recovery, decision confidence, host memory — is absent outright.

---

## 01 — The test run

The suite is far bigger than remembered: **2,223 tests**. The run surfaced three failures — every one test-side, every lib correct:

| Suite | What failed | Root cause | Repair |
|---|---|---|---|
| dayBefore | window gate "2 days out" | test helper used `toISOString()` (UTC) — drifts a day ahead of local **between 8 PM and midnight Eastern**; the audit ran inside the flake window | helper builds local date parts |
| reader ×2 | 'Backyard BBQ' → Get-Together | stale expectations pre-dating the intentional CANON-TYPE-1 fix (cookout family → The Cookout) | assertions updated to canon |
| guestMode | source contract: ≥5 gate refs in App.js | the event-day rsvp-pending alert moved into `lib/dayAlerts` with the sanctioned extraction — the gate traveled with it | count ≥4 + gate asserted on the lib file |

---

## 02 — Consumed verbatim — the trustworthy core

eventPlan + rollup · buildExperienceContext → blockers · playbookFoodPlan · effectiveRos / classifyRos · computeDayAlerts · phaseProgress counts · buildDayBeforePlan · hostSpending · full weather pipeline · 9 doItForMe drafts · decisionMemory · eventMemory lessons · returnNarration · guestMode gate · attendanceModel · crabPlan math · csvParsers · taxonomy · inviteTone / palette · RSVP outbox + idempotency + server read-back

---

## 03 — Called but hollowed out

The engine runs; V2 keeps the headline and drops the intelligence underneath.

| Engine | What V2 drops | Cost to the host |
|---|---|---|
| eventPlan | **[fixed]** workstreams render on the vendors sheet (engine deepLinks — verified); reasoning + milestones ground "What needs you" | blockedDecisions surface via the blockers rail |
| weatherImpactByEventPhase | **[fixed]** affectedPhases render as their own rows; shouldPromptRainPlan / shouldPromptGuestUpdate drive the real CTA choice | — |
| buildCrabPlan | **[fixed]** issues carry their engine CTAs to the exact field | — |
| deriveEventPhaseProgress | **[mostly fixed]** NEXT tile honors nextCue.route; handled rows render cueLabel | items[].priority still unused |
| getEventReadiness | **[ruled]** decision axis intentionally unrendered — the playbook decision board IS V2's decision pillar (documented in code, 2026-07-08) | one decision truth, by design |
| getVendorCOIState | **[fixed]** coiNextAction (request / verify / renew) speaks on the vendor rows | — |
| deriveEventCompressionSummary | **[fixed]** banner lands on the engine's first do-now task | — |
| playbookHeartMoments | **[fixed]** all authored moments render (≤3, unclipped) | — |
| drafts ×15 | **[fixed]** the production profile is adopted (ngw-profile, same origin) and threaded at all 18 former-null sites | drafts sign with the host's real name — verified "With love, Todd" |
| playbookFoodPlan / hostSpending | **[fixed]** getFoodPriceFactor({state}) threads through both — state from the event's ", XX" or the profile's area | verified live: /api/food-prices?state=MD → 200 |
| buildAssembleRevealStages | **[fixed]** ctx.eventIdentity drives the reveal; the stub is gone; profile threaded | verified live: "Planning this as retirement party + graduation (compound event)" |
| ctx itself | **[fixed]** continuity line on Plan (compound + reasoning), activeRisks merged into the risks sheet, dismissals write the SAME riskStatus field production writes | PC-1/PC-2 parity — built from the real profile now |

---

## 04 — Untouched intelligence — ranked by host value

**[HIGH] vendorAccountability/** — *v1 shipped*
Conflicts + per-vendor tiers now on the vendors sheet. Still unwired: follow-up drafts, brief readiness, full promise CRUD.

**[HIGH] placeIntelligence** — *shipped*
Leads the space sheet: Venue / Guest arrival / Parking & access / Rain backup — na suppressed, states colored.

**[HIGH] budgetRecovery + pickDroppableBudgetRow** — *both shipped*
"A way back under" renders behind a real overage (verified: Skip or trim "coolers"), and swap-to-save is now lib/budgetSwap consumed by BOTH apps. The extraction immediately caught a production bug: `\bcater\b` didn't match "Catering" — the engine offered to drop the caterer as a discretionary cut. Word families fixed (cater\w*, rental\w*), pinned by a new 4-test suite, verified both ways live.

**[LOW] decisionConfidence** — *parity-by-gate* — **confidenceGrammar** — *wired* · **valueConfidence** — *no attachment point yet (open)*
decisionConfidence really is host-gated off in production (`!isHost`) — correct parity. confidenceFor now remaps V2's readiness pills by actual certainty tier, matching production's vocabulary (verified live: "Worth a look — 7 open", "Needs you — 4 unconfirmed"). valueConfidence's provenance pill has no natural home on V2's current pillar shape (aggregate counts, not itemized values) — noted for a future pass, not forced in.

**[MID] hostIntel** — *read + write shipped* · **intelEval · closeoutIntel** — *open*
The "blocked on a profile store" premise dissolved — V2 adopted the production profile. R1 attendanceAdjustment reads on the guests sheet; "The final number" on After WRITES observations via applyReconciliation (verified: 6-of-8 → "about 25% fewer guests show up than you plan for"); memory inspect/clear lives in the You sheet. Still open: intelEval recommendation-evaluation records and the cross-event closeout sweep (V2's isReconciled gate covers the single-event re-ask).

**[MID] vendorMemoryFor** — *shipped* · **App vendor trust system** — *graduation (open)*
Cross-event track record lines on vendor rows (only with real history). Reliability/badges/tiers are App-internal engines — extraction is a graduation item.

**[MID] budgetCopy** — *shipped* · **planHeroCopy** — *ruled-divergent (open)*
budgetHeroCopy leads the budget sheet (live: "You've got about $2,636 left…"). V2's Plan hero is the countdown composition by design.

**[LOW] eventContextNudges · rosOverlap · momentLibrary** — *shipped*
Nudges relocated to their DOMAIN surfaces (one per surface, the lib's own doctrine — host correction); overlap warning on the day; "Worth a spot on the schedule" moment suggestions with one-tap add to the ROS.

**[LOW] workflowCompression detail · payLinks** — *shipped (urgency chips; gated pay links)* · **disclosure (folds ruling) · estimatorFactors breakdown · locationAssist · readinessHistory · draftVersions · studioTeam · XIP-1 · eventSolve graphs** — *ruled or deferred with reasons (open)*
The long tail — including host-side location assist (ironic, given V2 built guest arrival assist) and drafts like guestUpdate, dietaryNote, recap, parkingInstructions.

**[LOW] App-only engines with no lib home**
EVT_IDENT/eventGlyph identity marks, DECK_BY_VOICE, buildStarterROS, getPhaseActions, the vendor money model, eventProgressPct (a second progress model coexisting with phaseProgress) — parity debt on production's side, flagged for graduation.

---

## 05 — Inline re-implementations

**[HIGH] guestNumber precedence** — *fixed*
V2 wrote guestCount from the confirm-count panel but never read it back — tiles and food sizing kept the stale estimate. Now matches the engine: guestCount → estimate → roster.

**[HIGH] venueCity gates** — *fixed*
Three write seams (one fully ungated) bypassed CITY-LEAK-1's canonical isPlausibleCityText. All writes now gated.

**[HIGH] Reveal ctx + identity stub** — *fixed*
The reveal builds real ctx AND uses ctx.eventIdentity — compound events reveal truthfully (live-verified).

**[MID] draftInvite without rsvpUrl · guest rain notes without wx** — *fixed*
The invite draft carries the link at every site; rain notes thread the live forecast's timing.

**[MID] Server read-back missing** — *fixed*
A DELIVERED reply vanished from V2's host view (proven live via a warm Render retry). fetchEventRsvps → the same name-match merge, both paths through one shared helper.

**[MID] mergeGuestReplies (BOTH apps now) · cueMins · store-pick heuristic (removed — where-only, cost-truth) · kidsCount** — *closed* · **dayHelpers · upNext vs taskTimeStatus · readiness pillar rewrites · copy-string routing regexes · eventArtworkFile** — *open — ruled or queued for graduation*
Ranked extraction/consolidation queue — each one is drift waiting to happen.

---

## 06 — Field truth

**Orphan V2 fields** (no production reader):

- `reconfirmed72` — sweep answer tracking
- `capacityHave` / `capacityHelpers`
- `inviteCrest` — crest on/off
- `deckLine` — read, no writer anywhere

Graduation must add production readers or accept V2-local semantics.

**V2-only intelligence the original lacks:**

- Live-day engine (clock, now-cue, behind/next)
- **Shopping-run mode** — "I'm at X" store filter + walk-in totals (cost-truth capture)
- **The thank-you run** — one guest at a time over the roster's own thankYouSent flags
- T-72h reconfirm sweep · sky-watch notifications
- Guest arrival assist · QR invite · cost-truth gate
- Three-audience rain notes · smart-create parse + voice
- The stationery invite (letterpress, weave, emboss, choreography)

---

## 07 — Coverage debt in the original

No behavioral jest coverage: `dayAlerts` (structural only), `workflowCompression`, `estimatorFactors`, `severity`, `sourcing`, `inviteTone`, `vendorQuestions`, `vendorCopilot`, all of `vendorAccountability/`, all of `budgetEstimator/`, `api/rsvp` and sibling clients, `csvParsers`, `payLinks`, `draftVersions`, `studioTeam`. The ones V2 leans on hardest — **dayAlerts, inviteTone, rsvp api, estimatorFactors** — deserve suites before graduation.

---

## 08 — Priority queue to close the gap

1. **Reveal identity** — *shipped* — the stub is gone; ctx.eventIdentity drives the reveal. Live-verified: "Planning this as retirement party + graduation (compound event)." *Engine note: milestone detection has no 'birthday' — compound needs a recognized milestone or ' and '/'+'.*
2. **Render ctx** — *shipped* — continuity line on Plan; ctx.activeRisks merged into the risks sheet with dismiss actions writing the SAME riskStatus field production writes.
3. **Regional price factor** — *shipped* — getFoodPriceFactor({state}) threads into playbookFoodPlan + hostSpending; state only from an explicit ", XX" in venueCity. Live-verified: /api/food-prices?state=MD → 200.
4. **Weather affectedPhases + prompts** — *shipped* — the pill renders the engine's per-phase rows; CTAs follow shouldPromptRainPlan / shouldPromptGuestUpdate.
5. **Route the routes** — *mostly shipped* — crab issues render their own actionLabel + focusField; the NEXT tile honors nextCue.route first. *Compression doNow lists still route generically.*
6. **Vendor accountability v1** — *shipped* — conflicts banner (live: "contract marked signed but no file on record") + per-vendor accountability line ("Venue access / load-in time — evidence missing").
7. **Budget recovery** — *shipped* — "A way back under": headline + source-backed suggestions (live: Skip or trim "coolers") + protected items, behind the over-budget state, regional factor threaded.
8. **planningState.reasoning** — *shipped* — live under "What needs you": "Caterer holds 60; 5 guests are confirmed. Out-of-sync headcounts cascade…"
9. **lib/guestMerge + parseMin** — *shipped* — ONE merge (V2 imports it; App.js swap pending) and ONE time parser (V2's cueMins delegates). The new parseMin tests exposed and fixed the 12-hour engine bug.
10. **One decision truth** — *ruled* — the playbook decision board IS V2's decision pillar (documented in code); the readiness axis intentionally unrendered.

---

## 09 — Activation — the profile era

The audit's final finding became the login phase's foundation: **the profile store was never missing** — production keeps it at `ngw-profile` on the same origin V2 deploys to. Shipped on top of it:

**Profile adopted + threaded** — *shipped*
18 null sites now receive the real profile — every draft signs with the host's name; ctx and the reveal use real identity inputs.

**"You & your account" sheet** — *shipped*
Name, area (backs up prices + weather — verified via the BLS fallback call), memory inspect/clear, magic-link sign-in sharing the main app's session. Merge-only writes preserve every production field.

**The learning loop closes** — *shipped*
"The final number" on After harvests real turnout via applyReconciliation — verified: 6-of-8 recorded → memory reads "about 25% fewer guests show up than you plan for"; R1 honors its own confidence floor at n=1.

**Real events adopted** — *shipped*
"Yours — from the app" leads the events sheet: every real host event opens in the full command shell (read-only base + V2 overlay). Bonus defect fixed: countdown froze in backgrounded tabs (rAF pause) — now always lands.

**Timing words** — *shipped*
taskTimeStatus classifies upNext — "past due / due today / due soon" are the engine's words, not date math.

---

**Method:** full production test run (140 suites, CI=false) · agent A read all ~90 lib modules + subdirectories, censused App.js's internal engines, and mapped the ctx system's build and read sites · agent B read every line of V2 and mapped all ~70 imported symbols with their parameters and consumed output fields · the six defect fixes were live-verified in Chrome and deployed (commits 495f1ba, d6d6879) before this report was published. Companion artifacts: the original gap audit, the RSVP side-by-side, the motion demos, and the graduation spec.
