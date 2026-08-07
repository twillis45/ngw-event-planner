# ── THE ADMIN SYNC HELPERS DECIDE WHAT SURVIVES A ROUND TRIP ────────────────
#
# kcr.py and kas.py both take batches of camelCase records from the client and
# write them to snake_case columns, parsing timestamps on the way. Neither had
# tests. The failure mode here is silent: a mistyped key maps to None and the
# row is written with a hole in it rather than rejected, and a timestamp that
# fails to parse becomes None rather than raising.
from datetime import datetime, timezone

from app.routers.kas import KAS_KINDS
from app.routers.kas import MAX_BATCH as KAS_MAX
from app.routers.kas import _asset_of
from app.routers.kas import _aware as kas_aware
from app.routers.kas import _parse_iso as kas_parse
from app.routers.kcr import MAX_BATCH as KCR_MAX
from app.routers.kcr import _aware as kcr_aware
from app.routers.kcr import _cols
from app.routers.kcr import _parse_iso as kcr_parse


# ── _cols: the camelCase -> column mapping ──────────────────────────────────
def test_every_client_field_reaches_its_column():
    got = _cols({
        "assetId": "a1", "assetKind": "vendor", "type": "risk", "trigger": "late",
        "status": "open", "priority": 3, "createdBy": "u1",
    })
    assert got == {
        "asset_id": "a1", "asset_kind": "vendor", "type": "risk", "trigger": "late",
        "status": "open", "priority": 3, "created_by": "u1",
    }


def test_a_missing_field_becomes_none_rather_than_raising():
    # .get() everywhere — a partial record writes holes, it does not 500. Worth
    # pinning either way so the behaviour is a decision, not an accident.
    assert _cols({}) == {
        "asset_id": None, "asset_kind": None, "type": None, "trigger": None,
        "status": None, "priority": None, "created_by": None,
    }


def test_the_column_set_is_fixed():
    # An unexpected client key must not become a column.
    assert set(_cols({"assetId": "a", "dropTable": "x"})) == {
        "asset_id", "asset_kind", "type", "trigger", "status", "priority", "created_by",
    }


def test_snake_case_input_is_NOT_silently_accepted():
    # The client contract is camelCase. If someone sends asset_id, it is dropped
    # — which is the current behaviour and the reason a schema change has to
    # touch both sides. See the playbook/backend field-parity rule.
    assert _cols({"asset_id": "a1"})["asset_id"] is None


# ── _parse_iso / _aware: timestamps ─────────────────────────────────────────
def test_a_z_suffixed_timestamp_parses_as_utc():
    for parse in (kcr_parse, kas_parse):
        got = parse("2026-08-07T12:00:00Z")
        assert got == datetime(2026, 8, 7, 12, tzinfo=timezone.utc)


def test_an_offset_timestamp_keeps_its_offset():
    got = kcr_parse("2026-08-07T12:00:00+02:00")
    assert got.utcoffset().total_seconds() == 7200


def test_garbage_and_empty_parse_to_none_instead_of_raising():
    for parse in (kcr_parse, kas_parse):
        for bad in ["", None, "not-a-date", "2026-13-45T99:99:99Z", 12345]:
            assert parse(bad) is None, f"{bad!r} should be None"


def test_a_naive_timestamp_is_assumed_utc():
    # The alternative is comparing naive and aware datetimes, which raises.
    for aware in (kcr_aware, kas_aware):
        got = aware(datetime(2026, 8, 7, 12))
        assert got.tzinfo is not None
        assert got.utcoffset().total_seconds() == 0


def test_an_already_aware_timestamp_is_left_alone():
    original = datetime(2026, 8, 7, 12, tzinfo=timezone.utc)
    for aware in (kcr_aware, kas_aware):
        assert aware(original) is original


def test_aware_passes_none_through():
    for aware in (kcr_aware, kas_aware):
        assert aware(None) is None


def test_parse_then_aware_is_always_comparable():
    # The pairing these two exist for: whatever the client sent, the result can
    # be compared against a real timestamp without a TypeError.
    now = datetime.now(timezone.utc)
    for s in ["2026-08-07T12:00:00Z", "2026-08-07T12:00:00", "2026-08-07T12:00:00+02:00"]:
        got = kcr_aware(kcr_parse(s))
        assert (got < now) or (got > now)


# ── _asset_of: which id wins ────────────────────────────────────────────────
def test_asset_id_wins_over_asset_and_affected():
    assert _asset_of({"assetId": "a", "asset": "b", "affectedAssets": ["c"]}) == "a"


def test_asset_falls_back_then_affected_then_none():
    assert _asset_of({"asset": "b", "affectedAssets": ["c"]}) == "b"
    assert _asset_of({"affectedAssets": ["c", "d"]}) == "c"
    assert _asset_of({}) is None
    assert _asset_of({"affectedAssets": []}) is None


def test_an_empty_string_id_does_not_beat_a_real_one():
    # `or` chaining means "" falls through, which is what you want — an empty
    # id is not an id.
    assert _asset_of({"assetId": "", "asset": "b"}) == "b"


# ── The batch ceilings exist ────────────────────────────────────────────────
def test_both_admin_routers_bound_a_batch():
    assert 0 < KCR_MAX <= 1000
    assert 0 < KAS_MAX <= 5000


def test_the_kas_kinds_are_a_closed_set():
    assert KAS_KINDS == {"observation", "evidence", "finding", "override", "campaign"}
