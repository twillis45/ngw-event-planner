# Sprint ACT-1 — Real Host Validation

**Date:** 2026-06-18 · **Branch:** `main` · **Mode:** VALIDATION (driven journey, observed evidence)
**Method:** scripted first-time-host walkthrough at **390px (mobile)**, fresh state (onboarded,
0 events, 0 clients ⇒ host account), with a dev-only `window.__NGW_TRACK__` tap to observe
analytics firing on localhost (PostHog is `IS_LOCAL`-disabled). Screenshots in
`review-artifacts/act1_*`.

**Headline:** the happy path **works.** A first-time host can create an event, see a next
step, add guests, and reach Event Day — on mobile, with zero console errors. The failures are
**friction and framing**, not broken flows.

---

## Part 1 — First-Time User Journey (observed)

| # | Question | Observed result |
|---|---|---|
| 1 | Create an event? | **Yes.** Empty Host Home → "Start your event →" → 3-step modal (Basics → Setup → Review) → "Create event". `event_created` + `intake_committed` fired (observed via tap). |
| 2 | Understand what to do next? | **Yes (with a caveat).** Lands on Host Home: *"Maya's Graduation Party · Jul 15 · 27 days to go"* + **"YOUR NEXT STEP: Decide: Set budget and guest count."** The first action is framed as a *decision*, not the simplest first win. |
| 3 | Add guests? | **Yes.** Guests lane reachable from the mobile bottom nav; add affordance present. |
| 4 | Reach Event Day? | **Yes.** "View Event Day" CTA on Host Home → schedule with the **"Moments that matter"** chip row (60F). |
| 5 | Understand progress? | **Yes.** Host Home "How it's coming along": Guests/Budget = *In progress*, Food = *To do*, Schedule/Venue = ✓. Honest, percentage-free. |

**Points of confusion observed:** (a) the empty Host Home has **two** create entry points
("+ New event" header + "Start your event" hero); (b) Step 1 of the modal asks **name + date
+ type + secondary type + audience** — ~5 fields across the first screen before the event
exists; (c) event **type is required** via "What are you celebrating?" (a taxonomy choice);
(d) the first next-step is a **"Decide:"** prompt rather than "add your guests."

## Part 2 — Friction Audit (ranked, observed)

| Sev | Friction | Evidence |
|---|---|---|
| **High** | **3-step create modal, ~5 fields on Step 1**, before the event exists | `act1_step1_filled.png` — Basics(name/date/type/2nd type/audience) → Setup → Review |
| **High** | **First action is a decision** ("Decide: Set budget and guest count"), not the simplest first win | landed snippet: "YOUR NEXT STEP: Decide…" |
| **Medium** | **Type classification required** ("What are you celebrating?") up front | required `#ce-type` select |
| **Medium** | **Date entry** — native mm/dd/yyyy on mobile + 5 chips (This/Next weekend, +1/+3/+6 mo) — two paradigms | modal screenshot |
| **Low-Med** | **Audience question** ("Who are you planning this for?") shown to a self-host | `#ce-audience` present in create |
| **Low** | **Two create entry points** on the empty home | header + hero both create |
| **Low** | **"Budget In progress"** before anything is entered may read as overstated | progress chips |

**No dead ends, no planner leakage, no hidden-action blockers were observed in the host
flow** — the L4 host nav (6 tabs, no Decisions/Crew/Intake) and Host Home held up.

## Part 3 — Instrumentation Review (observed + code-verified)

| Event | Status |
|---|---|
| `event_created` | **OBSERVED firing** (tap) — App.js:32447 |
| `intake_committed` | **OBSERVED firing** (tap) |
| `account_created` (`signed_up`) | code-wired (App.js:212, auth event) — not testable in dev (no real auth) |
| `host_home_viewed` | wired (trackOnce) — fired once then de-dupes by design (observed-by-construction) |
| `host_next_step_clicked` | wired (HostHome CTA) — not triggered in this run (clicked View Event Day instead) |
| `decision_captured` / `ros_item_added` / `outcome_captured` / `event_completed` | wired at real capture points (Phase 5) — fire on their triggers; not part of the first-session path |

**Pipeline confirmed** on localhost via the dev tap; in prod these route to PostHog
(`isAnalyticsConfigured = PH_KEY && !IS_LOCAL`).

## Part 4 — Activation Scorecard

| Stage | Current | Target | Gap |
|---|---|---|---|
| Signup | *n/a in dev* | — | Needs a prod cohort to measure account→first-event drop |
| Event creation | **B−** | A | Collapse the 3-step / 5-field modal to a 2-question start |
| First value | **A−** | A | Lands on Host Home w/ event + next step immediately — strong |
| Navigation | **A−** | A | Host nav clean; The Day in the mobile lane |
| Mobile | **A−** | A | 0 overflow / 0 errors, thumb-first |
| Completion | *n/a first session* | — | Outcome capture is post-event; not in the first run |

**Composite (first session):** the path is **B+/A−** — it succeeds; the drag is the create
modal and the decision-first framing.

## Part 5 — Host Cohort Plan

| Pilot | Recruitment | Success criteria | Feedback loop |
|---|---|---|---|
| **5-host** | Warm network (the studio's own photo clients hosting events; friends with a birthday/graduation/shower in <90d) | ≥4/5 reach **event created + 1 planning action**; ≥3/5 reach **Event Day view**; qualitative: "did this feel like planner software?" → must be *no* | Instrumented funnel (now live) + a 5-min post-session call |
| **10-host** | + a small beta waitlist / one community (a school parent group, a church admin) | ≥70% activation; ≥50% return within 7d (`returned_d7`) | Funnel + a 3-question in-app survey at Host Home |
| **20-host** | + one referral loop from the first 10 | ≥1 **event_completed + outcome_captured** (the moat's first real datum) | Funnel + cohort retention chart |

**Gate:** do not scale past 5 until the create-modal friction (Part 2 #1/#2) is reduced — it's
the most likely drop point and cheap to fix.

## Part 6 — *(covered by the scorecard + cohort plan above)*

---

## Final Question — Top 10 reasons a real host fails to reach Event Day (observed-grounded, prioritized)

Ordered by **fix priority** (fixes over features). Items marked *(prod)* can't be observed in
dev and must be confirmed with the cohort — flagged, not speculated.

1. **Create-modal abandonment** — 3 steps + ~5 first-screen fields before the event exists. *(observed)* **Critical · fix: 2-question start (name + date), defer type/kit/budget/audience.**
2. **Decision-first next step** — "Decide: Set budget and guest count" as the very first action raises the bar over a simple "Add your guests." *(observed)* **High.**
3. **Required type taxonomy** — "What are you celebrating?" forces classification up front. *(observed)* **High · fix: infer/skip, or make optional.**
4. **Account→first-event drop** *(prod)* — unmeasured in dev; the classic top-of-funnel leak. **High · instrument + watch.**
5. **Mobile date entry** — native mm/dd/yyyy + chips, two paradigms; fiddly on a phone. *(observed)* **Medium.**
6. **No "add guests" as the surfaced first win** — guests are reachable but not the first step. *(observed)* **Medium.**
7. **Re-engagement gap** *(prod)* — `returned_d1/d7` exist but there's no nudge to return and finish before Event Day. **Medium.**
8. **Two create entry points** — minor decision overhead on the empty home. *(observed)* **Low.**
9. **"Budget In progress" overstatement** — progress reads optimistic before data exists. *(observed)* **Low.**
10. **Audience question to a self-host** — slight "is this for me?" friction in create. *(observed)* **Low.**

**The minimum-viable fix set (prioritized over features):** collapse the create modal to two
questions (#1), make the first next-step a simple win like "Add your guests" (#2/#6), and make
type optional/inferred (#3). Those three address the only High-severity, in-product, observed
drop points — and they're all *reductions*, not builds.

**Verdict:** the host product is **usable today** — the journey completes cleanly on mobile.
The next work is **subtraction at the front of the funnel**, then a 5-host pilot to replace
these dev observations with real ones. *Usage before more building; fixes before features.*
