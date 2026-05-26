-- ─── NGW Event Boss — Studio invitations (Phase 1 Members) ──────────────────
-- Lets an owner invite a planner by email. The invitee receives a magic link;
-- on first sign-in, claim_pending_invitations() inserts their studio_members
-- row and marks the invitation used. No service-role key needed.

create table if not exists public.studio_invitations (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  email       text not null,                            -- compared lowercased
  role        text not null default 'planner' check (role in ('owner','planner','assistant')),
  invited_by  uuid not null,                            -- auth.users id
  created_at  timestamptz default now(),
  used_at     timestamptz,
  unique (studio_id, email)
);
create index if not exists idx_studio_invitations_email
  on public.studio_invitations (lower(email));
create index if not exists idx_studio_invitations_studio
  on public.studio_invitations (studio_id);

alter table public.studio_invitations enable row level security;

-- ── is_studio_owner helper (idempotent mirror of backend/0003) ───────────────
create or replace function public.is_studio_owner(p_studio uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.studio_members m
    where m.studio_id = p_studio and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ── RLS: members read; owners write ──────────────────────────────────────────
drop policy if exists "invitations: member select" on public.studio_invitations;
create policy "invitations: member select" on public.studio_invitations for select
  using (public.is_studio_member(studio_id));

drop policy if exists "invitations: owner write" on public.studio_invitations;
create policy "invitations: owner write" on public.studio_invitations for all
  using (public.is_studio_owner(studio_id))
  with check (public.is_studio_owner(studio_id));

-- ── claim_pending_invitations(): the signed-in user picks up any pending
--    invitations for their email and gets a membership row. Idempotent. ───────
create or replace function public.claim_pending_invitations()
returns table(studio_id uuid, role text)
language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_rec     record;
begin
  if v_user_id is null then return; end if;
  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is null then return; end if;

  for v_rec in
    select id, studio_id as sid, role as r
    from public.studio_invitations
    where lower(email) = v_email and used_at is null
  loop
    insert into public.studio_members (studio_id, user_id, role)
      values (v_rec.sid, v_user_id, v_rec.r)
      on conflict (studio_id, user_id) do nothing;
    update public.studio_invitations set used_at = now() where id = v_rec.id;
    studio_id := v_rec.sid;
    role      := v_rec.r;
    return next;
  end loop;
end;
$$;

-- ── list_studio_members(): joins members with auth.users for email/display.
--    SECURITY DEFINER so the auth.users join works; gated by membership check. ─
create or replace function public.list_studio_members(p_studio_id uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language sql security definer stable as $$
  select sm.user_id, u.email, sm.role, sm.created_at
  from public.studio_members sm join auth.users u on u.id = sm.user_id
  where sm.studio_id = p_studio_id
    and public.is_studio_member(p_studio_id);
$$;
