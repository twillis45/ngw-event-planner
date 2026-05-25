# NGW Event Boss — Multi-tenancy (Studios) Spec

Status: **Phase 0 in progress.** This is the working spec for turning the app into a
multi-tenant SaaS where planners are users grouped into **studios**.

## Decisions (locked)
- **Tenant unit = Studio / workspace.** A studio has one or more planner users.
  Events/clients/vendors belong to the **studio**, not an individual user. A solo
  planner is just a studio of one.
- **Data lives in the DB** (Supabase Postgres), so it syncs across devices and
  teammates. (Today only comms are in the DB; events/clients/vendors are still
  localStorage — Phase 2 migrates them.)
- **Access control = Supabase Row-Level Security (RLS).** The frontend reads/writes
  events/clients/vendors directly via `supabase-js`; RLS enforces studio scoping in
  the database. No hand-built CRUD backend.
- **Comms keep the FastAPI service** (needs server-side Resend email); its ownership
  is re-scoped from per-user to per-studio.
- **Roles:** `owner` (billing, manage members, full access), `planner` (full access to
  the studio's data), `assistant` (limited — read-focused; write scope TBD per surface).

## Data model
```
studios          (id, name, plan, created_by, created_at)
studio_members   (studio_id, user_id, role)   role ∈ owner | planner | assistant   PK(studio_id,user_id)
profiles         (user_id, studio_id, …)        -- planner/business info (Phase 1/2)
events           (id, studio_id, …)             -- Phase 2 (from localStorage)
clients          (id, studio_id, …)             -- Phase 2
vendors          (id, studio_id, event_id, …)   -- Phase 2
event_channels / event_messages                 -- exist; ownership re-scoped to studio (Phase 0)
event_owners     (event_id, owner_id, studio_id) -- studio_id added Phase 0
```

## RLS pattern
Two `security definer` helpers avoid policy recursion:
- `is_studio_member(studio_id) → bool` — current `auth.uid()` belongs to the studio.
- `is_studio_owner(studio_id) → bool` — current user is an `owner` of the studio.

Every studio-scoped table gets: `USING (is_studio_member(studio_id))` for read, and
writes gated by member or owner as appropriate. That single rule is the isolation
guarantee and replaces the old per-user claim-on-first-touch ownership.

## Auto-provisioning
A trigger on `auth.users` insert (`handle_new_user`) creates a studio named after the
new user and an `owner` membership — so every new sign-up lands in their own studio.
Existing users are back-filled by the migration.

## Comms ownership (Phase 0 behavior)
The FastAPI comms service (service-role connection, bypasses RLS) enforces access in
`_assert_event_access`:
- If the studios tables exist: an event is owned by a **studio**; any member of that
  studio may access it. First authenticated touch claims the event for the caller's
  studio.
- Backward-compatible: before `0003` is applied (no studio tables), it falls back to
  the previous per-user ownership; the legacy dev-token path still skips ownership.

## Phasing
- **Phase 0 (this):** `studios`, `studio_members`, RLS helpers + policies, new-user
  trigger + backfill, `event_owners.studio_id`, studio-aware comms access. Migration
  `0003_studios.sql`.
- **Phase 1:** studio context in the app (current studio + role), a **Members**
  settings screen, **invite a planner by email** (ties into invite-only sign-in),
  enforce role capabilities in the UI.
- **Phase 2 (big lift):** move events/clients/vendors into Postgres + RLS; rewrite the
  app's data layer from synchronous localStorage to async DB-backed state; one-time
  import of each user's localStorage data on first login. Done table-by-table behind a
  flag (events → clients → vendors).
- **Phase 3:** per-studio billing.

## Migrations to run in Supabase (SQL editor), in order
1. `0001_communication.sql` ✅
2. `0002_event_owners.sql` ✅
3. `0003_studios.sql` ← Phase 0
