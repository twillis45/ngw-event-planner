# Sprint 57C — Presentation Intelligence Completion + Judgment Intelligence Audit

*Audit + design + build-recommendations only. No new engine, no Studio Matte redesign, no planning/readiness/playbook/capacity/budget logic change, no Notion write. Date: 2026-06-17.*

## Core question — answered against the live build
With `pi.voice` ON, the **spine already feels like A** ("Let's lock the final headcount … Update the count" — a planner talking). But the moment she looks below it she's back to **B**: the 57A-B screenshot shows a host hero sitting on top of **"PLANNING HEALTH · Capacity ESTIMATE · Reality Check REVIEW · Timeline AT RISK · Documents AT RISK."** So the honest verdict: **the hero is A, the rest of the screen is B.** Three things still prevent A:
1. **The labels bypass the seam** — every health row, badge, and section header is system language (56G; 57A-B only routed the spine). **This is now the dominant remaining presentation gap.**
2. **57A-B isn't merged / is flag-OFF** — the one A-grade surface isn't even live (PR #46 open).
3. **Confidence reads as alarm** — "AT RISK / ESTIMATE / REVIEW" badges feel like jargon + false-certainty to a host (no Pattern-014 grammar).

**And the sleeper finding:** two new judgment signals — **Momentum** and **Decision Confidence** — are **derivable from data NGW already captures** (`readinessHist`, RSVP completeness, `resolvedAt`) with **no engine**. They are exactly what separates *planner judgment* from *planner software*, and they're nearly free.

---

## Part 1 — Vocabulary Layer Audit (the dominant remaining gap)
*Eliminate planner terms without losing planner intelligence — the Phase 2 `labelFor` spec.*
| Current label | Planner meaning | Host meaning | Recommended host label | Conf. | Risk | Priority |
|---|---|---|---|---|---|---|
| Planning Health | readiness across axes | "how's it going?" | **"Where things stand"** | High | Low | **P1** |
| Capacity | rentals/seating requirements | chairs/plates enough? | **"Seating & supplies"** | High | Low | **P1** |
| Reality Check | infra confirm-prompts | don't-forget list | **"Before the big day"** | High | Low | **P1** |
| Run of Show | day-of schedule | the day's plan | **"The day's plan"** | High | Low | **P1** |
| Readiness | 4-axis score | "are you ready?" | **"Are you ready?"** | High | Low | P2 |
| Operational | purchases/quantities | to-do & to-buy | **"To-do & to-buy"** | High | Low | P2 |
| Vendor Risk | accountability tier | is my caterer solid? | **"Vendor check"** | High | Med (alarm) | **P1** |
| Timeline | task schedule | what's coming up | **"What's coming up"** | High | Low | P2 |
| Budget Status | budget vs actual | money so far | **"Money so far"** | High | Low | P2 |
| Documents | contracts/COIs | paperwork | **"Paperwork"** | High | Low | P3 |
| AT RISK / ESTIMATE / REVIEW (badges) | status tokens | — | **"needs a look" / "about" / "double-check"** | High | **High (alarm+false-precision)** | **P1** |
**Test:** if she must stop and interpret, it failed. "Capacity" fails; "Seating & supplies" passes. **Highest leverage now** — it's the bulk of what she reads, and it bypasses the one surface 57A-B fixed.

## Part 2 — Confidence Intelligence (universal grammar)
Pattern 014 exists in pockets; **not at-a-glance.** Design — a confidence grammar where the **qualifier travels with the value**:
| Tier | Verbal grammar | Visual (Studio Matte, no new CSS) | Example |
|---|---|---|---|
| **Known** | (plain) / "confirmed" | normal weight | "12 guests confirmed" |
| **Likely** | "usually / typically / likely" | steel, soft | "usually included at a hall like this" |
| **Estimated** | "about / ~ / roughly" + range | steel + range | "about $400–600" |
| **Unknown** | "needs verification / check" | prompt chip, no number | "check the alcohol policy" |
- **Where it belongs:** every estimate/inference value (budget, capacity, venue, market, pattern).
- **Never expressed with certainty:** venue/parking/restroom/power **adequacy**, ADA compliance, any inferred number-as-fact (POS-P009-R1 / AP-005). The current "ESTIMATE/REVIEW" badges are the right *intent* but the wrong *grammar* (token, not qualifier-on-the-value).

## Part 3 — Trust Intelligence (the "because")
Rationale **already exists in the readers** — surface it, on tap, without clutter:
| Recommendation | Rationale (already computed) | Surfaced today? |
|---|---|---|
| "24 plates" | 12 guests × 2 (capacity note carries it) | partially (in the note) |
| "about $180 ice" | ~1.5 lb/guest × 120 (playbook qty) | no |
| "rain plan matters" | outdoor venue + weather risk | no |
| the spine consequence | the engine's "why" | **yes** (the one place it works) |
**Design:** a collapsed "**why?**" affordance under each estimate/requirement that expands the existing derivation. No new calculation; presentation of computed inputs. Clutter rule: collapsed by default, one line on expand.

## Part 4 — Attention Intelligence (the Positive layer)
NGW surfaces problems; it rarely surfaces **certainty**. The data exists (the on-track health axes). **Design — Positive Attention:**
> **You're set on:** ✓ Vendors ✓ Guests · **Needs you:** the headcount
- **Where:** beside/atop Planning Health — render the *on-track* axes as an explicit "you're set" line instead of collapsing them into silence. Derived from the existing health array (green axes = ✓). **No priority/readiness/next-action change** (Pattern 010 — inform, don't escalate).

## Part 5 — Context Intelligence (presentation by stage)
Reuse the existing date math + `dayMode` (no planning change):
| Stage | Disappears | Surfaces | Reframed |
|---|---|---|---|
| 120d+ | quantities, day-of | the few big decisions | "Plenty of time — lock the big things first." |
| 90d | — | vendors/venue | "Now's a good time to line up vendors." |
| 30d | early decisions | confirmations | "Time to confirm." |
| 7d | decor/nice-to-haves | food · guests · logistics | "Final stretch — focus on food & guests." |
| event week | planning chrome | the day's plan | "Almost there." |
| event day (`dayMode`) | all planning | execution board | "Stop planning — enjoy it. Here's your day." |

## Part 6 — Decision Confidence Intelligence (NEW — design only)
Today NGW says "Confirm guest count"; it does **not** say "you now have **enough** to lock it." The inputs for "enough" exist: RSVP completeness (`guestEstimate` vs confirmed Yes), days-to-event, prerequisite completion.
**Framework (4 states, derivable, no engine):**
| State | Signal (existing) |
|---|---|
| **Not enough info** | RSVPs still open + far from event |
| **Enough info — lock it** | RSVP ≥ threshold or T-window reached |
| **Decision overdue** | past the decision's `offsetDays`, still open (the cascade already knows overdue) |
| **Decision blocked** | a prerequisite decision unresolved (decision graph already encodes this) |
**Don't build** — a *reader* over existing RSVP/date/decision-graph signals + presentation. Moves "confirm X" → "you have enough; lock X now."

## Part 7 — Momentum Intelligence (NEW — the sleeper, near-free)
Two events with identical *current* readiness differ in **trajectory** — a planner feels which is healthy. **`readinessHist` already captures readiness over time** (App.js:20 / `ngw-readiness-hist-<id>`). ⇒ **Momentum = the slope of the existing readiness history + recency of last activity. Zero new data, zero engine.**
| State | Signal (from readinessHist + activity) |
|---|---|
| Healthy | readiness rising, recent activity |
| Stalled | readiness flat, no recent activity |
| Accelerating | slope increasing |
| Decaying | readiness flat/falling as event approaches (the danger signal) |
**This is the highest-leverage NEW judgment signal** — the data is already on disk, unused. Design: a `momentum(event)` reader over `readinessHist`. **Strongly recommend TEST.**

## Part 8 — Commitment Intelligence (NEW — design only)
"How trustworthy is the info?" Signals, by availability:
| Signal | Status |
|---|---|
| Vendor responsiveness | **exists** (`avgResponseHours`, `onTimeRate`, `lastContact`) |
| Guest-count quality | **derivable** (estimate vs confirmed Yes ratio) |
| Decision completion quality | partial (`resolvedAt` exists; "quality" needs rationale — Part 9) |
| Stakeholder responsiveness | **derivable** from comms (message sent → reply latency) |
**Design:** a per-signal commitment score; ~70% derivable from existing fields, ~30% needs light response-tracking. Downstream of Stakeholder. **PARK behind Momentum/Decision-Confidence** (lower leverage, partly new data).

## Part 9 — Knowledge Capture / Decision Memory Foundation
| Capture | Today |
|---|---|
| What happened (actuals) | partial — `budget.actual`, some `postEvent` |
| **Why decided** | **missing** — `resolvedAt` captured, no rationale |
| What worked/failed/regretted/exceeded | missing |
**Minimum viable Decision Memory (no Memory engine):** add a **`rationale` field captured at the existing decision-resolve site** (the `resolvedAt` write, App.js:28346/28359/28552/31976) — "why did we lock this?" One field, one capture point. It is the cheapest seed of the only durable moat (56F), and it compounds the moment events accumulate. **Recommend TEST.**

## Part 10 — Venue Foundation Dependency Review (honest revision)
**Revised:** 57A-B **proved presentation creates more *perceived* intelligence per unit effort than a new engine.** Therefore for the **next moves**, **Presentation Completion (Phase 2 labels + confidence/trust/attention) now outranks Venue Foundation.** Venue remains the highest-leverage **intelligence/data foundation** — but it is no longer the highest-leverage **next build**. **Correct ordering: complete Presentation (cheap, proven, high perceived-intelligence) → then Venue (the data foundation everything else needs).** Both true, at different layers; the prior "Venue is the single next build" is revised to "Venue is the next *intelligence* build, after Presentation completes."

## Part 11 — Updated Gradecard
| Capability | Current | After Presentation Completion | After Venue Foundation | After Stakeholder/Outcome |
|---|---|---|---|---|
| Presentation Intelligence | **C** (spine only, unmerged) | **A−** | A− | A |
| UI Intelligence | **C−/D+** | **B+** | A− | A− |
| Venue Intelligence | **D** | D | **B** | B |
| Stakeholder | **D** (dark) | D | D | **B** |
| Outcome | **D** (dark) | D | D | **B** |
| Decision Confidence | **D** | **B** (reader+present) | B | B |
| Momentum | **D** surfaced / **C** derivable | **B** (readinessHist) | B | B |
| Commitment | **C** (vendor fields) | C+ | C+ | **B** |
| Knowledge Capture | **C** | C | C | **B** (loop) |
| Decision Memory | **F** (no rationale) | **C** (rationale field) | C | C |
| Distribution | **D/F** | D/F (unchanged) | D/F | D/F |
| Moat | **F** (traction-gated) | F | F | F |

## Part 12 — Prioritized Build Order (Top 15 — by user value/trust/differentiation/moat/learning, NOT effort)
**EXECUTE (cheap · proven · high perceived-intelligence):**
1. **Merge + enable 57A-B** (the spine win isn't live).
2. **Phase 2 `labelFor`** (host labels for the bypassing system terms) — the dominant gap.
3. **Confidence grammar** (qualifier-on-value; retire alarm badges for hosts).
4. **Positive Attention** ("You're set on…").
5. **Trust "because"** (collapsed derivations).

**TEST (new judgment, near-free, differentiating):**
6. **Momentum reader** (over existing `readinessHist`) — the sleeper.
7. **Decision Confidence reader** ("you have enough — lock it").
8. **Decision Memory rationale field** (the moat seed).
9. **Context/stage presentation** (reframe by timeline).

**PARK (sequenced behind the above):**
10. **Venue Foundation** (the next *intelligence* build, after presentation).
11. Stakeholder→Outcome chain. 12. Commitment scoring. 13. Local market/quote. 14. Knowledge-capture loop (gated on events).

**KILL:**
15. Any new engine/dashboard/governance for the above; routing patterns into the cascade as blockers; **the assumption that more planning intelligence is the next move** (presentation is).

---

## Final Verdict (ruthless)
1. **Biggest product gap:** Presentation is only ~20% activated — the spine speaks host; **everything else still speaks planner** (labels bypass the seam) and 57A-B isn't even merged.
2. **Biggest intelligence gap:** Outcome/Stakeholder (dark) — *what success means, to whom* — but it's captured, not missing.
3. **Biggest presentation gap:** the **label vocabulary layer** (Phase 2) — the bulk of what a host reads, untranslated.
4. **Biggest trust gap:** confidence renders as **alarm + false certainty** ("AT RISK", bare "$500") instead of honest qualifiers ("needs a look", "about $400–600").
5. **Biggest moat gap:** no compounding capture — and the cheapest seed (**Decision Memory rationale field**) is one unbuilt field on an existing write site.
6. **Biggest distribution gap:** unchanged and existential — ~0 measured activation; the native multiplayer surface (invite/RSVP/portal) is still unused as a growth loop.
7. **What still prevents NGW feeling like a planner:** she reads planner *labels and badges* the instant she looks past the hero — presentation completion (Parts 1–2) is the fix, and it's cheap.
8. **What prevents world-class:** the same presentation gap + un-surfaced judgment (Momentum/Decision-Confidence) that a real planner radiates — all derivable from existing data.
9. **What prevents difficult-to-replace:** no accumulated data (Decision Memory/Knowledge/Network) — traction-gated; nothing built compounds yet.
10. **What to build next:** **complete Presentation — merge/enable 57A-B, then Phase 2 labels + confidence grammar + positive attention** — then the two near-free judgment readers (**Momentum from `readinessHist`**, **Decision Confidence**) and the **Decision-Memory rationale field.** All presentation/routing over existing data; no engine.
11. **What absolutely not to build next:** another planning/intelligence **engine** (Venue included, until presentation completes); a Momentum/Decision-Confidence/Commitment **engine** (they're readers over existing data); a patterns/confidence **dashboard.** More intelligence is not the lever — *expressing the intelligence already present* is.

**The synthesis:** 57A-B proved the thesis — presentation, not more engine, is where perceived intelligence comes from. NGW should **finish what 57A-B started** (labels, confidence, attention, trust) and **turn on two judgment signals it's already recording but ignoring** (Momentum via `readinessHist`, Decision Confidence) before building any new intelligence. The next decisive move is **completion and expression, not expansion.**

*Confidence: High — traced to runtime (`readinessHist`, `resolvedAt`, vendor commitment fields, the 57A-B screenshot, PR #46 unmerged, the bypassing labels). Weakest assumption: the Momentum-from-readinessHist value assumes the history has enough snapshots to show a slope — true for active events, thin for brand-new ones; the reader must degrade gracefully (unknown momentum < N snapshots). No build; audit + design only.*
