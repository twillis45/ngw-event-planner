# Sprint 57C Phase 2–5 — Presentation Intelligence Completion (build-ready spec)

*Presentation-only · reversible · feature-flagged · no planning/readiness/playbook/engine change · no Notion write. Phases 2–5 are build-ready specs; Phases 6–7 are audit-only (do NOT build). Follows Pattern 011/014/017 + AP-002/AP-005. Builds on 57A-B (PR #46, the spine voice). Date: 2026-06-17.*

**Dependency:** Phase 2–5 layer on 57A-B. **Merge PR #46 first** (or branch from it) so the label/badge/attention work sits on the audience-aware foundation.

---

## Deliverable 1 — Vocabulary Layer Specification (`labelFor`)
A pure helper mirroring the 55M seam, for the labels that **bypass** the spine:
```
labelFor(term, persona) → string   // persona 'planner' ⇒ identity (today); 'host' ⇒ translated
```
**Inventoried hardcoded sites (where it applies):**
| Site | Examples | Count |
|---|---|---|
| Health-row labels (`stat('X', …)` + `label:'X'`) | Timeline, Vendors, Guests, Budget, Documents, **Capacity** (CommandCenter:354), **Reality Check** (:368) | ~8 |
| Status badges (`statusLabel`) | ATTENTION ×17, AT RISK ×13, ON TRACK ×6, PENDING ×5, OVERDUE ×5, AWAITING ×3, REVIEW ×2, ESTIMATE ×2, DUE ×2, STALE, NEW | ~56 |
| Section headers (JSX text) | PLANNING HEALTH, NEEDS YOU, UP NEXT | ~3 |
**Rule:** `labelFor` wraps the literal at each site; `persona` from `personaFor(event)` (57A-B). Default planner = identity ⇒ flag-off byte-identical.

## Deliverable 2 — Host Terminology Inventory
| Current | Host meaning | **Host label** | Conf | Risk |
|---|---|---|---|---|
| Planning Health | readiness across axes | **Where things stand** | High | Low |
| Capacity | rentals/seating reqs | **Seating & supplies** | High | Low |
| Reality Check | infra confirm-prompts | **Before the big day** | High | Low |
| Run of Show | day-of schedule | **Today's plan** | High | Low |
| Readiness | 4-axis score | **How prepared you are** | High | Low |
| Operational | purchases | **To-do & to-buy** | High | Low |
| Vendor Risk / Vendors | accountability | **Vendor check** / **Your vendors** | High | Med (alarm) |
| Timeline | task schedule | **What's coming up** | High | Low |
| Budget (Status) | budget vs actual | **Money so far** | High | Low |
| Documents | contracts/COIs | **Paperwork** | High | Low |
| Guests | guest list/RSVP | **Guest list** | High | Low |
| NEEDS YOU | attention items | **What needs you** | High | Low |
**Test:** if she must interpret, it failed. "Seating & supplies" passes; "Capacity" fails.

## Deliverable 3 — Planner Terminology Inventory
**Identity.** Every term above stays verbatim in planner mode (`labelFor(x,'planner') === x`). Planner mode = today's UI, zero change. The layer is **additive for hosts, inert for planners** (mirrors 57A-B).

## Deliverable 4 — Confidence Grammar Specification (Pattern 014)
The **qualifier travels with the value**; same intelligence, honest framing:
| State | Vocabulary | Visual (Studio Matte — no new CSS) | Placement | Host | Planner |
|---|---|---|---|---|---|
| **Confirmed** | (plain) / "confirmed" | normal weight | inline | "12 guests confirmed" | "12 confirmed" |
| **Likely** | "usually / typically / likely" | steel, soft | prefix on value | "usually included at a hall like this" | (badge ok) |
| **Estimated** | "about / ~ / roughly" + range | steel + range | replaces bare number | "about $400–600" | "$400–600 est" |
| **Unknown** | "needs verification / check" | prompt chip, **no number** | replaces value | "check the alcohol policy" | "confirm w/ venue" |
- **Belongs on:** every estimate/inference (budget, capacity, venue, market, pattern).
- **Never certain:** venue/parking/restroom/power **adequacy**, ADA compliance, any inferred number-as-fact (POS-P009-R1 / **AP-005**).
- **Badge behavior:** the current `ESTIMATE`/`REVIEW` tokens become the qualifier-on-value, not a separate token (host); planner keeps the token.

## Deliverable 5 — Badge Replacement Recommendations
The alarm tokens → plain state words (host mode only; planner identity):
| Token (today) | Host | Why |
|---|---|---|
| AT RISK | **Needs attention** | "risk" alarms; "needs attention" guides |
| ATTENTION | **Needs a look** | softer, actionable |
| ON TRACK | **You're set** / **Looking good** | turns a status into reassurance (feeds Phase 4) |
| OVERDUE | **Running late** | plain |
| DUE / PENDING / AWAITING | **Due now** / **Waiting** / **Waiting on them** | plain |
| ESTIMATE | **about** | qualifier-on-value (Phase 3) |
| REVIEW | **double-check** | plain |
| NEW / STALE | **New** / **Quiet a while** | plain |
**Principle:** host badges *describe state in plain words*; they never alarm or imply false precision.

## Deliverable 6 — Positive Attention Design (Phase 4)
NGW surfaces problems; add the **certainty** a planner radiates. Derived from the **on-track health axes** (already computed):
> **You're set on:** ✓ Vendors ✓ Guests ✓ Timeline · **Needs you:** the headcount
- **Placement:** atop / leading Planning Health ("Where things stand"); the on-track axes render as the "you're set" line instead of collapsing into silence.
- **Hierarchy:** below the hero/spine, above the per-axis detail.
- **Readiness interaction:** READ-ONLY over the existing health array (green axes = ✓); **no readiness/priority change** (Pattern 010). Host mode only (planner keeps the dense rows).

## Deliverable 7 — Trust / "Because" Design (Phase 5)
Rationale **already exists in the readers** — surface on demand, no clutter:
| Recommendation | Rationale (computed) | Source |
|---|---|---|
| "24 plates" | 12 guests × 2 | capacity note (already carries it) |
| "about $180 ice" | ~1.5 lb/guest × 120 | playbook quantity |
| "rain plan matters" | outdoor venue + weather risk | venue keyword + weather |
| "rental tables" | 80 guests exceed home seating | capacity vs venue assumption |
- **Render:** a collapsed **"why?"** affordance under each estimate/requirement; expands to one line of the existing derivation. **Hidden by default** (clutter rule); never on the hero (the spine already carries its "why").
- **Stays hidden:** trivial/known facts (no "why" on "12 guests confirmed").

## Deliverable 8 — Momentum Reader Audit (Phase 6 — design only)
**`lib/readinessHistory.js` already records a per-event readiness time-series** (`recordReadiness(ev.id, score)` on every change, App.js:32163). ⇒ **Momentum = a pure reader over `getReadinessHistory(eventId)` — no engine, no new data.**
| Trajectory | Signal (from the existing series) |
|---|---|
| **Improving** | positive slope over last N snapshots |
| **Stalled** | flat slope + no recent change (recency) |
| **Declining** | flat/negative slope **as the event approaches** (the danger signal a planner feels) |
| **Confidence: low** | `< N` snapshots → "not enough history yet" (graceful degrade) |
**Design:** `momentum(event)` → `{ trajectory, confidence }`; presentation-only overlay (e.g., "planning is moving" / "things have gone quiet"). **Highest-leverage NEW signal — the data is already on disk, unused.**

## Deliverable 9 — Decision Confidence Reader Audit (Phase 7 — design only)
"When can NGW honestly say *you have enough — make the call*?" Inputs (all existing):
| Decision | Confidence inputs | Threshold (enough) | Blocker |
|---|---|---|---|
| Guest count | RSVP completeness (`guestEstimate` vs confirmed Yes), days-to-event | RSVP ≥ ~80% or T-window reached | open RSVPs + far out |
| Venue | venue set + date | both present | date unset |
| Food | guest count locked | guest decision done | guest count open (prereq) |
| Rentals | guest count + venue | both locked | either open |
| Entertainment | budget + date | both set | — |
| Vendors | category roster vs booked | needed categories addressed | — |
**States (derivable, no engine):** Not-enough-info · **Enough — lock it** · Overdue (cascade already knows) · Blocked (decision graph already encodes prereqs). **Design:** `decisionConfidence(event, decision)` reader; turns "Confirm X" → "you have enough; lock X now." Presentation overlay on the existing decision. **Do not build.**

## Deliverable 10 — Runtime Impact Assessment
| Layer | Logic touched | Risk | Reversible |
|---|---|---|---|
| `labelFor` at ~67 sites | No (string substitution, default identity) | **Med** (touch count) | Yes |
| Confidence qualifier wrap | No (presentation text) | Low | Yes |
| Positive Attention line | No (reads health array) | Low | Yes |
| Trust "why?" affordance | No (reads computed inputs) | Low | Yes |
| Momentum / Decision-Confidence | **not built** (audit only) | — | — |
**Untouched:** `_selectEventNextActionInner`, `getEventReadiness`, cascade, playbooks, capacity, budget. AP-002/AP-005 fences hold. The only sizeable surface is the **~67 label sites** (pure strings, default-identity) — biggest *mechanical* risk, lowest *logic* risk.

## Deliverable 11 — Feature Flag Strategy
Per-phase sub-flags under the master `presentationIntel`, each **default OFF** (= today):
- `pi.voice` (57A-B, shipped) · **`pi.labels`** (Phase 2) · **`pi.confidence`** (Phase 3) · **`pi.attention`** (Phase 4) · **`pi.trust`** (Phase 5).
Each OFF ⇒ identity at that layer. Ship independently; the flag is the kill switch.

## Deliverable 12 — QA Plan
- **Unit:** `labelFor(term,'planner')===term` (identity) for every term; `'host'` returns the mapped string; confidence grammar maps each tier; flag-off = identity per layer.
- **Integration (puppeteer, 390 + 1440):** host audience + `pi.labels|confidence|attention|trust` ON → assert **no jargon** visible (no "Planning Health/Capacity/Reality Check/AT RISK/ESTIMATE"; host strings present) + "You're set on…" present + a "why?" expands. Planner audience / flags OFF → **today's verbatim** (regression snapshot).
- **Grandmother walkthrough:** graduation, host audience — every screen readable without interpreting a term.
- **0 console/page errors.**

## Deliverable 13 — Expected Grade Improvements
| Dimension | Now (post-57A-B spine) | After Phase 2–5 |
|---|---|---|
| Adaptive Language | C (spine only) | **A−** |
| Cognitive Load | D | **B+** |
| Confidence Rendering | C | **B+** |
| Trust Rendering | B− | **A−** |
| Attention | B | **A−** |
| **UI Intelligence (overall)** | C−/D+ | **B+/A−** |
*Engine untouched. The grandmother reads "Where things stand · Seating & supplies · about $400–600 · You're set on… · Because…" — not "Planning Health · Capacity · $500 · AT RISK."*

## Deliverable 14 — Final Build Recommendation
**Sequence (each presentation-only, flag-gated, reversible; after PR #46):**
1. **EXECUTE Phase 2 — `labelFor`** (the dominant gap; ~67 sites; `pi.labels`). 2. **EXECUTE Phase 3 — confidence grammar** (`pi.confidence`; retires alarm badges for hosts). 3. **EXECUTE Phase 4 — Positive Attention** (`pi.attention`). 4. **EXECUTE Phase 5 — Trust "because"** (`pi.trust`).
5. **TEST (later, separate sprints):** Momentum reader (over `readinessHistory`); Decision Confidence reader.
**KILL:** any new engine; routing labels through readiness/cascade; momentum/decision-confidence engines (they're readers).

*Confidence: High — sites inventoried (~67), `readinessHistory` confirmed as an active time-series, the 57A-B seam pattern proven. Weakest assumption: Phase 2's ~67-site touch is the only non-trivial surface; default-identity + the flag make it safe, but it warrants the integration regression snapshot (flag-off == today) as the gating QA. No runtime code written, no Notion update — build-ready spec + recommendation, awaiting go.*
