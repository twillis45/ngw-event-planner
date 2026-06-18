# Sprint 57F — Confidence Grammar + Positive Attention + Trust Layer (audit + design)

*Audit + design + build-readiness. Presentation only — no planning intelligence, no engine, no readiness/playbook/routing/data-model change. Every claim traced to runtime. Date: 2026-06-17. Follows 57A-B (host voice, merged), 57C (vocabulary, PR #47), 57E-A (host nav, PR #48).*

## The bottleneck, stated plainly
The grandmother no longer sees jargon (57C) or a cockpit (57E-A). The remaining wall is **trust**: NGW knows more than it says. It surfaces *problems* (AT RISK) far better than *certainty* (you're set) or *reasoning* (because). A first-time host still can't answer **"how sure are you?"**, **"why this?"**, **"what am I already doing right?"**. This sprint completes the trust layer — **expression over expansion**.

### Core question — can a host instantly answer…
| Question | Today | Why |
|---|---|---|
| How sure is NGW? | **No** | Confidence is implied, inconsistent. The same green `ON TRACK` token means "all vendors confirmed" (KNOWN) and "no budget set" (UNKNOWN). `ESTIMATE`/`REVIEW` exist on only 2 of 7 health rows. |
| Why is NGW recommending this? | **Rarely** | The factors that produce "24 plates" / "18 lbs ice" exist in scope at the compute site but are discarded before render. |
| What am I doing well? | **No** | The health panel renders every row as risk-or-not; there is no read-only "you've got this handled" surface, though the confirmed signals exist. |
| What needs my attention? | **Partly** | Surfaced, but buried among rows that are actually fine, and colored by alarm not by certainty. |

---

# Deliverable 1 · Confidence Grammar Specification (Pattern 014, made visible)

**Principle:** every value/recommendation carries one of **six** certainty levels, expressed in words a grandmother reads without a legend. The level is a *presentation attribute* attached at render — the underlying number never changes (AP-002 fence).

| Level | Means | Source signature (runtime) | Host words | Planner words |
|---|---|---|---|---|
| **KNOWN** | User-entered or verified fact | manual budget, RSVP=Yes, vendor `status==='Confirmed'`, signed doc, `g.table` set | *(no qualifier — state it plainly)* "12 confirmed" · "$500 booked" | "Confirmed" |
| **LIKELY** | High-probability inference from real data | weather "Rain possible (40%)", caterer-drift cascade, payment-priority | "Likely" · "probably" | "Likely" |
| **TYPICALLY** | Convention / industry heuristic | "Saturday dates fill 12–18mo out", fee `Industry range`, vendor roster | "Usually" · "Typically" | "Typically" · "Industry norm" |
| **ESTIMATED** | Engine-computed from inputs | `estimateTotalRange()`, `playbookCapacity()`, ice `qtyPerGuest×guests` | "About $400–600" · "~24 plates" | "Estimate" |
| **NEEDS VERIFICATION** | Assumption that must be confirmed (AP-005) | Reality Check prompts, rain/power/parking/access, capacity "Confirm…" | "Worth confirming" · "Check this before the day" | "Needs verification" |
| **UNKNOWN** | No data yet | `totalBudgeted===0`, `guests.length===0`, `vendors.length===0`, `tasksTotal===0` | "Not set yet" · "Add this to see…" | "No data" · "Unknown" |

**Visual hierarchy (Studio Matte, confidence-hierarchy lock):** confidence is carried by **word + tier**, not by adding colors. KNOWN/"set" = green (`P.green`) reserved for *confirmed-true only*. ESTIMATED/NEEDS-VERIFICATION = steel (`P.textSecondary`) — the existing Capacity/Reality-Check treatment, extended. UNKNOWN = steel/ghost, never green, never red. Alarm red (`P.red`) is reserved for KNOWN-bad with a deadline (overdue), never for "no data."

**Mobile:** the qualifier word leads and the value follows so truncation never strands a bare number ("About $400–600" not "$400–600 (est.)" which clips to "$400–600"). Badges collapse to a single steel dot + word; no second color.

---

# Deliverable 2 · Confidence Vocabulary Map (the word, per level, per surface)

| Surface (runtime site) | Today | Actual level | Host rendering | Planner rendering |
|---|---|---|---|---|
| Budget total estimate · `BudgetEstimateHint.jsx:111` | "…typically runs $X–$Y" + High/Med/Low chip | ESTIMATED | "About $X–$Y" (keep chip) | "Estimate · $X–$Y (med confidence)" |
| Budget KPI · `App.js:20777` | "$500" | KNOWN if manual / ESTIMATED if `budgetSource==='estimate'` | "$500" / "About $500 (from estimate)" | "$500 · Manual/Estimate" |
| Budget status, no budget · `App.js:20705`/`CommandCenter.jsx:334` | `ON TRACK` (muted) | **UNKNOWN** | "Not set yet" | "No budget set" |
| Budget projection · `App.js:20755` | "Tracking to $X" | ESTIMATED | "On track to about $X" | "Projected ~$X" |
| Capacity row · `CommandCenter.jsx:354` | `ESTIMATE` + "Confirm seating & serveware…" | ESTIMATED + NEEDS VERIFICATION | "About 24 plates · worth confirming" | "Estimate · confirm serveware" |
| Ice/supplies task · `playbooks/index.js:196` | "Buy ice — 18 lbs today" | ESTIMATED | "Buy about 18 lbs of ice today" | "Buy ice — ~18 lbs" |
| Reality Check row · `CommandCenter.jsx:368` | `REVIEW` + "Before event day, confirm:" | NEEDS VERIFICATION | "Confirm before the day: …" | "Needs verification: …" |
| Guests health · `CommandCenter.jsx:333` | "12 confirmed of 12" / "{N} estimated · no RSVPs" | KNOWN / ESTIMATED | keep — already correct | keep |
| Vendor gaps · `App.js:1542` | "Saturday dates fill 12–18mo out" | TYPICALLY | "Saturdays usually book up 12–18 months out" | "Typically books 12–18mo out" |
| Planner fee compare · `App.js:11940` | "✓ market rate" | TYPICALLY (industry) | n/a (planner surface) | "≈ typical market rate" |
| Next-action consequence · `CommandCenter.jsx:1342` | "Falling behind compounds … risk." | LIKELY | "Getting behind usually makes the next steps harder." | "Likely compounds vendor/budget risk." |
| Weather · `App.js:26783` | "Rain possible (40%)" + disclaimer | LIKELY | keep — already correct | keep |

**Already-correct surfaces to preserve (Pattern 014 partially present):** the budget-estimator confidence chip (`confidence.js`), "Planning estimates, not quotes" (`ClientIntakeFlow.jsx:532`), the weather disclaimer, the guest `estimated · no RSVPs` sub-label, the `~` on ice per-guest in the consequence body. **Do not regress these.**

---

# Deliverable 3 · Badge Conversion Map (traffic-light tokens → confidence grammar)

The Planning Health panel produces tokens via `stat()` (`CommandCenter.jsx:309`) and the two steel rows (354/368). 57F is a **presentation remap of the rendered `statusLabel` only** — the predicate that chose the token is untouched.

| Current token | When it fires (predicate, unchanged) | Real level | Host badge | Planner badge | Color |
|---|---|---|---|---|---|
| `ON TRACK` | dimension healthy (real data) | KNOWN | **"You're set"** | "On track" | green |
| `ON TRACK` (no data path) | `totalBudgeted===0` etc. | **UNKNOWN** | **"Not set yet"** | "No data" | steel (was muted-green — fixes false certainty) |
| `ATTENTION` | partial / threshold | KNOWN | **"Worth a look"** | "Attention" | amber |
| `AT RISK` (no data) | `vendors/guests/tasks ===0` | **UNKNOWN** | **"Add to begin"** | "Not started" | steel (de-alarm) |
| `AT RISK` (real overdue) | overdue>2, budget≥90%, missing signed contract | KNOWN-bad | **"Needs you"** | "At risk" | red |
| `ESTIMATE` (Capacity) | always | ESTIMATED | **"About / confirm"** | "Estimate" | steel (keep) |
| `REVIEW` (Reality Check) | always | NEEDS VERIFICATION | **"Confirm before the day"** | "Needs verification" | steel (keep) |

**The single highest-value fix:** split `AT RISK` and `ON TRACK` by *data-presence*. "No budget set" must read **UNKNOWN ("Not set yet")**, not green `ON TRACK` (false certainty) nor red `AT RISK` (false alarm). This is the root of "how sure are you?" failing today.

---

# Deliverable 4 · Positive Attention Design ("You're Set On ✓")

A **read-only** reader over the *existing* health array — no new calculation, no score change. It reads the dimensions that are **confirmed-true** and lists them as reassurance.

```
youreSetOn(event) → [{ dim, label }]   // pure reader over deriveCommandCenterData + getEventReadiness
  Guests   ✓  iff guests.length>0 && yesGuests/guests.length >= 0.7   (CommandCenter.jsx:328)
  Vendors  ✓  iff vendors.length>0 && confirmedVendors===vendors.length && confirmedNoContract===0   (4-axis, :322 + getEventReadiness)
  Timeline ✓  iff overdueCount===0 && tasksDone/tasksTotal >= 0.8       (stricter 4-axis threshold)
  Documents✓  iff getDocumentsReadiness===ON_TRACK (signed contract, 0 draft/pending)   (:457)
  Seating  ✓  iff confirmed.length>0 && all confirmed have g.table        (App.js:22795/22852)
```

**Safe to surface (confirmed signals):** Guests, Vendors, Timeline, Documents, Seating.
**NEVER surface as "set" (grounded in the runtime):**
- **Capacity** — always `ESTIMATE`, no confirmed-true state exists; claiming "set" is false precision.
- **Reality Check** — *safety* prompts (food safety, fire/grill, child supervision, alcohol & minors); always `REVIEW`. Claiming "set" is false **and unsafe** (AP-005).
- **Budget** — health `ON TRACK` means *under-spent <70%*, not *adequately budgeted*. If surfaced at all, word it **"Spending on track"**, never "Budget handled" (adequacy claim, banned).

**Reassurance without complacency:** show ✓ items **collapsed and quiet** (steel check, one line) beneath the single hero "Needs Attention" item — they whisper (per the Attention System). Never let the ✓ list outweigh the one thing that needs the host. Cap at the top 3–4 ✓; "+2 more" collapses the rest.

**Rendering:**
```
You're Set On    ✓ Guests   ✓ Seating   ✓ Vendors
Needs Attention  • Catering count
```

---

# Deliverable 5 · Trust Layer Design ("Because:")

Attach the **reasoning** to a recommendation, built from the factors already in scope at the compute site. Disclosure style: a quiet second line (host) or an inline "· Because:" clause (planner), never a modal.

```
Recommendation              Because (built from real, in-scope factors)
24 plates                   12 guests × 2 plates/guest (1 dinner + 1 dessert)
30 glasses                  12 guests × 2.5 glasses/guest (wine + water)
Buy ~18 lbs ice today       12 guests × 1.5 lb/guest · indoor chilling rule
Buy ~32 lbs ice             16 guests × 2 lb/guest · outdoor — melts faster
Rain plan                   playbook flags 'rain/heat' as high-severity risk
About $45–90 food           8 guests × $8–18/guest across courses
Confirm caterer count       caterer holds 80; 92 confirmed (+12 since last update)
```

**Placement / behavior:**
- **Host:** recommendation bold on line 1; "Because: …" in steel on line 2 (progressive — present but secondary). Mobile: same, wraps under.
- **Planner:** inline "· because 12×2" appended to the value (terser; planners want the math, not the sentence).
- **Mobile:** "Because" line is collapsible behind a "ⓘ why?" affordance on screens <500 to protect the one-hero rule.

---

# Deliverable 6 · Rationale Inventory (availability per recommendation type)

| # | Type | Compute site | Rationale status | Build cost |
|---|---|---|---|---|
| 1 | Capacity (plates/glasses/…) | `playbookCapacity` `index.js:409` | **COMPUTABLE** — `guests`,`qty` on object; `qtyPerGuest` not exposed | add `factor` field to `items[]` (additive) |
| 2 | Ice / operational buys | `playbookTasks` `index.js:160` | **COMPUTABLE** — `qtyPerGuest`,`guests`,`qty` in scope; suppressed by static `p.note` | emit Because *alongside* `p.note` |
| 3 | Rain / weather | `playbookInfraPrompts` `index.js:436` | **COMPUTABLE** — trigger boolean known, discarded | add `trigger` per prompt |
| 4 | Budget typical setup | `playbookBudgetCategories` `index.js:491` | **COMPUTABLE** — `qty×unitCostRange` summed then discarded | return `lineItems[]` per category |
| 5 | Vendor recommendations | `proposedVendorCategories` `vendorCategoriesByType.js:88` | **MISSING** — flat string roster, no per-category "why" | authored role note (content, not code) |
| 6 | Timeline / next-action | `_selectEventNextActionInner` `CommandCenter.jsx:1182` | **MIXED** — caterer/payment/compression AVAILABLE; playbook-task COMPUTABLE; neutral MISSING | interpolate the COMPUTABLE tiers |
| 7 | Reality Check | `playbookInfraPrompts` `index.js:436` | **COMPUTABLE** — same as #3 | add `trigger`/`source` per prompt |

**Summary:** 1 AVAILABLE-now (partial), **5 COMPUTABLE** with small additive return-shape changes (no quantity/logic change → AP-002 safe), **1 MISSING** (vendor "why" = authored content). The factors are present; they're discarded before render. The Trust Layer is *exposure*, not new computation.

---

# Deliverable 7 · Host vs Planner Presentation Review
| Dimension | Host | Planner |
|---|---|---|
| Confidence words | plain-language ("About", "Usually", "Not set yet", "Worth confirming") | terse/industry ("Estimate", "Typically", "No data", "Needs verification") |
| KNOWN values | stated bare, no qualifier (don't over-hedge a fact) | "Confirmed" tag where useful |
| Positive Attention | "You're Set On ✓" reassurance, collapsed | "On track" rows; less reassurance, more density |
| Because | sentence on a second line | inline math clause |
| Color | green only for confirmed-set; steel for estimate/unknown; red only for KNOWN-bad+deadline | same hierarchy (the lock applies to both) |
| Routing through | `audiencePersona` (57A-B) gated by a new `pi.confidence` flag, same triad as `pi.voice`/`pi.nav` | identity when flag OFF |

This rides the **existing seams**: `renderAction` OVERRIDE_FIELDS (title/consequence/CTA) and the 57C `labelFor` vocabulary layer already translate per persona. Confidence words slot into the same persona-keyed maps; no new mechanism.

---

# Deliverable 8 · Momentum Build Assessment → **TEST**
- **Data:** `getReadinessHistory` returns `[{t:Date.now(), s:0–100}]`, forward-only, capped 30, written in `App.js:32187` when `readinessScore(getEventReadiness(ev))` moves; already read by `ReadinessSparkline` (`App.js:4630`, now a worded chip "↗ More ready").
- **Effort:** **S** (≤15 lines least-squares; insertion point wired). **Value:** medium (the first→last chip already conveys direction).
- **Risk (the blocker):** points cluster by *work session*, not calendar time, and the score is a coarse lattice (4 axes × {0,.5,1} → {0,25,50,75,100}). A slope over irregular time reads "stalled/declining" for a deliberately-paused event, and one vendor confirmation looks like a rocket. **Quantization makes genuinely different trajectories produce identical slopes.**
- **Recommendation: TEST.** Run slope vs. the existing chip on real session histories in `review-artifacts/` before committing. Don't ship a noisier signal than the chip it replaces. Guard `<3 points → 'unknown'`; soften "stalled" → "quiet for a while — pick up when ready."

# Deliverable 9 · Decision Confidence Build Assessment → **EXECUTE (scoped)**
- **The predicate already exists:** `guestCountResolved()` (`eventSolve.mjs:119–132`) returns `{resolved, pending, reason}`; the caterer-drift banner (`VendorPlanningWorkspace.jsx:2369`) already computes `catererCount !== confirmedYes`. Inputs (RSVP Yes count, `catererCount`, `daysToEvent`, dietary `needs`) all exist with known sites.
- **Effort:** **M** — a read-only `decisionConfidence(event, decision) → {state, reason}` wrapping existing logic, but each named decision needs a bespoke predicate (no persisted runtime decision object; state is re-derived from raw fields).
- **Risk (the blocker):** field-name drift (`guestCount` vs `guestEstimate` vs `guests.length`) → silent wrong answers. Mitigate by routing every read through the existing resolvers (`guestCountOf`, `guestCountResolved`), never raw fields.
- **Recommendation: EXECUTE, scoped to the three data-rich decisions first** — guest count, caterer reconciliation, dietary collection — turning "Confirm guest count" → **"You have enough — lock the guest count"** vs **"Still gathering — waiting on RSVPs."** Defer venue/food/entertainment (prereq states not explicitly persisted).

---

# Deliverable 10 · Runtime Impact Assessment
| Change | Touches | Logic? | AP-002 |
|---|---|---|---|
| Confidence grammar / badge remap | `statusLabel` *rendering* in `deriveCommandCenterData` + a persona word-map | **No** — predicate unchanged, only the displayed string/word | ✅ presentation |
| Positive Attention reader | new pure reader over existing `health`/`getEventReadiness` | **No** — read-only, no score | ✅ presentation |
| Because (capacity/ice/budget/reality) | **additive** return fields (`factor`, `trigger`, `lineItems`) in `playbooks/index.js`; render uses them | **No** — quantities unchanged; only *exposed* | ✅ presentation (additive) |
| Because (vendor #5) | authored `why` content per category | **No** — content | ✅ content |
| Decision Confidence (scoped) | new reader wrapping `guestCountResolved` | **No** — re-expresses existing predicate | ✅ presentation |
| Momentum | new reader over `readinessHistory` | **No** | ✅ (but TEST first) |
**All flag-gated `pi.confidence` (default OFF = byte-identical to prod).** The one caution: the Because return-shape additions are the only edits inside `lib/playbooks/` — they must be **strictly additive** (new fields), changing no computed quantity; guard with a 0-diff assertion on the *numbers* (snapshot `cap.summary`, ice `qty`, category `low/high` before/after).

---

# Deliverable 11 · QA Plan
1. **Flag OFF = production identity** (every surface byte-identical; both viewports). 
2. **Planner identity** — confidence words render planner-terse, health unchanged.
3. **Confidence grammar** — "No budget set" reads **"Not set yet"** (steel), not green `ON TRACK`; Capacity reads "About…/confirm"; Reality Check "Confirm before the day."
4. **Positive Attention** — a fully-confirmed event lists ✓ Guests/Seating/Vendors; an event with only an estimate shows **no** false ✓; Capacity/Reality-Check **never** appear as ✓.
5. **Because** — "24 plates · Because 12 × 2"; ice Because matches `qtyPerGuest×guests`; **numbers identical to flag-OFF** (additive proof).
6. **Safety guard** — no safety/AP-005 item ever rendered as "set"/confirmed.
7. **Mobile 390** — qualifier-leads-value, no clipped bare numbers; Because collapsible.
8. **Engine 0-diff** — `CommandCenter.jsx` predicate logic + `playbooks` *quantities* unchanged (snapshot test).
9. **0 JS/console errors** (filter resource-400 dev noise).
10. **Decision Confidence** (if built) — caterer-drift event → "Still gathering / You have enough" matches `guestCountResolved`.

# Deliverable 12 · Screenshot Targets (`demo/review-artifacts/57f_*`)
- `flagOFF_1440` / `flagON_host_1440` — health panel: traffic-light → confidence grammar.
- `host_youre_set_on_1440` — Positive Attention block on a healthy event.
- `host_because_capacity_1440` — "24 plates · Because 12 × 2."
- `host_no_budget_1440` — "Not set yet" (the false-certainty fix).
- `planner_identity_1440` — planner-terse rendering.
- `host_390` / `host_because_390` — mobile qualifier-leads + collapsible Because.
- `safety_never_set_1440` — Reality Check shown as "Confirm…", never ✓.

# Deliverable 13 · Expected Grade Improvements
- **Trust ("how sure / why"):** the largest lever left — kills the green-`ON TRACK`-on-no-data false certainty and exposes the Because the engine already computes. Expect the biggest single jump in the host "do I believe it?" dimension since 57A-B's voice.
- **Reassurance:** Positive Attention answers "what am I doing right?" for the first time — reduces first-host anxiety without complacency (collapsed, capped, hero-subordinate).
- **No regression:** flag-gated identity; planner mode held; already-good surfaces (estimator chip, weather, "not a quote") preserved.
- **Safety posture improves:** AP-005 items get an explicit "confirm before the day" frame instead of an ambiguous `REVIEW`.

# Deliverable 14 · Final Build Recommendation
**Build, presentation-only, behind `pi.confidence` (default OFF), in this order — by value/risk:**
1. **Positive Attention reader** — *first*: pure read over existing readiness, zero engine risk, immediately answers "what am I doing well?" (the cheapest high-value win, mirrors 57E-A's lever).
2. **Confidence grammar + badge remap** — split `ON TRACK`/`AT RISK` by data-presence (UNKNOWN→"Not set yet"); apply the persona word-map. Highest trust impact; touches only rendered strings.
3. **Because — capacity & ice first** (COMPUTABLE, factors in scope), then budget typical-setup; **vendor "why"** later (authored content). Strictly additive return fields; snapshot-guard the numbers.
4. **Decision Confidence (scoped)** — guest count / caterer / dietary, wrapping `guestCountResolved`.
5. **Momentum — TEST, do not ship yet** — validate slope vs. the existing chip on real histories first.

**Success condition restated, grounded:** the grandmother sees **About $400–600 · You're Set On ✓ Guests ✓ Seating · Needs Attention • Catering count · 24 plates (Because 12 × 2)** in place of **$500 · AT RISK · ESTIMATE · 24 plates**. The intelligence is unchanged; trust rises, anxiety falls, understanding rises. **Expression over expansion.**

*Confidence: High — every surface, predicate, and factor is traced to runtime (`deriveCommandCenterData` CommandCenter.jsx:136–401, `stat()`:309, `playbookCapacity`/`playbookTasks`/`playbookInfraPrompts` index.js:160–471, `readinessScore`/`getReadinessHistory` readinessHistory.js, `guestCountResolved` eventSolve.mjs:119–132). Weakest assumption: that the additive Because return-shape changes in `lib/playbooks` stay quantity-neutral — mitigated by the snapshot guard in QA step 8. No build performed; design only.*
