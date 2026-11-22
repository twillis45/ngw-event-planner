"""THE GUEST'S INVITE IS THE ONE THE HOST PREVIEWED (audit 2, lane E P0-3).

The host's preview printed her deck line, "Hosted by Wanda Mundy" and the
street; the guest holding the real link got a stock line, the town and no
host, because the public payload left those fields out. The reply form asked
about kids and plus-ones the host had ruled out (adults only, no plus-ones),
the server took them, and the form never asked for the mailing address the
host collects.

Pinned here:
  1. The public invite carries hostName (hostNameFor's rule, `host`
     included), deckLine, the street and ZIP, and the three reply rules.
  2. The server ENFORCES the rules on submit: kids on an adults-only invite
     and a plus-one on a no-plus-ones invite are dropped with a notice, and a
     mailing address is kept only when the host asked for one.
DB-free, with a fake pool, like test_rsvp_date_picks.py. Fictional data only.
"""
import asyncio
import inspect
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

from app.routers import rsvp as R

from tests._wanda_sample import GUEST_NAMES, INVITE_CODE, PRIVATE_ADDRESS, wanda

NOW = datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc)
RULES = {"kidsPolicy": "adults_only", "plusOnePolicy": "no_plus_ones", "collectAddresses": True}


def _public(data):
    class Conn:
        async def fetchrow(self, sql, *a):
            return {"id": "ev-1", "data": data}
    return asyncio.run(R._resolve_event(Conn(), INVITE_CODE))[1]


def test_the_guest_gets_the_host_the_deck_line_and_the_street():
    ev = {**wanda(), "deckLine": "Thirty years of service, fifty years of Wanda",
          "secondaryType": "Birthday", "venueStreet": "1847 Freedom Way", "venueZip": "20772",
          "venueKind": "venue", **RULES}
    pub = _public(ev)
    # The sample spells the host line `host`; hostNameFor reads it, so must the invite.
    assert pub["hostName"] == "Wanda Mundy"
    assert pub["deckLine"] == "Thirty years of service, fifty years of Wanda"
    # The deck reader's second occasion (a retirement that is also her 50th).
    assert pub["secondaryType"] == "Birthday"
    assert pub["venueStreet"] == "1847 Freedom Way" and pub["venueZip"] == "20772"
    assert pub["venueKind"] == "venue"
    assert (pub["kidsPolicy"], pub["plusOnePolicy"], pub["collectAddresses"]) == ("adults_only", "no_plus_ones", True)
    # Still nothing private.
    blob = json.dumps(pub, ensure_ascii=False)
    for secret in PRIVATE_ADDRESS + GUEST_NAMES:
        assert secret not in blob, secret


def test_an_unknown_rule_value_is_not_shipped():
    pub = _public({**wanda(), "kidsPolicy": "only on Tuesdays", "plusOnePolicy": 3, "collectAddresses": "yes"})
    assert "kidsPolicy" not in pub and "plusOnePolicy" not in pub and "collectAddresses" not in pub


def test_an_event_with_no_host_line_ships_no_host():
    ev = wanda()
    ev.pop("host")
    assert "hostName" not in _public(ev)


class _Db:
    def __init__(self, data):
        self.data = data
        self.insert_args = None

    async def fetchrow(self, sql, *args):
        if "from public.events" in sql:
            return {"id": "ev-1", "data": {**self.data, "rsvpCode": INVITE_CODE}}
        if "count(*)" in sql:
            return {"n": 0, "is_resubmit": False}
        if "insert into public.rsvp_submissions" in sql:
            self.insert_args = args
            return {"submitted_at": NOW}
        raise AssertionError(sql)


def _submit(data, **reply):
    R._rate.clear()
    db = _Db(data)

    @asynccontextmanager
    async def acquire():
        yield db

    async def pool():
        return SimpleNamespace(acquire=acquire)

    orig = R.get_pool
    R.get_pool = pool
    try:
        payload = R.RsvpSubmit(idempotency_key="k-1", name="Ana Ruiz", rsvp="Yes", **reply)
        req = SimpleNamespace(headers={}, client=SimpleNamespace(host="10.0.0.7"))
        out = asyncio.run(R.public_rsvp(INVITE_CODE, payload, req, SimpleNamespace(add_task=lambda *a, **k: None)))
    finally:
        R.get_pool = orig
        R._rate.clear()
    src = inspect.getsource(R.public_rsvp)
    cols = src.split("insert into public.rsvp_submissions")[1].split("(", 1)[1].split(")", 1)[0]
    return out, dict(zip([c.strip() for c in cols.split(",")], db.insert_args))


def test_kids_on_an_adults_only_invite_are_dropped_with_a_notice():
    out, row = _submit({**wanda(), **RULES}, kids=2)
    assert row["kids"] == 0
    assert "kids" in out["dropped"] and "adults" in out["notice"].lower()


def test_a_plus_one_on_a_no_plus_ones_invite_is_dropped_with_a_notice():
    out, row = _submit({**wanda(), **RULES}, plus_one="Sam Roe", plus_one_meal="Beef", plus_one_needs="Vegan")
    assert (row["plus_one"], row["plus_one_meal"], row["plus_one_needs"]) == (None, None, None)
    assert "plus_one" in out["dropped"] and "plus-one" in out["notice"].lower()


def test_the_reply_is_kept_when_the_rules_allow_it():
    out, row = _submit({**wanda(), "kidsPolicy": "kids_welcome", "plusOnePolicy": "plus_one_ok"},
                       kids=2, plus_one="Sam Roe")
    assert row["kids"] == 2 and row["plus_one"] == "Sam Roe"
    assert "dropped" not in out and "notice" not in out


def test_a_mailing_address_is_kept_only_when_the_host_collects_them():
    _out, row = _submit({**wanda(), **RULES}, mailing_address="1 Sample Ln, Bowie, MD 20715")
    assert row["mailing_address"] == "1 Sample Ln, Bowie, MD 20715"
    _out, row = _submit(wanda(), mailing_address="1 Sample Ln, Bowie, MD 20715")
    assert row["mailing_address"] is None
