"""INTEL-QA-1 Stage 1C — pure aggregation tests (no DB). Capture only; nothing scores."""
import json
from datetime import datetime, timezone

from app.intel_audit import evaluation_audit, validate_evaluation

NOW = datetime(2026, 7, 1, tzinfo=timezone.utc)


def rec(**over):
    r = {
        "id": "R1:cf1", "version": 1, "readerId": "R1",
        "metadata": {"domain": "attendance", "source": "attendance-memory", "readerVersion": 1},
        "recommendation": {"from": 40, "to": 34, "because": "size for 34", "confidence": "Medium"},
        "baseline": {"value": 40},
        "lifecycle": [{"state": "created"}, {"state": "presented"}, {"state": "accepted"}],
        "actual": {"value": 36},
        "evaluation": {"status": "pending"},
    }
    r.update(over)
    return r


def test_empty_or_malformed_input_never_throws():
    for bad in (None, [], "x", 42, [None, "y"], [{}]):
        arg = bad if isinstance(bad, list) else []
        assert evaluation_audit(arg)["totals"]["records"] >= 0
    assert evaluation_audit(None)["totals"]["records"] == 0


def test_event_with_no_intel_evaluations():
    out = evaluation_audit([{"id": "e1", "type": "Crab Feast", "date": "2026-06-01"}])
    assert out["scannedEvents"] == 1
    assert out["eventsWithEvaluations"] == 0
    assert out["totals"]["records"] == 0


def test_populated_totals_records_and_funnel():
    events = [{"id": "cf1", "type": "Crab Feast", "date": "2026-06-01", "guestCount": 40, "intelEvaluations": [rec()]}]
    out = evaluation_audit(events, NOW)
    t = out["totals"]
    assert (t["records"], t["shown"], t["accepted"], t["actualsAttached"], t["evaluationReady"]) == (1, 1, 1, 1, 1)
    r0 = out["records"][0]
    assert r0["eventLabel"].startswith("Crab Feast · cf1")
    assert r0["decision"] == "Accepted" and r0["baselinePresent"] is True and r0["actualAttached"] is True
    eligible = next(f for f in out["funnel"] if f["stage"] == "eligible")
    assert eligible["available"] is False and eligible["value"] is None


def test_malformed_records_counted_not_crashing():
    out = evaluation_audit([{"id": "cf1", "intelEvaluations": [None, "garbage", rec()]}])
    assert out["totals"]["malformed"] == 2
    assert out["totals"]["records"] == 3
    assert any(i["code"] == "malformed" for i in out["integrity"])


def test_duplicate_ids_flagged():
    r = rec()
    out = evaluation_audit([{"id": "cf1", "intelEvaluations": [r, dict(r)]}])
    assert out["totals"]["duplicateWarnings"] == 1
    assert any(i["code"] == "duplicate_id" for i in out["integrity"])


def test_missing_baseline_and_accepted_missing_actual():
    assert any(i["code"] == "missing_baseline" for i in validate_evaluation(rec(baseline=None)))
    acc = rec(actual=None)  # accepted lifecycle, no actual
    assert any(i["code"] == "missing_actual" for i in validate_evaluation(acc, event_passed=True))
    assert not any(i["code"] == "missing_actual" for i in validate_evaluation(acc, event_passed=False))


def test_missing_type_reader_and_lifecycle_order_and_version():
    bare = {"id": "x", "recommendation": {}, "baseline": {"value": 1},
            "lifecycle": [{"state": "accepted"}, {"state": "created"}]}
    codes = {i["code"] for i in validate_evaluation(bare)}
    assert {"missing_type", "missing_reader", "lifecycle_order", "version_unknown"}.issubset(codes)


def test_scoring_present_is_flagged_stage2_guard():
    scored = rec()
    scored["evaluation"] = {"status": "scored", "grade": "A", "baselineBetter": True}
    assert any(i["code"] == "scoring_present" for i in validate_evaluation(scored))


def test_output_is_non_pii():
    # The aggregator only receives the fields the route passes; assert the OUTPUT leaks none.
    events = [{"id": "cf1", "type": "Crab Feast", "date": "2026-06-01", "guestCount": 40,
               "name": "Ada's Feast", "guests": [{"name": "Ada Lovelace", "email": "ada@x.com"}],
               "intelEvaluations": [rec()]}]
    s = json.dumps(evaluation_audit(events, NOW)).lower()
    for pii in ("ada lovelace", "ada@x.com", "email", "@", "address", "phone", "guests"):
        assert pii not in s
    assert "crab feast" in s  # event type is non-PII and used for the label


def test_shape_matches_frontend_contract():
    out = evaluation_audit([{"id": "cf1", "type": "X", "date": "2026-06-01", "guestCount": 40, "intelEvaluations": [rec()]}], NOW)
    assert {"scannedEvents", "eventsWithEvaluations", "totals", "funnel", "records", "integrity"}.issubset(out)
    assert {"records", "shown", "accepted", "reverted", "overridden", "actualsAttached",
            "evaluationReady", "malformed", "duplicateWarnings"}.issubset(out["totals"])
    r0 = out["records"][0]
    for f in ("eventLabel", "recommendationType", "reader", "snapshot", "baselinePresent", "decision",
              "actualAttached", "evaluationReady", "version", "engine", "createdAt", "presentedAt", "integrityCount"):
        assert f in r0
