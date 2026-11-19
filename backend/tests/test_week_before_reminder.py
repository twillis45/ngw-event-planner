"""G87: the week-before reminder to a host, and the promotion gate.

app/host_reminders.py. A fake connection stands in for Postgres: it holds the
events (each with its studio owner's address), email_stops (031) and
host_reminders_sent (032), and answers only the statements the module sends.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import asyncio
import datetime as dt
import json
import logging

import pytest

import app.host_email as he
import app.host_reminders as hr
from app.emailer import ResendRejected

TODAY = dt.date(2026, 11, 19)
IN7 = "2026-11-26"
OPTED = {"marketing_opt_in": {"at": "2026-11-19T15:00:00Z"}}


class Conn:
    def __init__(self, events, has_031=True, has_032=True):
        self.events = events            # id -> (data dict, host email or None)
        self.stops = {}
        self.sent = set()
        self.has_031, self.has_032 = has_031, has_032

    async def fetchval(self, q, *a):
        if "to_regclass('public.host_reminders_sent')" in q:
            return "host_reminders_sent" if self.has_032 else None
        if "to_regclass('public.email_stops')" in q:
            return "email_stops" if self.has_031 else None
        if "insert into public.host_reminders_sent" in q:
            if (a[0], a[1]) in self.sent:
                return None
            self.sent.add((a[0], a[1]))
            return a[0]
        raise AssertionError(q)

    async def fetch(self, q, *a):
        assert "from public.events" in q and "host_reminders_sent" in q
        out = []
        for eid, (data, email) in sorted(self.events.items()):
            if email is None or str(data.get("date") or "")[:10] != a[0] or (eid, a[1]) in self.sent:
                continue
            out.append({"id": eid, "data": json.dumps(data), "email": email})   # jsonb arrives as text
        return out

    async def fetchrow(self, q, *a):
        if "from public.email_stops where event_id" in q:
            return self.stops.get((a[0], a[1]))
        if "insert into public.email_stops" in q:
            self.stops.setdefault((a[0], a[1]), {"token": a[2], "stopped_at": None})
            return self.stops[(a[0], a[1])]
        raise AssertionError(q)

    async def execute(self, q, *a):
        if "delete from public.host_reminders_sent" in q:
            self.sent.discard((a[0], a[1]))
            return "DELETE 1"
        raise AssertionError(q)


class Outbox:
    def __init__(self, fail_for=(), exc=RuntimeError):
        self.mail, self.fail_for, self.exc = [], set(fail_for), exc

    async def __call__(self, to, subject, html, text=None, headers=None):
        if to in self.fail_for:
            raise self.exc(422, "refused") if self.exc is ResendRejected else self.exc("boom")
        self.mail.append(dict(to=to, subject=subject, html=html, text=text, headers=headers))
        return {"id": "re_x"}


def plan(name="Ana's 40th", date=IN7, **kw):
    return {"name": name, "date": date, "guestEstimate": 30, **kw}


def run(conn, out, cap=hr.MAX_PER_RUN):
    return asyncio.run(hr.send_week_before(conn, today=TODAY, cap=cap, send=out))


def test_only_qualified_events_exactly_seven_days_out_with_a_host_email():
    conn = Conn({
        "e1": (plan(), "a@x.test"),
        "e2": (plan(date="2026-11-25"), "b@x.test"),                      # 6 days
        "e3": (plan(date="2026-11-27"), "c@x.test"),                      # 8 days
        "e4": ({"name": "No count", "date": IN7}, "d@x.test"),            # not a plan
        "e5": ({"name": "Zero", "date": IN7, "guestCount": 0, "guests": []}, "e@x.test"),
        "e6": (plan(), None),                                             # no host address
        "e7": ({"name": "Roster", "date": IN7 + "T18:00", "guests": [{}, {}]}, "g@x.test"),
        "e8": ({"name": "Locked", "date": IN7, "guestCount": "12"}, "h@x.test"),
    })
    out = Outbox()
    counts = run(conn, out)
    assert sorted(m["to"] for m in out.mail) == ["a@x.test", "g@x.test", "h@x.test"]
    assert counts["sent"] == 3 and counts["not_a_plan"] == 2


def test_qualified_mirrors_the_apps_rule():
    assert hr.qualified("e", {"date": "2026-11-26", "guestEstimate": 40})
    assert hr.qualified("e", {"date": "2026-11-26", "guests": [{"name": "x"}]})
    assert not hr.qualified("", {"date": "2026-11-26", "guestEstimate": 40})       # no id
    assert not hr.qualified("e", {"date": "  ", "guestEstimate": 40})              # no date
    assert not hr.qualified("e", {"date": "2026-11-26", "guestEstimate": "abc"})
    assert not hr.qualified("e", {"date": "2026-11-26", "guestCount": -5})
    assert not hr.qualified("e", {"date": "2026-11-26", "guestCount": ""})


def test_today_is_the_us_eastern_date():
    # 03:00 UTC on Nov 20 is still Nov 19 in New York.
    assert hr.today_eastern(dt.datetime(2026, 11, 20, 3, 0, tzinfo=dt.timezone.utc)) == dt.date(2026, 11, 19)
    assert hr.today_eastern(dt.datetime(2026, 11, 20, 6, 0, tzinfo=dt.timezone.utc)) == dt.date(2026, 11, 20)


def test_a_host_who_stopped_reminders_gets_none():
    conn = Conn({"e1": (plan(), "a@x.test"), "e2": (plan(), "b@x.test")})
    conn.stops[("account/reminders", "a@x.test")] = {"token": "t-a", "stopped_at": "2026-11-01"}
    out = Outbox()
    counts = run(conn, out)
    assert [m["to"] for m in out.mail] == ["b@x.test"]
    assert counts["stopped"] == 1
    assert ("e1", hr.KIND) not in conn.sent                     # a stop is not a send


def test_never_twice_even_after_a_restart():
    conn = Conn({"e1": (plan(), "a@x.test")})
    out = Outbox()
    run(conn, out)
    hr_reloaded = __import__("importlib").reload(hr)            # the process "restarts": no memory survives
    asyncio.run(hr_reloaded.send_week_before(conn, today=TODAY, send=out))
    assert len(out.mail) == 1
    assert conn.sent == {("e1", "week_before")}


def test_the_record_is_checked_at_send_time_too():
    # A second process that read the list before the first recorded the send
    # still cannot send: the claim is the insert, not the read.
    conn = Conn({"e1": (plan(), "a@x.test")})
    conn.sent.add(("e1", "week_before"))
    orig = conn.fetch

    async def stale_fetch(q, *a):                                # ignores the record, like a racing reader
        saved, conn.sent = conn.sent, set()
        try:
            return await orig(q, *a)
        finally:
            conn.sent = saved
    conn.fetch = stale_fetch
    out = Outbox()
    counts = run(conn, out)
    assert out.mail == [] and counts["already"] == 1


def test_nothing_is_sent_without_032(caplog):
    conn = Conn({"e1": (plan(), "a@x.test")}, has_032=False)
    out = Outbox()
    with caplog.at_level(logging.ERROR, logger="ngw.host_reminders"):
        counts = run(conn, out)
    assert out.mail == [] and counts["blocked"] == "032_missing"
    assert "032" in caplog.text


def test_nothing_is_sent_without_031():
    conn = Conn({"e1": (plan(), "a@x.test")}, has_031=False)
    out = Outbox()
    assert run(conn, out)["blocked"] == "031_missing" and out.mail == []


def test_the_email_has_the_stop_link_the_headers_and_only_saved_facts(monkeypatch):
    monkeypatch.setattr(hr, "APP_BASE_URL", "https://app.example.test/ngw")
    conn = Conn({"e1": (plan(name="Ana's <40th>", venue="The Barn", startTime="18:00"), "a@x.test")})
    out = Outbox()
    run(conn, out)
    (m,) = out.mail
    token = conn.stops[("account/reminders", "a@x.test")]["token"]
    stop = he.stop_url(token)
    assert m["subject"] == "One week until Ana's <40th>"
    assert m["headers"] == he.headers(token)
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    for part in (m["html"], m["text"]):
        assert "Stop plan reminders" in part and "Open your plan" in part
        assert "Thursday, November 26" in part
        assert "https://app.example.test/ngw/hostv2/" in part
        assert "You're getting this because" in part
        # Nothing the email cannot back with saved data: no progress, no count,
        # no place or hour, no vendor.
        for invented in ("30", "guest", "step", "The Barn", "6:00", "18:00", "vendor", "%"):
            assert invented not in part.replace(stop, ""), invented
    assert stop in m["text"] and stop in m["html"]
    assert "&lt;40th&gt;" in m["html"] and "<40th>" not in m["html"]


def test_the_cap_holds_per_run():
    conn = Conn({f"e{i}": (plan(), f"h{i}@x.test") for i in range(5)})
    out = Outbox()
    counts = run(conn, out, cap=2)
    assert len(out.mail) == 2 and counts["over_cap"] == 3
    assert len(conn.sent) == 2                                   # the rest are not recorded as sent


def test_one_failure_does_not_stop_the_run(caplog):
    conn = Conn({"e1": (plan(), "a@x.test"), "e2": (plan(), "b@x.test"), "e3": (plan(), "c@x.test")})
    out = Outbox(fail_for={"b@x.test"})
    with caplog.at_level(logging.INFO, logger="ngw.host_reminders"):
        counts = run(conn, out)
    assert sorted(m["to"] for m in out.mail) == ["a@x.test", "c@x.test"]
    assert counts["failed"] == 1 and counts["sent"] == 2
    assert ("e2", "week_before") in conn.sent                    # it may have gone: never risk a second
    assert "@" not in caplog.text                                # counts only, never an address


def test_a_refused_send_is_not_recorded_as_sent():
    conn = Conn({"e1": (plan(), "a@x.test")})
    counts = run(conn, Outbox(fail_for={"a@x.test"}, exc=ResendRejected))
    assert counts["failed"] == 1 and conn.sent == set()


def test_no_email_configured_means_no_run(monkeypatch):
    monkeypatch.setattr(hr, "is_email_configured", lambda: False)

    async def no_pool():
        raise AssertionError("must not touch the database")
    assert asyncio.run(hr.run(no_pool)) == {"blocked": "email_not_configured"}


# ── promotions: the gate refuses ─────────────────────────────────────────────

ADDRESS = "No Guesswork Systems LLC, PO Box 1, Anytown, ST 00000"


def offer(conn, meta, email="a@x.test"):
    return asyncio.run(hr.prepare_offer(conn, email, meta))


def test_no_promotion_without_the_opt_in(monkeypatch):
    monkeypatch.setenv("NGW_MAILING_ADDRESS", ADDRESS)
    conn = Conn({})
    assert offer(conn, None) is None
    assert offer(conn, {"marketing_opt_in": {}}) is None
    assert offer(conn, {"marketing_opt_in": True}) is None
    assert conn.stops == {}                                      # refused before any token exists


def test_no_promotion_without_a_mailing_address(monkeypatch):
    monkeypatch.delenv("NGW_MAILING_ADDRESS", raising=False)
    assert offer(Conn({}), OPTED) is None


def test_no_promotion_to_a_host_who_stopped_them(monkeypatch):
    monkeypatch.setenv("NGW_MAILING_ADDRESS", ADDRESS)
    conn = Conn({})
    conn.stops[("account/promotions", "a@x.test")] = {"token": "t", "stopped_at": "2026-11-01"}
    assert offer(conn, OPTED) is None


def test_the_offer_is_a_labeled_placeholder_behind_the_gate(monkeypatch):
    monkeypatch.setenv("NGW_MAILING_ADDRESS", ADDRESS)
    conn = Conn({})
    subject, body, text, headers = offer(conn, OPTED)
    token = conn.stops[("account/promotions", "a@x.test")]["token"]
    assert "PLACEHOLDER" in subject and "not wired" in text
    assert headers == he.headers(token) and he.stop_url(token) in text
    assert "Stop offers and news" in body and ADDRESS in text
    with pytest.raises(ValueError):
        hr.compose_offer("")


def test_nothing_schedules_a_promotion():
    import pathlib
    root = pathlib.Path(__file__).resolve().parents[1]
    callers = [p.name for d in ("app", "scripts") for p in (root / d).rglob("*.py")
               if "compose_offer" in p.read_text() or "prepare_offer" in p.read_text()]
    assert callers == ["host_reminders.py"]                      # defined there, called nowhere
