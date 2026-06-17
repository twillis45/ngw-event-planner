# Sprint 57A — Presentation Intelligence Activation (design + build recommendation)

*Design only. No engine/logic/playbook/runtime-decision change — presentation only. Goal: same intelligence, rendered so it feels like **a planner speaking to the user**, not planner software. Builds on the 55M seam + the 56G-UI audit (Audience=F, Language=F). Date: 2026-06-17.*

## Two findings that reshape the sprint (read first)
1. **The 55M seam covers ~one surface and three fields.** `renderAction` wraps **only** `selectEventNextAction` (CommandCenter.jsx:1129) and may rewrite **only** `title/consequence/primaryCta` (`OVERRIDE_FIELDS`). **Everything else the host reads bypasses the seam** — the health-row labels (`'Capacity'`:354, `'Reality Check'`:368, Timeline/Vendors/Budget/Documents), the status badges (OVERDUE/PENDING/ESTIMATE/REVIEW), the section headers ("PLANNING HEALTH"/"NEEDS YOU"/"NEXT UP") are **hardcoded JSX literals.** ⇒ Activating the spine VOICE is necessary but **far from sufficient**; a second, parallel **label-vocabulary layer** is required.
2. **The persona signal itself is wrong for the target user.** 55M's `personaFor` derives persona from **`recordKind`** (`home_hosted`→host, else→planner). But by the taxonomy, a **grandmother's graduation party is `host_driven`→`client`** and a **bride's own wedding is `full_service`→`client`** — both resolve to the **planner** voice. **recordKind mis-classifies the exact first-time hosts this sprint exists to serve.** ⇒ Presentation activation is **blocked on a real persona signal**, not the proxy.

**Net:** the activation is doctrine-safe and mostly presentation — but it needs (a) a real persona field, (b) the spine VOICE, and (c) a label-vocabulary layer the seam doesn't yet reach. None touches logic.

---

## Deliverable 1 — Presentation Architecture
```
Engine truth (unchanged)
   │
   ▼
personaFor(user)  ◄── NEW real signal: "I'm planning my own event" vs "I plan events professionally"
   │                   (one profile field — recordKind is insufficient; see Finding 2)
   ▼
┌───────────────── PRESENTATION INTELLIGENCE (pure projection, AP-002-fenced) ─────────────────┐
│  • VOICE map        → next-action triplet      (the 55M seam — already supports this)         │
│  • LABEL map        → health rows, headers, badges  (NEW labelFor(term,persona) helper)        │
│  • CONFIDENCE grammar→ value qualifiers          (Pattern 014 as a rendering convention)        │
│  • ATTENTION compose → clear vs needs-you        (readiness+risk; mostly exists)                │
│  • TRUST append      → the "because"             (inputs already computed by the readers)       │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
   │  (renders strings only; never alters ranking/routing/readiness/playbooks)
   ▼
Existing surfaces (CommandCenter, spine, Planning Health, Reality Check, ROS)
```
**Boundary (hard):** projection only — it can change *words and emphasis*, never *logic* (the AP-002 / 55M fence). Default persona = **planner = today's labels verbatim** → inert for existing behavior; host mode is purely additive.

---

## Deliverable 2 — Host Vocabulary System (first-time host / grandmother / parent)
*Voice goals: simple · reassuring · action-oriented · zero jargon.*
**Label map (bypasses seam → `labelFor`):**
| System (today = planner) | Host |
|---|---|
| Planning Health | **"Where things stand"** |
| Capacity | **"Seating & supplies"** |
| Reality Check | **"Before the big day"** |
| Readiness | **"Are you ready?"** |
| Run of Show | **"The day's plan"** |
| Timeline | **"What's coming up"** |
| Operational | **"To-do & to-buy"** |
| Vendor Risk | **"Vendor check"** |
| Compression | **"Time's getting short"** |
| ESTIMATE / REVIEW (badges) | **"about" / "double-check"** |
**Spine VOICE (through seam, by `category`):** host = warm + plain + reassuring, e.g. `decision` → "One thing's waiting on you — deciding it now frees up everything after." `operational` → "Time to grab the ice — about 18 lbs for today." `vendor` → "Give your caterer a nudge to lock in the count."

## Deliverable 3 — Planner Vocabulary System (planner / coordinator / ops)
**Identity map — the system terms ARE the planner's terms.** Planning Health, Capacity, Reality Check, Run of Show, Readiness, Operational, Vendor Risk all **stay verbatim.** ⇒ **Planner mode = today's UI, zero change** (default persona). Professional terminology is allowed and preferred. The entire activation is therefore *additive for hosts, inert for planners.*

## Deliverable 4 — Confidence Rendering System (Pattern 014 as a convention)
Same intelligence; the **qualifier travels with the value** (no engine change):
| Tier | Rendering rule | Example |
|---|---|---|
| **Known** | plain, no qualifier | "12 guests confirmed" |
| **Likely** | soft prefix | "**usually** includes tables & chairs" |
| **Estimated** | range + "about/~" | "**about** $400–600" (never "$500") |
| **Unknown** | a confirm-prompt, never a value | "**check** the alcohol policy" |
Rule: **an estimate must never render like a fact** (AP-005). This is a textual/visual convention within Studio Matte (steel/neutral already exists) — **no new CSS mandated**, no logic touched.

## Deliverable 5 — Attention Rendering System (compose, don't build)
Reuse existing signals: **on-track (readiness green) + low risk → whisper/collapse** (already happens); the **one real risk → hero** (Pattern 002, exists). The activation = add the **explicit positive**: "**You're set on:** seating · budget · timeline" alongside "**Needs you:** confirm the headcount." Derived entirely from existing readiness vs risk (56E) — **no engine.** Answers "what to stop worrying about," not just "what to do."

## Deliverable 6 — Trust Rendering System (the "because")
The readers already compute the inputs — surface them inline:
- "**24 plates** — because 12 guests × 2 each" (the capacity note already carries the derivation).
- "**about $180 for ice** — ~1.5 lb/guest × 120."
Rule: **every estimate/requirement shows its derivation on demand.** This is presentation of **already-computed inputs**, not new computation.

---

## Deliverable 7 — Runtime Impact Assessment
| Change | Logic touched? | Risk | Reversible |
|---|---|---|---|
| Real persona field (1 profile flag) | No (a stored preference) | Low | Yes |
| Spine VOICE (host entries) | **No** (55M seam, inert-by-default) | **Very low** (proven path) | Yes (`git revert` / empty entry) |
| `labelFor` + apply at hardcoded label sites | **No** (string substitution; default=identity) | Low–Med (touches ~12–20 JSX literals) | Yes |
| Confidence/Trust/Attention text | **No** (presentation strings) | Low | Yes |
**Untouched:** `_selectEventNextActionInner`, `getEventReadiness`, the cascade, playbooks, routing — all frozen. **AP-002 fence holds** (presentation never alters logic). The only non-trivial surface is the label-site edits (real, but pure strings, default-identity).

## Deliverable 8 — Expected Grade Improvements
| Dimension | Now | After activation |
|---|---|---|
| Audience Intelligence | **F** | **B** (host vs planner render; capped by the recordKind→real-signal fix) |
| Adaptive Language | **F** | **A−** (the term maps) |
| Cognitive Load | **D** | **B** |
| Confidence Rendering | **C** | **B+** (qualifier travels) |
| Trust Rendering | **B−** | **A−** (the "because") |
| Attention | **B** | **A−** (explicit positive) |
| **Overall UI Intelligence** | **C−/D+** | **B+ / A−** |
*Honest cap:* it does not touch taste, real-time presence, or emotional labor (56F human-only residuals); and the lift assumes the **real persona signal** lands — with recordKind alone, the target hosts stay on planner voice and Audience stays ~D.

---

## Deliverable 9 — Build Recommendation
**Sequence (smallest → highest-leverage; each presentation-only, reversible):**
- **EXECUTE — Phase 0: a real persona signal.** One profile field ("I'm planning my own event" / "I plan events professionally"), set at onboarding or settings; `personaFor(user)` reads it, falling back to `recordKind` then planner. **This is the unblock** — without it the activation mis-targets the exact first-time hosts (Finding 2). *(One stored field, no engine.)*
- **EXECUTE — Phase 1: author the host spine VOICE.** Exactly what the 55M seam was built for: inert-by-default, reversible, the proven path. **Shipping this is the functioning instance that promotes POS-P011 / P012 / P013 / P014 toward Canonical.**
- **TEST — Phase 2: the `labelFor` vocabulary layer** over the hardcoded labels/headers/badges (default = planner identity).
- **TEST — Phase 3: Confidence qualifiers + Trust "because" + Attention positive** (presentation text).
- **PARK:** deeper emotional rendering (dark `mindset` beyond reassurance); stage-aware disclosure.
- **KILL:** any persona *logic* fork (AP-002); changing engine/readiness/playbooks; a new presentation *engine* (this is a convention + the existing seam, burden unmet).

**Recommendation:** proceed **Phase 0 → Phase 1** as the first shippable activation (it is the highest-leverage, lowest-risk, doctrine-promoting move), then **TEST Phase 2–3**. **Do not ship without approval** (deliverable is design + this recommendation).

---

## Success criterion check
*"The same intelligence feels dramatically smarter because it is easier to understand."* — Achievable, and **almost entirely presentation**: the engine is untouched; the host reads "Where things stand / about $400 / you're set on seating / give your caterer a nudge" instead of "Planning Health / $500 / Capacity ESTIMATE / Vendor Risk." **But the gating prerequisite is the real persona signal** — without it, the seam renders the planner voice to the grandmother and the audit's F-grade persists.

*Confidence: High — traced to the seam's `OVERRIDE_FIELDS`, the hardcoded label sites, and the recordKind taxonomy (which puts host_driven/full_service → 'client'→planner voice). Weakest assumption: that a single self-declared persona field is a sufficient signal; it likely is for v1 (host vs pro is a question users can answer about themselves), but it should be validated against real behavior once the activation funnel (55N) has a cohort. No build performed; design + recommendation only.*
