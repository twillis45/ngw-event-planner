"""A BLS daily-quota refusal must not be retried every five minutes.

FOUND LIVE, 2026-09-24, from a machine with no BLS_API_KEY:

    REQUEST_NOT_PROCESSED: "the daily threshold for total number of requests
    allocated to the user with registration key  has been reached"

Every failure was cached for `_FAIL_TTL` (5 minutes), which is correct for an
outage and self-defeating for a quota. Unregistered BLS allows roughly 10
queries a day; a 5-minute retry is up to 288 attempts per region per day, about
1,150 in total against that budget. The failure cache was too short for the
daily quota to ever reset, so the outage sustained itself.

WHAT THIS DOES NOT CLAIM. Backing off does not buy quota. The real fix is a free
BLS_API_KEY (500 queries/day), which also clears the other measured problem: a
6h success TTL permits 4 regions x 4 = 16 fetches a day, already over the
unregistered limit before a single failure.
"""
import datetime
import time

from app.routers.food_prices import _FAIL_TTL, _fail_ttl_for

NOON_UTC = datetime.datetime(2026, 9, 24, 12, 0, tzinfo=datetime.timezone.utc).timestamp()


def test_an_ordinary_outage_keeps_the_short_retry():
    # The behaviour that was already right: a timeout or a 5xx ends, and nobody
    # wants a stale "unavailable" for the rest of the month.
    assert _fail_ttl_for(TimeoutError("read timeout"), NOON_UTC) == _FAIL_TTL
    assert _fail_ttl_for(RuntimeError("BLS status REQUEST_FAILED"), NOON_UTC) == _FAIL_TTL
    assert _fail_ttl_for(RuntimeError("insufficient BLS coverage for south"), NOON_UTC) == _FAIL_TTL


def test_A_QUOTA_REFUSAL_BACKS_OFF_TO_THE_NEXT_UTC_DAY():
    # The real message, as BLS actually returned it.
    err = RuntimeError(
        "BLS status REQUEST_NOT_PROCESSED: ['Request could not be serviced, as the "
        "daily threshold for total number of requests allocated to the user with "
        "registration key  has been reached.']")
    ttl = _fail_ttl_for(err, NOON_UTC)
    # Noon UTC -> midnight is 12h, plus a minute of slack.
    assert ttl == 12 * 3600 + 60
    # And it must be far longer than the outage retry, which is the whole point.
    assert ttl > _FAIL_TTL * 100


def test_it_never_returns_less_than_the_outage_ttl():
    # A second before midnight the remaining day is ~0. Backing off for one
    # second would be worse than the 5-minute retry it replaced.
    almost_midnight = datetime.datetime(
        2026, 9, 24, 23, 59, 59, tzinfo=datetime.timezone.utc).timestamp()
    err = RuntimeError("daily threshold ... has been reached")
    assert _fail_ttl_for(err, almost_midnight) >= _FAIL_TTL


def test_the_match_is_on_the_message_not_the_status_code():
    # REQUEST_NOT_PROCESSED covers several BLS conditions, only one of which is
    # the daily quota. Matching the status alone would back a recoverable
    # failure off for a whole day.
    other = RuntimeError("BLS status REQUEST_NOT_PROCESSED: ['No Data Available']")
    assert _fail_ttl_for(other, NOON_UTC) == _FAIL_TTL


def test_backoff_is_measured_from_the_time_passed_in():
    # `now` is injected rather than read, so the branch is testable at all and
    # two callers a second apart cannot disagree about which day it is.
    a = _fail_ttl_for(RuntimeError("daily threshold"), NOON_UTC)
    b = _fail_ttl_for(RuntimeError("daily threshold"), NOON_UTC + 3600)
    assert a - b == 3600
    assert isinstance(_fail_ttl_for(RuntimeError("daily threshold"), time.time()), int)
