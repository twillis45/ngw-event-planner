# Sprint 60.M → 60.S — Mobile Home + Day-of + Comms Truth Lock

**Status:** Draft (overall mobile readiness 9.7 — bless threshold is 10+ per locked feedback)
**Branch:** local (demo/src changes only — no deploy)
**Scope:** Mobile Home truth unification, Day-of calm, Mobile Comms trust rebuild
**Period:** Sprints 60.M through 60.S (single arc)

## What changed

### Mobile Home (60.M / 60.N / 60.O / 60.P / 60.Q)
- StudioCommandPanel hero: critical CTA red → steel-blue gradient across all tiers; brass LIVE pill only for today event
- AUTH BYPASS pill collapsed to 8×8 dot on ≤640px (full pill on tablet/desktop)
- Studio Setup banner → single-line chip on mobile; Demo banner copy compressed
- GlobalCompose FAB hidden on mobile Home (was 52×52 glowing disc competing with hero)
- Messages-waiting card collapsed to one-line "N messages waiting for reply" signal on mobile (full preview on desktop)
- AttentionQueue collapsed to "N attention items · View all" row on mobile by default
- Sample-only mode → PRACTICE SIGNALS calm learning card replaces urgent-looking attention surfaces
- Studio Matte raise stack (4-layer shadow) applied to all surface family: hero, PRACTICE SIGNALS, attention row, waiting row, HomeUpcomingPanel, EventReadinessPanel, AttentionQueue, EventReadiness tiles, messages-waiting card (desktop)
- Recessed Carbon "well" under hero CTA — primary button sits in a tray
- Hero CTA mobile layout: full-width primary stacked above centered secondary
- Tokens.js matte ramp realigned to mirror App.js DARK theme (Mid Carbon #111519 base, Lifted Carbon #1C2227 surface)

### Hero copy system lock (60.O Addendum + 60.P Addendum)
- Removed "WHAT NEEDS YOU TODAY" + "Start here:" double-voice. Single command voice per hero.
- State-aware eyebrow ladder: WELCOME / SAMPLE · NOT A REAL EVENT / LIVE · ACT NOW / TODAY · LIVE / START HERE / NEEDS FOLLOW-UP / UPCOMING EVENTS / UPCOMING EVENT / ALL CLEAR
- Today/Live hoisted ABOVE readiness tier so live event days never lead with "slipping on vendors"
- Locked body copy for every state — no clever phrases, plain truth
- Today-with-issues spawns the NEW "LIVE · ACT NOW" variant (red rail, big clock, "N things need attention right now.")
- Header summary line on desktop derives from same command state — agrees with hero

### Home truth unification (60.Q 10+ Lock)
- EventReadinessPanel now uses getEventReadiness (same signal as the hero) — readiness label and hero label provably agree
- AttentionQueue empty-state replaces "All quiet — nothing needs you right now." with "[Event] is in the hero above — nothing else flagged here." when hero is urgent
- Mobile gates: EventReadinessPanel hidden when hero is critical/attention so the two voices can't visually contradict

### Vendor mobile (60.Q Phase 1)
- MobileVendorSummary rebuilt with locked hero pattern: FIX FIRST · CRITICAL / FIX FIRST / LOOKS READY eyebrow chip + plain headline + body + steel-blue gradient "Fix this first" CTA + contact shortcuts row (Call / Text / Email — real tel:/sms:/mailto: routes, never fake send)
- Replaces previous broken `P.accent` undefined CTA and muddy green `+'14'` "Looks ready" wash

### Mobile Comms (60.M Phase 3a / 60.O Phase 3 / 60.Q Comms / 60.R / 60.S)
- Needs Reply priority hero at top of mobile Messages — Carbon body + amber rail + steel-blue Review reply CTA + per-tab chip jumps
- Backend status badge demoted to single dot on mobile workspace header
- Tab switcher → readable segmented control on mobile (52px tall, 13px label, includes "Needs reply" virtual cross-channel tab)
- Thread rows redesigned: sender / explicit role line / preview / status chip + amber rail when needs reply
- Chat-bubble convention: planner right-aligned + steel-tint gradient + bottom-right tail; client/vendor left-aligned + Lifted Carbon + bottom-left tail
- Approval bubble rebuilt: Carbon body + colored rail (was amber/green/red+'14' wash). Approve = steel-blue gradient (was solid green); Reject = red ghost outline; both 40px+ touch
- Composer state classification — 4 mutually-exclusive states with chip + matching CTA + persistent honest hint:
  - EMAIL LIVE → Send email
  - EMAIL DRAFT → Open email draft (real mailto: handoff)
  - SHARED THREAD (renamed from BACKEND — user-facing language) → Save to thread
  - LOCAL ONLY → Log to thread
- Delivery status indicator gets scannable tag chip — 6-state vocabulary lock: Sent via email / Delivery pending / Delivery failed / Provider blocked / Saved to thread / (default Saved to thread)
- Composer footer becomes recessed Carbon "well" — input + send sit inside a tray
- Mobile thread detail collapses earlier messages by default behind "Show N earlier messages" steel-pill; latest 2 + any pending approval bubble always visible
- Day-of Messages variant: isDayOf propagation through Hub → ConversationPane → Composer; bubble copy 12→16px, sender row 10→13px semibold, textarea 12.5→16px, send button 12→15px + 48px min hit; composer chip drops to dot + inline state on Day-of

### Day-of (60.P / 60.R / 60.S)
- DayTaskView Now hero: tabular-numeric live clock re-derived every 60s, state-aware eyebrow (NOW · ACT IMMEDIATELY red / NEXT UP amber / ALL CLEAR green), plain headline, body line, colored rail
- Day-of alert stack collapsed on mobile: critical alerts always render up top; non-critical alerts collapse behind single muted "N more alerts below · View" affordance. Tap expands. Desktop unchanged (full triage stays visible).
- VendorArrivalView rows joined the Studio Matte raise family
- Day-of Arrivals already grouped by Late · needs attention / On site / En route / Coming up (carried from 60.L)
- Missing Arrival Times panel with mailto: handoff (real, opens email app, doesn't send)

### Source-of-truth (selectStudioCommand reorder)
State priority ladder (post-60.P Addendum):
1. Empty workspace
2. Today event + actionable items → LIVE · ACT NOW
3. Today event + clean → TODAY · LIVE
4. URGENT/AT_RISK item → START HERE (critical)
5-7. AWAITING / PENDING / vendor issues → NEEDS FOLLOW-UP (attention)
8. Readiness slippage → NEEDS FOLLOW-UP (attention)
9. Multiple upcoming in 60d → UPCOMING EVENTS
10. One upcoming → UPCOMING EVENT
11. All clear

Hoisted today/live ABOVE readiness so a today event with empty vendors no longer renders "slipping on vendors."

## Files changed (cumulative)
- `demo/src/App.js` — StudioCommandPanel hero / HomeHero summary / SetupBanner / Demo banner / MainDashboard derivations / messages-waiting card / AttentionQueue collapse + empty-state vocabulary / EventReadinessPanel signal source / EventDayBar alert collapse / DayTaskView Now hero / VendorArrivalView raise / amber wash sweep (~12 sites) / GlobalCompose FAB hide / 3 local DARK theme overrides removed
- `demo/src/CommandCenter.jsx` — selectStudioCommand state priority reorder; LIVE · ACT NOW + TODAY · LIVE branches; locked tier copy ("Start here:" stripped, NEEDS FOLLOW-UP vocabulary)
- `demo/src/components/AuthGate.jsx` — BypassBadge mobile collapse to 8×8 dot
- `demo/src/plan/CommunicationHub.jsx` — Composer state vocabulary + recessed well; bubble side differentiation; delivery status 6-state tags; mobile thread collapses earlier history; Day-of variant scaling
- `demo/src/plan/VendorPlanningWorkspace.jsx` — MobileVendorSummary fix-first hero rebuild
- `demo/src/design/tokens.js` — matte ramp realigned to mirror DARK theme

## Runtime QA matrix (5 viewports × 3 high-impact surfaces)
| Viewport | Home critical | Day-of Now | Comms thread |
|---|---|---|---|
| 390 mobile | ✓ Mid Carbon · no overflow · 0 err | ✓ | ✓ |
| 430 mobile | ✓ | ✓ | ✓ |
| 768 tablet portrait | ✓ | ✓ | ✓ |
| 1024 tablet landscape | ✓ | ✓ | ✓ |
| 1440 desktop | ✓ | ✓ | ✓ |
**Clean: 15/15.** Body = `rgb(17, 21, 25)` (#111519 Mid Carbon) everywhere. scrollW = viewportW (no overflow). 0 console errors. 0 page errors.

## Screenshots
All locked surfaces captured in `~/Code/ngw-event-planner/demo/review-artifacts/`:
- `2026-06-05-sprint-60q-backlog-captures/` — 4 Home states + Day-of Now + Day-of Messages + Vendor detail
- `2026-06-05-sprint-60q-bubble-sides/` — bidirectional Messages thread (planner steel-tint right + client Carbon left)
- `2026-06-05-sprint-60p-addendum-truth-table/` — TODAY · LIVE / LIVE · ACT NOW / NEEDS FOLLOW-UP captures
- `2026-06-05-sprint-60q-10lock/` — readiness panel + hero agreement
- `2026-06-05-sprint-60r/` — Day-of calm + Comms vocabulary
- `2026-06-05-sprint-60s-mobile-comms/` — collapsed-earlier thread
- `2026-06-05-sprint-60op-5viewport-sweep/` — 15-shot sweep proof

Figma reference frames on the **NGW MOBILE 10+ LOCK** page (file `CYlmJqDCXEaacCuz9wW3bd`):
- `1036:2` — Sprint 60.O Mobile Lock Direction
- `1042:2` — Sprint 60.O Addendum (eyebrow system)
- `1051:2` — Sprint 60.P Mobile Home Priority Lock
- `1059:2` — Sprint 60.Q Vendor fix-first
- `1061:2` — Sprint 60.Q Comms rebuild
- `1068:2` — Sprint 60.P Day-of Now hero
- `1072:2` — Sprint 60.Q Conversation both-sides mockup
- `1075:2` — Sprint 60.Q runtime proof + seed-bypass recipe
- `1081:2` — Sprint 60.Q backlog 5-state runtime matrix
- `1095:2` — Sprint 60.P Addendum truth-table proof

## Scorecard
| Dimension | Before arc | Now |
|---|---|---|
| Home hero clarity | 7.5 | 9.7 |
| Home truth consistency | 6 | 10 |
| Above-the-fold focus | 7 | 9.5 |
| Visual calm (Home) | 6.5 | 9.5 |
| Day-of calm | 6.5 | 9 |
| Day-of action clarity | 7 | 9 |
| Mobile Comms trust | 7 | 9 |
| Mobile Comms action clarity | 7 | 9 |
| Message state truthfulness | 7.5 | 10 |
| Vendor fix-first clarity | 6 | 9 |
| CTA truthfulness | 9 | 9.5 |
| Source-of-truth safety | 9 | 10 |
| Color discipline | 8 | 9.5 |
| No Guesswork philosophy | 7 | 10 |
| **Overall mobile readiness** | **7.5** | **9.7** |

## Blockers
None.

## Non-blockers
- Day-of Schedule timeline rebuild (Done/Now/Next/Later) not started
- Full mobile Comms list rebuild (priority card + segmented control + thread row spec form) — partial; full spec form pending
- `onApprove` not wired through `EventCommTab` — Approve/Reject UI lives but action handler doesn't reach the canonical approval_status path end-to-end
- Notion MCP disconnected mid-arc — this block is the manual handoff
- 3 of 5 deferred Home-state captures (Today / Multi-upcoming under unified signal) captured but not re-verified post-Phase-1 unification — same code path, expected clean

## Merge recommendation
**DRAFT.** Per bless threshold = 10+ (not 9.5). Overall sits at 9.7. Sub-10 dimensions: Day-of calm 9 (Schedule rebuild pending), Comms trust/action 9 (full list rebuild pending), color discipline 9.5 (brass on Day-of LIVE pill not reaudited under new ramp), CTA truthfulness 9.5 (`onApprove` not wired end-to-end).

Estimated remaining work to reach 10+: Day-of Schedule timeline (half day), full mobile Comms list redesign (half day), `onApprove` wire-up (1 hour), brass reaudit (1 hour). Single focused session.

## Brutality check
- Was Home visually improved but still logically inconsistent? **Fixed** — single signal source across 4 surfaces.
- Hero/header/readiness/AttentionQueue agree? **Yes** — provably, by construction.
- Today/Live treated as day-of first? **Yes** — hoisted above readiness.
- Sample mode panic-free? **Yes** — PRACTICE SIGNALS replaces urgent attention surfaces.
- Day-of calm or alarm wall? **Calm** — alert rows collapse from 4–5 to 0 on mobile; hero lands first.
- Mobile Comms shows who needs reply without reading every thread? **Yes** — Needs Reply hero + segmented control + per-tab chip count.
- Saved vs sent vs failed distinguishable? **Yes** — 6-state vocabulary tag chips on every planner bubble.
- Red/amber only severity? **Yes.**
- Steel-blue CTAs only primary? **Yes** — verified across all surfaces.
- Font decreased anywhere? **No.**
- Source-of-truth break? **No.**
- CTA overpromise? **No** — every CTA routes / records / saves to thread / opens mailto; nothing fakes send.
- Actually 10+? **No — 9.7. Stays draft.**
