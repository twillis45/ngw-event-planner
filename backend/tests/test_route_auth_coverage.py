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
APP = pathlib.Path(__file__).resolve().parents[1] / "app"
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}

# route  ->  why it is allowed to be unauthenticated
INTENTIONALLY_PUBLIC = {
    ("GET", "/status"): "capability probe — returns booleans, no data",
    ("GET", "/instacart/status"): "capability probe",
    ("GET", "/kroger/status"): "capability probe",
    ("GET", ""): "food_prices index (@router.get('')) — upstream BLS constant, no caller URL",
    # Public-by-design, each gated by its OWN unguessable credential
    ("GET", "/api/public/invite/{rsvp_code}"): "rsvpCode is the credential; entropy floor enforced",
    ("POST", "/api/public/rsvp/{rsvp_code}"): "same rsvpCode credential",
    ("POST", "/api/public/rsvp/{rsvp_code}/mine"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/rsvp/{rsvp_code}/withdraw"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/photos/{rsvp_code}"): "rsvpCode + the guest's device key header; after the event only",
    ("POST", "/api/public/photos/{rsvp_code}/mine"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/photos/{rsvp_code}/{photo_id}/delete"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/photos/{rsvp_code}/privacy"): "rsvpCode + the guest's own device key; her photos only",
    ("GET", "/api/public/photos/{rsvp_code}"): "rsvpCode; host-approved photos only, no names",
    ("GET", "/api/public/invite-card/{rsvp_code}"): "rsvpCode; the invitation picture for the invite email, facts the invite page already shows",
    ("GET", "/api/public/host-photo/{rsvp_code}"): "rsvpCode; the host's own opt-in photo on her invite, never by event or studio id",
    ("GET", "/api/public/email-card/{token}"): "a 32-hex random token minted per picture (128 bits), exact shape only; the picture of one email's card, never by event id",
    ("GET", "/api/public/calendar/{code}.ics"): "calendarCode (24+ chars, host-minted, host-revocable) is the credential; dates and step/vendor names the host's app saved, no guests, money or notes",
    ("GET", "/api/public/family/{code}"): "familyCode (24+ chars, host-minted, host-revocable) is the credential; read-only allow-listed plan, no guest names, money or codes",
    ("GET", "/api/public/vendor-brief/{code}"): "per-brief code is the credential",
    ("POST", "/api/public/vendor-brief/{code}/confirm"): "same brief code",
    ("GET", "/api/public/helper/{code}"): "per-helper code is the credential; entropy floor enforced",
    ("POST", "/api/public/helper/{code}/answer"): "same helper code",
    ("POST", "/api/public/questions/{rsvp_code}/mine"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/questions/{rsvp_code}/ask"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/questions/{rsvp_code}/email"): "rsvpCode + the guest's own device key",
    ("POST", "/api/public/questions/{rsvp_code}/delete"): "rsvpCode + the guest's own device key",
    ("GET", "/api/public/questions/unsubscribe/{token}"): "read-only confirm page; the token is the credential",
    ("GET", "/api/public/announcements/{rsvp_code}"): "rsvpCode; read-only, body and time of each update, nothing else",
    ("POST", "/api/public/questions/unsubscribe/{token}"): "the thread's emailed-link guest_token, 22+ chars, exact match",
    ("POST", "/api/public/invite/{rsvp_code}/opened"): "rsvpCode; never creates an identity, answers the same for any key",
    ("POST", "/messages/{message_id}/portal-respond"): "per-message portal_token is checked",
    # OAuth + provider callbacks: cannot carry our auth by definition
    ("GET", "/connect"): "DocuSign OAuth start",
    ("GET", "/callback"): "DocuSign OAuth return",
    ("POST", "/webhook"): "provider-signed webhook — Stripe/DocuSign verify a signature instead",
    # Outbound wrappers — no caller-supplied URL (verified: all build from env base constants)
    ("POST", "/instacart-cart"): "posts to INSTACART_API_BASE constant",
    ("POST", "/kroger/search-list"): "posts to KROGER_API_BASE constant",
    ("GET", "/kroger/locations"): "reads KROGER_API_BASE constant",
    ("GET", "/geocode"): "OpenWeather constant",
    ("GET", "/onecall"): "OpenWeather constant",
    # Guarded by safe_fetch rather than by auth
    ("GET", "/unfurl"): "caller URL, but routed through safe_fetch",
    ("GET", "/results"): "caller URL, but routed through safe_fetch",
    # /channels, /envelope/{envelope_id} and /verify-session were listed here
    # and have required sign-in since 2026-08-21; the stale check removed them.
    # create-checkout-session was here as "anonymous today, a product decision".
    # The board ruled 2026-08-07: require signed-in. The entry is DELETED rather
    # than reworded, so the sweep now fails if it ever goes public again.
    # Seen only once the sweep read every router object (SEC-4 board 11/19/2026, L10)
    ("GET", "/api/public/email/stop/{token}"): "the emailed stop token (24 random bytes) is the credential; shows a button, changes nothing",
    ("POST", "/api/public/email/stop/{token}"): "the same stop token; stops that one address, same answer for any token (no oracle)",
    ("GET", "/health"): "liveness probe; ok, service name, deployed commit SHA and process start time, nothing else",
    ("GET", "/api/capabilities"): "capability probe; booleans only, never secrets",
    ("GET", "/public-key"): "push.py (/api/push/public-key): the VAPID PUBLIC key, handed to every subscribing browser by design; 503 when unset; no data, no writes",
    ("POST", "/api/resend-webhook"): "provider webhook: Svix signature checked when RESEND_WEBHOOK_SECRET is set; RECORDED: unverified without it (board C3)",
}


def unauthenticated_routes():
    found = []
    for p in sorted(ROUTERS.glob("*.py")) + [APP / "main.py"]:
        tree = ast.parse(io.open(p, encoding="utf-8").read())
        for n in ast.walk(tree):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            meth = path = None
            for d in n.decorator_list:
                # ANY router object, not only one named `router` (SEC-4 board
                # 11/19/2026, finding L10): `@public_router.get(...)` and
                # `@app.post(...)` routes were invisible to this sweep.
                if (isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                        and isinstance(d.func.value, ast.Name)
                        and d.func.attr in HTTP_METHODS):
                    meth = d.func.attr.upper()
                    if d.args and isinstance(d.args[0], ast.Constant):
                        path = d.args[0].value
            if not meth:
                continue
            calls = {ast.unparse(call.func) for call in ast.walk(n)
                     if isinstance(call, ast.Call)}
            if calls & {"require_planner", "require_admin", "require_fee_planner"}:
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


def test_the_checkout_is_gated():
    # Two-sided pin. The sweep above already fails if this route goes public,
    # but only while the allowlist entry stays deleted — someone silencing the
    # sweep by re-adding it still fails here.
    pub = {(m, pth) for m, pth, _f, _ln in unauthenticated_routes()}
    assert ("POST", "/create-checkout-session") not in pub, \
        "minting a Stripe charge is anonymous again"


def test_the_channel_write_is_gated():
    # The specific finding. `_ensure_channels` has no FK behind it, so an
    # anonymous caller could create rows for arbitrary strings forever.
    pub = {(m, pth) for m, pth, _f, _ln in unauthenticated_routes()}
    assert ("POST", "/channels/ensure") not in pub


def test_the_messages_view_is_gated():
    # Messages view (11/20/2026): every email and co-host invite on an event.
    # Two-sided, like the checkout: the sweep fails if it goes public, and so
    # does this even if someone argues it onto the allowlist.
    pub = {(m, pth) for m, pth, _f, _ln in unauthenticated_routes()}
    assert ("GET", "/sent") not in pub


def test_the_scanner_still_sees_routes(): 
    # Premise guard. If the AST walk breaks, every test above passes by finding
    # nothing — the exact vacuous-pass shape that wasted a day of this sprint.
    all_routes = unauthenticated_routes()
    assert len(all_routes) > 10, "scanner found almost nothing — it is broken, not the code"


def test_no_declared_public_route_is_stale():
    # SEC-4 board 11/19/2026 (L10): an entry for a route that no longer exists,
    # or that now requires sign-in, is a reason nobody re-reads. It must go.
    seen = {(m, pth) for m, pth, _f, _ln in unauthenticated_routes()}
    stale = sorted(k for k in INTENTIONALLY_PUBLIC if k not in seen)
    assert stale == [], "Declared public but not found unauthenticated; remove:\n  " + "\n  ".join(map(str, stale))
