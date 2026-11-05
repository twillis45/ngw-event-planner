-- Auth admin deletion and application cleanup commit in one GoTrue transaction.
-- NOT VALID preserves historical orphans for separate review while enforcing
-- all new references, including writes made with an unexpired deleted-user JWT.
alter table public.studio_members add constraint studio_members_auth_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.studios add constraint studios_auth_creator_fk
  foreign key (created_by) references auth.users(id) on delete set null not valid;

create or replace function public.cleanup_deleted_account()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  solo_studios uuid[];
  personal_events text[];
begin
  -- Serialize membership/ownership changes, including concurrent invitations.
  lock table public.studios, public.studio_members in share row exclusive mode;
  if exists (
    select 1 from public.studio_members mine
    where mine.user_id=old.id and mine.role='owner'
      and exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>old.id)
      and not exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>old.id and other.role='owner')
  ) then
    raise exception 'ownership_transfer_required';
  end if;
  if exists (select 1 from storage.objects where owner_id=old.id::text or owner=old.id) then
    raise exception 'storage_transfer_required';
  end if;

  select coalesce(array_agg(s.id), '{}'::uuid[]) into solo_studios
  from public.studios s
  where (s.created_by=old.id or exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id=old.id))
    and not exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id<>old.id);
  select coalesce(array_agg(e.id), '{}'::text[]) into personal_events
  from public.events e where e.studio_id=any(solo_studios);
  if to_regclass('public.event_owners') is not null then
    select coalesce(array_agg(distinct id), '{}'::text[]) into personal_events from (
      select unnest(personal_events) as id
      union select eo.event_id from public.event_owners eo
      where (eo.studio_id=any(solo_studios) or (eo.owner_id=old.id::text and eo.studio_id is null))
        and not exists (select 1 from public.events e where e.id=eo.event_id and not (e.studio_id=any(solo_studios)))
    ) owned;
  end if;

  if to_regclass('public.event_channels') is not null then
    delete from public.event_channels where event_id=any(personal_events);
  end if;
  if to_regclass('public.rsvp_submissions') is not null then
    delete from public.rsvp_submissions where event_id=any(personal_events);
  end if;
  if to_regclass('public.vendor_brief_confirmations') is not null then
    delete from public.vendor_brief_confirmations where event_id=any(personal_events);
  end if;
  if to_regclass('public.vendor_brief_links') is not null then
    delete from public.vendor_brief_links where event_id=any(personal_events);
  end if;
  if to_regclass('public.event_owners') is not null then
    delete from public.event_owners where event_id=any(personal_events);
    update public.event_owners set owner_id='deleted-account', owner_email=null where owner_id=old.id::text;
  end if;
  if to_regclass('public.channel_read_state') is not null then
    delete from public.channel_read_state where reader_key=old.id::text;
  end if;
  if to_regclass('public.event_messages') is not null then
    update public.event_messages set pinned_by=null where pinned_by=old.id::text;
  end if;
  if to_regclass('public.pinned_decisions') is not null then
    update public.pinned_decisions set pinned_by=null where pinned_by=old.id::text;
  end if;
  -- Financial receipts and immutable admin/security records survive, as their
  -- existing schema requires. Remove the optional purchaser attribution only.
  if to_regclass('public.event_passes') is not null then
    update public.event_passes set purchased_by=null where purchased_by=old.id::text;
  end if;
  delete from public.studio_invitations where invited_by=old.id or lower(email)=lower(old.email);
  update public.studios set created_by=null where created_by=old.id and not (id=any(solo_studios));
  delete from public.studio_members where user_id=old.id;
  delete from public.studios where id=any(solo_studios);
  return old;
end;
$$;
revoke all on function public.cleanup_deleted_account() from public, anon, authenticated;
drop trigger if exists cleanup_deleted_account on auth.users;
create trigger cleanup_deleted_account before delete on auth.users
  for each row execute function public.cleanup_deleted_account();
