# Sprint 61B — Reality Before Intelligence

**Date:** 2026-06-18 · **Branch:** `main` @ `d33ebde` · **Mode:** AUDIT ONLY (no build)

**Question:** before building another intelligence layer, what is required to create real
usage and real learning?

**Verdict up front — and it is the most important finding in this whole arc:** the single
highest-leverage activation move is **nearly free and already built.** The entire
host-friendly experience — `pi.voice` (host persona), `pi.nav` (6-tab host nav), `pi.labels`
(host vocabulary), Positive Attention, Confidence Grammar, Because, Event Identity (60B),
Moment Library (60F) — is **merged to main, tested, and turned OFF.** A real self-host today
gets the **full 14-tab professional planner UI with jargon they cannot parse** (Client Intake,
Decisions, Crew). **The #1 thing blocking real hosts is not a missing feature — it's that the
host product is switched off.** Activation is now unambiguously more important than
intelligence, and the first move is a *flag enablement + a few dead-end fixes*, not a build.

---

## Part 1 — Cohort Readiness Audit · Top 10 friction (ranked)

| # | Friction | Location | Severity | Fix type |
|---|---|---|---|---|
| 1 | **Host presentation is OFF by default** — `personaFor` returns `'planner'` unless `pi.voice` ON (nextActionRenderer.js:184); a self-host sees the planner UI the app *already knows* is wrong. | nextActionRenderer.js:184; presentationNav.js:14 | **BLOCKER** | flag enablement |
| 2 | **14 tabs incl. incomprehensible ones** (Client Intake, Decisions, Crew) — host nav (6 tabs) only applies when `pi.nav` ON **and** audience='host'. | presentationNav.js:24; App.js:27351 | **BLOCKER** | flag enablement |
| 3 | **New event lands on a Command tab that says "Nothing urgent right now"** with no get-started CTA — the spine's tiers 1–12 all no-op on an empty event, falling to the "all clear" message. | CommandCenter.jsx:1204–1456 | **HIGH** | small build |
| 4 | **Event creation = ~5 micro-decisions before the event exists** (name+date+type required, then kit pick bundling 3–5 surfaces, then an open budget estimator). | App.js:7873–8051 | **HIGH** | UX trim |
| 5 | **"Event Day Schedule" buried under "More" on mobile** — a core host task is 3+ taps away. | App.js:30737–30761 | **HIGH** | nav config |
| 6 | **Sample data seeded by default + counted in the greeting** ("4 active events · 11 need attention" over fake events); clearing is buried in Settings. | App.js:146, 15835–15889, 17160 | **MEDIUM** | default + copy |
| 7 | **Circular empty states** — Budget says "Add category" (not "add vendors first"); Documents says "Open a vendor" when there are none. | App.js:21229, 29200 | **MEDIUM** | copy/CTA |
| 8 | **Setup launchpad implies steps are mandatory** but studio-name/name/contact gate nothing; no reward/redirect on completion. | App.js:12735, 17685 | **MEDIUM** | copy |
| 9 | **No audience selector unless `pi.voice` ON** — the host never declares themselves; the app relies on the default. | App.js:8260 | **MEDIUM** | flag enablement |
| 10 | **Vendor stubs are empty category rows** with no "name your caterer" guidance for a first-timer. | App.js:8008 | **MEDIUM** | small build |

**Pattern:** 4 of the top 10 (incl. both BLOCKERs) are **the same root cause — the host
experience is flag-gated OFF.** They collapse into one decision: turn it on for host-audience
events. The rest are a short punch-list of genuine first-event dead-ends.

## Part 2 — First Event Success Audit

**Can a first-time host create and successfully plan an event today? Conditionally yes —
the engine works — but with avoidable cognitive-load spikes and two likely abandonment points.**

- **First login →** lands on Home amid *sample* events that count in the "N events need
  attention" greeting (panic over fake data).
- **First event →** the 3-step modal + kit + budget estimator is the first load spike (#4).
- **First landing →** opens to a Command tab that says **"Nothing urgent"** with no next step
  (#3) — **abandonment point #1** (the host doesn't know what to do).
- **First task / vendor →** must infer which of 14 tabs to click; hits jargon tabs (Client
  Intake/Decisions/Crew) — **abandonment point #2** (the product looks "not for me").
- **First Run of Show →** strong once reached, but buried under "More" on mobile (#5).

**Confusion peaks** where the planner UI shows through: tab names, "approve what's blocking,"
"intake," "crew." Every one of those is fixed by the OFF flags from Part 1.

## Part 3 — Activation Metrics

**A funnel already exists and is partially wired** (PostHog, analytics.js; `isAnalyticsConfigured = PH_KEY && !IS_LOCAL`):
- **Tracked:** `signed_up`, `event_created`, `vendor_added`, `message_sent`, contract/payment,
  `page_view`/`tab_changed`; first-run signals `firstAppOpenAt`/`firstEventCreatedAt`/
  `firstClientCreatedAt`/`firstPipelineViewedAt`/`firstSampleLoadedAt`.
- **MISSING — and these are the ones that matter:** `first_planning_action` (timeline task),
  `first_decision_captured` (decisionMemory), `first_moment_added` (60F),
  **`first_outcome_captured`**, and **`event_completed`**. The funnel tracks *acquisition*
  but **not the intelligence-generating actions.** NGW currently cannot see whether the
  memory/outcome loop is used at all.

**Recommended minimum funnel (reuse `track()` + EVENTS; add ~4 events, don't overbuild):**
`account_created → first_event → first_planning_action → first_vendor → first_decision →
event_completed → first_outcome_captured`. The last two are the moat-gating events and are
**not instrumented today** — fixing that is the cheapest high-value data work in the product.

## Part 4 — Real Data Strategy (signals ranked by intelligence unlocked)

| Rank | Signal | Unlocks | Status |
|---|---|---|---|
| 1 | **Outcomes on completed events** | Vendor track record (the moat), readiness calibration | Capturable (58E); **not instrumented; needs events that HAPPENED** |
| 2 | **Decisions + rationale** | Memory / why-recall, decision confidence grounding | Capturable (58C); not instrumented |
| 3 | **Vendors w/ stable identity** | Cross-event track record | **Identity fragile** — name-keyed, no Bank-id FK (61A) |
| 4 | **Completed events** | The gate for #1 — outcomes are post-event | ~0 today |
| 5 | **Moments** | Run-of-Show completeness | Now capturable (60F); low *intelligence* value |
| 6 | **Guests / budgets** | Operational only | Captured; low cross-event value |
| 7 | **Lessons** | Planner notes | Manual, sparse |

**Most urgently needed:** completed events with captured outcomes (#1+#4) on a **stable vendor
identity** (#3). Two are blocked by activation; one (#3) is a small plumbing fix that should
land **before** data arrives so it accrues cleanly.

## Part 5 — Vendor Intelligence Roadmap (EXECUTE vs WAIT)

**EXECUTE now (no data scale required):**
- **Enable the existing recollection reader** (`vendorMemoryFor`/`summarizeVendorMemory`,
  already surfaced behind `pi.memory`, 61A) for the host/planner cohort. Honest at n=0
  ("limited history"). No scoring, no ranking, no recommendation.
- **Instrument** `first_decision_captured` / `first_outcome_captured` / `event_completed`.
- **Stamp the Vendor Bank id onto event vendors going forward** (the cheap half of 61A's
  identity fix) so the moat data is clean from event #1 — *clean capture now*, not analysis.

**WAIT FOR DATA (frozen until the threshold in the Final Question):**
- Any vendor scoring, ranking, or "Recommended."
- Cross-event reliability patterns / "rehired, all on-time" surfacing at scale.
- Purpose-fit ("right for THIS event") — needs the 60D/60E classifier + real outcomes.

---

## Final Question

**If NGW gets 10 active hosts / 50 completed events / 100 captured decisions, what becomes real?**
- **Vendor recollection becomes substantive** — real per-vendor track records ("used 4×, 3
  on-time") instead of "limited history."
- **The 60D classifier audit is re-runnable** — a real `must_have_moment` corpus exists; the
  60E Moment Library can be validated against actual selections.
- **Outcome-driven calibration** — readiness/decision-confidence can be checked against what
  actually went well/poorly.
- **Decision-memory recall** — "last time you chose them because…" has enough history to help.

**What stays FROZEN until that threshold:** vendor scoring/ranking/recommendations,
Stakeholder Intelligence, Relationship Intelligence, Experience Intelligence, identity-driven
prioritization — everything 60C–61A already parked. None of it is honest below this data line.

**Ruthless conclusion — say it plainly:** **Activation is now more important than
intelligence, and it isn't close.** The product is roughly a generation ahead of its
evidence. The highest-leverage work is not another reader — it is getting ~10 real hosts to
run real events to completion. And the cheapest, biggest activation lever is already sitting
in the codebase, merged and tested: **the host experience that's switched OFF.** Turn it on
(gated to host-audience events, with a QA pass), fix the empty-event landing (#3) and the
mobile schedule burial (#5), instrument the three moat-gating signals, and recruit the
cohort. **Build zero new intelligence until the data exists.**

**Smallest next sprint:** *Host Activation v1* — (a) enable `pi.voice`/`pi.nav`/`pi.labels`
(+ Positive Attention / Event Identity / Moments) for host-audience events behind one
"host experience" switch; (b) a get-started CTA on the empty Command tab; (c) surface Event
Day Schedule in the mobile primary lane; (d) instrument `event_completed` +
`first_outcome_captured` + `first_decision_captured`. No new engine. Reality before intelligence.
