-- ─── NGW Event Boss — studio_settings (Studio Profile, STUDIO-scoped) ─────────
-- The studio profile / settings object (name, business, contact, market,
-- estimator defaults, notification prefs, saved vendors, integration tokens).
-- Previously localStorage-only (key: ngw-profile), so it did NOT survive a new
-- device, a different browser, or cleared site data. This makes it a single
-- studio-scoped row + RLS so the studio's setup is backed up and shared across
-- the team. One row per studio (studio_id is the primary key). Mirrors 001/002.
-- Run via the Supabase SQL editor or `supabase db push`.

create table if not exists public.studio_settings (
  studio_id   uuid        primary key references public.studios(id) on delete cascade,
  data        jsonb       not null default '{}',
  updated_at  timestamptz not null default now()
);
drop trigger if exists studio_settings_updated_at on public.studio_settings;
create trigger studio_settings_updated_at before update on public.studio_settings
  for each row execute procedure public.set_updated_at();

alter table public.studio_settings enable row level security;

-- ─── RLS — visible/mutable to any member of the owning studio ──────────────────
drop policy if exists "studio_settings: member select" on public.studio_settings;
create policy "studio_settings: member select" on public.studio_settings for select
  using (public.is_studio_member(studio_id));

drop policy if exists "studio_settings: member insert" on public.studio_settings;
create policy "studio_settings: member insert" on public.studio_settings for insert
  with check (public.is_studio_member(studio_id));

drop policy if exists "studio_settings: member update" on public.studio_settings;
create policy "studio_settings: member update" on public.studio_settings for update
  using  (public.is_studio_member(studio_id))
  with check (public.is_studio_member(studio_id));
