"""Research executor — KRE-2 (Server Research Execution).

Pure execution logic: no routes, no DB, no side effects.
Callers (research.py router) persist the results.

THREE modes:
  simulate — generate synthetic records matching research_observations schema (testing/demo).
             Every statement is prefixed [SYNTHETIC] and sourced synthetic://... — never
             mistakable for a real citation.
  inject   — accept records handed in by caller (manual/admin hand-off).
  live     — actually fetch from a real public API (2026-07-11: bridging the gap flagged
             in the food-plan pricing audit — the provider system was 100% simulated with
             no live path at all). Only providers with a genuine free/keyless public API
             are wired: fda-foodsafety (openFDA) and scholar (Crossref). Any other
             provider_id raises in live mode rather than silently falling back to
             fabricated data — commercial/retail-specific pricing, industry-association
             surveys, and community forums have no real free API today; see
             LIVE_PROVIDERS below.

Governance: never produces published KCRs or knowledge edits.
"""

import asyncio
import uuid
import time
import logging
import os

import httpx

from .config import COMMUNICATION_EMAIL_FROM

logger = logging.getLogger(__name__)

# openFDA works without a key (240 req/min, 1000/day per IP); an optional key
# (free signup, api.fda.gov) raises that to 240/min, 120,000/day. Never required.
FDA_API_KEY = os.environ.get("FDA_API_KEY")
# Crossref's "polite pool" — no key/registration needed, just real contact info
# in the query so they can reach us if a query misbehaves. Reuses the app's own
# from-address rather than inventing a research-specific one.
RESEARCH_CONTACT_EMAIL = os.environ.get("RESEARCH_CONTACT_EMAIL", COMMUNICATION_EMAIL_FROM)

# Providers with a REAL live-fetch implementation below. Everything else in
# PROVIDER_TO_FAMILY has no free/keyless public API today (retail/wholesale
# per-store pricing, industry-association surveys, and forum scraping all
# require paid partnerships or app registration this backend doesn't have) —
# live mode raises for those rather than quietly returning simulated data
# under a "live" label, which would be worse than staying simulated.
LIVE_PROVIDERS = {"fda-foodsafety", "scholar"}

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


async def fetch_fda_foodsafety_live(
    field_path: str, playbook_type: str, timeout_s: float, client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Real openFDA food-enforcement (recall) search. No key required.

    Searches recall records naming the playbook's food type — genuinely useful
    grounding for the food-safety family's actual purpose (safety, not pricing).
    Honest-empty on no matches; raises on a real request failure (the caller's
    retry/timeout handling applies, same as simulate mode). `client` is
    injectable so tests can pass an httpx.MockTransport-backed client instead
    of hitting the real network.
    """
    term = (playbook_type or "food").strip()
    params = {"search": f'product_description:"{term}"', "limit": 3, "sort": "report_date:desc"}
    if FDA_API_KEY:
        params["api_key"] = FDA_API_KEY
    if client is not None:
        resp = await client.get("https://api.fda.gov/food/enforcement.json", params=params)
    else:
        async with httpx.AsyncClient(timeout=timeout_s) as c:
            resp = await c.get("https://api.fda.gov/food/enforcement.json", params=params)
    if resp.status_code == 404:
        return []  # openFDA's "no matching records" — honest-empty, not a failure
    resp.raise_for_status()
    results = resp.json().get("results", [])
    records = []
    for r in results:
        product = r.get("product_description", term)
        reason = r.get("reason_for_recall", "")
        status = r.get("status", "")
        statement = f"FDA enforcement record: {product} — {reason}".strip(" —")
        if status:
            statement += f" (status: {status})"
        records.append({
            "id": f"obs-fda-foodsafety-{uuid.uuid4().hex[:8]}",
            "provider_id": "fda-foodsafety",
            "playbook_type": playbook_type,
            "field_path": field_path,
            "gap_type": "safety",
            "statement": statement,
            "source": "openFDA Food Enforcement",
            "status": "open",
            "url": "https://api.fda.gov/food/enforcement.json",
            "extractedFacts": [
                {"field": "recall_status", "value": status, "confidence": "high"},
                {"field": "report_date", "value": r.get("report_date", ""), "confidence": "high"},
            ],
        })
    return records


async def fetch_crossref_academic_live(
    field_path: str, playbook_type: str, timeout_s: float, client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Real Crossref works search. No key required (polite pool via mailto).
    `client` is injectable — see fetch_fda_foodsafety_live docstring."""
    term = f"{playbook_type} event planning" if playbook_type else "event planning"
    params = {"query.bibliographic": term, "rows": 2, "mailto": RESEARCH_CONTACT_EMAIL}
    if client is not None:
        resp = await client.get("https://api.crossref.org/works", params=params)
    else:
        async with httpx.AsyncClient(timeout=timeout_s) as c:
            resp = await c.get("https://api.crossref.org/works", params=params)
    resp.raise_for_status()
    items = (resp.json().get("message") or {}).get("items", [])
    records = []
    for it in items:
        title = " ".join(it.get("title") or []) or "Untitled"
        doi = it.get("DOI", "")
        url = it.get("URL") or (f"https://doi.org/{doi}" if doi else None)
        issued = (it.get("issued") or {}).get("date-parts") or [[None]]
        year = issued[0][0] if issued and issued[0] else None
        container = " ".join(it.get("container-title") or []) or None
        statement = title + (f" ({container}, {year})" if container or year else "")
        records.append({
            "id": f"obs-scholar-{uuid.uuid4().hex[:8]}",
            "provider_id": "scholar",
            "playbook_type": playbook_type,
            "field_path": field_path,
            "gap_type": "grounding",
            "statement": statement,
            "source": "Crossref",
            "status": "open",
            "url": url,
            "extractedFacts": [{"field": "doi", "value": doi, "confidence": "high"}] if doi else [],
        })
    return records


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
    4. live mode → real fetch for providers in LIVE_PROVIDERS (fda-foodsafety,
       scholar); raises RuntimeError for any other provider_id — no fallback to
       simulated data under a "live" label.
    5. simulate mode → run simulate_provider in a thread executor, bounded by timeout_ms.
       asyncio.TimeoutError is re-raised as RuntimeError('Request timed out').
    """
    if provider_id not in PROVIDER_TO_FAMILY:
        raise ValueError(f"Unknown provider '{provider_id}'")

    check_rate_limit(provider_id)

    if mode == "inject":
        return injected or []

    timeout_s = timeout_ms / 1000.0

    if mode == "live":
        if provider_id not in LIVE_PROVIDERS:
            raise RuntimeError(
                f"Live fetch not implemented for provider '{provider_id}' — "
                f"no real, free data source is wired for it yet (only "
                f"{sorted(LIVE_PROVIDERS)} have one). Falling back to simulate "
                f"would silently mislabel fabricated data as live."
            )
        try:
            if provider_id == "fda-foodsafety":
                return await asyncio.wait_for(
                    fetch_fda_foodsafety_live(field_path, playbook_type, timeout_s),
                    timeout=timeout_s,
                )
            return await asyncio.wait_for(
                fetch_crossref_academic_live(field_path, playbook_type, timeout_s),
                timeout=timeout_s,
            )
        except asyncio.TimeoutError:
            raise RuntimeError("Request timed out")

    # simulate (default) — run sync helper in thread pool to keep event loop free
    loop = asyncio.get_running_loop()
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
