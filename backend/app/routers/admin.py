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


# ─── S1: Triage ───────────────────────────────────────────────────────────────
# The operator's landing hero — "who needs me right now." Every bucket is derived
# from server-synced state only, so each is honest about its blind spot: an empty
# bucket means "nothing visible server-side," not a guarantee the user is fine.

_TRIAGE_ITEM_LIMIT = 10  # per bucket — the hero shows a head, not an exhaustive list


@router.get("/triage")
async def triage(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Aggregate the account-lifecycle signals an operator should act on first.

    Buckets (server-derivable today):
      - needs_confirmation: signed up but never confirmed their email.
      - stalled_onboarding: confirmed, >24h old, zero server-synced events.
      - going_quiet: confirmed, has synced ≥1 event, no sign-in in 14 days.

    Invitation failures (S3) and error signals (A3-err) fold in here once wired.
    """
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "view_triage")

    pool = await get_pool()
    async with pool.acquire() as conn:
        now = await conn.fetchval("select now()")

        needs_confirmation = await conn.fetch(
            """select u.id, u.email, u.raw_user_meta_data->>'name' as name,
                      u.created_at, u.last_sign_in_at
                 from auth.users u
                where u.email_confirmed_at is null
                order by u.created_at desc
                limit $1""",
            _TRIAGE_ITEM_LIMIT,
        )
        needs_confirmation_total = await conn.fetchval(
            "select count(*) from auth.users where email_confirmed_at is null"
        )

        stalled = await conn.fetch(
            """select u.id, u.email, u.raw_user_meta_data->>'name' as name,
                      u.created_at, u.last_sign_in_at
                 from auth.users u
                where u.email_confirmed_at is not null
                  and u.created_at < now() - interval '24 hours'
                  and not exists (
                        select 1 from event_owners eo where eo.owner_id = u.id::text)
                order by u.created_at desc
                limit $1""",
            _TRIAGE_ITEM_LIMIT,
        )
        stalled_total = await conn.fetchval(
            """select count(*) from auth.users u
                where u.email_confirmed_at is not null
                  and u.created_at < now() - interval '24 hours'
                  and not exists (
                        select 1 from event_owners eo where eo.owner_id = u.id::text)"""
        )

        going_quiet = await conn.fetch(
            """select u.id, u.email, u.raw_user_meta_data->>'name' as name,
                      u.created_at, u.last_sign_in_at
                 from auth.users u
                where u.email_confirmed_at is not null
                  and u.last_sign_in_at < now() - interval '14 days'
                  and exists (
                        select 1 from event_owners eo where eo.owner_id = u.id::text)
                order by u.last_sign_in_at asc
                limit $1""",
            _TRIAGE_ITEM_LIMIT,
        )
        going_quiet_total = await conn.fetchval(
            """select count(*) from auth.users u
                where u.email_confirmed_at is not null
                  and u.last_sign_in_at < now() - interval '14 days'
                  and exists (
                        select 1 from event_owners eo where eo.owner_id = u.id::text)"""
        )

        # Stuck invitations: invitee already signed up, invite still unclaimed —
        # the classic claim_pending_invitations noise. Wrapped because
        # studio_invitations may be absent in some envs; never break the hero.
        try:
            stuck_invites = await conn.fetch(
                """select i.id as invite_id, i.email, i.created_at,
                          s.name as studio_name, au.id as invitee_user_id
                     from studio_invitations i
                     left join studios s on s.id = i.studio_id
                     join auth.users au on lower(au.email) = lower(i.email)
                    where i.used_at is null
                    order by i.created_at desc
                    limit $1""",
                _TRIAGE_ITEM_LIMIT,
            )
            stuck_invites_total = await conn.fetchval(
                """select count(*) from studio_invitations i
                    where i.used_at is null
                      and exists (select 1 from auth.users au
                                   where lower(au.email) = lower(i.email))"""
            )
        except Exception as e:  # noqa: BLE001 — table may be absent
            log.error("triage stuck_invites failed: %s", e)
            stuck_invites, stuck_invites_total = [], 0

        # Server-side errors in the last 24h — a system stat, not a person bucket.
        try:
            errors_24h = await conn.fetchval(
                "select count(*) from admin_error_log where created_at > now() - interval '24 hours'"
            )
        except Exception as e:  # noqa: BLE001 — table may not be migrated yet
            log.error("triage errors_24h failed: %s", e)
            errors_24h = 0

    buckets = [
        {
            "key": "needs_confirmation",
            "label": "Needs email confirmation",
            "hint": "Signed up but never confirmed — likely stuck at the front door.",
            "tone": "bad",
            "total": needs_confirmation_total,
            "items": [dict(r) for r in needs_confirmation],
        },
        {
            "key": "stalled_onboarding",
            "label": "Stalled onboarding",
            "hint": "Confirmed over a day ago, no synced event yet. May need a nudge.",
            "tone": "warn",
            "total": stalled_total,
            "items": [dict(r) for r in stalled],
        },
        {
            "key": "going_quiet",
            "label": "Going quiet",
            "hint": "Active before, but no sign-in in 14 days. Retention risk.",
            "tone": "warn",
            "total": going_quiet_total,
            "items": [dict(r) for r in going_quiet],
        },
        {
            "key": "stuck_invites",
            "label": "Stuck invitations",
            "hint": "Invited, already signed up, but the invite never attached — the claim_pending noise.",
            "tone": "bad",
            "total": stuck_invites_total,
            "items": [
                {"id": str(r["invitee_user_id"]), "email": r["email"],
                 "name": r["studio_name"], "created_at": r["created_at"],
                 "last_sign_in_at": None}
                for r in stuck_invites
            ],
        },
    ]
    needs_you = sum(b["total"] for b in buckets)

    return {
        "coverage": _COVERAGE,
        "generated_at": now,
        "needs_you": needs_you,
        "buckets": buckets,
        "system": {"errors_24h": errors_24h},
    }


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


# ─── S2: Workspace / Event diagnostics ────────────────────────────────────────
# Honesty: a studio is server-synced (name/plan/members), but its EVENTS are
# localStorage-first. `event_owners` only records an ownership pointer + first-sync
# timestamp the first time an owner touches an event while authenticated — never
# the event's name, type, readiness, or contents. So this surface can answer
# "who is in this workspace and which event ids have they synced," never "is this
# event ready." Every event row must say so.

@router.get("/workspaces")
async def search_workspaces(
    q: str = "",
    limit: int = 25,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Search studios by name. Empty q → most recently created."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "search_workspaces", metadata={"q": q})
    limit = max(1, min(limit, 100))
    q = (q or "").strip()

    pool = await get_pool()
    async with pool.acquire() as conn:
        if q:
            rows = await conn.fetch(
                """select s.id, s.name, s.plan, s.created_at,
                          (select count(*) from studio_members sm
                             where sm.studio_id = s.id) as member_count
                     from studios s
                    where s.name ilike '%'||$1||'%'
                    order by s.created_at desc
                    limit $2""",
                q, limit,
            )
        else:
            rows = await conn.fetch(
                """select s.id, s.name, s.plan, s.created_at,
                          (select count(*) from studio_members sm
                             where sm.studio_id = s.id) as member_count
                     from studios s
                    order by s.created_at desc
                    limit $1""",
                limit,
            )
    return {"coverage": _COVERAGE, "workspaces": [dict(r) for r in rows]}


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """One studio: members (with emails) + the synced-event pointers across them."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "view_workspace", target_type="workspace", target_id=workspace_id)

    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            s = await conn.fetchrow(
                """select s.id, s.name, s.plan, s.created_by, s.created_at
                     from studios s where s.id = $1::uuid""",
                workspace_id,
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid workspace id")
        if not s:
            raise HTTPException(status_code=404, detail="Workspace not found")

        members = await conn.fetch(
            """select sm.user_id, sm.role, sm.created_at as joined_at,
                      u.email, u.raw_user_meta_data->>'name' as name
                 from studio_members sm
                 left join auth.users u on u.id = sm.user_id
                where sm.studio_id = $1::uuid
                order by case sm.role when 'owner' then 0 when 'planner' then 1 else 2 end,
                         u.email nulls last""",
            workspace_id,
        )
        # Synced-event pointers owned by this studio's members. NB: an owner can
        # belong to >1 studio, so these are "events this studio's people synced,"
        # not "events that belong to this studio" — the app has no studio↔event link.
        events = await conn.fetch(
            """select eo.event_id, eo.owner_id, eo.owner_email, eo.created_at
                 from event_owners eo
                where eo.owner_id in (
                        select sm.user_id::text from studio_members sm
                         where sm.studio_id = $1::uuid)
                order by eo.created_at desc
                limit 50""",
            workspace_id,
        )

    return {
        "coverage": _COVERAGE,
        "workspace": dict(s),
        "members": [dict(r) for r in members],
        "events": [dict(r) for r in events],
        "events_note": (
            "Synced ownership pointers only — first-sync time, not event contents. "
            "Names, types, budgets, and readiness live in the planner's browser and "
            "are not visible here."
        ),
    }


# ─── S3: Invitation ops ───────────────────────────────────────────────────────
# `studio_invitations` is a Supabase table (RLS + claim_pending_invitations()
# RPC) in the same Postgres. A pending invite has used_at IS NULL. The high-value
# diagnostic: did the invited email already sign up? If yes but the invite is
# still unclaimed, that is the classic stuck invite that fuels the
# claim_pending_invitations 400 noise — surface it so ops can revoke or chase it.
# We never resend from here: the backend can't trigger Supabase's OTP email, and
# a button that can't send would be dishonest.

_INVITE_SELECT = """
    select i.id, i.email, i.role, i.created_at, i.used_at,
           s.id   as studio_id, s.name as studio_name,
           iu.email as invited_by_email,
           au.id  as invitee_user_id, au.created_at as invitee_signed_up_at
      from studio_invitations i
      left join studios    s  on s.id  = i.studio_id
      left join auth.users iu on iu.id = i.invited_by
      left join auth.users au on lower(au.email) = lower(i.email)
"""


@router.get("/invitations")
async def list_invitations(
    scope: str = "pending",   # 'pending' (used_at null) | 'all'
    limit: int = 100,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Studio invitations across all workspaces, flagged 'stuck' when the invitee
    already signed up but the invite is still unclaimed."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "list_invitations", metadata={"scope": scope})
    limit = max(1, min(limit, 500))

    where = "" if scope == "all" else "where i.used_at is null"
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                f"{_INVITE_SELECT} {where} order by i.created_at desc limit $1", limit,
            )
        except Exception as e:  # noqa: BLE001 — table may be absent in some envs
            log.error("list_invitations failed: %s", e)
            return {"coverage": _COVERAGE, "invitations": [],
                    "note": "studio_invitations table not reachable in this environment."}

    out = []
    for r in rows:
        d = dict(r)
        d["stuck"] = bool(d.get("invitee_user_id")) and d.get("used_at") is None
        out.append(d)
    return {"coverage": _COVERAGE, "invitations": out}


@router.post("/invitations/{invitation_id}/revoke")
async def revoke_invitation(
    invitation_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Delete a pending invitation. The immutable audit log is the record of the
    revocation (the row itself is hard-deleted, matching the app's own cancel)."""
    actor = await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                "select email, studio_id from studio_invitations where id = $1::uuid",
                invitation_id,
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid invitation id")
        if not row:
            raise HTTPException(status_code=404, detail="Invitation not found")
        await conn.execute(
            "delete from studio_invitations where id = $1::uuid", invitation_id,
        )
    await audit(actor, "revoke_invitation", target_type="invitation",
                target_id=invitation_id,
                metadata={"email": row["email"], "studio_id": str(row["studio_id"])})
    return {"ok": True}


# ─── A3-err: Error feed ───────────────────────────────────────────────────────
# Server-side failures only (admin_error_log, written by app/error_log). Captures
# what frontend Sentry cannot: AI-proxy, email/DocuSign/Stripe, unhandled API
# exceptions. Browser-side errors (CSP, frontend crashes) live in Sentry — the UI
# says so. Counted into Triage as a system stat (errors_24h).

_ERRORS_NOTE = (
    "Server-side failures only (AI-proxy, email, payments, API exceptions). "
    "Browser-side errors — CSP, frontend crashes — are not here; they live in Sentry."
)


@router.get("/errors")
async def list_errors(
    since_hours: int = 168,
    limit: int = 100,
    source: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Recent server-side errors, newest first."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "list_errors", metadata={"since_hours": since_hours, "source": source})
    since_hours = max(1, min(since_hours, 24 * 90))
    limit = max(1, min(limit, 500))

    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            if source:
                rows = await conn.fetch(
                    """select id, source, level, message, context, created_at
                         from admin_error_log
                        where created_at > now() - ($1 || ' hours')::interval
                          and source = $2
                        order by created_at desc limit $3""",
                    str(since_hours), source, limit,
                )
            else:
                rows = await conn.fetch(
                    """select id, source, level, message, context, created_at
                         from admin_error_log
                        where created_at > now() - ($1 || ' hours')::interval
                        order by created_at desc limit $2""",
                    str(since_hours), limit,
                )
        except Exception as e:  # noqa: BLE001 — table may not be migrated yet
            log.error("list_errors failed: %s", e)
            return {"note": "admin_error_log not reachable — run migration 0006.",
                    "errors": [], "sentry_note": _ERRORS_NOTE}

    out = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("context"), str):
            try:
                d["context"] = _json.loads(d["context"])
            except Exception:
                pass
        out.append(d)
    return {"errors": out, "sentry_note": _ERRORS_NOTE}
