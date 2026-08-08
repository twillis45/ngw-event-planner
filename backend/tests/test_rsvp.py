# ── THE PUBLIC RSVP ROUTER HAD NO TESTS ─────────────────────────────────────
#
# `app/routers/rsvp.py` carries three endpoints, two of them PUBLIC and
# unauthenticated, and every security property it claims lived only in prose:
# the rightmost-hop IP rule, the entropy floor on rsvp_code, and the
# display-field whitelist that decides what a stranger holding an invite link
# can read. None of it was gated, so any of it could be quietly relaxed.
#
# These tests pin the invariants the docstrings already promise. They are
# deliberately DB-free: the DB-dependent paths are exercised through a fake
# connection so the suite stays runnable in CI without Postgres, matching how
# the rest of this directory works.
#
# Async style follows the rest of the suite (asyncio.run in a sync test) —
# pytest-asyncio is not configured here.
import asyncio
import time

import pytest
from pydantic import ValidationError

from app.routers import rsvp as R


# ── Fakes ───────────────────────────────────────────────────────────────────
class FakeRequest:
    """Only the two attributes _client_ip touches."""

    class _C:
        def __init__(self, host):
            self.host = host

    def __init__(self, headers=None, host="10.0.0.1"):
        self.headers = headers or {}
        self.client = self._C(host) if host else None


class FakeConn:
    """Returns a canned row for the one query _resolve_event issues."""

    def __init__(self, row):
        self._row = row
        self.calls = []

    async def fetchrow(self, sql, *args):
        self.calls.append((sql, args))
        return self._row


@pytest.fixture(autouse=True)
def _clear_rate_state():
    """The limiter is module-level process state; a leaked bucket from one test
    would silently 429 the next one and look like a real failure."""
    R._rate.clear()
    yield
    R._rate.clear()


# ── _client_ip: the rightmost hop, because the leftmost is attacker-supplied ──
def test_client_ip_takes_the_last_forwarded_hop_not_the_first():
    # The docstring's whole point: X-Forwarded-For is client-controllable at the
    # FRONT. Taking hops[0] would let one caller rotate a fake IP per request and
    # never hit the per-IP limit. The platform proxy appends the real one last.
    req = FakeRequest({"x-forwarded-for": "1.2.3.4, 5.6.7.8, 203.0.113.9"})
    assert R._client_ip(req) == "203.0.113.9"


def test_client_ip_ignores_blank_hops():
    req = FakeRequest({"x-forwarded-for": "1.2.3.4, , "})
    assert R._client_ip(req) == "1.2.3.4"


def test_client_ip_falls_back_to_the_socket_then_to_unknown():
    assert R._client_ip(FakeRequest({}, host="192.0.2.7")) == "192.0.2.7"
    assert R._client_ip(FakeRequest({}, host=None)) == "unknown"


# ── _rate_check ─────────────────────────────────────────────────────────────
def test_rate_check_allows_up_to_the_limit_then_refuses_with_a_retry_after():
    for i in range(3):
        ok, retry = R._rate_check("b", 3)
        assert ok, f"call {i} should be allowed"
        assert retry == 0
    ok, retry = R._rate_check("b", 3)
    assert ok is False
    # Retry-After must be a usable positive number of seconds, not 0.
    assert 0 < retry <= R.RSVP_RATE_WINDOW + 1


def test_rate_check_buckets_are_independent():
    for _ in range(3):
        R._rate_check("ip:a", 3)
    assert R._rate_check("ip:b", 3)[0] is True


def test_rate_check_forgets_hits_older_than_the_window():
    R._rate["old"] = [time.time() - (R.RSVP_RATE_WINDOW + 5)] * 50
    assert R._rate_check("old", 3)[0] is True


# ── _clip ───────────────────────────────────────────────────────────────────
def test_clip_strips_truncates_and_maps_empty_to_none():
    assert R._clip("  hi  ", 10) == "hi"
    assert R._clip("abcdef", 3) == "abc"
    assert R._clip(None, 10) is None
    # Whitespace-only must become None, not "" — an empty string would write a
    # blank cell where the host expects "not answered".
    assert R._clip("   ", 10) is None


# ── The entropy floor on rsvp_code ──────────────────────────────────────────
def test_resolve_event_rejects_a_short_code_without_touching_the_database():
    # A short/legacy/guessable code must never gate PII. It has to be refused
    # BEFORE the query, otherwise the DB is doing enumeration work for an
    # attacker even when the answer is "no".
    conn = FakeConn({"id": "ev-1", "data": {"rsvpCode": "short"}})
    short = "x" * (R.MIN_CODE_LEN - 1)
    assert asyncio.run(R._resolve_event(conn, short)) is None
    assert conn.calls == [], "no query may be issued for a sub-floor code"
    assert asyncio.run(R._resolve_event(conn, "")) is None
    assert asyncio.run(R._resolve_event(conn, None)) is None
    assert conn.calls == []


def test_resolve_event_queries_by_rsvp_code_never_by_event_id():
    code = "c" * R.MIN_CODE_LEN
    conn = FakeConn({"id": "ev-1", "data": {"name": "Party", "rsvpCode": code}})
    asyncio.run(R._resolve_event(conn, code))
    sql, args = conn.calls[0]
    assert "data->>'rsvpCode'" in sql
    assert args == (code,)
    # Matching on the id would turn the invite secret into a guessable slug.
    assert "where id" not in sql.lower().replace(" ", " ")


def test_resolve_event_returns_none_when_no_row_matches():
    assert asyncio.run(R._resolve_event(FakeConn(None), "c" * 20)) is None


# ── The public projection is a WHITELIST, and it leaks nothing ──────────────
def _resolved_public(data):
    code = "c" * R.MIN_CODE_LEN
    conn = FakeConn({"id": "ev-1", "data": data})
    out = asyncio.run(R._resolve_event(conn, code))
    assert out is not None
    return out[1]


def test_public_projection_drops_everything_not_whitelisted():
    public = _resolved_public({
        "name": "Ruth's 80th",
        "venue": "The Lodge",
        # None of the following may ever appear on a public response.
        "guests": [{"name": "Ann", "rsvp": "Yes", "email": "a@example.com"}],
        "budget": {"total": 5000},
        "vendors": [{"name": "Caterer"}],
        "notes": "host private",
        "ownerId": "user-1",
        "studioId": "studio-1",
        "hostEmail": "host@example.com",
        "hostPhone": "555-0100",
    })
    assert public["name"] == "Ruth's 80th"
    assert public["venue"] == "The Lodge"
    for leaked in ("guests", "budget", "vendors", "notes", "ownerId",
                   "studioId", "hostEmail", "hostPhone"):
        assert leaked not in public, f"{leaked} must never reach a public response"


def test_public_field_whitelist_contains_no_pii_or_ledger_keys():
    # A guard on the CONSTANT itself, so adding a forbidden key to the tuple
    # fails here even if no test happens to feed that key through.
    forbidden = {
        "guests", "rsvps", "budget", "vendors", "notes", "tasks", "documents",
        "ownerId", "owner_id", "studioId", "studio_id", "hostEmail", "hostPhone",
        "moneyDates", "frontedAmount", "data",
    }
    assert forbidden.isdisjoint(set(R.PUBLIC_EVENT_FIELDS))


def test_public_projection_omits_absent_fields_rather_than_nulling_them():
    public = _resolved_public({"name": "Only a name"})
    assert "venue" not in public and "dressCode" not in public


def test_public_projection_always_carries_the_event_id():
    assert _resolved_public({"name": "n"})["id"] == "ev-1"


def test_going_count_is_a_number_and_the_roster_stays_withheld():
    # Anonymized social proof: the COUNT is not PII, a name would be.
    public = _resolved_public({
        "name": "n",
        "guests": [
            {"name": "A", "rsvp": "Yes"},
            {"name": "B", "rsvp": "yes"},
            {"name": "C", "rsvp": "Y"},
            {"name": "D", "rsvp": "No"},
            {"name": "E", "rsvp": "Maybe"},
            {"name": "F"},
            "not-a-dict",
        ],
    })
    assert public["goingCount"] == 3
    assert "guests" not in public


def test_going_count_is_absent_when_there_is_no_guest_list():
    assert "goingCount" not in _resolved_public({"name": "n"})


def test_resolve_event_parses_a_json_string_data_column():
    # asyncpg may hand back JSONB as str depending on codec registration; a
    # silent {} here would blank every invite in production.
    code = "c" * R.MIN_CODE_LEN
    conn = FakeConn({"id": "ev-1", "data": '{"name": "From String", "venue": "V"}'})
    _id, public = asyncio.run(R._resolve_event(conn, code))
    assert public["name"] == "From String"
    assert public["venue"] == "V"


def test_resolve_event_survives_an_unparseable_data_column():
    code = "c" * R.MIN_CODE_LEN
    conn = FakeConn({"id": "ev-1", "data": "{not json"})
    _id, public = asyncio.run(R._resolve_event(conn, code))
    assert public == {"id": "ev-1"}


# ── RsvpSubmit validation: no blank rows on the host's roster ───────────────
def test_submit_rejects_a_whitespace_only_name():
    # min_length=1 alone would accept " ".
    with pytest.raises(ValidationError):
        R.RsvpSubmit(idempotency_key="k", name="   ", rsvp="Yes")


def test_submit_rejects_a_missing_or_invented_answer():
    with pytest.raises(ValidationError):
        R.RsvpSubmit(idempotency_key="k", name="Ann")
    with pytest.raises(ValidationError):
        R.RsvpSubmit(idempotency_key="k", name="Ann", rsvp="Probably")


def test_submit_rejects_an_empty_idempotency_key():
    with pytest.raises(ValidationError):
        R.RsvpSubmit(idempotency_key="", name="Ann", rsvp="Yes")


def test_submit_accepts_the_three_real_answers_and_defaults_kids_to_zero():
    for answer in ("Yes", "No", "Maybe"):
        m = R.RsvpSubmit(idempotency_key="k", name="Ann", rsvp=answer)
        assert m.rsvp == answer
        assert m.kids == 0


def test_submit_keeps_the_structured_guest_details_the_form_sends():
    # These were silently DROPPED before the 2026-07-27 fix — a remote guest's
    # allergy answer never reached the host. Pin them so it cannot regress.
    m = R.RsvpSubmit(
        idempotency_key="k", name="Ann", rsvp="Yes",
        allergens=["peanuts"], diets=["vegan"], access=["step-free"],
        picks_crabs=True, phone="555", email="a@b.co",
        mailing_address="1 Main St", lodging_pick="opt-3",
    )
    assert m.allergens == ["peanuts"]
    assert m.diets == ["vegan"]
    assert m.access == ["step-free"]
    assert m.picks_crabs is True
    assert m.lodging_pick == "opt-3"
