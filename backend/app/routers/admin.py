"""Admin / Support console API — Admin v1 (A1 foundation).

Every route requires ``require_admin`` (Supabase ``app_metadata.role`` in
{'admin','support'}). Every meaningful action is written to ``admin_audit_log``.

HONESTY: the app is localStorage-first, so this backend only ever sees
server-synced data. Tools built on top of this router MUST tell the operator that
items existing only in a user's browser are not visible here. See
docs/ecosystem/ADMIN_SUPPORT_V1_BUILD_PLAN.md.
"""
import json as _json
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import get_pool

log = logging.getLogger("ngw.admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def audit(
    actor: dict,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Append an immutable admin-action record.

    Best-effort: an audit-write failure must not break the operator's request,
    but it is logged at ERROR so audit gaps are visible rather than silent.
    """
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """insert into admin_audit_log
                       (actor_id, actor_name, action, target_type, target_id, metadata)
                   values ($1, $2, $3, $4, $5, $6::jsonb)""",
                str(actor.get("id")),
                actor.get("email"),
                action,
                target_type,
                target_id,
                _json.dumps(metadata or {}),
            )
    except Exception as e:  # noqa: BLE001 — never block the request on audit
        log.error("admin audit write failed action=%s: %s", action, e)


@router.get("/whoami")
async def whoami(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Confirms the admin gate end-to-end and returns the resolved principal."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "whoami")
    return {"ok": True, "principal": actor}


@router.get("/audit")
async def list_audit(
    limit: int = 100,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Read-only view of recent admin actions (immutable log)."""
    actor = await require_admin(authorization, x_planner_token)
    limit = max(1, min(limit, 500))
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """select id, actor_id, actor_name, action, target_type, target_id,
                      metadata, created_at
                 from admin_audit_log
                order by created_at desc
                limit $1""",
            limit,
        )
    # asyncpg returns jsonb as a string; parse so the client gets a real object.
    out = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("metadata"), str):
            try:
                d["metadata"] = _json.loads(d["metadata"])
            except Exception:
                pass
        out.append(d)
    return {"rows": out}


# ─── A3: User Lookup ──────────────────────────────────────────────────────────
# Honesty: counts come from server-synced state only. event_owners records an
# event the first time its owner touches it while authenticated; events that live
# solely in a user's browser (localStorage, never synced) are not counted here.

_COVERAGE = (
    "Server-synced data only. Events/clients that exist only in a user's browser "
    "(localStorage, never synced) are not visible or counted here."
)


@router.get("/users")
async def search_users(
    q: str = "",
    limit: int = 25,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Search users by email / name / id. Empty q → most recent signups."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "search_users", metadata={"q": q})
    limit = max(1, min(limit, 100))
    q = (q or "").strip()

    pool = await get_pool()
    async with pool.acquire() as conn:
        if q:
            rows = await conn.fetch(
                """select u.id, u.email,
                          u.raw_user_meta_data->>'name' as name,
                          u.raw_app_meta_data->>'role'  as role,
                          u.created_at, u.last_sign_in_at,
                          (select count(*) from event_owners eo
                             where eo.owner_id = u.id::text) as event_count
                     from auth.users u
                    where u.email ilike '%'||$1||'%'
                       or (u.raw_user_meta_data->>'name') ilike '%'||$1||'%'
                       or u.id::text = $1
                    order by u.created_at desc
                    limit $2""",
                q, limit,
            )
        else:
            rows = await conn.fetch(
                """select u.id, u.email,
                          u.raw_user_meta_data->>'name' as name,
                          u.raw_app_meta_data->>'role'  as role,
                          u.created_at, u.last_sign_in_at,
                          (select count(*) from event_owners eo
                             where eo.owner_id = u.id::text) as event_count
                     from auth.users u
                    order by u.created_at desc
                    limit $1""",
                limit,
            )
    return {"coverage": _COVERAGE, "users": [dict(r) for r in rows]}


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Full account + server-synced workspaces and event count for one user."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "view_user", target_type="user", target_id=user_id)

    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            u = await conn.fetchrow(
                """select u.id, u.email,
                          u.raw_user_meta_data->>'name'     as name,
                          u.raw_app_meta_data->>'role'      as role,
                          u.raw_app_meta_data->>'provider'  as provider,
                          u.created_at, u.last_sign_in_at, u.email_confirmed_at
                     from auth.users u where u.id = $1::uuid""",
                user_id,
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user id")
        if not u:
            raise HTTPException(status_code=404, detail="User not found")

        workspaces = await conn.fetch(
            """select s.id, s.name, s.plan, sm.role, s.created_at
                 from studio_members sm join studios s on s.id = sm.studio_id
                where sm.user_id = $1::uuid
                order by s.created_at desc""",
            user_id,
        )
        event_count = await conn.fetchval(
            "select count(*) from event_owners where owner_id = $1", user_id,
        )

    return {
        "coverage": _COVERAGE,
        "user": dict(u),
        "workspaces": [dict(r) for r in workspaces],
        "event_count": event_count,
    }


# ─── A3: Support Notes (append-only) ──────────────────────────────────────────

class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.get("/users/{user_id}/notes")
async def list_notes(
    user_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "list_notes", target_type="user", target_id=user_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """select id, subject_user_id, author_id, author_name, body, created_at
                 from admin_support_notes
                where subject_user_id = $1
                order by created_at desc""",
            user_id,
        )
    return {"notes": [dict(r) for r in rows]}


@router.post("/users/{user_id}/notes")
async def create_note(
    user_id: str,
    note: NoteIn,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Append a support note. Append-only — corrections are new notes, not edits."""
    actor = await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """insert into admin_support_notes
                   (subject_user_id, author_id, author_name, body)
               values ($1, $2, $3, $4)
               returning id, subject_user_id, author_id, author_name, body, created_at""",
            user_id, str(actor.get("id")), actor.get("email"), note.body.strip(),
        )
    await audit(actor, "add_note", target_type="user", target_id=user_id,
                metadata={"note_id": str(row["id"])})
    return {"note": dict(row)}
