"""Research executor — KRE-2 (Server Research Execution).

Pure execution logic: no routes, no DB, no side effects.
Callers (research.py router) persist the results.

Two modes:
  simulate — generate synthetic records matching research_observations schema (testing/demo)
  inject   — accept records handed in by caller (production backend hand-off)

Governance: never produces published KCRs or knowledge edits.
"""

import asyncio
import uuid
import time
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — mirror JS providerExecutors.js / researchPolicies.js
# ---------------------------------------------------------------------------

PROVIDER_TO_FAMILY: dict = {
    "data.gov": "government",
    "noaa": "government",
    "astm-iso": "government",
    "fda-foodsafety": "food-safety",
    "market-pricing": "commercial",
    "retail": "commercial",
    "restaurant-depot": "commercial",
    "hospitality-assoc": "industry",
    "event-industry": "industry",
    "tourism-board": "industry",
    "venue-network": "industry",
    "catering-network": "industry",
    "sme-network": "industry",
    "scholar": "academic",
    "community-forums": "community",
    "internal-validation": "internal",
}

RATE_LIMIT_PER_MINUTE: int = 10

# Policy per gap_kind — mirror of JS researchPolicies.js (keep in sync)
POLICY_DEFAULTS: dict = {
    "pricing": {
        "retry_attempts": 3,
        "timeout_ms": 8000,
        "freshness_days": 45,
    },
    "cost-factor": {
        "retry_attempts": 2,
        "timeout_ms": 8000,
        "freshness_days": 90,
    },
    "quantity": {
        "retry_attempts": 2,
        "timeout_ms": 6000,
        "freshness_days": 365,
    },
    "safety": {
        "retry_attempts": 3,
        "timeout_ms": 10000,
        "freshness_days": 180,
    },
    "weather": {
        "retry_attempts": 3,
        "timeout_ms": 5000,
        "freshness_days": 7,
    },
    "grounding": {
        "retry_attempts": 1,
        "timeout_ms": 6000,
        "freshness_days": 365,
    },
}

NON_RETRYABLE: set = {"corrupt", "duplicate", "unavailable"}

# Module-level rate-limit state: family → list of monotonic call timestamps
_rate_buckets: dict[str, list[float]] = {}


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def policy_for(gap_kind: str) -> dict:
    """Return policy for gap_kind, defaulting to 'grounding'."""
    return POLICY_DEFAULTS.get(gap_kind, POLICY_DEFAULTS["grounding"])


def classify_failure(exc: Exception) -> str:
    """Map exception message to failure kind.

    Returns one of: timeout / unavailable / partial / duplicate / corrupt / unknown
    """
    msg = str(exc).lower()
    if "timed out" in msg or "timeout" in msg:
        return "timeout"
    if "unavailable" in msg or "503" in msg or "502" in msg or "504" in msg:
        return "unavailable"
    if "duplicate" in msg:
        return "duplicate"
    if "corrupt" in msg:
        return "corrupt"
    if "partial" in msg:
        return "partial"
    return "unknown"


def should_retry(failure_kind: str, attempt: int, gap_kind: str) -> bool:
    """Return False if attempt >= policy.retry_attempts or failure_kind in NON_RETRYABLE."""
    if failure_kind in NON_RETRYABLE:
        return False
    policy = policy_for(gap_kind)
    return attempt < policy["retry_attempts"]


def simulate_provider(
    provider_id: str,
    gap_kind: str,
    field_path: str,
    playbook_type: str,
    asof: str,
) -> list[dict]:
    """Return synthetic records for simulate mode.

    - internal-validation → [] (honest-empty until real corpus)
    - commercial providers → 2 records (retail + wholesale)
    - all others → 1 record
    - Unknown provider_id → raises ValueError
    """
    if provider_id not in PROVIDER_TO_FAMILY:
        raise ValueError(f"Unknown provider '{provider_id}'")

    # Honest-empty: no synthetic data until a real corpus exists
    if provider_id == "internal-validation":
        return []

    family = PROVIDER_TO_FAMILY[provider_id]

    def _make_record(path_suffix: str = "", label: str = "") -> dict:
        obs_id = f"obs-{provider_id}-{uuid.uuid4().hex[:8]}"
        label_tag = f" ({label})" if label else ""
        statement = (
            f"[SYNTHETIC] {provider_id}{label_tag} reports {field_path} {gap_kind} "
            f"as of {asof}: estimated {label or 'general'} data for {playbook_type} events."
        )
        return {
            "id": obs_id,
            "provider_id": provider_id,
            "playbook_type": playbook_type,
            "field_path": field_path,
            "gap_type": gap_kind,
            "statement": statement,
            "source": f"synthetic://{provider_id}{path_suffix}",
            "status": "open",
        }

    # Commercial providers produce retail + wholesale records
    if family == "commercial":
        return [
            _make_record("/retail", "retail"),
            _make_record("/wholesale", "wholesale"),
        ]

    return [_make_record()]


def check_rate_limit(provider_id: str) -> None:
    """Simple in-memory rate limit per provider family per minute.

    Raises RuntimeError if the family has already been called RATE_LIMIT_PER_MINUTE
    times within the current 60-second sliding window.
    Uses module-level _rate_buckets: dict[str, list[float]] of monotonic timestamps.
    """
    family = PROVIDER_TO_FAMILY.get(provider_id, provider_id)
    now = time.monotonic()
    window_start = now - 60.0

    if family not in _rate_buckets:
        _rate_buckets[family] = []

    # Prune timestamps that have aged out of the sliding window
    _rate_buckets[family] = [t for t in _rate_buckets[family] if t > window_start]

    if len(_rate_buckets[family]) >= RATE_LIMIT_PER_MINUTE:
        raise RuntimeError(
            f"Rate limit exceeded for provider family '{family}' "
            f"({RATE_LIMIT_PER_MINUTE}/min)"
        )

    _rate_buckets[family].append(now)


async def execute_provider_async(
    provider_id: str,
    gap_kind: str,
    field_path: str,
    playbook_type: str,
    asof: str,
    mode: str = "simulate",
    injected: list | None = None,
    timeout_ms: int = 8000,
) -> list[dict]:
    """Execute one provider with rate-limiting and timeout.

    Steps:
    1. Validate provider_id (ValueError if unknown).
    2. Apply rate limit check (RuntimeError if exceeded).
    3. inject mode → return injected records (or [] if None).
    4. simulate mode → run simulate_provider in a thread executor, bounded by timeout_ms.
       asyncio.TimeoutError is re-raised as RuntimeError('Request timed out').
    """
    if provider_id not in PROVIDER_TO_FAMILY:
        raise ValueError(f"Unknown provider '{provider_id}'")

    check_rate_limit(provider_id)

    if mode == "inject":
        return injected or []

    # simulate (default) — run sync helper in thread pool to keep event loop free
    loop = asyncio.get_running_loop()
    timeout_s = timeout_ms / 1000.0
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                simulate_provider,
                provider_id,
                gap_kind,
                field_path,
                playbook_type,
                asof,
            ),
            timeout=timeout_s,
        )
        return result
    except asyncio.TimeoutError:
        raise RuntimeError("Request timed out")
