# Environment Variable Reference

**Single source of truth for every env var actually referenced in code.**
Derived from `backend/app/**` and `src/**` (Sprint 58P.4a). When you touch
an integration, update this file and sync into the matching `.env.example`.

> The repo's `.env.example` files (`backend/.env.example`, frontend `.env.example`)
> are tooling-blocked from direct edits in this sprint. **Sync these vars
> into those files** before deploying or onboarding a new developer.

> **Never commit real secrets.** This file lists *names + meaning*, never values.

---

## Backend (`backend/`)

FastAPI service. Loads `backend/.env` via `python-dotenv` (`backend/app/config.py`).

### Database (Supabase Postgres)

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `DATABASE_URL` | ✅ prod | Supabase Postgres pooler connection string (`postgres://...?sslmode=require`). Falls back to `SUPABASE_DB_URL` if unset. | `app/config.py:9` |
| `SUPABASE_DB_URL` | optional | Fallback name for the same connection string. | `app/config.py:9` |

### Supabase Auth (planner sign-in)

The backend verifies planner JWTs against the Supabase GoTrue project. Both values are non-secret project config.

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase → Settings → API → Project URL. | `app/config.py:40` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API → anon / publishable key. Used as the GoTrue `apikey` header. | `app/config.py:41` |

### Legacy dev token (local only)

Honored only when `ALLOW_DEV_TOKEN=true`. Deployed envs must leave this unset.

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `PLANNER_DEV_TOKEN` | local dev | Shared X-Planner-Token. Bypasses Supabase auth — never deploy. | `app/config.py:47` |
| `ALLOW_DEV_TOKEN` | local dev | Set to `true` ONLY in local dev to honor `PLANNER_DEV_TOKEN`. | `app/config.py:48` |

### Email delivery (Resend)

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `RESEND_API_KEY` | optional (`re_…`) | Resend API key. Without it, `is_email_configured()` returns false and email sends are skipped (messages still persist; UI surfaces "not notified" honestly). | `app/config.py:11` |
| `COMMUNICATION_EMAIL_FROM` | optional | From address. Must be a verified sender in Resend. Default `events@example.com`. | `app/config.py:12` |
| `RESEND_FROM_NAME` | optional | Display name (e.g. `NGW Events`). Default `NGW Events`. | `app/config.py:13` |

### App + CORS

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `APP_BASE_URL` | ✅ | Frontend URL the backend redirects/links back to (OAuth callbacks, email links). Default `https://twillis45.github.io/ngw-event-planner`. | `app/config.py:14` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed origins for CORS. `*` allowed. Default `https://twillis45.github.io,http://localhost:3000`. | `app/config.py:24` |
| `ALLOWED_ORIGIN_REGEX` | optional | Regex of additional permitted origins. Defaults to localhost + private LAN IPs (any port) so device testing works. | `app/config.py:29` |

### Stripe (deposits / balances)

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | optional (`sk_live_…` / `sk_test_…`) | Stripe Dashboard → Developers → API keys. When unset, `/api/capabilities` returns `stripe_configured: false`, the "Create Link" button does not render. | `app/config.py:55` |
| `STRIPE_WEBHOOK_SECRET` | optional (`whsec_…`) | Stripe Dashboard → Webhooks → endpoint signing secret. Without it, webhook signatures are not verified (dev only). | `app/config.py:56` |

Webhook URL to configure on Stripe: `https://<render-host>/api/stripe/webhook` · Event: `checkout.session.completed`.

### AI proxy (server-side OpenAI)

Used by `/api/ai/complete` (text completions) and `/api/ai/extract-document` (vision PDF/image extraction).

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `OPENAI_API_KEY` | optional | OpenAI API key. Without it, AI routes return `503` and the frontend falls back to BYOK (see `AI_PROVIDER_REALITY.md`). | `app/routers/ai.py:30` |
| `AI_MAX_TOKENS` | optional | Per-request token ceiling. Default `500`. | `app/routers/ai.py:31` |

### DocuSign (eSignature)

Authorization Code Grant flow. **Code uses `INTEGRATION_KEY` + `SECRET_KEY` + `ACCOUNT_ID`**, not JWT grant.

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `DOCUSIGN_INTEGRATION_KEY` | optional | App Integration Key (UUID). | `app/docusign_client.py:27` |
| `DOCUSIGN_SECRET_KEY` | optional | OAuth secret key. | `app/docusign_client.py:28` |
| `DOCUSIGN_ACCOUNT_ID` | optional | DocuSign account ID (UUID). | `app/docusign_client.py:29` |
| `DOCUSIGN_BASE_URL` | optional | `https://demo.docusign.net` (sandbox) or `https://na3.docusign.net` (production). Default sandbox. | `app/docusign_client.py:30` |
| `DOCUSIGN_REDIRECT_URI` | optional | OAuth callback URL. Default `https://ngw-events-api.onrender.com/api/docusign/callback`. | `app/docusign_client.py:31` |

`is_docusign_configured()` requires all three of `INTEGRATION_KEY` / `SECRET_KEY` / `ACCOUNT_ID`.

### Runtime

| Variable | Required | Meaning | Source |
|---|---|---|---|
| `PYTHON_VERSION` | ✅ on Render | Pinned at `3.12.7` in `render.yaml` (3.14 has no `pydantic-core` wheels). | `render.yaml:30` |
| `PORT` | render-managed | Render injects this; `uvicorn --port $PORT` uses it. | `render.yaml:11` |

---

## Frontend (`demo/` — CRA)

CRA reads `REACT_APP_*` at build time. Every variable below was found via `grep "process.env.REACT_APP_" src/`.

| Variable | Required | Meaning | Used by |
|---|---|---|---|
| `REACT_APP_API_BASE_URL` | ✅ for backend features | Base URL of the FastAPI service (e.g. `https://ngw-events-api.onrender.com`). When unset, `isCommApiConfigured()` is false; comms run on localStorage; Stripe/AI features hidden. | `src/lib/commApi.js`, `src/lib/stripeApi.js` |
| `REACT_APP_SUPABASE_URL` | ✅ for cloud sync | Supabase Project URL (same as backend `SUPABASE_URL`). When unset, `isSupabaseConfigured()` is false; data stays in localStorage. | `src/lib/supabaseClient.js` |
| `REACT_APP_SUPABASE_ANON_KEY` | ✅ for cloud sync | Supabase anon / publishable key. | `src/lib/supabaseClient.js` |
| `REACT_APP_PLANNER_TOKEN` | dev only | Shared dev token sent as `X-Planner-Token`. Bypasses Supabase auth — never deploy. | `src/lib/commApi.js` |
| `REACT_APP_SENTRY_DSN` | optional | Sentry error reporting DSN. When unset, `initSentry()` is a no-op. | `src/lib/sentry.js` |
| `REACT_APP_POSTHOG_KEY` | optional | PostHog product analytics project key. | `src/App.js` |
| `REACT_APP_POSTHOG_HOST` | optional | PostHog host (defaults to PostHog Cloud). | `src/App.js` |
| `REACT_APP_OPENWEATHER_KEY` | optional | OpenWeather API key for event-day weather lookup. | `src/App.js` |
| `REACT_APP_GOOGLE_MAPS_KEY` | optional | Google Maps key for venue map embed / directions. | `src/App.js` |
| `REACT_APP_ENABLE_GOOGLE_AUTH` | optional | `true` to show the "Sign in with Google" button on the auth gate. Requires Supabase Google provider enabled in dashboard. | `src/App.js` |
| `REACT_APP_INVITE_ONLY` | optional | When `true`, sign-up requires an invite (login-only mode). | `src/App.js` |
| `REACT_APP_AUTH_BYPASS` | dev only | Bypasses the auth gate during local development. Never set in production. | `src/App.js` |
| `REACT_APP_AUTH_REDIRECT` | optional | OAuth redirect override for non-default deploy paths. | `src/App.js` |

**BYOK note (Vendor Copilot AI):** the planner's Anthropic key is **not** an env var — it's entered per-user in Studio Setup and stored only in the browser (`profile.anthropicKey` in localStorage). See `AI_PROVIDER_REALITY.md`.

---

## Quick checklist before deploying

- [ ] `backend/.env` (or Render env vars) includes every ✅ Required backend var above.
- [ ] Frontend build env includes `REACT_APP_API_BASE_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`.
- [ ] `ALLOW_DEV_TOKEN` is unset (or `false`) in any deployed env.
- [ ] `REACT_APP_AUTH_BYPASS` is unset (or `false`) in any deployed env.
- [ ] `REACT_APP_PLANNER_TOKEN` is unset in any deployed env.
- [ ] Stripe webhook endpoint configured in the Stripe dashboard if `STRIPE_SECRET_KEY` is set.
- [ ] DocuSign Connect endpoint configured if DocuSign vars are set.
- [ ] Migrations applied — see `backend/MIGRATIONS.md`.
- [ ] AI provider mapping understood — see `AI_PROVIDER_REALITY.md`.
