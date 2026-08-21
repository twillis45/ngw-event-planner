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
  User-side, two minutes.
- **DONE — dependency audit (shipped surface).** `npm audit --omit=dev`
  in `hostv2/`: **0 vulnerabilities** (2026-08-21).
- **NO-OP with note — dependency audit (CRA root).** 51 findings (1
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
- **OPEN — finding #8 (sweep, 2026-08-21): client-portal comm reads are
  keyed on event id alone.** `GET .../communication/channels` and
  non-INTERNAL message reads are public BY DESIGN (Sprint 58's portal has
  no sign-in), but hostv2 event ids (`cust-<timestamp36>`) are guessable,
  so message content is enumerable in principle. A `portal_token`
  mechanism already exists on approval messages and could extend to reads.
  This is an authz DESIGN decision — take it to the board, not a patch.
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

- **OPEN — Sentry DSN unset in prod** (see Path to Production audit;
  being worked this session as shortlist #2).

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
token-in-query residual is closed. Remaining OPENs: the pentest, finding
#8 (portal authz design — board question), and four user-side
attestations (RLS applied in the live dashboard, backups on + one
restore drill, login rate-limit check on Supabase defaults, plus
Sentry-DSN taking effect on next deploy is worth eyeballing once).
