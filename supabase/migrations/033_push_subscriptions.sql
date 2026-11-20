-- 033 — Device notifications: one row per browser that asked for them
--
-- Owner decision "B", 11/20/2026: device notifications for desktop browsers
-- (Chrome, Safari, Edge, Firefox) and Android Chrome. iPhone and iPad wait for
-- Add to Home Screen and a manifest, which a past board rejected, so no row
-- here ever comes from one. A host turns them on per device in You & settings
-- ("Notifications on this device"); the server then sends the same alerts the
-- host alert email already sends (backend/app/host_alerts.py: a guest replied
-- or asked a question, a vendor answered a brief), under the same rules: at
-- most one an hour per event, off per event with `hostAlerts: false`, and
-- never the words anyone wrote.
--
-- One row per push subscription: the push service's address for that browser
-- (`endpoint`) and the two keys the payload is encrypted to (RFC 8291). The
-- server deletes a row when the push service answers 404 or 410 (the browser
-- dropped it) and when the host turns notifications off on that device. Until
-- this table exists the server sends no push and the routes answer 503
-- (backend/app/web_push.py, routers/push.py).
--
-- The server writes through the service role. The rules below are for any
-- signed-in browser role that reaches the table directly: a person can see,
-- add and remove only their own rows, and nobody can update one in place.
-- Safe to re-apply.

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  endpoint   text        not null unique,     -- the push service's address for one browser
  p256dh     text        not null,            -- the browser's public key (base64url)
  auth       text        not null,            -- the browser's auth secret (base64url)
  created_at timestamptz not null default now(),
  last_ok_at timestamptz                      -- last time the push service accepted one
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon;
grant select, insert, delete on public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
