"""THE FAMILY LINK KEEPS ITS OWN PROMISE (audit lane E, P0-2 and P1-3).

The family page's footer says "Guest names, contact details and money aren't
shared here". On the Wanda sample it printed "$5,000", "rooms at 4604 for
Marcus's family + Mom" and "Marcus (brother)", because the projection copied
the host's checklist and run-of-show text word for word. It also listed a
friend helping on the day as a booked vendor.

These pin the promise on the fictional Wanda sample: no money, no guest name
but the honoree's, no private house address, no helper among the hires — and
the plan is still there to read.
"""
import json

import app.routers.family_view as fv

from tests._wanda_sample import GUEST_NAMES, PRIVATE_ADDRESS, wanda


def _text(plan):
    return json.dumps([r["label"] for r in plan.get("ros", [])]
                      + [t["task"] for t in plan.get("checklist", [])], ensure_ascii=False)


def test_the_wanda_family_page_shows_no_money_names_or_private_address():
    plan = fv.family_projection(wanda())
    blob = json.dumps(plan, ensure_ascii=False)
    for secret in ("$", "5,000", "budget", "Budget", "Denver") + PRIVATE_ADDRESS:
        assert secret not in blob, secret
    words = _text(plan)
    for name in GUEST_NAMES:
        assert name not in words, name
    # The honoree is who the party is for; her name is the plan.
    assert "Wanda" in words


def test_the_plan_survives_the_scrub():
    """A line loses only its private part: the presentation is still on the
    schedule, catering is still on the checklist."""
    plan = fv.family_projection(wanda())
    labels = [r["label"] for r in plan["ros"]]
    tasks = [t["task"] for t in plan["checklist"]]
    assert "Army retirement presentation" in labels
    assert "Wanda arrives in Army ceremonial dress" in labels
    assert "Lock catering" in tasks
    assert "Book photobooth + night-of photographer" in tasks
    assert any(t.startswith("Final headcount to the caterer") for t in tasks)
    # A line that is private through and through is left out, not half-shown.
    assert not any("rooms" in t for t in tasks)


def test_a_helper_friend_is_not_listed_as_a_hire():
    plan = fv.family_projection(wanda())
    names = [v["name"] for v in plan["vendors"]]
    assert names == ["VFW Post 1847 — Freedom Hall", "Semper Catering Co.", "DJ Marcus Kane + dance floor"]
    assert "Vida Haynes" not in json.dumps(plan, ensure_ascii=False)


def test_money_in_any_form_is_cut():
    data = {"name": "n", "honoree": "Ana", "guests": [],
            "timeline": [{"task": "Pay the DJ deposit"}, {"task": "Cake — about 300 dollars"},
                         {"task": "Order flowers (USD 120)"}, {"task": "Hang the lights"}],
            "ros": [{"time": "18:00", "label": "Dinner; the caterer's price is set"}]}
    plan = fv.family_projection(data)
    assert [t["task"] for t in plan["checklist"]] == ["Cake", "Order flowers", "Hang the lights"]
    assert plan["ros"] == [{"time": "18:00", "label": "Dinner"}]


def test_the_page_test_renders_what_the_server_sends():
    """hostv2/e2e/familySeesThePlanReadOnly.spec.mjs renders this exact plan,
    so the page is checked against the server's real output, not a hand-made
    stand-in. A projection change that moves it must move the fixture too."""
    import pathlib
    fixture = pathlib.Path(__file__).resolve().parents[2] / "hostv2" / "e2e" / "wandaFamilyPlan.json"
    assert json.loads(fixture.read_text(encoding="utf-8")) == fv.family_projection(wanda())
