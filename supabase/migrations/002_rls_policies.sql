-- ─── NGW Event Boss — Phase 2 Row Level Security (STUDIO-scoped) ─────────────
-- Rows are visible/mutable to any member of the owning studio (multi-tenant
-- teams). Enforced server-side via is_studio_member(studio_id) — the anon key
-- bundled in the frontend cannot bypass these. See docs/MULTITENANCY.md.
-- Idempotent (drop policy if exists) so it can be re-run safely.

-- ─── studios / studio_members (mirror of 0003 — idempotent) ──────────────────
alter table public.studios        enable row level security;
alter table public.studio_members enable row level security;

drop policy if exists "studios: member select" on public.studios;
create policy "studios: member select" on public.studios for select
  using (public.is_studio_member(id));

drop policy if exists "members: member select" on public.studio_members;
create policy "members: member select" on public.studio_members for select
  using (public.is_studio_member(studio_id));

-- ─── events (studio members) ──────────────────────────────────────────────────
alter table public.events enable row level security;

drop policy if exists "events: studio select" on public.events;
create policy "events: studio select" on public.events for select
  using (public.is_studio_member(studio_id));

drop policy if exists "events: studio insert" on public.events;
create policy "events: studio insert" on public.events for insert
  with check (public.is_studio_member(studio_id));

drop policy if exists "events: studio update" on public.events;
create policy "events: studio update" on public.events for update
  using  (public.is_studio_member(studio_id))
  with check (public.is_studio_member(studio_id));

drop policy if exists "events: studio delete" on public.events;
create policy "events: studio delete" on public.events for delete
  using (public.is_studio_member(studio_id));

-- ─── clients (studio members) ─────────────────────────────────────────────────
alter table public.clients enable row level security;

drop policy if exists "clients: studio select" on public.clients;
create policy "clients: studio select" on public.clients for select
  using (public.is_studio_member(studio_id));

drop policy if exists "clients: studio insert" on public.clients;
create policy "clients: studio insert" on public.clients for insert
  with check (public.is_studio_member(studio_id));

drop policy if exists "clients: studio update" on public.clients;
create policy "clients: studio update" on public.clients for update
  using  (public.is_studio_member(studio_id))
  with check (public.is_studio_member(studio_id));

drop policy if exists "clients: studio delete" on public.clients;
create policy "clients: studio delete" on public.clients for delete
  using (public.is_studio_member(studio_id));
