# Sprint 57D — Presentation Completion + Operator Mode + Judgment Signals

*Audit + design only. No build, no new engine without burden-of-proof, no Notion write. Prefer expression over expansion. Traced to runtime. Date: 2026-06-17.*

## The escalation finding (read first)
57C Phase 2 translated the **words** (host labels). But the **structure** is still planner-grade: a **14-item sidebar** (Overview · Messages · Planning · Decisions · **Client Intake** · Vendors · **Crew** · Guests · Seating · Budget · Documents · Calendar · **Event Day Schedule** · Event Details) + a **3-zone dashboard** (sidebar + hero/NEEDS-YOU + right health rail). **A grandmother now reads friendly words on an intimidating cockpit.** ⇒ The next "feels like software" frontier is **information architecture / progressive disclosure — real UI work, not more labels.** That is the central new conclusion of 57D.

## Core question (3 personas)
- **Grandmother (host):** *after* PR #46 merged + PR #47 (labels) merges → the command center *reads* like A. But the **14-nav cockpit still feels like B**, and the sidebar/intake terms still leak.
- **Executive assistant (operator):** maps to `organization → planner` today → gets **event-industry jargon** ("Run of Show", "COI") she doesn't use. **Wrong voice → B.**
- **Professional planner:** planner voice = her language → **A.**
**Verdict: planner ✓, host ≈✓ (words yes, structure no), operator ✗.** Operator is an un-served, real audience; structure is the host's real blocker.

---

## Part 1 — Presentation Intelligence re-evaluation (post-57C)
| Layer | State | Still leaks? |
|---|---|---|
| Host Voice (spine) | shipped (PR #46 merged) | no |
| Vocabulary (health panel labels/badges) | shipped (PR #47, **unmerged**) | no (once merged) |
| **Sidebar nav** | **untranslated** | **YES** — Client Intake / Crew / Event Day Schedule / Planning |
| **NEEDS-YOU triage-row badges** | **untranslated** (only health-row badges done) | **YES** — OVERDUE/DUE/AWAITING/PENDING |
| Confidence rendering | not built (Phase 3) | YES — bare "$500", token badges |
| Event Day views / intake forms | not audited/translated | YES |
**EXECUTE:** merge #47; extend `labelFor` to the **sidebar nav** + **triage-row badges** (same helper, more sites). **TEST:** confidence grammar (Phase 3). **PARK:** deep event-day/intake translation; **the IA/nav simplification (Part 8) — the real frontier.** **KILL:** nothing.

## Part 2 — Operator Mode (design only)
1. **Real model or Planner Lite?** **Real, distinct.** Operators (exec assistant, office/HR/school/nonprofit coordinator) are **competent + accountable but not event-industry insiders.** They think *schedule / sign-off / headcount / approvals / budget*, not *run-of-show / COI / day-of dock*. Mentally between host (first-time, emotional) and planner (industry pro): **professional-but-plain, efficiency over reassurance, no craft jargon.** Not Planner Lite — *different vocabulary AND different priorities.*
2. **`My Organization` → Operator? Yes** (currently → planner). Re-map: `organization → operator`; `professional → planner`; host audiences unchanged.
3. **Existing architecture? Yes — zero new architecture.** The 55M seam + `labelFor` already key by a **persona string**; Operator = author `VOICE[category].operator` + an operator label map + add `'operator'` to `AUDIENCE_VOICE`. Pure authoring.

**Vocabulary (overlap/divergence):**
| Term | Host | Operator | Planner |
|---|---|---|---|
| Planning Health | Where things stand | **Event status** | Planning Health |
| Capacity | Seating & supplies | **Headcount & supplies** | Capacity |
| Reality Check | Before the big day | **Pre-event checklist** | Reality Check |
| Run of Show | Today's plan | **Day-of schedule** | Run of Show |
| Vendor Risk | Needs attention | **Vendor status** | Vendor Risk |
| Operational | To-do & to-buy | **Tasks & purchasing** | Operational |
**Overlap:** Operator shares ~50% terseness with planner but uses **generic business** terms, not **event-industry** terms; shares ~30% plainness with host but **no reassurance/hand-holding.** **Complexity: LOW** (authoring, no engine). **Recommend: design now, TEST after host modes prove out** — the cleanest "Pattern 011, many presentations" win.

## Part 3 — Confidence Grammar (design only; Pattern 014)
Still missing: a **universal grammar** — budget shows bare numbers, capacity shows `ESTIMATE` tokens, venue (future) will infer. **The qualifier must travel with the value:**
| Tier | Grammar | Badge | Mobile |
|---|---|---|---|
| Confirmed | (plain) / "confirmed" | none | inline |
| Likely | "usually / typically / likely" | soft steel | prefix |
| Estimated | "about / ~" + range | steel | range replaces number |
| Unknown | "needs verification / check" | prompt chip, **no number** | chip |
- **Placement:** on the value, not a separate token. **Hierarchy:** below the hero. **Never certain:** venue/parking/power **adequacy**, ADA (POS-P009-R1 / AP-005). Retire alarm tokens (`AT RISK`→"needs attention" already in 57C; extend to value-level estimates).

## Part 4 — Trust Layer "Because" (design only)
Rationale **exists in the readers** — highest-value surfaces:
| Recommendation | Because | Source |
|---|---|---|
| "24 plates" | 12 guests × 2 | capacity note (carries it) |
| "about $180 ice" | ~1.5 lb/guest × 120 | playbook qty |
| "rain plan" | outdoor venue + weather risk | venue keyword + weather |
**Render:** a collapsed **"why?"** under each estimate/requirement (one line on expand). **Hidden:** trivial/known facts; the hero (spine already carries its why). **Highest-value:** capacity + budget (numbers a host most doubts).

## Part 5 — Positive Attention (design only)
NGW identifies problems; rarely surfaces **certainty.** From the on-track health axes (exist): **"You're set on: ✓ Vendors ✓ Guests ✓ Timeline."**
- **Placement:** atop "Where things stand." **Timing:** always (anxiety-reducing). **Readiness interaction:** READ-ONLY (Pattern 010, no scoring change). **Momentum interaction:** pair with Part 6 — "You're set, and planning's moving well" (positive ✓ + improving trajectory).

## Part 6 — Momentum Intelligence (reader design — no engine)
`lib/readinessHistory.js` records a **forward-only score series** (`getReadinessHistory(id)`, recorded only when readiness *changes*) — **and already powers the card sparkline.** ⇒ Momentum is a **pure reader, with a visual precedent.**
| State | Signal | False-positive risk |
|---|---|---|
| **Improving** | positive slope over last N points | low |
| **Stable** | flat, recent point exists | low |
| **Stalled** | flat + no recent point + event approaching | **a deliberately-paused event reads stalled** (arguably correct; soften copy) |
| **Declining** | negative slope | rare (readiness rarely drops) — investigate when seen |
- **Reader:** `momentum(event)` → `{trajectory, confidence}`. **Confidence: low if < 3 points** ("not enough history yet" — graceful). **Recommendation: TEST** (highest-leverage NEW judgment signal; data + sparkline already exist).

## Part 7 — Decision Confidence (reader design — no engine)
"When can NGW say *you have enough — lock it*?" Inputs all exist:
| Decision | Inputs | Enough when | Blocker |
|---|---|---|---|
| Guest count | RSVP confirmed vs estimate, days-out | RSVP ≥ ~80% or T-window | open RSVPs + far out |
| Venue | venue + date set | both present | date unset |
| Food / Rentals | guest count locked | guest decision done | guest count open (prereq) |
| Budget / Entertainment | budget + date | both set | — |
| Vendor selection | needed categories vs booked | needed addressed | — |
**States (derivable):** Not-enough · **Enough — lock it** · Overdue (cascade knows) · Blocked (decision graph knows prereqs). **`decisionConfidence(event, decision)` reader; presentation overlay.** No engine.

## Part 8 — UI Intelligence Audit (brutal; ignore intelligence)
**Top 10 UI problems for a first-time host (ranked by impact):**
1. **14-item sidebar** = planner-tool density → intimidation (#1 blocker; words don't fix it).
2. **3 simultaneous info zones** (sidebar + hero/NEEDS-YOU + right health rail) — no single focus.
3. **Irrelevant nav** for a simple party (Client Intake, Crew, Event Day Schedule, Planning).
4. **No progressive disclosure** of nav — everything visible always (cockpit, not interview).
5. **Health rail shows all axes always** — on-track items don't collapse (anxiety + noise).
6. **No "first 5 minutes" guided path** (vs TurboTax interview) — host dropped into a dashboard.
7. **Mobile:** ~14 items crammed under "More" → buried/hard.
8. **Dashboard intimidation:** host wants *one thing to do*; gets a management console.
9. **Chrome noise** (breadcrumb, "EVENT BOSS PULSE", eyebrows) competes with the one action.
10. **Density tuned for a planner managing 20 events**, not a host managing 1.
**Conclusion:** even with perfect host words, the **planner-grade IA** reads as software. **The next presentation frontier is host-mode progressive disclosure / nav reduction — real UI work, the biggest remaining "feels like software" lever.**

## Part 9 — Remaining Intelligence Gap re-score (value, not interest)
- **Highest value next:** **Presentation completion + host-mode IA** (Parts 1/3/4/5/8) + **Momentum & Decision Confidence readers** (near-free) + **Operator authoring** — all expression/reader/authoring, no engine.
- **Venue Intelligence:** remains the highest-leverage *intelligence/data* build — but **after** presentation/IA completes (57C revision holds).
- **Stakeholder/Outcome:** dark, valuable, later. **Distribution:** existential, unaddressed. **Decision Memory:** the cheap moat seed (one `rationale` field).

## Part 10 — Updated Grades
| Capability | Current | After Confidence + Attention + Trust + Momentum + Decision-Conf + Venue |
|---|---|---|
| Presentation Intelligence | **C+** (voice + labels) | **A−** |
| UI Intelligence | **D** (planner IA) | **C→B** (only with host-mode IA work) |
| Audience Intelligence | **B** (host/planner; +Operator) | **A** |
| Trust Intelligence | **C** | **A−** |
| Confidence Intelligence | **C** | **B+** |
| Momentum | **D** surfaced / data exists | **B** |
| Decision Confidence | **D** | **B** |
| Venue Intelligence | **D** | **B** |
| Stakeholder / Outcome | **D** (dark) | D (until built) |
| Distribution | **D/F** | D/F |
| Moat | **F** | F |

---

## Final Verdict (ruthless)
1. **Biggest presentation gap:** the **planner-grade information architecture** (14-nav cockpit, 3-zone dashboard) — 57C fixed the *words*, not the *structure*; **plus** the still-untranslated sidebar + triage badges.
2. **Biggest trust gap:** confidence renders as **bare values / alarm tokens**, not honest qualifiers, and recommendations rarely show their **"because."**
3. **Biggest UI gap:** **no host-mode progressive disclosure** — a first-time host is dropped into a 14-item management console instead of a guided path.
4. **Biggest judgment gap:** **Momentum & Decision Confidence are un-surfaced** despite being **pure readers over existing data** (readinessHistory even has a sparkline).
5. **Biggest intelligence gap:** **Outcome/Stakeholder** (dark) — captured, not expressed.
6. **Biggest moat gap:** no compounding capture — the **Decision-Memory `rationale` field** is still one unbuilt field.
7. **Biggest distribution gap:** **~0 activation**; the native multiplayer surface (invite/RSVP/portal) still unused as a growth loop.
8. **Should Operator Mode exist? YES** — a real third mental model, **zero new architecture** (author operator VOICE + labels; remap `organization → operator`). Cheap, high-value, the canonical Pattern-011 "many presentations" win.
9. **What to build next:** **(a) merge #47 + extend `labelFor` to sidebar nav + triage badges; (b) confidence grammar + positive attention + trust "because"; (c) Operator authoring; (d) Momentum + Decision-Confidence readers; (e) begin host-mode IA/progressive-disclosure** — all expression/reader/authoring; the only real *build* is (e), and it's UI, not an engine.
10. **What absolutely not to build next:** a new **planning/intelligence engine** (Venue included until presentation + IA complete); a separate **Operator/Momentum/Decision-Confidence engine** (they're authoring/readers); deep Stakeholder/Outcome modeling (dark, later). **Expression over expansion.**

**The synthesis:** 57C proved words fix comprehension; 57D finds the next wall is **structure** — a planner's cockpit shown to a host. The decisive next moves are **finish expression (confidence/attention/trust + Operator), turn on two free judgment readers (Momentum, Decision Confidence), and begin simplifying the host-mode UI** — *not* a new engine. The grandmother's remaining problem isn't vocabulary; it's that she's looking at a tool built for someone who runs 20 weddings a year.

*Confidence: High — traced to the 14-item nav, `readinessHistory` (+ existing sparkline), the `organization→planner` mapping, and the merged/unmerged PR state. Weakest assumption: that host-mode IA simplification can be done as progressive disclosure over the existing surfaces (not a rebuild) — likely true (the nav already has recordKind-driven suppression precedent), but it's the one item that is genuine UI work, not labels/readers, and should be scoped carefully before building. No build; audit + design only.*
