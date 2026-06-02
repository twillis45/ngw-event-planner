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
APP_BASE_URL             = os.environ.get("APP_BASE_URL", "https://twillis45.github.io/ngw-event-planner")

# CORS — the frontends allowed to call this API.
#   ALLOWED_ORIGINS: comma-separated exact origins (your production domains).
#                    Set it to "*" to allow any origin (safe here — the real
#                    boundary is the Supabase JWT + per-event ownership, and the
#                    CLIENT read channel is public by design).
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

# Legacy shared dev token. Honored ONLY in explicit local development (when
# ALLOW_DEV_TOKEN=true). Deployed environments (preview/staging/production) must
# NOT set ALLOW_DEV_TOKEN, so X-Planner-Token is ignored there regardless of value.
# Real auth is the Supabase JWT path; this is a local-dev shorthand only.
PLANNER_DEV_TOKEN = os.environ.get("PLANNER_DEV_TOKEN")
ALLOW_DEV_TOKEN   = os.environ.get("ALLOW_DEV_TOKEN", "").lower() == "true"
