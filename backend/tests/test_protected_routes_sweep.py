"""Stage-5 sweep: every route in a security-sensitive router either gates its
caller or is on the NAMED public allowlist below.

The 2026-08-21 security checklist found the auth tests covered the routes
someone had already worried about, not the enumerated surface — which is
exactly how the next unauthenticated route ships. This walks the actual
routers two ways:

1. SOURCE gate — each endpoint's parsed code must call an auth/verification gate
   (require_planner, admin auth, webhook signature verify, or a brief-token
   resolve) unless its "METHOD /path" is listed in PUBLIC with a reason.
2. LIVE gate — every signed-in endpoint, hit bare over a TestClient
   (no headers, schema-valid body/query and path params), must answer 401 — never 200 and never a
   500 from assuming a user exists.

A new route in these routers fails (1) until it either gates or is
explicitly argued onto the allowlist here. Fully offline: bare requests are
refused before any external call.
"""
import ast
import textwrap
import inspect
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.main import app as MOUNTED_APP


def _walk(routes):
    """Every APIRoute the app serves. FastAPI 0.115 (the pinned version)
    flattens included routers into app.routes; newer FastAPI keeps each one
    behind an _IncludedRouter wrapper with .original_router. Walk both, so the
    sweep sees the same surface whichever version runs it."""
    for r in routes:
        if isinstance(r, APIRoute):
            yield r
        elif hasattr(r, "original_router"):
            yield from _walk(r.original_router.routes)


# ENUMERATED, not hand-listed (board condition C4-2, 2026-11-02). Until then
# this was a hand list of 8 of the 16 routers main.py mounts, so a new router
# could ship with no gate and nothing here would go red. Now the sweep is
# whatever the deployed app actually serves — main.py's own routes included.
MOUNTED = list(_walk(MOUNTED_APP.routes))

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
    # A guest's OWN reply: the code plus the random key minted in her browser is
    # the credential, matched in the WHERE clause (test_rsvp_guest_owns_reply).
    "POST /api/public/rsvp/{rsvp_code}/mine": "guest's own reply; code + device key in body",
    "POST /api/public/rsvp/{rsvp_code}/withdraw": "guest's own reply; code + device key in body",
    # portal-respond: the portal_token in the BODY is the credential, matched
    # against metadata.portal_token stamped on the approval_request message.
    "POST /api/events/{event_id}/communication/messages/{message_id}/portal-respond":
        "portal_token in body is the credential",
    # ── main.py's own routes ────────────────────────────────────────────────
    "GET /health": "liveness probe — no data, no writes",
    "GET /api/capabilities": "booleans only (is X configured) — never a secret",
    # ── Read-only reference feeds (board condition 6, 2026-11-02) ──────────
    # These serve no account data and write nothing, so there is no caller to
    # authenticate: the planner app calls them before and without sign-in.
    # THE COST WE ACCEPT, written down because nothing recorded it before:
    # anyone who finds the API can spend OUR third-party quota through them
    # (OpenWeather, BLS, Instacart, Kroger) and use the server as a fetcher for
    # the two lodging hosts. There is no per-IP rate limit today. If a quota
    # bill or a provider ban ever shows up, the fix is a rate limit or a
    # require_planner gate here — not a quieter allowlist.
    "GET /api/weather/status": "config presence only",
    "GET /api/weather/geocode": "public reference data; spends OUR OpenWeather quota",
    "GET /api/weather/onecall": "public reference data; spends OUR OpenWeather quota",
    "GET /api/food-prices/status": "config presence only",
    "GET /api/food-prices": "public BLS averages, cached per region+month; spends OUR BLS quota",
    "GET /api/shopping/instacart/status": "config presence only",
    "POST /api/shopping/instacart-cart":
        "builds a shopping-list link from the body, stores nothing; spends OUR Instacart key",
    "GET /api/shopping/kroger/status": "config presence only",
    "POST /api/shopping/kroger/search-list":
        "public product prices, stores nothing; spends OUR Kroger client credentials",
    "GET /api/shopping/kroger/locations": "public store locations; spends OUR Kroger client credentials",
    "GET /api/lodging/unfurl":
        "https Airbnb/Vrbo listing hosts only, every redirect hop re-checked by safe_get (no SSRF)",
    "GET /api/lodging/results":
        "https Airbnb/Vrbo search pages only, same safe_get hop check (no SSRF)",
}

# Source markers that count as a caller gate.
GATES = (
    "require_planner",
    "require_fee_planner",
    "require_admin",             # admin console: app_metadata.role, server-side
    "stripe.Webhook.construct_event",   # Stripe signature verification (fixed 2026-08-07)
    "_verify_resend_signature",  # Resend (Svix) HMAC, main.py
)


def gate_calls(source):
    """Executed call syntax only; comments, strings, and bare names are not gates."""
    tree = ast.parse(textwrap.dedent(source))
    calls = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = ast.unparse(node.func)
            if name in GATES:
                calls.add(name)
    return calls


def test_documentation_cannot_impersonate_a_gate():
    assert not gate_calls('async def route():\n    """require_planner"""\n    # require_admin()\n    return "require_fee_planner()"')
    assert gate_calls('async def route():\n    await require_planner(None, None)') == {'require_planner'}


def _routes():
    for r in MOUNTED:
        for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
            yield m, r


def _key(method, route):
    return f"{method} {route.path}"


def test_every_sensitive_route_is_gated_or_argued_public():
    ungated = []
    for method, r in _routes():
        src = inspect.getsource(r.endpoint)
        key = _key(method, r)
        if gate_calls(src):
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
    keys = {_key(m, r) for m, r in _routes()}
    stale = [k for k in PUBLIC if k not in keys]
    assert stale == [], "PUBLIC entries with no matching route: " + ", ".join(stale)


def test_the_sweep_reaches_every_router_main_mounts():
    # The enumeration's own guard: if the walk ever stops descending into
    # included routers (a FastAPI upgrade changing the wrapper again), this
    # goes red instead of the sweep silently checking three routes.
    import app.main as main_mod
    import pathlib, re
    mounted = set(re.findall(r"app\.include_router\((\w+)\.router\)",
                             pathlib.Path(main_mod.__file__).read_text()))
    reached = {r.endpoint.__module__.rsplit(".", 1)[-1] for r in MOUNTED}
    assert len(mounted) >= 16, f"main.py mounts {len(mounted)} routers — parse broke?"
    assert mounted - reached == set(), f"mounted but not swept: {sorted(mounted - reached)}"


@pytest.fixture()
def bare_client():
    return TestClient(MOUNTED_APP, raise_server_exceptions=False)


def schema_value(schema, root=None):
    """Build structurally valid input: validation must not hide missing auth."""
    root = root or schema
    if "$ref" in schema:
        target = root
        for part in schema["$ref"].split("/")[1:]:
            target = target[part]
        return schema_value(target, root)
    if "default" in schema:
        return schema["default"]
    if "enum" in schema:
        return schema["enum"][0]
    if "const" in schema:
        return schema["const"]
    if "anyOf" in schema:
        return schema_value(next(x for x in schema["anyOf"] if x.get("type") != "null"), root)
    kind = schema.get("type")
    if kind == "object":
        return {k: schema_value(schema["properties"][k], root) for k in schema.get("required", [])}
    if kind == "array":
        return [schema_value(schema.get("items", {}), root) for _ in range(schema.get("minItems", 0))]
    if kind in ("integer", "number"):
        return max(1, schema.get("minimum", 1), schema.get("exclusiveMinimum", 0) + 1)
    if kind == "boolean":
        return False
    return "x" * max(1, schema.get("minLength", 1))


def test_planner_gated_routes_answer_401_bare(bare_client):
    hit = 0
    for method, r in _routes():
        src = inspect.getsource(r.endpoint)
        if not gate_calls(src) & {"require_planner", "require_admin", "require_fee_planner"}:
            continue
        path = r.path
        for name in r.param_convertors:
            path = path.replace("{" + name + "}", "INTERNAL_TEAM" if name == "channel_type" else "x")
        payload = schema_value(TypeAdapter(r.body_field.type_).json_schema()) if r.body_field else None
        params = {f.alias: schema_value(TypeAdapter(f.field_info.annotation).json_schema())
                  for f in r.dependant.query_params if f.required}
        resp = bare_client.request(method, path, json=payload, params=params)
        hit += 1
        # Valid route/body/query input must reach authentication. A validation
        # error is a broken probe, never evidence of an auth boundary.
        assert resp.status_code == 401, (
            f"{method} {path}: expected 401 bare, got {resp.status_code}"
        )
    assert hit >= 20, f"sweep only reached {hit} require_planner routes — wiring broke?"
