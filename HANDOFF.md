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
- **Frontend deploy (NEVER `npm run deploy` — its predeploy rebuilds without the strip and leaks the dev-bypass + bakes the OpenWeather key). Build with the strip + the RSVP backend URL, then publish directly:**
  ```bash
  REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" \
  REACT_APP_API_BASE_URL=https://ngw-events-api.onrender.com \
  npx react-scripts build && npx gh-pages -d build
  ```
  → prod **https://twillis45.github.io/ngw-event-planner/**
- **Backend (FastAPI in `backend/`)**: Render Blueprint `render.yaml`, service **`ngw-events-api`** at **https://ngw-events-api.onrender.com**, `autoDeploy: true` → **a push to `main` auto-deploys it**. Smoke: `curl https://ngw-events-api.onrender.com/health` → `{"ok":true,...}`. Migrations are run by hand in Supabase SQL editor (project `ewoggzxarpcwesqxsdoz`). Prod env already correct: `ALLOWED_ORIGINS` explicit, `ALLOW_DEV_TOKEN` unset.
- "Compiled with warnings" is normal (pre-existing unused-vars).

## Naming note (important — avoids confusion)
The day-of schedule is called **"Event Day Schedule"** everywhere a USER sees it (tab label, "Schedule" in bottom nav, "Draft schedule (AI)" button). The strings `'Run of Show'` and `ros` survive ONLY as internal code identifiers — the tab *route key* `'Run of Show'` (mapped to the display label via `TAB_LABELS`), the data field `event.ros`, and names like `draftFullROS` / `EventDayBar` / `rosCLR` / `type:'ros'`. **Users never see "Run of Show" or "ROS."** When you read those in code, think "Event Day Schedule."

## What's shipped recently (live in prod)
- **★ Identity Invite + real RSVP (shipped & LIVE 2026-06-27, `feat/identity-invite-rsvp` → main; backend + frontend deployed).** The guest-facing invite/RSVP surface (`RSVPFormView` in `App.js`, reached at `?rsvp=<code>`) rebuilt as a premium, shareable "Identity Invite" — the activation front door.
  - **The cover** (tone-aware: dark Studio-Matte / light cream "stationery" with a dimensional canvas + identity-blush card): a magazine masthead ("AN INVITATION · ◆ · date" + center lozenge), the per-event **identity mark** (dark = smoked-glass `InviteDome` encasing the event glyph; light = foil-stamped free-standing `InviteEmblem`/`SacredMark` — NO glossy bauble on culturally-sacred marks), **Playfair Display** title (`FF_SERIF`) + italic heart line, **what/when/where** (real start time + venue→street→city/state→**Get directions** maps link), a big **letterpress-embossed countdown** numeral, and a **letterpress whisper across the whole type tier**.
  - **Juneteenth freedom mark** (`star-freedom` glyph in the `Icon` component, ~App.js:1372): accurate to the real flag — 5-pt star + a 12-pt **bursting-star outline** hugging it (with a breathing gap) + a full-width **horizon through the star**, fine hairline, cultural-red, sized to fill the medallion. Grounded in `docs/cultural-references/juneteenth.md` (flag ref: `review-artifacts/Juneteenth-Flag (1).jpg`). Other culture docs: crab-feast / housewarming / spades.
  - **RSVP transaction**: answer-first **two-tap** form, full a11y (radiogroups, `role=checkbox` groups, inline simultaneous field validation, `:focus-visible`, AA contrast), a real **confirmation** with **Add-to-Calendar (.ics, stamped with the US venue timezone)** + **Change-your-answer** + a shareable **"You're going"** moment. **Social/viral**: honest **"who's coming"** strip (from real `event.guests`, "Be the first" at zero), **"Tell a friend"** share, **"Make an invite like this — free"** recruit card. Host-side **"Preview & share invite"** entry in the Guests tab.
  - **Backend persistence (P0)**: `supabase/migrations/009_rsvp_submissions.sql` (anon **insert-only** RLS, no-select; idempotency `unique(rsvp_code,idempotency_key)`; 90-day retention fn; events-rsvpCode unique index scoped to **≥16-char** codes) + `backend/app/routers/rsvp.py` (public `GET /api/public/invite/{code}` resolve — **rsvpCode-only**, whitelisted public fields, **16-char entropy floor** — and `POST /api/public/rsvp/{code}` upsert + rate-limit; planner `GET /api/events/{id}/rsvps` read-back with **non-claiming** authz) + `src/lib/api/rsvp.js` (idempotency key, honest offline outbox, graceful localStorage fallback when `REACT_APP_API_BASE_URL` unset). New events mint a **22-char `rsvpToken()`**; demo seeds keep short codes (resolve same-browser only).
  - **Render the invite** (its own harness, NOT `scripts/cap*.js`): with a dev server up, `node review-artifacts/_shot_invite.mjs "http://localhost:3000/?rsvp=<code>" <out.png>` (and `_zoom_mark.mjs` for the glyph). Sample codes: `hf8gly` (dark gala), `eq2bsw` (light shower), `juneteenth` (tricolor), `w9k2mx` (wedding). The harness profile caches localStorage at `/tmp/chrome-shot-prof` — `rm -rf` it after changing seed data.
  - **Review boards run this session** added two seats worth remembering: a **Luxury Invitation/Stationery** lens and a **Cultural Authenticity** lens (plus Wroblewski/forms, a11y+security, growth, i18n). Final scores ~9.0–9.4; the security board CAUGHT a real authz hole (claim-on-first-touch + leaked event_id) — fixed. **Scope: English / United States audience — broad i18n (RTL/CJK/locale) is OUT of scope** (US-timezone correctness still matters).
- **Presentation/Intelligence stack complete** (merged 2026-06-18) — the three remaining 57-stack readers are now in main, all behind their own `pi.*` flags (default **OFF**, runtime identical to prod; bundle `main.5c2001eb.js`, +1.91 kB of inert flag-gated code):
  - **#52 Operator Mode** (`pi.voice`) — third persona. `organization` → **operator** (competent organizer, not a wedding planner): distinct voice ("Reconcile count", "Route for approval") + labels ("Event Schedule", "Vendor Follow-Up", "Attendance & Supplies") + own confidence words ("Not started"). Host + planner unchanged; **planner = identity by construction** (`renderAction(cmd,'planner') === cmd`). The persona spine is now Host / Operator / Planner, all from flag-free `audiencePersona(event)` (driven by `event.audience`; unset ⇒ host).
  - **#53 Decision Confidence** (`pi.decisions`) — "do we have enough to lock this?" reader over the 5 existing resolvers (Guest Count / Seating / Vendors / Timeline / Staffing). Reuses `guestCountResolved` etc. — no parallel math, no new persistence, no inferred state. Renders as the "DECISIONS" block in the Overview.
  - **#54 Value-Level Confidence** (`pi.valueConfidence`) — Pattern-014 confidence travels with derived values only; no fabricated ranges, no budget-confidence invention, no quantity changes.
  - Suite **222/222**; `check:migrations` ✓. Host-persona composition QA'd live (voice + nav + Positive Attention + Decision Confidence + Confidence Grammar + Because + Event Identity compose; desktop + mobile; 0 overflow, 0 console errors). Operator/Planner language distinction verified by the 9 `operatorMode` unit tests (runtime persona switching needs `audience`-set events; seeds default to host). Docs: `engine-audit/SPRINT_57I/57J/57K_*.md`.
- **Sprint 60B — Event Identity Activation** (PR #60, merged to main 2026-06-18; behind `pi.identity`, default **OFF** → flag-OFF bundle byte-identical to prod). A reader, not an engine: projects the human-intelligence fields *already captured at intake* (`meaning_why` · `honoree` · `honoree_story` · `must_have_moment` · `feeling_words`, written top-level by intake `onPersist` App.js:28514) into the planning surface. Surfaces: **"What this is"** block in CommandCenter Overview (statement · intent · the one thing that must happen · what success looks like) and **"Did the must-have happen?"** row in post-event `OutcomeCapture` (→ existing `event.outcomes.mustHave`). No new engine/schema/migration/workflow. 11 unit tests; suite 187/187; `check:migrations` ✓. Post-merge QA: flag-OFF/ON graceful-degrade + gating + zero console errors (desktop+mobile). Doc: `engine-audit/SPRINT_60B_EVENT_IDENTITY.md`. **Next: Sprint 60C — Planning Alignment (audit-first): where should Event Identity influence existing recommendations/decisions/memory/vendor/venue/experience intelligence? Expression before expansion — do NOT build a Human Intelligence / Stakeholder / Outcome engine.**
- The Next-Step Spine (L1 + L4); the floating compose FAB was killed (compose moved to the Studio "New message" nav item); de-emojied composer; dismissible dev badge.
- Setup-tracker unification: `getStudioSetup(profile)` is the single source (3 essentials + 6 recommended); Home + Settings denominators agree.
- L1 audit fixes: the "N messages waiting" comms band is Home-only; one onboarding card ("Let's get you set up · 0/5"); Pipeline restructured to a funnel-summary bar + active-events card grid (mobile defaults to the Active lane); L1 Calendar defaults to "Upcoming · all events" agenda; L4 event Calendar defaults to a **"Runway"** countdown; demo Home greeting is honest (no fake urgency).
- Messages: thread-list void end-cap; 2-pane threshold raised to 1280; single attention band (Spine suppressed there, the wait-band is the local hero); clamped wait-band; "Messages" naming everywhere; mobile header de-dup; wide bubble cap; inline contact-info editor in the conversation header.
- Settings: widened drawer (720px); quiet "Signed in as" identity row; condensed NO-GUESSWORK legend.
- Daily "Brief me" summary → **OpenAI backend** (`lib/aiProxy.js` → `callAiFeature('event_brief')`). Calendar timing fix (Upcoming starts today, no past milestones). Event back-link opens the linked client (was a label/action mismatch). Readiness sparkline hover tooltip.

## OPEN THREADS (pick up here)
0. **Identity Invite / RSVP — live, but verify + fast-follows:**
   - **End-to-end smoke (do this first):** in the LIVE app create a fresh event → open its `?rsvp=<22-char token>` link in an incognito browser → submit an RSVP → confirm the `rsvp_submissions` row in Supabase and that the host's reload merges it. (Built + deployed, not yet smoke-tested with a real cross-browser guest.)
   - **AppSec fast-follows (board-flagged, not blockers):** backfill any *non-demo* short rsvpCodes to 22-char tokens; confirm `pg_cron` is enabled so `purge_old_rsvp_submissions(90)` actually schedules; move the per-process rate-limiter to Redis before running >1 Render worker; require `name`+`rsvp` on POST + a per-code submission ceiling (roster-spam); add a TTL/purge for the localStorage outbox (it holds allergy/health free-text).
   - **Toward true 10+ (design, not built):** brand **signature mechanic** — make the embossed countdown numeral the brand spine, kill the generic lozenge-rule masthead, and resolve the glossy-dome-vs-letterpress material conflict on the *neutral* (non-sacred) event marks; the luxury director's last-mile (make the card's occlusion shadow agree with the deckle edge).
   - **Other culture marks:** only Juneteenth got the accurate flag-true `SacredMark`. The other glass-shape glyphs (crab/key/spade/wine/…) in `glassIcons.js` + the L2/L3 card glass shapes still use the older lone treatment — bring culturally-specific ones to the same bar.
1. **AI rewire to backend** — 7 of 9 AI sections still call `askClaude` (Anthropic frontend BYOK key). Only the **daily brief** + **message drafts** use the OpenAI backend. Backend `AI_FEATURES` (lib/aiProxy.js) has only 4: `event_brief`, `vendor_followup`, `document_summary`, `checklist_help`. Remaining to rewire (proposed feature → in the inventory below): vendor contact-log summary (`document_summary`), client proposal draft (`vendor_followup`), notes drafting — vendor + client (`checklist_help`), budget suggestion (`document_summary`), vendor outreach personalization (`vendor_followup`), Event-Day-Schedule draft a.k.a. `draftFullROS` (`checklist_help`), AI Readiness Copilot (`event_brief`). Each call site gates on `if (!aiKey) return;` — change to also try `isAiProxyConfigured()`. **Decision pending:** route all onto the existing 4 features (works, slightly generic flavor) vs. add dedicated backend features (`proposal`/`budget`/`schedule`/`readiness`) for best output quality.
2. **Sparkline** — `ReadinessSparkline` (App.js ~4256) shows readiness-over-time on event cards. Board take: the insight is valuable, the tiny chart isn't (illegible; fails grandmother test). Recommendation pending approval: replace with a worded trend chip ("↘ Slipping 8 pts" / "↗ Improving" / "→ Steady" + current %).
3. **Pipeline in-app explainer** — add a one-line purpose per lane + a short "what this is," so a new planner understands the booking funnel (Inquiry → Proposal → Contracted → Deposit → Active → Complete).
4. **Calendar filters** — add filters by event type, client, and item kind (milestones / payments / event days) to the Master Calendar (App.js `MasterCalendarView` ~23511).
5. **Optional cleanup** — rename the internal `'Run of Show'` route key + `draftFullROS`/`EventDayBar` vars to match the "Event Day Schedule" UI (leave `event.ros` data field to avoid a persistence migration). Cosmetic; small routing-regression risk.

## Memory
Persistent notes: `/Users/toddwillis/.claude/projects/-Users-toddwillis/memory/` (`MEMORY.md` is the index — read it first). Key entries: `feedback_attention_system`, `project_next_step_spine`, `project_calendar_rework`, `feedback_ngw_design_standard`, `feedback_bless_threshold`, `feedback_prod_build_env_strip`, `feedback_screenshot_storage`.

---
Start by confirming the dev server is running and capturing the current state of whatever surface you're asked about. Tell me your plan before large changes.

---

## Open backlog as of 2026-06-28 (after the big 2026-06-28 ship: advance engine, haptic/sound, composite fix, crab+paper, beverage→budget, Capacity parity, supplies options, dietary, Decisions board — all deployed)

Ordered by the owner's stated priority. Items 1–2 are the headline; 3–9 are queued.

1. **Food SOURCING choice → "what's left to do" tasks** (THE headline open item). Today `whenChoice` reshapes the food SPREAD + (new) beverage budget, but NOT the host task list. Root cause: `whenChoice` is never applied to the task layer; playbook `tasks`/`milestones` are NOT projected into the host checklist (`ChecklistGenerator` reads the STATIC `event.timeline`); host events seed `timeline:[]`. Fix = make the host "what's left" a live projection of playbook tasks filtered by `event.foodChoices` via the SAME `whenChoice`/`pickFor` predicate (export it from playbooks/index.js, reuse for purchases + tasks). Author choice-split crab tasks (steam-yourself → "rent a rack pot + propane"; order-steamed → "lock a hot pickup slot"). Deep + delicate — give it a fresh full context.

2. **Three design tweaks** (owner flagged): (a) dietary auto-pull is one-tap by design — owner may want it SILENT/auto-merge; (b) Capacity omits a literal "10% spare" line (no 10% factor in data — currently grounded in real factors) and supplies `alternatives` are engine-derived not authored; (c) Decisions board shows ALL of a type's decisions uncapped (Dinner Party = 6) — may want a calm cap.

3. **QA polish nits (render pass 2026-06-28)**: (a) crab reads SMALL in the InviteDome vs Figma 1991:32 — scale up; (b) Decisions count-lock card eyebrow "LOCK YOUR FINAL GUEST COUNT" duplicates the title verbatim — change eyebrow (e.g. "NEEDS YOU"); (c) Capacity hero mixes "Set for up to 22–34" (confirmed band) with "Service for 40" (invited) — speak one count.

4. **Guests tab consolidation** (board audit found): count-lock ×2 (hero stepper + "Just need a headcount?" panel), nudge ×2, responder-summary ×3. Consolidate to one count action, one nudge, one summary; fix workflow order. Substantial UI refactor.

5. **Google Places address search on WHERE** — lib `src/lib/maps.js` (`attachAutocomplete`) + key `REACT_APP_GOOGLE_MAPS_KEY` exist but UNWIRED. Wire to the WHERE input. NOTE: deploy env-strip blanks the key in prod bundle — confirm the unwired-in-prod behavior is graceful.

6. **Create flow: scroll to "What I'll set up for {type}" preview** after type selection. Add a `ce-setup-preview` anchor id + scroll-into-view at the create seam.

7. **Distinct per-type icons in EventTypeBrowse** — many types fall back to a generic mark via `evtIdentity(t).icon`. Add real per-type glyphs.

QA harnesses to reuse: `review-artifacts/_qa_newsurfaces.mjs` + `_qa_crops.mjs` (AUTH_BYPASS side build in `build-verify/`, seeds a Crab Feast host event, screenshots cover + Plan surfaces to `review-artifacts/qa-2026-06-28/`).
