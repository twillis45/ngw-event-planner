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

# TODO(auth): replace this dev gate with real Supabase Auth JWT verification.
# Until then, INTERNAL_TEAM + write routes require this shared dev token via the
# X-Planner-Token header. This is NOT production security — it's a temporary guard.
PLANNER_DEV_TOKEN = os.environ.get("PLANNER_DEV_TOKEN")
