"""ON THE EVENT DAY, NO HOURLY LIMIT (owner, 11/27/2026: "Yes, drop the hourly
limit on event day"). Off the day, one alert per event per hour, as before.
On the day, replies can still come in a burst, so they are held to one every
15 minutes. "The day" is the host's own: her phone's time zone, saved with
the device; a trip's day is any day from `date` to `endDate`."""
import asyncio
from datetime import datetime, timezone

import pytest

from app import host_alerts as ha
from app.routers import push as push_router


def at(iso):
    return datetime.fromisoformat(iso).astimezone(timezone.utc)


# ── whose day ──────────────────────────────────────────────────────────────

def test_the_day_is_the_hosts_own_zone():
    # 2026-12-17 01:30 UTC is still Dec 16 in New York, and Dec 17 in Berlin.
    now = at("2026-12-17T01:30:00+00:00")
    assert ha.event_day("2026-12-17", None, "America/New_York", now) is False
    assert ha.event_day("2026-12-17", None, "Europe/Berlin", now) is True


def test_a_trip_is_the_event_day_on_every_day_of_it():
    now = at("2026-06-19T15:00:00-06:00")
    assert ha.event_day("2027-06-17", "2027-06-21", "America/Denver", at("2027-06-19T12:00:00-06:00")) is True
    assert ha.event_day("2027-06-17", "2027-06-21", "America/Denver", at("2027-06-22T12:00:00-06:00")) is False
    assert ha.event_day("2027-06-17", None, "America/Denver", now) is False


def test_no_zone_known_falls_back_to_eastern_and_a_bad_date_is_no_day():
    now = at("2026-12-17T15:00:00+00:00")
    assert ha.event_day("2026-12-17", None, None, now) is True
    assert ha.event_day("2026-12-17", None, "Not/AZone", now) is True
    assert ha.event_day("", None, "America/New_York", now) is False
    assert ha.event_day("someday", None, "America/New_York", now) is False


# ── the window ─────────────────────────────────────────────────────────────

def test_off_the_day_one_an_hour_on_the_day_one_per_quarter_hour():
    ha._last_sent.clear()
    assert ha._claim("ev", now=0) is True
    assert ha._claim("ev", now=1000) is False                      # off the day: within the hour
    assert ha._claim("ev", now=1000, window=ha.DAY_WINDOW_SECONDS) is True   # on the day: 15 min passed
    assert ha._claim("ev", now=1500, window=ha.DAY_WINDOW_SECONDS) is False
    assert ha.DAY_WINDOW_SECONDS == 900 and ha.WINDOW_SECONDS == 3600


# ── the zone comes from her phone ──────────────────────────────────────────

def test_subscribe_keeps_a_real_zone_and_drops_anything_else():
    assert push_router.clean_tz("America/Chicago") == "America/Chicago"
    assert push_router.clean_tz("Europe/Lisbon") == "Europe/Lisbon"
    assert push_router.clean_tz("Not/AZone") is None
    assert push_router.clean_tz("") is None
    assert push_router.clean_tz(None) is None
    assert push_router.clean_tz("x" * 200) is None


# ── the route keeps her zone beside the device ─────────────────────────────

from tests.test_device_notifications import _RouteConn, _client, SUB, AUTH, HOST_ID, FCM, vapid  # noqa: E402,F401


def test_subscribe_saves_her_phones_zone_beside_the_device(monkeypatch, vapid):
    conn = _RouteConn()
    c = _client(monkeypatch, conn)
    assert c.post("/api/push/subscribe", json={**SUB, "tz": "America/Chicago"}, headers=AUTH).status_code == 200
    (q1, _a1), (q2, a2) = conn.calls
    assert q1 == push_router.SUBSCRIBE_SQL
    assert q2 == push_router.TZ_SQL and a2 == (HOST_ID, FCM, "America/Chicago")


def test_a_zone_that_is_not_real_is_never_written(monkeypatch, vapid):
    conn = _RouteConn()
    c = _client(monkeypatch, conn)
    assert c.post("/api/push/subscribe", json={**SUB, "tz": "Mars/Olympus"}, headers=AUTH).status_code == 200
    assert len(conn.calls) == 1


def test_before_035_the_zone_is_skipped_and_the_device_still_turns_on(monkeypatch, vapid):
    class Before035(_RouteConn):
        async def execute(self, q, *a):
            if "set tz" in q:
                raise RuntimeError('column "tz" of relation "push_subscriptions" does not exist')
            return await super().execute(q, *a)
    c = _client(monkeypatch, Before035())
    assert c.post("/api/push/subscribe", json={**SUB, "tz": "America/Chicago"}, headers=AUTH).status_code == 200


# ── alert_host uses the day's window ───────────────────────────────────────

from tests.test_device_notifications import _Conn, _Pool, ROW  # noqa: E402


def _send_twice(monkeypatch, row, tz, gap_seconds, now_iso):
    sent = []
    async def fake_push(user_id, payload, transport=None):
        sent.append(payload); return {"sent": 1, "gone": 0, "failed": 0}
    class C(_Conn):
        async def fetchval(self, q, *a):
            if "push_subscriptions" in q:
                return tz
            return await super().fetchval(q, *a)
    async def gp(): return _Pool(C(row))
    monkeypatch.setattr(ha, "get_pool", gp)
    monkeypatch.setattr(ha, "is_email_configured", lambda: False)
    monkeypatch.setattr(ha.web_push, "is_configured", lambda: True)
    monkeypatch.setattr(ha.web_push, "send_to_user", fake_push)
    monkeypatch.setattr(ha, "_now_utc", lambda: at(now_iso))
    ha._last_sent.clear()
    clock = iter([1000.0, 1000.0 + gap_seconds])
    monkeypatch.setattr(ha, "_mono", lambda: next(clock))
    asyncio.run(ha.alert_host("ev1", "rsvp", "Dana", "No"))
    asyncio.run(ha.alert_host("ev1", "rsvp", "Lee", "Yes"))
    return sent


def test_on_the_event_day_two_replies_twenty_minutes_apart_both_alert(monkeypatch):
    row = dict(ROW, date="2026-12-17", end_date=None)
    sent = _send_twice(monkeypatch, row, "America/Chicago", 20 * 60, "2026-12-17T10:00:00-06:00")
    assert [p["title"] for p in sent] == ["Dana replied No", "Lee replied Yes"]


def test_off_the_event_day_the_hour_still_holds(monkeypatch):
    row = dict(ROW, date="2026-12-17", end_date=None)
    sent = _send_twice(monkeypatch, row, "America/Chicago", 20 * 60, "2026-12-10T10:00:00-06:00")
    assert [p["title"] for p in sent] == ["Dana replied No"]


def test_on_the_day_a_burst_inside_fifteen_minutes_is_one_alert(monkeypatch):
    row = dict(ROW, date="2026-12-17", end_date=None)
    sent = _send_twice(monkeypatch, row, "America/Chicago", 5 * 60, "2026-12-17T10:00:00-06:00")
    assert len(sent) == 1
