"""Backend-only configuration. NEVER import these into frontend code.
All secrets come from the environment (Render dashboard / local .env)."""
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Postgres connection string (use the pooler URL from Supabase → Settings → Database).
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")

RESEND_API_KEY           = os.environ.get("RESEND_API_KEY")
COMMUNICATION_EMAIL_FROM = os.environ.get("COMMUNICATION_EMAIL_FROM", "events@example.com")
RESEND_FROM_NAME         = os.environ.get("RESEND_FROM_NAME", "NGW Events")
# Webhook signing secret from Resend Dashboard → Webhooks → endpoint → Signing Secret.
# When set, all inbound webhook payloads are verified via HMAC-SHA256 (Svix protocol).
# If unset, verification is skipped (dev/testing only — set this in production).
RESEND_WEBHOOK_SECRET    = os.environ.get("RESEND_WEBHOOK_SECRET")
APP_BASE_URL             = os.environ.get("APP_BASE_URL", "https://twillis45.github.io/ngw-event-planner")
# This API's own public address, for links in emails (an unsubscribe link).
# Render sets RENDER_EXTERNAL_URL on every web service.
API_PUBLIC_BASE_URL      = os.environ.get("API_PUBLIC_BASE_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "https://ngw-events-api.onrender.com"

# CORS — the frontends allowed to call this API.
#   ALLOWED_ORIGINS: comma-separated exact origins (your production domains).
#                    Set it to "*" to allow any origin (safe here — the real
#                    boundary is the Supabase JWT + per-event ownership, and the
#                    CLIENT read channel is public by design).
#
#   PROD REQUIREMENT (P0 security review): production MUST set an explicit
#   ALLOWED_ORIGINS to your real frontend origin(s) — do NOT deploy with "*".
#   The default below is the explicit prod+localhost list (already not "*"); keep
#   it explicit. The unauthenticated public RSVP endpoints rely on the unguessable
#   rsvpCode as their gate (CORS is not their security boundary), but an explicit
#   origin list still keeps browser callers scoped to your own front door.
#   ALLOWED_ORIGIN_REGEX: also allow origins matching this regex. Defaults to
#                    localhost + private LAN IPs (any port) so device/LAN testing
#                    and local dev work without listing every address.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "https://twillis45.github.io,http://localhost:3000",
).split(",") if o.strip()]

ALLOWED_ORIGIN_REGEX = os.environ.get(
    "ALLOWED_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?::\d+)?",
)

# ── Supabase Auth ──────────────────────────────────────────────────────────────
# Planner-gated routes verify a Supabase access token against the project's
# GoTrue /auth/v1/user endpoint (see app/auth.py). Both values are non-secret:
#   SUPABASE_URL       → Supabase → Settings → API → Project URL
#   SUPABASE_ANON_KEY  → Supabase → Settings → API → anon / publishable key
# (The anon key is safe server-side; it's only used as the GoTrue `apikey` header.)
SUPABASE_URL      = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
# Server only: required for account deletion; never expose in capabilities.
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Legacy shared dev token. Honored ONLY in explicit local development (when
# ALLOW_DEV_TOKEN=true). Deployed environments (preview/staging/production) must
# NOT set ALLOW_DEV_TOKEN, so X-Planner-Token is ignored there regardless of value.
# Real auth is the Supabase JWT path; this is a local-dev shorthand only.
PLANNER_DEV_TOKEN = os.environ.get("PLANNER_DEV_TOKEN")
ALLOW_DEV_TOKEN   = os.environ.get("ALLOW_DEV_TOKEN", "").lower() == "true"

# ── Stripe ─────────────────────────────────────────────────────────────────────
# Stripe Checkout for client deposits/balances — Sprint 64.
# STRIPE_SECRET_KEY:     Stripe Dashboard → Developers → API keys → Secret key (sk_live_... or sk_test_...)
# STRIPE_WEBHOOK_SECRET: Stripe Dashboard → Webhooks → endpoint signing secret (whsec_...)
# Never expose either value to the browser.
STRIPE_SECRET_KEY     = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

# PASS_SALES_PAUSED: the stop-selling lever (stage 9 work order #9, 11/11/2026).
# "1"/"true" refuses NEW One-Event Pass checkouts (503) and tells the shell to
# hide the buy button. It touches nothing else: webhooks, GET /pass, refunds,
# existing passes and the vendor-brief gate (keyed on the Stripe keys) keep
# working. Removing STRIPE_SECRET_KEY also stops sales but makes every vendor
# brief free — this flag exists so nobody has to pull that one.
PASS_SALES_PAUSED = os.environ.get("PASS_SALES_PAUSED", "").strip().lower() in ("1", "true", "yes")

# THE ONE-EVENT PASS PRICE TEST (plan item G86, owner approval 11/19/2026: "a
# $49 test (second Stripe price)"). OFF unless BOTH are valid:
#   PASS_PRICE_TEST_CENTS  the test price, an integer 100–50000 and not 3900
#   PASS_PRICE_TEST_SHARE  the percent of devices that get it, an integer 1–100
# Anything else (unset, empty, 0, malformed) means every host pays $39. Raw
# strings here; `stripe_payments.pass_price_test()` validates at call time.
PASS_PRICE_TEST_CENTS = os.environ.get("PASS_PRICE_TEST_CENTS", "").strip()
PASS_PRICE_TEST_SHARE = os.environ.get("PASS_PRICE_TEST_SHARE", "").strip()

# ── PostHog Query API (read-only analytics proxy) — ANALYTICS-1 ─────────────────
# Server-side HogQL proxy so the admin console can render the behavioral funnel/
# friction natively instead of linking out. The client SDK is write-only; this is the
# ONLY read path. All values are backend-only — never shipped to the browser.
# POSTHOG_QUERY_API_KEY: PostHog → Settings → Personal API keys → a key scoped to
#   "Query Read" (phx_...). NOT the phc_ project write key the frontend uses.
# POSTHOG_PROJECT_ID:    PostHog → Settings → Project → Project ID (a number).
# POSTHOG_QUERY_HOST:    https://us.posthog.com (default) or https://eu.posthog.com.
POSTHOG_QUERY_API_KEY = os.environ.get("POSTHOG_QUERY_API_KEY")
POSTHOG_PROJECT_ID    = os.environ.get("POSTHOG_PROJECT_ID")
POSTHOG_QUERY_HOST    = os.environ.get("POSTHOG_QUERY_HOST", "https://us.posthog.com")

# ── Device notifications (Web Push, owner decision "B", 11/20/2026) ────────────
# The VAPID key pair (RFC 8292) that signs every push this server sends, and the
# contact the push services see (a mailto: URL). All three, or push stays off:
# GET /api/push/public-key answers 503 and the settings row stays hidden.
# VAPID_PUBLIC_KEY:  base64url, uncompressed P-256 point (87 characters).
# VAPID_PRIVATE_KEY: base64url, the raw 32-byte private scalar (43 characters).
# Generate both with `npx web-push generate-vapid-keys` (docs/integrations/ENV_REFERENCE.md).
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
VAPID_SUBJECT     = os.environ.get("VAPID_SUBJECT", "").strip()
