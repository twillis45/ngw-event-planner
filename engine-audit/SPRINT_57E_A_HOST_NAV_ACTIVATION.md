# Sprint 57E-A — Host Information Architecture Activation (build)

*Phase A — Host Navigation Hide / Reveal. Presentation-only. Feature flag `pi.nav`, default OFF = byte-identical to production. Engine / readiness / playbook / routing / data UNCHANGED. Date: 2026-06-17. Branch: `sprint-57e-a-host-nav`.*

## Objective
Reduce host cognitive load by collapsing the **14-item event sidebar** to a **6-item host nav** — *without changing a single planning decision.* A grandmother sees **Overview · Plan · Guests · Money · The Day · Details** instead of a 14-destination planner cockpit. Planner & operator modes keep the full nav.

---

## 1 · Navigation inventory (the 14 route keys today)
`PLANNER_TABS` (App.js:27306) — every key below is a **route** (a tab view + `handleTabChange` target). 57E-A changes only **which keys are shown** and **their display label** — never the keys, routes, or handlers.

| # | Route key | Group header (today) | Today's label |
|---|---|---|---|
| 1 | `Command` | — | Overview |
| 2 | `Communication` | MESSAGES | Messages |
| 3 | `Planning` | PLANNING | Planning |
| 4 | `Decisions` | PLANNING | Decisions |
| 5 | `Client Intake` | PEOPLE | Client Intake |
| 6 | `Vendors` | PEOPLE | Vendors |
| 7 | `Crew` | PEOPLE | Crew |
| 8 | `Guests` | PEOPLE | Guests |
| 9 | `Seating` | PEOPLE | Seating |
| 10 | `Budget` | MONEY | Budget |
| 11 | `Documents` | MONEY | Documents |
| 12 | `Calendar` | DAY OF | Calendar |
| 13 | `Event Day Schedule` | DAY OF | Event Day Schedule |
| 14 | `Event Details` | EVENT | Event Details |

*(Board Meeting events carry a re-ordered variant of the same keys; `hostNav` handles it via `tabs.includes(t)`.)*

## 2 · Host IA mapping (what host mode does to each item)
Driven by `audiencePersona(event)` (the flag-free 57A-B audience signal) + `navOn()` (`pi.nav`). Operator & planner ⇒ identity.

| Route key | Host action | Mechanism | Host label |
|---|---|---|---|
| `Command` | **KEEP** | HOST_KEEP | **Overview** |
| `Planning` | **KEEP** (relabel) | HOST_KEEP | **Plan** |
| `Decisions` | **HIDE** (merge-into-Plan) | not in allow-set | — |
| `Client Intake` | **HIDE** (a self-host *is* the client) | not in allow-set | — |
| `Crew` | **HIDE** (pro staffing concept) | not in allow-set | — |
| `Seating` | **HIDE** (merge-into-Guests) | not in allow-set | — |
| `Calendar` | **HIDE** (merge-into-The-Day) | not in allow-set | — |
| `Guests` | **KEEP** | HOST_KEEP | Guests |
| `Budget` | **KEEP** (relabel) | HOST_KEEP | **Money** |
| `Event Day Schedule` | **KEEP** (relabel) | HOST_KEEP | **The Day** |
| `Event Details` | **KEEP** (relabel) | HOST_KEEP | **Details** |
| `Vendors` | **REVEAL-when-data** (≥1 vendor) | allow-set if `event.vendors.length` | Vendors |
| `Documents` | **REVEAL-when-data** (≥1 doc) | allow-set if `event.documents.length` | **Paperwork** |
| `Communication` | **REVEAL-when-data** (≥1 msg) | allow-set if `commClient`/`messages` | **Messages** |

**Host result with no extra data: exactly 6** (Overview · Plan · Guests · Money · The Day · Details). Group headers (MESSAGES/PLANNING/PEOPLE/MONEY/DAY OF/EVENT) are **suppressed** in host mode — a flat list, not a clustered cockpit.

## 3 · Progressive-disclosure rules
- **Reveal, never strand.** Vendors / Documents / Messages appear the moment the event *has* that data (`Array.isArray(event[k]) && length > 0`). A host who adds their first vendor gets the Vendors tab back automatically — no setting, no dead end.
- **Hidden ≠ deleted.** Every hidden key remains a live route; the view still mounts and `handleTabChange` still targets it (deep links / keyboard shortcuts / programmatic nav all intact). Host mode hides *nav affordances*, not destinations.
- **Order is intentional** (`HOST_ORDER`): Overview → (Messages) → Plan → (Vendors) → Guests → Money → (Paperwork) → The Day → Details — revealed items slot next to their kin.

## 4 · Feature-flag strategy (`pi.nav`)
- **Default OFF** ⇒ `hostNav` is the **identity function** for everyone ⇒ byte-identical to production (verified: flag-OFF host renders all 14 + every group header).
- Enable for QA/operators via `?pi=nav`, `localStorage['ngw-pi-nav']='1'`, or `REACT_APP_PI_NAV='true'` — same triad as `pi.voice`/`pi.labels`.
- **Independent of `pi.voice`.** Nav reduction and spine voice are separately gated; this sprint changed nav only (voice left OFF in QA to isolate).
- **Persona-gated.** Even ON, only the **host** audience reduces; `client`/`organization`/`professional` ⇒ full nav. Operator gets its own nav in a later sprint.

## 5 · Routing-safety review
- `PLANNER_TABS`, `TAB_GROUP_HEADERS`, `TAB_LABELS`, `handleTabChange`, `TAB_ICONS` — **untouched**.
- `hostNav` returns a **subset of the same key strings**; `renderEvtNavItem(t)` still receives a real route key, so `onClick → handleTabChange(t)` is unchanged. Unit test **T6** asserts every shown host tab is a real route key.
- `hostTabLabel` changes the **display span only** (`hostTabLabel(t,event) || TAB_LABELS[t] || t`); the key `t` driving the route is never altered.
- Engine frozen: `git diff src/CommandCenter.jsx src/lib/playbooks/` = **0 lines**.

## 6 · Screenshot package (`demo/review-artifacts/`)
| File | Shows |
|---|---|
| `57ea_flagOFF_host_1440.png` | Flag OFF — full 14-item nav + all group headers (**= production**) |
| `57ea_flagON_host_1440.png` | Flag ON host — **6-item flat nav** (Overview/Plan/Guests/Money/The Day/Details) |
| `57ea_flagON_planner_1440.png` | Flag ON planner audience — full 14-item nav (**identity preserved**) |
| `57ea_flagON_reveal_1440.png` | Flag ON host + vendor + doc — **8 items** (Vendors + Paperwork revealed) |
| `57ea_flagON_host_390.png` | Mobile drawer, host — 6 items |
| `57ea_flagOFF_host_390.png` | Mobile drawer, flag OFF — 14 items (identity) |
| `57ea_flagON_host_money_1440.png` | "Money" tab clicked → Budget view renders (functionality intact) |

## 7 · Cognitive-load assessment
- **Destinations a host must parse: 14 → 6** (−57%). Eight planner-only/empty items removed from the first glance.
- **Group headers: 6 → 0** in host mode — no taxonomy to learn; a flat, scannable list.
- **Jargon at the nav level retired for hosts:** *Client Intake, Crew, Decisions, Seating, Calendar* gone; *Planning→Plan, Budget→Money, Event Day Schedule→The Day, Event Details→Details, Documents→Paperwork.*
- **Zero loss of capability:** revealed-when-needed + every route still reachable. The host isn't given a *lesser* product — a *legible* one.

## 8 · Expected grade improvements
- **Host first-run comprehension:** the #1 host blocker per 57D/57E ("a navigation built for a professional") is removed at its cheapest lever. Expect the largest single jump in the host "does this feel like *my* tool?" dimension since 57A-B's spine voice.
- **No planner regression:** planner mode is literally identical (identity), so planner grades are held, not traded.
- **Trust:** reveal-when-data means the nav reflects *the host's actual event*, not a generic template — reinforces the 57A-B "planner speaking to me" effect.

## 9 · Risks & mitigations
| Risk | Mitigation |
|---|---|
| A host needs a hidden tab (e.g. later adds a vendor) | **Reveal-when-data** auto-restores it; route was never removed |
| Hidden route reached by deep link / shortcut | Routes & `handleTabChange` untouched — view still mounts (T6 + 0-diff) |
| Flag leaks to planner | Persona-gated: only `audiencePersona==='host'` reduces; planner = identity (QA T2) |
| Any prod change while OFF | Default OFF = identity function = byte-identical (QA T1, both viewports) |
| Mis-audience (host tagged client) | Falls to **full nav** (safe over-disclosure), never the reverse |

## 10 · QA results (puppeteer, system Chrome, dev runtime)
Script: `review-artifacts/_qa_57ea.mjs` · log: `review-artifacts/_qa_57ea.log`. Resource-400 dev-backend noise filtered.

| # | Check | Result |
|---|---|---|
| T1 | Flag OFF host = 14-item identity (+ group headers) | **PASS** |
| T2 | Flag ON **planner** audience = 14-item identity | **PASS** |
| T3 | Flag ON host = exactly the 6 essentials | **PASS** |
| T3b | Host labels = Overview/Plan/Guests/Money/The Day/Details | **PASS** |
| T4 | Reveal-when-data adds Vendors + Documents | **PASS** |
| T5 | Relabeled "Money" routes to Budget view (functionality) | **PASS** |
| T6 | No JS / page errors | **PASS** |
| — | Mobile 390: host 6 / flag-OFF 14 | **PASS** |
| — | Desktop 1440 + mobile 390 screenshots | **captured** |
| — | Unit suite (`presentationNav.test.js` + full) | **119/119 PASS** |
| — | Prod build compiles; CommandCenter/playbooks 0-diff | **PASS** |

---

## Merge recommendation
**APPROVE — merge-ready, hold for review per phase-sprint protocol.** The change is small (presentation-nav config + a 4-line `audiencePersona` refactor identical to the open PR #47), fully flag-gated default-OFF (proven byte-identical to prod), persona-scoped to hosts, and routing-safe (engine 0-diff, all routes preserved, reveal-when-data prevents stranding). It delivers the cheapest high-value host win on the 57E roadmap: the grandmother's wall — *a navigation built for a professional* — comes down to a 6-item list **without altering one planning decision.** Recommend merge after review; ship behind `pi.nav` OFF, enable for host-cohort QA.

*Note: `audiencePersona` extraction here is byte-identical to the same refactor in open **PR #47** (57C labels) → conflict-free regardless of merge order.*
