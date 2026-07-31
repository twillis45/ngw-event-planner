# 02 — PRODUCT MAP (current state)

**Repo:** `/Users/toddwillis/Code/ngw-event-planner/demo` (git root is `demo`)
**Branch:** `grounded-decision-surface` · **Commit:** `097ce84e`
**Working tree audited as-is** — 2 modified files (`hostv2/src/HostShellV2.jsx`, `src/lib/__tests__/heroComposition.test.js`). The `HostShellV2.jsx` diff is a 1-line copy suppression at :5642 (solemn-event overdue grammar); it does not change any surface's existence or reachability.

**No runtime verification was performed.** Every status below is derived from source. See *Method and limits*.

---

## 0. Two front-ends, one engine layer

| | CRA app | hostv2 prototype |
|---|---|---|
| Entry | `src/index.js:88` → `src/App.js:45635` | `hostv2/src/main.jsx:36` → `HostShellV2.jsx:564` |
| Build | `react-scripts` (`package.json:13`) → `build/` | Vite (`hostv2/vite.config.js`) → `hostv2/dist/` |
| Deploy base | `homepage: .../ngw-event-planner` (`package.json:5`), `gh-pages -d build` (`package.json:17`) | `base: '/ngw-event-planner/hostv2/'` (`hostv2/vite.config.js:24`) |
| Size | `src/App.js` = 46,988 lines | `HostShellV2.jsx` = 15,639 lines |
| Frozen? | Yes — CLAUDE.md declares `src/App.js` donor-only since 2026-07-16 | No — active surface |
| Engines | owns them (`src/lib/**`, `src/CommandCenter.jsx`) | imports the same ones via `@app` alias (`hostv2/vite.config.js:30`; `HostShellV2.jsx:10-161`) |

hostv2 is **not** a fork of the engines — it re-uses `eventPlan()`, `identityStatement()`, `resolveRoute()`, `doItForMe`, `decisionMemory`, weather, travel, seating, crab, procurement etc. directly from `../src`. The two apps share `localStorage` keys on a common origin (`hostv2/src/eventPool.js:26` reads the CRA's `ngw-events`).

**Deployment evidence in-repo (build artifacts, not proof of a live site):** `build/` (contains `hostv2/`, `hostv2-manifest.json`), `hostv2/dist/assets/HostShellV2-974d773d.js` (855 KB, dated 2026-07-30 17:12), `.github/workflows/pages.yml` (publishes the `gh-pages` branch), `.github/workflows/checks.yml` (jest + Playwright on the built bundle). I did not fetch any URL.

---

## 1. CRA app — how routing works

**There is no router.** No `react-router`, no `<Route>`, no history-based navigation. Navigation is three layered mechanisms:

1. **URL query params, read once at render, as early-return branches** in `App()` — `src/App.js:46695-46755`. Order: `?observatory` → `?rsvp` → `?vendor` → `?portal` → `?intake` → `?mode=event-day`. Each returns a whole different tree.
2. **State selection** — `activeId` / `activeClientId` decide event vs. client vs. home (`src/App.js:46756`, `:46876`, `:46911`). No URL changes; a refresh returns to Home (except via the `ngw-last-event` key).
3. **A `tab` string inside the event shell** — `PLANNER_TABS` (`src/App.js:38539-38553`), rendered as a long `{tab === 'X' && …}` ladder (`src/App.js:44484-44780` planner, `:43702-43785` host shell). Deep links are `initialNav = {tab, focusField, vendorSection, taskId, …}` normalized by `normalizeEventTabRoute` (`src/App.js:43597`).

Two different event shells exist behind a flag: `HostEventShell` (`src/App.js:43533`) for host events when `hostShellOn()` (default ON), else `EventPlanner` (`src/App.js:43828`).

Sub-apps mount **before** `App` in `src/index.js` and bypass it entirely: `?slice=…` harnesses (`src/index.js:31-37`), `?admin=1` console (`src/index.js:42`), `?observe=1` observer (`src/index.js:51`), alpha gate (`src/index.js:57`).

### CRA surface table

| Surface | Route | Primary user | Purpose | Main inputs | Main output/action | Persistence | Current status | Evidence |
|---|---|---|---|---|---|---|---|---|
| First-run onboarding (account type) | state `showWelcome` at Home | New user | Ask host vs. planner instead of inferring | none | sets `profile.accountType` | `ngw-profile` localStorage | Implemented but not runtime-verified | `src/App.js:45602`, `:46259`, `:46911` |
| Host Home (portfolio) | Home when `accountTypeOf==='host'` | Host | Event list + day-of focus takeover + setup progress | `events`, `profile` | select event, new event, settings | `ngw-events`, `ngw-profile` | Implemented but not runtime-verified | `src/App.js:23308`, `:46916` |
| Host Setup Wizard | modal inside Host Home | Host | Stepwise event scaffolding | event fields | patches event | via `ngw-events` | Implemented but not runtime-verified | `src/App.js:22453`, `:24288` |
| Planner Dashboard (CRM) | Home when not host | Planner | Clients + events pipeline, attention queue, calendar notes | `clients`, `events`, `calNotes` | select client/event, compose, seed samples | `ngw-events`, `ngw-clients` + Supabase | Implemented but not runtime-verified | `src/App.js:24354`, `:46928` |
| Client Detail | state `activeClientId` | Planner | One client, their events, intake | `clients`, `events` | link/unlink events, intake | localStorage + Supabase | Implemented but not runtime-verified | `src/App.js:26947`, `:46879` |
| New Event modal | `showNew` from Home/Client | Both | Create an event, estimate budget | typed name/type/date/count | appends to `events` | `ngw-events` | Implemented but not runtime-verified | `src/App.js:11884`, `:46955` |
| Editorial Cover (event arrival) | first open of a host event per session | Host | Ceremonial arrival before the shell | event, profile | "Open the event" | `coverSeen` in memory only | Implemented but not runtime-verified | `src/App.js:29614`, `:46765-46777` |
| Assemble Reveal | overlay after create | Host | "Your event, understood" — engine-derived reveal | `buildAssembleRevealStages` | open plan / handle blocker | none (transient) | Implemented but not runtime-verified | `src/App.js:23095`, `:46663` |
| Command Center (Your event) | `tab==='Command'` | Both | Readiness, next-best-action, decisions, vendor/doc/health rails | `eventPlan()`, `deriveCommandCenterData()` | routes to every other tab | reads event | Implemented but not runtime-verified | `src/CommandCenter.jsx:217`, `:1662`; `src/App.js:43717`, `:44484` |
| Readiness Track + Return Narration | header on every host tab | Host | One persistent readiness bar | `getEventReadiness` | nav to weak axis | reads event | Implemented but not runtime-verified | `src/App.js:40286`, `:40353`, `:43669` |
| Next-action / recommendation surfaces | Command tab + spine + hero | Both | The "one next thing" | `selectEventNextAction`, `selectStudioCommand` | route to the fixing field | reads event | Implemented but not runtime-verified | `src/CommandCenter.jsx:1107`, `:2236`; `src/App.js:42054` (`NextStepSpine`), `:42652` (`PlanNowHero`) |
| Engine next-step card | below tab content | Both | Engine-authored next step | `EngineNextStep` | route | reads event | Implemented but not runtime-verified | `src/components/EngineNextStep.jsx`; `src/App.js:45076` |
| Planning tab (host planv2) | `tab==='Planning'` + `planV2On()` | Host | Recomposed plan: hero, decisions panel, checklist | event + decision board | lock count, set choices, reorder | `ngw-events` | Feature-flagged (default ON) | `src/App.js:43732-43768`, `src/lib/presentationNav.js:65-81` |
| Planning tab (planner) | `tab==='Planning'` + `!planV2On()` | Planner | Ops console: checklist / timeline / list views | `event.timeline` | edit tasks | `ngw-events` | Implemented but not runtime-verified | `src/App.js:40570` (`EventPlanningTab`), `:44619` |
| Checklist generator | inside Planning | Both | Playbook-driven checklist build | playbooks | writes `timeline` | `ngw-events` | Implemented but not runtime-verified | `src/plan/ChecklistGenerator.jsx`; `src/App.js:225`, `:40702` |
| Timeline builder | inside Planning | Planner | Timeline editing | `event.timeline` | writes timeline | `ngw-events` | Implemented but not runtime-verified | `src/plan/TimelineBuilder.jsx`; `src/App.js:40727` |
| Host Decisions panel | Planning rail | Host | Open calls with grounded defaults | decision board | lock count / set choice / reorder / host experience | `ngw-events` (`decisionPins`, `foodChoices`) | Implemented but not runtime-verified | `src/App.js:42951`, `:43749`, `:44634` |
| Decisions tab (planner) | `tab==='Decisions'` | Planner | Decision + approval center | event decisions | approve/decide | `ngw-events` | Implemented but not runtime-verified | `src/App.js:39897` (`EventDecisionsTab`), `:40244` (`DecisionApprovalCenter`), `:44582` |
| Decision Memory capture | modal on any tab | Both | Record *why* in the host's words | `promptDecision(cfg)` | appends `event.decisionMemory[]` | `ngw-events` | Feature-flagged (`pi.memory`, default ON) | `src/App.js:42195` (`RationaleModal`), `:43860`, `:44472`; `src/lib/decisionMemory.js:30` |
| Decision History + Outcome capture | inside Event Details tab | Both | Read back decisions, capture outcomes | `getDecisions`, `getEventOutcomes` | set outcomes | `ngw-events` | Implemented but not runtime-verified | `src/App.js:42221`, `:42286`, `:41717-41719` |
| Vendors tab / cockpit | `tab==='Vendors'` | Both | Vendor list, readiness, COI, deposits, briefs, promises | `event.vendors` | status/payment/doc writes, brief link | `ngw-events` + vendor bank | Implemented but not runtime-verified | `src/App.js:38695` (`EventVendorsTab`), `:44556`, `:43784` |
| Add Vendor wizard + success | inside Vendors | Both | Guided vendor creation, bank save | typed vendor | appends vendor, writes bank | `ngw-events`, `preferred_vendors` | Implemented but not runtime-verified | `src/App.js:38979`, `:39446`, `:39523` |
| Vendor planning workspace | inside Vendors | Planner | Cross-vendor planning | vendors | edits | `ngw-events` | Implemented but not runtime-verified | `src/plan/VendorPlanningWorkspace.jsx`; `src/App.js:38869` |
| Vendor import wizard | inside Vendors/Settings | Planner | CSV vendor import | CSV | appends vendors | `ngw-events` | Implemented but not runtime-verified | `src/components/VendorImportWizard.jsx`; `src/App.js:29` |
| Budget tab | `tab==='Budget'` | Both | Planned / committed / spent, health bar | `event.budget` | edit rows, mark paid, Stripe fee link | `ngw-events` | Implemented but not runtime-verified | `src/App.js:27975` (`Budget`), `:27489` (`BudgetHealthBar`), `:44505` |
| Host Spending Plan | Budget tab (host) | Host | Food-folded host money view | `foodPlan`, `budget`, price factor | set total budget, nav | `ngw-events` | Implemented but not runtime-verified | `src/App.js:27629`, `:28319` |
| Guests tab | `tab==='Guests'` | Both | Roster, RSVP, meals, counts, helper roles | `event.guests` | add/edit guests, set count, invite style | `ngw-events` | Implemented but not runtime-verified | `src/App.js:31892`, `:43718`, `:44511` |
| Guest import wizard + history | inside Guests | Both | CSV/platform import with undo | CSV rows | appends guests, batch record | `ngw-events`, `GUEST_IMPORT_BATCHES_KEY` | Implemented but not runtime-verified | `src/components/ImportWizard.jsx`, `ImportHistoryDrawer.jsx`; `src/App.js:32235`, `:32242` |
| Seating | `tab==='Seating'` | Planner | Tables + assignment (drag) | guests, tables | writes assignments | `ngw-events` | Implemented but not runtime-verified | `src/App.js:33121`, `:44540` |
| Run of Show / Event Day Schedule | `tab==='Event Day Schedule'` | Both | The day's timed program | `effectiveRos(event)` | edit moments, times, owners | `ngw-events` | Implemented but not runtime-verified | `src/App.js:34684` (`RunOfShow`), `:34269` (`HostRunOfShowTimeline`), `:43769`, `:44691` |
| Day-of "Now" / "Arrivals" | `tab==='Now'` / `'Arrivals'`, **only when `dayMode`** | Both | Live day command + vendor arrivals | ros, vendors, alerts | mark arrived / done | `ngw-events` | Partial — reachable only when `dayMode` is true (event date === today, or explicit `event.dayMode`) | `src/App.js:44767`, `:44773`, `:38145`, `:38328`; gate at `:43556` |
| Calendar / Master calendar | `tab==='Calendar'` | Planner | Dated view of tasks, arrivals, event | timeline, vendors | nav | reads event | Implemented but not runtime-verified | `src/App.js:35663`, `:36070`, `:44690` |
| Agenda builder | `tab==='Agenda'` | Planner | Meeting agenda | agenda array | edits | `ngw-events` | Implemented but not runtime-verified | `src/App.js:37397`, `:44728` |
| Documents tab | `tab==='Documents'` | Both | Contracts/COI/invoices, doc readiness | `event.documents` | upload / open vendor | Supabase Storage (`event-files`) + `ngw-events` | Partial — upload requires Supabase configured | `src/App.js:40762`, `:43785`, `:44658`; `src/lib/storage.js:16`, `:30` |
| Event Details tab | `tab==='Event Details'` | Both | Venue/date/identity form + location assist | event fields | patches event | `ngw-events` | Implemented but not runtime-verified | `src/App.js:41186`, `:43783`, `:44672` |
| Crew tab | `tab==='Crew'` | Planner | Studio crew manifest + contact | `team` | edits | `ngw-team` state | Implemented but not runtime-verified | `src/App.js:41925`, `:44680` |
| Communication tab (messages) | `tab==='Communication'` | Planner | Client/vendor/team threads | `event.commClient`, vendor logs | send / draft / mark handled | `ngw-events` + comm API when configured | Partial — real send needs `REACT_APP_API_BASE_URL` | `src/App.js:39629` (`EventCommTab`), `:44739`; `src/plan/CommunicationHub.jsx`; `src/lib/commApi.js:14` |
| Global Compose | floating, every screen | Planner | Cross-event compose | events, clients, profile | appends message | `ngw-events` | Implemented but not runtime-verified | `src/App.js:20986`, `:46970` |
| Communication rail | inside event | Planner | Entry to messages | event comms | opens Communication | reads event | Implemented but not runtime-verified | `src/App.js:41736`, `:45211` |
| Client Intake (in-event) | `tab==='Client Intake'` | Planner | Structured intake | intake fields | patches event/client | `ngw-events` | Implemented but not runtime-verified | `src/App.js:39863`, `:44545`; `src/plan/ClientIntakeFlow.jsx` |
| Host Settings | `showProfile` when host | Host | Name, area, memory, sample data | profile | patches profile | `ngw-profile` + Supabase `studio_settings` | Implemented but not runtime-verified | `src/App.js:17337`, `:46960` |
| Profile / Studio Settings (planner) | `showProfile` when planner | Planner | Studio identity, connections, plans, vendor bank, sample data | profile | patches profile, upgrade | `ngw-profile` + Supabase | Implemented but not runtime-verified | `src/App.js:17598`, `:46961` |
| Plan / upgrade (subscription) | Settings → Plans | Planner | Tier switch + upgrade | `PLANS`, email | Stripe subscription session, else `mailto:` fallback | server-side | Partial — real checkout only when `REACT_APP_API_BASE_URL` set | `src/App.js:19113-19124`; `src/lib/stripeApi.js:10`, `:59` |
| Client payment / fee checkout | Budget | Planner | Take a client payment | fee row | Stripe checkout session + verify | `ngw-events` (`stripeSessionId`) | Partial — same config gate | `src/App.js:28084-28120`; `src/lib/stripeApi.js:25` |
| Members modal | Settings → Members | Planner | Team membership | Supabase | invite/list | Supabase | Partial — needs Supabase | `src/components/MembersModal.jsx:48`; `src/App.js:46966` |
| Export menu | inside event | Planner | Export plan/lists | event | file download | none | Implemented but not runtime-verified | `src/components/ExportMenu.jsx`; `src/App.js:44919` |
| Migration modal | on first sign-in with orphan local data | Both | Move localStorage data to cloud | local snapshot | writes to Supabase | Supabase | Implemented but not runtime-verified | `src/App.js:45472`, `:46640` |
| Auth gate | wraps every planner route | Both | Supabase auth wall | Supabase session | sign-in | Supabase | Feature-flagged bypass available | `src/components/AuthGate.jsx:83`, `:226`; `src/App.js:46692` |
| **Public: RSVP** | `?rsvp=CODE` | Guest | Self-RSVP, resolves from backend if not local | code | POST RSVP or offline outbox | backend + `ngw-rsvp-queue-*` | Partial — server resolve needs API base | `src/App.js:31734`, `:46710` |
| **Public: Vendor brief** | `?vendor=TOKEN` | Vendor | Read-only brief (short code or base64) | token | none (read) | none | Partial — short-code path needs backend | `src/App.js:31682`, `:46725` |
| **Public: Client portal** | `?portal=TOKEN` | Client | Read-only client view | token | none | none | Implemented but not runtime-verified | `src/App.js:14845`, `:46730` |
| **Public: Intake form** | `?intake=TOKEN` | Client | Submit intake | token + form | POST intake | backend | Implemented but not runtime-verified | `src/App.js:15188`, `:46735` |
| Embed mode | `?embed=1` | Client | Chromeless embed of intake | param | — | none | Implemented but not runtime-verified | `src/App.js:15192` |
| **INTEL Observatory** | `?observatory=1` | Internal | Host-intelligence maturity readout | profile, events | close | none | Flag-only — no nav points here | `src/App.js:46703`; comment at `:46700` states "no user nav points here" |
| **Admin / Support console** | `?admin=1` | Admin | Support console, research mission control, playbook campaigns | Supabase (role-gated) | admin ops | Supabase | Flag-only, role-gated | `src/index.js:42-45`, `:92-97`; `src/admin/AdminConsole.jsx` |
| **Event Day Mode harness** | `?mode=event-day[&event=ID]` | Internal | Day-of escalation demo | events | — | none | Dead or unreachable **in production** — `process.env.NODE_ENV !== 'production'` in the gate; source comment says it ships fabricated escalation data | `src/App.js:46744` |
| **Slice: vendor escalation** | `?slice=vendor` | Internal | Sprint-10 lab | synthetic | — | none | Dead or unreachable in production — `devSlices` gate | `src/index.js:29`, `:32` |
| **Slice: desktop density** | `?slice=desktop-density` | Internal | Multi-escalation proving ground | synthetic | — | none | Dead or unreachable in production | `src/index.js:33` |
| **Slice: debrief** | `?slice=debrief` | Internal | Operational-memory surface | synthetic | — | none | Dead or unreachable in production | `src/index.js:34` |
| **Slice: event-day** | `?slice=event-day` | Internal | Event-day graft, no auth | synthetic | — | none | Dead or unreachable in production | `src/index.js:35` |
| **Slice: orchestration** | `?slice=orchestration` | Alpha tester | Behavioral orchestration proving ground | events | — | none | Flag-only (deliberately production-reachable) | `src/index.js:36`, comment `:28` |
| **Alpha tester gate** | `?slice=orchestration&observe=1` | Alpha tester | Register → consent → session → feedback → export | tester input | writes feedback | localStorage | Flag-only | `src/index.js:57-60`; `src/AlphaTesterGate.jsx` |
| **Observer harness** | `?observe=1` | Internal | Click/hesitation recorder | DOM events | Ctrl+Shift+L transcript | memory | Flag-only | `src/index.js:51`; `src/slices/observer.js` |
| **Demo tools bar** | `?demo=1` then persisted | Internal | Seed/reset demo event | — | rewrites `ngw-events` | `ngw-demo-tools` | Flag-only, persists after the param is stripped | `src/App.js:230-236`, `:23259`, `:46907` |
| **QA attendance seed** | `?qaSeed=attendance` | Internal | Seed attendance memory | — | writes memory | localStorage | Dead or unreachable in production — `NODE_ENV !== 'production'` and `qaMemorySeed.js` throws in prod as a second layer | `src/App.js:276-278` |
| Offline strip | global, when `!online` | Both | Honest offline state | `navigator.onLine` | — | — | Implemented but not runtime-verified | `src/App.js:46609` |
| Cloud sync-failed banner + retry | global | Both | Honest sync failure + flush retry | `syncState` | flush pending | localStorage queue | Implemented but not runtime-verified | `src/App.js:46617-46634` |
| Root error screen | crash during first render | Both | Recoverable crash screen | error | reload | — | Implemented but not runtime-verified | `src/index.js:67-86` |
| In-tree error boundary | wraps tab content | Both | Per-tab crash containment | error | — | — | Implemented but not runtime-verified | `src/App.js:774`, `:44470` |
| Lazy-load fallback | any lazy specialist tab | Both | "Loading…" | — | — | — | Implemented but not runtime-verified | `src/App.js:280` |
| Empty states | Command Center blocks | Both | Named empty copy | — | — | — | Implemented but not runtime-verified | `src/CommandCenter.jsx:3501` |
| Toast / Undo toast | global | Both | Success + undo | — | undo write | — | Implemented but not runtime-verified | `src/App.js:46677-46678` |

---

## 2. hostv2 — how routing works

Confirmed: **`stage` + `sheet`, exactly as described.**

- **Pre-mount URL branches** in `hostv2/src/main.jsx`: `?vendor=…` hard-redirects to the legacy CRA brief page (`main.jsx:13-14`) — hostv2 renders **no** vendor-brief surface of its own; `?rsvp=CODE` code-splits to `InviteV2` (`main.jsx:39-41`); otherwise `HostShellV2`.
- **`stage`**: one of `create | plan | day | after` (`HostShellV2.jsx:565`). Four stage bodies at `:5148`, `:5519`, `:7781`/`:8012`, `:8428`.
- **`sheet`**: `{kind, focus, vendorSection?, …}` (`HostShellV2.jsx:2541`) rendered as one shared modal container with 29 `kind` branches. One a11y/focus-trap/Escape implementation serves all of them (`:2667-2716`).
- **Route resolution is extracted and shared**: `routeSheet()` is a thin executor over the pure `resolveRoute()` in `src/lib/routeResolver.js` (`HostShellV2.jsx:3287-3311`). `resolveRoute` returns `stage:plan` / `stage:day` / a sheet kind, or `null`.
- **No URL is ever written for stage/sheet.** A refresh returns to the boot event's `plan` stage (`:565`, `LS_LAST_EVENT` restores the *event*, not the position).

### Sheet kinds (29) and their doors

`air · ask · budget · costshare · crabs · date · decisions · draft · events · food · ground · guests · help · lodging · meaning · nav · pass · qr · rain · risks · seating · sections · settings · space · sweep · tasks · thanks · vendors · venue`

Guaranteed doors: the **Sections directory** (`:11463`, opened from the always-present header button at `:5107`), the **command palette** (⌘K / header search, `:5470-15500`), the **Nav sheet** (`:11805`), and the conditional Plan "quiet index" rows (`:7600-7740`).

### hostv2 surface table

| Surface | Route | Primary user | Purpose | Main inputs | Main output/action | Persistence | Current status | Evidence |
|---|---|---|---|---|---|---|---|---|
| Boot splash | pre-app overlay | Host | Brand moment; full film first boot / after 21d, else ~1s | `LS_SPLASH_SEEN`, profile `splashLastSeen` | dismiss | `ngw-v2-splash-seen` + session fallback + cloud profile | Implemented but not runtime-verified | `HostShellV2.jsx:629-700` |
| First-run welcome gate | `welcome` state | New host | Orientation before a sample event | `shouldShowWelcome()` | → `create` stage | `LS_WELCOMED` | Implemented but not runtime-verified | `:574-590`; `src/lib/welcomeGate.js` |
| Create stage (intake) | `stage='create'` | Host | Natural-language event capture + voice input + type picker | typed text, `smartParseEvent` | mints a custom event | `ngw-hostv2-custom-events` | Implemented but not runtime-verified | `:5148-5200`, `:791`, `:951` |
| Create Reveal (the spine) | inside create, `revealed` | Host | "Your event, understood" — engine-derived staged reveal | `buildAssembleRevealStages` | Open your plan / Share invite / Change an answer | none (transient) | Implemented but not runtime-verified | `:5438-5510`, `:945` |
| Plan stage — hero / grounded ask | `stage='plan'` | Host | The one ask, pre-proposed, with "Why:" and provenance | `eventPlan()`, `heroAskFor` | accept/change in place, or route | `ngw-hostv2-custom-events` / `LS_PATCH(id)` | Implemented but not runtime-verified | `:5519`, `:5714` (ask), `:2442` |
| Plan stage — action queue / path rows | plan, below hero | Host | Queue positions 2+ folded below the fold | `eventPlan().queue` | route to the exact row | reads event | Implemented but not runtime-verified | `:5890-6600` |
| Persistent "Next" bar | plan, when hero off-screen | Host | Pinned next action | queue | scroll to hero / go to Day | — | Implemented but not runtime-verified | `:15433-15461` |
| Quiet index (section rows) | plan, conditional | Host | Named doors that appear only in needs-you states | rollups | open the matching sheet | reads event | Partial by design — rows are state-gated; the Sections sheet is the unconditional door | `:7582-7740` |
| Heads-up / risks lane | plan | Host | Worries the plan is watching | risk engine | open `risks` | reads event | Implemented but not runtime-verified | `:6673` (lane), sheet body at `:2266` |
| Day-before plan card | plan, 0–2 day window | Host | `lib/dayBefore` | dates | route | reads event | Implemented but not runtime-verified | `:6679`, engine at `:4698` |
| Weather pill | plan, when `wxImpact` | Host | Phase-scoped weather impact | `lib/weather` | open rain plan | `ngw-hostv2-wxnotify-<id>`, `wxseen` | Partial — needs `REACT_APP_OPENWEATHER_KEY` / API base | `:15336`, `:1949-1971`; `src/lib/weather.js:19` |
| Set-aside / snooze shelf | plan | Host | Visible, undoable snoozes | `lib/snooze` | un-snooze | event patch | Implemented but not runtime-verified | `:6881`; import `:76` |
| The Day — live | `stage='day'` && `days===0` && ros timed | Host | Wall-clock run of show, day alerts | `effectiveRos`, `lib/dayAlerts` | mark done, advance | event patch | Partial — the live variant requires the event to be **today** with timed ROS | `:4933`, `:7781` |
| The Day — walkthrough/preview | `stage='day'` otherwise | Host | Walk it / full agenda | ros | mark done | event patch | Implemented but not runtime-verified | `:8012`, `:2729` |
| After stage | `stage='after'` | Host | Honest money wrap, lessons, recap, album | budget, `lib/eventMemory` | write lesson/recap, start thank-yous | event patch + `eventMemory` | Implemented but not runtime-verified | `:8428`, `:1779-1787` |
| Thank-you run | sheet `thanks` | Host | Sequenced thank-you drafts | guests, `draftThankYou` | per-person drafts | — | Implemented but not runtime-verified | `:12351`, door at `:8610` |
| Guests sheet | sheet `guests` | Host | Roster, RSVP replies, meals, helper roles, CSV import, invite rules | `event.guests`, `csvParsers` | add/edit, import, undo batch | event patch + `GUEST_IMPORT_BATCHES_KEY` | Implemented but not runtime-verified | `:2554`, `:3569-3580`, `:3572` |
| Seating sheet | sheet `seating` | Host | List + floor-plan views, auto-assign | `buildSeatingPlan` | assign/rename/resize tables | event patch | Implemented but not runtime-verified | `:2728`, `:2737`; import `:61` |
| Food & shopping sheet | sheet `food` | Host | Menu, quantities, store run, prices with vintage tag | `foodPlan`, `PRICE_TABLE_META` | mark bought, add item, lock cost | event patch | Implemented but not runtime-verified | `:1729-1731`, `:20` |
| Crab order sheet | sheet `crabs` | Host | Bushels/pickers/crab house | `buildCrabPlan`, `buildCrabProcurement` | set order | event patch | Partial — renders only when `crab.relevant` | `:1804-1805`, `:7622`; import `:11`,`:15` |
| Budget sheet | sheet `budget` | Host | Planned / committed / spent, propose-don't-ask number | `money` | agree or change the number | event patch | Implemented but not runtime-verified | `:1712`, `:2539`, `:2280` |
| Cost-share sheet | sheet `costshare` | Host | Who pays for what | `costSharingSummary` | set splits | event patch | Partial — door only when `event.costSharing` | `:2989-2991`, `:7732` |
| Vendors sheet | sheet `vendors` | Host | Bookings, deposits, COI, documents, promises, arrival, QR brief | `buildVendorPlan`, rollup | status/payment/doc writes, brief QR | event patch | Implemented but not runtime-verified | `:2582-2614`, `:14257` |
| Vendor reply parser | inside vendors | Host | Paste a vendor reply → diff → apply | `parseVendorReply`, `buildReplyDiff` | patches vendor + log | event patch | Partial — LLM path needs `isAiProxyConfigured()`; deterministic parse otherwise | `:173-260`; imports `:26-27`; `src/lib/aiProxy.js:8` |
| Vendor sweep (reconfirm) | sheet `sweep` | Host | Reconfirm every vendor at once | vendors | queued drafts | — | Implemented but not runtime-verified | `:12163`, doors at `:7204`, `:7210` |
| Tasks / checklist sheet | sheet `tasks` | Host | Every step in order, due labels | `event.timeline`, `taskLead` | check off | event patch | Implemented but not runtime-verified | `:2541` model; import `:72`, `:90` |
| Decisions sheet | sheet `decisions` | Host | Open calls with grounded defaults, deferred shelf | `decisionBoard` | settle in a tap | event patch | Implemented but not runtime-verified | `:8684` |
| Decision Memory capture | inline `whyText` | Host | Record *why*, optional | `makeRecord`/`appendDecision` | appends `decisionMemory[]` | event patch | Implemented but not runtime-verified | `:1446-1468`, `:1449`; import `:105` |
| Risks sheet | sheet `risks` | Host | The one risk count and its rows | risk engine | route to the fix | reads event | Implemented but not runtime-verified | `:1245-1253` |
| Rain plan sheet | sheet `rain` | Host | Weather backup | `suggestRainPlan` | write plan, draft guest note | event patch | Partial — door only when `outdoor` | `:4519`, sections gate `:11486` |
| Space, seats & helpers | sheet `space` | Host | Tables/chairs/rentals/helpers, place notes | `capacity`, `deriveHelperResponsibilities` | assign helpers, place notes | event patch | Implemented but not runtime-verified | `:1739-1747`, `:2546` |
| Lodging / travel sheet | sheet `lodging` | Host | Shortlist, unfurl a listing, pick a stay, money dates | `lodgingIntel`, `lodgingBookmarklet` | pick stay → moves money into `committed` | event patch + URL-hash payload (stripped after read) | Partial — unfurl needs `isUnfurlConfigured()`; hash intake at `:2909-2911` | `:2883`, `:2909`; imports `:79-80` |
| Getting here (air) | sheet `air` | Host | Flights, arrival times, conflicts, FAA airport ranking | `buildTravelPlan`, `AIRPORTS` | set arrivals | event patch | Partial — door only when `travel.relevant && travel.air` | `:3131`, `:3143`, sections gate `:11519` |
| Getting around (ground) | sheet `ground` | Host | Rides, pickups, who drives | `buildTravelPlan.ground` | assign rides | event patch | Partial — door only when `travel.relevant && travel.ground` | `:3046`, sections gate `:11529` |
| Make it yours (meaning) | sheet `meaning` | Host | The personal moments | `momentLibrary` | write meaning | event patch | Implemented but not runtime-verified | `:1777`, `:2570-2575` |
| Ask the Boss | sheet `ask` | Host | Question answered from the host's own numbers | `answerPlanQuestion`, orchestrator | answer + optional broader look | — | Partial — the broader-look path needs `isOrchestratorApiConfigured()`; falls back to an honest "can't take a broader look" line | `:11672`, `:11795-11798`; imports `:63-65` |
| Feeling stuck? (help) | sheet `help` | Host | Recovery path grounded in this event | event state | route to the one next thing | — | Implemented but not runtime-verified | `:11620`, door `:5129` |
| Sections directory | sheet `sections` | Host | The guaranteed labeled door to every surface | conditional flags | open any sheet | — | Implemented but not runtime-verified | `:11463-11560`, door `:5107` |
| Command palette (⌘K) | `paletteOpen` | Host | Fuzzy find events + destinations | all event pools | switch event / open sheet / stage | — | Implemented but not runtime-verified | `:2619`, `:15470-15505` |
| Nav sheet | sheet `nav` | Host | Stage segmented control + quiet rows (replaces the dock in elegant mode) | stage | set stage | — | Implemented but not runtime-verified | `:11805-11840`, door `:5542` |
| Events switcher | sheet `events` | Host | Every event: samples, device-local, cloud-synced | pools + `hydratedEvents` | switch event | `LS_LAST_EVENT` + cloud `lastEventId` | Implemented but not runtime-verified | `:11841`, doors `:5559`, `:11814` |
| Date & time sheet | sheet `date` | Host | Change the day / arrival time | date editor | patches date | event patch | Implemented but not runtime-verified | `:8641`, door `:7043` |
| Venue sheet | sheet `venue` | Host | Set/change venue with address + city autocomplete | Places API or fallback | patches venue/city | event patch | Partial — suggestions need `ngw-google-places-key` or `REACT_APP_GOOGLE_MAPS_KEY` | `:8651`, `:830`, `:450-556` |
| Draft sheet (do-it-for-me) | sheet `draft` | Host | Every generated message, with voice memory and a send queue | `lib/doItForMe` | copy / SMS / WhatsApp / email, one at a time | `ngw-hostv2-voice` | Implemented but not runtime-verified | `:3313-3340`, `:3394` |
| QR sheet | sheet `qr` | Host | Scan-to-RSVP and scan-for-vendor-brief | `qrcode` | show/share | — | Implemented but not runtime-verified | `:3411`, `:14257` |
| One-Event Pass ($39) | sheet `pass` | Host | Commerce surface | `isStripeApiConfigured()` **and** `REACT_APP_BILLING_LIVE==='1'` | Stripe hosted checkout, else honest "free in preview" | server-side | Feature-flagged — both gates required; default state is *not* charging | `:11565-11605`, `:11580` |
| You & your account (settings) | sheet `settings` | Host | Name, area, sound, plan, what it remembers, sign-in | profile, Supabase session | patch profile, magic-link sign-in, clear memory | `ngw-profile` + Supabase `studio_settings` | Partial — auth needs `isSupabaseConfigured()` | `:12225-12300`, `:1041-1060` |
| **Public: RSVP invite** | `?rsvp=CODE` | Guest | The invite + self-RSVP (separate 1,345-line chunk) | code, event pool | submit RSVP | `ngw-rsvp-queue-<id>` outbox + API when configured | Partial — server path needs `isRsvpApiConfigured()` | `hostv2/src/main.jsx:29-41`; `InviteV2.jsx`; `HostShellV2.jsx:89` |
| **Public: Vendor brief** | `?vendor=TOKEN` | Vendor | — | — | **hard redirect to the CRA brief page** | — | Dead or unreachable *in hostv2* by design — no brief surface exists here | `hostv2/src/main.jsx:13-14`; `src/lib/vendorBriefPublicUrl.js` |
| Messaging / inbox | — | Host | — | — | — | — | **Dead or unreachable — does not exist.** `resolveRoute` returns `null` for `Communication` and callers fall to a truthful toast | `src/lib/routeResolver.js:142-144`; `HostShellV2.jsx:3283-3286`, `:4105`, `:4961` |
| Admin surfaces | — | Admin | — | — | — | — | **Dead or unreachable — none exist in hostv2** (only the CRA has `?admin=1`) | absence; `src/index.js:42` is the only admin mount |
| Error boundary | wraps root | Host | Recoverable crash screen | error | — | — | Implemented but not runtime-verified | `hostv2/src/main.jsx:38`; `ErrorBoundary.jsx:8` |
| Chunk-load failure state | root | Host | "Couldn't load — please refresh." | import failure | — | — | Implemented but not runtime-verified | `hostv2/src/main.jsx:42-45` |
| Loading / empty / success states | throughout | Host | Calm empty copy, toasts, undo | — | — | — | Implemented but not runtime-verified | e.g. `:8000` (`day` untimed copy), toast at `:4105`, undo at `hostv2/src/styles.css:958` |

---

## 3. Feature flags — every one, where read, what it gates

### 3a. URL-param flags — CRA

| Flag | Read at | Gates | Default |
|---|---|---|---|
| `?rsvp=CODE` | `src/App.js:46696`, `:46710` | Public RSVP route (whole tree) | off |
| `?vendor=TOKEN` | `src/App.js:46697`, `:46725` | Public vendor brief | off |
| `?portal=TOKEN` | `src/App.js:46698`, `:46730` | Public client portal | off |
| `?intake=TOKEN` | `src/App.js:46699`, `:46735` | Public intake form | off |
| `?observatory=1` | `src/App.js:46703` | INTEL Observatory (no nav points to it) | off |
| `?mode=event-day` (+`&event=ID`) | `src/App.js:46744` | EventDayMode harness; **AND-ed with `NODE_ENV !== 'production'`** | off |
| `?embed=1` | `src/App.js:15192` | Chromeless embed of the intake form | off |
| `?demo=1` / `?demo=0` | `src/App.js:230-236` (module init, pre-React) + `:23254` | Seeds a full demo event into `ngw-events`, sets `ngw-demo-tools`, strips the param; `demoToolsOn()` then reads the localStorage key forever | off; **sticky once set** |
| `?qaSeed=attendance` | `src/App.js:276-278` | QA attendance seed; AND-ed with `NODE_ENV !== 'production'` | off |
| `?slice=vendor\|desktop-density\|debrief\|event-day` | `src/index.js:24`, `:32-35` | Proving-ground slices; AND-ed with `devSlices` (`NODE_ENV !== 'production'`) | off |
| `?slice=orchestration` | `src/index.js:36` | Orchestration slice — **deliberately production-reachable** | off |
| `?observe=1` | `src/index.js:25`, `:51` | Click/hesitation observer; with `slice=orchestration` also mounts the Alpha Tester Gate (`:57`) | off |
| `?admin=1` | `src/index.js:43` | Admin/Support console (then role-gated inside) | off |
| `?pi=nav` / `?pi-off=nav` | `src/lib/presentationNav.js:20-21` | Host-reduced navigation | **ON** |
| `?shell=1` / `?shell=0` | `src/lib/presentationNav.js:47-48` | `HostEventShell` vs `EventPlanner` for host events | **ON** |
| `?pi=planv2` / `?pi-off=planv2` | `src/lib/presentationNav.js:69-70` | Recomposed host Plan tab | **ON** |
| `?pi-off=voice` | `src/lib/nextActionRenderer.js:177` | Host next-action voice | ON |
| `?pi-off=labels` | `src/lib/presentationLabels.js:15` | Presentation label mapping | ON |
| `?pi-off=identity` | `src/lib/eventIdentity.js:14` | Event identity statements | ON |
| `?pi-off=memory` | `src/lib/decisionMemory.js:16` | Decision Memory capture + history | ON |
| `?pi-off=decisions` | `src/lib/decisionConfidence.js:22` | Decision confidence grammar | ON |
| `?pi-off=confidence` | `src/lib/confidenceGrammar.js:22` | Confidence grammar | ON |
| `?pi-off=attention` | `src/lib/positiveAttention.js:21` | Positive-attention framing | ON |
| `?pi-off=moments` | `src/lib/momentLibrary.js:17` | Moment library | ON |
| `?devrole=support` | `src/components/AuthGate.jsx:232` | Narrower dev-bypass role | off |

Every `pi.*` flag uses the same 3-tier resolution: URL param → `localStorage['ngw-pi-<name>']` (`'1'`/`'0'`) → `process.env.REACT_APP_PI_<NAME> !== 'false'`. **All nine are default-ON**; the env var can only turn them *off*.

### 3b. URL-param flags — hostv2

| Flag | Read at | Gates | Default |
|---|---|---|---|
| `?rsvp=CODE` | `hostv2/src/main.jsx:30` | Public invite chunk (`InviteV2`) instead of the host shell | off |
| `?vendor=TOKEN` | `hostv2/src/main.jsx:13` | Hard `location.replace` to the CRA brief page | off |
| `?welcome` | `HostShellV2.jsx:582` | Forces the first-run welcome gate on any device | off |
| `?splashhold` | `HostShellV2.jsx:664` | Holds the splash for 600s (design review) | off |
| `?splashfull` | `HostShellV2.jsx:665` | Forces the full ~3.9s splash film on a return boot | off |
| `?elegant=0` | `HostShellV2.jsx:669` | **Reverts** to the v2 hero. `elegantMode = q.get('elegant') !== '0'` → **elegant is ON by default** | **ON** |
| `?voice=sans` | `HostShellV2.jsx:670` | Swaps the guide-voice face from Newsreader to sans | off |
| `#` lodging payload | `HostShellV2.jsx:2909-2911` | Bookmarklet listing intake; the hash is stripped via `replaceState` after read | off |

### 3c. Env-driven flags (both trees; hostv2 bakes the same `REACT_APP_*` set via `loadEnv` — `hostv2/vite.config.js:11`)

| Var | Read at | Gates |
|---|---|---|
| `REACT_APP_API_BASE_URL` | `src/lib/commApi.js:14`, `orchestratorClient.js:16`, `weather.js:19`, `stripeApi.js:10`, `aiProxy.js:8`, `instacart.js:6`, `docusign.js:17`, `webhookService.js:14` | **The master backend switch.** Unset ⇒ messaging send, weather, Stripe, AI parse, Instacart, DocuSign, orchestrator all degrade to honest local/offline states |
| `REACT_APP_BILLING_LIVE` | `HostShellV2.jsx:11580` | Second, independent gate on the $39 One-Event Pass charge. Unset ⇒ "free in preview" |
| `REACT_APP_SUPABASE_URL` / `_ANON_KEY` | `src/lib/supabaseClient.js` (via `isSupabaseConfigured()`) | Auth, cloud sync, storage, members, migration |
| `REACT_APP_AUTH_BYPASS` | `src/components/AuthGate.jsx:226`; `MembersModal.jsx:48` | Skips the auth wall entirely (dev). Comment at `:231` says the deploy gate verifies this is false in the shipped bundle |
| `REACT_APP_BYPASS_ROLE` | `src/components/AuthGate.jsx:235` | Role assumed under bypass |
| `REACT_APP_INVITE_ONLY` | `src/components/AuthGate.jsx:86` | Opt-in pre-added-user requirement |
| `REACT_APP_ENABLE_GOOGLE_AUTH`, `REACT_APP_AUTH_REDIRECT` | `src/components/AuthGate.jsx` | OAuth provider + redirect |
| `REACT_APP_PLANNER_TOKEN` | `src/lib/commApi.js:15` | Transition auth fallback for the comm API |
| `REACT_APP_OPENWEATHER_KEY` | `src/lib/weather.js` | Direct weather calls |
| `REACT_APP_GOOGLE_MAPS_KEY` | `HostShellV2.jsx:830` | Address/place autocomplete |
| `REACT_APP_FDA_API_KEY` | food/knowledge libs | Food data lookups |
| `REACT_APP_SENTRY_DSN` | `src/lib/sentry.js`; `src/index.js:9` | Error reporting (no-op unset) |
| `REACT_APP_POSTHOG_KEY` / `_HOST` | `src/lib/analytics.js` | Product analytics |
| `REACT_APP_PI_*` (9 vars) | see 3a | Turn a default-ON presentation flag OFF |
| `NODE_ENV` | `src/index.js:29`; `src/App.js:276`, `:46744` | Kills the dev slices, the QA seed, and EventDayMode in production |
| `E2E_BASE` | `hostv2/vite.config.js:24`; `playwright.config.mjs:36` | Forces the deep asset base under `vite preview` so the Playwright harness isn't served a blank mount |

---

## 4. Surfaces reachable ONLY by a flag or by direct state manipulation

**Flag-only (CRA):**
- INTEL Observatory — `?observatory=1`. Source comment at `src/App.js:46700`: *"a hidden dev/admin route … no user nav points here."*
- Admin / Support console — `?admin=1` (`src/index.js:43`); mounted outside `App`, so nothing in the product links to it.
- Orchestration slice + Alpha Tester Gate — `?slice=orchestration[&observe=1]` (`src/index.js:36`, `:57`); the only production-reachable slice.
- Observer harness — `?observe=1` (`src/index.js:51`).
- Demo Tools bar — first reached by `?demo=1`, then persists via `ngw-demo-tools` after the param is stripped (`src/App.js:230-236`, `:23259`).
- Dev-bypass sign-out screen — only rendered when `REACT_APP_AUTH_BYPASS=true` (`src/components/AuthGate.jsx:267`).

**Flag-only (hostv2):**
- The v2 (non-elegant) hero composition — reachable only via `?elegant=0` (`HostShellV2.jsx:669`); it is now the *fallback*, not the default.
- The sans guide voice — `?voice=sans` (`:670`).
- The forced welcome gate and the two splash-review states — `?welcome`, `?splashhold`, `?splashfull`.

**State-only (no URL, no flag) — you cannot link to these, only reach them by interacting:**
- Every hostv2 `stage` and every one of the 29 `sheet` kinds. Nothing writes stage/sheet to the URL.
- CRA: every event tab, `activeId`/`activeClientId` selection, `showNew`/`showProfile`/`showMembers`/`composeOpen` modals, the Editorial Cover (`coverSeen` is in-memory, so it re-fires per session).
- CRA day-of tabs `Now` and `Arrivals`: gated on `dayMode`, which is `event.dayMode` when explicitly set, else `event.date === today` (`src/App.js:43556`, render `:44767`, `:44773`). On any other day these two tabs cannot render.

---

## 5. Dead or unreachable implementations (with the gating line)

| Implementation | Why unreachable | Gating line |
|---|---|---|
| `EventDayMode` (`src/components/EventDayMode.jsx`) in production | `&& process.env.NODE_ENV !== 'production'` — CRA statically folds this to `false` and tree-shakes it. Source comment says it ships **fabricated** escalation data ("25 min behind", "18 min · no contact") | `src/App.js:46744` |
| Slices `vendor`, `desktop-density`, `debrief`, `event-day` in production | `devSlices = process.env.NODE_ENV !== 'production'` AND-ed into each ternary branch | `src/index.js:29`, `:32-35` |
| QA attendance seed | `IS_QA_SEED_PARAM` requires non-production; `qaMemorySeed.js` throws in production as a second layer | `src/App.js:276-278` |
| hostv2 messaging / inbox | The surface does not exist. `resolveRoute` returns `null` for `Communication` by explicit design; callers fall through to a truthful toast rather than a fake landing | `src/lib/routeResolver.js:142-144`; `HostShellV2.jsx:4105`, `:4961` |
| hostv2 vendor-brief surface | `?vendor=` redirects out of the app before React mounts | `hostv2/src/main.jsx:13-14` |
| hostv2 stage dock (Create/Plan/The Day/After bar) | `elegantMode` is default-ON and adds `dock-retired`, whose CSS rule is `display:none`. The four stages remain reachable via the Nav sheet segmented control (`:11810`), the command palette (`:15483-15486`), and `routeSheet`'s `stage:*` landings — but **the always-visible stage bar is hidden on the default configuration** | `HostShellV2.jsx:669` (default), `:15463` (class), `hostv2/src/styles.css:169` (`display:none`) |
| CRA `Now` / `Arrivals` tabs on a non-event day | `dayMode` false ⇒ neither `{tab === 'Now' && dayMode}` branch renders, and `bottomNavItems` omits them | `src/App.js:43556`, `:44767`, `:44773`, `:44413` |
| hostv2 `air` / `ground` sheets on a non-travel event | Sections rows are gated on `travel.relevant && travel.air|ground`. The sheets still render if reached another way, but on a calm non-travel event no door exists — **this is deliberate** per the in-source note at `:11511-11518` ("a door to an empty surface would be its own kind of lie") | `HostShellV2.jsx:11519`, `:11529` |
| hostv2 `crabs` / `costshare` / `rain` sheets | Same pattern — doors gated on `crab.relevant`, `event.costSharing`, `outdoor` | `:11536`, `:11537`, `:11486` |

**Not dead, but worth flagging:** `src/plan/CommunicationHub.jsx`, `DecisionApprovalCenter.jsx`, `ClientIntakeFlow.jsx`, `TimelineBuilder.jsx`, `VendorPlanningWorkspace.jsx`, `ChecklistGenerator.jsx` are all lazy-imported and mounted (`src/App.js:221-226` and their render sites), i.e. wired — but they live behind planner-only tabs that `hostNav` hides for host events (`src/lib/presentationNav.js:88-90`).

---

## 6. Cross-cutting observations

1. **The engine layer is shared, the shells are not.** hostv2 imports ~100 modules from `../src` (`HostShellV2.jsx:10-161`). Any engine change reaches both apps; any *surface* change reaches one.
2. **Two persistence models coexist on one origin.** CRA writes `ngw-events` / `ngw-clients` / `ngw-profile` (+ Supabase). hostv2 writes `ngw-hostv2-custom-events`, per-event `LS_PATCH(id)` overlays, `ngw-hostv2-last-event`, and *reads* the CRA's `ngw-events` (`hostv2/src/eventPool.js:26`). hostv2 has no cloud write path for events — only profile (`HostShellV2.jsx:1141-1143`) and the resume pointer.
3. **hostv2 has no messaging and no admin.** Both are CRA-only. Anything host-facing that needs a thread today must go back to the frozen app.
4. **CTA truthfulness is enforced structurally, not by convention.** Unroutable destinations produce a named toast (`HostShellV2.jsx:4105`), and commerce needs two independent gates (`:11580`).
5. **The default configuration is heavily flagged-on.** All nine `pi.*` flags, `hostShellOn`, `planV2On`, and `elegantMode` are default-ON. The "off" paths still exist in source and are what an env var or `?…=0` restores — so the shipped experience and the fallback experience are both live code.

---

## Method and limits

**What I inspected (working tree at `097ce84e` + 2 uncommitted files):**
`src/index.js` (full), `src/App.js` (targeted reads: module-init URL handlers `228-285`, `App()` `45635-46988`, the tab ladders `43533-43828` and `44280-44790`, plus every component whose line I cite), `src/CommandCenter.jsx` (export/component index), `src/lib/presentationNav.js` (full), the eight other `pi.*` flag modules, `src/components/AuthGate.jsx`, `src/lib/stripeApi.js`, `src/lib/storage.js`, `src/lib/routeResolver.js`, `src/lib/commApi.js`; `hostv2/src/main.jsx` (full), `hostv2/index.html` (full), `hostv2/vite.config.js` (full), `hostv2/package.json`, `hostv2/playwright.config.mjs` (full), `hostv2/src/eventPool.js` (head), `hostv2/src/ErrorBoundary.jsx` (head), `hostv2/src/styles.css` (targeted), and `hostv2/src/HostShellV2.jsx` (targeted reads across all four stages, the sheet container, the router, the flags, the nav/palette/sections, and the settings/pass sheets — plus exhaustive greps for every `setSheet({kind:…})` and `sheet.kind === …`). Also `.github/workflows/*.yml`, `package.json`, and directory listings of `build/`, `hostv2/dist/`, `src/plan`, `src/slices`, `src/admin`, `src/components`, `src/lib`.

**What I did not do:**
- **No runtime verification of any kind.** I did not start a dev server, run a build, open a browser, click anything, or fetch any URL. Every "Implemented but not runtime-verified" means exactly that: the code exists and is wired at the call sites cited, and I have not seen it render.
- I used **no prior screenshots, no prior audit claims, and no memory notes** as evidence. Where a memory note and the code disagreed (e.g. "air/ground have no Sections door"), the code won: `HostShellV2.jsx:11511-11534` now adds both rows, gated on the leg existing.
- I did not read all 46,988 lines of `src/App.js` or all 15,639 of `HostShellV2.jsx`. Coverage is grep-driven plus targeted reads. A surface that is defined but never referenced by any grep pattern I used (`setSheet`, `tab === `, `import`, `<Component`) could have been missed.

**What I could not determine:**
- **Whether anything is actually live.** `build/` and `hostv2/dist/` are dated 2026-07-30 and `pages.yml` publishes `gh-pages`, but I cannot confirm the deployed bundle matches this tree, so no row is marked "Live and verified."
- **Which env vars are actually set at build time.** `.env.local` / `.env.production.local` exist but I did not read their values; every backend-dependent row is therefore "Partial" with the gate named rather than resolved.
- **Whether the CRA's `Now`/`Arrivals`, EventDayMode, or the day-of live path ever render correctly** — all require a specific date or a non-production build.
- **Whether any of the 29 hostv2 sheets crash or render empty in practice.** Existence of a branch is not evidence that it renders.
- **Real vs. sample data behaviour.** `eventPool.js:26` reads `ngw-events` from the same origin; whether a real host has real events there is unknowable from source.
- **Whether the `?admin=1` console's role check passes for anyone** — it is enforced server-side via `app_metadata.role` (`src/index.js:40`).
