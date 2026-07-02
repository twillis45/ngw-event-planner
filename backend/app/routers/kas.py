"""KAS knowledge stores — server-backed admin persistence (KEP-3 Bundle B).

Multi-admin persistence for the manufacturing objects (observations / evidence / findings /
knowledge overrides / campaigns). The server is a DUMB store: all merge/lifecycle logic runs
CLIENT-SIDE (one JS implementation, never duplicated here). Admin governance metadata: no
host data, no PII. Mirrors kcr.py — optimistic concurrency via updated_at + audit logging.

Endpoints (require_admin — Supabase app_metadata.role in {admin, support}):
  GET  /api/admin/kas/{kind}  — list records of a kind (each carries `_serverUpdatedAt`).
  POST /api/admin/kas/{kind}  — upsert a batch; returns {upserted, conflicts:[{id, serverUpdatedAt}]}.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import get_pool

router = APIRouter(prefix="/api/admin", tags=["kas"])

MAX_BATCH = 1000
KAS_KINDS = {"observation", "evidence", "finding", "override", "campaign"}


class KasBatch(BaseModel):
    records: list[dict] = Field(default_factory=list)


def _parse_iso(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _asset_of(r: dict):
    return r.get("assetId") or r.get("asset") or (r.get("affectedAssets") or [None])[0]


@router.get("/kas/{kind}")
async def list_kas(
    kind: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    await require_admin(authorization, x_planner_token)
    if kind not in KAS_KINDS:
        raise HTTPException(404, f"Unknown KAS kind '{kind}'")
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select data, updated_at from kas_records where kind=$1 order by updated_at desc", kind
        )
    out = []
    for r in rows:
        d = r["data"]
        obj = json.loads(d) if isinstance(d, str) else dict(d)
        obj["_serverUpdatedAt"] = r["updated_at"].isoformat() if r["updated_at"] else None
        out.append(obj)
    return out


@router.post("/kas/{kind}")
async def upsert_kas(
    kind: str,
    payload: KasBatch,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_admin(authorization, x_planner_token)
    if kind not in KAS_KINDS:
        raise HTTPException(404, f"Unknown KAS kind '{kind}'")
    items = [r for r in (payload.records or []) if isinstance(r, dict) and r.get("id")]
    if len(items) > MAX_BATCH:
        raise HTTPException(413, f"Too many records in one batch (max {MAX_BATCH})")
    if not items:
        return {"upserted": 0, "conflicts": []}

    upserted, conflicts = 0, []
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for r in items:
                base = _aware(_parse_iso(r.get("_serverUpdatedAt")))
                cur = await conn.fetchval("select updated_at from kas_records where id=$1", r["id"])
                # Optimistic concurrency: a stale write (older base than the stored row) is rejected.
                if cur is not None and base is not None and _aware(cur) > base:
                    conflicts.append({"id": r["id"], "serverUpdatedAt": cur.isoformat()})
                    continue
                clean = {kk: vv for kk, vv in r.items() if not kk.startswith("_")}  # strip sync meta
                await conn.execute(
                    """
                    insert into kas_records (id, kind, data, asset_id, created_by, updated_at)
                    values ($1, $2, $3::jsonb, $4, $5, now())
                    on conflict (id) do update set
                      kind=excluded.kind, data=excluded.data, asset_id=excluded.asset_id,
                      created_by=excluded.created_by, updated_at=now()
                    """,
                    clean["id"], kind, json.dumps(clean), _asset_of(clean), clean.get("createdBy") or clean.get("source"),
                )
                upserted += 1
            if upserted or conflicts:
                await conn.execute(
                    "insert into admin_audit_log (actor_id, actor_name, action, target_type, target_id, metadata) values ($1,$2,$3,$4,$5,$6::jsonb)",
                    str(principal.get("id") or "unknown"), principal.get("email"),
                    f"kas_upsert:{kind}", "kas", (items[0]["id"] if len(items) == 1 else f"batch:{len(items)}"),
                    json.dumps({"kind": kind, "upserted": upserted, "conflicts": len(conflicts)}),
                )
    return {"upserted": upserted, "conflicts": conflicts}
