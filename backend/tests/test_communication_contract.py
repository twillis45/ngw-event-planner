# ── THE LARGEST UNTESTED ROUTER'S CONTRACT ──────────────────────────────────
#
# communication.py is 584 lines and shipped with no tests. Most of it is
# DB-bound, but its CONTRACT is not: the closed sets it validates against, the
# credential on the public portal endpoint, and the enum fields that decide
# whether an email gets sent or an approval gets recorded.
#
# These pin the parts where being wrong is silent — a widened Literal that lets
# an unknown author_role or approval verdict into the table, or a portal token
# that stops being required.
import pytest
from pydantic import ValidationError

from app.routers.communication import (
    APPROVAL_TRANSITIONS,
    AUTHOR_ROLES,
    CHANNELS,
    MESSAGE_TYPES,
    MessageCreate,
    MessagePatch,
    PinReq,
    PortalResponse,
    assert_channel_type,
)


# ── The closed sets ─────────────────────────────────────────────────────────
def test_only_two_channels_exist():
    # A third channel is a product decision, not a typo — it should have to be
    # added here deliberately.
    assert set(CHANNELS) == {"CLIENT", "INTERNAL_TEAM"}


def test_an_unknown_channel_is_a_400_not_a_500():
    from fastapi import HTTPException
    for bad in ["client", "Client", "TEAM", "", "INTERNAL", "'; drop table"]:
        with pytest.raises(HTTPException) as ei:
            assert_channel_type(bad)
        assert ei.value.status_code == 400


def test_the_two_real_channels_pass():
    for good in CHANNELS:
        assert assert_channel_type(good) is None


def test_the_declared_sets_match_the_models():
    # The module exports MESSAGE_TYPES / AUTHOR_ROLES / APPROVAL_TRANSITIONS as
    # the source of truth, while the models restate them as Literals. If the two
    # drift, one of them is lying about what the table accepts.
    mt = MessageCreate.model_fields["message_type"].annotation
    ar = MessageCreate.model_fields["author_role"].annotation
    import typing
    assert set(typing.get_args(mt)) == MESSAGE_TYPES
    assert set(typing.get_args(ar)) == AUTHOR_ROLES
    # approval_status is Optional[Literal[...]], so the strings sit one level
    # down inside the Union — a flat get_args() returns (Literal[...], NoneType)
    # and would compare against an empty set, passing for the wrong reason.
    def literal_strings(ann):
        out = set()
        for arg in typing.get_args(ann):
            if isinstance(arg, str):
                out.add(arg)
            else:
                out |= literal_strings(arg)
        return out
    st = literal_strings(MessagePatch.model_fields["approval_status"].annotation)
    assert st, "no literal values found — the extraction is broken, not the model"
    assert APPROVAL_TRANSITIONS == st


# ── MessageCreate ───────────────────────────────────────────────────────────
def test_a_message_defaults_to_a_standard_planner_message():
    m = MessageCreate()
    assert m.message_type == "standard"
    assert m.author_role == "planner"
    # Email delivery must be OPT-IN. A default of True would mail clients on
    # every message the moment a recipient existed.
    assert m.deliver_email is False


def test_an_invented_message_type_or_role_is_refused():
    for bad in ["urgent", "STANDARD", "", "note"]:
        with pytest.raises(ValidationError):
            MessageCreate(message_type=bad)
    for bad in ["vendor", "admin", "guest", ""]:
        with pytest.raises(ValidationError):
            MessageCreate(author_role=bad)


def test_the_three_real_author_roles_are_accepted():
    for role in AUTHOR_ROLES:
        assert MessageCreate(author_role=role).author_role == role


def test_an_unknown_field_does_not_silently_vanish_into_a_write():
    # pydantic's default is to IGNORE unknown keys. That is what dropped a
    # remote guest's allergy answer in the RSVP model before 2026-07-27, so it
    # is worth knowing which behaviour this model has rather than assuming.
    m = MessageCreate(**{"body": "hi", "not_a_field": "x"})
    assert not hasattr(m, "not_a_field")
    assert m.body == "hi"


# ── The public portal endpoint's credential ─────────────────────────────────
def test_the_portal_token_is_required():
    # This endpoint has NO Authorization header — the token in the body is the
    # entire credential. It must not be optional.
    with pytest.raises(ValidationError):
        PortalResponse(response="approved")


def test_a_portal_verdict_is_only_approved_or_rejected():
    # 'expired' is a SYSTEM transition, not something a client may send.
    for bad in ["expired", "maybe", "APPROVED", ""]:
        with pytest.raises(ValidationError):
            PortalResponse(portal_token="t", response=bad)
    for good in ["approved", "rejected"]:
        assert PortalResponse(portal_token="t", response=good).response == good


def test_expired_remains_available_to_the_planner_patch():
    # The asymmetry is deliberate: the system may expire an approval; a client
    # replying through the portal may not.
    assert MessagePatch(approval_status="expired").approval_status == "expired"


def test_a_pin_has_a_default_label():
    assert PinReq().label == "Decision"
