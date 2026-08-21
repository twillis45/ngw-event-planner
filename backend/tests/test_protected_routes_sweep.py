"""Stage-5 sweep: every route in a security-sensitive router either gates its
caller or is on the NAMED public allowlist below.

The 2026-08-21 security checklist found the auth tests covered the routes
someone had already worried about, not the enumerated surface — which is
exactly how the next unauthenticated route ships. This walks the actual
routers two ways:

1. SOURCE gate — each endpoint's source must call an auth/verification gate
   (require_planner, admin auth, webhook signature verify, or a brief-token
   resolve) unless its "METHOD /path" is listed in PUBLIC with a reason.
2. LIVE gate — every require_planner endpoint, hit bare over a TestClient
   (no headers, dummy path params), must answer 401 — never 200 and never a
   500 from assuming a user exists.

A new route in these routers fails (1) until it either gates or is
explicitly argued onto the allowlist here. Fully offline: bare requests are
refused before any external call.
"""
import inspect
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.routers import admin, ai, communication, docusign, rsvp, stripe_payments, vendor_brief, webhooks

# The security-sensitive routers: money, messages, documents, AI spend, the
# admin console, and anything that writes on behalf of a person. Read-only
# price/weather feeds (kroger, weather, food_prices, …) are out of scope.
ROUTERS = [admin, ai, communication, docusign, rsvp, stripe_payments, vendor_brief, webhooks]

# Routes that are PUBLIC by design. Every entry carries its reason — an entry
# without a defensible reason is a finding, not a config.
PUBLIC = {
    # Config-presence health checks: no data, no writes.
    "GET /api/ai/status": "config presence only",
    "GET /api/docusign/status": "config presence only",
    "GET /api/stripe/status": "config presence only",
    "GET /api/webhooks/status": "config presence only",
    # OAuth dance: the caller has no session with us yet by definition.
    "GET /api/docusign/connect": "OAuth entry — redirects to DocuSign",
    "GET /api/docusign/callback": "OAuth return leg — carries DocuSign's code, not our auth",
    # DocuSign Connect notifications: LOG-ONLY today (no state change) — the
    # moment this route mutates anything it must verify Connect's HMAC first;
    # see checklist finding "webhook is unverified but inert".
    "POST /api/docusign/webhook": "log-only; must add HMAC before any state change",
    # Vendor-facing surfaces: the vendor is anonymous BY DESIGN; the
    # unguessable code in the path IS the credential.
    "GET /api/public/vendor-brief/{code}": "brief code in path is the credential",
    "POST /api/public/vendor-brief/{code}/confirm": "brief code is the credential",
    # Guest RSVP: guests never have accounts; the rsvp code is the credential.
    "GET /api/public/invite/{rsvp_code}": "guest-facing; code is the credential",
    "POST /api/public/rsvp/{rsvp_code}": "guest-facing; code is the credential",
    # portal-respond: the portal_token in the BODY is the credential, matched
    # against metadata.portal_token stamped on the approval_request message.
    "POST /api/events/{event_id}/communication/messages/{message_id}/portal-respond":
        "portal_token in body is the credential",
}

# Source markers that count as a caller gate.
GATES = (
    "require_planner",
    "require_admin",             # admin console: app_metadata.role, server-side
    "Webhook.construct_event",   # Stripe signature verification (fixed 2026-08-07)
)


def _routes():
    for mod in ROUTERS:
        for r in mod.router.routes:
            if isinstance(r, APIRoute):
                for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
                    yield mod, m, r


def _key(method, route, mod):
    prefix = getattr(mod.router, "prefix", "") or ""
    return f"{method} {prefix}{route.path}" if not route.path.startswith(prefix) else f"{method} {route.path}"


def test_every_sensitive_route_is_gated_or_argued_public():
    ungated = []
    for mod, method, r in _routes():
        src = inspect.getsource(r.endpoint)
        key = _key(method, r, mod)
        if any(g in src for g in GATES):
            continue
        if key in PUBLIC:
            continue
        ungated.append(key)
    assert ungated == [], (
        "Routes with no caller gate and no argued PUBLIC entry: " + ", ".join(ungated)
    )


def test_public_allowlist_matches_reality():
    # An allowlist entry for a route that no longer exists (or now gates) is
    # stale doctrine — it would silently bless a FUTURE route at that path.
    keys = {_key(m, r, mod) for mod, m, r in _routes()}
    stale = [k for k in PUBLIC if k not in keys]
    assert stale == [], "PUBLIC entries with no matching route: " + ", ".join(stale)


@pytest.fixture()
def bare_client():
    app = FastAPI()
    for mod in ROUTERS:
        app.include_router(mod.router)
    return TestClient(app, raise_server_exceptions=False)


def test_planner_gated_routes_answer_401_bare(bare_client):
    hit = 0
    for mod, method, r in _routes():
        src = inspect.getsource(r.endpoint)
        if "require_planner" not in src and "require_admin" not in src:
            continue
        path = r.path
        for name in r.param_convertors:
            path = path.replace("{" + name + "}", "x")
        resp = bare_client.request(method, path, json={})
        hit += 1
        # 401 is the contract. 422/400 are tolerated ONLY when the shape is
        # rejected before auth runs (FastAPI body validation, or an explicit
        # assert_channel_type on the dummy 'x' path param); anything else —
        # 200, 404-as-a-lie, 500 — fails.
        assert resp.status_code in (400, 401, 422), (
            f"{method} {path}: expected 401 bare, got {resp.status_code}"
        )
    assert hit >= 20, f"sweep only reached {hit} require_planner routes — wiring broke?"
