# 03 — ARCHITECTURE (current state)

**Repo:** `/Users/toddwillis/Code/ngw-event-planner/demo` (git root is `demo`, not the parent)
**Branch:** `grounded-decision-surface` · **Commit:** `097ce84e` · **Working tree audited as-is** (2 modified files: `hostv2/src/HostShellV2.jsx`, `src/lib/__tests__/heroComposition.test.js`)
**Date:** 2026-07-30

**NOT RUNTIME VERIFIED.** No application was launched, no browser driven, no HTTP request issued during this phase. Every claim below is derived from reading source, config, and build artifacts on disk. Where another phase's evidence file is cited, it is labelled as such.

**Claim labels used throughout:**
`[VF]` verified fact (read directly in a file, path+line given) · `[CSI]` code-supported inference (follows from read code, not directly asserted anywhere) · `[UQ]` unresolved question · `[KD]` known defect (a real, evidenced problem).

**Security:** no key, DSN, token, or `.env` value appears in this document. Variable **names** only.

---

## 1. Frontend framework & build system

Two separate applications share one engine layer.

| | **CRA app** (`src/`) | **hostv2** (`hostv2/`) |
|---|---|---|
| Framework | React 19.2.6, `react-scripts` 5.0.1 `[VF: package.json:8-16]` | React 19.2.6, Vite `^4.5.5` `[VF: hostv2/package.json:16-19]` |
| Build cmd | `react-scripts build` → `build/` `[VF: package.json:13]` | `node src/parity/check-parity.mjs && vite build` → `hostv2/dist/` `[VF: hostv2/package.json:9]` |
| Dev server | `react-scripts start` | `vite`, port 5199 `[VF: hostv2/vite.config.js:30]` |
| Deploy base | `homepage: …/ngw-event-planner` `[VF: package.json:5]` | `base: '/ngw-event-planner/hostv2/'` when `command==='build'` or `E2E_BASE` `[VF: hostv2/vite.config.js:21]` |
| Entry | `src/index.js` → `src/App.js` (46,988 lines) `[VF]` | `hostv2/src/main.jsx` → `HostShellV2.jsx` (15,639 lines) `[VF]` |
| App deps | `@sentry/react`, `@supabase/supabase-js`, `posthog-js`, `papaparse`, `qrcode`, `xlsx` `[VF: package.json:6-15]` | **only** `react` + `react-dom` `[VF: hostv2/package.json:15-18]` |
| Status | **FROZEN, donor-only** since 2026-07-16 (CLAUDE.md non-negotiable) | Active surface |

**The `@app` alias is the whole integration.** `resolve.alias: { '@app': ../src }` `[VF: hostv2/vite.config.js:24]`. `HostShellV2.jsx` imports **~135 modules** from `@app/lib/**`, `@app/data/**`, and `@app/CommandCenter` `[VF: HostShellV2.jsx:10-161]`. hostv2 is therefore **not a fork of the engines** — it is a second renderer over the same engine layer.

Three Vite settings exist purely to make CRA-era source compile:
- `esbuild: { loader: 'jsx', include: /\.(js|jsx)$/ }` `[VF: :34]` — app modules keep JSX inside `.js` files.
- `define: { 'process.env': JSON.stringify(appEnv) }` where `appEnv = loadEnv(mode, '..', 'REACT_APP_')` `[VF: :14, :26-28]` — shared `src/lib/*` modules read `process.env.REACT_APP_*` at module scope, so hostv2 must bake the same key set the CRA build bakes. hostv2's own dependency list contains no env library; the entire config surface is inherited.
- hostv2's declared deps are React only, but its **transitive** deps (papaparse, xlsx, …) come from the ROOT `package.json` via `@app`. CI installs both trees for exactly this reason `[VF: .github/workflows/checks.yml:48-52]`.

**`[KD]` Bundle-size coupling.** `HostShellV2.jsx:10` imports `eventPlan, applicableReadinessAxes` from `@app/CommandCenter` — a 4,192-line React **component** file. hostv2 pulls the whole module (JSX and all) to reach two pure functions `[VF]`. Separately, `src/lib/playbooks/index.js:54` imports `resolveCanonicalType` from `../eventTaxonomyAdapter`, which forwards through `eventSolveAdapter` → `eventSolve.mjs` (§16.7), so every consumer of playbooks drags the shadow next-action engine into its bundle `[CSI]`.

---

## 2. Route architecture

**`[VF]` Neither app uses a router library.** `grep -rn "react-router|createBrowserRouter|<Route"` over `src/`, `hostv2/src/`, and both `package.json` files returns **zero hits**. There is no `history` navigation, no route table, no URL that reflects in-app position beyond a handful of query params.

### 2.1 CRA app (`src/`)

Three layers, none of them a router:

1. **Pre-mount query-param branching in `src/index.js`** — `?slice=vendor|desktop-density|debrief|event-day|orchestration` lazy-mount proving-ground harnesses `[VF: src/index.js:31-37]`; `?admin=1` lazy-mounts `AdminConsole` inside `AuthGate` `[VF: :42-46]`; `?observe=1` installs the observation kit `[VF: :51]`; `?slice=orchestration&observe=1` wraps in `AlphaTesterGate` `[VF: :57-60]`. Four of five slices are gated `NODE_ENV !== 'production'` (`devSlices`, `[VF: :29]`); **`orchestration` is deliberately reachable in production** `[VF: :36 + comment :26-28]`.
2. **In-`App()` query-param early returns** — `?rsvp`, `?vendor`, `?portal`, `?intake`, `?mode=event-day`, `?observatory` each return a different tree (see `02_PRODUCT_MAP.md §1`).
3. **A `tab` string + a `go(newTab, itemId, opts)` executor** `[VF: src/App.js:43593]`. Deep links are plain objects `{ tab, focusField, vendorId, vendorSection, taskId, … }` threaded down as `onNav` / `onNavTo` props to ~40 call sites `[VF: src/App.js:43669-43762 and passim]`.

**`[KD]` The CRA app does not use the shared route resolver.** `grep -c resolveRoute src/App.js` → **0** `[VF]`. `src/lib/routeResolver.js` — the file whose header calls itself "THE ROUTE→LANDING AUTHORITY" — is consumed **only** by hostv2 (`HostShellV2.jsx:99`) `[VF]`. The CRA app keeps its own hand-wired ladder. See §16.4.

### 2.2 hostv2

`main.jsx` performs a three-way pre-mount split `[VF: hostv2/src/main.jsx:13-41]`:
- `?vendor=TOKEN` → `window.location.replace()` to the **legacy CRA** vendor-brief page one directory up `[VF: :13-14]`. hostv2 renders no brief surface of its own.
- `?rsvp=CODE` → dynamic `import('./InviteV2.jsx')` `[VF: :29, :40]`.
- otherwise → dynamic `import('./HostShellV2.jsx')` `[VF: :41]`. Guests never download the host shell — the only real code-splitting boundary in the project.

Inside the shell, position is two pieces of component state:
- `stage` ∈ `create | plan | day | after` — `useState('plan')` `[VF: HostShellV2.jsx:565]`, switched by the bottom nav `[VF: :15465-15468]`.
- `sheet` — an overlay descriptor. Overlays push a synthetic history entry (`window.history.pushState({ngwOverlay:true})`, `[VF: :2648]`) and a `popstate` listener closes them `[VF: :2664]`, so the phone Back button dismisses a sheet instead of leaving the app. This is the **only** History API use in either app.

**Route→landing is the one part that is a real, tested contract.** `resolveRoute(route)` `[VF: src/lib/routeResolver.js:59]` is a pure function returning `{ kind, focus, vendorSection?, anchor? } | null`; `routeSheet` in the shell is a thin executor over it `[VF: HostShellV2.jsx:3270-3305]`. `null` means the route is unroutable and the caller must fall back honestly. `ROUTESHEET_TABS` is exported so the CTA test derives its allow-list from the resolver rather than mirroring it `[VF: routeResolver.js:148-155]`. Branch **order is load-bearing** and documented as such (`/^air/` before `tab:'Travel'`; `'event-date'` before `tab:'Event Details'`; `/^space/` before `tab:'Planning'`) `[VF: :52-56 and inline]`.

**`[VF]` `'Communication'` is deliberately unroutable** — hostv2 has no messages surface, so the resolver returns `null` and the caller shows a truthful toast rather than a pretend landing `[VF: routeResolver.js:143-145]`.

---

## 3. Component organization

### CRA (`src/`)
| Dir | Contents | Note |
|---|---|---|
| `src/App.js` | 46,988 lines — the entire planner shell, all tabs, most modals | **FROZEN**, donor-only |
| `src/CommandCenter.jsx` | 4,192 lines — dual-role: a rendered React component **and** the exported engine `eventPlan()` / `selectEventNextAction()` | see §16.2 |
| `src/components/` (8) | `AuthGate`, `EngineNextStep`, `EventDayMode`, `ExportMenu`, `ImportHistoryDrawer`, `ImportWizard`, `MembersModal`, `VendorImportWizard` | |
| `src/plan/` (6) | `ChecklistGenerator`, `ClientIntakeFlow`, `CommunicationHub`, `DecisionApprovalCenter`, `TimelineBuilder`, `VendorPlanningWorkspace` | the only real component decomposition |
| `src/slices/` (6) | proving-ground harnesses, dev-gated except `OrchestrationSlice` | |
| `src/admin/` (2) | `AdminConsole`, `PlaybookCampaigns` | `?admin=1` only |
| `src/contexts/` (5) | `AuthContext`, `DensityContext`, `EscalationContext`, `OperationalModeContext`, `OrchestrationContext` | `[UQ]` all five appear to serve the slice harnesses; not traced into `App.js` in this phase |
| `src/design/`, `src/theme/` | tokens, motion, primitives, palette | |
| `src/data/` (6) | sample/seed event fixtures | |
| `src/lib/` | **150 top-level entries** — the engine layer | |
| `src/lib/knowledge/` | ~124 files — the knowledge/governance stack | deterministic; see §9 |
| `src/lib/playbooks/data/` | **39 playbooks** | §11 |

### hostv2 (`hostv2/src/` — 12 files total)
`main.jsx` (46) · `HostShellV2.jsx` (15,639) · `InviteV2.jsx` (1,345) · `eventPool.js` (284) · `inviteShared.js` (39) · `PhotoStrip.jsx` (124) · `ErrorBoundary.jsx` (52) · `theme.js` (159) · `styles.css` · `parity/askKit.jsx` + `parity/check-parity.mjs` + `parity/MANIFEST.md` `[VF]`.

**`[KD]` Component organization is the weakest structural axis.** Two files (`src/App.js` 46,988 + `HostShellV2.jsx` 15,639) hold 62,627 lines — the overwhelming majority of all UI code. `HostShellV2.jsx` alone declares ~200 `useState` hooks in one component body `[CSI, from the state grep in §4]`.

**The one deliberate anti-drift mechanism** is `hostv2/src/parity/askKit.jsx` — a locked set of "ask atoms" — enforced by `check-parity.mjs`, which fails the build (exit 1) if a locked value (`fontSize: 44`, `lineHeight: 1.08`, `padding: '13px 16px'`) is re-inlined in `HostShellV2.jsx`, or if the kit stops defining it, or if the shell stops importing the kit `[VF: hostv2/src/parity/check-parity.mjs:31-52]`. It runs **inside** `npm run build` `[VF: hostv2/package.json:9]`, so it cannot be skipped on the deploy path.

---

## 4. State management

**`[VF]` No state library.** No Redux, Zustand, MobX, Jotai, or Recoil in either `package.json`. React `useState` / `useMemo` / `useEffect` / `useRef` only, plus five unused-in-main-shell Contexts (§3).

### hostv2 state model (the live shell)
```
base            ← the event's immutable source row (sample | app event | custom)
patch           ← per-event overlay for sample/app bases   (localStorage: ngw-hostv2-patch-<id>)
customs[]       ← events created in hostv2, stored whole   (localStorage: ngw-hostv2-custom-events)
event           = useMemo(() => ({ ...(base||FALLBACK), ...(activeCustom ? {} : patch) }))
                                                            [VF: HostShellV2.jsx:996]
ctx             = useMemo(() => buildExperienceContext(event, profile, 1))   [VF: :1151]
plan            = useMemo(() => eventPlan(event, ctx))                       [VF: :1154]
decisionBoard   = useMemo(() => playbookDecisionBoard(event, undefined, profile)) [VF: :1180]
```
Every derived surface hangs off `event`, so a single write recomputes the whole plan `[VF: dependency arrays at :996, :1151, :1154, :1180]`.

**`patchEvent(obj, msg, opts)` is the ONE write path** `[VF: HostShellV2.jsx:3894]`. It:
1. snapshots the pre-patch value of every key it touches, so **undo is built once** rather than per action `[VF: :3902-3904]`;
2. writes to `customs` (created events) **or** `patch` (sample/app bases) `[VF: :3905-3925]`;
3. fires `cloudSaveEvent(...).then(recordSaveResult)` when a Supabase session exists `[VF: :3913, :3922]`;
4. emits a confirmation-green toast or an in-hero receipt `[VF: :3928-3948]`.

CRA app state is `setEvent(e => ({...e, ...patch}))` inline at ~hundreds of call sites `[VF: e.g. src/App.js:43725, :43727, :43730]` — no single write path.

---

## 5. Local persistence (localStorage)

**`[VF]` localStorage is the only durable client store.** Zero hits repo-wide for `indexedDB`, `document.cookie`, `caches.`, or `serviceWorker` registration — despite two PWA manifests existing (`public/manifest.json`, `public/hostv2-manifest.json`). The manifests have no offline backing; `hostv2/index.html` states the no-service-worker choice explicitly `[VF: hostv2/index.html comment block]`.

**`[VF]` `src/lib/storage.js` is NOT the localStorage helper** — it is the Supabase **object storage** client (bucket `event-files`). There is no shared client-storage module; ~286 call sites hand-roll `try { JSON.parse(localStorage.getItem(K)) } catch {}`.

### Owner map — the load-bearing keys

| Key | Owner(s) | Holds |
|---|---|---|
| `ngw-events` | `src/lib/api/events.js:19,25,30`; `src/App.js` (8 sites) — **read-only at module load** by `hostv2/src/eventPool.js:26` | **CRA canonical event array** |
| `ngw-cache-last-sync` / `ngw-cache-pending` | `src/lib/api/events.js:20-36` | last cloud pull ISO; queued mutations |
| `ngw-last-event` | `src/App.js:23294,45798` | CRA current-event pointer |
| `ngw-hostv2-custom-events` | `hostv2/src/eventPool.js:36`; `HostShellV2.jsx:1988` | **hostv2's own event array** |
| `ngw-hostv2-last-event` | `eventPool.js:39`; `HostShellV2.jsx:1993` | hostv2 current-event pointer |
| `ngw-hostv2-patch-<id>` | `inviteShared.js:24`; `HostShellV2.jsx:1985` | per-event overlay on a sample/app base |
| `ngw-profile` | `src/lib/api/profile.js:10`; `src/App.js:46111`; `HostShellV2.jsx:1141-1143` | **written by BOTH apps** |
| `ngw-rsvp-queue-<eventId>` | `src/lib/api/rsvp.js:181`; `src/App.js:31776`; `HostShellV2.jsx:3984`; `InviteV2.jsx:628` | **offline RSVP outbox — four independent read-modify-write implementations on one key** |
| `ngw-clients`, `ngw-preferred-vendors`, `ngw-cal-notes`, `ngw-studio-team` | `src/lib/api/*`, `src/App.js` | CRA-only records |
| `sb-*-auth-token` | Supabase GoTrue (`supabaseClient.js:41` sets `storage: window.localStorage`) | shared session — the one thing both apps genuinely agree on |

Plus ~85 top-level keys and ~21 templated patterns for UI prefs, onboarding gates, per-event approvals/intake/readiness-history/draft-versions, `ngw-pi-*` feature flags (§12), and `ngw-kas-*` knowledge stores.

**`[KD]` No key carries a schema version.** Migrations are ad hoc: `migrateLocalToCloud` (`src/lib/api/events.js:204`), the legacy single-slot fold in `eventPool.js:60-88`, and cache-bust suffixes (`ngw-collapse-v2-*`, `ngw-seed-refresh-v2`).

**`[KD]` Quota recovery exists at exactly one site** — `src/App.js:46027-46033` drops the two import-batch keys on `QuotaExceededError` and retries `ngw-events`. hostv2 has none, and its per-event `ngw_guest_import_batches:<id>` PII snapshots are outside the pruning path `[VF: HostShellV2.jsx:3585]`.

**`[KD]` Two parallel event stores, never reconciled.** `ngw-events` (CRA, cloud-backed) vs `ngw-hostv2-custom-events` + patch overlay (hostv2). `eventPool.js:26` reads `ngw-events` **once at module load into a module-level `let`** — never re-read, never written. hostv2 is a stale read-only consumer of the CRA's event book `[VF]`.

**`[KD]` `ngw-profile` clobber.** `src/App.js:46111` blind-overwrites the whole profile object; `HostShellV2.jsx:1141-1143` read-merge-writes. A CRA write can drop hostv2-only fields (e.g. `splashLastSeen`, read at `HostShellV2.jsx:1064`) `[CSI]`.

---

## 6. Server persistence · database · auth · authorization

| Layer | Reality |
|---|---|
| Database | **Postgres on Supabase**, reached two independent ways `[VF]` |
| Path A — direct | Browser → `@supabase/supabase-js` → PostgREST + RLS (`src/lib/api/*.js`) |
| Path B — REST | Browser → FastAPI on Render → `asyncpg` → the same Postgres (`backend/app/db.py`) |
| ORM | none — raw SQL via `asyncpg` `[VF: backend/app/db.py]` |
| Pool | one lazy module-global pool, `min_size=1, max_size=5, command_timeout=15, ssl='require', statement_cache_size=0` (cache off because pgbouncer breaks prepared statements) `[VF: db.py:14-19]` |
| Degradation | **none** — `db.py:10-11` raises `RuntimeError` on first use when `DATABASE_URL`/`SUPABASE_DB_URL` is unset. The process still boots; DB routes 500 via the error-capture middleware `[VF]` |

### Auth
**`[VF]` Supabase GoTrue is the identity provider for the entire system**, both apps and the backend.
- Sign-in: magic link `signInWithOtp` (`src/components/AuthGate.jsx:94`; `src/lib/api/studio.js:165`; `HostShellV2.jsx:1121`) and Google OAuth (`AuthGate.jsx:117`, gated by `REACT_APP_ENABLE_GOOGLE_AUTH`).
- Client config: `flowType: 'implicit'` (deliberately not PKCE, so magic links survive a different browser context on GitHub Pages), `persistSession`, `autoRefreshToken`, and a **no-op `lock` override** replacing `navigator.locks` to avoid a `getSession()` deadlock `[VF: supabaseClient.js:36-55]`.
- Backend verification is **token introspection, not local JWT validation**: `GET {SUPABASE_URL}/auth/v1/user` with the bearer + `apikey` header, cached in-process 300 s `[VF: backend/app/auth.py:51-76]`.
- **Ten client modules call `supabase.auth.getSession()` purely to mint the bearer for the FastAPI base URL** — `commApi`, `orchestratorClient`, `aiProxy`, `adminApi`, `api/research`, `api/vendorBrief`, `api/kcr`, `api/rsvp`, `api/kas`, `components/MembersModal` `[VF]`.

### Roles / authorization
- **`require_planner` is authentication only, despite its name** — any signed-in Supabase user passes; the docstring says so `[VF: backend/app/auth.py:80, :84-90]`.
- **`require_admin` is the only real role gate** — reads `app_metadata.role` (server-controlled, not `user_metadata`), accepts `admin` | `support`, 401 unauth / 403 authed-unprivileged `[VF: auth.py:111-140]`.
- Per-resource authorization is each router's own `_assert_event_access` (studio-scoped) in `rsvp.py`, `vendor_brief.py`, `communication.py` `[VF]`.
- A shared-secret bypass `X-Planner-Token` vs `PLANNER_DEV_TOKEN` is honoured **only** when `ALLOW_DEV_TOKEN === "true"`; `render.yaml:27-28` carries an explicit instruction never to set it in deployment `[VF: auth.py:105,142]`.
- Row-level security: every migration in `backend/migrations/` ends with `enable row level security` `[VF]`.

**`[KD]` `REACT_APP_AUTH_BYPASS`** is read at `AuthGate.jsx:226`, `MembersModal.jsx:48`, `api/studio.js:23` gated **only on the string `'true'`, with no `NODE_ENV` guard** — unlike `sentry.js:12` and `index.js:29`, which do check. It is present in the (gitignored) `.env.production.local` `[VF]`.

---

## 7. API / backend surface (`backend/app`)

FastAPI 0.115.0 + uvicorn + asyncpg + httpx + pydantic 2.9.2 + stripe `[VF: backend/requirements.txt]`. App object at `main.py:33`; 16 routers registered at `main.py:213-228`; three routes on the app itself (`GET /health` :78, `POST /api/resend-webhook` :131, `GET /api/capabilities` :199) `[VF]`.

One custom middleware, `_error_capture` `[VF: main.py:53-75]` — catches unhandled exceptions, writes to `admin_error_log`, and returns a 500 **that still carries `Access-Control-Allow-Origin`** (re-raising past `CORSMiddleware` had been masking crashes as browser CORS errors). CORS driven by `ALLOWED_ORIGINS` / `ALLOWED_ORIGIN_REGEX`, `allow_credentials=False` `[VF: main.py:38-50]`.

| Router | Prefix | Endpoints | Auth |
|---|---|---|---|
| `communication.py` | `/api/events/{event_id}/communication` | 10 | `require_planner` on writes; `/channels`, `/channels/ensure`, `/portal-respond` open |
| `admin.py` | `/api/admin` | 17 | `require_admin` (all) |
| `ai.py` | `/api/ai` | 6 | `require_planner` on `/feature`, `/orchestrate`, `/parse-vendor-reply`; **`/complete` and `/extract-document` open** |
| `research.py` | `/api/admin/research` | 10 | `require_admin` (all) |
| `docusign.py` | `/api/docusign` | 6 | **none, incl. `/send-envelope`** |
| `stripe_payments.py` | `/api/stripe` | 4 | none (webhook signature-verified) |
| `rsvp.py` | — (absolute) | 3 | 2 public-by-code + rate-limited, 1 `require_planner` |
| `vendor_brief.py` | — (absolute) | 4 | 2 public-by-code, 2 `require_planner` |
| `kcr.py` / `kas.py` | `/api/admin` | 2 / 2 | `require_admin` |
| `weather.py` | `/api/weather` | 3 | none |
| `food_prices.py` | `/api/food-prices` | 1 | none |
| `instacart.py` / `kroger.py` | `/api/shopping` | 2 / 3 | none |
| `webhooks.py` | `/api/webhooks` | 2 | none |
| `lodging.py` | `/api/lodging` | 1 (`/unfurl`) | none |

Support modules: `research_executor.py` (pure provider execution; live mode hits **openFDA** and **Crossref** only, with a `LIVE_PROVIDERS` allow-list that raises rather than fabricating `[VF: :49, :352-356]`; simulate mode prefixes every statement `[SYNTHETIC]`) · `intel_audit.py` (pure, no DB/network) · `error_log.py` (best-effort, never raises) · `emailer.py` (**Resend**) · `docusign_client.py` (**DocuSign**, OAuth authorization-code grant, fail-soft).

**Migrations live in two places** `[VF]`:
- `backend/migrations/0001-0008` — `event_channels`, `event_messages`, `pinned_decisions`, `channel_read_state`, `event_owners`, `studios`, `studio_members`, `admin_support_notes`, `admin_audit_log`, `admin_error_log`, `kcr`, `kas_records`.
- `supabase/migrations/001-016` — `events`, `clients`, `studio_invitations`, `preferred_vendors`, `studio_settings`, `rsvp_submissions`, `research_*` (6 tables), `vendor_brief_links`, `vendor_brief_confirmations`, plus RPCs.

**`[KD]` `backend/MIGRATIONS.md` documents only 0001-0004** and is stale relative to 0005-0008 `[VF]`.

**`[KD]` `render.yaml` env drift.** It declares `DATABASE_URL`, `RESEND_API_KEY`, `COMMUNICATION_EMAIL_FROM`, `OPENWEATHER_KEY`, `BLS_API_KEY`, `PLANNER_DEV_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Names the code requires but the blueprint never lists: `OPENAI_API_KEY` (mentioned only in a comment), `ANTHROPIC_API_KEY`, `RESEND_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, all five `DOCUSIGN_*`, `KROGER_*`, `INSTACART_*`, all `POSTHOG_*` `[VF]`.

**`[KD]` `_verify_resend_signature` returns `True` unconditionally when `RESEND_WEBHOOK_SECRET` is unset** `[VF: main.py:94-95]` — documented in-file as a dev-mode gap.

---

## 8. Supabase usage from client code

Client created **only if both env names are set**, else the export is literally `null` and every caller must guard `[VF: src/lib/supabaseClient.js:31-35]`. Env names: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_AUTH_REDIRECT`. The file explicitly notes `VITE_*` will not work — hence the `define` shim in §1.

**Tables referenced from client code** (`.from(...)`) `[VF]`:
| Table | Site |
|---|---|
| `events` | `src/lib/api/events.js:86,127,147,184,190,212` |
| `clients` | `src/lib/api/clients.js:25,51,65,79` |
| `preferred_vendors` | `src/lib/api/vendors.js:42,74,88,102` |
| `studios` | `src/lib/api/studio.js:98` |
| `studio_members` | `src/lib/api/studio.js:52,100,115,123` |
| `studio_invitations` | `src/lib/api/studio.js:132,156,174` |
| `studio_settings` | `src/lib/api/profile.js:29,50` |

**RPCs**: `ensure_studio` (`studio.js:64`), `list_studio_members` (`:108`), `claim_pending_invitations` (`:181`) `[VF]`.
**Storage**: one bucket, `event-files` (`storage.js:16,64,78,101,117`) `[VF]`.
**Realtime**: **zero `.channel(` calls anywhere** — sync is poll/write-through only `[VF]`.

Every table/RPC the client touches is declared in `supabase/migrations/`. The reverse is not true: `rsvp_submissions`, `vendor_brief_*`, and the six `research_*` tables are declared but reached **only** through the FastAPI backend `[VF]`.

**`[KD]` The `event-files` bucket is not declared in version control** — no `storage.buckets` insert and no `storage.objects` RLS policy in `supabase/migrations/` or `SUPABASE_SETUP.md`. Bucket creation and its access policy are manual/out-of-band `[VF]`.

**hostv2's Supabase use is auth-only** — it imports `isSupabaseConfigured, supabase, authRedirectUrl` (`HostShellV2.jsx:134`) and calls `getSession` / `onAuthStateChange` / `signInWithOtp` / `signOut`, with **zero** `.from()`, `.rpc()`, `.storage.`, `.channel(` `[VF]`. Its data reads/writes go through `@app/lib/api/*`.

---

## 9. AI / model providers — honest status

**AI is real, not mocked or stubbed — but its surface is small and its blast radius is narrow.**

### What is real
Two providers, both server-side, both live HTTP `[VF: backend/app/routers/ai.py]`:
| Provider | URL const | Models | Call sites |
|---|---|---|---|
| OpenAI | `:38` `https://api.openai.com/v1/chat/completions` | `COMPLETIONS_MODEL = "gpt-4o-mini"` `:39`, `VISION_MODEL = "gpt-4o"` `:40` | `:250`, `:468`, `:586`, `:762` |
| Anthropic | `:51` `https://api.anthropic.com/v1/messages` | `ORCHESTRATOR_MODEL = env("ORCHESTRATOR_MODEL", "claude-sonnet-5")` `:74` | `:373` (SSE stream), `:399`, `:748` |

Plus one **browser-direct BYOK** call: `src/App.js:858` `fetch('https://api.anthropic.com/v1/messages')` with `anthropic-dangerous-direct-browser-access: 'true'` `:863` and `model: 'claude-haiku-4-5'` `:867` — the planner's own key, not the server's `[VF]`.

Every route degrades to a clean **503** when its key is missing (`ai.py:208, 326, 450, 503, 691, 693`) `[VF]`. `GET /api/ai/status` reports key-presence booleans and model ids only `[VF: :159-186]`.

### The architecture that matters
`/api/ai/orchestrate` is a **thin stateless relay for one Claude tool-calling turn** `[VF]`:
- The **client owns the loop** — `runOrchestration({question, ctx, transport, maxTurns:6})` `[VF: src/lib/orchestrator.js:42]`.
- The **tools are pure local JS engines**, run in the browser: 9 tools wrapping `hostSpending`, food plan, headcount, decisions, crab plan, budget recovery, travel plan, vendor plan, run of show `[VF: src/lib/orchestratorTools.js:27]`. `toolSchemas()` emits `properties: {}` — **the model chooses which read to make and can never supply data** `[VF: :50-54]`.
- The **system prompt is server-owned** (`ORCHESTRATOR_SYSTEM`, `ai.py:79`, injected at `:354`): *"HARD RULE: every figure … MUST come from a tool result."*
- Output passes a **deterministic numeric grounding check** — `groundingCheck()` regex-extracts numeric tokens from the answer and asserts each appears in a tool result or the question `[VF: src/lib/orchestrator.js:23-38]`.

### Where AI output actually reaches the user
- **hostv2: two surfaces only.**
  1. **Vendor reply parse** (`HostShellV2.jsx:174-260`) — model output is never rendered as prose; it becomes checkbox diff rows the host reviews. Model `confidence` is **deliberately discarded** (`:185-187`: *"a model grading its own extraction is invented confidence"*), evidence quotes are re-verified verbatim client-side (`:251`), and the UI is labelled *"AI-extracted · review against the message"* (`:240`) `[VF]`.
  2. **"Take a broader look"** (`:11767-11800`) — **the only place raw LLM prose is shown**, and only when the deterministic `answerPlanQuestion()` explicitly failed to match (`askResult.matched === false`, `:11767`) `[VF]`.
- **`src/CommandCenter.jsx`: zero AI.** No `fetch`, no aiProxy/orchestrator import; `:1098` states *"No AI, no fake urgency"* `[VF]`.
- **`src/App.js` (frozen CRA): ~11 call sites** stream model text into user-facing fields (document summary, checklist notes, proposal draft, event brief, message polish, budget JSON, vendor followup, schedule JSON, readiness). All draft-and-review; honest fallbacks exist (`src/App.js:20597` *"Rule-based summary…"*) `[VF]`.

### What is NOT AI, despite its name
- **`src/orchestration/` (9 files, ~78 KB) has nothing to do with the LLM orchestrator.** It is a deterministic UI behavioural-pressure engine (`pressureState`, `adaptiveHierarchy`, `trustCompression`, `cognitiveTunneling`, `continuityField`, `environmentalMemory`, `simulationScenarios`, `observationKit`) with zero network calls `[VF]`. Naming collision with `src/lib/orchestrator.js`.
- **`src/lib/knowledge/` (~124 files) makes zero LLM calls.** `copilot.js:5-6` says so in its own header; `evidenceIntelligence.js` is clustering/sorting; `consensusResolver.js` is weighted voting over hardcoded `AUTHORITY_RANK` / `CONFIDENCE_RANK` integers; `campaignRunner.js`'s "providers" are `.gov` reference URLs `[VF]`. "Copilot" / "Intelligence" / "Autonomous Runner" / "Consensus Resolver" all read as AI and are not.
- **`src/lib/askPlan.js` is the primary Q&A path and is explicitly non-AI** (`:1-8`: *"NOT fake AI… No LLM, no invented facts"*) `[VF]`.
- **`src/lib/vendorReplyParse.js` is the deterministic half** of a hybrid: the LLM extracts 18 allow-listed keys; every coercion, diff, and patch decision is regex/JS. Cross-language field parity with `ai.py:635 VENDOR_REPLY_FIELDS` is test-pinned `[VF: vendorReplyParse.js:5-8, :36-80]`.

### AI defects
- **`[KD]` `AI_FEATURES` drift** — `src/lib/aiProxy.js:13` omits `"message"`, which the backend defines at `ai.py:116`. A `callAiFeature('message', …)` is blocked client-side before reaching a backend that would accept it `[VF]`.
- **`[KD]` Provider default disagreement** — `aiProxy.js:88` sends `provider: 'claude'` by default; `ai.py:668` defaults `"openai"`. The client wins, so vendor-reply parse requires `ANTHROPIC_API_KEY`, not `OPENAI_API_KEY`, and 503s if only the latter is set `[VF]`.
- **`[KD]` `checkOrchestratorReady()` (`orchestratorClient.js:41`) is dead code** — no callers outside tests. The UI gates on `isOrchestratorApiConfigured()` (env presence), so a host can be offered "Take a broader look" against a backend with no `ANTHROPIC_API_KEY` and land on `{unavailable:true}` `[VF]`.
- **`[KD]` The grounding check is substring-based** — `groundingCheck` compares stripped numeric tokens against a flat `Set`, so an answer emitting `85` when a tool returned `1085` passes `[VF: orchestrator.js:23-35]`.
- **`[KD]` `docs/integrations/AI_PROVIDER_REALITY.md` is stale** — its at-a-glance table lists only `gpt-4o`, `gpt-4o-mini`, `claude-haiku-4-5`; no row for the orchestrator, `claude-sonnet-5`, or `/api/ai/orchestrate` `[VF]`.
- **`[KD]` `/api/ai/complete` and `/api/ai/extract-document` are open** — no auth, no rate limit, spending the server's OpenAI key. `/feature` has both `[VF: ai.py:442, :495 vs :203]`.

---

## 10. Prompt / orchestration layers

**Prompts live in exactly two files. There is no `prompts/` directory, no prompt versioning, and no eval harness.** `[VF]`

**Server-owned (`backend/app/routers/ai.py`) — 11 prompts, client can never supply a system prompt:**
- `ORCHESTRATOR_SYSTEM` `:79` (injected `:354` with `cache_control: ephemeral`).
- `FEATURE_SYSTEM_PROMPTS` `:102` — 9 entries: `event_brief`, `vendor_followup`, `document_summary`, `checklist_help`, `proposal`, `budget`, `schedule`, `readiness`, `message`. Unknown feature → 400 `:213`.
- Vendor-parse system prompt built inline `:724`; document-extraction prompt ~`:580`.

**Client-side user prompts — ~12 template literals:** `src/App.js` (10 sites: `:6298, 6308, 8710, 13737, 20545, 22995, 28050, 33616, 34736, 39799`), `src/lib/vendorCopilot.js:337` (`buildCopilotPrompt` — the only structured builder, feeds the rule-based preview in as ground truth and demands JSON out), and `src/lib/orchestrator.js:46` (**just the raw user question** — all instruction is server-side) `[VF]`.

**Hardening on `/api/ai/feature`:** allow-listed features, server-owned system prompts, `AI_MAX_INPUT_CHARS` / `AI_FEATURE_MAX_TOKENS` caps, and an in-process sliding-window rate limiter keyed on user id (`_rate_check`, `ai.py:122-131`; `AI_RATE_MAX` / `AI_RATE_WINDOW`). `[KD]` The limiter is per-process — `render.yaml` runs a single uvicorn process, so it holds today but breaks on horizontal scale (noted in-code at `ai.py:129`) `[VF]`.

**Streaming**: `accumulateSSE` (`orchestratorClient.js:104`) is real Anthropic Messages protocol code — passes `thinking`/`redacted_thinking` blocks through verbatim with signature preservation `:121,:136`, drops empty text blocks `:149` because replaying them 400s. Fixtures in `src/lib/__tests__/orchestratorStream.test.js:100` are **transcribed from a real stream**, not synthesised `[VF]`.

---

## 11. Playbook loading · recommendation generation · scoring

### 11.1 Playbook loading
- **39 playbook data files** in `src/lib/playbooks/data/` `[VF]`, statically imported and collected into `ALL_PLAYBOOKS` `[VF: src/lib/playbooks/index.js:87]`. No dynamic loading, no fetch, no CMS — the corpus is compiled into the bundle.
- `getPlaybook(eventType)` `[VF: :96-105]`: normalised registry lookup → fallback through `resolveCanonicalType(eventType)` (taxonomy) → `null`. Never guesses.
- `src/lib/playbooks/index.js` is **3,848 lines** exporting ~60 derivation functions: `playbookChecklist`, `playbookTasks`, `playbookDecisionBoard`, `playbookDecisionOptions`, `playbookCapacity`, `playbookRunOfShow`, `playbookRisks`, `playbookMilestones`, `eventSizing`, `attendanceBand`, `foodApproach`, … `[VF]`.
- `playbookRegistry.js` (300 lines) is a **read-only observability layer** — derives per-playbook health across 12 named engines with a `HEALTH = {OK, WARN, GAP, NA}` vocabulary and **deliberately no single fabricated numeric score** `[VF: :22-45]`. `ungroundedCostFactors()` `:49` flags decisions carrying `costFactors` without `costFactorProvenance`.

### 11.2 Recommendation generation — `surfaceRegistry` → `eventPlan`
`src/lib/surfaceRegistry.js` is the composition contract `[VF]`. A surface declares:
```
{ id, label, domain, raise(event) → [{ severity, title, why, route,
                                       key?, dueInDays?, leadDays?, ask? }] }
```
`severity ∈ 'critical' | 'attention'` only — "steel/ok are not asks". `key` is the **record** (vendorId, decisionId, …) so snooze/dedup key on identity, not on a title carrying a live count. `raiseAll(event)` `:699` is the single collector; `raiseCounts()` `:746` is exported but has **no runtime consumer** `[VF]`.

`eventPlan(event, ctx)` `[VF: src/CommandCenter.jsx:1662]` is the public single source, returning `{ nextActions, setAside, worries, progress, handled, vendorReadiness, vendorReadinessRollup, workstreams, planningState }`. It derives `ctx` itself when not passed `[VF: :1678-1681]`.

### 11.3 Scoring — three distinct scoring systems, all deterministic

**(a) Next-action band + time sort** `[VF: src/CommandCenter.jsx:2110-2141]`
```
_severityBand(a) = 0 if a.level === 'critical'
                   2 if calm filler (CALM_FILLER_CATEGORIES)
                   1 otherwise
sort: band asc; within band 1, dueInDays asc (nulls → Infinity); stable otherwise
```
Calm fillers are **purged entirely** whenever any real work or worry exists `[VF: :2114-2120]`. Snooze is applied **inside** `eventPlan` so every consumer reads one post-snooze truth `[VF: :2153-2162]`; a `critical` ignores its own stale snooze. A past-dated event empties all three lanes `[VF: :2175]`.

**(b) Decision priority score** `[VF: src/lib/playbooks/index.js:2196-2202]`
```
decisionPriorityScore = decisionTier + decisionImportance + decisionAging
                        + decisionStructuralTiebreak
```
- `decisionTier` `:2180` — `URGENT_OVERDUE` (overdue + weight high) > `CROSS_ZONE` (other overdue, or a ready decision that delivers the heart moment / is irreversible) > `READY` > `WAITING`.
- `decisionImportance` `:2153` — authored `weight` wins; otherwise `_derivedWeight` from `derivedImportanceOf` `:2133`: dietary/allergy/safety = 3.5, aesthetic-and-costless leaf = 0.75, else 1.5 + 1 (gates downstream) + 0.75 (carries cost). Plus `emotionalWeight`, `reversibility`, `deliversHeartMoment` (+2).
- `decisionAging` `:2168` — capped `AGING_CAP`, `AGING_PER_DAY` per overdue day.
- `decisionStructuralTiebreak` `:2189` — bounded at **0.2**, deliberately below the smallest importance step (0.25), so it can only reorder exact ties: `0.03·affects + 0.05·dependedOnCount + 0.03·carriesCost`.
- Every row carries `rankReason` `:2686` — host-facing "why is this here", preferring an authored `priorityBasis.rationale` `[VF: :2203-2213]`.

**(c) Readiness score** `[VF: src/lib/readinessHistory.js:33-39]` — `ON_TRACK`=1, `ATTENTION`=0.5, else 0, averaged over the **applicable** axes only (`applicableReadinessAxes`, `CommandCenter.jsx:1051`), ×100 rounded. Returns `null` when no axis applies — no fabricated 0.

**`[VF]` Nothing in the recommendation or scoring path calls a model.**

---

## 12. Feature flags · analytics · error monitoring

### Feature flags
**`[VF]` No flag registry, no `isEnabled()` helper, no PostHog feature flags** (zero hits for `isFeatureEnabled|onFeatureFlags|getFeatureFlag`).

**The "PI" family — 11 flags, each a hand-rolled predicate in its own module, all default-ON** with identical three-tier precedence *URL param → localStorage → env kill-switch* (`=== 'false'`) `[VF]`:

| Flag | Env name | localStorage | Predicate |
|---|---|---|---|
| nav | `REACT_APP_PI_NAV` | `ngw-pi-nav` | `navOn()` — `presentationNav.js:14` |
| shell | `REACT_APP_PI_SHELL` | `ngw-pi-shell` | `hostShellOn()` — `presentationNav.js:43` |
| planv2 | `REACT_APP_PI_PLANV2` | `ngw-pi-planv2` | `planV2On()` — `presentationNav.js:65` |
| labels | `REACT_APP_PI_LABELS` | `ngw-pi-labels` | `labelsOn()` — `presentationLabels.js:13` |
| memory | `REACT_APP_PI_MEMORY` | `ngw-pi-memory` | `memoryOn()` — `decisionMemory.js` |
| identity | `REACT_APP_PI_IDENTITY` | `ngw-pi-identity` | `identityOn()` — `eventIdentity.js:12` |
| decisions | `REACT_APP_PI_DECISIONS` | `ngw-pi-decisions` | `decisionsOn()` — `decisionConfidence.js:20` |
| confidence | `REACT_APP_PI_CONFIDENCE` | `ngw-pi-confidence` | `confidenceOn()` — `confidenceGrammar.js:20` |
| attention | `REACT_APP_PI_ATTENTION` | `ngw-pi-attention` | `attentionOn()` — `positiveAttention.js:19` |
| moments | `REACT_APP_PI_MOMENTS` | `ngw-pi-moments` | `momentsOn()` — `momentLibrary.js:15` |
| voice | `REACT_APP_PI_VOICE` | `ngw-pi-voice` | `presentationVoiceOn()` — `nextActionRenderer.js:175` |

`nav` is the most load-bearing — via `hostNavActive(event) = navOn() && audiencePersona(event)==='host'` `[VF: presentationNav.js:34]` it drives the host-vs-planner render split at ~18 sites in `App.js` `[VF]`.

**`[KD]` Three PI flags are dead** — `attentionOn()`, `confidenceOn()`, `decisionsOn()` have the full three-tier machinery and **no consumers outside their own defining module** `[VF]`.
**`[KD]` The env tier is build-time only** (CRA inlines `REACT_APP_*`), so a deployed bundle can only be flipped per-browser via URL param or localStorage — unauthenticated, no server-side or per-user targeting exists `[VF]`.

Other env gates: `REACT_APP_ENABLE_GOOGLE_AUTH`, `REACT_APP_INVITE_ONLY`, `REACT_APP_AUTH_BYPASS`, `REACT_APP_BYPASS_ROLE`, and `REACT_APP_BILLING_LIVE` (`HostShellV2.jsx:11579` — `canCharge`, gating live Stripe; **the only env flag read in hostv2**) `[VF]`.

### Analytics — PostHog
`src/lib/analytics.js` `[VF]`: lazy `await import('posthog-js')` on first `track()`, memoized. Privacy-hard init `:53-60` — `autocapture:false`, `capture_pageview:false`, `capture_pageleave:false`, `disable_session_recording:true`, plus `sanitize_properties` deleting `email/name/phone/$email/$name`, **and** a second strip at capture time `:98-104`.
- Env names: `REACT_APP_POSTHOG_KEY`, `REACT_APP_POSTHOG_HOST`.
- **`[KD]` The key is not env-gated in practice** — `:19` falls back to a hardcoded `phc_…` project key committed in source (justified in-comment as a public write-only ingest key). Analytics is on by default in every deployed build with no env var set `[VF]`.
- Dev no-op is **hostname-based**, not `NODE_ENV`: `IS_LOCAL` `:22` → `getPostHog()` returns `null` `:42`. On localhost `track()` still pushes to `window.__NGW_TRACK__` `:95` for QA assertions.
- Opt-out `:29-35`: `?noanalytics=1` or `localStorage['ngw-analytics-optout']==='1'`.
- Identity `:73-85`: pseudonymous `studio_<slug>` derived from `businessName`; sends `studio_name` + `role` only.

**Event names** — all emissions go through the `EVENTS` constant map `[VF: analytics.js:109-224]`; **zero raw string-literal `track('...')` calls** repo-wide. Only three importers: `src/App.js:87`, `HostShellV2.jsx:81`, `InviteV2.jsx:15`.

`page_view` · `tab_changed` · `event_created` · `event_opened` · `account_type_selected` · `host_home_viewed` · `host_next_step_clicked` · `first_guest_added` · `first_vendor_added` · `invite_shared` · `invite_viewed` · `invite_rsvp_submitted` · `guest_rsvp_received` · `plan_yours_tapped` · `lodging_paste_attempted` · `lodging_paste_parsed` · `lodging_option_added` · `signed_up` · `intake_committed` · `first_value` · `returned_d1` · `returned_d7` · `event_qualified` · `assemble_viewed` · `second_event_created` · `decision_captured` · `ros_item_added` · `event_completed` · `outcome_captured` · `intel_attendance_applied` · `intel_attendance_reverted` · `intel_rec_shown` · `intel_rec_overridden` · `intel_rec_evaluated` · `source_selected` · `vendor_added` · `vendor_contract_sent_docusign` · `vendor_contract_uploaded` · `vendor_payment_recorded` · `message_sent` · `global_compose_opened` · `approval_requested` · `approval_recorded` · `client_created` · `client_form_section_opened` · `docusign_connected` · `email_sent` · `file_uploaded` · `ics_downloaded` · `weather_alert_shown` · `rsvp_reminder_sent` · `ai_copilot_used` · `day_mode_opened` · `shopping_plan_viewed`

**`[KD]` ~13 of these are declared but never emitted** (no `EVENTS.X` reference at any call site): `event_opened`, `global_compose_opened`, `approval_requested`, `client_form_section_opened`, `docusign_connected`, `email_sent`, `file_uploaded`, `weather_alert_shown`, `ai_copilot_used`, `vendor_contract_sent_docusign`, `vendor_contract_uploaded`, `vendor_payment_recorded`, `intel_rec_overridden` `[VF]`. Roughly a quarter of the catalog is aspirational.

`src/lib/analyticsReader.js` **has no PostHog dependency** despite the name — it is a pure offline reader over the local `ngw-events` array powering admin panels, and it explicitly names the PostHog events it cannot read rather than fabricating numbers `[VF: :8-11, :224-227]`.

### Error monitoring — Sentry
`src/lib/sentry.js` (39 lines) `[VF]`:
- Env name: `REACT_APP_SENTRY_DSN` `:6`. Double gate `:12`: `SEND = Boolean(DSN) && NODE_ENV === 'production'`.
- `Sentry.init` is called `:18`, from **exactly one place** — `src/index.js:9`, before React renders `[VF]`.
- Config: `browserTracingIntegration()` only, `tracesSampleRate: 0.1`, `sendDefaultPii: false`. **No** replay integration, **no** error `sampleRate` (so errors default to 1.0).
- **DSN presence in committed config: ABSENT.** Declared-but-empty in `.env.example:50` and `.env.production.example:23`; present only in gitignored `.env.local` (which cannot fire anyway, since `SEND` also requires production). As configured in-repo, **Sentry is inert** `[VF]`.
- **`[KD]` No `beforeSend` scrubbing** — no `beforeSend`, `beforeSendTransaction`, `denyUrls`, `ignoreErrors`, or `beforeBreadcrumb`. `captureError(err, context)` `:32-37` passes caller-supplied context straight through as `extra`. PostHog has two PII layers; Sentry has one flag. Asymmetric.
- **`[KD]` hostv2 has no Sentry at all** — zero matches for `@sentry|initSentry|captureError` in `hostv2/` `[VF]`. `hostv2/src/ErrorBoundary.jsx` has no reporting wiring. Unhandled errors in the **live** 15,639-line shell are reported nowhere, even though hostv2 does share analytics and Supabase from `@app/lib/*` — the omission is specific, not general.

---

## 13. Deployment

**Frontend → GitHub Pages, hand-driven.** `[VF]`
- `npm run deploy` = `predeploy: npm run build` → `gh-pages -d build --dotfiles` → `gh workflow run pages.yml` `[VF: package.json:16-17]`.
- `.github/workflows/pages.yml` triggers on push to `gh-pages` (or manual), checks out that branch and publishes it via `upload-pages-artifact` + `deploy-pages`. It **does not build** — it publishes what `gh-pages` already contains. The header documents that the legacy branch-build pipeline was abandoned after three consecutive 20-30 min hangs `[VF]`.
- **hostv2 ships as a static subdirectory of the CRA build.** `hostv2 vite build` → `hostv2/dist/` → **manually rsynced** into `public/hostv2/`, which CRA then copies into `build/` `[VF: documented at docs/HANDOFF_hero_composition.md:194 — `rsync -a --delete dist/ ../public/hostv2/`]`. `public/hostv2/` is **tracked** (12 files) `[VF: git ls-files]`; `build/` is gitignored `[VF: .gitignore]`.

**`[KD]` The tracked hostv2 bundle is stale relative to the working tree.**
```
public/hostv2/assets/HostShellV2-d2c51e67.js   855,238 B   17:09  (tracked, ships)
hostv2/dist/assets/HostShellV2-974d773d.js     855,243 B   19:26  (untracked, current)
```
`[VF: ls -la]`. Commit `097ce84e` is titled *"Rebuild hostv2 for …"*, so `public/hostv2/` was synced at that commit; the working-tree `HostShellV2.jsx` edit (the solemn-day guard at `:5642`) is in `dist/` but **not** in the shipped copy `[CSI]`. This is the exact "green Pages run ships stale hostv2" trap the deploy notes warn about — the load-bearing check is the `HostShellV2-<hash>.js` filename, not `index.html`.

**`[KD]` CI builds no frontend artifact and injects no `REACT_APP_*` secrets.** `pages.yml` publishes a pre-built branch; `checks.yml` builds hostv2 only to run tests on it. A CI-built bundle would therefore ship with `REACT_APP_API_BASE_URL` unset and AI silently gated off, while the locally-built committed bundle has the URL baked in `[VF/CSI]`.

**Backend → Render.** `render.yaml` declares **one** service: `type: web`, `name: ngw-events-api`, `runtime: python`, `rootDir: backend`, `plan: free`, `buildCommand: pip install -r requirements.txt`, `startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT`, `healthCheckPath: /health`, `autoDeploy: true` `[VF]`. Single process — matches the in-process rate limiter and token cache assumptions (§10).

---

## 14. Testing setup

| Suite | Runner | Config | Scope |
|---|---|---|---|
| Unit / engine | Jest via `react-scripts test` `[VF: package.json:14]` | **none** — no `"jest"` key in `package.json`, no `src/setupTests.js` `[VF]` | **280 test files** under `src/` `[VF]` |
| Browser | Playwright `^1.61.1` `[VF: hostv2/package.json:22]` | `hostv2/playwright.config.mjs` | `hostv2/e2e/boardMatrix.spec.mjs` — 8 tests × 4 viewports |
| Parity gate | plain Node | `hostv2/src/parity/check-parity.mjs` | runs inside `hostv2 npm run build` |
| Backend | pytest `>=7.0` `[VF: backend/requirements-dev.txt]` | none | **141 test functions across 9 files**, asyncpg + httpx stubbed, no network |

Playwright runs against the **built bundle under `vite preview`** on port 5233 with a fresh browser context per test — never the dev server, never the user's real browser/localStorage `[VF: playwright.config.mjs:11-38]`. Four projects: `mobile` 430×860, `landscape` 860×430, `tablet` 768×1024, `tablet-land` 1024×768.

CI (`checks.yml`) runs two jobs on every push/PR except `gh-pages`: `jest` (`CI=true npx react-scripts test --watchAll=false`) and `e2e` (installs **both** npm trees, `npx playwright install chromium`, `npm run build` in hostv2 — which runs the parity gate — then `npm run test:e2e`) `[VF]`.

**Evidence collected by Phase 1 (not by me):** `evidence/07_jest_raw.txt` records `Test Suites: 282 passed, 282 total · Tests: 4229 passed, 4229 total · Time 8.076 s`. `evidence/07_e2e.txt` records the Playwright run **failing to start** locally: *"You are running Node.js 16.16.0. Playwright requires Node.js 18 or higher."* `[VF: the files exist and say this — I did not run either suite]`.

**`[KD]` The E2E layer cannot run on the default local shell** (Node 16 resolves first). It only runs in CI, where `setup-node@v4` pins Node 20. `playwright.config.mjs:4-5` documents the `PATH="$(brew --prefix node)/bin:$PATH"` workaround.

Notable structural test classes (all in `src/__tests__/` and `src/lib/__tests__/`): `routeExecution.test.js` and `ctaSourceOfTruth.test.js` drive the **real** `resolveRoute` rather than a mirror; `decisionWireProof.test.js`; `ctaNamesTheAct.test.js`; `hostStringLint.test.js` / `hostLanguage.test.js`; `heroAskDedup.test.js` (asserts `heroAskFor(` appears **exactly once** in the shell source — a source-text lint, not a behavioural test); `heroComposition.test.js` (same technique) `[VF]`.

**`[KD]` A meaningful fraction of the hero/ask gates are source-text regex assertions over `HostShellV2.jsx`, not behavioural tests.** `heroComposition.test.js` strips comments and matches literal expressions like `/if \(od && !heroSpeaksThisOverdue && !solemn\) slips\.push\(/` `[VF: the uncommitted diff, :528]`. They catch deletion; they do not prove the rendered output.

---

## 15. DATA FLOW — traced through real functions

Path: **hostv2** (the live shell). Every hop is a real function with `file:line`. **Not runtime verified** — this is the call graph as written.

```
① EVENT CREATION
   HostShellV2.jsx:4705   assemble()
                          ├─ parses host free text (parseSmartEventText, @app/lib/smartParseEvent)
   HostShellV2.jsx:4726   ├─ newId = redoId || mintEventId()          → eventPool.js:45  'cust-<t36>-<rand>'
   HostShellV2.jsx:4727   ├─ ev = { id, rsvpCode, createdAt, name, honoree, type, date,
   ..4759                 │        venue, venueKind, venueCity/venueState (strict gate),
                          │        guestMode:'count', guestEstimate, totalBudget,
                          │        isDestination, budget:[], guests:[], vendors:[], timeline:[] }
   HostShellV2.jsx:4767   ├─ Object.assign(ev, defaultStartTime(ev, null))   → @app/lib/startTime
                          │     writes startTime + startTimeSource:'derived' + its provenance line
   HostShellV2.jsx:4772   ├─ ev.timeline = playbookChecklist(ev).map(...)    → playbooks/index.js:802
   HostShellV2.jsx:4773   ├─ setCustoms(list => [...list, ev])
   HostShellV2.jsx:4774   ├─ setEventId(newId)
   HostShellV2.jsx:4780   └─ if (session) cloudSaveEvent(ev).then(recordSaveResult)
                                                            → src/lib/api/events.js:112

② EVENT STATE
   HostShellV2.jsx:1988   useEffect → localStorage.setItem('ngw-hostv2-custom-events', JSON(customs))
   HostShellV2.jsx:1993   useEffect → localStorage.setItem('ngw-hostv2-last-event', eventId)
   HostShellV2.jsx:996    event = useMemo(() => ({ ...(base||FALLBACK), ...(activeCustom ? {} : patch) }))
   HostShellV2.jsx:1151   ctx   = useMemo(() => buildExperienceContext(event, profile, 1))
                                                            → src/lib/experienceContext.js

③ PLAYBOOK / CAPABILITY SELECTION
   playbooks/index.js:96  getPlaybook(event.type)
                          ├─ REGISTRY[norm(type)]                          (direct hit)
   playbooks/index.js:101 └─ resolveCanonicalType(type) → REGISTRY[...]    → eventTaxonomyAdapter.js
                             null when no playbook exists — never a guess
   HostShellV2.jsx:1180   decisionBoard = playbookDecisionBoard(event, undefined, profile)
                                                            → playbooks/index.js:2268
                          └─ HostShellV2.jsx:1186 drops the venue-KIND decision once a real
                             venue is on file (a static default must not contradict a set venue)

④ DECISION COMPOSITION (candidate generation)
   CommandCenter.jsx:1662 eventPlan(event, ctx)
   CommandCenter.jsx:1678 ├─ ctx = buildExperienceContext(...) if caller passed none
   CommandCenter.jsx:1684 ├─ foundation = _eventFoundationActions(event)
   CommandCenter.jsx:1702 ├─ _selectEventNextActionInner(event)   (CommandCenter.jsx:2393)
   CommandCenter.jsx:1844 ├─ raised = raiseAll(event)             → surfaceRegistry.js:699
                          │     every surface's raise() → { severity, title, why, route,
                          │                                 key?, dueInDays?, leadDays?, ask? }
   CommandCenter.jsx:1852 └─ .sort((a,b) => (a.priority||9) - (b.priority||9))   (within a producer)

⑤ SCORING / RANKING
   CommandCenter.jsx:2114 calm fillers purged when any real work or worry exists
   CommandCenter.jsx:2126 dueInDays / leadDays normalized to number|null (never invented)
   CommandCenter.jsx:2133 nextActions.sort(band asc → within band 1, dueInDays asc; V8-stable)
   CommandCenter.jsx:2153 snooze applied HERE → item moves to setAside (criticals ignore snooze)
   CommandCenter.jsx:2175 past-dated event → nextActions/setAside/worries all emptied
   ── decisions are scored separately ──
   playbooks/index.js:2196 decisionPriorityScore = tier + importance + aging + structuralTiebreak
   playbooks/index.js:2686 r.rankReason = decisionRankReason(r)   (host-facing "why is this here")

⑥ RECOMMENDATION RENDERING
   HostShellV2.jsx:1154   plan   = useMemo(() => eventPlan(event, ctx))
   HostShellV2.jsx:2270   actions = plan.nextActions || []
   HostShellV2.jsx:2307   queue   = elegantMode
                             ? [...actions.filter(not satisfied && not a demoted vendor-confirm),
                                ...blockerDecisions.filter(not satisfied)]
                             : actions
   HostShellV2.jsx:2325   listIsCalm / :2331 askMode
   HostShellV2.jsx:2349   heroDecisionRow  — the decision the hero is speaking, or null
   HostShellV2.jsx:2373   heroAskText      — THE one ask string, hoisted so every consumer
                                             (h2, card-title dedup, browser tab) reads the
                                             string that is on screen
   HostShellV2.jsx:1658   decisionFor(a)   — dispatcher: 'decision:*' → playbookDecisionND
                                                          'phase:food' → foodDecisionND
                                                          'blocker:*'  → inline adapter
   HostShellV2.jsx:1594   playbookDecisionND(dec)
                          ├─ playbookDecisionOptions(event, dec.id)   → playbooks/index.js:2894
                          ├─ decisionApproach(dec, dopts)             → doItForMe.js:1108
                          │     'can-derive' + grounded  → mode:'propose' + proposed + note
                          │     'can-derive' no ground   → mode:'ask'  (no false confidence)
                          │     'needs-host'/unmodelled  → mode:'ask'
                          └─ → NormalizedDecision { id, options[], proposed|null, why, settle }
   HostShellV2.jsx:1501   renderDecision(nd)  — ONE renderer for every pick-style decision
                          settled → all options, chosen badged
                          propose → pick row + "our pick" + why tooltip + "Other ways ▸"
                          ask     → equal rows, no faked pick

⑦ USER ACTION
   HostShellV2.jsx:1508   optRow onClick → nd.settle(o.value)
   HostShellV2.jsx:1470   settleDecision(r, opt)
                          └─ patchEvent({ foodChoices: { ...prev, [r.id]: opt } },
                                        r.label + ': ' + opt + ' — settled.')
   HostShellV2.jsx:6318   the hero variant also pushes a.id into satisfiedIds (roll-to-next)

⑧ PERSISTENCE
   HostShellV2.jsx:3894   patchEvent(obj, msg, opts)
   HostShellV2.jsx:3902   ├─ undoPrev = snapshot of every key this write touches
   HostShellV2.jsx:3905   ├─ activeCustom → setCustoms(map replace)
   HostShellV2.jsx:3913   │                 if (session) cloudSaveEvent(next).then(recordSaveResult)
   HostShellV2.jsx:3916   ├─ else          → setPatch({...p, ...obj})
   HostShellV2.jsx:3922   │                 if (session && realBase) cloudSaveEvent({...base,...patch})
   HostShellV2.jsx:3928   └─ toast/hero-receipt with Undo → patchEvent(undoPrev,'Undone.',{noUndo:true})
   HostShellV2.jsx:1985   useEffect → localStorage['ngw-hostv2-patch-<id>'] = JSON(patch)
   HostShellV2.jsx:1988   useEffect → localStorage['ngw-hostv2-custom-events'] = JSON(customs)
   api/events.js:112      saveEvent(event) → Supabase `events` upsert, else queue to
                          'ngw-cache-pending'; api/syncState.js records the honest result

⑨ SUBSEQUENT RECOMMENDATION UPDATE
   setCustoms/setPatch → HostShellV2.jsx:996  event useMemo invalidates
                       → :1151 ctx recomputes  (buildExperienceContext)
                       → :1180 decisionBoard recomputes (playbookDecisionBoard)
                       → :1154 plan recomputes  (eventPlan → raiseAll → re-band → re-sort)
                       → :2270 actions / :2307 queue re-derive
                       → :2349 heroDecisionRow / :2373 heroAskText re-derive
                       → renderDecision paints the next ask
   The settled decision leaves the queue two ways: (a) its playbook status flips so
   playbookDecisionBoard no longer emits it open; (b) satisfiedIds filters it immediately
   so the hero advances even when the underlying PHASE still has open items
   [VF: HostShellV2.jsx:2304-2306 comment + :2308 filter].
```

**`[UQ]`** Whether ⑨ actually repaints in the browser within one frame, and whether every one of the ~200 `useState` values in the shell participates correctly, is **not runtime verified**. The dependency arrays are correct as written; that is all this trace establishes.

---

## 16. Competing or duplicate implementations

### 16.1 The two front-ends — `src/App.js` vs `hostv2/src/HostShellV2.jsx`
**Live:** hostv2. **Donor/frozen:** `src/App.js`.
**Evidence:** CLAUDE.md declares `src/App.js` FROZEN, donor-only, A1 freeze 2026-07-16, CRA deletion scheduled post-Sprint-2. Both render a full host experience over the same engines. `src/App.js` = 46,988 lines; `HostShellV2.jsx` = 15,639. hostv2 imports ~135 modules from `@app` but **not** `App.js`. Neither is deleted; both are built and both ship to the same Pages origin (`/ngw-event-planner/` and `/ngw-event-planner/hostv2/`) `[VF]`.
**Consequence:** they share an origin and therefore share `localStorage` — see §5's cross-writes.

### 16.2 `src/CommandCenter.jsx` — component and engine in one file
**Both live, in different roles.** `src/App.js:137` imports it as a **default React component** *and* 14 named engine exports; `App.js:43717` and `:44485` render `<CommandCenter …/>`. `HostShellV2.jsx:10` imports only `eventPlan, applicableReadinessAxes` `[VF]`.
**Evidence of the seam:** `src/lib/snooze.js`, `taskRoute.js`, `taskLead.js`, `workstreams.js`, and `surfaceRegistry.js` all import from `./CommandCenter` — i.e. `src/lib/` depends on a top-level JSX component file `[VF]`. This is a layering inversion, not a duplicate, but it is why hostv2 cannot avoid bundling the CRA component.

### 16.3 Two hero-copy engines — `src/lib/planHeroCopy.js` vs hostv2's inline hero ladder
**`[KD]` The clearest live duplicate.**
- `planHeroCopy(event, priceFactor)` `[VF: src/lib/planHeroCopy.js:27]` derives the Plan-tab hero from `playbookDecisionBoard` + `playbookFoodPlan`, with 5 named states.
- **Its only consumer is `src/App.js:63` (import) / `:42501` (call)** — the frozen CRA `[VF]`. The `routeResolver.js:129` hit is a comment, not a call.
- hostv2 composes its hero **inline** in `HostShellV2.jsx`: `heroDecisionRow` `:2349` + `heroAskText` `:2373` + the slips ladder at `:5639`.
- **The repo says so itself.** The uncommitted `heroComposition.test.js` adds a describe block whose comment reads: *"The planHeroCopy fix reached the CRA Plan tab only — hostv2 does NOT consume planHeroCopy (a grep matched a comment, not a call). This is the same defect on the other surface, and it needed its own guard."* `[VF: the working-tree diff, :526-529]`.
- **The cost, evidenced:** the solemn-day fix had to be written **twice** — once in `planHeroCopy.js` (committed) and once in `HostShellV2.jsx:5642` (uncommitted, `!solemn` added to the slips guard) `[VF]`.

### 16.4 Two route resolvers — `src/lib/routeResolver.js` vs `src/App.js`'s `go()` ladder
**Live in hostv2:** `resolveRoute` (pure, executed by `routeSheet`, driven directly by `routeExecution.test.js` / `ctaSourceOfTruth.test.js`).
**Live in CRA:** `go(newTab, itemId, opts)` `[VF: src/App.js:43593]` plus `normalizeEventTabRoute` `:43597` — a hand-wired tab ladder.
**Evidence:** `grep -c resolveRoute src/App.js` → **0** `[VF]`. `routeResolver.js`'s own header says its branches are *"a verbatim port of a routeSheet branch, in the SAME ORDER"* — i.e. it was extracted from hostv2, and the CRA was never migrated onto it `[VF]`.
**Consequence:** the enforcement test drives only the hostv2 resolver. CRA route landings are unguarded by it.

### 16.5 Two ask-vocabulary paths — `heroAskFor()` vs the shell's `heroAskText` ladder
**Both live, layered, and the layering is the fix for a real shipped bug.**
- `heroAskFor(a, event)` `[VF: src/lib/heroAsk.js:16]` — extracted from the shell on 2026-07-30 precisely so the dedup predicate could be tested. It has **no decision branch**.
- `heroAskText` `[VF: HostShellV2.jsx:2373]` — a 6-rung ladder (day-of → blocker → conflict → COI → `heroDecisionRow` → `heroAskFor`). `heroAskFor` is only the **tail fallback**.
- **The evidenced defect this closed:** three surfaces spoke the ask and only one computed it; the `<h2>` ran the ladder while the card-title dedup and the browser tab called `heroAskFor()` directly. On Game Night the h2 said *"Who provides the food?"* while the dedup compared against *"Decide the menu."* → the host read the same ask twice. Reunion happened to overlap and was suppressed. *"Same component, opposite result, decided by a coincidence of vocabulary."* `[VF: HostShellV2.jsx:2334-2348 comment]`
- **The gate is a source-text lint:** `heroAskDedup.test.js:147-151` asserts `heroAskFor(` appears **exactly once** in `HostShellV2.jsx` `[VF]`.
- **`[UQ]`** Whether the CRA app has the same two-derivation problem — `heroAskFor` has zero importers in `src/App.js` `[VF]`, so the CRA hero uses a third vocabulary entirely (`planHeroCopy`).

### 16.6 Two solemn classifiers — **resolved on 2026-07-30, and the resolution is the working-tree diff**
**Now one:** `src/lib/solemn.js` exporting `SOLEMN_RE` + `isSolemnEvent(event)` `[VF: :29-34]`.
**Consumers:** `src/lib/planHeroCopy.js:22` and `hostv2/src/HostShellV2.jsx:29` `[VF]`.
**Evidence it was duplicated:** `solemn.js`'s own header — *"Extracted from HostShellV2 (2026-07-30) because the shell knew and the shared copy engine did not — the same 'capability exists but never reaches the consumer' shape this codebase keeps paying for."* The documented cost: a repast four days out rendered *"Settle: Who provides the food"* / *"2 decisions are past their easy window"* to a bereaved family, contradicting `repast.js`'s own researched `culturalContext` `[VF: solemn.js:5-20]`.
**Gate:** the uncommitted test asserts the shell derives from the shared classifier and **no longer defines its own regex** — `expect(src2).not.toMatch(/const SOLEMN_RE = /)` `[VF: heroComposition.test.js diff, :533-535]`.

### 16.7 Two next-action engines — `selectEventNextAction` (Spine) vs `eventSolve.mjs` (shadow)
**Live:** the Spine — `_selectEventNextActionInner` `[VF: CommandCenter.jsx:2393]`, consumed by `eventPlan`.
**Shadow, flag-gated:** `enginePreview()` from `src/lib/eventSolve.mjs` via `eventSolveAdapter.js`, rendered by `src/components/EngineNextStep.jsx` — mounted at `src/App.js:45076` but returning `null` unless `localStorage['ngw-engine-preview']==='1'` or `?enginePreview=1` `[VF: EngineNextStep.jsx:24-32]`. Its own header calls it *"shadow-mode preview … never replaces the Spine"*, and it logs agreement/disagreement to `ngw_engine_shadow_v1` `[VF: :1-3, :53]`.
**`[KD]` The shadow engine is bundled everywhere anyway.** `src/lib/playbooks/index.js:54` imports `resolveCanonicalType` from `eventTaxonomyAdapter` → `eventSolveAdapter` → `eventSolve.mjs`. Meanwhile `HostShellV2.jsx:110` imports the same taxonomy **directly** from `@app/lib/eventTaxonomy.mjs`. Two import paths to one source of truth; the longer one drags a dead engine into every bundle that touches playbooks `[VF/CSI]`.
**`[VF]` The adapter chain is deliberate**, not accidental: `eventTaxonomyAdapter.js:1-6` documents that importing the CJS taxonomy directly from multiple ESM modules tripped a production *"ES Modules may not assign module.exports"* runtime guard.

### 16.8 Two orchestrators by name — `src/lib/orchestrator.js` vs `src/orchestration/`
**Not duplicates — a naming collision.** `src/lib/orchestrator.js` is the LLM tool-calling loop; `src/orchestration/` (9 files, ~78 KB) is a deterministic UI pressure/hierarchy engine with zero network calls `[VF, §9]`. **`[KD]`** Any architecture summary that files `src/orchestration/` under "AI" is wrong.

### 16.9 Two Q&A paths — `answerPlanQuestion` vs `runOrchestration`
**Layered, not competing, and the layering is explicit.** `answerPlanQuestion(t, askCtx)` runs **first and always** on every question `[VF: HostShellV2.jsx:11689]`; the LLM escalation renders only when `askResult.matched === false` `[VF: :11767]`. `askPlan.js:1-8` states *"NOT fake AI… No LLM, no invented facts."*

### 16.10 Four RSVP-outbox writers on one key
**`[KD]`** `ngw-rsvp-queue-<eventId>` is read-modify-written by four independent implementations with no locking: `src/lib/api/rsvp.js:181-182`, `src/App.js:31776/31801`, `HostShellV2.jsx:3984/3986`, `InviteV2.jsx:628/655` `[VF]`. The guest-name merge itself **was** deduplicated — `src/lib/guestMerge.js`, described in-shell as *"extracted from App.js + this file's former inline copy; both apps now consume one implementation"* `[VF: HostShellV2.jsx:3958-3961]` — but the queue I/O was not.

### 16.11 Two migration directories
**`[KD]`** `backend/migrations/0001-0008` and `supabase/migrations/001-016` both own parts of one Postgres schema, with no cross-reference and no combined ordering. `backend/MIGRATIONS.md` documents only 0001-0004 `[VF, §7]`.

### 16.12 Two invite/RSVP surfaces
`src/App.js`'s `?rsvp` branch and `hostv2/src/InviteV2.jsx` `[VF]`. Both live on the same origin at different paths. **`[VF]` The vendor-brief surface, by contrast, was deliberately *not* duplicated** — `hostv2/src/main.jsx:13-14` redirects `?vendor=TOKEN` to the legacy CRA page, with the in-file rationale *"V2 renders no brief surface of its own: a vendor's link must never answer with a host shell."*

---

## 17. Summary of known defects surfaced by this phase

| # | Defect | Evidence |
|---|---|---|
| D1 | Tracked hostv2 bundle (`public/hostv2/assets/HostShellV2-d2c51e67.js`, 17:09) is older than the current build (`dist/…-974d773d.js`, 19:26) — the working-tree fix does not ship | §13 |
| D2 | hostv2 has **no error monitoring at all**; the live 15,639-line shell reports nothing | §12 |
| D3 | Sentry has no `beforeSend` scrubbing while PostHog has two PII layers; `captureError` passes context through raw | §12 |
| D4 | Two parallel event stores (`ngw-events` vs `ngw-hostv2-custom-events`), never reconciled; hostv2 reads the CRA store once at module load and never again | §5 |
| D5 | `ngw-profile` is blind-overwritten by the CRA and read-merge-written by hostv2 | §5 |
| D6 | Four independent read-modify-write implementations on `ngw-rsvp-queue-<id>` | §16.10 |
| D7 | Quota recovery exists at one site and does not cover hostv2's per-event PII import snapshots | §5 |
| D8 | `/api/ai/complete` and `/api/ai/extract-document` are unauthenticated and unrate-limited, spending the server's OpenAI key | §7, §9 |
| D9 | `_verify_resend_signature` returns `True` when `RESEND_WEBHOOK_SECRET` is unset | §7 |
| D10 | `REACT_APP_AUTH_BYPASS` has no `NODE_ENV` guard at its three read sites and is present in the local production env file | §6 |
| D11 | `render.yaml` omits ~15 env var names the code requires, including both AI keys and both Stripe secrets | §7 |
| D12 | CI injects no `REACT_APP_*`; a CI-built bundle would ship with AI silently gated off while the committed bundle has the URL baked in | §13 |
| D13 | `planHeroCopy` reaches only the frozen CRA; hostv2's hero is a separate implementation — the solemn fix had to be written twice | §16.3 |
| D14 | The CRA app does not use `resolveRoute`; the route-landing enforcement test covers hostv2 only | §16.4 |
| D15 | The shadow engine `eventSolve.mjs` is bundled into every consumer of playbooks via the `eventTaxonomyAdapter` chain | §16.7 |
| D16 | 3 PI flags (`attention`, `confidence`, `decisions`) are fully built and have no consumers | §12 |
| D17 | ~13 declared analytics events are never emitted | §12 |
| D18 | `raiseCounts()` is exported with no runtime consumer | §11 |
| D19 | `checkOrchestratorReady()` is dead code; the UI gates on env presence instead | §9 |
| D20 | Grounding check is substring-based on numeric tokens (`85` passes against `1085`) | §9 |
| D21 | Two migration directories, one schema; `backend/MIGRATIONS.md` stale at 0004 | §7, §16.11 |
| D22 | `event-files` storage bucket + its RLS policy are not in version control | §8 |
| D23 | E2E cannot run on the default local shell (Node 16 vs Playwright's ≥18) | §14 |
| D24 | `docs/integrations/AI_PROVIDER_REALITY.md` omits the orchestrator and `claude-sonnet-5` entirely | §9 |
| D25 | No `localStorage` key carries a schema version; ~286 hand-rolled call sites | §5 |
| D26 | `AI_FEATURES` client/server drift (`message`); provider-default disagreement (`claude` vs `openai`) | §9 |

---

## 18. Unresolved questions

- **`[UQ]`** The five files in `src/contexts/` — traced as far as the slice harnesses; **not** traced into `App.js`'s main tree. Whether any of them wraps live product UI is unresolved.
- **`[UQ]`** Whether `src/App.js` is still reachable on the deployed Pages origin, or only `/hostv2/`. Both artifacts exist in `build/`; no URL was fetched.
- **`[UQ]`** Whether the CRA hero has the same two-derivation ask bug hostv2 fixed on 2026-07-30 (§16.5). `heroAskFor` has zero importers in `App.js`, so the CRA uses `planHeroCopy` — a third vocabulary — but its internal consistency was not audited.
- **`[UQ]`** Whether the ~200 `useState` hooks in `HostShellV2` include any that participate in the recompute chain incorrectly. Only the four load-bearing `useMemo` dependency arrays (§4) were read.
- **`[UQ]`** Whether `supabase/migrations/` has actually been applied to the live project, and whether `backend/migrations/` 0005-0008 have. Migration state is not recorded in-repo.
- **`[UQ]`** Which of the two Supabase access paths (direct PostgREST vs FastAPI) is authoritative for `events` when both are configured. `api/events.js` writes directly; the backend also holds a connection to the same database. No conflict-resolution logic was found on either side.

---

## Method and limits

**Method.** Read-only, source-derived. I ran `git log`, `git status`, `git diff`, `git ls-files`, `ls`, `wc`, `grep`, and `sed -n` to read files. I read in full or in relevant part: `package.json` (both), `hostv2/vite.config.js`, `hostv2/playwright.config.mjs`, `hostv2/index.html`, `hostv2/src/main.jsx`, `hostv2/src/eventPool.js`, `hostv2/src/parity/check-parity.mjs`, `src/index.js`, `src/lib/routeResolver.js`, `src/lib/heroAsk.js`, `src/lib/solemn.js`, `src/lib/planHeroCopy.js` (head), `src/lib/surfaceRegistry.js` (head + exports), `src/lib/readinessHistory.js`, `src/lib/eventTaxonomyAdapter.js`, `src/components/EngineNextStep.jsx`, `render.yaml`, both GitHub workflows, and targeted regions of `hostv2/src/HostShellV2.jsx` (~600 lines across 10 windows), `src/CommandCenter.jsx` (~200 lines), and `src/lib/playbooks/index.js` (~250 lines). Four read-only sub-agents produced the backend, persistence, third-party-integration, and AI inventories; their file:line claims were spot-checked against the tree where they bore on my conclusions.

**Limits — read these before acting on anything above.**

1. **Nothing here is runtime verified.** I did not start either dev server, did not open a browser, did not issue an HTTP request, did not run a test, and did not query a database. Every "live"/"reachable" claim is a claim about **code**, not about a running system. A file that is imported and rendered in source can still be unreachable at runtime for reasons this method cannot see.
2. **Two files dominate the codebase and neither was read in full.** `src/App.js` (46,988 lines) and `hostv2/src/HostShellV2.jsx` (15,639 lines) were sampled via grep + targeted windows. Behaviour outside those windows is uncharacterised. A duplicate implementation buried in an unread region would not appear in §16.
3. **`src/App.js` is FROZEN per CLAUDE.md**, so its internals were audited only where they bear on shared engines, shared storage keys, or duplication with hostv2.
4. **Test counts in §14 come from `evidence/07_jest_raw.txt` and `evidence/07_e2e.txt`, collected by Phase 1 of this review, not by me.** I verified the files exist and say what I quoted; I did not re-run either suite.
5. **The `[CSI]` label matters.** Bundle-composition claims (§1, §16.7), the deploy-staleness cause (§13), and the `ngw-profile` clobber (§5) are inferences from read code, not observed behaviour.
6. **Line numbers are from the working tree at commit `097ce84e` plus two uncommitted files.** The `HostShellV2.jsx` diff is a single-line change at `:5642`; the `heroComposition.test.js` diff adds one describe block. Neither shifts line numbers materially, but both are counted in the figures above.
7. **No secret values were read or reproduced.** `.env*` files were inspected only for variable-name presence/absence; `.env.local` and `.env.production.local` are gitignored and their values were never opened by me.
8. **No application code was modified.** The only file written by this phase is this document. `git status` before and after shows the same two modified files and the same untracked `docs/current-state-review/` directory.
