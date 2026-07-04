"""Research execution router — KRE-2 (Server Research Execution).

Backs the autonomous research pipeline with server-side persistence.
Workers propose only — never publish, never mutate production knowledge.

Endpoints (require_admin):
  POST   /api/admin/research/runs                         — create + enqueue
  GET    /api/admin/research/runs                         — list runs
  GET    /api/admin/research/runs/{run_id}                — get run + logs
  POST   /api/admin/research/runs/{run_id}/start          — execute (sync)
  POST   /api/admin/research/runs/{run_id}/providers/{provider_id}/retry
  DELETE /api/admin/research/runs/{run_id}                — cancel
  GET    /api/admin/research/observations                  — server observations
  GET    /api/admin/research/evidence                      — server evidence
  GET    /api/admin/research/findings                      — server findings

Governance:
  - Workers neverProduces: ['kcr-published', 'knowledge-edit']
  - No auto-publishing; findings are always state='draft'
  - KCR lifecycle stays client-side (kcrGovernance.js)
"""
import json
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import get_pool
from ..research_executor import (
    execute_provider_async,
    classify_failure,
    should_retry,
    policy_for,
    PROVIDER_TO_FAMILY,
)

log = logging.getLogger("ngw.research")
router = APIRouter(prefix="/api/admin/research", tags=["research"])

_now = lambda: datetime.now(timezone.utc).isoformat()

# ── Authority by provider family ──────────────────────────────────────────────
_AUTHORITY = {
    "government":  "official",
    "food-safety": "official",
    "academic":    "standards",
    "industry":    "trade",
    "commercial":  "trade",
    "community":   "community",
    "internal":    "primary",
}


# ── Request / Response models ─────────────────────────────────────────────────

class CreateRunRequest(BaseModel):
    campaign_id:    str
    playbook_type:  str
    field_path:     str
    gap_kind:       str
    blueprint:      dict = Field(default_factory=dict)
    execution_plan: dict = Field(default_factory=dict)
    mode:           str  = "simulate"
    priority:       str  = "MED"


class StartRunOptions(BaseModel):
    injected_records: dict = Field(default_factory=dict)  # {provider_id: [records]}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_id() -> str:
    return f"run-{uuid.uuid4().hex[:12]}"


def _obs_id(provider_id: str) -> str:
    return f"obs-{provider_id}-{uuid.uuid4().hex[:8]}"


def _ev_id() -> str:
    return f"ev-{uuid.uuid4().hex[:10]}"


def _finding_id() -> str:
    return f"finding-{uuid.uuid4().hex[:10]}"


async def _get_run(conn, run_id: str) -> dict:
    row = await conn.fetchrow(
        "select * from research_campaign_runs where id=$1", run_id
    )
    if not row:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return dict(row)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/runs")
async def create_run(
    body: CreateRunRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Create a campaign run and enqueue it. Does not execute yet."""
    await require_admin(authorization, x_planner_token)
    run_id = _run_id()
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """insert into research_campaign_runs
               (id, campaign_id, playbook_type, field_path, gap_kind, state,
                blueprint, execution_plan, created_at, updated_at)
               values ($1,$2,$3,$4,$5,'queued',$6,$7,now(),now())""",
            run_id,
            body.campaign_id,
            body.playbook_type,
            body.field_path,
            body.gap_kind,
            json.dumps(body.blueprint),
            json.dumps(body.execution_plan),
        )
        await conn.execute(
            """insert into research_queue_jobs (run_id, priority, state, scheduled_at)
               values ($1,$2,'pending',now())""",
            run_id,
            body.priority,
        )
    log.info("Research run %s created (campaign=%s, gap=%s)", run_id, body.campaign_id, body.gap_kind)
    return {"id": run_id, "state": "queued", "campaignId": body.campaign_id}


@router.get("/runs")
async def list_runs(
    limit: int = 50,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """List recent research runs with state + summary."""
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """select id, campaign_id, playbook_type, field_path, gap_kind,
                      state, summary, error, started_at, completed_at, created_at
               from research_campaign_runs
               order by created_at desc
               limit $1""",
            limit,
        )
    return [dict(r) for r in rows]


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Get run state + provider logs."""
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        run = await _get_run(conn, run_id)
        logs = await conn.fetch(
            """select provider_id, attempt, success, records_produced,
                      failure_kind, error_message, latency_ms, simulated, created_at
               from provider_run_logs where run_id=$1 order by created_at""",
            run_id,
        )
    return {**run, "providerLogs": [dict(l) for l in logs]}


@router.post("/runs/{run_id}/start")
async def start_run(
    run_id: str,
    body: StartRunOptions = None,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Execute the run: providers → observations → evidence → finding.

    Synchronous MVP — runs in the request handler. Partial success: one provider
    failure does not cancel the run. Failed providers are logged and skipped.
    Governance: no publishing, no knowledge edits, finding is always draft.
    """
    await require_admin(authorization, x_planner_token)
    if body is None:
        body = StartRunOptions()
    injected = body.injected_records or {}

    pool = await get_pool()
    async with pool.acquire() as conn:
        run = await _get_run(conn, run_id)
        if run["state"] not in ("queued", "failed"):
            raise HTTPException(409, f"Run is in state '{run['state']}'; can only start from queued/failed")

        # Mark running
        await conn.execute(
            "update research_campaign_runs set state='running', started_at=now(), updated_at=now() where id=$1",
            run_id,
        )
        await conn.execute(
            "update research_queue_jobs set state='running', started_at=now() where run_id=$1 and state='pending'",
            run_id,
        )

    gap_kind      = run["gap_kind"]
    field_path    = run["field_path"]
    playbook_type = run["playbook_type"]
    mode          = (run.get("blueprint") or {}).get("mode", "simulate") if isinstance(run.get("blueprint"), dict) else "simulate"

    # Resolve provider list from execution_plan or blueprint
    exec_plan = run.get("execution_plan") or {}
    if isinstance(exec_plan, str):
        exec_plan = json.loads(exec_plan)
    blueprint = run.get("blueprint") or {}
    if isinstance(blueprint, str):
        blueprint = json.loads(blueprint)

    provider_ids = (
        exec_plan.get("providerIds")
        or blueprint.get("recommendedProviders")
        or ["data.gov", "market-pricing"]
    )[:6]  # blast-radius cap

    policy = policy_for(gap_kind)
    max_retries = exec_plan.get("maxRetries", policy["retry_attempts"])
    timeout_ms  = exec_plan.get("timeoutMs",  policy["timeout_ms"])

    asof = datetime.now(timezone.utc).date().isoformat()

    all_obs_ids: list[str] = []
    provider_results: list[dict] = []
    any_success = False

    async with pool.acquire() as conn:
        for pid in provider_ids:
            t0 = time.monotonic()
            attempt = 0
            success = False
            records: list[dict] = []
            last_err = None
            failure_kind = None

            while attempt <= max_retries:
                try:
                    records = await execute_provider_async(
                        pid, gap_kind, field_path, playbook_type, asof,
                        mode=mode,
                        injected=injected.get(pid),
                        timeout_ms=timeout_ms,
                    )
                    success = True
                    break
                except Exception as exc:
                    last_err = exc
                    failure_kind = classify_failure(exc)
                    if not should_retry(failure_kind, attempt, gap_kind):
                        break
                    attempt += 1

            latency_ms = int((time.monotonic() - t0) * 1000)
            simulated  = mode == "simulate"

            await conn.execute(
                """insert into provider_run_logs
                   (run_id, provider_id, attempt, success, records_produced,
                    failure_kind, error_message, latency_ms, simulated, created_at)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())""",
                run_id, pid, attempt, success, len(records),
                failure_kind, str(last_err) if last_err else None,
                latency_ms, simulated,
            )
            provider_results.append({
                "providerId": pid, "success": success,
                "records": len(records), "latencyMs": latency_ms,
                "failureKind": failure_kind,
            })

            if not success:
                log.warning("Provider %s failed on run %s (kind=%s, attempt=%d)", pid, run_id, failure_kind, attempt)
                continue

            any_success = True
            family = PROVIDER_TO_FAMILY.get(pid, "commercial")

            # Store observations
            for rec in records:
                obs_id = rec.get("id") or _obs_id(pid)
                await conn.execute(
                    """insert into research_observations
                       (id, run_id, provider_id, playbook_type, field_path, gap_type,
                        statement, source, status, data, captured_at, updated_at)
                       values ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,now(),now())
                       on conflict (id) do nothing""",
                    obs_id, run_id, pid, playbook_type, field_path, gap_kind,
                    rec.get("statement", ""),
                    rec.get("source", pid),
                    json.dumps({k: v for k, v in rec.items() if k not in ("id", "statement", "source")}),
                )
                all_obs_ids.append(obs_id)

    # ── Derive evidence from observations (minimal — no JS pipeline re-implementation) ─
    evidence_ids: list[str] = []
    async with pool.acquire() as conn:
        obs_rows = await conn.fetch(
            "select id, provider_id, statement, data from research_observations where run_id=$1 and status='open'",
            run_id,
        )
        for obs in obs_rows:
            ev_id = _ev_id()
            family = PROVIDER_TO_FAMILY.get(obs["provider_id"], "commercial")
            authority  = _AUTHORITY.get(family, "trade")
            confidence = "high" if family in ("government", "food-safety", "academic") else "medium"
            await conn.execute(
                """insert into research_evidence
                   (id, run_id, observation_id, playbook_type, field_path,
                    authority, confidence, data, captured_at)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,now())""",
                ev_id, run_id, obs["id"], playbook_type, field_path,
                authority, confidence,
                json.dumps({"statement": obs["statement"], "observationId": obs["id"]}),
            )
            evidence_ids.append(ev_id)

    # ── Derive finding from evidence count ────────────────────────────────────
    finding_state = None
    finding_id    = None
    async with pool.acquire() as conn:
        ev_count = await conn.fetchval(
            "select count(*) from research_evidence where run_id=$1", run_id
        )
        if ev_count and ev_count > 0:
            finding_id = _finding_id()
            finding_state = "corroborated" if ev_count >= 2 else "insufficient"
            await conn.execute(
                """insert into research_findings
                   (id, run_id, playbook_type, field_path, gap_kind, status,
                    corroboration, data, created_at)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,now())""",
                finding_id, run_id, playbook_type, field_path, gap_kind,
                finding_state, int(ev_count),
                json.dumps({
                    "evidenceCount": int(ev_count),
                    "observationCount": len(all_obs_ids),
                    "providerResults": provider_results,
                    "governanceNote": "Draft only. KCR lifecycle is client-side. Workers neverProduces: kcr-published, knowledge-edit.",
                }),
            )

    # ── Update run state ─────────────────────────────────────────────────────
    final_state = (
        "complete" if any_success and finding_state == "corroborated"
        else "partial"  if any_success
        else "failed"
    )
    summary = (
        f"{len([r for r in provider_results if r['success']])}/{len(provider_ids)} providers ok · "
        f"{len(all_obs_ids)} obs · {len(evidence_ids)} evidence · "
        f"finding: {finding_state or 'none'}"
    )

    async with pool.acquire() as conn:
        await conn.execute(
            """update research_campaign_runs
               set state=$2, summary=$3, completed_at=now(), updated_at=now()
               where id=$1""",
            run_id, final_state, summary,
        )
        await conn.execute(
            "update research_queue_jobs set state=$2, completed_at=now() where run_id=$1",
            run_id, "done" if final_state != "failed" else "failed",
        )

    log.info("Run %s → %s (%s)", run_id, final_state, summary)
    return {
        "runId":          run_id,
        "state":          final_state,
        "summary":        summary,
        "providerResults": provider_results,
        "observationCount": len(all_obs_ids),
        "evidenceCount":  len(evidence_ids),
        "findingId":      finding_id,
        "findingState":   finding_state,
    }


@router.post("/runs/{run_id}/providers/{provider_id}/retry")
async def retry_provider(
    run_id:      str,
    provider_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Retry a single failed provider for an existing run."""
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        run = await _get_run(conn, run_id)

    gap_kind      = run["gap_kind"]
    field_path    = run["field_path"]
    playbook_type = run["playbook_type"]
    policy = policy_for(gap_kind)
    asof   = datetime.now(timezone.utc).date().isoformat()

    t0 = time.monotonic()
    try:
        records = await execute_provider_async(
            provider_id, gap_kind, field_path, playbook_type, asof,
            mode="simulate", timeout_ms=policy["timeout_ms"],
        )
        success = True
        failure_kind = None
        err_msg = None
    except Exception as exc:
        records = []
        success = False
        failure_kind = classify_failure(exc)
        err_msg = str(exc)

    latency_ms = int((time.monotonic() - t0) * 1000)
    async with pool.acquire() as conn:
        await conn.execute(
            """insert into provider_run_logs
               (run_id, provider_id, attempt, success, records_produced,
                failure_kind, error_message, latency_ms, simulated, created_at)
               values ($1,$2,1,$3,$4,$5,$6,$7,true,now())""",
            run_id, provider_id, success, len(records), failure_kind, err_msg, latency_ms,
        )
        if success:
            for rec in records:
                obs_id = rec.get("id") or _obs_id(provider_id)
                await conn.execute(
                    """insert into research_observations
                       (id, run_id, provider_id, playbook_type, field_path, gap_type,
                        statement, source, status, data, captured_at, updated_at)
                       values ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,now(),now())
                       on conflict (id) do nothing""",
                    obs_id, run_id, provider_id, playbook_type, field_path, gap_kind,
                    rec.get("statement", ""), rec.get("source", provider_id),
                    json.dumps({k: v for k, v in rec.items() if k not in ("id", "statement", "source")}),
                )

    return {"success": success, "records": len(records), "latencyMs": latency_ms, "failureKind": failure_kind}


@router.delete("/runs/{run_id}")
async def cancel_run(
    run_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Cancel a queued or running run."""
    await require_admin(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        run = await _get_run(conn, run_id)
        if run["state"] in ("complete", "cancelled"):
            raise HTTPException(409, f"Run already {run['state']}")
        await conn.execute(
            "update research_campaign_runs set state='cancelled', updated_at=now() where id=$1", run_id
        )
        await conn.execute(
            "update research_queue_jobs set state='cancelled' where run_id=$1 and state in ('pending','running')", run_id
        )
    return {"runId": run_id, "state": "cancelled"}


@router.get("/observations")
async def list_observations(
    run_id:       Optional[str] = None,
    field_path:   Optional[str] = None,
    status:       Optional[str] = None,
    limit:        int = 200,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """List server-produced observations for Evidence Inbox. localStorage fallback is client-side."""
    await require_admin(authorization, x_planner_token)
    where_clauses = []
    params: list = []
    idx = 1
    if run_id:
        where_clauses.append(f"run_id=${idx}"); params.append(run_id); idx += 1
    if field_path:
        where_clauses.append(f"field_path=${idx}"); params.append(field_path); idx += 1
    if status:
        where_clauses.append(f"status=${idx}"); params.append(status); idx += 1
    params.append(limit)
    where = ("where " + " and ".join(where_clauses)) if where_clauses else ""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"select * from research_observations {where} order by captured_at desc limit ${idx}",
            *params,
        )
    return [dict(r) for r in rows]


@router.patch("/observations/{obs_id}")
async def update_observation_status(
    obs_id: str,
    body: dict,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Update observation status (accept/reject/merge/flag) from Evidence Inbox."""
    await require_admin(authorization, x_planner_token)
    new_status = body.get("status")
    allowed = {"open", "accepted", "rejected", "merged", "flagged"}
    if new_status not in allowed:
        raise HTTPException(400, f"status must be one of {sorted(allowed)}")
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "update research_observations set status=$2, updated_at=now() where id=$1",
            obs_id, new_status,
        )
    if result == "UPDATE 0":
        raise HTTPException(404, f"Observation '{obs_id}' not found")
    return {"id": obs_id, "status": new_status}


@router.get("/evidence")
async def list_evidence(
    run_id:     Optional[str] = None,
    field_path: Optional[str] = None,
    limit:      int = 200,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """List server-produced evidence records."""
    await require_admin(authorization, x_planner_token)
    where_clauses = []
    params: list = []
    idx = 1
    if run_id:
        where_clauses.append(f"run_id=${idx}"); params.append(run_id); idx += 1
    if field_path:
        where_clauses.append(f"field_path=${idx}"); params.append(field_path); idx += 1
    params.append(limit)
    where = ("where " + " and ".join(where_clauses)) if where_clauses else ""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"select * from research_evidence {where} order by captured_at desc limit ${idx}",
            *params,
        )
    return [dict(r) for r in rows]


@router.get("/findings")
async def list_findings(
    run_id:     Optional[str] = None,
    field_path: Optional[str] = None,
    status:     Optional[str] = None,
    limit:      int = 100,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """List server-produced findings (all are draft — KCR lifecycle is client-side)."""
    await require_admin(authorization, x_planner_token)
    where_clauses = []
    params: list = []
    idx = 1
    if run_id:
        where_clauses.append(f"run_id=${idx}"); params.append(run_id); idx += 1
    if field_path:
        where_clauses.append(f"field_path=${idx}"); params.append(field_path); idx += 1
    if status:
        where_clauses.append(f"status=${idx}"); params.append(status); idx += 1
    params.append(limit)
    where = ("where " + " and ".join(where_clauses)) if where_clauses else ""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"select * from research_findings {where} order by created_at desc limit ${idx}",
            *params,
        )
    return [dict(r) for r in rows]
