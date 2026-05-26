"""Planner authentication for gated routes.

Verifies a Supabase access token by introspecting it against the project's GoTrue
`/auth/v1/user` endpoint. This works with both legacy HS256 tokens and the newer
asymmetric signing keys without needing the JWT secret, and naturally respects
revocation/expiry. Successful lookups are cached briefly to avoid a round-trip on
every request.

The shared PLANNER_DEV_TOKEN (X-Planner-Token header) is a local-dev shorthand
only — it is ignored unless ALLOW_DEV_TOKEN=true is set in the environment.
Deployed environments (preview/staging/production) must NOT set that flag, so the
only authoritative auth path in deployment is the Supabase JWT.
"""
import time
from typing import Optional

import httpx
from fastapi import HTTPException

from .config import SUPABASE_URL, SUPABASE_ANON_KEY, PLANNER_DEV_TOKEN, ALLOW_DEV_TOKEN

# token -> (expires_at_epoch, user_dict)
_cache: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 300  # seconds


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def supabase_auth_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)


async def verify_supabase_token(token: str) -> Optional[dict]:
    """Return the Supabase user dict for a valid access token, else None."""
    if not supabase_auth_enabled():
        return None
    now = time.time()
    cached = _cache.get(token)
    if cached and cached[0] > now:
        return cached[1]
    url = SUPABASE_URL.rstrip("/") + "/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
            )
    except Exception:
        return None
    if resp.status_code != 200:
        return None
    try:
        user = resp.json()
    except Exception:
        return None
    if not isinstance(user, dict) or not user.get("id"):
        return None
    _cache[token] = (now + _CACHE_TTL, user)
    return user


async def require_planner(
    authorization: Optional[str] = None,
    x_planner_token: Optional[str] = None,
) -> dict:
    """Authorize a privileged (planner) action.

    Order of preference:
      1. A valid Supabase access token (the signed-in planner) — the only path
         honored in deployed environments.
      2. The shared X-Planner-Token — honored ONLY when ALLOW_DEV_TOKEN=true is
         set in the environment (explicit local development). Ignored otherwise.
    Raises 401 when neither is satisfied.
    """
    token = _bearer(authorization)
    if token:
        user = await verify_supabase_token(token)
        if user:
            return {"id": user.get("id"), "email": user.get("email"), "via": "supabase"}

    if ALLOW_DEV_TOKEN and PLANNER_DEV_TOKEN and x_planner_token and x_planner_token == PLANNER_DEV_TOKEN:
        return {"id": "dev-token", "via": "dev_token"}

    raise HTTPException(status_code=401, detail="Planner authentication required")
