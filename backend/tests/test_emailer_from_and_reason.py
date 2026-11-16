"""The Resend From header and the logged rejection reason (11/16/2026: host
alert got a 422 and the log said only `HTTPStatusError`)."""
import asyncio
import json
import httpx
import pytest
from app import emailer


def test_plain_address_gets_the_name():
    assert emailer.format_from("No Guesswork Events", "events@example.com") == "No Guesswork Events <events@example.com>"


def test_an_already_formatted_address_is_used_as_is():
    v = "No Guesswork Events <events@example.com>"
    assert emailer.format_from("NGW Events", v) == v          # never `Name <Name <addr>>`


def test_header_breaking_characters_leave_the_name():
    assert emailer.format_from('Jo "Boss" <x>, Inc;\r\n', "a@b.co") == "Jo Boss x Inc <a@b.co>"
    assert emailer.format_from("<>", "a@b.co") == "NGW Events <a@b.co>"


def test_a_rejection_carries_resends_reason_not_the_recipient(monkeypatch):
    sent = {}

    def handler(request):
        sent["body"] = request.content
        return httpx.Response(422, json={"name": "validation_error", "message": "Invalid `from` field."})

    real = httpx.AsyncClient
    monkeypatch.setattr(emailer.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    monkeypatch.setattr(emailer, "COMMUNICATION_EMAIL_FROM", "X <events@example.com>")
    with pytest.raises(emailer.ResendRejected) as e:
        asyncio.run(emailer._send_via_resend("guest@example.org", "s", "<p>h</p>"))
    assert str(e.value) == "422 validation_error Invalid `from` field."
    assert "guest@example.org" not in str(e.value)
    assert json.loads(sent["body"])["from"] == "X <events@example.com>"
