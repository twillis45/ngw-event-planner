# ── _to_daily IS THE ONLY REAL LOGIC IN weather.py, AND IT WAS UNTESTED ──────
#
# OpenWeather 2.5 returns a flat list of 3-hour slices. `_to_daily` collapses
# that into One-Call-shaped days, and in doing so makes three judgement calls
# the host actually sees on a rain plan: which condition represents the day,
# what "chance of rain" means across eight slices, and what the day's range is.
#
# The severity pick is the one that matters. A day with a thunderstorm at 3pm
# and sun the rest of the time is a thunderstorm day for an outdoor event; a
# first/last/most-common pick would call it Clear.
from datetime import datetime, timezone

from app.routers.weather import _SEVERITY, _to_daily


def slice_(day, hour, main, temp=70, temp_min=None, temp_max=None, pop=0.0, desc="", icon=""):
    dt = int(datetime(2026, 8, day, hour, tzinfo=timezone.utc).timestamp())
    m = {"temp": temp}
    if temp_min is not None:
        m["temp_min"] = temp_min
    if temp_max is not None:
        m["temp_max"] = temp_max
    return {"dt": dt, "main": m, "pop": pop,
            "weather": [{"main": main, "description": desc, "icon": icon}]}


def test_the_worst_condition_represents_the_day():
    # The whole point for an outdoor event: one bad window makes the day bad.
    day = _to_daily([
        slice_(7, 9, "Clear"), slice_(7, 12, "Clouds"),
        slice_(7, 15, "Thunderstorm", desc="heavy storm", icon="11d"),
        slice_(7, 18, "Clear"),
    ])
    assert len(day) == 1
    assert day[0]["weather"][0]["main"] == "Thunderstorm"
    assert day[0]["weather"][0]["description"] == "heavy storm"
    assert day[0]["weather"][0]["icon"] == "11d"


def test_severity_order_is_the_one_an_outdoor_host_would_choose():
    # A tornado outranks a thunderstorm outranks snow outranks rain, and Clear
    # is the floor. If this ranking is ever edited, it should be on purpose.
    assert (_SEVERITY["Tornado"] > _SEVERITY["Thunderstorm"] > _SEVERITY["Snow"]
            > _SEVERITY["Rain"] > _SEVERITY["Drizzle"] > _SEVERITY["Clouds"]
            > _SEVERITY["Clear"] == 0)


def test_an_unknown_condition_never_outranks_a_known_bad_one():
    # _SEVERITY.get(..., 0) means an unrecognised string scores 0 — it must not
    # be able to mask a storm.
    day = _to_daily([slice_(7, 9, "Ash"), slice_(7, 15, "Rain")])
    assert day[0]["weather"][0]["main"] == "Rain"


def test_chance_of_rain_is_the_days_worst_slice_not_an_average():
    # A 20% morning and an 80% afternoon is an 80% day to plan against.
    day = _to_daily([slice_(7, 9, "Clear", pop=0.2), slice_(7, 15, "Rain", pop=0.8)])
    assert day[0]["pop"] == 0.8


def test_a_null_pop_is_treated_as_zero_not_a_crash():
    day = _to_daily([{"dt": int(datetime(2026, 8, 7, 9, tzinfo=timezone.utc).timestamp()),
                      "main": {"temp": 70}, "pop": None, "weather": [{"main": "Clear"}]}])
    assert day[0]["pop"] == 0


def test_the_range_spans_every_slice_and_is_rounded():
    day = _to_daily([
        slice_(7, 9, "Clear", temp_min=58.4, temp_max=61.6),
        slice_(7, 15, "Clear", temp_min=74.2, temp_max=88.7),
    ])
    assert day[0]["temp"] == {"min": 58, "max": 89}


def test_a_slice_with_no_min_or_max_falls_back_to_its_temp():
    day = _to_daily([slice_(7, 9, "Clear", temp=65)])
    assert day[0]["temp"] == {"min": 65, "max": 65}


def test_slices_are_grouped_by_utc_day_and_returned_in_order():
    day = _to_daily([slice_(9, 9, "Clear"), slice_(7, 9, "Clear"), slice_(8, 9, "Clear")])
    stamps = [d["dt"] for d in day]
    assert len(day) == 3
    assert stamps == sorted(stamps), "days must come back chronologically"


def test_each_day_is_stamped_at_noon_utc():
    # Not the first slice's time — a day object that claimed 09:00 would read as
    # a morning forecast.
    day = _to_daily([slice_(7, 3, "Clear"), slice_(7, 21, "Clear")])
    assert datetime.fromtimestamp(day[0]["dt"], tz=timezone.utc).hour == 12


def test_no_entries_yields_no_days():
    assert _to_daily([]) == []
