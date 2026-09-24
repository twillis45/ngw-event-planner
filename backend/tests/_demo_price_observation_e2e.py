"""DEMO (not a gate) — a real shelf price becomes a real row in a real table.

Prefixed `_` and named _demo so pytest's default collection skips it. Run it:

    DEMO_DB_URL=postgres://ngw@/ngwdemo?host=/tmp/pgdemo&port=5455 \
      python3 backend/tests/_demo_price_observation_e2e.py

WHAT IS REAL HERE AND WHAT IS NOT. Real: the FastAPI app, the route, the record
builder, asyncpg, the `kas_records` table created from backend/migrations/0008,
and the row that comes back out of it. Stubbed: the Kroger HTTP boundary only —
the OAuth token exchange and the /v1/products response — because this container
holds no Kroger credentials. The payload used is the shape from Kroger's own
published reference, which the router's comments quote:
`data[].items[].price.regular|.promo`, `.size`, `.soldBy`.

So this proves the half that had never executed: request -> price -> record ->
INSERT -> readable row. It does NOT prove Kroger returns what we think; the
production call is what does that.

── WHY THIS DRIVES THE ROUTE DIRECTLY AND NOT THROUGH TestClient ────────────

The first version used `fastapi.testclient.TestClient`, and it LIED. Steps 4
and 5 reported idempotency working — the row count stayed at 2 across three
pulls — while the logs showed every write after the first failing with
"Event loop is closed". The count was flat because nothing was written, and the
demo presented that as the feature working.

Cause: TestClient runs each request in its own event loop, while `db.py` caches
one asyncpg pool in a module global. The pool created during the first request
is bound to a loop that is dead by the second. That is a HARNESS artifact, not
a production bug — uvicorn serves every request on one long-lived loop, which is
the condition the global pool is written for — but it makes TestClient unable to
demonstrate anything about persistence.

So the route coroutine is awaited directly, inside one loop. Less HTTP, and
every assertion below is about something that actually happened.
"""
import asyncio
import json
import logging
import os
import sys

# INFO on purpose: the writer's success line is the proof that a write HAPPENED.
# Without it, a flat row count across repeat pulls is ambiguous — it reads the
# same whether the id is idempotent or the write silently failed, which is
# exactly how the first version of this demo reported a feature that was not
# running.
logging.basicConfig(level=logging.INFO, format='   [log] %(message)s')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

DB = os.environ["DEMO_DB_URL"]
os.environ["DATABASE_URL"] = DB

import httpx  # noqa: E402

from app.routers import kroger as k  # noqa: E402


# ── The Kroger boundary, stubbed at the shape their reference documents ──────
KROGER_PAYLOAD = {
    "ice": {"productId": "0001111041660", "description": "Kroger Ice Bag",
            "brand": "Kroger", "price": {"regular": 2.99, "promo": 0},
            "size": "7 lb", "soldBy": "UNIT"},
    "charcoal": {"productId": "0002270000937", "description": "Kingsford Original Charcoal",
                 "brand": "Kingsford", "price": {"regular": 12.49, "promo": 9.99},
                 "size": "16 lb", "soldBy": "UNIT"},
    "buns": {"productId": "0001111087324", "description": "Kroger Hamburger Buns",
             "brand": "Kroger", "price": {"regular": 1.79, "promo": 0},
             "size": "8 ct", "soldBy": "UNIT"},
}


class _Resp:
    status_code = 200

    def __init__(self, term):
        key = next((k_ for k_ in KROGER_PAYLOAD if k_ in term.lower()), None)
        p = KROGER_PAYLOAD.get(key)
        self._d = {"data": [{
            "productId": p["productId"], "description": p["description"],
            "brand": p["brand"],
            "items": [{"price": p["price"], "size": p["size"], "soldBy": p["soldBy"]}],
        }]} if p else {"data": []}

    def json(self):
        return self._d


class _Client:
    def __init__(self, *a, **kw):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, _url, params=None, headers=None):
        return _Resp(str((params or {}).get("filter.term", "")))


async def main():
    import asyncpg

    # Configure the router the way a deployed backend is configured.
    k.KROGER_CLIENT_ID = "demo-id"
    k.KROGER_CLIENT_SECRET = "demo-secret"
    k._token_cache["token"] = "demo-token"
    k._token_cache["expires_at"] = 9e18          # never refresh during the demo
    httpx.AsyncClient = _Client                   # the only stub

    conn0 = await asyncpg.connect(DB)
    await conn0.execute("truncate kas_records")   # a clean run, every run
    await conn0.close()

    async def price(payload):
        """Await the real route coroutine, in THIS loop. See the header."""
        return await k.kroger_search_list(k.SearchListRequest(**payload))

    print("\n" + "=" * 74)
    print("1. STATUS — two capabilities, reported separately")
    print("=" * 74)
    print("   GET /api/shopping/kroger/status ->", json.dumps(k.kroger_status()))

    print("\n" + "=" * 74)
    print("2. A HOST PRICES THEIR LIST at store 01400376")
    print("=" * 74)
    body = {
        "assetId": "Get-Together",
        "locationId": "01400376",
        "items": [
            {"name": "Ice (for chilling + drinks)", "term": "ice", "purchaseId": "p_ice"},
            {"name": "Charcoal + lighter", "term": "charcoal", "purchaseId": "p_fuel"},
            # DELIBERATELY UNATTRIBUTED — a line the host typed, no corpus row.
            {"name": "Buns", "term": "buns"},
        ],
    }
    r = await price(body)
    for row in r["results"]:
        print(f"   {row['name']:<32} ${row.get('price', '—'):<7} {row.get('size', '')}")

    print("\n" + "=" * 74)
    print("3. WHAT LANDED IN kas_records — read back from postgres")
    print("=" * 74)
    conn = await asyncpg.connect(DB)
    rows = await conn.fetch(
        "select id, kind, asset_id, created_by, data from kas_records order by id")
    print(f"   {len(rows)} row(s)\n")
    for row in rows:
        d = json.loads(row["data"])
        print(f"   id         {row['id']}")
        print(f"   kind       {row['kind']}   created_by  {row['created_by']}")
        print(f"   fieldPath  {d['fieldPath']}")
        print(f"   statement  {d['statement']}")
        print(f"   price      regular={d['price']['regular']}  promo={d['price']['promo']}"
              f"  size={d['price']['size']}  store={d['price']['locationId']}")
        print()

    print("=" * 74)
    print("4. THE SAME HOST PRICES IT AGAIN, and a second host does too")
    print("=" * 74)
    await price(body)
    await price(body)
    n = await conn.fetchval("select count(*) from kas_records")
    print(f"   three pulls total, same store, same month -> {n} row(s).")
    print("   Idempotent per (row, store, month): one shelf is one notice, not three.")

    print("\n" + "=" * 74)
    print("5. A DIFFERENT STORE IS A GENUINELY INDEPENDENT LOOK")
    print("=" * 74)
    await price({**body, "locationId": "01400999"})
    ids = [r_["id"] for r_ in await conn.fetch("select id from kas_records order by id")]
    n2 = await conn.fetchval("select count(*) from kas_records")
    print(f"   -> {n2} row(s). The new store adds its own:")
    for i in ids:
        print(f"      {i}")

    print("\n" + "=" * 74)
    print("6. UNATTRIBUTED LINES WERE PRICED AND NOT RECORDED")
    print("=" * 74)
    buns = [r_ for r_ in r["results"] if r_["name"] == "Buns"][0]
    kept = await conn.fetchval(
        "select count(*) from kas_records where data::text like '%Hamburger%'")
    print(f"   'Buns' priced at ${buns['price']} and produced {kept} observation(s).")
    print("   It carried no purchaseId, so there is no row to attribute it to.")
    print("   Matching \"Buns\" back to a corpus row by string would be a guess.")

    print("\n" + "=" * 74)
    print("7. NO HOST DATA IN ANY ROW")
    print("=" * 74)
    blob = "".join(json.dumps(json.loads(r_["data"])).lower()
                   for r_ in await conn.fetch("select data from kas_records"))
    for f in ("eventid", "event_id", "zip", "userid", "email", "guestcount"):
        assert f not in blob, f"LEAKED: {f}"
    print("   checked eventid / event_id / zip / userid / email / guestcount — none present.")
    print("   A Kroger locationId is a shop, not a person.\n")

    await conn.close()


asyncio.run(main())
