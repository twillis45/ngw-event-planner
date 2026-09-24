"""Kroger — match a host's shopping list to real Kroger products + find a store.

Uses the public, self-serve Kroger Developer API (https://developer.kroger.com).
The PRODUCT and LOCATION endpoints used here authenticate with an OAuth2
client-credentials token (scope "product.compact") — no partner/marketplace
gate, you just register an app and copy the client id/secret. We exchange those
for a short-lived bearer token (cached in-memory until expiry) and proxy:
  • /v1/products  — fuzzy product match per shopping-list line item
  • /v1/locations — nearby stores by ZIP so the client can pick a store

GETTING KEYS (host/operator action):
  1. Sign up at https://developer.kroger.com and create an application.
  2. Copy the Client ID and Client Secret.
  3. Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in the backend env.
     KROGER_API_BASE defaults to https://api.kroger.com.

ADDING TO A USER'S CART — THE DOCUMENTED NEXT STEP, NOT BUILT HERE:
  Product search and location lookup work with the server's own
  client-credentials token. Writing items into a CART is a per-USER action: it
  requires the host to OAuth-connect THEIR OWN Kroger account (authorization-code
  flow, scope "cart.basic:write") so the cart-add happens against their account,
  not ours. That host-OAuth handshake + PUT /v1/cart/add is a future step. What
  this router returns (a real productId per list item, plus a chosen locationId)
  is exactly the basis a later "Add to Kroger cart" flow needs once the host has
  connected their account.

ONE SCOPE COVERS BOTH ENDPOINTS, CHECKED RATHER THAN ASSUMED (2026-09-23):
  `product.compact` authorizes /v1/products AND /v1/locations. Both are
  "general data owned by the application" under the client-credentials grant,
  and Kroger's own published material plus two independent client libraries
  request exactly this one scope before calling locations. So the token request
  below needs no second scope — which matters because scopes are assigned at app
  REGISTRATION and cannot be self-expanded at runtime (a missing one returns
  403 {"errors":{"code":"Forbidden","reason":"missing required scopes"}}).

PUBLISHED DAILY CEILINGS, and the one that binds us:
  Products 10,000/day · Locations 1,600/day.
  `kroger_search_list` makes ONE products call per list line — a 22-line plan
  costs 22 calls — so the products ceiling is roughly 450 list-pricings a day
  across all hosts. Ample for now, and the first number to look at if pricing
  ever starts failing at a predictable hour. `filter.limit=1` below keeps each
  call to the single best match rather than a page of them.

HONESTY:
  • The client id/secret live only on the server — never shipped in the client.
  • With no creds every endpoint returns {"configured": false} so the client can
    fall back gracefully (no fake matches, no broken cart promise).
  • Network/4xx failures degrade to {"configured": true, "error": "..."} — never
    a 500 in the host's face.
"""
import base64
import datetime
import logging
import os
import re
import time
from typing import List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

log = logging.getLogger("ngw.kroger")
router = APIRouter(prefix="/api/shopping", tags=["shopping"])

KROGER_CLIENT_ID = os.environ.get("KROGER_CLIENT_ID")
KROGER_CLIENT_SECRET = os.environ.get("KROGER_CLIENT_SECRET")
KROGER_API_BASE = os.environ.get("KROGER_API_BASE", "https://api.kroger.com")

# In-memory client-credentials token cache: {"token": str, "expires_at": float}
_token_cache: dict = {"token": None, "expires_at": 0.0}


def _configured() -> bool:
    return bool(KROGER_CLIENT_ID and KROGER_CLIENT_SECRET)


class LineItem(BaseModel):
    name: str
    # ── WHAT TO SEARCH FOR, WHEN THE NAME IS NOT IT ──────────────────────────
    # `name` is the plan's DISPLAY text, written for a host to read: "Ice
    # (coolers + drinks, heat-adjusted)", "Ribs (racks)". Sent to filter.term it
    # is a poor query — measured 2026-09-23 against a live store, 37 of 44
    # curated grocery lines matched NOTHING, while plain "ice" finds a bag of
    # ice immediately.
    #
    # So the caller may send the commodity term separately. `name` still comes
    # back verbatim in the response, because it is the key the client indexes
    # prices by; only what we SEARCH changes.
    term: Optional[str] = None
    quantity: Optional[float] = 1
    unit: Optional[str] = "each"
    # ── WHICH CORPUS ROW THIS LINE IS, IF THE CALLER KNOWS ───────────────────
    # Optional, and its absence is not an error — this endpoint also serves
    # lookups that correspond to no authored row. It exists so a real shelf
    # price can be ATTRIBUTED. Without it a price is a fact about a product
    # name, and matching that back to `p_ice` by string would be guessing —
    # the same guess `geoItemMap.js` refuses to make for regional factors.
    # No id, no observation.
    purchaseId: Optional[str] = None


class SearchListRequest(BaseModel):
    items: List[LineItem] = []
    locationId: Optional[str] = None
    # The playbook type ("Get-Together"), so an observation names the asset it
    # is evidence about. Same rule as purchaseId: absent means not recorded.
    assetId: Optional[str] = None


async def _get_token() -> Optional[str]:
    """Fetch (and cache) an OAuth2 client-credentials token.

    POST {base}/v1/connect/oauth2/token with grant_type=client_credentials and
    scope=product.compact, authenticating via HTTP Basic (client id:secret).
    Returns the bearer token string, or None if unconfigured / the exchange fails.
    Cached in-memory until ~60s before expiry to avoid a round-trip per request.
    """
    if not _configured():
        return None

    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    basic = base64.b64encode(
        f"{KROGER_CLIENT_ID}:{KROGER_CLIENT_SECRET}".encode()
    ).decode()
    url = f"{KROGER_API_BASE.rstrip('/')}/v1/connect/oauth2/token"
    headers = {
        "Authorization": f"Basic {basic}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = {"grant_type": "client_credentials", "scope": "product.compact"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, data=data, headers=headers)
        if resp.status_code >= 400:
            log.warning("Kroger token %s: %s", resp.status_code, resp.text[:300])
            return None
        body = resp.json()
        token = body.get("access_token")
        expires_in = body.get("expires_in", 1800)
        if not token:
            return None
        _token_cache["token"] = token
        # Refresh a minute early so we never send an expired token.
        _token_cache["expires_at"] = now + max(int(expires_in) - 60, 0)
        return token
    except Exception as e:  # network/timeout
        log.warning("Kroger token call failed: %s", e)
        return None


@router.get("/kroger/status")
def kroger_status():
    """Lets the client decide whether to show Kroger matching/store-pick UI."""
    return {"configured": _configured()}


# ─── KEEPING THE PRICE, WHICH IS THE WHOLE POINT ─────────────────────────────
#
# Until 2026-09-24 every real shelf price this endpoint returned was shown to one
# host once and discarded. Meanwhile the authored corpus it could re-verify sat
# at a single vintage: 529 of 533 dated price rows carry an August 2026 date,
# because the corpus was researched in one batch and nothing has re-checked it
# since. Real hosts pricing real lists were already generating exactly the
# evidence the corpus needs, against an API budget already provisioned, and it
# was being thrown away at the end of the request.
#
# ── WHY THIS IS SERVER-SIDE AND NOT IN THE CLIENT ───────────────────────────
#
# The obvious place is `storePrices.js`, where the result lands. It cannot go
# there: `kas.py` gates every write behind `require_admin`, so a host's browser
# writing an observation would fail for every real host — the only people who
# generate price data. Moving hosts inside that gate to fix it would be a
# security regression to buy a data-collection convenience. The server already
# holds the price, the store and the service-role pool, so it records it.
#
# ── WHAT IS AND IS NOT STORED ───────────────────────────────────────────────
#
# Stored: the corpus row, the playbook type, the Kroger store id, the price and
# its size/unit, the matched product description, and the month.
# NOT stored: no event id, no host id, no ZIP, no list contents beyond the line
# being priced. A Kroger `locationId` identifies a shop, not a person. This is
# store pricing data, and `kas_records` is already declared "admin-scoped
# governance metadata: no host data, no PII" — that stays true.
#
# ── IDEMPOTENT PER (row, store, month), DELIBERATELY ────────────────────────
#
# The id below collapses repeat observations of the same row at the same store
# in the same month, matching `observation.js`'s rule that "re-noticing the same
# thing is idempotent". Two hosts pricing ice at the same store this month is
# ONE observation, not two — counting it twice would manufacture corroboration
# out of one shelf. A different store, or a different month, is a genuinely
# independent look and gets its own record. That is what makes a later
# "N independent observations agree" rule mean something.
#
# ── IT NEVER AFFECTS THE RESPONSE ───────────────────────────────────────────
#
# Recording is best-effort and fully swallowed. A host pricing their list must
# not see a slower, failing, or different answer because a governance write had
# a bad day. No DB configured is a normal state, not an error.
def _slug(s) -> str:
    """Mirror of `slug()` in src/lib/knowledge/observation.js.

    Kept byte-identical in behaviour on purpose: the JS side builds observation
    ids with the same rule, and two slug functions that disagree would produce
    two records for one notice — which is precisely the double-counting the
    idempotent id exists to prevent.
    """
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()))


def _price_observations(req: "SearchListRequest", results: list, at: datetime.datetime) -> list:
    """Build KAS observation records from a priced result set. Pure — no I/O."""
    if not req.assetId or not req.locationId:
        return []
    by_name = {}
    for it in (req.items or []):
        if it and it.purchaseId and (it.name or "").strip():
            by_name[(it.name or "").strip()] = it.purchaseId
    month = at.strftime("%Y-%m")
    stamp = at.strftime("%Y-%m-%d")
    out = []
    for r in results:
        pid = by_name.get(r.get("name"))
        price = r.get("price")
        # A match without a price is not a price (the same rule the client's
        # three-layer resolver applies). Only a real number is evidence.
        if not pid or not isinstance(price, (int, float)) or price <= 0:
            continue
        # The promo price is what a host would actually pay, but the REGULAR
        # price is what re-verifies a band — a band built from sale prices would
        # under-state the corpus for everyone who shops off-sale. Both are kept;
        # only `price` is presented as the observation's figure.
        size = r.get("size")
        sold_by = r.get("soldBy")
        obs_id = f"obs-price-{_slug(req.assetId)}-{_slug(pid)}-{_slug(req.locationId)}-{month}"
        statement = (
            f"Kroger store {req.locationId} priced \"{r.get('description') or r.get('name')}\" "
            f"at ${price:.2f}" + (f" ({size})" if size else "") + f" on {stamp}."
        )
        out.append({
            "id": obs_id,
            "kind": "pricing",
            "statement": statement,
            "source": "kroger-api",
            "gapType": None,
            "assetId": req.assetId,
            "assetKind": "playbook",
            # The field a later KCR would target. Named here so the observation
            # is already pointed at the thing it is evidence about.
            "fieldPath": f"{pid}.unitCostRange",
            "region": None,
            "noticedAt": at.isoformat(),
            "status": "open",
            "linkedEvidence": [],
            "linkedFindings": [],
            # Numbers a corroboration rule can read without parsing the prose.
            "price": {
                "regular": round(float(price), 2),
                "promo": (round(float(r["promoPrice"]), 2)
                          if isinstance(r.get("promoPrice"), (int, float)) else None),
                "size": size,
                "soldBy": sold_by,
                "locationId": req.locationId,
                "productId": r.get("productId"),
                "description": r.get("description"),
                "observedOn": stamp,
            },
            "audit": [{"at": at.isoformat(), "action": "observed", "by": "kroger-api"}],
        })
    return out


async def _persist_observations(records: list) -> int:
    """Write observations to kas_records. Best-effort: never raises to the caller."""
    if not records:
        return 0
    try:
        # Imported here rather than at module load: this router must keep
        # serving prices on a deployment with no database configured, and a
        # top-level import would couple the two.
        from ..db import get_pool
        from ..kas_store import upsert_kas_record
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                for rec in records:
                    # ONE insert statement, shared with kas.py. The surrounding
                    # logic is deliberately NOT shared — that path has an admin
                    # principal to audit and a concurrent editor to guard
                    # against, and this one has neither.
                    await upsert_kas_record(
                        conn, rec, "observation", rec.get("assetId"), "kroger-api",
                    )
        return len(records)
    except Exception as e:  # no DATABASE_URL, pool down, migration missing
        log.warning("price observation write skipped: %s", e)
        return 0


@router.post("/kroger/search-list")
async def kroger_search_list(req: SearchListRequest):
    """Match each shopping-list item name to a real Kroger product.

    Returns a list of {name, matched, productId?, description?, brand?} — one
    entry per input item. This is the per-line product match a future
    "Add to Kroger cart" flow needs (once the host OAuth-connects their account).
    """
    if not _configured():
        return {"configured": False}

    token = await _get_token()
    if not token:
        return {"configured": True, "error": "auth_failed", "results": []}

    # (name, term) — name is echoed back as the client's key, term is searched.
    pairs = [
        ((it.name or "").strip(), (it.term or it.name or "").strip())
        for it in req.items
        if it and (it.name or "").strip()
    ]
    if not pairs:
        return {"configured": True, "results": [], "error": "no_items"}

    base = f"{KROGER_API_BASE.rstrip('/')}/v1/products"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    results = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for name, term in pairs:
                params = {"filter.term": term, "filter.limit": 1}
                if req.locationId:
                    params["filter.locationId"] = req.locationId
                resp = await client.get(base, params=params, headers=headers)
                if resp.status_code >= 400:
                    log.warning(
                        "Kroger products %s for %r: %s",
                        resp.status_code, term, resp.text[:200],
                    )
                    results.append({"name": name, "matched": False})
                    continue
                data = resp.json()
                products = data.get("data") or []
                if not products:
                    results.append({"name": name, "matched": False})
                    continue
                p = products[0]
                # ── THE PRICE WAS ALWAYS IN THIS RESPONSE ────────────────────
                # Kroger returns price ONLY when filter.locationId is supplied
                # ("To return the product price and aisle location, you must
                # include the filter.locationId query parameter" — Kroger's own
                # API reference). We already pass it when the caller sends one,
                # and then discarded the price, so this endpoint matched products
                # and answered nothing about cost.
                #
                # Shape, verified against Kroger's published reference:
                #   data[].items[].price.regular | .promo   (promo is 0, not null,
                #                                            when there is no sale)
                #   data[].items[].size, .soldBy
                # `nationalPrice` is deliberately NOT read: a national figure from
                # a store API is the same national band the plan already has, and
                # passing it off as a local price is the one thing this layer
                # exists to avoid.
                item = (p.get("items") or [{}])[0]
                price = item.get("price") or {}
                regular = price.get("regular")
                promo = price.get("promo")
                row = {
                    "name": name,
                    "matched": True,
                    "productId": p.get("productId"),
                    "description": p.get("description"),
                    "brand": p.get("brand"),
                }
                # Only claim a price when a location was asked for AND a number
                # came back. No location means Kroger sends none, and a missing
                # price must stay missing rather than becoming zero.
                if req.locationId and isinstance(regular, (int, float)) and regular > 0:
                    row["price"] = round(float(regular), 2)
                    # promo 0 means "no sale", not "free".
                    if isinstance(promo, (int, float)) and promo > 0:
                        row["promoPrice"] = round(float(promo), 2)
                    if item.get("size"):
                        row["size"] = item.get("size")
                    if item.get("soldBy"):
                        row["soldBy"] = item.get("soldBy")
                results.append(row)
        # The prices exist here and nowhere else. Recorded before returning, and
        # wrapped in its OWN try — see the note above `_price_observations`.
        # Without this guard a throw while BUILDING the records would be caught
        # by the handler below, which returns `{"error": "unavailable",
        # "results": []}`: a governance write failing would have thrown away the
        # prices it exists to keep, and told the host their store was down.
        try:
            await _persist_observations(
                _price_observations(req, results, datetime.datetime.now(datetime.timezone.utc))
            )
        except Exception as e:  # noqa: BLE001 — recording must never reach the host
            log.warning("price observation step skipped: %s", e)
        return {"configured": True, "results": results}
    except Exception as e:  # network/timeout — degrade, never 500 the host
        log.warning("Kroger search-list failed: %s", e)
        return {"configured": True, "error": "unavailable", "results": []}


@router.get("/kroger/locations")
async def kroger_locations(zip: str):
    """Find up to 3 nearby Kroger stores by ZIP so the client can pick one.

    Returns [{locationId, name, address}]. The chosen locationId can be passed
    back into /kroger/search-list for store-specific product matches.
    """
    if not _configured():
        return {"configured": False}

    token = await _get_token()
    if not token:
        return {"configured": True, "error": "auth_failed", "locations": []}

    zip_code = (zip or "").strip()
    if not zip_code:
        return {"configured": True, "locations": [], "error": "no_zip"}

    url = f"{KROGER_API_BASE.rstrip('/')}/v1/locations"
    params = {"filter.zipCode.near": zip_code, "filter.limit": 3}
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params, headers=headers)
        if resp.status_code >= 400:
            log.warning("Kroger locations %s: %s", resp.status_code, resp.text[:300])
            return {"configured": True, "error": f"kroger_{resp.status_code}", "locations": []}
        data = resp.json()
        locations = []
        for loc in (data.get("data") or []):
            addr = loc.get("address") or {}
            parts = [
                addr.get("addressLine1"),
                addr.get("city"),
                addr.get("state"),
                addr.get("zipCode"),
            ]
            address = ", ".join(p for p in parts if p)
            locations.append({
                "locationId": loc.get("locationId"),
                "name": loc.get("name"),
                "address": address,
            })
        return {"configured": True, "locations": locations}
    except Exception as e:  # network/timeout — degrade, never 500 the host
        log.warning("Kroger locations failed: %s", e)
        return {"configured": True, "error": "unavailable", "locations": []}
