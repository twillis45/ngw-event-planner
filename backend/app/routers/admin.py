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
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..config import POSTHOG_QUERY_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_QUERY_HOST
from ..db import get_pool
from ..intel_audit import evaluation_audit

log = logging.getLogger("ngw.admin")

# INTEL-QA-1 Stage 1C — how many recent events to scan for intelEvaluations (bounded so the fleet
# aggregation never scans an unbounded table). Records in the RESPONSE are separately capped.
INTEL_EVENT_SCAN_CAP = 5000

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


@router.get("/intelligence")
async def intelligence(
    limit: int = 200,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """INTEL-QA-1 Stage 1C — fleet intelligence CAPTURE health.

    Aggregates persisted ``event.intelEvaluations[]`` across admin scope into the frontend
    ``evaluationAudit`` shape. NON-PII (only event type + short id + the eval records, which carry
    no guest data). CAPTURE ONLY — never scores/grades (Stage 2). Server-synced events only.
    """
    actor = await require_admin(authorization, x_planner_token)
    cap = max(1, min(limit, 1000))
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select id, data from public.events order by updated_at desc limit $1",
            INTEL_EVENT_SCAN_CAP,
        )
    # Build NON-PII event dicts — ONLY the fields the aggregator needs. Guest names/emails/notes/
    # addresses/vendors and the rest of the payload are dropped here and never returned.
    events = []
    for r in rows:
        data = r["data"]
        if isinstance(data, str):
            try:
                data = _json.loads(data)
            except Exception:
                data = {}
        if not isinstance(data, dict):
            data = {}
        events.append({
            "id": r["id"],
            "type": data.get("type"),
            "date": data.get("date"),
            "guestCount": data.get("guestCount"),
            "guestEstimate": data.get("guestEstimate"),
            "intelEvaluations": data.get("intelEvaluations"),
        })

    intel = evaluation_audit(events)
    all_records = intel["records"]
    truncated = len(all_records) > cap
    intel["records"] = all_records[:cap]
    t = intel["totals"]

    await audit(actor, "intelligence")
    return {
        "audit": intel,
        "summary": {
            "totalEventsScanned": intel["scannedEvents"],
            "eventsWithIntelEvaluations": intel["eventsWithEvaluations"],
            "totalRecommendationRecords": t["records"],
            "recommendationsPresented": t["shown"],
            "acceptedRecommendations": t["accepted"],
            "revertedRecommendations": t["reverted"],
            "overriddenRecommendations": t["overridden"],
            "actualsAttached": t["actualsAttached"],
            "evaluationReadyRecords": t["evaluationReady"],
            "malformedRecords": t["malformed"],
            "duplicateWarnings": t["duplicateWarnings"],
        },
        "provenance": {
            "source": "server",
            "scope": "admin",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "recordCap": cap,
            "recordsReturned": len(intel["records"]),
            "truncated": truncated,
            "eventsScanCap": INTEL_EVENT_SCAN_CAP,
        },
    }


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


# ─── A1: Activation funnel ────────────────────────────────────────────────────
# The honest beta-health funnel from server-synced state. "Synced an event" is a
# PROXY for real activity — the server can't tell a real event from the sample
# (event contents are localStorage-first), so the UI must not call it "created a
# real event." At beta scale show the true small N, never a vanity curve.

@router.get("/metrics/activation")
async def metrics_activation(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Signup → confirmed → synced-an-event → active funnel, plus recent signups."""
    actor = await require_admin(authorization, x_planner_token)
    await audit(actor, "view_activation")

    pool = await get_pool()
    async with pool.acquire() as conn:
        now = await conn.fetchval("select now()")
        signed_up = await conn.fetchval("select count(*) from auth.users")
        confirmed = await conn.fetchval(
            "select count(*) from auth.users where email_confirmed_at is not null")
        synced_event = await conn.fetchval(
            "select count(distinct owner_id) from event_owners")
        active_14d = await conn.fetchval(
            "select count(*) from auth.users where last_sign_in_at > now() - interval '14 days'")
        new_7d = await conn.fetchval(
            "select count(*) from auth.users where created_at > now() - interval '7 days'")
        new_30d = await conn.fetchval(
            "select count(*) from auth.users where created_at > now() - interval '30 days'")

    funnel = [
        {"key": "signed_up", "label": "Signed up", "count": signed_up, "note": None},
        {"key": "confirmed", "label": "Confirmed email", "count": confirmed, "note": None},
        {"key": "synced_event", "label": "Synced an event", "count": synced_event,
         "note": "Server-synced proxy — can't distinguish a real event from the sample."},
        {"key": "active_14d", "label": "Active (last 14 days)", "count": active_14d, "note": None},
    ]
    return {
        "coverage": _COVERAGE,
        "generated_at": now,
        "funnel": funnel,
        "new_signups": {"d7": new_7d, "d30": new_30d},
    }


# ─── ANALYTICS-1: PostHog HogQL read proxy ─────────────────────────────────────
# The client PostHog SDK is WRITE-ONLY; this is the only server read path. It lets the
# admin Funnel/Friction panels render the behavioral funnel natively instead of linking
# out. Credentials are backend-only (config.py). When unconfigured, every endpoint
# returns {"configured": False} with HTTP 200 so the console degrades to the PostHog
# link-out — prod is NEVER broken by an absent key.

_PH_FUNNEL_STEPS = [
    ("event_created",        "Event created"),
    ("event_qualified",      "Qualified — real event"),
    ("assemble_viewed",      "Saw the plan assemble"),
    ("second_event_created", "Started a 2nd event"),
]
_PH_BREAKDOWN_PROPS = {"voice", "market", "is_host", "is_sombre", "is_at_home",
                       "playbook_matched", "event_type"}


def _posthog_ready() -> bool:
    return bool(POSTHOG_QUERY_API_KEY and POSTHOG_PROJECT_ID)


async def _run_hogql(query: str):
    """POST a HogQL query to the PostHog Query API; return its 'results' list."""
    url = f"{POSTHOG_QUERY_HOST.rstrip('/')}/api/projects/{POSTHOG_PROJECT_ID}/query/"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            url,
            headers={"Authorization": f"Bearer {POSTHOG_QUERY_API_KEY}",
                     "Content-Type": "application/json"},
            json={"query": {"kind": "HogQLQuery", "query": query}},
        )
    r.raise_for_status()
    return (r.json() or {}).get("results", []) or []


@router.get("/metrics/posthog/status")
async def posthog_status(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    await require_admin(authorization, x_planner_token)
    return {"configured": _posthog_ready(),
            "host": POSTHOG_QUERY_HOST if _posthog_ready() else None}


@router.get("/metrics/posthog/funnel")
async def posthog_funnel(
    days: int = 30,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Real-event behavioral funnel (distinct persons per step) from PostHog."""
    actor = await require_admin(authorization, x_planner_token)
    if not _posthog_ready():
        return {"configured": False, "coverage": _COVERAGE}
    days = max(1, min(int(days or 30), 365))
    await audit(actor, "view_posthog_funnel", metadata={"days": days})
    events = "', '".join(s[0] for s in _PH_FUNNEL_STEPS)
    q = (f"SELECT event, count(DISTINCT person_id) AS people FROM events "
         f"WHERE event IN ('{events}') AND timestamp > now() - INTERVAL {days} DAY "
         f"GROUP BY event")
    try:
        rows = await _run_hogql(q)
    except httpx.HTTPError as e:
        log.warning("posthog funnel query failed: %s", e)
        raise HTTPException(status_code=502, detail="PostHog query failed")
    counts = {str(r[0]): int(r[1]) for r in rows if r and len(r) >= 2}
    funnel = [{"key": k, "label": lbl, "count": counts.get(k, 0)} for k, lbl in _PH_FUNNEL_STEPS]
    return {"configured": True, "days": days, "funnel": funnel}


@router.get("/metrics/posthog/breakdown")
async def posthog_breakdown(
    prop: str = "voice",
    days: int = 30,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Breakdown of qualified events by a whitelisted content prop (voice/market/…)."""
    actor = await require_admin(authorization, x_planner_token)
    if not _posthog_ready():
        return {"configured": False, "coverage": _COVERAGE}
    if prop not in _PH_BREAKDOWN_PROPS:
        raise HTTPException(status_code=400,
                            detail=f"Unknown prop. Allowed: {', '.join(sorted(_PH_BREAKDOWN_PROPS))}")
    days = max(1, min(int(days or 30), 365))
    await audit(actor, "view_posthog_breakdown", metadata={"prop": prop, "days": days})
    q = (f"SELECT properties.{prop} AS value, count(DISTINCT person_id) AS people FROM events "
         f"WHERE event = 'event_qualified' AND timestamp > now() - INTERVAL {days} DAY "
         f"GROUP BY value ORDER BY people DESC LIMIT 50")
    try:
        rows = await _run_hogql(q)
    except httpx.HTTPError as e:
        log.warning("posthog breakdown query failed: %s", e)
        raise HTTPException(status_code=502, detail="PostHog query failed")
    out = [{"value": (str(r[0]) if r[0] is not None else "(none)"), "count": int(r[1])}
           for r in rows if r and len(r) >= 2]
    return {"configured": True, "prop": prop, "days": days, "rows": out}
