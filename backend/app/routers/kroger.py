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

HONESTY:
  • The client id/secret live only on the server — never shipped in the client.
  • With no creds every endpoint returns {"configured": false} so the client can
    fall back gracefully (no fake matches, no broken cart promise).
  • Network/4xx failures degrade to {"configured": true, "error": "..."} — never
    a 500 in the host's face.
"""
import base64
import logging
import os
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
    quantity: Optional[float] = 1
    unit: Optional[str] = "each"


class SearchListRequest(BaseModel):
    items: List[LineItem] = []
    locationId: Optional[str] = None


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

    names = [
        (it.name or "").strip()
        for it in req.items
        if it and (it.name or "").strip()
    ]
    if not names:
        return {"configured": True, "results": [], "error": "no_items"}

    base = f"{KROGER_API_BASE.rstrip('/')}/v1/products"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    results = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for name in names:
                params = {"filter.term": name, "filter.limit": 1}
                if req.locationId:
                    params["filter.locationId"] = req.locationId
                resp = await client.get(base, params=params, headers=headers)
                if resp.status_code >= 400:
                    log.warning(
                        "Kroger products %s for %r: %s",
                        resp.status_code, name, resp.text[:200],
                    )
                    results.append({"name": name, "matched": False})
                    continue
                data = resp.json()
                products = data.get("data") or []
                if not products:
                    results.append({"name": name, "matched": False})
                    continue
                p = products[0]
                results.append({
                    "name": name,
                    "matched": True,
                    "productId": p.get("productId"),
                    "description": p.get("description"),
                    "brand": p.get("brand"),
                })
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
