# THE DINNER INSIDE THE TRIP REACHES THE INVITE (owner decision 11/21/2026)
#
# The invite shows the celebration dinner on its picked night and the group
# meals out, by day. The projection carries the night, the kind of place, the
# meals' starting point and the per-meal picks — and nothing else: who pays for
# meals out is the host's business and never leaves.
import asyncio

from app.routers import rsvp as R

CODE = "c" * 22


def _public(data):
    class Conn:
        async def fetchrow(self, sql, *a):
            return {"id": "ev-1", "data": data}
    return asyncio.run(R._resolve_event(Conn(), CODE))[1]


def test_the_dinner_night_and_place_reach_the_invite():
    pub = _public({"name": "Mom's 80th", "celebration": {"night": "2027-06-15", "place": "adobe courtyard", "x": "host-only"}})
    assert pub["celebration"] == {"night": "2027-06-15", "place": "adobe courtyard"}


def test_the_meals_reach_the_invite_but_not_who_pays():
    pub = _public({"name": "n", "tripMeals": {"plan": "dinners", "payer": "host",
                                              "meals": {"2027-06-16:lunch": "out", "junk": "out", "2027-06-16:dinner": "steak"}}})
    assert pub["tripMeals"] == {"plan": "dinners", "meals": {"2027-06-16:lunch": "out"}}


def test_nothing_set_means_nothing_sent():
    pub = _public({"name": "n"})
    assert "celebration" not in pub and "tripMeals" not in pub
    assert "tripMeals" not in _public({"name": "n", "tripMeals": {"payer": "each"}})
