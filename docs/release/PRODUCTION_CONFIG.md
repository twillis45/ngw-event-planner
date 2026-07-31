# Public Build Configuration Contract

**Established 2026-07-31 (Deterministic Test & Production Configuration sprint, Slice D3).**
Enforced by `scripts/validate-production-config.mjs`.

> **Create React App and Vite both bake every `REACT_APP_*` into the PUBLIC
> bundle at build time.** Nothing in this namespace is hidden from users. "Public"
> below means *safe to publish*; anything else must never be set for a browser
> build at all — there is no such thing as a private `REACT_APP_*`.

---

## There are TWO productions, not one

**Host ruling, 2026-07-31.** The public site is the **open, localStorage-only
demo**, and `.env.production.local` omits the live values *deliberately*. That
omission is product behaviour, not missing configuration. Anything that treats a
blank config as a defect is asking the wrong question.

| | **Public demo production** | **Live production** |
|---|---|---|
| What it is | Open; anyone can try it | Authenticated, backend-connected |
| Sign-in | None | Supabase auth |
| Storage | localStorage only | Supabase, per-account |
| Live config | **must be absent** | **must be present** |
| Profile | `release_profile=demo` (default) | `release_profile=live` (opt-in) |
| Status | **current public site** | **not enabled** — see [LIVE_MODE_READINESS.md](LIVE_MODE_READINESS.md) |

Selecting `live` changes what the product *is* for every visitor. It is opt-in
per workflow run and is gated on a readiness checklist that is not yet worked.

## Build modes

| Mode | Command | Public config | Result |
|---|---|---|---|
| **verification** | `--mode=verification` | May be blank | Ordinary CI compile. Explicitly **not** production-capable. |
| **demo** | `--mode=demo` | **Must be absent** | A demo release. Fails if a live value is set, so the open demo cannot silently acquire sign-in. |
| **live** | `--mode=live` | **Required + coherent** | Fails closed on anything missing; also checks the key decodes to `role=anon` (never `service_role`), the key's project ref matches the Supabase URL, and the API base is https, not localhost, and does not end in `/api`. |

`--mode=production` remains a deprecated alias for `live`.

Two failures this prevents: a release with no config that looks normal but has
no sign-in and no backend; and a *demo* release that quietly gained live auth
because somebody set a repository variable.

---

## Reconciliation

**Scope of "referenced": application code only — `src/` and `hostv2/src/`.**
`scripts/validate-production-config.mjs` *names* 8 further variables in its
prohibited list; those are preventive controls for values that must never be
introduced, and no application code reads them. Counting the validator's own
policy list as "referenced" would inflate the total to 35 and is the one
arithmetic trap here.

| Category | Count |
|---|---:|
| Required for a production release | 3 |
| Optional public | 10 |
| PI feature flags (all optional, default off) | 11 |
| Prohibited **and referenced by application code** | 3 |
| **Total referenced by application code** | **27** |

`3 + 10 + 11 + 3 = 27` — exact.

The 3 prohibited-and-referenced break down as **1 deprecated**
(`REACT_APP_PLANNER_TOKEN`, a legacy transition fallback) and **2
development-only** (`REACT_APP_AUTH_BYPASS`, `REACT_APP_BYPASS_ROLE`). There are
no test-only variables.

| Prohibited policy | Count | In the 27? |
|---|---:|---|
| Referenced by application code | 3 | **Yes** — counted above |
| Preventive-only (never referenced): service-role ×2, OpenAI, Anthropic, Stripe secret, database URL, Resend, DocuSign | 8 | **No** — additional controls |
| Validator prohibited list, total | 11 | — |

---

## Classification — every `REACT_APP_*` referenced by application code

`Public` = safe to publish in the bundle. `Source` = where the value comes from
for a release.

| Variable | Consumer | Classification | Required for production release | Public | Source | Missing behavior |
|---|---|---|:--:|:--:|---|---|
| `REACT_APP_API_BASE_URL` | `src/App.js`, `lib/apiAuth`, `lib/commApi`, hostv2 | Backend endpoint | **Yes** | Yes | GitHub repo variable | No backend: AI, lodging unfurl, comms all disabled |
| `REACT_APP_SUPABASE_URL` | `src/App.js`, `lib/supabaseClient` | Auth/persistence | **Yes** | Yes | GitHub repo variable | No sign-in; localStorage only |
| `REACT_APP_SUPABASE_ANON_KEY` | `src/App.js`, `lib/supabaseClient` | Auth/persistence (anon/publishable) | **Yes** | Yes | GitHub repo variable | No sign-in; localStorage only |
| `REACT_APP_AUTH_REDIRECT` | `components/AuthGate.jsx` | Auth config | No | Yes | GitHub repo variable | Falls back to `window.location.origin` — set it for LAN/tunnel/custom domain |
| `REACT_APP_ENABLE_GOOGLE_AUTH` | `components/AuthGate.jsx` | Feature flag | No | Yes | GitHub repo variable | Google sign-in button hidden |
| `REACT_APP_SENTRY_DSN` | `src/index.js` | Monitoring (DSN is publishable) | No | Yes | GitHub repo variable | Sentry is a no-op |
| `REACT_APP_POSTHOG_KEY` | `lib/analytics.js` | Analytics (write-only ingestion key) | No | Yes | GitHub repo variable | Falls back to a hardcoded public project key |
| `REACT_APP_POSTHOG_HOST` | `lib/analytics.js` | Analytics endpoint | No | Yes | GitHub repo variable | Defaults to `https://us.i.posthog.com` |
| `REACT_APP_BILLING_LIVE` | `hostv2/src/HostShellV2.jsx` | Feature flag | No | Yes | GitHub repo variable | Billing stays in test mode (`'1'` = live) |
| `REACT_APP_INVITE_ONLY` | `components/AuthGate.jsx` | Feature flag | No | Yes | GitHub repo variable | Signup open (`'true'` = invite required) |
| `REACT_APP_GOOGLE_MAPS_KEY` | `src/App.js` | Third-party key | No | Yes (restrict by referrer) | GitHub repo variable | Map features degrade |
| `REACT_APP_OPENWEATHER_KEY` | `src/App.js` | Third-party key | No | Yes (restrict by referrer) | GitHub repo variable | Weather degrades; backend proxy preferred |
| `REACT_APP_FDA_API_KEY` | `lib/knowledge/providerIntegration.js` | Third-party key | No | Yes | GitHub repo variable | FDA provider disabled |
| `REACT_APP_PI_ATTENTION` | `lib/positiveAttention.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_CONFIDENCE` | `lib/confidenceGrammar.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_DECISIONS` | `lib/decisionConfidence.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_IDENTITY` | `lib/eventIdentity.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_LABELS` | `lib/presentationLabels.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_MEMORY` | `lib/decisionMemory.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_MOMENTS` | `lib/momentLibrary.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_NAV` | `lib/presentationNav.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_PLANV2` | `lib/presentationNav.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_SHELL` | `lib/presentationNav.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_PI_VOICE` | `lib/nextActionRenderer.js` | PI feature flag | No | Yes | GitHub repo variable | Off |
| `REACT_APP_AUTH_BYPASS` | `components/AuthGate.jsx` | **PROHIBITED** in browser production | No | **No** | `.env.local` only (dev) | Skips sign-in entirely — in a public bundle this ships an unauthenticated app |
| `REACT_APP_BYPASS_ROLE` | `components/AuthGate.jsx` | **PROHIBITED** in browser production | No | **No** | `.env.local` only (dev) | Selects the role the bypass assumes |
| `REACT_APP_PLANNER_TOKEN` | `lib/commApi.js` | **PROHIBITED** in browser production | No | **No** | `.env.local` only (dev) | Legacy shared write-gate — publishing it hands every visitor planner writes |

### Prohibited, restated

`REACT_APP_PLANNER_TOKEN`, `REACT_APP_AUTH_BYPASS` and `REACT_APP_BYPASS_ROLE`
are **prohibited in browser production configuration**. The validator fails the
build in *both* modes if any is set, and the explicit prohibited list also names
service-role keys, provider secrets, database URLs and similar server-only
values so they cannot be introduced under a `REACT_APP_` prefix.

---

## Where production values live

**GitHub repository variables** — Settings → Secrets and variables → Actions →
**Variables** (not Secrets). Every required value is public by design, so
`vars.*` is the honest home for them. Putting one in `secrets.*` would be
misleading: it would still be compiled into a bundle any visitor can read.

`pages-from-source.yml` maps them at **job** scope so hostv2 and CRA — compiled
by different toolchains — both inherit the same configuration.

## Reproducing a release build locally

```bash
export REACT_APP_API_BASE_URL="https://<your-api-host>"
export REACT_APP_SUPABASE_URL="https://<project>.supabase.co"
export REACT_APP_SUPABASE_ANON_KEY="<anon/publishable key>"

node scripts/validate-production-config.mjs --mode=production
npm run release          # hostv2 → sync into public/hostv2 → CRA build

# parity: BOTH bundles must carry the config
grep -rqF "$REACT_APP_API_BASE_URL" build/static/js/   && echo "CRA ok"
grep -rqF "$REACT_APP_API_BASE_URL" build/hostv2/assets/ && echo "hostv2 ok"
```

For an ordinary compile check, leave the values unset and use
`--mode=verification`.

---

## Two layers, on purpose

| Layer | Controls | Where | Why there |
|---|---|---|---|
| `validate-production-config.mjs` | **Names** (explicit prohibited list) + required-value presence + secret-shaped values, incl. decoding a Supabase `service_role` JWT | Before the build | Names must be caught *before* compiling — afterwards the value is already in the artifact |
| Artifact scan in `pages-from-source.yml` | **Value shapes** only (`sk-`, `sk_live_`, `rk_live_`, credentialed `postgres://`, `ghp_`, `xox*-`, PEM private keys) | On `build/` | Catches a value that arrived by any route, including one no env check saw |

The artifact scan deliberately does **not** match variable *names*: a bundler
leaves the bare identifier in the output even when the variable is unset
(`process.env.X` compiles to `{}.X`), so name-matching would fail every clean
build and train people to ignore the gate. Verified: a clean artifact scans
clean while planted `sk-…`, `sk_live_…`, `postgresql://user:pw@host`, `ghp_…`,
`xoxb-…` and PEM keys are each caught. The public PostHog `phc_` key is
correctly not flagged — it is a write-only ingestion key, public by design.
