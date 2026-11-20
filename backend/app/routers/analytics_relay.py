"""
Analytics relay: the browser sends PostHog events here, and we pass them on.

Why: tracker blockers (Brave, uBlock, Safari content blockers) block PostHog's own
address, so those visitors' events were silently dropped and the funnel undercounted
by an unknown share. Our API's address isn't on those lists.

What it is NOT: an open proxy. Upstream hosts are fixed (PostHog US ingestion and
its asset host); only GET/POST, a small body cap, and a plain path pass. The body is
forwarded byte-for-byte (posthog-js may gzip it), so the client's before_send PII
strip still decides what leaves the browser. Cookies and Authorization never
forward. The visitor's "Turn this off" switch still stops the browser sending at all.

The client's IP is passed as X-Forwarded-For so PostHog's country lookup matches
what it saw before the relay (otherwise every visitor would look like our server).
"""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

log = logging.getLogger("ngw.analytics_relay")
router = APIRouter(prefix="/api/relay", tags=["analytics"])

INGEST_HOST = "https://us.i.posthog.com"
ASSET_HOST = "https://us-assets.i.posthog.com"
MAX_BODY = 1_000_000  # bytes; a posthog-js batch is a few KB
_SAFE_PATH = re.compile(r"^[A-Za-z0-9_\-./]{1,200}$")
_FORWARD_REQ = ("content-type", "content-encoding", "user-agent", "accept", "accept-language")
_FORWARD_RESP = ("content-type", "cache-control")

# One pooled client for the process; tests swap it for a MockTransport.
_client = httpx.AsyncClient(timeout=10.0)


def _upstream(path: str) -> str:
    if not _SAFE_PATH.match(path) or ".." in path or path.startswith("/"):
        raise HTTPException(status_code=404, detail="not found")
    host = ASSET_HOST if path.startswith("static/") else INGEST_HOST
    return f"{host}/{path}"


def _client_ip(request: Request) -> str:
    # Render puts the visitor first in X-Forwarded-For; fall back to the socket.
    fwd = request.headers.get("x-forwarded-for", "")
    first = fwd.split(",")[0].strip()
    return first or (request.client.host if request.client else "")


@router.api_route("/{path:path}", methods=["GET", "POST"])
async def relay(path: str, request: Request):
    url = _upstream(path)
    body = await request.body()
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="too large")
    headers = {k: v for k, v in request.headers.items() if k.lower() in _FORWARD_REQ}
    ip = _client_ip(request)
    if ip:
        headers["x-forwarded-for"] = ip
    try:
        up = await _client.request(
            request.method, url, params=request.query_params, content=body, headers=headers
        )
    except httpx.HTTPError:
        log.warning("analytics relay: upstream unreachable")  # never log the body
        return Response(status_code=502)
    out = {k: v for k, v in up.headers.items() if k.lower() in _FORWARD_RESP}
    return Response(content=up.content, status_code=up.status_code, headers=out)
