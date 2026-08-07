# ── WHICH ROUTES ARE PUBLIC, ON PURPOSE ─────────────────────────────────────
#
# An auth sweep on 2026-08-07 found `POST .../channels/ensure` anonymous — a
# WRITE that inserts into event_channels for whatever event_id string it is
# handed, with no foreign key behind it (migrations/0001_communication.sql
# declares the column `text not null`), so anyone could create rows without
# limit or ownership.
#
# The sweep also produced a false reading worth guarding against: the first
# scanner looked 30 lines ahead of each decorator for `require_planner`, so a
# route inherited the auth of the route BELOW it and reported clean. This test
# reads the function's own signature and body, via AST, and nothing else.
#
# The list below is an ALLOWLIST OF INTENT, not a description. Every public
# route has to be named here with a reason, so making one public becomes a
# deliberate edit to this file rather than an omission nobody notices.
import ast
import io
import pathlib

ROUTERS = pathlib.Path(__file__).resolve().parents[1] / "app" / "routers"

# route  ->  why it is allowed to be unauthenticated
INTENTIONALLY_PUBLIC = {
    ("GET", "/status"): "capability probe — returns booleans, no data",
    ("GET", "/instacart/status"): "capability probe",
    ("GET", "/kroger/status"): "capability probe",
    ("GET", ""): "food_prices index (@router.get('')) — upstream BLS constant, no caller URL",
    # Public-by-design, each gated by its OWN unguessable credential
    ("GET", "/api/public/invite/{rsvp_code}"): "rsvpCode is the credential; entropy floor enforced",
    ("POST", "/api/public/rsvp/{rsvp_code}"): "same rsvpCode credential",
    ("GET", "/api/public/vendor-brief/{code}"): "per-brief code is the credential",
    ("POST", "/api/public/vendor-brief/{code}/confirm"): "same brief code",
    ("POST", "/messages/{message_id}/portal-respond"): "per-message portal_token is checked",
    # Client-portal reads — list_messages gates INTERNAL_TEAM only, deliberately
    ("GET", "/channels"): "portal lists channels without a planner session; RECORDED as a finding, not endorsed",
    # OAuth + provider callbacks: cannot carry our auth by definition
    ("GET", "/connect"): "DocuSign OAuth start",
    ("GET", "/callback"): "DocuSign OAuth return",
    ("POST", "/webhook"): "provider-signed webhook — Stripe/DocuSign verify a signature instead",
    ("GET", "/envelope/{envelope_id}"): "envelope id is the credential; RECORDED as a finding",
    # Outbound wrappers — no caller-supplied URL (verified: all build from env base constants)
    ("POST", "/instacart-cart"): "posts to INSTACART_API_BASE constant",
    ("POST", "/kroger/search-list"): "posts to KROGER_API_BASE constant",
    ("GET", "/kroger/locations"): "reads KROGER_API_BASE constant",
    ("GET", "/geocode"): "OpenWeather constant",
    ("GET", "/onecall"): "OpenWeather constant",
    # Guarded by safe_fetch rather than by auth
    ("GET", "/unfurl"): "caller URL, but routed through safe_fetch",
    ("GET", "/results"): "caller URL, but routed through safe_fetch",
    # Payments — anonymous today; a product decision, recorded in the audit
    ("POST", "/create-checkout-session"): "RECORDED as a finding: require_planner means signed-in",
    ("GET", "/verify-session"): "RECORDED as a finding: keyed on an unguessable session id",
}


def unauthenticated_routes():
    found = []
    for p in sorted(ROUTERS.glob("*.py")):
        tree = ast.parse(io.open(p, encoding="utf-8").read())
        for n in ast.walk(tree):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            meth = path = None
            for d in n.decorator_list:
                if (isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                        and isinstance(d.func.value, ast.Name) and d.func.value.id == "router"):
                    meth = d.func.attr.upper()
                    if d.args and isinstance(d.args[0], ast.Constant):
                        path = d.args[0].value
            if not meth:
                continue
            blob = ast.dump(ast.Module(body=n.body, type_ignores=[])) + ast.dump(n.args)
            if "require_planner" in blob or "require_admin" in blob:
                continue
            found.append((meth, path, p.name, n.lineno))
    return found


def test_every_public_route_is_a_declared_intent():
    surprises = [
        f"{m} {pth}  ({f}:{ln})"
        for m, pth, f, ln in unauthenticated_routes()
        if (m, pth) not in INTENTIONALLY_PUBLIC
    ]
    assert surprises == [], (
        "New unauthenticated route(s). If public is correct, add it to "
        "INTENTIONALLY_PUBLIC with the reason:\n  " + "\n  ".join(surprises)
    )


def test_the_channel_write_is_gated():
    # The specific finding. `_ensure_channels` has no FK behind it, so an
    # anonymous caller could create rows for arbitrary strings forever.
    pub = {(m, pth) for m, pth, _f, _ln in unauthenticated_routes()}
    assert ("POST", "/channels/ensure") not in pub


def test_the_scanner_still_sees_routes(): 
    # Premise guard. If the AST walk breaks, every test above passes by finding
    # nothing — the exact vacuous-pass shape that wasted a day of this sprint.
    all_routes = unauthenticated_routes()
    assert len(all_routes) > 10, "scanner found almost nothing — it is broken, not the code"
