"""Backend-only configuration. NEVER import these into frontend code.
All secrets come from the environment (Render dashboard / local .env)."""
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Postgres connection string (use the pooler URL from Supabase → Settings → Database).
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")

RESEND_API_KEY           = os.environ.get("RESEND_API_KEY")
COMMUNICATION_EMAIL_FROM = os.environ.get("COMMUNICATION_EMAIL_FROM", "events@example.com")
APP_BASE_URL             = os.environ.get("APP_BASE_URL", "https://twillis45.github.io/ngw-event-planner")

# CORS — the frontends allowed to call this API.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "https://twillis45.github.io,http://localhost:3000",
).split(",") if o.strip()]

# ── Supabase Auth ──────────────────────────────────────────────────────────────
# Planner-gated routes verify a Supabase access token against the project's
# GoTrue /auth/v1/user endpoint (see app/auth.py). Both values are non-secret:
#   SUPABASE_URL       → Supabase → Settings → API → Project URL
#   SUPABASE_ANON_KEY  → Supabase → Settings → API → anon / publishable key
# (The anon key is safe server-side; it's only used as the GoTrue `apikey` header.)
SUPABASE_URL      = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

# Legacy transition gate. Used ONLY as a fallback (shared X-Planner-Token header)
# while planners migrate to Supabase sign-in. Remove once everyone uses Supabase
# Auth. This is NOT production security on its own.
PLANNER_DEV_TOKEN = os.environ.get("PLANNER_DEV_TOKEN")
