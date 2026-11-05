"""Authenticated self-deletion. Auth/application cleanup is atomic via migration021.

Storage removal is an earlier, explicitly nontransactional API operation. Shared
files require transfer; never delete another studio's documents to delete a user.
"""
from collections import defaultdict
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .. import auth
from ..auth import require_planner
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..db import get_pool

router = APIRouter(prefix="/api", tags=["account"])


class DeleteAccountRequest(BaseModel):
    confirmation: str


def refusal(code, message, status=409):
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


@router.delete("/account")
async def delete_account(body: DeleteAccountRequest, authorization: Optional[str] = Header(default=None)):
    # Destructive identity verification never relies on cached authentication.
    token = auth._bearer(authorization)
    if token:
        auth._cache.pop(token, None)
    principal = await require_planner(authorization, None)
    if principal.get("via") != "supabase":
        refusal("signed_in_account_required", "Sign in to the account you want to delete.", 403)
    uid = str(UUID(principal["id"]))
    if body.confirmation != "DELETE":
        refusal("confirmation_required", "Type DELETE to confirm account deletion.", 400)
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        refusal("deletion_unavailable", "Account deletion is temporarily unavailable. Try again later.", 503)

    pool = await get_pool()
    headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "apikey": SUPABASE_SERVICE_ROLE_KEY}
    async with httpx.AsyncClient(timeout=20) as client:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Protect the storage selection against a collaborator joining
                # during removal. The Auth trigger rechecks after this phase.
                await conn.execute("lock table public.studios, public.studio_members in share row exclusive mode")
                ready = await conn.fetchval("select 1 from pg_trigger where tgname='cleanup_deleted_account' and tgrelid='auth.users'::regclass and tgenabled='O'")
                if not ready:
                    refusal("deletion_unavailable", "Account deletion is temporarily unavailable. Try again later.", 503)
                shared_owner = await conn.fetchval("""
                    select 1 from public.studio_members mine where mine.user_id=$1::uuid and mine.role='owner'
                    and exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>$1::uuid)
                    and not exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>$1::uuid and other.role='owner') limit 1""", uid)
                if shared_owner:
                    refusal("ownership_transfer_required", "Make another member an owner of your shared studio before deleting your account. Your collaborators' events will stay in their studio.")
                event_ids = await conn.fetch("""
                    with solo as (select s.id from public.studios s
                      where (s.created_by=$1::uuid or exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id=$1::uuid))
                      and not exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id<>$1::uuid))
                    select id from public.events where studio_id in (select id from solo)
                    union select eo.event_id as id from public.event_owners eo
                      where (eo.studio_id in (select id from solo) or (eo.owner_id=$1::text and eo.studio_id is null))
                        and not exists (select 1 from public.events e where e.id=eo.event_id and e.studio_id not in (select id from solo))""", uid)
                ids = [row["id"] for row in event_ids]
                objects = await conn.fetch("""select bucket_id, name, owner_id from storage.objects
                    where owner_id=$1::text or owner=$1::uuid or (bucket_id='event-files' and split_part(name,'/',2)=any($2::text[]))""", uid, ids)
                by_bucket = defaultdict(list)
                for obj in objects:
                    parts = obj["name"].split("/")
                    if obj["bucket_id"] != "event-files" or len(parts) < 4 or parts[1] not in ids:
                        refusal("storage_transfer_required", "Transfer or remove your uploaded files in shared events before deleting your account. Shared event files have not been removed.")
                    by_bucket[obj["bucket_id"]].append(obj["name"])
                for bucket, names in by_bucket.items():
                    for start in range(0, len(names), 100):
                        try:
                            response = await client.request("DELETE", SUPABASE_URL.rstrip('/') + '/storage/v1/object/' + bucket,
                                                            headers=headers, json={"prefixes": names[start:start+100]})
                        except httpx.HTTPError:
                            refusal("storage_delete_failed", "File removal did not finish. Some personal files may already be removed. Try account deletion again.", 502)
                        if not response.is_success:
                            refusal("storage_delete_failed", "File removal did not finish. Some personal files may already be removed. Try account deletion again.", 502)
        # The privileged Auth delete fires the trigger, and app cleanup rolls
        # back if that deletion fails. Never delete storage metadata with SQL.
        try:
            response = await client.request("DELETE", SUPABASE_URL.rstrip('/') + '/auth/v1/admin/users/' + uid,
                                            headers=headers, json={"should_soft_delete": False})
        except httpx.HTTPError:
            auth.invalidate_user_cache(uid)
            refusal("deletion_unconfirmed", "Account deletion could not be confirmed. Personal files may already be removed. Sign in again to check before retrying.", 502)
        auth.invalidate_user_cache(uid)
        if not response.is_success:
            # GoTrue wraps trigger errors. Return only recognized safe codes,
            # never the provider's raw response or secrets.
            if "ownership_transfer_required" in response.text:
                refusal("ownership_transfer_required", "Make another member an owner of your shared studio before deleting your account. Your collaborators' events will stay in their studio.")
            if "storage_transfer_required" in response.text:
                refusal("storage_transfer_required", "New or shared uploaded files need to be transferred or removed before account deletion. Personal files may already be removed. Try again after resolving those files.")
            refusal("deletion_failed", "Account deletion did not finish. Personal files may already be removed. Sign in again and try deletion again.", 502)
    return {"deleted": True, "retained_categories": ["payment_receipts", "security_and_admin_records", "shared_studio_content"]}
