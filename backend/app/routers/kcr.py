"""Knowledge Change Request (KCR) store — server-backed admin backlog (KCR-4).

Admin-gated persistence for the governed knowledge-change work-objects. The server is a
DUMB store: it returns all KCRs and upserts whatever the client sends (authoritative,
ON CONFLICT (id)). The progress-preserving merge (syncIntake) runs CLIENT-SIDE in one JS
implementation — never duplicated here (EP-1). KCRs are admin governance metadata: no
host data, no PII.

Endpoints (all require_admin — Supabase app_metadata.role in {admin, support}):
  GET  /api/admin/kcrs         — list all KCRs (the full `data` JSON), newest first.
  POST /api/admin/kcrs         — upsert a batch of KCRs (authoritative, keyed by id).

See migrations/0007_kcr.sql and src/lib/knowledge/kcrStore.js.
"""
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import get_pool

router = APIRouter(prefix="/api/admin", tags=["kcr"])

MAX_BATCH = 500  # one intake sync of the whole corpus backlog fits comfortably.


class KcrBatch(BaseModel):
    kcrs: list[dict] = Field(default_factory=list)


def _cols(k: dict) -> dict:
    """Indexed-column projections pulled from the full KCR (best-effort; data is source of truth)."""
    return {
        "asset_id": k.get("assetId"),
        "asset_kind": k.get("assetKind"),
        "type": k.get("type"),
        "trigger": k.get("trigger"),
        "status": k.get("status"),
        "priority": k.get("priority"),
        "created_by": k.get("createdBy"),
    }


@router.get("/kcrs")
async def list_kcrs(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("select data from kcr order by updated_at desc")
    # Each row's `data` is the full KCR (id included). Return the list the client stores.
    import json
    out = []
    for r in rows:
        d = r["data"]
        out.append(json.loads(d) if isinstance(d, str) else d)
    return out


@router.post("/kcrs")
async def upsert_kcrs(
    payload: KcrBatch,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    await require_admin(authorization, x_planner_token)
    items = [k for k in (payload.kcrs or []) if isinstance(k, dict) and k.get("id")]
    if len(items) > MAX_BATCH:
        raise HTTPException(413, f"Too many KCRs in one batch (max {MAX_BATCH})")
    if not items:
        return {"upserted": 0}
    import json
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Authoritative upsert — incoming wins (the client already ran the progress-
        # preserving merge for intake; a direct advance is meant to overwrite).
        async with conn.transaction():
            for k in items:
                c = _cols(k)
                await conn.execute(
                    """
                    insert into kcr (id, data, asset_id, asset_kind, type, trigger, status, priority, created_by, updated_at)
                    values ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, now())
                    on conflict (id) do update set
                      data = excluded.data, asset_id = excluded.asset_id, asset_kind = excluded.asset_kind,
                      type = excluded.type, trigger = excluded.trigger, status = excluded.status,
                      priority = excluded.priority, created_by = excluded.created_by, updated_at = now()
                    """,
                    k["id"], json.dumps(k), c["asset_id"], c["asset_kind"], c["type"],
                    c["trigger"], c["status"], c["priority"], c["created_by"],
                )
    return {"upserted": len(items)}
