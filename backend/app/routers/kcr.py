"""Knowledge Change Request (KCR) store — server-backed admin backlog (KCR-4 / KCR-5).

Admin-gated persistence for the governed knowledge-change work-objects. The server is a
DUMB store: it returns all KCRs and upserts what the client sends. The progress-preserving
merge (syncIntake) runs CLIENT-SIDE in one JS implementation — never duplicated here.
KCRs are admin governance metadata: no host data, no PII.

KCR-5 hardening:
  • Optimistic concurrency — the client sends the `updated_at` it last saw per KCR
    (`_serverUpdatedAt`); if the stored row is NEWER, the write is stale ⇒ rejected as a
    conflict (never silently overwriting another admin's progress).
  • Audit logging — every accepted server write is recorded to admin_audit_log.

Endpoints (require_admin — Supabase app_metadata.role in {admin, support}):
  GET  /api/admin/kcrs   — list KCRs (each object carries `_serverUpdatedAt` from the column).
  POST /api/admin/kcrs   — upsert a batch; returns {upserted, conflicts:[{id, serverUpdatedAt}]}.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import get_pool

router = APIRouter(prefix="/api/admin", tags=["kcr"])

MAX_BATCH = 500


class KcrBatch(BaseModel):
    kcrs: list[dict] = Field(default_factory=list)


def _cols(k: dict) -> dict:
    return {
        "asset_id": k.get("assetId"), "asset_kind": k.get("assetKind"),
        "type": k.get("type"), "trigger": k.get("trigger"), "status": k.get("status"),
        "priority": k.get("priority"), "created_by": k.get("createdBy"),
    }


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


@router.get("/kcrs")
async def list_kcrs(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("select data, updated_at from kcr order by updated_at desc")
    out = []
    for r in rows:
        d = r["data"]
        obj = json.loads(d) if isinstance(d, str) else dict(d)
        # Merge the row's updated_at so the client can send it back as the concurrency base.
        obj["_serverUpdatedAt"] = r["updated_at"].isoformat() if r["updated_at"] else None
        out.append(obj)
    return out


@router.post("/kcrs")
async def upsert_kcrs(
    payload: KcrBatch,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_admin(authorization, x_planner_token)
    items = [k for k in (payload.kcrs or []) if isinstance(k, dict) and k.get("id")]
    if len(items) > MAX_BATCH:
        raise HTTPException(413, f"Too many KCRs in one batch (max {MAX_BATCH})")
    if not items:
        return {"upserted": 0, "conflicts": []}

    upserted, conflicts = 0, []
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for k in items:
                base = _aware(_parse_iso(k.get("_serverUpdatedAt")))
                cur = await conn.fetchval("select updated_at from kcr where id=$1", k["id"])
                # Optimistic concurrency: if the stored row is newer than the base the
                # client saw, this write is stale ⇒ reject it (keep the newer progress).
                if cur is not None and base is not None and _aware(cur) > base:
                    conflicts.append({"id": k["id"], "serverUpdatedAt": cur.isoformat()})
                    continue
                clean = {kk: vv for kk, vv in k.items() if not kk.startswith("_")}  # strip sync meta
                c = _cols(clean)
                await conn.execute(
                    """
                    insert into kcr (id, data, asset_id, asset_kind, type, trigger, status, priority, created_by, updated_at)
                    values ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, now())
                    on conflict (id) do update set
                      data=excluded.data, asset_id=excluded.asset_id, asset_kind=excluded.asset_kind,
                      type=excluded.type, trigger=excluded.trigger, status=excluded.status,
                      priority=excluded.priority, created_by=excluded.created_by, updated_at=now()
                    """,
                    clean["id"], json.dumps(clean), c["asset_id"], c["asset_kind"], c["type"],
                    c["trigger"], c["status"], c["priority"], c["created_by"],
                )
                upserted += 1
            # Audit the write (best-effort inside the txn — admin_audit_log, 0005).
            if upserted or conflicts:
                await conn.execute(
                    "insert into admin_audit_log (actor_id, actor_name, action, target_type, target_id, metadata) values ($1,$2,$3,$4,$5,$6::jsonb)",
                    str(principal.get("id") or "unknown"), principal.get("email"),
                    "kcr_upsert", "kcr", (items[0]["id"] if len(items) == 1 else f"batch:{len(items)}"),
                    json.dumps({"upserted": upserted, "conflicts": len(conflicts)}),
                )
    return {"upserted": upserted, "conflicts": conflicts}
