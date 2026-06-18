# Sprint 57G — Capstone: Operator Mode spec · Presentation Intelligence architecture · Momentum + Decision-Confidence validation · Grades · Final Verdict

*Strategy + design. No build (Part 1 Confidence Grammar shipped separately, PR #50). Every conclusion traced to runtime. Date: 2026-06-17. Guiding principle: **One Engine · One Truth · Many Presentations** — never fork intelligence.*

---

# Part 3 — Operator Mode (authoring spec; reuse `audiencePersona` + `VOICE` + `labelFor`)
**Operator = the professional-but-non-industry coordinator** running an event as *part of a job*: executive assistant, HR coordinator, office manager, school administrator, nonprofit coordinator. They want **efficiency + accountability in generic business terms** — no hand-holding (that's host), no event-industry jargon (that's planner).

**Mechanism (no new architecture):** add `'operator'` to `AUDIENCE_VOICE` by remapping **`organization → operator`** (today it's `organization → planner`, which serves an exec assistant "COI / Run of Show" jargon she doesn't speak). Then author `VOICE[cat].operator` + an operator branch in `labelFor` + the operator column already shipped in `confidenceGrammar`. Pure authoring; the seam already keys by persona string.

| Dimension | Host | **Operator** | Planner |
|---|---|---|---|
| **Vocabulary** | "your day", "guests", "the food" | **"the event", "headcount", "catering"** | "the function", "covers", "F&B" |
| **Labels** | Where things stand · Seating & supplies | **Event status · Headcount & supplies** | Planning Health · Capacity |
| **Status language** | You're set · Not set yet · Needs you | **On track · Not started · Action needed** | Confirmed · No data · At risk |
| **Approval language** | "Send it for the OK." | **"Route for approval."** | "Send approval request." |
| **Success language** | "You're all set!" | **"Complete."** | "Confirmed." |
| **Decision language** | "Let's lock the headcount." | **"Confirm final headcount."** | "Confirm catering count." |
| **Risk language** | "Let's fix this together." | **"Needs resolution by \<date\>."** | "At risk — escalate." |

**What differs from Host:** operator is **terser, accountability-framed** (dates, owners, "route/confirm/resolve"), not reassurance-framed ("let's", "together", "you've got this"). No emotional softening.
**What differs from Planner:** operator is **generic-business**, not event-industry — "Event status / On track / Route for approval" vs "Planning Health / COI / Run of Show". An exec assistant manages *an* event a few times a year; she's competent but not a caterer.
**Complexity: LOW** — authoring + one `AUDIENCE_VOICE` remap. **Risk:** the remap changes `organization` events from planner→operator voice **when `pi.voice` is on** (OFF by default → no prod change). Build as Part 3 (next), gated by the existing flags.

---

# Part 4 — Presentation Intelligence System (architecture)
**Formalize Presentation Intelligence (PI) as a first-class layer** between the engine and the screen.

```
        ┌─────────────────────┐     ┌──────────────────────────┐     ┌──────────┐
        │  EVENT INTELLIGENCE  │ →   │ PRESENTATION INTELLIGENCE │ →   │  SURFACE │
        │  (one engine,        │     │  (persona projection)     │     │  (React) │
        │   one truth)         │     │                           │     │          │
        └─────────────────────┘     └──────────────────────────┘     └──────────┘
   CommandCenter engine,        renderAction/VOICE · labelFor ·     HealthRow, spine,
   deriveCommandCenterData,     presentationNav · positiveAttention  nav, cards …
   getEventReadiness,           · confidenceGrammar — each gated by
   playbooks                    pi.* flag, keyed by audiencePersona
```

**Responsibilities of PI:** choose the **words, labels, nav set, reassurance, and confidence rendering** appropriate to a persona — and *nothing else*. It is a pure projection over engine output.

**Boundaries (hard):**
- PI may rewrite **only presentation fields** — for the spine, exactly `title / consequence / primaryCta` (`OVERRIDE_FIELDS`); for health, the status **word + color**; for nav, the **shown set + label**; never `level · category · primaryRoute · readiness status · score · quantity`. **(AP-002 fence.)**
- PI reads engine output; the engine never reads PI. No cycles (libs import the engine's `getEventReadiness`/`audiencePersona`, never the reverse).
- One truth: a row that is `AT_RISK` is `AT_RISK` for everyone — only its *word* changes by persona. PI must never make host see "set" where planner sees "at risk."

**Runtime flow:** `audiencePersona(event)` (flag-free) → each `pi.*` flag decides active/identity → the persona string keys `VOICE` / `labelFor` / `hostNav` / `positiveAttention` / `confidenceFor` → the surface renders. **Every flag default-OFF ⇒ identity ⇒ byte-identical to production.**

**Governance:** one persona deriver (`audiencePersona`), one flag per layer (`pi.voice/labels/nav/attention/confidence`), one fence (AP-002). New PI layers must: (1) be a pure reader/projection, (2) gate behind a `pi.*` flag default-OFF, (3) key off `audiencePersona`, (4) prove engine 0-diff, (5) carry a unit test for flag-off identity.

**Patterns:** 011 (One Engine, Multiple Confidence Layers) · 014 (Confidence Grammar) · the producer-side seam · reveal-when-data · qualifier-leads-value.
**Anti-patterns:** AP-002 (presentation altering logic) · AP-005 (claiming safety/adequacy certainty) · forking intelligence into per-persona engines · letting a persona change *which* level a row resolves to.

**Persona coverage today:** Host (voice/labels/nav/attention/confidence — shipping behind flags) · Planner (identity + confidence words) · **Operator (vocabulary authored, persona not yet wired)** · **Vendor (future — their own reduced surface)** · **Guest (future — RSVP/portal voice)**.

---

# Part 6 — Momentum Reader validation → **TEST** (no build)
Inputs are real: `getReadinessHistory(id)` → `[{t:Date.now(), s:0–100}]`, forward-only, cap 30, written in `App.js` when `readinessScore(getEventReadiness(ev))` moves; already read by `ReadinessSparkline` (now a worded chip "↗ More ready"). **Effort S.**
**Why not EXECUTE:** the score is a **coarse lattice** (4 axes × {0,.5,1} → {0,25,50,75,100}); a least-squares slope over **session-clustered (not calendar) time** reads "stalled/declining" for a *deliberately paused* event and "rocketing" off a single vendor confirmation. The existing first→last chip already conveys direction more stably. **Verdict: TEST** — run slope vs. the chip on real session histories in `review-artifacts/` before shipping; guard `<3 points → unknown`; soften "stalled" → "quiet for a while." Do not ship a noisier signal than the one it replaces.

# Part 7 — Decision Confidence validation → **EXECUTE (scoped)** (no build this sprint)
The predicate **already exists**: `guestCountResolved()` (`eventSolve.mjs:119–132`) returns `{resolved, pending, reason}`; the caterer-drift banner (`VendorPlanningWorkspace.jsx:2369`) computes `catererCount !== confirmedYes`. Inputs (RSVP-Yes, `catererCount`, `daysToEvent`, dietary `needs`) all exist. **Effort M** (each named decision needs a bespoke predicate; no persisted runtime decision object). **Risk:** field-name drift (`guestCount`/`guestEstimate`/`guests.length`) → silent wrong answers; route every read through the existing resolvers. **Verdict: EXECUTE, scoped** to the three data-rich decisions — guest count, caterer reconciliation, dietary collection — turning "Confirm guest count" → **"You have enough — lock the guest count"** vs **"Still gathering — waiting on RSVPs."** Pairs naturally with Positive Attention's "you can stop worrying about this." Defer venue/food/entertainment (prereq state not persisted).

---

# Part 8 — Product grades (0–10; ruthless; traced to runtime)
| Dimension | Current | After 57G | After Venue Foundation | After Stakeholder + Outcome |
|---|--:|--:|--:|--:|
| **Presentation Intelligence** | 6 | **8** | 8 | 9 |
| **Trust Intelligence** | 4 | **7** | 7 | 8 |
| **Confidence Intelligence** | 3 | **7** | 8 | 8 |
| **Host Experience** | 6 | **8** | 8 | 9 |
| **Operator Experience** | 2 | **4** (vocab authored, not wired) | 5 | 6 |
| **Planner Experience** | 9 | 9 | 9 | 9 |
| **UI Intelligence** | 6 | **7** | 8 | 8 |
| **Momentum Intelligence** | 3 | 3 (TEST) | 4 | 5 |
| **Decision Confidence** | 3 | 3 (EXECUTE queued) | 6 | 7 |
| **Venue Intelligence** | 2 | 2 | **7** | 7 |
| **Stakeholder Intelligence** | 2 | 2 | 3 | **7** |
| **Outcome Intelligence** | 1 | 1 | 2 | **6** |
| **Knowledge Capture** | 3 | 3 | 4 | 6 |
| **Decision Memory** | 2 | 2 | 3 | 5 |
| **Distribution** | 2 | 2 | 3 | 4 |
| **Moat** | 3 | 3 | 5 | **7** |

*57G moves the **presentation/trust/confidence/host** cluster sharply (the bottleneck), barely touches **engine/data** dimensions (by design — expression, not expansion). The next two foundations (Venue, then Stakeholder+Outcome) are where the *intelligence/moat* numbers move.*

---

# Final Verdict (ruthless; traced to runtime)
1. **Biggest remaining trust gap → the Because layer.** Confidence Grammar (57G) now says *how sure*; the host still can't see *why* "24 plates" or "18 lbs ice." The factors are computed then discarded at the playbook compute sites (`playbookCapacity`/`playbookTasks` index.js) — 5 of 7 rationale types are COMPUTABLE with additive return fields. This is the single highest-value remaining presentation build.
2. **Biggest remaining presentation gap → value-level confidence.** Grammar fixed the *badge*; the *numbers* still render bare — "$500", "24 plates" — with no "About $400–600 / ~24". The estimator already computes ranges (`estimateTotalRange`); surface them.
3. **Biggest remaining operator gap → the operator persona isn't wired.** `organization → planner` still feeds an exec assistant event-industry jargon. Vocabulary is authored (Part 3); the `AUDIENCE_VOICE` remap + `VOICE.operator`/`labelFor.operator` wiring is unbuilt.
4. **Biggest remaining judgment gap → Decision Confidence un-surfaced.** `guestCountResolved` already knows "you have enough to lock the count," but the UI still says the flat "Confirm guest count." EXECUTE-ready.
5. **Biggest remaining UI gap → no progressive day-of/recovery modes.** The Overview is tuned for the planning middle; there's no "Day Of" collapse-to-essentials or "Recovery" (behind-schedule) re-rank. (Figma Screens 6–7 target this.)
6. **Biggest remaining intelligence gap → Venue Foundation.** Capacity/Reality-Check are playbook-templated, not venue-grounded; the engine assumes a generic space. This is the next *data* build — but **after** the presentation layer is complete, never before.
7. **Biggest remaining moat gap → Decision Memory.** Nothing captures *why* a host/planner chose a vendor/date/budget; without the rationale trail there's no compounding, defensible asset. The cheap seed is a `rationale` field on decisions.
8. **Biggest remaining distribution gap → no artifact a host shares.** Every surface is inward (command center). Nothing generates a guest-facing or vendor-facing artifact that pulls a new user in. Traction-gated, but it's the distribution zero.
9. **What to build next (in order): (a) Because layer** (Part 2 — COMPUTABLE, highest trust value), **(b) Operator wiring** (Part 3 — authored, cheap), **(c) Decision Confidence** (EXECUTE-scoped), **(d) value-level confidence** (ranges), **then (e) Venue Foundation** (the first *data* build). All a–d are expression over existing intelligence.
10. **What absolutely should NOT be built next → a new planning engine, Venue before the presentation layer is complete, Momentum (TEST-gated, noisy), or any per-persona forked intelligence.** The engine is planner-grade; forking it or expanding it now is the one move that destroys "One Engine, One Truth."

**The synthesis:** NGW's planning intelligence is no longer the bottleneck — *trust, judgment expression, and the operator's voice* are. 57G's Confidence Grammar removed the worst trust failure (one token, four meanings). Finish the presentation layer — **Because → Operator → Decision Confidence → value ranges** — before touching the engine or venue. The success condition is not a smarter planner; it is **planner-grade intelligence that feels effortless to a first-time host and fully respected by a professional** — and that is a presentation achievement, layer by layer, each shipped complete behind its flag.

*Confidence: High — grades and gaps traced to live code (`deriveCommandCenterData`, `getEventReadiness`, `playbookCapacity/Tasks/InfraPrompts`, `guestCountResolved`, `readinessHistory`, `AUDIENCE_VOICE`). Weakest assumption: grade deltas for unshipped layers (Because/Operator/Venue) assume clean execution of the specs above.*
