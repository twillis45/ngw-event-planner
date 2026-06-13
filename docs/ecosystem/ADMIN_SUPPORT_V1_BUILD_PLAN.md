# NGW Admin / Support / Intelligence — Build Plan

> Board-blessed scope for the operator-facing surface (NGW staff, **not** planners).
> Companion to `src/admin/AdminConsole.jsx`, `src/lib/adminApi.js`,
> `backend/app/routers/admin.py`, `backend/migrations/0005_admin_support.sql`.
> Three files in the codebase already reference this path — keep the filename.

---

## 0. Governing facts (read before touching anything)

1. **Three audiences, three jobs — keep them distinct, don't merge into one mega-console.**
   - **Support** (reactive): "this user emailed, what broke." → cockpit.
   - **Admin / Ops** (proactive): "is the beta working, who's stuck, what's it costing." → health board.
   - **Data / Intelligence** (diagnostic): "does the product actually work." → analytics.
   The vendor-cockpit lesson applies: a tab-bar of equals breeds overwhelm. One hero per surface.

2. **The app is localStorage-first.** The backend sees **only server-synced state**
   (`auth.users`, `event_owners`, `studios`/`studio_members`). Anything living solely in a
   planner's browser is invisible here. Every metric MUST say so or show "unknown."
   This single fact is why **honest data analysis is impossible today** (see §4).

3. **Audit everything, append-only.** `admin_audit_log` (immutable) + `admin_support_notes`
   (corrections = new rows, never edits) are already the pattern. Every read of user data is
   logged. Never weaken this.

4. **Internal tool — utilitarian, not gold-plated.** It uses its own dark `D` palette, not
   Studio Matte tokens. That's correct (Rams: function over brand here). But it still obeys
   **The Attention System**: ONE hero = triage. Don't let it rot into a debug console either.

5. **Already code-split.** `index.js` lazy-loads the console only at `?admin=1`, so admin JS
   does not ship in planners' initial bundle. Guardrail largely satisfied; keep it that way.

---

## 1. Current state (what's actually built)

| Piece | Status | Where |
|---|---|---|
| Role gate (`app_metadata.role ∈ {admin, support}`) + honest "not authorized" wall | ✅ | `AdminConsole.jsx`, `auth.require_admin` |
| Immutable audit log (read + write) | ✅ | `admin.py` `/audit`, `audit()`; mig `0005` |
| Append-only support notes | ✅ | `admin.py` `/users/{id}/notes`; mig `0005` |
| Users: search → detail → notes | ✅ (A3) | `UsersPanel`, `/users`, `/users/{id}` |
| Overview tab | ⚠️ debug `whoami` probe — **not** an operator landing | `AdminConsole.jsx` |
| Workspaces tab | 🔲 stub ("A4 Event Diagnostics") | — |
| Providers tab | 🔲 stub ("A5 Message Status") | — |
| Honesty banner (server-synced only) | ✅ | `AdminConsole.jsx` |

**Verdict:** the **Support** leg is well underway and disciplined. **Admin (business ops)** and
**Data analysis** are essentially absent.

---

## 2. LEG 1 — SUPPORT (reactive · finish what's started)

### S1. Triage Overview *(replaces the whoami debug tab) — the hero*
The "What Needs You" of the admin world. Operator lands and instantly sees who needs them.
- **Surfaces (server-derivable today):** signups in last 24–72h not yet `email_confirmed_at`;
  accounts with 0 server-synced events (stalled onboarding); recent signups with no `last_sign_in_at`
  since day 1.
- **Surfaces (need new wiring):** pending/failed invitations (see S3); errors in last 24h (see A3-err).
- **Backend:** new `GET /api/admin/triage` aggregating the above. Audit `view_triage`.
- **Honesty:** every count carries the server-synced caveat; "0 events" means *0 synced*, not 0 real.

### S2. Event / Workspace diagnostics *(A4 — fills the Workspaces stub)*
Per planner / per event: what's synced vs. local-only (label the blind spot), readiness if synced,
where they're stuck.
- **Backend:** `GET /api/admin/users/{id}/events` and `/workspaces/{id}` from `event_owners` +
  `studios`. Audit `view_workspace`.

### S3. Invitation ops
Resend / revoke / inspect pending invites. **Directly retires the known `claim_pending_invitations`
400 noise** (see memory `project_claim_pending_invitations_400`).
- **Backend:** read pending invites; `POST .../invitations/{id}/resend|revoke`. Audit each.

### S4. View-as (read-only impersonation) — *highest leverage, highest risk*
Exposes planners' clients' PII (guest lists, contracts, pay info). **Guardrails are mandatory:**
time-boxed, read-only, **every view audit-logged**, consent-aware. If those can't be guaranteed in
the first cut, **defer** — do not ship casual browsing of customer data.

### S5. Safe account actions
Resend confirmation, trigger reset, set role. Each audit-logged. No destructive deletes from the UI.

---

## 3. LEG 2 — ADMIN / BUSINESS OPS (proactive · mostly missing)

### A1. Activation / health board
Funnel: signup → confirmed → first **real** event → first vendor → active. At beta scale show the
honest tiny-N ("3 of 7 activated"), never a vanity curve (Tufte). Derivable from `auth.users` +
`event_owners` today (with the synced-only caveat).
- **Backend:** `GET /api/admin/metrics/activation`.

### A2. AI cost meter — *cheap, high value, ties to live work*
AI is moving onto the OpenAI backend (Open Thread #1 in HANDOFF), so spend is now **NGW's**, per
feature. Operators need $/feature/day before a runaway prompt drains the beta budget.
- **New table** `ai_usage` (feature, tokens_in/out, est_cost, user_id, created_at) written by
  `lib/aiProxy.js`'s backend path on every `callAiFeature`.
- **Backend:** `GET /api/admin/metrics/ai-cost?since=`.

### A3-flags. Feature flags / kill switches
Disable a broken AI feature or surface **without** a full gh-pages redeploy — near-essential for a
30k-line single-bundle app where every fix is a full deploy.
- **New table** `feature_flags`; `GET/PUT /api/admin/flags`; planner app reads flags at boot.

### A3-err. Error / reliability feed
Surface Sentry issues (the CSP non-blocker, the `claim_pending` 400) + AI-proxy failures in one place.
- **Option A:** thin proxy to Sentry API. **Option B:** log app errors to a server table. Start with
  whatever's cheapest; feed the count into S1 Triage.

### A4. Beta cohort management
Invite waves, invited-vs-activated, seats. Builds on S3 invitation plumbing.

### A5. Billing / revenue ops *(after Payments P0)*
MRR, plan mix, failed charges; capture upgrade requests (today a dead `info@` mailto in `App.js`
~13507). Reads from Stripe (`lib/stripeApi.js`) once payments land.

---

## 4. LEG 3 — DATA ANALYSIS / PRODUCT INTELLIGENCE (gated on a decision)

**Hard truth (the board will not soften it): you cannot do honest product analytics today.**
localStorage-first + server-sees-only-synced means you can't measure which tabs/features get used,
where planners drop off, or readiness-over-time across users. Any "adoption dashboard" built now
would be fiction.

### The fork (Todd's call — privacy + architecture)
Add a **privacy-respecting product-telemetry stream**: events like *feature opened, AI invoked,
event created, stage advanced* — **never client PII** — into a new `product_events` table.

- **With it** you unlock: feature adoption, activation funnels, retention cohorts, AI-feature usage,
  and the existential question — *"does the product actually make events more ready over time?"*
- **Without it**, "data analysis" = a few honest server counts (§3 A1) and nothing more — and that's
  what you should ship, **labeled**, rather than fake a BI suite.

**Until the stream exists, do not build BI.** (Same lesson as the sparkline thread: a worded number
beats a chart-for-its-own-sake — see HANDOFF Open Thread #2.)

- **New table** `product_events` (anonymizable user ref, event_name, props jsonb, created_at).
- **Frontend:** a tiny `lib/telemetry.js` emitter, opt-out-aware, batched, PII-screened.
- **Backend:** ingest route + `GET /api/admin/metrics/*` rollups.

---

## 5. Build sequence (board order)

- **P0 — finish support:** S1 Triage Overview · S2 Event diagnostics · S3 Invitation ops · A3-err error feed.
- **P1 — run the beta:** A1 activation board · A2 AI cost meter · A3-flags feature flags.
- **P2 — after Payments P0:** A5 billing/revenue ops.
- **Gated — the telemetry decision (§4) → LEG 3 real analytics.** Don't build BI before the stream exists.
- **Deferred hard:** custom dashboards, export pipelines, charts-for-charts'-sake. View-as (S4) ships
  only with full audit + read-only guarantees, else deferred.

---

## 6. Cross-cutting requirements (every surface)

- Gate on `require_admin`; audit every data-touching action; append-only for any notes/corrections.
- Carry the **server-synced-only** honesty caveat on every metric; show "unknown" over a guess.
- Obey The Attention System: each surface has ONE hero; evidence whispers; no fake urgency/data.
- Keep admin code lazy-split out of the planner bundle.
- Render-first: capture every new surface with `scripts/cap*.js` into
  `demo/review-artifacts/<date>-admin-*/` and READ the PNGs before calling anything done.
