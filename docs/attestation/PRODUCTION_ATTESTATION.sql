-- ─── NGW Event Planner — production attestation (database side of stage 5) ───
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It returns ONE table. Export it as CSV and send it back
-- (docs/attestation/OWNER_STEPS.md, step 1).
--
-- READ-ONLY BY CONSTRUCTION. It is a single SELECT over the system catalogs
-- (pg_class, pg_policies, pg_proc, pg_constraint, pg_trigger, information_schema)
-- and privilege probes (has_function_privilege). It writes nothing, changes no
-- schema and no privilege, and sets no role. attestationSqlIsReadOnly.test.js
-- fails the build if a write keyword, a second statement, or a dollar-quoted
-- block ever appears here.
--
-- Columns: check · subject · expected · actual · verdict (PASS / FAIL; the
-- header row is INFO). The summary row near the top counts the FAILs.
--
-- WHERE EACH EXPECTATION COMES FROM (so a FAIL can be traced to a file):
--   tables + policies  supabase/migrations/001–028 (applied by the Supabase
--                      integration, 017–021 by hand on 11/7), backend/migrations
--                      and src/lib/knowledge/kaw1-migration.sql (hand-applied;
--                      a table from those two that is ABSENT here passes, since
--                      an absent table exposes nothing). The list is the one
--                      everyPublicTableHasRls.test.js scans.
--   studios / studio_members  either the supabase/002 policy alone, or that
--                      plus backend/0003's policies, if 0003 was ever run here
--                      (backend/MIGRATIONS.md: databases where 0003 ran keep it).
--   definers           scripts/check-security-definers.js after every migration:
--                      only the five studio helpers are callable by
--                      `authenticated`; nothing is callable by `anon`; every
--                      definer pins search_path = pg_catalog, public, pg_temp (019, 021).
--   rsvp               019 revokes purge_old_rsvp_submissions from anon and
--                      authenticated, grants service_role, drops rsvp_anon_insert.
--   017–021 objects    named in each file; the same probes as the RUNBOOK's
--                      "Record the hand-applied migrations" query c, extended.
--   helper links       023: helper_links + helper_confirmations, RLS on with no
--                      policy (server-only, as 013/014), and the account
--                      deletion function's body names both tables.
--   guest questions    024: guest_threads, guest_messages and the three
--                      invite-open tables, RLS on with no policy; the deletion
--                      body names all five; purge_old_guest_activity is a
--                      SECURITY DEFINER that anon and authenticated cannot run
--                      (the S9-1 lesson) and service_role can.
--   guest photos       025: guest_photos, RLS on with no policy; the deletion
--                      body names it; guest_photos_due_for_purge is a SECURITY
--                      DEFINER that anon and authenticated cannot run (S9-1);
--                      the guest-photos bucket is private and NO storage
--                      policy names it (only the server's service role reads
--                      or writes its files). 024 is expected recorded too.
--                      The two consent columns (uploader_private,
--                      share_blocked; board 11/16) exist.
--   event deletion     028 (owner, 11/16): an enabled AFTER DELETE trigger
--                      events_drop_guest_activity on public.events removes the
--                      event's guest threads, messages and invite opens at
--                      once; its function is a SECURITY DEFINER no browser
--                      role may run, and no guest activity is left whose
--                      event row is gone.
--   event files        022: storage.objects policies for the event-files bucket
--                      grant nothing to anon/public and all check auth.uid();
--                      the bucket is private with the app's 10 MB / type limits.
--   user_metadata      not from a migration: a security property. Supabase lets a
--                      signed-in user write their own user_metadata, so a policy
--                      that authorizes on it is open to every signed-in user.
with
role_present as (
  select exists (select 1 from pg_roles where rolname = 'anon')          as anon,
         exists (select 1 from pg_roles where rolname = 'authenticated') as authenticated,
         exists (select 1 from pg_roles where rolname = 'service_role')  as service_role
),

expected_tables (source, tbl, policies, alt_policies) as (values
  -- supabase/migrations (canonical)
  ('supabase/migrations', 'studios',            array['studios: member select'],
                                                array['studios: member select', 'studios_insert', 'studios_select', 'studios_update']),
  ('supabase/migrations', 'studio_members',     array['members: member select'],
                                                array['members: member select', 'members_manage', 'members_select']),
  ('supabase/migrations', 'events',             array['events: cohost select', 'events: cohost update', 'events: studio delete', 'events: studio insert', 'events: studio select', 'events: studio update'], null::text[]),
  ('supabase/migrations', 'clients',            array['clients: studio delete', 'clients: studio insert', 'clients: studio select', 'clients: studio update'], null),
  ('supabase/migrations', 'studio_invitations', array['invitations: member select', 'invitations: owner write'], null),
  ('supabase/migrations', 'preferred_vendors',  array['preferred_vendors: studio delete', 'preferred_vendors: studio insert', 'preferred_vendors: studio select', 'preferred_vendors: studio update'], null),
  ('supabase/migrations', 'studio_settings',    array['studio_settings: member insert', 'studio_settings: member select', 'studio_settings: member update'], null),
  ('supabase/migrations', 'rsvp_submissions',   array[]::text[], null),
  ('supabase/migrations', 'research_campaign_runs', array[]::text[], null),
  ('supabase/migrations', 'provider_run_logs',      array[]::text[], null),
  ('supabase/migrations', 'research_observations',  array[]::text[], null),
  ('supabase/migrations', 'research_evidence',      array[]::text[], null),
  ('supabase/migrations', 'research_findings',      array[]::text[], null),
  ('supabase/migrations', 'research_queue_jobs',    array[]::text[], null),
  ('supabase/migrations', 'vendor_brief_links',         array[]::text[], null),
  ('supabase/migrations', 'vendor_brief_confirmations', array[]::text[], null),
  ('supabase/migrations', 'helper_links',               array[]::text[], null),
  ('supabase/migrations', 'helper_confirmations',       array[]::text[], null),
  ('supabase/migrations', 'guest_threads',              array[]::text[], null),
  ('supabase/migrations', 'guest_messages',             array[]::text[], null),
  ('supabase/migrations', 'invite_opens',               array[]::text[], null),
  ('supabase/migrations', 'invite_open_days',           array[]::text[], null),
  ('supabase/migrations', 'invite_open_devices',        array[]::text[], null),
  ('supabase/migrations', 'guest_photos',               array[]::text[], null),
  ('supabase/migrations', 'event_cohosts',              array['event_cohosts: own rows'], null),
  ('supabase/migrations', 'event_announcements',        array[]::text[], null),
  ('supabase/migrations', 'event_passes',               array[]::text[], null),
  ('supabase/migrations', 'pass_payment_blocks',        array[]::text[], null),
  ('supabase/migrations', 'retired_event_ids',          array[]::text[], null),
  ('supabase/migrations', 'rate_counters',              array[]::text[], null),
  ('supabase/migrations', 'email_stops',                array[]::text[], null),
  -- backend/migrations (frozen legacy, hand-applied)
  ('backend/migrations', 'event_channels',      array[]::text[], null),
  ('backend/migrations', 'event_messages',      array[]::text[], null),
  ('backend/migrations', 'pinned_decisions',    array[]::text[], null),
  ('backend/migrations', 'channel_read_state',  array[]::text[], null),
  ('backend/migrations', 'event_owners',        array[]::text[], null),
  ('backend/migrations', 'admin_support_notes', array['support_notes: admin read'], null),
  ('backend/migrations', 'admin_audit_log',     array['audit_log: admin read'], null),
  ('backend/migrations', 'admin_error_log',     array['error_log: admin read'], null),
  ('backend/migrations', 'kcr',                 array['kcr: admin read'], null),
  ('backend/migrations', 'kas_records',         array['kas: admin read'], null),
  -- src/lib/knowledge/kaw1-migration.sql (hand-applied)
  ('kaw1-migration.sql', 'worker_instances',            array['admin-only'], null),
  ('kaw1-migration.sql', 'worker_runs',                 array['admin-only'], null),
  ('kaw1-migration.sql', 'provider_check_log',          array['admin-only'], null),
  ('kaw1-migration.sql', 'change_records',              array['admin-only'], null),
  ('kaw1-migration.sql', 'research_pipeline_manifests', array['admin-only'], null),
  ('kaw1-migration.sql', 'scheduler_jobs',              array['admin-only'], null),
  ('kaw1-migration.sql', 'research_metrics',            array['admin-only'], null)
),

public_tables as (
  select c.relname::text as tbl,
         c.relrowsecurity as rls,
         coalesce(array_agg(p.policyname::text order by p.policyname::text)
                    filter (where p.policyname is not null), array[]::text[]) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
  where c.relkind in ('r', 'p')
  group by c.relname, c.relrowsecurity
),

-- authenticated_execute: true only where a migration grants it on purpose.
expected_definers (sig, authenticated_execute) as (values
  ('is_studio_member(uuid)',              true),
  ('is_studio_owner(uuid)',               true),
  ('list_studio_members(uuid)',           true),
  ('claim_pending_invitations()',         true),
  ('ensure_studio()',                     true),
  ('handle_new_user()',                   false),
  ('purge_old_rsvp_submissions(integer)', false),
  ('cleanup_deleted_account()',           false),
  ('purge_old_guest_activity(integer)',   false),
  ('guest_photos_due_for_purge(integer)', false),
  ('is_event_cohost(text)',               true),
  ('events_studio_locked()',              false),
  ('events_drop_guest_activity()',        false),
  ('events_retire_id()',                  false),
  ('events_refuse_retired_id()',          false),
  ('events_pass_stamp_sticks()',          false)
),

public_functions as (
  select p.oid,
         p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as sig,
         p.prosecdef,
         (select substr(cfg, 13) from unnest(p.proconfig) cfg where cfg like 'search_path=%') as search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.prokind = 'f'
),

definers as (
  select f.oid, f.sig, f.search_path, e.authenticated_execute as exp_auth
  from public_functions f
  left join expected_definers e on e.sig = f.sig
  where f.prosecdef
),

-- The two retention purges: SECURITY DEFINER, so no browser role may run them.
purge (fn, oid) as (values
  ('purge_old_rsvp_submissions(integer)', to_regprocedure('public.purge_old_rsvp_submissions(integer)')),
  ('purge_old_guest_activity(integer)',   to_regprocedure('public.purge_old_guest_activity(integer)'))
),

migration_objects (migration, object, present) as (values
  ('015', 'column rsvp_submissions.allergens',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'rsvp_submissions' and column_name = 'allergens')),
  ('016', 'column rsvp_submissions.lodging_pick',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'rsvp_submissions' and column_name = 'lodging_pick')),
  ('017', 'table event_passes',
     to_regclass('public.event_passes') is not null),
  ('017', 'unique constraint on event_passes.stripe_session_id',
     exists (select 1 from pg_constraint k
             join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any (k.conkey)
             where k.conrelid = to_regclass('public.event_passes') and k.contype = 'u'
               and a.attname = 'stripe_session_id')),
  ('017', 'index event_passes_studio_idx',
     to_regclass('public.event_passes_studio_idx') is not null),
  ('018', 'RLS on all six research tables',
     (select count(*) from pg_class c
      where c.relrowsecurity and c.oid in (
        to_regclass('public.research_campaign_runs'), to_regclass('public.research_queue_jobs'),
        to_regclass('public.research_findings'),      to_regclass('public.research_evidence'),
        to_regclass('public.research_observations'),  to_regclass('public.provider_run_logs'))) = 6),
  -- Not ensure_studio(): 010 already revoked anon there, so it reads true
  -- whether or not 019 ran. is_studio_member(uuid) was anon-callable until 019.
  ('019', 'anon cannot execute is_studio_member(uuid)',
     coalesce((select case when r.anon then not has_function_privilege('anon', to_regprocedure('public.is_studio_member(uuid)'), 'execute') end
               from role_present r), false)),
  ('019', 'policy rsvp_anon_insert gone from rsvp_submissions',
     not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'rsvp_submissions' and policyname = 'rsvp_anon_insert')),
  ('020', 'column event_passes.stripe_payment_intent',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'event_passes' and column_name = 'stripe_payment_intent')),
  ('020', 'index event_passes_payment_intent_idx',
     to_regclass('public.event_passes_payment_intent_idx') is not null),
  ('020', 'table pass_payment_blocks',
     to_regclass('public.pass_payment_blocks') is not null),
  ('020', 'check constraint on pass_payment_blocks.reason',
     exists (select 1 from pg_constraint k
             where k.conrelid = to_regclass('public.pass_payment_blocks') and k.contype = 'c')),
  ('021', 'foreign key studio_members_auth_user_fk',
     exists (select 1 from pg_constraint k
             where k.conname = 'studio_members_auth_user_fk' and k.contype = 'f'
               and k.conrelid = to_regclass('public.studio_members'))),
  ('021', 'foreign key studios_auth_creator_fk',
     exists (select 1 from pg_constraint k
             where k.conname = 'studios_auth_creator_fk' and k.contype = 'f'
               and k.conrelid = to_regclass('public.studios'))),
  ('021', 'security definer cleanup_deleted_account()',
     coalesce((select f.prosecdef from public_functions f where f.sig = 'cleanup_deleted_account()'), false)),
  ('021', 'enabled trigger cleanup_deleted_account on auth.users',
     exists (select 1 from pg_trigger t
             where t.tgrelid = to_regclass('auth.users') and t.tgname = 'cleanup_deleted_account'
               and t.tgenabled <> 'D')),
  ('023', 'table helper_links',
     to_regclass('public.helper_links') is not null),
  ('023', 'table helper_confirmations',
     to_regclass('public.helper_confirmations') is not null),
  ('023', 'cleanup_deleted_account() purges helper_links and helper_confirmations',
     coalesce((select p.prosrc like '%helper_links%' and p.prosrc like '%helper_confirmations%'
               from pg_proc p where p.oid = to_regprocedure('public.cleanup_deleted_account()')), false)),
  ('024', 'tables guest_threads, guest_messages, invite_opens, invite_open_days, invite_open_devices',
     (select count(*) from unnest(array[to_regclass('public.guest_threads'), to_regclass('public.guest_messages'),
                                        to_regclass('public.invite_opens'), to_regclass('public.invite_open_days'),
                                        to_regclass('public.invite_open_devices')]) t where t is not null) = 5),
  ('024', 'cleanup_deleted_account() purges the guest-question and invite-open tables',
     coalesce((select p.prosrc like '%guest_threads%' and p.prosrc like '%guest_messages%'
                      and p.prosrc like '%invite_opens%' and p.prosrc like '%invite_open_days%'
                      and p.prosrc like '%invite_open_devices%'
               from pg_proc p where p.oid = to_regprocedure('public.cleanup_deleted_account()')), false)),
  ('024', 'anon and authenticated cannot execute purge_old_guest_activity(integer)',
     coalesce((select case when r.anon and r.authenticated then
                 not has_function_privilege('anon', to_regprocedure('public.purge_old_guest_activity(integer)'), 'execute')
                 and not has_function_privilege('authenticated', to_regprocedure('public.purge_old_guest_activity(integer)'), 'execute') end
               from role_present r), false)),
  ('025', 'table guest_photos',
     to_regclass('public.guest_photos') is not null),
  ('025', 'cleanup_deleted_account() purges guest_photos',
     coalesce((select p.prosrc like '%guest_photos%'
               from pg_proc p where p.oid = to_regprocedure('public.cleanup_deleted_account()')), false)),
  ('025', 'anon and authenticated cannot execute guest_photos_due_for_purge(integer), and service_role can',
     coalesce((select case when r.anon and r.authenticated and r.service_role then
                 not has_function_privilege('anon', to_regprocedure('public.guest_photos_due_for_purge(integer)'), 'execute')
                 and not has_function_privilege('authenticated', to_regprocedure('public.guest_photos_due_for_purge(integer)'), 'execute')
                 and has_function_privilege('service_role', to_regprocedure('public.guest_photos_due_for_purge(integer)'), 'execute') end
               from role_present r), false)),
  ('025', 'bucket guest-photos is private and holds JPEG only',
     exists (select 1 from storage.buckets b where b.id = 'guest-photos' and not b.public
               and b.allowed_mime_types = array['image/jpeg'])),
  ('025', 'no storage.objects policy names the guest-photos bucket',
     not exists (select 1 from pg_policies p
                 where p.schemaname = 'storage' and p.tablename = 'objects'
                   and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%guest-photos%')),
  ('025', 'guest_photos has the consent columns uploader_private and share_blocked',
     (select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'guest_photos'
         and column_name in ('uploader_private', 'share_blocked')) = 2),
  ('026', 'table event_cohosts',
     to_regclass('public.event_cohosts') is not null),
  ('026', 'event_cohosts rows go when their event or their account goes (both foreign keys cascade)',
     (select count(*) from pg_constraint c
       where c.conrelid = to_regclass('public.event_cohosts') and c.contype = 'f' and c.confdeltype = 'c') = 2),
  ('026', 'the browser can only read event_cohosts: authenticated has no insert, update or delete',
     coalesce((select case when r.authenticated then
                 not has_table_privilege('authenticated', 'public.event_cohosts', 'insert')
                 and not has_table_privilege('authenticated', 'public.event_cohosts', 'update')
                 and not has_table_privilege('authenticated', 'public.event_cohosts', 'delete') end
               from role_present r), false)),
  ('026', 'enabled trigger events_studio_locked on public.events',
     exists (select 1 from pg_trigger t where t.tgname = 'events_studio_locked'
               and t.tgrelid = to_regclass('public.events') and t.tgenabled = 'O')),
  ('027', 'table event_announcements',
     to_regclass('public.event_announcements') is not null),
  ('027', 'event_announcements rows go when their event goes (the foreign key cascades)',
     (select count(*) from pg_constraint c
       where c.conrelid = to_regclass('public.event_announcements') and c.contype = 'f' and c.confdeltype = 'c') = 1),
  ('027', 'the browser cannot touch event_announcements: anon and authenticated have no select, insert, update or delete',
     coalesce((select not bool_or(has_table_privilege(r.rolname, 'public.event_announcements', p))
                 from pg_roles r, unnest(array['select','insert','update','delete']) p
                where r.rolname in ('anon','authenticated')
                  and to_regclass('public.event_announcements') is not null), false)),
  ('028', 'enabled trigger events_drop_guest_activity on public.events',
     exists (select 1 from pg_trigger t where t.tgname = 'events_drop_guest_activity'
               and t.tgrelid = to_regclass('public.events') and t.tgenabled = 'O')),
  ('028', 'anon and authenticated cannot execute events_drop_guest_activity()',
     coalesce((select case when r.anon and r.authenticated then
                 not has_function_privilege('anon', to_regprocedure('public.events_drop_guest_activity()'), 'execute')
                 and not has_function_privilege('authenticated', to_regprocedure('public.events_drop_guest_activity()'), 'execute') end
               from role_present r
              where to_regprocedure('public.events_drop_guest_activity()') is not null), false)),
  ('028', 'no guest question, guest email or invite open is left from a deleted event',
     coalesce((select not exists (select 1 from public.guest_threads t where not exists (select 1 from public.events e where e.id = t.event_id))
                  and not exists (select 1 from public.invite_opens o where not exists (select 1 from public.events e where e.id = o.event_id))
                  and not exists (select 1 from public.invite_open_days d where not exists (select 1 from public.events e where e.id = d.event_id))
              where to_regclass('public.guest_threads') is not null), false)),
  ('029', 'enabled triggers events_retire_id and events_refuse_retired_id on public.events',
     (select count(*) = 2 from pg_trigger t where t.tgname in ('events_retire_id','events_refuse_retired_id')
        and t.tgrelid = to_regclass('public.events') and t.tgenabled = 'O')),
  ('029', 'the browser cannot read or write retired_event_ids',
     coalesce((select not bool_or(has_table_privilege(r.rolname, 'public.retired_event_ids', p))
                 from pg_roles r, unnest(array['select','insert','update','delete']) p
                where r.rolname in ('anon','authenticated')
                  and to_regclass('public.retired_event_ids') is not null), false)),
  ('030', 'enabled trigger events_pass_stamp_sticks on public.events',
     exists (select 1 from pg_trigger t where t.tgname = 'events_pass_stamp_sticks'
               and t.tgrelid = to_regclass('public.events') and t.tgenabled = 'O')),
  ('030', 'the browser cannot read or write rate_counters',
     coalesce((select not bool_or(has_table_privilege(r.rolname, 'public.rate_counters', p))
                 from pg_roles r, unnest(array['select','insert','update','delete']) p
                where r.rolname in ('anon','authenticated')
                  and to_regclass('public.rate_counters') is not null), false)),
  ('030', 'an invitation is written only as planner or assistant, by its inviter',
     exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'studio_invitations'
               and p.policyname = 'invitations: owner write'
               and p.with_check like '%invited_by%' and p.with_check like '%planner%'))
),

-- supabase_migrations.schema_migrations may not exist; read it only through
-- query_to_xml (a read-only SELECT text), and only when to_regclass finds it,
-- so a missing table cannot stop the script.
recorded as (
  select to_regclass('supabase_migrations.schema_migrations') is not null as present,
         case when to_regclass('supabase_migrations.schema_migrations') is not null then
           (select coalesce(array_agg(v::text order by v::text), array[]::text[])
            from unnest(xpath('//version/text()',
                   query_to_xml('select version::text as version from supabase_migrations.schema_migrations',
                                false, false, ''))) v)
         end as versions
),

expected_versions as (
  select array_agg(lpad(g::text, 3, '0') order by g) as versions from generate_series(1, 28) g
),

all_rows (ord, k, "check", subject, expected, actual, verdict) as (
  -- (a) every public table: RLS on, and exactly the policies the migrations create
  select 10, e.tbl, 'rls_enabled', 'public.' || e.tbl || '  [' || e.source || ']',
         case when e.source = 'supabase/migrations' then 'true' else 'true (or absent: hand-applied source)' end,
         coalesce(t.rls::text, 'table absent'),
         case when t.tbl is null then case when e.source = 'supabase/migrations' then 'FAIL' else 'PASS' end
              when t.rls then 'PASS' else 'FAIL' end
  from expected_tables e left join public_tables t on t.tbl = e.tbl

  union all
  select 11, e.tbl, 'policies', 'public.' || e.tbl || '  [' || e.source || ']',
         cardinality(e.policies) || ': ' || coalesce(nullif(array_to_string(e.policies, ' | '), ''), '(none, server-only)')
           || coalesce('  OR  ' || cardinality(e.alt_policies) || ': ' || array_to_string(e.alt_policies, ' | ')
                       || '  (if backend/0003 ran)', ''),
         case when t.tbl is null then 'table absent'
              else cardinality(t.policies) || ': ' || coalesce(nullif(array_to_string(t.policies, ' | '), ''), '(none)') end,
         case when t.tbl is null then case when e.source = 'supabase/migrations' then 'FAIL' else 'PASS' end
              when t.policies @> e.policies and e.policies @> t.policies then 'PASS'
              when e.alt_policies is not null and t.policies @> e.alt_policies and e.alt_policies @> t.policies then 'PASS'
              else 'FAIL' end
  from expected_tables e left join public_tables t on t.tbl = e.tbl

  union all
  select 12, t.tbl, 'unlisted_table', 'public.' || t.tbl,
         'no migration source creates this table: PASS only if RLS on with 0 policies (deny-all)',
         'rls=' || t.rls || ', ' || cardinality(t.policies) || ' policies: '
           || coalesce(nullif(array_to_string(t.policies, ' | '), ''), '(none)'),
         case when t.rls and cardinality(t.policies) = 0 then 'PASS' else 'FAIL' end
  from public_tables t
  where not exists (select 1 from expected_tables e where e.tbl = t.tbl)

  union all
  select 13, 'user_metadata', 'policy_trusts_user_metadata', 'every policy in public',
         'none (user_metadata is writable by the signed-in user)',
         coalesce(string_agg(p.tablename || '.' || p.policyname, ' | ' order by p.tablename, p.policyname), 'none'),
         case when count(*) = 0 then 'PASS' else 'FAIL' end
  from pg_policies p
  where p.schemaname = 'public'
    and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ilike '%user_metadata%'

  -- (b) every SECURITY DEFINER function in public
  union all
  select 20, e.sig, 'definer_present', 'public.' || e.sig, 'security definer',
         coalesce((select case when f.prosecdef then 'security definer' else 'security invoker' end
                   from public_functions f where f.sig = e.sig), 'absent'),
         case when exists (select 1 from public_functions f where f.sig = e.sig and f.prosecdef) then 'PASS' else 'FAIL' end
  from expected_definers e

  union all
  select 21, d.sig, 'definer_declared', 'public.' || d.sig,
         'declared by a migration (scripts/check-security-definers.js)',
         case when d.exp_auth is null then 'not declared by any migration' else 'declared' end,
         case when d.exp_auth is null then 'FAIL' else 'PASS' end
  from definers d

  union all
  select 22, d.sig, 'definer_anon_execute', 'public.' || d.sig, 'false',
         case when r.anon then has_function_privilege('anon', d.oid, 'execute')::text else 'role anon absent' end,
         case when not r.anon then 'FAIL'
              when has_function_privilege('anon', d.oid, 'execute') then 'FAIL' else 'PASS' end
  from definers d cross join role_present r

  union all
  select 23, d.sig, 'definer_authenticated_execute', 'public.' || d.sig,
         coalesce(d.exp_auth, false)::text,
         case when r.authenticated then has_function_privilege('authenticated', d.oid, 'execute')::text
              else 'role authenticated absent' end,
         case when not r.authenticated then 'FAIL'
              when has_function_privilege('authenticated', d.oid, 'execute') = coalesce(d.exp_auth, false)
              then 'PASS' else 'FAIL' end
  from definers d cross join role_present r

  union all
  select 24, d.sig, 'definer_search_path', 'public.' || d.sig, 'pg_catalog, public, pg_temp',
         coalesce(d.search_path, 'not set'),
         case when replace(coalesce(d.search_path, ''), ' ', '') = 'pg_catalog,public,pg_temp' then 'PASS' else 'FAIL' end
  from definers d

  -- (c) the retention functions specifically
  union all
  select 30, p.fn || ' ' || v.role_name, 'purge_execute', 'public.' || p.fn || ' as ' || v.role_name,
         v.expect::text,
         case when p.oid is null then 'function absent'
              when not v.role_ok then 'role ' || v.role_name || ' absent'
              else has_function_privilege(v.role_name, p.oid, 'execute')::text end,
         case when p.oid is null or not v.role_ok then 'FAIL'
              when has_function_privilege(v.role_name, p.oid, 'execute') = v.expect then 'PASS' else 'FAIL' end
  from purge p
  cross join role_present r
  cross join lateral (values ('anon', false, r.anon),
                             ('authenticated', false, r.authenticated),
                             ('service_role', true, r.service_role)) v (role_name, expect, role_ok)

  -- (d) the anon RSVP insert policy is gone
  union all
  select 31, 'rsvp_anon_insert', 'rsvp_anon_insert_absent', 'policy rsvp_anon_insert on public.rsvp_submissions',
         'absent',
         case when exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'rsvp_anon_insert')
              then 'present' else 'absent' end,
         case when exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'rsvp_anon_insert')
              then 'FAIL' else 'PASS' end

  -- (d2) uploaded event files (022): no anon access, every policy scoped to
  --      the uploader or the event's studio, and the bucket private
  union all
  select 32, 'a', 'event_files_anon', 'policies on storage.objects for event-files granting anon or public',
         '(none)',
         coalesce((select string_agg(p.policyname, ' | ' order by p.policyname) from pg_policies p
                    where p.schemaname = 'storage' and p.tablename = 'objects'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%event-files%'
                      and ('anon' = any (p.roles) or 'public' = any (p.roles))), '(none)'),
         case when exists (select 1 from pg_policies p
                    where p.schemaname = 'storage' and p.tablename = 'objects'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%event-files%'
                      and ('anon' = any (p.roles) or 'public' = any (p.roles)))
              then 'FAIL' else 'PASS' end
  union all
  select 32, 'b', 'event_files_scoped', 'event-files policies that do not check auth.uid()',
         '(none)',
         coalesce((select string_agg(p.policyname, ' | ' order by p.policyname) from pg_policies p
                    where p.schemaname = 'storage' and p.tablename = 'objects'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%event-files%'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') not like '%auth.uid()%'), '(none)'),
         case when exists (select 1 from pg_policies p
                    where p.schemaname = 'storage' and p.tablename = 'objects'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%event-files%'
                      and coalesce(p.qual, '') || coalesce(p.with_check, '') not like '%auth.uid()%')
              then 'FAIL' else 'PASS' end
  union all
  select 32, 'c', 'event_files_bucket', 'storage.buckets event-files: private, 10 MB limit, type list set',
         'public=false, 10485760, types set',
         coalesce((select 'public=' || b.public::text || ', ' || coalesce(b.file_size_limit::text, 'no limit')
                          || ', ' || case when b.allowed_mime_types is null then 'any type' else 'types set' end
                   from storage.buckets b where b.id = 'event-files'), 'bucket absent'),
         case when exists (select 1 from storage.buckets b where b.id = 'event-files' and not b.public
                             and b.file_size_limit = 10485760 and b.allowed_mime_types is not null)
              then 'PASS' else 'FAIL' end

  -- (e) objects that prove 015–025 are in this database
  union all
  select 40, m.migration || ' ' || m.object, 'migration_object', m.migration || ': ' || m.object, 'present',
         case when m.present then 'present' else 'missing' end,
         case when m.present then 'PASS' else 'FAIL' end
  from migration_objects m

  -- (f) what supabase_migrations.schema_migrations records
  union all
  select 50, 'a', 'migrations_recorded', 'supabase_migrations.schema_migrations', '001 … ' || ev.versions[array_length(ev.versions, 1)],
         case when not rc.present then 'table absent'
              else coalesce(nullif(array_to_string(rc.versions, ','), ''), '(no rows)') end,
         case when rc.present and rc.versions @> ev.versions then 'PASS' else 'FAIL' end
  from recorded rc cross join expected_versions ev

  union all
  select 51, 'b', 'migrations_missing', 'versions 001–' || ev.versions[array_length(ev.versions, 1)] || ' not recorded', '(none)',
         case when not rc.present then 'table absent'
              else coalesce(nullif(array_to_string(array(select x from unnest(ev.versions) x
                                                          where not (x = any (rc.versions)) order by x), ','), ''),
                            '(none)') end,
         case when rc.present and rc.versions @> ev.versions then 'PASS' else 'FAIL' end
  from recorded rc cross join expected_versions ev
)

select "check", subject, expected, actual, verdict
from (
  -- (g) header: when and where this ran
  select 0 as ord, '' as k, 'header' as "check", current_database()::text as subject,
         'read-only attestation: send this whole result back as CSV' as expected,
         now()::text || ' | ' || version() as actual, 'INFO' as verdict
  union all
  select 1, '', 'summary', 'all checks below',
         '0 FAIL',
         (select count(*) filter (where verdict = 'FAIL') || ' FAIL, '
                 || count(*) filter (where verdict = 'PASS') || ' PASS' from all_rows),
         case when (select count(*) from all_rows where verdict = 'FAIL') = 0 then 'PASS' else 'FAIL' end
  union all
  select ord, k, "check", subject, expected, actual, verdict from all_rows
) report
order by ord, k, "check";
