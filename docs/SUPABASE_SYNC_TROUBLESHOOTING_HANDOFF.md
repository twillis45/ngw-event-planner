# Supabase Cloud-Sync Troubleshooting — Handoff

_Last updated: 2026-07-01. Continue the cloud-sync / studio-provisioning work from here._

## 0. RSVP read-back 500 — RESOLVED 2026-07-02
Separate symptom, same "a migration didn't fully land in prod" family. `GET /api/events/{id}/rsvps` 500'd with **`column "studio_id" does not exist`** (surfaced only because the `f53a6d0` CORS-on-500 fix is now live).
- **Root cause:** `backend/migrations/0003_studios.sql` tail (`alter table event_owners add column studio_id` + backfill) never landed. The backfill joined `studio_members.user_id` (uuid) to `event_owners.owner_id` (text) **without a cast** → `operator does not exist: uuid = text` → that error rolled back the `alter` in the same transaction, so the column silently never existed.
- **Fixed in source:** commit `1e1e803` casts `m.user_id::text = eo.owner_id` in 0003.
- **Applied to prod (SQL editor):** `alter table event_owners add column if not exists studio_id uuid;` + index + the cast-corrected backfill. Verified: column exists, 500 gone.
- **Migration-drift audit (2026-07-02):** confirmed `0004` (2 delivery indexes), `0005` (admin_support_notes + admin_audit_log), `0006` (admin_error_log) ALL applied. No further backend drift.

## 1. The symptom that started this
Host `f8stopped@gmail.com` hit, on cloud sync:

> **Partial import — 0 items uploaded, 55 failed. Your local data is intact — try again later.**

All 55 failed (not partial) → **one systemic cause**, not per-item problems.

## 2. Root cause (confirmed)
The exact error was:

> `new row violates row-level security policy (USING expression) for table "events"`

The key phrase is **`(USING expression)`**. The sync does an **upsert** (`onConflict: 'id'`). Because those 55 events **already existed in the cloud**, the upsert became an **UPDATE**, and the events UPDATE policy evaluates its `USING` clause against the **existing row's `studio_id`**:

```sql
-- supabase/migrations/002_rls_policies.sql
create policy "events: studio update" on public.events for update
  using       (public.is_studio_member(studio_id))   -- the EXISTING row  ← this failed
  with check  (public.is_studio_member(studio_id));  -- the new row
```

→ **The 55 events belonged to a studio the account is no longer a member of** (an orphaned studio). RLS correctly refused to let the user update another studio's rows. This is a **studio-ownership mismatch**, not auth/network/data.

## 3. Why it happened
Studios are provisioned **only by a signup trigger** — they do **not** re-provision on login:

```sql
-- supabase/migrations/003_studio_provisioning.sql
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();  -- fires ONCE, at signup
```

`handle_new_user()` inserts a studio + owner membership. If a studio gets orphaned or re-created (studio switch / re-provision / a prior partial migration), old `events` rows keep the **old** `studio_id` while `currentStudioId()` now returns a **new** one → the upsert-as-update is blocked. There's also a **cache** in `currentStudioId()` that can mask an outage by returning a studio id without a network round-trip.

## 4. What was done to f8stopped (disposable test account)
1. **Option A (targeted):** delete the orphaned cloud event rows so Retry re-**inserts** them under the current studio (insert `WITH CHECK` passes).
2. **Option B (full nuke):** user deleted the whole studio. ⚠️ This **strands the account** — the signup trigger won't re-fire — so a **manual re-provision** was required:
   ```sql
   with u as (select id, email from auth.users where email = 'f8stopped@gmail.com'),
        ns as (insert into public.studios (name, created_by)
               select coalesce(nullif(email,''),'My')||'''s Studio', id from u returning id)
   insert into public.studio_members (studio_id, user_id, role)
   select ns.id, u.id, 'owner' from ns, u;
   ```
3. After re-provision the confirm query returned **2 studio memberships** (a leftover + the new one). Cleanup issued to keep one:
   ```sql
   delete from public.studios
   where id = (select id from public.studios
               where id in ('0adea030-7d62-49df-9552-ad81a95e7eab','ec6829c7-a6c5-483b-a74e-2bd8d825e7a4')
               order by created_at asc limit 1);   -- keep the newer, drop the older
   ```
   **Studio UUIDs seen for this account:** `0adea030-7d62-49df-9552-ad81a95e7eab`, `ec6829c7-a6c5-483b-a74e-2bd8d825e7a4`.

### ⚠️ OPEN — verify f8stopped is actually resolved
- [ ] `select count(*) from studio_members sm join auth.users u on u.id=sm.user_id where u.email='f8stopped@gmail.com'` returns **1**.
- [ ] Sign out / back in as f8stopped (client caches the old/null studio id — re-login refreshes it).
- [ ] Hit **Retry** → expect "55 uploaded" (0 failed).
- All run in the **Supabase SQL editor** (service role — bypasses RLS; the app client can't do these by design).

## 5. Code change shipped (needs deploy)
**Backend CORS-on-500 fix** — commit **`f53a6d0`**, `demo/backend/app/main.py` `_error_capture` middleware. Unhandled exceptions used to re-raise → the 500 skipped `CORSMiddleware` → the browser masked every backend crash as a "CORS error." Now it records to `admin_error_log` **and** returns a JSON 500 **with** the `Access-Control-Allow-Origin` header, so the real status is visible.

- [x] **DEPLOYED (2026-07-01).** `f53a6d0` is on `origin/main`; Render `autoDeploy:true` shipped it. Backend health verified live (`/health` → 200 after cold start).

## 6. Open follow-ups (the real fixes)
_Fixes #1–#4 IMPLEMENTED 2026-07-01 (code, uncommitted). #1 needs its migration applied in Supabase before it can help. #5 still open._

1. **[BUILT] Client-side "ensure a studio on login" self-heal** — `currentStudioId()` (`src/lib/api/studio.js`) now calls the new `ensure_studio()` RPC when membership is empty (instead of returning null → stranded). **RPC lives in `supabase/migrations/010_ensure_studio.sql` — MUST be applied in the Supabase SQL editor.** Client degrades to old behavior (null) if the RPC is absent, so it's safe to deploy before the migration.
2. **[BUILT] Sync studio-mismatch UX** — the "Partial import" modal (`App.js` MigrationModal) now detects the RLS `USING`-clause signature and shows *"These belong to a different studio"* + a **Re-link & retry** button (calls `revalidateStudio()` → clears cache, re-resolves/ensures studio, retries).
3. **[BUILT] Surface the real error in migration** — `events.js` + `clients.js` `migrateLocalToCloud` now return `firstError`; the modal shows it verbatim ("Details: …").
4. **[BUILT] Re-validate the studio cache on write failure** — `revalidateStudio()` (`studio.js`, exported via `lib/api`) clears the cache + re-resolves; wired into the modal's Re-link path so an outage resolves to null (offline) instead of masking as "N failed."
5. **[AUDITED 2026-07-02] Provisioning root-cause audit** — findings:
   - **Orphaning is not a product path.** There is NO user-facing delete-studio in the app; the only way to 0 memberships is a manual studio DELETE (cascade drops `studio_members`) — i.e. the f8stopped "Option B nuke" during troubleshooting, not normal use.
   - **True root cause (fixed):** `handle_new_user` provisions once at signup and never re-heals, so any orphaning was *permanent* → stranded account. `ensure_studio` (010) closes this.
   - **`claim_pending_invitations` 400: RESOLVED.** Migration 008 (the `studio_id` ambiguity fix) IS applied in prod (verified `pg_get_functiondef … like '%variable_conflict%'` = true). The stale "400 on every session resume" is no longer live.
   - **Race fixed by 011:** 010's `ensure_studio` could provision a solo studio for an INVITED planner before the concurrent `claimPendingInvitations()` landed (App.js effects ~43518 + ~43533) → wrong studio + stray one. **`011_ensure_studio_claim_first.sql`** redefines `ensure_studio` to claim invites FIRST, then provision only if still empty — deterministic regardless of client ordering. **Apply 011 in the SQL editor (create-or-replace, safe to re-run).**

### ⚠️ Remaining steps to activate #1–#4
- [x] **`010_ensure_studio.sql` + `011_ensure_studio_claim_first.sql` APPLIED** in the Supabase SQL editor (2026-07-02, user-confirmed).
- [ ] **Commit + deploy the frontend** self-heal (`studio.js` `ensure_studio`/`revalidateStudio`, `events.js`/`clients.js` `firstError`, MigrationModal Re-link) — env-strip build → gh-pages. The RPC now exists, so the Re-link path is live once the frontend ships.
- [ ] **Live test (user-side — needs auth):** sign in as f8stopped → confirm 1 membership → **Retry** expects "55 uploaded". The assistant can't auth as a user; run this after the frontend deploy.

## 7. Key files & locations
| Concern | File · symbol |
|---|---|
| Bulk migrate (the "N failed" path) | `demo/src/lib/api/events.js` → `migrateLocalToCloud` (~153); `catch {}` swallows the error |
| Per-event cloud save + local-only gate | `demo/src/lib/api/events.js` → `saveEvent` (`if (!isCloudStudioId(sid)) return;` — dev/non-uuid studios stay local) |
| Debounced bulk cloud sync on change | `demo/src/App.js` ~43581 (`events.map(ev => saveEvent(ev))`, 1500ms) |
| Studio resolution + cache | `demo/src/lib/api/studio.js` → `currentStudioId` (~43) |
| Events RLS (USING/WITH CHECK) | `demo/supabase/migrations/002_rls_policies.sql` |
| Studio provisioning trigger (signup-only) + backfill | `demo/supabase/migrations/003_studio_provisioning.sql` → `handle_new_user()` |
| "Partial import" modal | `demo/src/App.js` ~43152 (`result.evR` / `result.clR`) |
| CORS-on-500 fix | `demo/backend/app/main.py` → `_error_capture` (commit f53a6d0) |

## 8. Diagnostic queries (non-destructive first)
```sql
-- studios this account belongs to + event/member counts
select sm.studio_id, sm.role,
       (select count(*) from public.events e         where e.studio_id = sm.studio_id) as events,
       (select count(*) from public.studio_members m where m.studio_id = sm.studio_id) as members
from public.studio_members sm join auth.users u on u.id = sm.user_id
where u.email = 'EMAIL';

-- the studio actually owning a stuck event (paste a local event id)
select studio_id from public.events where id = 'A_LOCAL_EVENT_ID';
```
Event id format = **6-char lowercase alphanumeric** (e.g. `k3m9x2`); seeds are prefixed (`ev-`, `demo-`, `cf1`) — skip those.

## 9. Boundaries
- Destructive DB fixes run in the **Supabase SQL editor** (service role); the app client can't (RLS by design).
- Entering passwords / signing in as a user is done by the human, not the assistant.
