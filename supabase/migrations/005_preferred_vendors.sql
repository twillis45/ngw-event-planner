-- ─── NGW Event Boss — preferred_vendors (Vendor Bank, STUDIO-scoped) ──────────
-- The studio's saved / trusted vendors ("My Vendor Bank"). Previously this lived
-- in localStorage only (key: ngw-preferred-vendors), so it did NOT survive a new
-- device, a different browser, or cleared site data — and was invisible to other
-- studio members. This makes it studio-scoped + RLS, exactly like events/clients,
-- so the bank is backed up and shared across the team. JSONB-first; id is the
-- client-generated string (pv-<timestamp>). Mirrors 001/002.
-- Run via the Supabase SQL editor or `supabase db push`.

create table if not exists public.preferred_vendors (
  id          text        primary key,        -- client-generated id (pv-<ts>)
  studio_id   uuid        not null references public.studios(id) on delete cascade,
  data        jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists preferred_vendors_updated_at on public.preferred_vendors;
create trigger preferred_vendors_updated_at before update on public.preferred_vendors
  for each row execute procedure public.set_updated_at();

alter table public.preferred_vendors enable row level security;

create index if not exists preferred_vendors_studio_id_idx  on public.preferred_vendors(studio_id);
create index if not exists preferred_vendors_updated_at_idx on public.preferred_vendors(updated_at desc);

-- ─── RLS — visible/mutable to any member of the owning studio ──────────────────
drop policy if exists "preferred_vendors: studio select" on public.preferred_vendors;
create policy "preferred_vendors: studio select" on public.preferred_vendors for select
  using (public.is_studio_member(studio_id));

drop policy if exists "preferred_vendors: studio insert" on public.preferred_vendors;
create policy "preferred_vendors: studio insert" on public.preferred_vendors for insert
  with check (public.is_studio_member(studio_id));

drop policy if exists "preferred_vendors: studio update" on public.preferred_vendors;
create policy "preferred_vendors: studio update" on public.preferred_vendors for update
  using  (public.is_studio_member(studio_id))
  with check (public.is_studio_member(studio_id));

drop policy if exists "preferred_vendors: studio delete" on public.preferred_vendors;
create policy "preferred_vendors: studio delete" on public.preferred_vendors for delete
  using (public.is_studio_member(studio_id));
