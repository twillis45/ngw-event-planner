# ─── THE ONE ENDPOINT THAT CAN WRITE "DELIVERED" HAD NO TEST ─────────────────
#
# `delivered` is the status the whole comms honesty story rests on: the app is
# careful to say "accepted by the provider" and NOT "delivered", and the ONLY
# thing that can promote a row to delivered is POST /api/resend-webhook. Stripe's
# webhook has had a signature suite since 2026-08-07. This one had nothing —
# found 2026-09-23 while checking whether the webhook could be proven live.
#
# ── WHAT THIS CAN AND CANNOT PROVE ──────────────────────────────────────────
#
# It CANNOT prove the webhook is live. That needs a real send through a
# credentialed planner session and a real callback from Resend, and it is Todd's
# to run — this container cannot reach api.resend.com (the network policy
# answers 403 to CONNECT), holds no RESEND_API_KEY, and must never mint a
# planner credential.
#
# What it DOES prove is the half that makes his live run interpretable: that the
# handler maps every documented event correctly, rejects a forged signature, and
# ignores what it does not understand. If his live send does not flip a row to
# delivered after this is green, the fault is in the Resend dashboard config or
# the deploy — not in this code. Without these tests, a failed live run has two
# suspects and no way to separate them.
#
# ── THE SPOOF WINDOW, PINNED RATHER THAN ASSUMED ────────────────────────────
#
# With no RESEND_WEBHOOK_SECRET set, the handler accepts any caller — its own
# docstring says so. That is a real, deliberate dev-mode gap, and the last test
# here pins it so it is a KNOWN state with a failing test the day someone
# believes production is protected without setting the secret.
import base64
import hashlib
import hmac
import json

import pytest

import app.main as M


# ── helpers ─────────────────────────────────────────────────────────────────

SECRET = "whsec_" + base64.b64encode(b"a-test-signing-secret-32-bytes!!").decode()


def _sign(body: bytes, svix_id: str, ts: str, secret: str) -> str:
    """Build the header Resend would send, the way Svix builds it."""
    signed = f"{svix_id}.{ts}.".encode() + body
    key = base64.b64decode(secret.removeprefix("whsec_"))
    mac = hmac.new(key, signed, hashlib.sha256).digest()
    return "v1," + base64.b64encode(mac).decode()


class _Req:
    """The two things the handler actually reads off a request."""

    def __init__(self, body: bytes, headers=None):
        self._body = body
        self.headers = headers or {}

    async def body(self):
        return self._body


def _payload(event_type: str, email_id: str = "re_abc123") -> bytes:
    return json.dumps({"type": event_type, "data": {"email_id": email_id}}).encode()


def _call(monkeypatch, req, secret=None, capture=None):
    """Run the handler with the DB stubbed, returning whatever it returns.

    The DB is stubbed rather than mocked away entirely so the test still
    exercises the real SQL-building path; `capture` collects the arguments the
    handler would have written.
    """
    monkeypatch.setattr(M, "RESEND_WEBHOOK_SECRET", secret, raising=False)

    class _Conn:
        async def execute(self, sql, *args):
            if capture is not None:
                capture.append({"sql": sql, "args": args})
            return "UPDATE 1"

    class _Acq:
        async def __aenter__(self):
            return _Conn()

        async def __aexit__(self, *a):
            return False

    class _Pool:
        def acquire(self):
            return _Acq()

    async def _get_pool():
        return _Pool()

    import app.db as DB
    monkeypatch.setattr(DB, "get_pool", _get_pool, raising=False)

    # asyncio.run, NOT get_event_loop().run_until_complete: the latter passed
    # this file in isolation and failed 12 of 13 in the full suite, because by
    # then another module had already closed the loop it hands back. A test that
    # only passes when run alone is not a test.
    import asyncio
    return asyncio.run(M.resend_webhook(req))


# ── (premise) the map is real and covers what Resend actually sends ─────────

def test_premise_the_status_map_is_exactly_this():
    # Without this, a test that "passes" on a typo'd event name proves nothing.
    #
    # Pinned whole, because writing it from memory got it wrong: the first
    # version of the test below assumed `email.opened` and `email.clicked` were
    # UNMAPPED and both are mapped. Two things worth knowing are visible here
    # and in no other single place:
    #
    #   * `email.sent` is "accepted", NOT delivered — which is the distinction
    #     the whole comms honesty story rests on.
    #   * `email.clicked` collapses into `email-opened`. A click is strictly
    #     stronger evidence than an open, so that loses information. It is not
    #     FALSE — anyone who clicked did open it — so it is recorded here rather
    #     than changed, and this test is where a future split would be noticed.
    assert M._RESEND_STATUS_MAP == {
        "email.sent": "email-accepted",
        "email.delivered": "email-delivered",
        "email.opened": "email-opened",
        "email.clicked": "email-opened",
        "email.bounced": "email-bounced",
        "email.complained": "email-complained",
        "email.delivery_delayed": "email-deferred",
    }


# ── the signature, which is the whole security surface ─────────────────────

def test_a_correctly_signed_delivered_event_is_accepted_and_written(monkeypatch):
    body = _payload("email.delivered")
    sig = _sign(body, "msg_1", "1700000000", SECRET)
    req = _Req(body, {"svix-id": "msg_1", "svix-timestamp": "1700000000", "svix-signature": sig})
    seen = []
    out = _call(monkeypatch, req, secret=SECRET, capture=seen)
    assert out == {"ok": True}
    assert len(seen) == 1, "a valid delivered event must reach the write"
    # The status it writes, and the id it keys on — both from the payload.
    assert seen[0]["args"][0] == "email-delivered"
    assert seen[0]["args"][1] == "re_abc123"
    assert seen[0]["args"][2] == "email.delivered"


def test_A_FORGED_SIGNATURE_IS_REJECTED_WITH_401(monkeypatch):
    # The attack this endpoint invites: anyone who can guess a resend_id could
    # otherwise mark their own message delivered. `delivered` is a claim the
    # product makes to a host about a real vendor — forging it is the one thing
    # that must not be possible once a secret is set.
    body = _payload("email.delivered")
    req = _Req(body, {"svix-id": "msg_1", "svix-timestamp": "1700000000",
                      "svix-signature": "v1,bm90LXRoZS1yaWdodC1zaWduYXR1cmU="})
    seen = []
    out = _call(monkeypatch, req, secret=SECRET, capture=seen)
    assert getattr(out, "status_code", None) == 401
    assert seen == [], "a rejected request must never reach the database"


def test_AN_OMITTED_SIGNATURE_HEADER_IS_ALSO_REJECTED(monkeypatch):
    # This is the exact shape of the Stripe bug found on 2026-08-07: leaving the
    # header OFF fell through to the unverified branch on a deployment where the
    # secret WAS set. Here the secret alone decides, so a missing header is just
    # a signature that does not match.
    body = _payload("email.delivered")
    req = _Req(body, {})
    seen = []
    out = _call(monkeypatch, req, secret=SECRET, capture=seen)
    assert getattr(out, "status_code", None) == 401
    assert seen == []


def test_the_signature_covers_the_BODY_not_just_the_headers(monkeypatch):
    # Sign one body, send another. If the body were outside the signed content,
    # an attacker could keep a captured signature and swap the payload — turning
    # a real "bounced" callback into a forged "delivered".
    signed_body = _payload("email.bounced")
    sig = _sign(signed_body, "msg_1", "1700000000", SECRET)
    tampered = _payload("email.delivered")
    req = _Req(tampered, {"svix-id": "msg_1", "svix-timestamp": "1700000000", "svix-signature": sig})
    seen = []
    out = _call(monkeypatch, req, secret=SECRET, capture=seen)
    assert getattr(out, "status_code", None) == 401
    assert seen == []


# ── what it must ignore without falling over ───────────────────────────────

@pytest.mark.parametrize("event_type", ["email.scheduled", "contact.created", "", "nonsense"])
def test_an_event_it_does_not_map_is_ignored_quietly(monkeypatch, event_type):
    # Resend sends more event types than this handler maps, and it must not
    # write a null status or raise on them. (These are genuinely unmapped —
    # `email.opened` and `email.clicked` ARE mapped, which this test asserted
    # the wrong way round on its first run.)
    body = _payload(event_type)
    sig = _sign(body, "m", "1", SECRET)
    req = _Req(body, {"svix-id": "m", "svix-timestamp": "1", "svix-signature": sig})
    seen = []
    assert _call(monkeypatch, req, secret=SECRET, capture=seen) == {"ok": True}
    assert seen == []


def test_a_mapped_event_with_no_email_id_writes_nothing(monkeypatch):
    # The row is found BY resend_id. Without one there is no row to key on, and
    # the update's WHERE clause would match nothing at best.
    body = json.dumps({"type": "email.delivered", "data": {}}).encode()
    sig = _sign(body, "m", "1", SECRET)
    req = _Req(body, {"svix-id": "m", "svix-timestamp": "1", "svix-signature": sig})
    seen = []
    assert _call(monkeypatch, req, secret=SECRET, capture=seen) == {"ok": True}
    assert seen == []


def test_a_body_that_is_not_json_does_not_raise(monkeypatch):
    body = b"<html>not json</html>"
    sig = _sign(body, "m", "1", SECRET)
    req = _Req(body, {"svix-id": "m", "svix-timestamp": "1", "svix-signature": sig})
    assert _call(monkeypatch, req, secret=SECRET) == {"ok": True}


def test_it_also_accepts_the_id_field_resend_sends_on_some_events(monkeypatch):
    # The handler reads `email_id` OR `id`. Both appear in Resend's payloads
    # depending on the event, and getting this wrong silently drops updates.
    body = json.dumps({"type": "email.bounced", "data": {"id": "re_xyz"}}).encode()
    sig = _sign(body, "m", "1", SECRET)
    req = _Req(body, {"svix-id": "m", "svix-timestamp": "1", "svix-signature": sig})
    seen = []
    _call(monkeypatch, req, secret=SECRET, capture=seen)
    assert len(seen) == 1
    assert seen[0]["args"][0] == "email-bounced"
    assert seen[0]["args"][1] == "re_xyz"


# ── the documented dev-mode gap, pinned so nobody assumes it away ───────────

def test_WITHOUT_A_SECRET_ANY_CALLER_CAN_WRITE_DELIVERED(monkeypatch):
    # This is NOT an endorsement — it is the gap, recorded. With no
    # RESEND_WEBHOOK_SECRET the handler accepts an unsigned request and writes
    # the status, which means anyone who learns a resend_id can mark a message
    # delivered. The handler logs a warning when it takes this path.
    #
    # It is here so that "is production protected?" has a test-shaped answer
    # rather than a belief: the secret must be set on the deployment, and
    # `scripts/validate-production-config.mjs` is where that is enforced.
    body = _payload("email.delivered")
    req = _Req(body, {})            # no signature headers at all
    seen = []
    out = _call(monkeypatch, req, secret=None, capture=seen)
    assert out == {"ok": True}
    assert len(seen) == 1, "documented dev-mode behaviour — accepted unsigned"
    assert seen[0]["args"][0] == "email-delivered"
