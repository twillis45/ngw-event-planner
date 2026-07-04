# HQ-3 — Platform Intelligence & Human Experience Audit

**Date:** 2026-07-04
**Role:** Chief Product Architect / Chief Experience Officer perspective
**Standard:** Runtime truth over implementation claims. Every finding tagged by evidence source. Runtime always wins over code/tests/reports when they disagree.

**Evidence key:** 🟢 Runtime Verified · 🔵 End-to-End Verified (full journey, browser) · 🟡 Code Inspection · ⚪ Static Architecture Analysis · 🧪 Test Coverage · ❓ Assumption (marked explicitly, never presented as fact)

This audit draws on four prior sprints in this codebase (IS-1: Event Identity wiring, IS-2: shell routing architecture, HQ-1: 13-surface Host audit, HQ-2: trust-fix implementation) — each of those findings is re-cited here with its original evidence tag, not re-asserted as new. New verification performed specifically for this audit is marked accordingly.

---

# SECTION 1 — Executive Summary

## Overall Platform Maturity
**Mid-stage, architecturally uneven.** The knowledge/research layer (admin-side) is the most mature subsystem in the platform — genuinely isolated, well-tested, and correctly walled off from the runtime it doesn't need to touch (🟢 confirmed this audit: `AdminConsole` mounts from a *separate React root in `index.js`*, not from anywhere inside `App.js`'s component tree — stronger isolation than "zero callers," it's a different mount point entirely). The Host experience is the least mature relative to its own ambitions: real intelligence exists (Event Identity, Risk, Decisions, Food sizing) but it's inconsistently wired, inconsistently rendered, and inconsistently trusted across screens that all claim to be part of one system.

## Biggest Strengths
1. **Nothing fabricates data anywhere in the Host runtime** (🟡 HQ-1, confirmed across all 13 surfaces). This is a genuine, rare discipline.
2. **Real cascades exist and work**: guest count → food quantities, menu decisions → tasks, headcount → budget (🟡 HQ-1, 🟢 partially re-verified this audit and in HQ-2's live checks).
3. **The Knowledge Factory is correctly frozen and isolated** — it is not leaking complexity into the Host shell, which is the single most important architectural discipline this platform has maintained (🟢 this audit).
4. **When HQ-1/HQ-2 fixes landed, they held.** Live-verified this audit: the Risk loop (Dismiss persists, 2→1, stays dismissed) and food-pricing consistency both still work correctly under fresh testing.

## Biggest Weaknesses
1. **Explainability is not a platform standard — it's one component's local decision.** Assemble Reveal has what/why/confidence/next-decision. Nothing else does, by default, anywhere (🟡 HQ-1).
2. **Three unreconciled persona/routing mechanisms coexist** (`accountTypeOf`, `audiencePersona`/`hostNavActive`, Sprint A's orphaned `resolvePersona`/`resolveShell`) — none aware of the others (⚪ IS-2).
3. **The professional/planner experience does not scale.** Runtime-verified this audit: a 3-client planner account renders "142 attention items" with no visible triage beyond a flat "View all" — this is the shape of a problem that gets categorically worse at 10 or 30 clients, not better.

## Biggest Architectural Risks
1. Sprint A's Event Identity/Persona/Shell trio is **half-wired** — Identity is live (one call site), Persona and Shell are fully orphaned. A future engineer could reasonably assume the trio works together because the tests do (⚪ IS-2, 🧪).
2. **Silent computation duplication is the platform's most repeated defect pattern** — the exact class of bug that caused the food-pricing drift (HQ-1/HQ-2) also exists, unfixed, in `isDayOf` (computed independently in `HostHome` and `RunOfShow`) and in `playbookFoodPlan()`'s 6+ redundant call sites even after HQ-2's consistency fix (🟡 HQ-1, unresolved).
3. **Reveal and Host Home still don't share state** — they agree today because they read the same raw fields, not because one hands off to the other (🟡 HQ-1, unresolved after HQ-2 — explicitly deferred).

## Biggest Trust Risks
1. Confidence is present on exactly one surface. A host who trusts Reveal's "We think so" language has no reason to expect Budget's estimates, Food's defaults, or Vendor suggestions to carry the same honesty — because they don't (🟡 HQ-1; 🟢 HQ-2 partially closed this for Risk only).
2. **Static, type-level risk copy is presented with the same visual weight as live, computed weather risk** — a host cannot tell which warning is about *their* event and which is generic to the event *type* (🟡 HQ-1).
3. Task completion can be silently inferred from a loose heuristic match with zero visible distinction from a host's actual confirmation (🟡 HQ-1; helper built in HQ-2, UI not wired — 🟡 still open).

## Biggest Continuity Failures
1. Assemble Reveal computes real understanding and **hands none of it forward.** Host Home re-derives identity using a *different function* than Reveal uses (🟡 HQ-1, confirmed in IS-1's original wiring investigation).
2. Decisions that don't concern food/guest-count dead-end into a generic `{tab:'Planning'}` route — the destination doesn't know why the host arrived (🟡 HQ-1).
3. Risk resolution was, until HQ-2, a complete dead-end (fixed for Risk only; not fixed for Tasks, Vendors, or Decisions' analogous "did this actually change anything" gaps).

## Top 10 Executive Priorities
1. Decide, explicitly, whether Sprint A's Persona/Shell trio is retired or completed — stop letting it sit half-wired (⚪ IS-2's frozen recommendation stands; revisit only with a real shell-count decision).
2. Extend the confidence/explainability contract HQ-2 proved works (on Risk) to the other six recommendation-bearing surfaces, one at a time, each live-verified.
3. Build the Reveal → Host Home handoff for real — stop relying on coincidental agreement between two independently-computed identity reads.
4. Fix `isDayOf` duplication before it becomes the next food-pricing-style drift bug.
5. Address planner-scale cognitive load (142 undifferentiated attention items) before onboarding more multi-client professional accounts.
6. Give non-menu Decisions a real destination instead of a generic tab fallback.
7. Wire the Tasks "Inferred" label into the UI (helper already exists, tested, unused).
8. Separate SAMPLE data visually/structurally from real client work in the planner dashboard — runtime-verified this audit that they currently commingle in the same "Upcoming Events" list.
9. Audit whether static (type-level) Risk copy should be visually distinguished from live (event-specific) Risk copy — right now they look identical in weight and confidence.
10. Do not start any new Knowledge Factory or Research Factory expansion until items 1–4 are resolved — the Host experience is the platform's proof point, and it is not yet coherent enough to support more intelligence being pointed at it.

---

# SECTION 2 — Platform Maturity by Subsystem

| Subsystem | Maturity | Why | Evidence | Confidence | Blocks World-Class |
|---|---|---|---|---|---|
| **Activation** (intake → first event) | High | Genuinely excellent — Step 2 preview cards prove understanding before the event even exists | 🟢 (HQ-1 live walkthrough, re-confirmed this session) | High | Nothing structural; this is close to a model for the rest of the app |
| **Onboarding** | Medium-High | `WelcomeOnboarding` asks account type explicitly rather than inferring — good; but inference (`accountTypeOf`) still silently overrides later if profile field unset | 🟡 (IS-2) | High | Edge case: real-client-detection heuristic can silently reclassify an account |
| **Host Experience** | Medium | Real intelligence exists per-surface; consistency and continuity across surfaces is the gap, not the intelligence itself | 🟡 (HQ-1), 🟢 (HQ-2 fixes verified) | High | Confidence/explainability standard not platform-wide; Reveal↔HostHome handoff missing |
| **Professional Experience** | Low-Medium | Renders correctly (🟢 verified this audit with 3 clients) but shows zero evidence of scaling gracefully — 142 flat attention items, sample/real data commingled | 🟢 (this audit, live) | Medium (only tested at 3 clients, not 10/30) | Triage/prioritization UI for attention items at scale; sample data isolation |
| **Event Identity** | Medium-High (engine) / Low (reach) | The engine (`resolveEventIdentity`) is well-built and, since IS-1, wired into exactly one call site (Assemble Reveal). Nowhere else in the app consumes it | 🟢 (IS-1 wiring + live verification), ⚪ (single call site confirmed via full-tree grep) | High | Reach, not quality — the engine itself is sound |
| **Human Intelligence** (why/who/relationships/memories) | Low | Present narrowly (must-have-moment, honoree fields) but not integrated with Event Identity's compound/complexity reasoning — two separate "identity" concepts that never merge | 🟡 (HQ-1: HostHome's `eventIdentity()` legacy reader vs. Reveal's `resolveEventIdentity()` are different functions entirely) | High | Real architectural merge needed, not a wiring fix |
| **Planning Intelligence** (Timeline/Budget/Food/Guests) | Medium | Real cascades work (guest count → food qty, decisions → tasks); explainability is inconsistent; one surface (Budget AI) was actively unsafe until HQ-2 | 🟡 (HQ-1), 🟢 (HQ-2 verified fix) | High | Confidence contract, not the underlying math |
| **Knowledge Factory** | High | Fully isolated (separate mount point, confirmed this audit), fully tested per its own sprint history, correctly never leaks into Host shell | 🟢 (this audit — mount-point isolation), 🟡 (prior architecture docs) | High | Nothing blocks it from being frozen as-is |
| **Research Factory** | Medium-High (assumed from architecture docs) | Not independently re-verified this audit beyond confirming its isolation; its own maturity is out of this audit's runtime-reachable scope since it's a separate app entry point | ❓ (Assumption — not runtime-verified this audit; prior sprints treated it as a black box on purpose) | Medium | Cannot assess without admin credentials; flagging as an audit gap, not a finding |
| **Recommendation Quality** | Uneven | Where authored data is rich (Food menu defaults, Decisions with `because` strings), quality is high. Where AI-generated on the fly (Budget) or heuristically inferred (Tasks), quality and trustworthiness both drop | 🟡 (HQ-1) | High | Standardize the confidence contract |
| **Explainability** | Low (platform-wide) / High (Reveal only) | The single clearest maturity gap in the platform: one component does this well, twelve don't | 🟡 (HQ-1), 🟢 (HQ-2 closed the gap for Risk only) | High | This is the platform's highest-leverage single fix |
| **Decision Support** | Medium | Menu/dietary/vendor decisions have real destinations and real downstream effects. Everything else falls back to a generic tab | 🟡 (HQ-1) | High | Decision-routing needs per-type destinations, not a catch-all |
| **Timeline Intelligence** | Medium | `effectiveRos` is a real, working single source of truth; heads-up nudges lack confidence and have weak next-decision (nav, not action) | 🟡 (HQ-1) | High | Extend confidence contract |
| **Budget Intelligence** | Medium (post-HQ-2) | The math is sound; the AI-suggestion trust gate is now fixed (🟢); two different "total" concepts shown in one tab remains a clarity gap | 🟡 (HQ-1), 🟢 (HQ-2 fix verified) | High | Visual distinction between totals; confidence on line-item estimates |
| **Vendor Intelligence** | Medium | COI logic is genuinely evidence-based (verified/expired/requested — real field state, not guesswork); category-suggestion reasoning not confirmed present | 🟡 (HQ-1) | Medium | Confirm and, if missing, add "why" to category suggestions |
| **Guest Intelligence** | High | Single source of truth (`guestCountResolved`/`attendanceBand`), correctly cascades everywhere it should | 🟡 (HQ-1), 🟢 (re-confirmed via HQ-2 flagship walkthrough — 85 guests consistent everywhere) | High | None significant |
| **Risk Intelligence** | Medium (post-HQ-2) | Weather risk is the single best-evidenced recommendation in the platform (live numeric data, concrete quantities). Static playbook risk is type-level only. The loop (Acknowledge/Dismiss/Mitigate) is now real and persists | 🟡 (HQ-1), 🟢 (HQ-2 — live-verified: dismiss went 2→1 and stayed) | High | Distinguish static vs. live risk visually; extend per-event evidence to static risks |
| **Execution** (Day Of) | Medium | Read-mostly, correctly derives from the same `effectiveRos`/task state as planning — but `isDayOf` is computed independently in two places, a structural drift risk | 🟡 (HQ-1) | Medium | Consolidate the duplicate date computation |
| **Testing** | High (unit) / Medium (end-to-end) | 131+ passing unit/integration tests across Sprint A, F4, IS-1, HQ-2 — but this entire audit exists because passing tests previously coexisted with completely broken runtime wiring (IS-1's founding discovery) | 🧪 (131 tests), 🟢 (repeated live-verification discipline since IS-1) | High | Keep doing live verification — do not regress to test-only confidence |
| **Frontend** | Medium-High | Component discipline is good (reused `ConfirmTrustDialog`, `CollapsibleCard`, `AccordionProvider` patterns); one file (`App.js`) carries enormous scope, which is itself a maintainability risk | 🟡 (observed throughout IS-1/IS-2/HQ-1/HQ-2) | High | Not urgent, but `App.js`'s size is a standing risk for exactly the kind of silent-duplication bugs this audit keeps finding |
| **Backend** | ❓ Assumption | Out of scope for this audit's runtime verification (browser-only); Supabase/API layers were not independently re-tested | ❓ | Low | Flagged as an audit gap |

---

# SECTION 3 — Canonical Architecture (Current, As-Built)

```
┌─────────────────────────────────────────────────────────────────────┐
│  index.js — TWO SEPARATE REACT ROOTS (🟢 confirmed this audit)      │
│                                                                       │
│  ┌─────────────────────────┐        ┌─────────────────────────────┐│
│  │   App.js (Host/Planner)  │        │  admin/AdminConsole.jsx      ││
│  │   — the runtime this      │        │  — Knowledge Factory,        ││
│  │     audit covers          │        │    Research Factory,         ││
│  │                            │        │    Mission Control,          ││
│  │                            │        │    ExperienceView            ││
│  │                            │        │  — env-flag gated, role-     ││
│  │                            │        │    enforced server-side,     ││
│  │                            │        │    genuinely isolated        ││
│  └─────────────────────────┘        └─────────────────────────────┘│
│           NO RUNTIME PATH CONNECTS THESE TWO TREES AT ALL            │
└─────────────────────────────────────────────────────────────────────┘

Inside App.js:

  Activation (NewEventModal — intake)
        │
        │ (writes: type, secondaryType, name, guestEstimate, honoree, theme...)
        ▼
  createEvent()
        │
        ├── accountTypeOf(profile, clients) — ROOT SHELL SWITCH (⚪ IS-2)
        │        │
        │        ├── 'host'    → HostHome
        │        └── 'planner' → MainDashboard → PipelineView / ClientDetail
        │                         (🟢 this audit: verified renders correctly
        │                          at 3 clients; "142 attention items" flat,
        │                          no visible triage)
        │
        ├── audiencePersona(event)/hostNavActive() — SECOND persona axis (⚪ IS-2)
        │        gates HostEventShell vs EventPlanner — flag-gated,
        │        default OFF, dormant in production today
        │
        └── resolveEventIdentity() [Sprint A] — ONLY called here (🟢 IS-1)
                    │
                    ▼
             buildAssembleRevealStages()
                    │
                    ▼
             <AssembleReveal/>  — ephemeral, writes NOTHING back to event
                    │
                    X  ← NO HANDOFF (🟡 HQ-1 — the continuity gap)
                    │
                    ▼
             <HostHome/> — independently re-derives identity via the
                           LEGACY eventIdentity() reader (different function),
                           independently re-derives guest count, food plan

  resolvePersona() / resolveShell() [Sprint A] — ZERO runtime callers anywhere
        (⚪ IS-2, confirmed via full src/ tree grep)

  Planning surfaces (Timeline/Budget/Guests/Food/Shopping/Vendors/Tasks/
  Decisions/Risks/Day Of) — each reads event state directly, mostly through
  a genuine single source of truth (guestCountResolved, effectiveRos,
  playbookFoodPlan) — 🟡 HQ-1 confirmed real cascades exist, not decorative

  intakeFamilyConfig(type).recordKind — LEGACY TAXONOMY — 11 call sites,
  all governing vocabulary/tab-visibility WITHIN whichever shell the
  account gate already picked — NEVER the shell switch itself (⚪ IS-2)
```

## Duplicated Reasoning (confirmed)
- **Event identity**, computed twice by two different functions (`eventIdentity()` legacy vs. `resolveEventIdentity()` Sprint A) for two different surfaces that never compare notes.
- **`isDayOf`**, computed independently in `HostHome` and `RunOfShow` (🟡 HQ-1).
- **`playbookFoodPlan()`**, called 9+ times per render pass across the app; HQ-2 fixed the *inconsistency* between calls but not the *redundancy* of calling it repeatedly (🟢 HQ-2 fix verified; redundancy itself explicitly not addressed).

## Disconnected Engines (confirmed)
- `resolvePersona()` — zero runtime callers (⚪ IS-2).
- `resolveShell()` — zero runtime callers (⚪ IS-2).
- Sprint A's Persona/Shell vocabulary (host/planner/coordinator/corporate/venue/vendor) has **no matching runtime UI for 4 of its 6 values** — the platform only actually has Host and Planner shells (⚪ IS-2).

---

# SECTION 4 — What Is Stable (Recommend Freezing)

| Component | Freeze? | Why |
|---|---|---|
| **Knowledge Factory** (Mission Control, Workers, Campaigns) | **YES** | Genuinely, architecturally isolated at the React-root level (🟢 this audit) — not just "unwired," physically separate. This is the correct end state, not a gap. |
| **Research Blueprint / Research Factory** | **YES** (with an asterisk) | Same isolation applies. Its internal maturity was not independently re-verified this audit (❓ assumption) — freeze the *boundary*, not necessarily every internal detail without a dedicated admin-side audit. |
| **ExperienceView** | **YES** | Same reasoning — admin-only, correctly walled off. |
| **Event Identity Engine** (`resolveEventIdentity`) | **YES**, as an engine | The engine itself is sound, tested, and live-verified (🟢 IS-1). Freeze its internals; the open work is *reach* (get more surfaces to consume it), not *rewrite*. |
| **Assemble Reveal orchestration** (`buildAssembleRevealStages` tier structure) | **YES** | The four-tier design (Identity → Blockers → Domains → Risk) is sound and correctly extensible — HQ-2 proved you can add a real confidence/loop contract to a tier (Risk) without restructuring the orchestrator. Freeze the *shape*; keep extending *content*. |
| **Account-based shell routing** (`accountTypeOf`) | **YES** (per IS-2's explicit decision) | Simple, correct for the vast majority of scenarios, and the only routing mechanism actually load-bearing today. Do not attempt to replace it with Sprint A's Shell resolver until the shell-count mismatch is resolved. |
| **Worker architecture** (Knowledge Factory internals) | **YES** (by extension of Knowledge Factory freeze) | Not independently re-audited this session; frozen by association with its correctly-isolated parent system. |

**What should NOT be frozen:** the legacy `eventIdentity()` reader vs. Sprint A's `resolveEventIdentity()` — these two need an architectural decision (merge, or clearly separate their purposes with documentation) before either can be called stable, because right now they silently coexist doing overlapping jobs.

---

# SECTION 5 — Human Intelligence Audit (Per Surface)

| Surface | Understands WHY | Understands WHO | Relationships | Milestones | Traditions | Protects Memories | Reduces Stress | Meaningful Decisions | Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Editorial Cover** | Partial (honoree eyebrow) | Yes (honoree) | No | No | No | No | Yes (calm entry) | No | Presentational, warm, but operational |
| **Assemble Reveal** | Yes (Identity stage explains recognition) | Partial (participant groups: family/military-colleagues) | Partial (ceremony vs. celebration framing) | Yes (compound detection: "two milestones, one event") | No | No | Yes (proof of work reduces anxiety) | Yes (blockers frame real decisions) | **The most human-intelligent surface in the platform** |
| **Host Home** | Partial (legacy `eventIdentity()` "heart"/must-have-moment) | Partial | No | No | No | Partial (must-have moment is memory-adjacent) | Yes (head-start framing) | Yes (next-step framing) | Operational with a genuine human layer bolted on, not integrated |
| **Timeline** | No | No | No | No | No | No | Partial (calm framing) | No | Operational |
| **Budget** | No | No | No | No | No | No | No | Weak (pre-HQ-2 actively reduced trust; now neutral) | Operational |
| **Guests** | No | Yes (names, RSVP) | Partial (roster) | No | No | No | Yes (single-source clarity) | No | Operational with light human data |
| **Food** | Partial (`why` on menu defaults, when authored) | No | No | No | Partial (cultural playbooks exist — e.g. Juneteenth Cookout, per HQ-1's cross-reference to `lib/playbooks/data/`) | No | Yes (sizing removes guesswork) | Yes (real choice UI) | Operational with real domain expertise |
| **Shopping** | No | No | No | No | No | No | Yes | No | Operational |
| **Vendors** | Partial (COI reasoning is evidence-based) | No | No | No | No | No | Yes | Partial | Operational |
| **Tasks** | No | No | No | No | No | No | Partial (silently, sometimes wrongly) | No | Purely operational, and occasionally silently wrong |
| **Risks** | Yes (static: type-level; live: event-specific for weather) | No | No | No | No | No | Yes (now closeable, post-HQ-2) | Partial | Operational, uneven evidence quality |
| **Decisions** | Yes (`because` strings are real reasoning) | Partial | No | No | No | No | Yes | Yes (for menu-type; generic for others) | The second-most human-intelligent surface |
| **Day Of** | No | No | No | No | No | No | Yes (calm, focused) | No | Purely operational |

## Verdict on Section 5
**The platform behaves like software with two islands of genuine human intelligence** (Assemble Reveal, Decisions) **surrounded by competent but purely operational tooling.** It does not yet behave like an experienced planner across the board — an experienced planner would carry the "why this matters" thread from Reveal into every subsequent screen, and today that thread visibly snaps the moment Reveal closes.

---

# SECTION 6 — Human Intelligence Continuity

**Does understanding survive from intake through Day Of? No — it survives exactly as far as Assemble Reveal, then breaks.**

| Element | Captured Where | Survives To | Breaks At | Evidence |
|---|---|---|---|---|
| Event Identity (compound/complexity) | `resolveEventIdentity()` in Reveal | Nowhere else | Immediately after Reveal closes | 🟡 HQ-1 / 🟢 IS-1 |
| Emotional context (must-have moment, feeling words) | Legacy `eventIdentity()` reader, captured at various points | Host Home's "heart" card | Not read by Reveal, Timeline, Budget, or Day Of at all | 🟡 HQ-1 |
| Relationship context (honoree, participants) | Intake fields + Reveal's participant detection | Editorial Cover (honoree only) | Not carried into Guests, Vendors, or Day Of as a first-class concept | 🟡 HQ-1 |
| Decision rationale (`because` strings) | Decisions panel | The Decisions panel itself only | Not surfaced in Timeline/Budget/Vendors even when the decision affects them | 🟡 HQ-1 |
| Special traditions/cultural context | Playbook data (e.g., Juneteenth, Ethiopian Coffee Ceremony playbooks) | The Food/Planning surfaces that read that playbook | Not referenced by Reveal's Identity stage or Risk stage | ❓ (playbook existence confirmed 🟡 HQ-1's cross-session context; full trace not re-verified this audit) |
| Milestones (compound detection) | Reveal's Identity stage | Nowhere | Same break point as Event Identity above | 🟢 IS-1 |
| Host priorities (must-have moment) | Legacy reader | Host Home only | Not read by Decisions, Risk, or Timeline to prioritize accordingly | 🟡 HQ-1 |

**Where continuity breaks, precisely:** at the boundary between `AssembleReveal` (ephemeral, write-nothing) and `HostHome` (reads different, older functions). This is not a chain of many small breaks — it is **one specific architectural seam** that severs almost everything Section 5 found valuable in Reveal from reaching any other surface.

---

# SECTION 7 — Trust Audit (Every Recommendation Type)

| Recommendation | Info Existed | Engines Participated | Evidence | Host Understands Why | Confidence Exposed | Expert Would Agree | First-Time Host Would Trust | Planner Would Trust |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|
| Reveal — Identity | Type, name, secondaryType | `resolveEventIdentity` | Free-text parse | Yes | Yes | Yes | Yes | Yes |
| Reveal — Blockers | Event fields (venue, guest count, dress code) | `deriveDecisionBlockers` | Direct field checks | Yes | Yes ("Required") | Yes | Yes | Yes |
| Reveal — Domains (Timeline/Food/etc.) | Playbook + event state | `buildDomainStage` | Playbook authored data | Partial (why present, no next-decision) | Yes ("Assembled") | Yes | Yes | Partial |
| Budget AI suggestion (pre-HQ-2) | Event type, guest count | `askNGW`/LLM | Prompt inputs, never shown | No | No | **No — an expert would flag the auto-write as unsafe** | **No — a first-time host wouldn't know AI wrote it** | **No** |
| Budget AI suggestion (post-HQ-2) | Same | Same | Same, now shown in review dialog | Partial (label says "We think so," reasoning still generic) | Yes ("We think so") | Yes, now that it's gated | Yes, now that it's reviewable | Yes |
| Food menu defaults | Authored playbook data | `playbookFoodPlan` | `d.why` field | Yes (when authored) | No | Yes | Yes | Yes |
| Static Risk rows | Event type only | `playbookRisks` | Type-authored, not per-event | Yes (mitigation labeled "The fix:") | Yes, post-HQ-2 ("We think so") | Partial (an expert would want to know these are generic-to-type) | Yes, now correctly framed as "we think so" not certainty | Yes |
| Weather Risk | Live coordinates + date | `getEventWeatherRisk`/`weatherLogistics` | Real numeric data | Yes | No (should be "High confidence" — has the strongest evidence in the platform and doesn't say so) | Yes | Yes | Yes |
| Vendor COI next-action | Vendor's actual COI field state | `getVendorCOIState`/`coiNextAction` | Real field state | Yes | No | Yes | Yes | Yes |
| Tasks (`taskSatisfied`) | Loose regex match against event fields | `taskSatisfied` | Invisible to host | **No** | **No** | **No — an expert would flag silent false-completion risk** | No (doesn't know it happened) | No |
| Decisions (menu-type) | Real event state | `playbookDecisionBoard` | `because` strings | Yes | Partial (status tier substitutes) | Yes | Yes | Yes |
| Decisions (non-menu) | Real event state | Same engine, generic fallback | Weak | Partial | Partial | Partial | Partial | Partial |

**Pattern:** trust correlates almost perfectly with whether a recommendation shows its reasoning. Every recommendation that shows `why` earns "yes" across expert/first-time/planner trust columns. Every one that doesn't (pre-HQ-2 Budget AI, Tasks) earns "no" across the board. **This is not a subjective judgment — it's a mechanical pattern in this table.** The fix is not more intelligence; it's making the intelligence that already exists show its work everywhere, the way it already does in two places.

---

# SECTION 8 — Event Intelligence Audit

| Capability | Intelligent or Procedural? | Evidence |
|---|---|---|
| Event Identity | Intelligent | Free-text parsing genuinely detects compound events, ceremony components, participant groups (🟢 IS-1 flagship verification: "A birthday + retirement + military-retirement. Two milestones, one event.") |
| Complexity classification | Intelligent | Real tiering (simple/standard/compound/multi-day/enterprise) with defensible rules, not a lookup table (🟡 Sprint A design, 🟢 IS-1 verification) |
| Compound Events | Intelligent, narrowly | Works when the signal reaches the engine (name field, post-IS-1 word-stripping fix) — but the *only* live input path is a name field a host might not fill in compound-aware language; the structured `secondaryType` picker is a second, disconnected path (⚪ IS-2 finding: two parallel, unreconciled compound-detection mechanisms) |
| Timeline | Procedural | `effectiveRos` is a real single source of truth but does not itself reason about sequencing tradeoffs — it derives a schedule, it doesn't negotiate one (🟡 HQ-1) |
| Budget | Procedural (math) + one Intelligent moment (AI suggestion, now gated) | The category math is derived correctly; the one "intelligent" moment (AI suggestion) was unsafe until HQ-2, now safe but still generic in its reasoning |
| Food | Intelligent | Real sizing math tied to guest count, dietary choices, sourcing tier — genuinely responsive, not static (🟡 HQ-1 traced the full cascade) |
| Shopping | Procedural | Pure derived view of Food's plan — correctly so, not a defect |
| Guests | Intelligent (as infrastructure) | `guestCountResolved`/`attendanceBand` is a genuinely well-designed single source of truth that everything else correctly depends on |
| Risks | Mixed | Weather: intelligent (live data). Static playbook risks: procedural (lookup table dressed as insight) |
| Vendors | Intelligent (COI) / Procedural (categories) | COI reasoning responds to real field state; category suggestions are more template-driven |
| Decision sequencing | Procedural | `dependsOn`/`when` offsets are rule-based, not adaptive to what the host has actually prioritized |
| Execution readiness (Day Of) | Procedural | Correctly derives from existing state; doesn't add new reasoning of its own |

**Verdict:** the platform has real intelligence concentrated in three places — Event Identity, Food sizing, and Guest resolution — and procedural competence everywhere else. That's a legitimate starting shape for a platform; the risk is that everything is *styled* to look equally intelligent (same card layouts, same confident tone) regardless of which category it's actually in.

---

# SECTION 9 — Experience Continuity (Complete Journeys)

## Host Journeys

**Birthday** — 🟢 Live-verified (IS-1, HQ-2). Reveal fires, Identity correct, no compound false-positive, guest count consistent, Host Home matches. Trust holds throughout.

**Retirement** — 🟢 Live-verified (IS-1). Same as Birthday, plus IS-1's own name-echo bug fix confirmed holding (no false "retirement + retirement" self-detection).

**Birthday + Retirement (flagship, incl. Military)** — 🟢 Live-verified (IS-1, re-verified this session in HQ-2). Full compound detection, ceremony/dress-code/venue blockers, risk stage, guest count (85) consistent from Reveal through Budget through Guests. **This is the platform's best-executed journey.** Trust increases at Reveal (proof of understanding), holds through planning surfaces, no drops observed.

**Family Reunion** — 🟢 Live-verified (IS-1). Same pattern as Birthday.

**Wedding** — ⚪ Not live-verified this session; per IS-2's taxonomy trace, `Wedding` carries a `full_service` taxonomy label that historically implied "planner-only," but the account gate routes it identically to Birthday for a host account. ❓ Assumption: likely behaves like Birthday/Retirement at the Reveal/HostHome level since none of the routing or Reveal logic branches on this specific type; not independently confirmed this audit.

**Corporate Event** — ⚪ Not live-verified this session. IS-2 flagged a real, confirmed gap here: a host account can create a "Conference"/"Team Retreat" (taxonomy: `corporate`) and still receive the Host shell + Assemble Reveal, since the account gate never consults taxonomy. This is a genuine continuity *inconsistency* (a corporate-labeled event getting host-flavored treatment), not re-tested live this session but confirmed via code trace in IS-2.

## Professional Journeys

**Single client** — ❓ Not independently tested this session with exactly one client (only 0 and 3 were tested). Reasonably assumed to render `MainDashboard`/`PipelineView` correctly given 3-client verification held.

**10 clients** — ❓ Assumption, not tested. Given 3 clients already produced "142 attention items" with a flat "View all," extrapolate that 10 clients likely produces a proportionally larger, still-undifferentiated list. This is a real audit gap, not a confirmed finding — flagged honestly rather than asserted.

**30 clients** — ❓ Same caveat, stronger concern. If the attention-item count scales anywhere near linearly, 30 clients could produce 1,000+ items in a single flat list. **This is the single largest unverified risk in the entire audit** — recommend it be the first thing tested before any professional-tier expansion work begins.

## Where Trust Increases
- Every Reveal moment (all Host scenarios tested).
- Guest count consistency across every surface it touches.
- Vendor COI reasoning (real field state, not guesswork).

## Where Trust Drops
- The moment Reveal closes and Host Home re-derives everything independently (invisible to the host, but architecturally real).
- Budget, pre-HQ-2 (now fixed).
- Any non-menu Decision (generic destination).
- 🟢 This audit: the planner dashboard at 3+ clients, where "142 attention items" with no visible prioritization is the kind of number that erodes confidence in the system's judgment, not just its UI.

## Where Intelligence Disappears
- Between Reveal and every subsequent screen (Section 6's core finding, repeated here because it's the single most consequential continuity failure in the platform).
- Between a Decision's reasoning (`because` string) and the Timeline/Budget/Vendor surfaces that decision should inform.

---

# SECTION 10 — Knowledge Factory Audit

**Scope caveat:** this audit is scoped to the runtime-reachable Host/Planner application. The Knowledge Factory lives in a genuinely separate React root (`admin/AdminConsole.jsx`, 🟢 confirmed this audit) gated by environment flag and server-enforced role. I did not have admin credentials to exercise it live this session. Everything below is ⚪ Static Architecture Analysis / ❓ Assumption carried from prior architecture documentation referenced in this project's history, **not independently runtime-verified this audit** — flagged exactly as the audit standard requires.

| Component | Status (per architecture, not re-verified live) |
|---|---|
| Mission Control | ❓ Assumed functional per its own prior test suite (`kmp1.test.js` referenced in IS-2's tracing) |
| Workers | ❓ Assumed functional |
| Campaigns (`campaignRunner.js`) | ❓ Assumed functional, imports `researchBlueprint`, `evidencePipeline` per IS-2's static trace |
| Research Session | ❓ Not traced this audit |
| Evidence (`evidencePipeline.js`) | ❓ Confirmed to exist (IS-2 static trace), not exercised |
| Blueprint (`researchBlueprint.js`) | ❓ Confirmed to exist, has its own test file (`researchBlueprint.test.js`), not re-run this audit |
| Findings | ❓ Not traced this audit |
| KCR | ❓ Referenced in project memory/prior sprint context, not independently verified this audit |
| Publication | ❓ Not traced this audit |

**Is the continuous learning loop complete?** Cannot be determined from this audit's runtime-verified evidence. **This is an honest gap, not a finding of completeness or incompleteness.** Recommend a dedicated admin-side audit, with the same runtime-verification discipline applied here to the Host side, before treating the Knowledge Factory's maturity claims (from prior sprint reports) as confirmed.

**What IS confirmed (🟢 this audit):** the Knowledge Factory's *isolation* from the Host runtime is real and correctly architected, regardless of its internal maturity. That boundary is sound even if its interior is unverified.

---

# SECTION 11 — Canonical Intelligence Ownership

| Intelligence Type | Current Owner(s) | Duplicate? | Orphaned? | Conflicting? | Recommended Canonical Owner |
|---|---|---|---|---|---|
| Event reasoning (what IS this event) | `resolveEventIdentity()` (Reveal only) + legacy `eventIdentity()` (Host Home, "heart" card) | **Yes — two functions, two purposes, never reconciled** | No (both have callers) | Partially (different vocabularies for "identity") | `resolveEventIdentity()` should own *classification* (type/compound/complexity); legacy reader should be explicitly scoped to *meaning* (must-have moment/feeling) — document them as complementary, not competing, and make Host Home consume Reveal's classification output too |
| Timeline reasoning | `effectiveRos()` | No | No | No | Keep as-is — genuinely single-sourced |
| Budget reasoning | `Budget` component's inline math + `suggestBudget()`'s AI call | No | No | No (post-HQ-2 gating) | Keep as-is; the gating fix was the correct minimal intervention |
| Vendor reasoning | `vendorIntelligence.js` (COI) + `vendorCategoriesByType.js` (categories) | No — two distinct concerns, correctly separate | No | No | Keep as-is |
| Risk reasoning | `playbookRisks()` (static) + `weather.js` (live) | No — legitimately two different risk classes | No | **Yes, presentationally** — both render with identical visual weight and now-identical confidence language ("We think so"), despite one being far better evidenced than the other | Recommend the weather engine's output use a higher-confidence label ("High confidence" — it has the vocabulary available and the evidence to earn it) so hosts can tell the two apart |
| Human reasoning (why this matters) | Legacy `eventIdentity()` reader only | No | Effectively yes — captured but not consumed outside Host Home | No | Should feed INTO `resolveEventIdentity()`'s reasoning, not sit beside it unconsumed |
| Relationship reasoning | Reveal's participant-group detection + intake's honoree field | Partial duplication (two separate signals never merged) | No | No | Merge into one participant/relationship model that both Reveal and Editorial Cover read |
| Memory reasoning | Legacy `eventIdentity()`'s must-have-moment | No | Effectively yes (Host Home only) | No | Should be a first-class Event Identity field, not a bolt-on |
| Explainability | Assemble Reveal's card contract (`what`/`why`/`confidenceLabel`/`nextDecision`) | No | **Yes — the contract exists and is unused everywhere except Reveal and (post-HQ-2) Risk** | No | This contract should be the platform standard — every recommendation-bearing surface should emit this shape, even before it's rendered everywhere |
| Persona/Shell resolution | THREE mechanisms: `accountTypeOf`, `audiencePersona`/`hostNavActive`, Sprint A's orphaned `resolvePersona`/`resolveShell` | **Yes — three, not two, unreconciled (⚪ IS-2)** | Two of the three are fully orphaned | Not yet, because two are inert (flag-off / never-called) — but latent conflict risk if either were ever turned on without reconciling with `accountTypeOf` | `accountTypeOf` remains canonical per IS-2's frozen decision; the other two should be formally retired or given an explicit, narrow, non-overlapping charter |

---

# SECTION 12 — Technical Debt

| Item | Classification | Reasoning |
|---|---|---|
| `resolvePersona()` (Sprint A) | **PARK** | Fully tested, zero callers, no shell vocabulary to route into yet — not dead, not ready (⚪ IS-2's own recommendation, reaffirmed) |
| `resolveShell()` (Sprint A) | **PARK** | Same reasoning — vocabulary mismatch with actual runtime shells is a real blocker, not a wiring gap |
| Legacy `eventIdentity()` reader vs. Sprint A `resolveEventIdentity()` | **MERGE** (architecturally, not literally) | Both are legitimate and both have callers — the debt is that they've never been reconciled into one Event Identity concept. Recommend a scoped design decision, not a code deletion |
| `intakeFamilyConfig`/taxonomy 11 call sites | **KEEP, monitor** | Confirmed to be a live pass-through to the canonical `eventTaxonomy.mjs` (⚪ IS-2's deeper trace), not orphaned legacy — doing real vocabulary/tab-visibility work. Not debt; a working system. |
| 3 duplicate closures (`clientIsHostRec`/`eventIsHostFam`/`isHostClient`, App.js ~23909/23910/24737) | **MERGE** | Identical logic, three names — low-risk, low-priority consolidation (⚪ IS-2) |
| `isDayOf` computed independently (HostHome vs. RunOfShow) | **MERGE** | Same architecture class as the food-pricing bug — fix before it manifests the same way (🟡 HQ-1, still open) |
| `playbookFoodPlan()` called 9+ times per render pass | **REWRITE** (memoize once, thread down) | HQ-2 fixed the *drift*, not the *redundancy* — a real performance/maintainability debt item, medium-sized |
| Budget's two "total" concepts (`totalBudgeted` vs `projectedFinal`) shown without visual distinction | **REWRITE** (small — copy/layout, not logic) | Premature complexity flagged in HQ-1, unresolved |
| `HostEventShell`/`hostShellOn()` flag (default OFF) | **PARK** | Fully built, never live in production, no evidence it's been tested against current `EventPlanner` parity — flagged by IS-2's deeper trace this session, not previously known |
| Instacart "one-tap cart coming soon" stub | **KEEP (as an honest stub)** | This is the one dead-end in the platform that labels itself as such — a model for how other gaps should be handled, not something to delete |
| Tasks "Inferred" — helper built, UI unwired | **EXECUTE** (small follow-up) | Low-risk, clearly scoped, already tested — the cheapest remaining HQ-2 item to finish |

---

# SECTION 13 — Strategic Risks (Top 25, Categorized)

### Architecture
1. Sprint A's Persona/Shell trio half-wired, easy for a future engineer to assume complete because tests pass (⚪).
2. `App.js`'s size is itself a risk factor for more silent-duplication bugs (🟡, observed pattern).
3. Two React roots (Host/Planner vs. Admin) — correct today, but any future feature that needs to bridge them will require deliberate design, not an easy shortcut (⚪).
4. `hostShellOn()`'s dormant `HostEventShell` — untested-in-production code sitting behind a flag with unknown current parity to `EventPlanner` (🟡, new this audit).

### Knowledge
5. Knowledge Factory's actual maturity is unverified by this audit — a real gap in institutional knowledge about its own state (❓).
6. No cross-check exists between Knowledge Factory outputs and Host-side playbook content, as far as this audit could determine (❓).

### Research
7. Research Factory's continuous-learning-loop completeness is unconfirmed (❓, Section 10).

### Human Intelligence
8. Event Identity and "meaning" (must-have moment) are two disconnected concepts that should be one (🟡).
9. Relationship/participant reasoning exists in two unmerged forms (🟡).
10. Memory/tradition reasoning is captured but not propagated to Reveal, Risk, or Decisions (🟡).

### Planning
11. Non-menu Decisions dead-end into a generic tab (🟡).
12. Static Risk copy visually indistinguishable from live, better-evidenced Risk copy (🟡).
13. Task false-completion via loose heuristic matching, invisible to the host (🟡).
14. `isDayOf` duplication — latent drift risk (🟡).

### Trust
15. Confidence contract exists in exactly one place by default (🟡, one place closed by HQ-2 = two).
16. Budget's two-totals clarity gap (🟡).
17. Weather risk's strong evidence is underlabeled relative to its actual quality (🟡, this audit's Section 11 finding).

### Continuity
18. Reveal → Host Home handoff doesn't exist; agreement is coincidental (🟡, HQ-1, confirmed unresolved).
19. Decision rationale doesn't reach the surfaces it should inform (🟡).
20. Legacy vs. Sprint A Event Identity readers never reconciled (⚪).

### Activation
21. None significant found — this is the platform's strongest subsystem (🟢).

### Professional Expansion
22. **Unverified scaling behavior at 10/30 clients — the single largest unverified risk in this audit** (❓, Section 9).
23. Flat, undifferentiated attention-item list even at 3 clients (🟢, this audit).
24. Sample data commingled with real client events in the planner's "Upcoming Events" view (🟢, this audit — observed "SAMPLE" tags interleaved with what should be real work).
25. Taxonomy's `full_service`/`corporate` labels imply planner-only handling that the account gate doesn't actually enforce — a labeling/behavior mismatch that could confuse whoever maintains the taxonomy next (⚪, IS-2).

---

# SECTION 14 — Roadmap Reset

| Initiative | Classification | Why |
|---|---|---|
| Reconcile legacy `eventIdentity()` and `resolveEventIdentity()` into one Event Identity concept | **EXECUTE** | Highest-leverage continuity fix in the platform; unblocks Section 6's core finding |
| Build the Reveal → Host Home handoff | **EXECUTE** | Second-highest-leverage continuity fix; do after the above, since it depends on knowing which Identity function is canonical |
| Extend the confidence/explainability contract to Budget/Food/Timeline/Shopping/Vendor/Decisions | **EXECUTE**, one surface at a time | HQ-2 proved the pattern works on Risk; repeat, don't redesign |
| Wire Tasks "Inferred" label into `TaskRow` | **EXECUTE** | Cheapest remaining item, already scoped, already tested at the helper level |
| Fix `isDayOf` duplication | **EXECUTE** | Prevents the next food-pricing-style bug before it happens |
| Give non-menu Decisions real destinations | **EXECUTE** | Directly closes a confirmed continuity gap |
| Test professional experience at 10 and 30 clients | **TEST** | This audit could not verify it — do this before any professional-tier feature work |
| Audit Knowledge Factory / Research Factory internal maturity | **RESEARCH** | Genuine audit gap this session; needs admin access and the same runtime-verification discipline applied here |
| Freeze Sprint A's `resolvePersona()`/`resolveShell()` | **FREEZE** (formalize IS-2's PARK as an explicit freeze) | Until a real decision is made to build missing shells or narrow the vocabulary |
| `hostShellOn()`/`HostEventShell` | **PARK**, investigate before any further work | Newly-discovered this audit; unknown current parity with `EventPlanner`; don't turn the flag on without a dedicated audit |
| Any new compound-event detection mechanism | **DELETE the idea, don't build a third one** | Two already exist (free-text parsing, structured `secondaryType`) and are unreconciled — reconcile the two before considering a third |
| Any new Knowledge Factory expansion | **PARK** | Per Section 1's priority #10 — the Host experience isn't coherent enough yet to be the proof point for more intelligence pointed at it |
| Visual distinction between static and live Risk confidence | **EXECUTE** (small) | Directly closes a Section 11 finding, cheap to do |
| Separate sample data from real client events in planner dashboard | **EXECUTE** (small-medium) | Confirmed live this audit; a real trust/clarity issue for professional accounts |

**Architecture before features, explicitly applied:** every EXECUTE item above is a consolidation, a wiring fix, or a consistency fix — none of them add a new capability the platform doesn't already have somewhere. That is intentional and matches this audit's mandate.

---

# SECTION 15 — Executive Verdict

**1. Is the platform architecturally coherent?**
Not yet, but it is closer than a first look suggests. The incoherence is concentrated in a small number of specific, nameable seams (the two Event Identity readers, the three persona mechanisms, the Reveal→HostHome gap) rather than being spread evenly across the whole system. That's actually good news — it means coherence is achievable through consolidation, not a rewrite.

**2. Does it consistently behave like a trusted event expert?**
In two places, yes, convincingly (Assemble Reveal, Decisions). Everywhere else, it behaves like well-built software that happens to sit next to those two places. A trusted expert doesn't stop reasoning about your event the moment you leave the first room they greet you in — and today, this platform does.

**3. Does Human Intelligence survive from intake through execution?**
No. It survives from intake through the end of Assemble Reveal, and then stops. This is the single most important finding in this audit, and it has a single, nameable architectural cause: Reveal computes and discards; Host Home independently re-derives with different tools.

**4. Where does intelligence become generic?**
The instant a Decision isn't about food or guest count. The instant a Risk is static rather than live. The instant a task's completion is inferred rather than confirmed. In each case, the underlying data exists — the platform just stops explaining itself at exactly the point where a host would most need it to.

**5. What prevents a first-time host from saying "This app truly understands my event"?**
The Reveal moment already earns exactly that reaction, live-verified, repeatedly, across five scenarios. What prevents the *feeling from lasting* is that nothing after Reveal refers back to what it just established. A host who was told "we recognized your compound event" one screen ago has no reason to believe the Budget tab, three taps later, remembers that at all — because it doesn't.

**6. What prevents a professional from trusting it with their business?**
Not the intelligence — the scale behavior. A planner with real client volume needs triage, not a flat count of 142 items. This audit could not confirm whether that gets better or worse at 10–30 clients, and that uncertainty, on its own, is a reason for a professional to hesitate before depending on this platform for their whole book of business.

**7. What three initiatives create the biggest leap toward a world-class Event Intelligence Platform?**
1. **Reconcile the two Event Identity readers into one, and build a real Reveal → Host Home handoff.** This single architectural fix directly repairs the platform's most consequential continuity failure and would make the "this app understands my event" feeling durable instead of momentary.
2. **Extend Assemble Reveal's explainability contract to the other six recommendation-bearing surfaces**, exactly the way HQ-2 proved works for Risk — one surface at a time, live-verified each time. This is not a new capability; it's making an existing, working standard universal.
3. **Verify and, if needed, fix the professional experience at real client scale (10–30 clients)** before any further professional-tier investment — an unverified risk of this size should not remain unverified while new features are added on top of it.

**Honest verdict, without protecting prior decisions:** every prior sprint in this codebase's history (Sprint A, F4, IS-1, IS-2, HQ-1, HQ-2) made the correct call for its scope, and each one's own audit of itself was honest about what it didn't finish. That discipline is real and should continue. But the platform does not yet need more sprints that add capability — it needs one sprint, or two, that do nothing but consolidate the two or three seams named repeatedly throughout this document. **The goal is not more features. It is making the intelligence that already exists tell the truth about itself, everywhere, all the time — the way it already, provably, can.**
