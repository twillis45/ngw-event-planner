"""THE FAMILY PAGE COUNTS THE CHECKLIST THE HOST COUNTS (UX_11 rule 12; cohesion
audit #35; owner ruling 11/24/2026, option a).

The host's checklist reads "2 of 41": done steps plus the steps her plan proves
handled, over the live (not retired) steps. The family page counted only the
steps ticked by hand, so it read "1 of 41" for the same plan. Only the host's
app can tell which steps the plan has handled, so it saves its own count on
the event (`checklistCount`, one reader: lib/taskEngine checklistProgress), and
the projection passes it through, checked, so the family page prints the
host's number.

It is two whole numbers and nothing else, and it is on the allow-list below,
which pins every key the family page can ever receive.
Fictional sample data only.
"""
import app.routers.family_view as fv

from tests._wanda_sample import wanda

# Every key family_projection may send. A new key is a privacy decision: add it
# here, on purpose, with the reason.
FAMILY_ALLOW_LIST = set(fv.WHEN_WHERE) | {
    "recordKind", "hostName", "ros", "rosEdited", "checklist", "vendors", "replies",
    "checklistCount",   # 11/24/2026: the host's own "N of M" — two integers, no text
}


def test_the_host_count_reaches_the_family_page():
    data = {**wanda(), "checklistCount": {"done": 2, "total": 41}}
    assert fv.family_projection(data)["checklistCount"] == {"done": 2, "total": 41}


def test_only_two_sane_whole_numbers_pass():
    for bad in ("2 of 41", {"done": "2", "total": 41}, {"done": -1, "total": 4}, {"done": 5, "total": 4},
                {"done": True, "total": 4}, {"done": 1, "total": 100000}, {"done": 1.5, "total": 4},
                {"done": 1}, None, [1, 2]):
        plan = fv.family_projection({**wanda(), "checklistCount": bad})
        assert "checklistCount" not in plan, bad
    # Nothing rides along with it.
    plan = fv.family_projection({**wanda(), "checklistCount": {"done": 0, "total": 3, "note": "Budget $5,000"}})
    assert plan["checklistCount"] == {"done": 0, "total": 3}


def test_a_plan_without_a_saved_count_sends_none():
    assert "checklistCount" not in fv.family_projection(wanda())


def test_every_key_the_family_page_receives_is_allow_listed():
    full = {**wanda(), "checklistCount": {"done": 2, "total": 41}, "rosEdited": True, "recordKind": "host_event"}
    assert set(fv.family_projection(full)) <= FAMILY_ALLOW_LIST
