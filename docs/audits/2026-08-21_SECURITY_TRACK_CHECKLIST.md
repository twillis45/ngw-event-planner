# Security track — consolidated stage-5 checklist

2026-08-21. The spine requires the full public checklist recorded item by
item, including no-ops with reasons. Surface: hostv2 host shell (public,
web) + Render backend + Supabase. Evidence is cited; nothing here is
recalled. Status legend: DONE / NO-OP (reason) / OPEN.

## Stage-2 touchpoint — threat model

- **DONE — data inventory.** PII: host name/email (Supabase auth), guest
  names/RSVP details (`rsvp_submissions`, `rsvp_guest_details`), vendor
  contacts on events. Payments: Stripe Checkout only — card data never
  touches our code (hosted checkout). Credentials: Supabase JWTs
  client-side; Stripe/DocuSign/OpenAI keys server-side only.
- **DONE — authZ model.** Studio-membership scoping via
  `is_studio_member`/`is_studio_owner` helpers, decided in
  `supabase/migrations/001–003` and mirrored in backend `0003_studios.sql`.

## Stage-3 touchpoint — build hygiene

- **DONE — secrets in env, not source.** Backend keys documented as env
  (`backend/app/config.py:63`); repo scan for `sk_live`/service keys finds
  docs and test monkeypatches only. Frontend embeds only publishable
  values (Supabase anon key, Sentry DSN, PostHog key — all non-secret by
  design, noted in `src/lib/sentry.js:1-3`).
- **DONE — server-side auth on money/comms routes.** Anonymous
  charge-minting closed 2026-08-07 (create-checkout-session signed-in
  only, `src/lib/stripeApi.js:14-18`); `/complete` deleted and 3 SSRF
  sites guarded (Security Sprint A+B, commit `04ed31ed`).
- **DONE — owner scoping on queries.** The "second user" check: `events`
  reads/writes all carry `studio_id` and RLS enforces membership (below).
  Client code also filters `.eq('studio_id', sid)`
  (`src/lib/api/events.js:190`).

## Stage-4 touchpoint — guards, not glances

- **DONE — 403/401 tests exist server-side**: `test_stripe_checkout_auth`,
  `test_docusign_send_envelope_auth`, `test_admin_intelligence`,
  `test_lodging_unfurl` (SSRF), `test_stripe_webhook_signature`. Backend
  suite runs in CI (release-integrity C1, `a1682b74`).
- **DONE (2026-08-21, same session) — per-route sweep.**
  `backend/tests/test_protected_routes_sweep.py` walks every route in the
  seven security-sensitive routers: each must carry a caller gate in
  source or sit on a NAMED public allowlist with a reason, and every
  `require_planner` route is hit bare and must answer 401. The sweep's
  first run caught a real one: **`GET /api/stripe/verify-session` was
  unauthenticated server-side** (the client sent auth since 2026-08-07;
  the backend never demanded it) — now gated. It also surfaced finding
  #8 below.
  **Superseded 2026-11-02 (board condition C4-2 / cond. 6):** the sweep no
  longer hand-lists routers — it walks the routes the deployed app actually
  serves (`app.main`, all 16 mounted routers plus main.py's own three), and
  `test_the_sweep_reaches_every_router_main_mounts` goes red if the walk ever
  misses one. research, kas and kcr are now hit bare and answer 401. The five
  reference proxies (weather, food prices, Instacart, Kroger, lodging) sit on
  the PUBLIC allowlist with written reasons, including the accepted cost:
  anyone can spend our third-party quota through them; no rate limit exists.
  Red-proofed three ways: drop an allowlist entry, stop the walk descending,
  strip research's admin gate — each goes red.

## Stage-5 — the consolidated gate

- **DONE — RLS verified in writing (repo layer).**
  `supabase/migrations/002_rls_policies.sql:20-37`: `events` has RLS
  enabled with all four verbs (select/insert/update/delete) scoped
  `is_studio_member(studio_id)`; `clients`, `studio_members`,
  `studio_invitations`, `rsvp_submissions` likewise; backend-side tables
  (`event_channels`, `event_messages`, `event_owners`, admin tables)
  RLS-enabled in `backend/migrations/0001–0008`.
  **OPEN — applied-status attestation.** Whether every migration is
  applied to the LIVE Supabase project cannot be proven from the repo;
  one dashboard check (Database → Policies on `events`) closes it.
  User-side, two minutes. **2026-11-02: the check is now written as a
  query, not an eyeball — `docs/RUNBOOK.md` § Owner attestations, check A
  — with what a pass and a fail look like, row by row.**
- **FOUND 2026-11-02, FIXED IN REPO, NOT YET ON THE LIVE PROJECT — six
  `public` tables with RLS OFF.** `supabase/migrations/012_research_execution.sql`
  created `research_campaign_runs`, `research_queue_jobs`,
  `research_findings`, `research_evidence`, `research_observations` and
  `provider_run_logs` with no `enable row level security`, on the
  comment "all reads/writes go through FastAPI with require_admin — no
  RLS needed." That covers the app's door and not PostgREST: every
  `public` table is served at `/rest/v1/<table>`, and Supabase's default
  privileges grant `anon`/`authenticated` on it, so with RLS off the
  publishable anon key — shipped in the live bundle by design — can read
  and WRITE those six (enqueue research jobs → provider spend; rewrite
  findings; read every campaign blueprint). The "DONE — RLS verified in
  writing" line above listed only the tables it checked and never said
  "every table"; nobody asked the other question until the attestation
  query was being written. Surfaced by the query itself. **Fix:**
  `018_research_tables_rls.sql` enables RLS on all six with no policies
  (the shape `admin_error_log` and `kas_records` already run on; the
  backend's owning role is not subject to non-forced RLS, so the research
  router is unchanged). **Gate:** `src/lib/__tests__/everyPublicTableHasRls.test.js`
  reads both migration folders and fails by table name on any `create
  table` without a matching enable — red-proofed by removing 018 (7 of 10
  red, all six named). **Widened 2026-11-02 (board condition 7):** the
  gate also reads `src/lib/knowledge/kaw1-migration.sql` (seven
  hand-applied tables, all RLS-enabled) and fails on any `.sql` file in
  the repo outside a scanned source — red-proofed by dropping one kaw1
  enable and by adding a stray file; 14 tests. **Live exposure could not be probed from here:**
  the public Pages bundle is the demo profile and carries no Supabase
  URL. Until 018 reaches `main` and the integration applies it, the live
  project is presumed exposed; check A's query is how the owner confirms
  it closed.
- **DONE — dependency audit (shipped surface).** `npm audit --omit=dev`
  in `hostv2/`: **0 vulnerabilities** (2026-08-21).
- **RE-RUN 2026-11-02 — the shipped surface was NOT clean.** `npm audit
  --omit=dev` in `hostv2/` found **1 critical: `dompurify@3.4.14`**, pulled in
  by `posthog-js@1.425.1`, carrying five advisories (GHSA-p98j-92pf-mc4p,
  GHSA-6688-9rhm-gjv2, GHSA-cg2g-xh64-v4q7, GHSA-mrv2-3pqr-j5jr,
  GHSA-c6gr-qvv4-5v3f — DOM XSS through the IN_PLACE / hook paths, all
  `<=3.4.16`). Exposure was low and is stated, not assumed: DOMPurify is
  absent from every built `hostv2/dist/assets/*.js` (tree-shaken), and no app
  code calls it. **Fixed** by `"overrides": { "dompurify": "3.4.17" }` in both
  `hostv2/package.json` and the root `package.json`, lockfiles regenerated by
  npm → `hostv2` shipped tree **0 vulnerabilities**. The 8/21 "0 vulnerabilities"
  line above was true on its day; a dependency tree is not a fact that stays
  true, which is why stage 8 owes a review on a cadence.
  **Cadence written 2026-11-02:** `.github/workflows/dependency-audit.yml`
  runs weekly (Mondays 13:17 UTC), on every lockfile PR, and on demand.
  hostv2 is STRICT (fails on any high); the CRA root is REPORT-ONLY by
  decision until s8-cra is ruled, with counts and `xlsx` in the run summary.
  Pinned by `theAuditRunsOnACadence.test.js`, red-proofed.
- **NO-OP with note — dependency audit (CRA root).** *(2026-11-02: now 106
  findings, not 51 — 3 critical, all in the react-scripts dev server
  (`proxy-addr`, `shell-quote`, `websocket-driver`); `xlsx` high as before;
  `posthog-js@1.379.0` moderate via a transitive OpenTelemetry package.
  Same disposition: the frozen shell's toolchain, retired with it. DOMPurify
  pinned here too, so it is no longer in the list.)* 51 findings (1
  critical: `websocket-driver`, dev-server chain) — all in the FROZEN
  CRA's react-scripts build toolchain, none shipped in a bundle. Accepted
  because the CRA is donor-only with deletion scheduled post-Sprint-2;
  deleting it retires the entire list. Re-audit if the freeze ever lifts.
- **DONE — secret scan.** No live keys in source or git-visible config
  (scan 2026-08-21).
- **DONE (2026-08-21) — license check.** `license-checker --production`
  on both trees: all permissive (MIT/ISC/Apache-2.0/BSD family).
  `node-forge` is dual `(BSD-3-Clause OR GPL-2.0)` — we take BSD-3. The
  UNLICENSED entries are our own packages.
- **DONE — Security Sprint C+D, superseded by name.** C (CRA build as a
  CI gate + env inventory) and D (hostv2 bundle drift) shipped 2026-07-31
  as the Release Integrity gates — the `cra-build`, `backend`, and
  `hostv2-build` jobs in `checks.yml` (added 2026-07-31, header comment),
  all green on every push since. The "unstarted" claim was a stale
  2026-07-30 memory.
- **DONE (2026-08-21) — DocuSign token-in-query residual.**
  `/envelope/{id}` now takes the token in `X-DocuSign-Token` and requires
  a planner (it was the one docusign route with no caller gate);
  `src/lib/docusign.js` sends header + planner auth. Tokens no longer
  land in access logs.
- **OPEN — pentest** (external, on the D-2 list).
- **RESOLVED (2026-08-21, third pass) — finding #8: comm reads/writes are
  fully gated.** The "portal needs public reads" premise was FALSE: the
  portal viewer (`ClientPortalPublicView`, App.js:14834) renders from
  LOCAL event data and calls only portal-respond (token-authorized).
  `listChannels`/`listMessages`/`markRead` had zero anonymous consumers,
  and `create_message`'s `author_role=="client"` carve-out let anyone
  post into any event's client channel bare. All four now require a
  signed-in caller + `_assert_event_access`, same as the other writes.
  The sweep's allowlist entry was removed (its stale-entry test enforces
  that removal). Enforced by `test_protected_routes_sweep.py`.
- **NOTE — DocuSign Connect webhook is unverified but inert.** It only
  logs; the sweep's allowlist entry states the rule: the moment it
  mutates state it must verify Connect's HMAC first.

## Stage-6 touchpoint — prod responses & backup

- **DONE — no stack traces in prod errors.** FastAPI handlers return
  `detail` strings; SSRF/auth guards return clean 4xx.
- **OPEN — backup/restore attestation.** Supabase daily backups are a
  platform default on paid tier; whether this project's tier has them ON
  and a restore has been exercised is unattested. User-side dashboard
  check; a restore drill is an hour.

## Stage-7 touchpoint — error visibility

- **DONE — Sentry DSN is set and live in prod. Verified 2026-10-13 by probing
  the shipped bundle, not by reading a settings page.** This row said "OPEN —
  Sentry DSN unset in prod" for seven weeks while the Path to Production audit's
  own shortlist recorded it DONE the same session it was written. Two documents,
  one fact, opposite answers, and neither was ever re-probed — so the
  contradiction itself was the finding.
  Method, because "it's in the Actions vars" is not the same claim as "it ships":
  fetched `twillis45.github.io/ngw-event-planner/index.html`, read the one JS
  chunk it references (`static/js/main.*.js`, 5.66 MB), and grepped the served
  bytes. A real `*.ingest.us.sentry.io` host is present — a DSN baked into the
  production build, which is the only thing that makes `initSentry()` more than
  a no-op. The audit was right; this row was wrong.
  Note the DSN is client-side and therefore public by design (it is readable in
  the bundle by anyone), so its presence is not a secret leak — but the org
  identifier is deliberately not copied here.

## Web platform-specific

- **DONE — XSS.** React escaping throughout; no `dangerouslySetInnerHTML`
  in hostv2 source (grep 2026-08-21, 0 hits).
- **NO-OP — CSRF.** No cookie-based sessions: Supabase JWTs go in
  Authorization headers; a cross-site form post carries no ambient
  credential. CORS on the backend is origin-listed unless `*` is set
  deliberately (`backend/app/main.py:35-46` documents the boundary
  reasoning).
- **NO-OP — session cookie flags.** No session cookies exist (see CSRF).
- **DONE — logout.** Supabase `signOut` invalidates the refresh token.
- **OPEN — login rate limiting.** Delegated to Supabase auth defaults;
  never verified or tuned. One dashboard check.

## Verdict (updated 2026-08-21, second pass)

The load-bearing items (RLS all-verbs on tenant data, server-side auth on
money routes, hosted-checkout payment isolation, 0-vuln shipped bundle,
no secrets in source) are DONE with citations. The second pass closed
five more: the per-route sweep now exists AND caught a live gap
(verify-session gated), the license check is clean, Sprint C+D turned
out to be shipped under the Release Integrity name, and the
token-in-query residual is closed. Remaining OPENs: the pentest, ~~finding
#8 (portal authz design — board question)~~ *(stale in this verdict: the
body above records #8 RESOLVED, third pass, 2026-08-21, and the sweep's
stale-entry test enforces it; ruled closed by the board 2026-11-02 — five
opens, not six)*, and four user-side
attestations (RLS applied in the live dashboard, backups on + one
restore drill, login rate-limit check on Supabase defaults). **The
Sentry-DSN item that used to sit in this list is CLOSED — probed in the
shipped bundle 2026-10-13, see the stage-7 touchpoint above.** It is down
from four attestations to three.
