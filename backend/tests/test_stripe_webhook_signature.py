# ── OMITTING A HEADER SKIPPED STRIPE SIGNATURE VERIFICATION ─────────────────
#
# Found 2026-08-07 auditing untested routers. The webhook handler read:
#
#     if STRIPE_WEBHOOK_SECRET and stripe_signature:
#         ... construct_event (verified) ...
#     else:
#         # Dev mode — no signature verification
#         data = json.loads(payload)
#
# Both halves of that `and` were effectively attacker-controlled. A caller who
# simply left the `stripe-signature` header OFF fell into the unverified branch
# — on a deployment where the secret WAS configured. Forging a
# `checkout.session.completed` was a request with a missing header.
#
# The blast radius today is a false payment line in the logs, because the
# handler only logs. But its own docstring names it the hook point for Supabase
# writes when feeSchedule moves server-side, and at that point the same forged
# request marks a fee paid.
#
# Rule now: secret configured => signature REQUIRED. The unverified path
# survives only where no secret exists at all (a real local dev box) and logs a
# warning when it is taken.
import asyncio
import json

import pytest

from app.routers import stripe_payments as SP


class FakeRequest:
    def __init__(self, body: bytes):
        self._body = body

    async def body(self):
        return self._body


EVENT = json.dumps({
    "type": "checkout.session.completed",
    "data": {"object": {"id": "cs_forged", "amount_total": 500000,
                        "metadata": {"fee_id": "fee-1"}}},
}).encode()


def call(**kw):
    return asyncio.run(SP.stripe_webhook(FakeRequest(EVENT), **kw))


@pytest.fixture
def configured(monkeypatch):
    """A deployment that HAS both secrets — the case the bug applied to."""
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(SP, "STRIPE_WEBHOOK_SECRET", "whsec_x")


def test_a_missing_signature_is_rejected_when_a_secret_is_configured(configured):
    # THE BUG. This request previously returned {"ok": True} having accepted a
    # forged completed-payment event.
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as ei:
        call(stripe_signature=None)
    assert ei.value.status_code == 400
    assert "signature" in str(ei.value.detail).lower()


def test_an_empty_signature_is_also_rejected(configured):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as ei:
        call(stripe_signature="")
    assert ei.value.status_code == 400


def test_a_bad_signature_is_rejected(configured, monkeypatch):
    from fastapi import HTTPException
    import stripe

    def boom(*a, **k):
        raise stripe.error.SignatureVerificationError("bad sig", "sig-header")
    monkeypatch.setattr(stripe.Webhook, "construct_event", boom)
    with pytest.raises(HTTPException) as ei:
        call(stripe_signature="t=1,v1=deadbeef")
    assert ei.value.status_code == 400


def test_a_correctly_signed_event_is_processed(configured, monkeypatch):
    import stripe

    class Obj(dict):
        __getattr__ = dict.get

    verified = Obj(type="checkout.session.completed",
                   data=Obj(object={"id": "cs_real", "amount_total": 1000,
                                    "metadata": {"fee_id": "fee-9"}}))
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, **k: verified)
    assert call(stripe_signature="t=1,v1=good") == {"ok": True}


def test_the_unverified_path_survives_only_with_no_secret_at_all(monkeypatch, caplog):
    # A genuine local dev box still works — the fix must not make Stripe
    # undevelopable — but it says so, loudly, every time.
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(SP, "STRIPE_WEBHOOK_SECRET", "")
    with caplog.at_level("WARNING"):
        assert call(stripe_signature=None) == {"ok": True}
    assert any("UNVERIFIED" in r.message or "UNVERIFIED" in str(r.msg) for r in caplog.records), \
        "the unverified path must announce itself"


def test_an_unconfigured_server_still_no_ops(monkeypatch):
    # No Stripe at all: the endpoint should be inert, not an error surface.
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "")
    monkeypatch.setattr(SP, "STRIPE_WEBHOOK_SECRET", "")
    assert call(stripe_signature=None) == {"ok": True}


def test_the_two_conditions_are_no_longer_a_single_and(monkeypatch):
    # The precise regression guard. The defect was the SHAPE of the test:
    # `if SECRET and signature:` lets a missing header choose the else branch.
    # If that shape returns, this fails even if the tests above are adjusted.
    import inspect
    import re
    # CODE ONLY. The fix's own comment quotes the old condition verbatim to
    # explain it, so a raw substring search matches the explanation and fails on
    # correct code — the same trap as quoting a comment terminator inside a
    # comment. Strip comment lines first.
    src = inspect.getsource(SP.stripe_webhook)
    code = "\n".join(l for l in src.split("\n") if not l.strip().startswith("#"))
    assert not re.search(r"if\s+STRIPE_WEBHOOK_SECRET\s+and\s+stripe_signature", code)
    assert re.search(r"if\s+STRIPE_WEBHOOK_SECRET\s*:", code)
    # and the missing-header case must be its own explicit refusal
    assert re.search(r"if\s+not\s+stripe_signature", code)
