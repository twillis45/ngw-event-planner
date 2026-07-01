"""INTEL-QA-1 Stage 1C (backend) — pure, non-PII aggregation over event.intelEvaluations[].

Mirrors the frontend ``evaluationAudit`` reader (src/lib/intelEval.js) so the admin console's
Intelligence tab renders server-fleet data with the SAME shape it uses for the client book.

CAPTURE ONLY: this NEVER scores, grades, or computes accuracy (Stage 2). It counts lifecycle states,
flags data-integrity problems, and returns safe record rows. It imports NO db/network — a pure
function of the event dicts handed to it, so it is unit-testable without a database and cannot leak
PII (the caller passes ONLY the non-PII fields it needs).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

EVAL_VERSION = 1
CANON = ["created", "presented", "accepted", "rejected", "reverted", "overridden", "expired", "evaluated"]
CANON_ORDER = {s: i for i, s in enumerate(CANON)}


def _is_num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _event_passed(date_str, now: datetime) -> bool:
    if not date_str:
        return False
    try:
        d = datetime.fromisoformat(str(date_str)[:10]).replace(tzinfo=timezone.utc)
        return d < now
    except Exception:
        return False


def validate_evaluation(record, event_passed: bool = False):
    """Return a list of {code, level, message} integrity issues (empty if clean)."""
    if not isinstance(record, dict):
        return [{"code": "malformed", "level": "error", "message": "Record is not an object"}]
    issues = []
    if not record.get("id"):
        issues.append({"code": "malformed", "level": "error", "message": "Missing record id"})
    if record.get("version") != EVAL_VERSION:
        v = record.get("version")
        issues.append({"code": "version_unknown", "level": "warn",
                       "message": f"Record version {v if v is not None else 'missing'} (expected {EVAL_VERSION})"})
    rec = record.get("recommendation")
    if not isinstance(rec, dict):
        issues.append({"code": "missing_snapshot", "level": "error", "message": "Missing frozen recommendation snapshot"})
    baseline = record.get("baseline")
    if not (isinstance(baseline, dict) and _is_num(baseline.get("value"))):
        issues.append({"code": "missing_baseline", "level": "warn", "message": "Missing baseline (default) value"})
    meta = record.get("metadata") if isinstance(record.get("metadata"), dict) else {}
    rtype = meta.get("domain") or (rec.get("domain") if isinstance(rec, dict) else None)
    if not rtype:
        issues.append({"code": "missing_type", "level": "warn", "message": "Missing recommendation type/domain"})
    if not record.get("readerId") and not meta.get("source"):
        issues.append({"code": "missing_reader", "level": "warn", "message": "Missing reader/source"})
    # lifecycle order — canonical indices must be non-decreasing
    states = [h.get("state") for h in (record.get("lifecycle") or []) if isinstance(h, dict)]
    prev, ordered = -1, True
    for s in states:
        i = CANON_ORDER.get(s)
        if i is None:
            continue
        if i < prev:
            ordered = False
            break
        prev = i
    if not ordered:
        issues.append({"code": "lifecycle_order", "level": "warn", "message": "Lifecycle transitions are out of canonical order"})
    actual = record.get("actual")
    has_actual = isinstance(actual, dict) and _is_num(actual.get("value"))
    if actual is not None and not has_actual:
        issues.append({"code": "actual_malformed", "level": "error", "message": "Attached actual is malformed (no numeric value)"})
    if ("accepted" in states) and event_passed and not has_actual:
        issues.append({"code": "missing_actual", "level": "warn", "message": "Event has passed but no actual outcome was attached"})
    # Stage-2 guard: scoring data present even though Stage 2 is NOT built
    ev = record.get("evaluation")
    if isinstance(ev, dict) and (ev.get("grade") is not None or ev.get("baselineBetter") is not None
                                 or (ev.get("status") not in (None, "pending"))):
        issues.append({"code": "scoring_present", "level": "warn",
                       "message": "Evaluation/scoring data present though Stage 2 is not built"})
    return issues


def _at(record, state):
    for h in (record.get("lifecycle") or []):
        if isinstance(h, dict) and h.get("state") == state:
            return h.get("at")
    return None


def evaluation_audit(events, now: datetime | None = None):
    """Aggregate the evaluationAudit shape over a list of (already non-PII) event dicts.

    Each event dict needs only: id, type, date, guestCount/guestEstimate, intelEvaluations[].
    Never throws on missing/None/malformed input.
    """
    now = now or datetime.now(timezone.utc)
    totals = {k: 0 for k in ("records", "shown", "accepted", "reverted", "overridden",
                             "actualsAttached", "evaluationReady", "malformed", "duplicateWarnings")}
    scanned = 0
    with_evals = 0
    records = []
    integrity = []

    for e in (events or []):
        if not isinstance(e, dict):
            continue
        scanned += 1
        evals = e.get("intelEvaluations")
        if not isinstance(evals, list) or not evals:
            continue
        with_evals += 1
        event_passed = _event_passed(e.get("date"), now)
        label = f"{e.get('type') or 'Event'} · {str(e.get('id') or '?')[:6]}"
        seen = set()

        for r in evals:
            totals["records"] += 1
            issues = validate_evaluation(r, event_passed)
            fatal = next((i for i in issues if i["code"] == "malformed"), None)
            if fatal:
                totals["malformed"] += 1
                integrity.append({"eventId": e.get("id"),
                                  "recId": (r.get("id") if isinstance(r, dict) else None), **fatal})
                continue
            rid = r.get("id")
            dup = bool(rid and rid in seen)
            if rid:
                if dup:
                    totals["duplicateWarnings"] += 1
                    integrity.append({"eventId": e.get("id"), "recId": rid, "code": "duplicate_id",
                                      "level": "error", "message": f"Duplicate record id {rid} within one event"})
                seen.add(rid)
            for iss in issues:
                integrity.append({"eventId": e.get("id"), "recId": rid, **iss})

            states = [h.get("state") for h in (r.get("lifecycle") or []) if isinstance(h, dict)]
            if "presented" in states or "created" in states:
                totals["shown"] += 1
            if "accepted" in states:
                totals["accepted"] += 1
            if "reverted" in states:
                totals["reverted"] += 1
            if "overridden" in states:
                totals["overridden"] += 1
            actual = r.get("actual")
            has_actual = isinstance(actual, dict) and _is_num(actual.get("value"))
            if has_actual:
                totals["actualsAttached"] += 1
            baseline = r.get("baseline")
            baseline_present = isinstance(baseline, dict) and _is_num(baseline.get("value"))
            rec = r.get("recommendation")
            ready = bool(has_actual and baseline_present and isinstance(rec, dict))
            if ready:
                totals["evaluationReady"] += 1
            decision = ("Reverted" if "reverted" in states else "Overridden" if "overridden" in states
                        else "Accepted" if "accepted" in states else "Pending")
            meta = r.get("metadata") if isinstance(r.get("metadata"), dict) else {}
            records.append({
                "eventId": e.get("id"), "eventLabel": label,
                "recommendationType": meta.get("domain") or (rec.get("domain") if isinstance(rec, dict) else None) or "unknown",
                "reader": r.get("readerId") or "unknown", "source": meta.get("source"),
                "confidence": rec.get("confidence") if isinstance(rec, dict) else None,
                "snapshot": ({"from": rec.get("from"), "to": rec.get("to"), "because": rec.get("because")}
                             if isinstance(rec, dict) else None),
                "baselinePresent": baseline_present, "decision": decision,
                "actualAttached": has_actual, "evaluationReady": ready,
                "version": r.get("version"), "engine": meta.get("readerVersion"),
                "createdAt": r.get("timestamp") or _at(r, "created"), "presentedAt": _at(r, "presented"),
                "decidedAt": _at(r, "reverted") or _at(r, "overridden") or _at(r, "accepted"),
                "integrityCount": len(issues) + (1 if dup else 0),
            })

    funnel = [
        {"stage": "eligible", "value": None, "available": False,
         "note": "Not persisted — only shown recommendations are captured"},
        {"stage": "created", "value": totals["records"], "available": True},
        {"stage": "presented", "value": totals["shown"], "available": True},
        {"stage": "accepted", "value": totals["accepted"], "available": True},
        {"stage": "reverted", "value": totals["reverted"], "available": True},
        {"stage": "overridden", "value": totals["overridden"], "available": True},
        {"stage": "actual attached", "value": totals["actualsAttached"], "available": True},
        {"stage": "evaluation ready", "value": totals["evaluationReady"], "available": True},
    ]
    return {"scannedEvents": scanned, "eventsWithEvaluations": with_evals,
            "totals": totals, "funnel": funnel, "records": records, "integrity": integrity}
