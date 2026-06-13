# NGW Event Boss — Session Handoff

You're continuing work on **NGW Event Boss** — a mobile-first React event-planning app for professional event planners. Read this fully before acting.

## Project
- Working dir: `/Users/toddwillis/Code/ngw-event-planner/demo`
- Product name in-app: **"Event Boss"** (repo is `ngw-event-planner` for legacy reasons)
- Architecture: one huge `src/App.js` (~30k lines) + `src/plan/*.jsx` (CommunicationHub, DecisionApprovalCenter, VendorPlanningWorkspace, TimelineBuilder, ClientIntakeFlow) + `src/lib/*` + `src/design/tokens.js`
- 4-layer nav: **L1** Studio Home → **L2** Portfolio (All Events / Clients) → **L3** Event Command (the "Overview" tab) → **L4** specialist tabs (Messages, Planning, Decisions, Vendors, Budget, Guests, Calendar, Event Day Schedule, etc.)
- Dark **"Studio Matte"** design only. Tokens in `src/design/tokens.js`; legacy DARK palette in `App.js`.

## How to work (non-negotiable)
- **RENDER-FIRST**: never judge UI from code. Capture with the puppeteer scripts in `scripts/` (`cap*.js`) against a running dev server, save PNGs to `demo/review-artifacts/<date>-<topic>/`, and READ the images.
  - Dev server: `BROWSER=none REACT_APP_AUTH_BYPASS=true REACT_APP_OPENWEATHER_KEY="" npm start` (port 3000, served at `/ngw-event-planner/`).
  - Chrome path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Design bar is **"bless = 10+"**, not 9. Score honestly. Use the named review board — design: Rams/Ive/Tufte/Norman/Zhuo/Saarinen/Wroblewski/Kare; event-pro: Weiss/Rafanelli/Bailey/Cowie-Tutera/VenueOps/Grandmother. Be brutal, not consensus.
- Doctrine: **The Attention System** (ONE hero per screen, 3 contrast tiers, ONE accent moment, progressive disclosure, motion=change only). **HONESTY** (never fake urgency/data/AI; never fake integrations). Grandmother test.
- **The Next-Step Spine**: one persistent next-action ribbon, identical style at every layer, **outline** CTA (not filled), advances on completion, caught-up reward. Leads Home (honest command even in demo — points to "explore the sample," never fake urgency) and every L4 tab except Overview (which is the Spine's detail view). Suppressed in day-of mode (the day-of execution bar owns that strip).
- Operate autonomously; don't ask permission for normal work. Act decisively.

## Build / deploy (ALWAYS use the env strip)
- Build: `REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" npm run build`
- Smoke: `node scripts/smoke.js` (expect `✅ SMOKE PASS`; the `claim_pending_invitations` 400s are known noise)
- Deploy: `npx gh-pages -d build` → prod **https://twillis45.github.io/ngw-event-planner/**
- "Compiled with warnings" is normal (pre-existing unused-vars).

## Naming note (important — avoids confusion)
The day-of schedule is called **"Event Day Schedule"** everywhere a USER sees it (tab label, "Schedule" in bottom nav, "Draft schedule (AI)" button). The strings `'Run of Show'` and `ros` survive ONLY as internal code identifiers — the tab *route key* `'Run of Show'` (mapped to the display label via `TAB_LABELS`), the data field `event.ros`, and names like `draftFullROS` / `EventDayBar` / `rosCLR` / `type:'ros'`. **Users never see "Run of Show" or "ROS."** When you read those in code, think "Event Day Schedule."

## What's shipped recently (live in prod)
- The Next-Step Spine (L1 + L4); the floating compose FAB was killed (compose moved to the Studio "New message" nav item); de-emojied composer; dismissible dev badge.
- Setup-tracker unification: `getStudioSetup(profile)` is the single source (3 essentials + 6 recommended); Home + Settings denominators agree.
- L1 audit fixes: the "N messages waiting" comms band is Home-only; one onboarding card ("Let's get you set up · 0/5"); Pipeline restructured to a funnel-summary bar + active-events card grid (mobile defaults to the Active lane); L1 Calendar defaults to "Upcoming · all events" agenda; L4 event Calendar defaults to a **"Runway"** countdown; demo Home greeting is honest (no fake urgency).
- Messages: thread-list void end-cap; 2-pane threshold raised to 1280; single attention band (Spine suppressed there, the wait-band is the local hero); clamped wait-band; "Messages" naming everywhere; mobile header de-dup; wide bubble cap; inline contact-info editor in the conversation header.
- Settings: widened drawer (720px); quiet "Signed in as" identity row; condensed NO-GUESSWORK legend.
- Daily "Brief me" summary → **OpenAI backend** (`lib/aiProxy.js` → `callAiFeature('event_brief')`). Calendar timing fix (Upcoming starts today, no past milestones). Event back-link opens the linked client (was a label/action mismatch). Readiness sparkline hover tooltip.

## OPEN THREADS (pick up here)
1. **AI rewire to backend** — 7 of 9 AI sections still call `askClaude` (Anthropic frontend BYOK key). Only the **daily brief** + **message drafts** use the OpenAI backend. Backend `AI_FEATURES` (lib/aiProxy.js) has only 4: `event_brief`, `vendor_followup`, `document_summary`, `checklist_help`. Remaining to rewire (proposed feature → in the inventory below): vendor contact-log summary (`document_summary`), client proposal draft (`vendor_followup`), notes drafting — vendor + client (`checklist_help`), budget suggestion (`document_summary`), vendor outreach personalization (`vendor_followup`), Event-Day-Schedule draft a.k.a. `draftFullROS` (`checklist_help`), AI Readiness Copilot (`event_brief`). Each call site gates on `if (!aiKey) return;` — change to also try `isAiProxyConfigured()`. **Decision pending:** route all onto the existing 4 features (works, slightly generic flavor) vs. add dedicated backend features (`proposal`/`budget`/`schedule`/`readiness`) for best output quality.
2. **Sparkline** — `ReadinessSparkline` (App.js ~4256) shows readiness-over-time on event cards. Board take: the insight is valuable, the tiny chart isn't (illegible; fails grandmother test). Recommendation pending approval: replace with a worded trend chip ("↘ Slipping 8 pts" / "↗ Improving" / "→ Steady" + current %).
3. **Pipeline in-app explainer** — add a one-line purpose per lane + a short "what this is," so a new planner understands the booking funnel (Inquiry → Proposal → Contracted → Deposit → Active → Complete).
4. **Calendar filters** — add filters by event type, client, and item kind (milestones / payments / event days) to the Master Calendar (App.js `MasterCalendarView` ~23511).
5. **Optional cleanup** — rename the internal `'Run of Show'` route key + `draftFullROS`/`EventDayBar` vars to match the "Event Day Schedule" UI (leave `event.ros` data field to avoid a persistence migration). Cosmetic; small routing-regression risk.

## Memory
Persistent notes: `/Users/toddwillis/.claude/projects/-Users-toddwillis/memory/` (`MEMORY.md` is the index — read it first). Key entries: `feedback_attention_system`, `project_next_step_spine`, `project_calendar_rework`, `feedback_ngw_design_standard`, `feedback_bless_threshold`, `feedback_prod_build_env_strip`, `feedback_screenshot_storage`.

---
Start by confirming the dev server is running and capturing the current state of whatever surface you're asked about. Tell me your plan before large changes.
