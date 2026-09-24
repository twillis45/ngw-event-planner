#!/usr/bin/env python3
"""What does Kroger ACTUALLY return? — a read-only probe, run wherever the keys are.

WHY THIS EXISTS. The question "what other fields does the Kroger API offer" could
not be answered from this repo's machine: developer.kroger.com renders its
reference client-side, so the field names are absent from the HTML (even
`soldBy`, which we already consume, appears zero times), and the docs site could
not be rendered headlessly without weakening TLS verification against the egress
proxy. A live response is a better source than a docs page in any case — it is
what the integration will actually receive.

WHAT IT DOES. One OAuth token exchange and ONE /v1/products call, then it prints
the SHAPE of the response: every key at every level, with each value's type and a
short sample. It then splits those keys into what `kroger.py` currently reads and
what it ignores, so the answer is actionable rather than a list.

WHAT IT DOES NOT DO. It writes nothing, touches no database, and creates no
observation. It costs ONE call against the 10,000/day products ceiling.

USAGE — on the backend, where KROGER_CLIENT_ID / KROGER_CLIENT_SECRET are set:

    python3 backend/scripts/kroger_probe.py --term ice --location <locationId>

A locationId is REQUIRED to see any price fields at all: Kroger returns price
only when filter.locationId is supplied. Get one with --zip:

    python3 backend/scripts/kroger_probe.py --zip 21201 --stores
"""
import argparse
import base64
import json
import os
import sys

import httpx

BASE = os.environ.get("KROGER_API_BASE", "https://api.kroger.com")
CID = os.environ.get("KROGER_CLIENT_ID")
SECRET = os.environ.get("KROGER_CLIENT_SECRET")

# Exactly what backend/app/routers/kroger.py consumes today. Kept as a literal
# so the probe's "we ignore this" column is a real comparison and not a guess;
# if the router starts reading a new field, this list is what to update.
CONSUMED = {
    "productId", "description", "brand",
    "items[].price.regular", "items[].price.promo",
    "items[].size", "items[].soldBy",
}


def shape(node, path="", out=None, depth=0):
    """Collect `path -> (type, sample)` for every key, arrays collapsed to [0]."""
    out = {} if out is None else out
    if depth > 6:
        return out
    if isinstance(node, dict):
        for k, v in node.items():
            shape(v, f"{path}.{k}" if path else k, out, depth + 1)
    elif isinstance(node, list):
        if node:
            shape(node[0], f"{path}[]", out, depth + 1)
        else:
            out[path + "[]"] = ("array", "(empty)")
    else:
        s = str(node)
        out[path] = (type(node).__name__, s if len(s) <= 40 else s[:37] + "...")
    return out


def token():
    if not (CID and SECRET):
        sys.exit("KROGER_CLIENT_ID / KROGER_CLIENT_SECRET are not set in this environment.")
    basic = base64.b64encode(f"{CID}:{SECRET}".encode()).decode()
    r = httpx.post(
        f"{BASE.rstrip('/')}/v1/connect/oauth2/token",
        headers={"Authorization": f"Basic {basic}",
                 "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "client_credentials", "scope": "product.compact"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--term", default="ice")
    ap.add_argument("--location", default=None, help="locationId — REQUIRED for price fields")
    ap.add_argument("--zip", dest="zip_code", default=None)
    ap.add_argument("--stores", action="store_true", help="probe /v1/locations instead")
    ap.add_argument("--raw", action="store_true", help="also dump the raw JSON")
    a = ap.parse_args()

    hdr = {"Authorization": f"Bearer {token()}", "Accept": "application/json"}

    if a.stores:
        url, params = f"{BASE.rstrip('/')}/v1/locations", {
            "filter.zipCode.near": a.zip_code or "21201", "filter.limit": 3}
    else:
        url, params = f"{BASE.rstrip('/')}/v1/products", {
            "filter.term": a.term, "filter.limit": 1}
        if a.location:
            params["filter.locationId"] = a.location
        else:
            print("!! no --location: Kroger will return NO price fields.\n")

    resp = httpx.get(url, params=params, headers=hdr, timeout=20)
    print(f"GET {url}\n    {params}\n    HTTP {resp.status_code}\n")
    resp.raise_for_status()
    body = resp.json()

    if a.raw:
        print(json.dumps(body, indent=2)[:6000], "\n")

    first = (body.get("data") or [None])[0]
    if first is None:
        print("no results — try a different --term or --zip")
        return

    fields = shape(first)
    used = [f for f in sorted(fields) if f in CONSUMED]
    spare = [f for f in sorted(fields) if f not in CONSUMED]

    print(f"{len(fields)} field(s) on the first result\n")
    print(f"── READ BY kroger.py ({len(used)}) " + "─" * 30)
    for f in used:
        t, s = fields[f]
        print(f"   {f:<44} {t:<6} {s}")
    print(f"\n── AVAILABLE AND IGNORED ({len(spare)}) " + "─" * 25)
    for f in spare:
        t, s = fields[f]
        print(f"   {f:<44} {t:<6} {s}")
    print("\nOne products call spent. Ceiling is 10,000/day.")


if __name__ == "__main__":
    main()
