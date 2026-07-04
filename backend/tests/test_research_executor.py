"""Unit tests for research_executor.py — pure functions only (no DB, no routes)."""

import asyncio
import pytest

from app.research_executor import (
    PROVIDER_TO_FAMILY,
    POLICY_DEFAULTS,
    NON_RETRYABLE,
    RATE_LIMIT_PER_MINUTE,
    policy_for,
    classify_failure,
    should_retry,
    simulate_provider,
    check_rate_limit,
    execute_provider_async,
)


# ---------------------------------------------------------------------------
# PROVIDER_TO_FAMILY
# ---------------------------------------------------------------------------


class TestProviderToFamily:
    def test_has_16_entries(self):
        assert len(PROVIDER_TO_FAMILY) == 16

    def test_market_pricing_is_commercial(self):
        assert PROVIDER_TO_FAMILY["market-pricing"] == "commercial"

    def test_data_gov_is_government(self):
        assert PROVIDER_TO_FAMILY["data.gov"] == "government"

    def test_fda_foodsafety_is_food_safety(self):
        assert PROVIDER_TO_FAMILY["fda-foodsafety"] == "food-safety"

    def test_internal_validation_is_internal(self):
        assert PROVIDER_TO_FAMILY["internal-validation"] == "internal"


# ---------------------------------------------------------------------------
# policy_for
# ---------------------------------------------------------------------------


class TestPolicyFor:
    def test_pricing_retry_attempts(self):
        assert policy_for("pricing")["retry_attempts"] == 3

    def test_weather_timeout_ms(self):
        assert policy_for("weather")["timeout_ms"] == 5000

    def test_unknown_kind_falls_back_to_grounding(self):
        p = policy_for("completely-unknown-kind")
        grounding = POLICY_DEFAULTS["grounding"]
        assert p["retry_attempts"] == grounding["retry_attempts"] == 1

    def test_all_gap_kinds_accessible(self):
        for kind in POLICY_DEFAULTS:
            p = policy_for(kind)
            assert "retry_attempts" in p
            assert "timeout_ms" in p
            assert "freshness_days" in p


# ---------------------------------------------------------------------------
# classify_failure
# ---------------------------------------------------------------------------


class TestClassifyFailure:
    def test_timed_out_message(self):
        assert classify_failure(RuntimeError("Request timed out")) == "timeout"

    def test_503_unavailable_message(self):
        assert classify_failure(RuntimeError("503 Service unavailable")) == "unavailable"

    def test_duplicate_message(self):
        assert classify_failure(RuntimeError("duplicate record")) == "duplicate"

    def test_corrupt_message(self):
        assert classify_failure(RuntimeError("corrupt JSON")) == "corrupt"

    def test_unrecognised_message_returns_unknown(self):
        assert classify_failure(RuntimeError("random error")) == "unknown"


# ---------------------------------------------------------------------------
# should_retry
# ---------------------------------------------------------------------------


class TestShouldRetry:
    def test_corrupt_always_false(self):
        assert should_retry("corrupt", 0, "pricing") is False
        assert should_retry("corrupt", 5, "pricing") is False

    def test_duplicate_always_false(self):
        assert should_retry("duplicate", 0, "pricing") is False
        assert should_retry("duplicate", 5, "pricing") is False

    def test_unavailable_always_false(self):
        # unavailable is in NON_RETRYABLE
        assert should_retry("unavailable", 0, "pricing") is False

    def test_timeout_at_attempt_0_for_pricing(self):
        # pricing has retry_attempts=3; attempt 0 < 3 → True
        assert should_retry("timeout", 0, "pricing") is True

    def test_timeout_at_attempt_3_for_pricing(self):
        # pricing has retry_attempts=3; attempt 3 >= 3 → False
        assert should_retry("timeout", 3, "pricing") is False


# ---------------------------------------------------------------------------
# simulate_provider
# ---------------------------------------------------------------------------


class TestSimulateProvider:
    _ASOF = "2026-07-01"
    _PLAYBOOK = "dinner_party"
    _FIELD = "food.costPerPerson"

    def test_internal_validation_returns_empty(self):
        result = simulate_provider(
            "internal-validation", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert result == []

    def test_market_pricing_returns_two_records(self):
        result = simulate_provider(
            "market-pricing", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert len(result) == 2

    def test_market_pricing_labels_retail_and_wholesale(self):
        result = simulate_provider(
            "market-pricing", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        labels = {r["source"] for r in result}
        assert any("retail" in s for s in labels)
        assert any("wholesale" in s for s in labels)

    def test_data_gov_returns_one_record(self):
        result = simulate_provider(
            "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert len(result) == 1

    def test_record_has_required_fields(self):
        result = simulate_provider(
            "data.gov", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        rec = result[0]
        for field in ("id", "provider_id", "playbook_type", "field_path", "gap_type", "statement", "source", "status"):
            assert field in rec, f"Missing field: {field}"

    def test_record_status_is_open(self):
        result = simulate_provider(
            "noaa", "weather", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert result[0]["status"] == "open"

    def test_statement_is_non_empty_string(self):
        result = simulate_provider(
            "scholar", "cost-factor", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert isinstance(result[0]["statement"], str)
        assert len(result[0]["statement"]) > 0

    def test_ids_are_unique_across_calls(self):
        r1 = simulate_provider(
            "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        r2 = simulate_provider(
            "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        assert r1[0]["id"] != r2[0]["id"]

    def test_ids_are_unique_within_commercial_result(self):
        result = simulate_provider(
            "market-pricing", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
        )
        ids = [r["id"] for r in result]
        assert len(ids) == len(set(ids))

    def test_unknown_provider_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown provider"):
            simulate_provider(
                "no-such-provider", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
            )


# ---------------------------------------------------------------------------
# execute_provider_async
# ---------------------------------------------------------------------------


class TestExecuteProviderAsync:
    _ASOF = "2026-07-01"
    _PLAYBOOK = "dinner_party"
    _FIELD = "food.costPerPerson"

    def test_simulate_mode_returns_list(self):
        result = asyncio.run(
            execute_provider_async(
                "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF,
                mode="simulate",
            )
        )
        assert isinstance(result, list)

    def test_inject_mode_with_records_returns_them(self):
        records = [{"id": "obs-test-1", "statement": "injected"}]
        result = asyncio.run(
            execute_provider_async(
                "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF,
                mode="inject",
                injected=records,
            )
        )
        assert result == records

    def test_inject_mode_with_none_returns_empty(self):
        result = asyncio.run(
            execute_provider_async(
                "data.gov", "grounding", self._FIELD, self._PLAYBOOK, self._ASOF,
                mode="inject",
                injected=None,
            )
        )
        assert result == []

    def test_unknown_provider_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown provider"):
            asyncio.run(
                execute_provider_async(
                    "no-such-provider", "pricing", self._FIELD, self._PLAYBOOK, self._ASOF
                )
            )
