"""Instacart — turn a host's shopping list into a pre-filled cart for pickup/delivery.

Uses the Instacart Developer Platform (IDP) "Products Link" / shopping-list API:
the app POSTs the food-plan line items, IDP fuzzy-matches them to real products
and returns a `products_link_url` that opens a ready-to-checkout Instacart list
the host completes for pickup or delivery.

GETTING A KEY (host/operator action):
  1. Sign up at https://www.instacart.com/developer (Instacart Developer Platform).
  2. Create an app; copy the API key (Bearer token).
  3. Set INSTACART_API_KEY in the backend env. For sandbox testing set
     INSTACART_API_BASE=https://connect.dev.instacart.tools (default is production
     https://connect.instacart.com).

HONESTY:
  • The KEY lives only on the server — never shipped in the client bundle.
  • With no key the endpoint returns {"configured": false} and the client falls
    back to the plain Instacart search link (no fake cart, no broken promise).
  • We send only the host's own line items (name/qty/unit) — nothing invented.
"""
import logging
import os
from typing import List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

log = logging.getLogger("ngw.instacart")
router = APIRouter(prefix="/api/shopping", tags=["shopping"])

INSTACART_API_KEY = os.environ.get("INSTACART_API_KEY")
INSTACART_API_BASE = os.environ.get("INSTACART_API_BASE", "https://connect.instacart.com")


class LineItem(BaseModel):
    name: str
    quantity: Optional[float] = 1
    unit: Optional[str] = "each"


class CartRequest(BaseModel):
    title: Optional[str] = "Event Boss shopping list"
    items: List[LineItem] = []


@router.get("/instacart/status")
def instacart_status():
    """Lets the client decide whether to show 'Get it delivered' vs the fallback link."""
    return {"configured": bool(INSTACART_API_KEY)}


@router.post("/instacart-cart")
async def instacart_cart(req: CartRequest):
    # Honest degrade — no key, no fake cart. The client falls back to the search link.
    if not INSTACART_API_KEY:
        return {"configured": False}

    line_items = [
        {
            "name": (it.name or "").strip(),
            "quantity": it.quantity if (it.quantity and it.quantity > 0) else 1,
            "unit": (it.unit or "each").strip() or "each",
            "display_text": (it.name or "").strip(),
        }
        for it in req.items
        if it and (it.name or "").strip()
    ]
    if not line_items:
        return {"configured": True, "url": None, "error": "no_items"}

    payload = {
        "title": (req.title or "Event Boss shopping list")[:120],
        "link_type": "shopping_list",
        "line_items": line_items,
    }
    url = f"{INSTACART_API_BASE.rstrip('/')}/idp/v1/products/products_link"
    headers = {
        "Authorization": f"Bearer {INSTACART_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code >= 400:
            log.warning("Instacart products_link %s: %s", resp.status_code, resp.text[:300])
            return {"configured": True, "url": None, "error": f"instacart_{resp.status_code}"}
        data = resp.json()
        link = data.get("products_link_url") or data.get("url")
        return {"configured": True, "url": link}
    except Exception as e:  # network/timeout — degrade, never 500 the host
        log.warning("Instacart call failed: %s", e)
        return {"configured": True, "url": None, "error": "unavailable"}
