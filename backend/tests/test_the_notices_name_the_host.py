"""The guest notices name the host the way every other outbound email does
(cohesion batch G, owner 11/24/2026).

guest_notices read `coalesce(hostName, hostNames)` only, so an event whose host
line is in `host` (the Wanda sample stores host: 'Wanda Mundy') and a planner
whose profile has her name both got "Your host answered your question". Every
other outbound template asks real_host_name(<the profile's name>,
host_name_for(<the event>)) (communication.py, invite_email.py). The reply
notice and the announcement now ask the same reader. All names are made up.
"""
import inspect
import json

import app.guest_notices as gn
from tests.test_guest_reply_notices import _setup, _opt_in, _reply
from tests.test_guest_messages import _ask, GOOD_CODE
from tests import test_announcements as ta


def test_the_reader_is_the_one_every_outbound_email_asks():
    assert gn.host_first(None, {"host": "Wanda Mundy"}) == "Wanda"
    assert gn.host_first("Rosa Delgado", {"hostNames": "Casey Morgan"}) == "Rosa"          # the profile first
    assert gn.host_first("Your host", {"hostNames": "Casey Morgan"}) == "Casey"            # a placeholder is no name
    assert gn.host_first(None, {"hostName": "Sam Lee", "host": "Wanda Mundy"}) == "Sam"     # host_name_for's order
    assert gn.host_first("", json.dumps({"host": "Wanda Mundy"})) == "Wanda"               # jsonb read as text
    assert gn.host_first(None, {}) == ""
    assert gn.host_first(None, None) == ""


def test_both_notices_read_the_profile_and_host_name_for_and_never_coalesce_two_keys():
    src = inspect.getsource(gn)
    assert "coalesce(e.data->>'hostName', e.data->>'hostNames')" not in src
    assert src.count("as profile_name") == 2
    body = inspect.getsource(gn.host_first)
    assert "real_host_name(" in body and "host_name_for(" in body


def test_a_reply_notice_names_a_host_whose_name_is_only_in_host(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    data = conn.events[GOOD_CODE][1]
    data.pop("hostNames", None); data.pop("hostName", None)
    data["host"] = "Wanda Mundy"
    _ask(c)
    _opt_in(c)
    assert _reply(c, conn).status_code == 200
    m = sent[0]
    assert m["from_name"] == "Wanda via No Guesswork"
    assert m["subject"].startswith("Wanda answered your question — ")


def test_a_reply_notice_signs_with_the_profile_name_first(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    conn.profile_name = "Rosa Delgado"
    _ask(c)
    _opt_in(c)
    assert _reply(c, conn).status_code == 200
    assert sent[0]["from_name"] == "Rosa via No Guesswork"


def test_an_announcement_names_a_host_whose_name_is_only_in_host(monkeypatch):
    conn, sent = ta._Conn(), []
    conn.event_data = {k: v for k, v in ta.EVENT.items() if k not in ("hostName", "hostNames")} | {"host": "Wanda Mundy"}
    ta._thread(conn, "lee.guest@example.test", token="tok-lee-bbbbbbbbbbbbbbbbbbbb")
    c = ta._client(monkeypatch, conn, sent=sent)
    assert ta._post(c, "Doors open at 4.").status_code == 200
    assert sent[0]["from_name"] == "Wanda via No Guesswork"
    assert sent[0]["subject"].startswith("Update from Wanda — ")
