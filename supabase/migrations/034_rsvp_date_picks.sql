-- ─── Guest date picks — the "Ask on the invite" date poll's reply channel ────
-- Canonical, integration-watched migration (see this folder's README).
--
-- WHY (owner pick 11/21/2026, "B: Ask on the invite"): a Group Trip or Team
-- Retreat host offers up to three date ranges (event.dateOptions), and each
-- guest ticks every range that works, on the invite, before the attendance
-- question. The ticks are an OPINION riding the existing per-guest RSVP upsert,
-- exactly like lodging_pick (016): one row per guest, idempotent on
-- (rsvp_code, idempotency_key), written only through the public RSVP route,
-- which resolves the event from the code and keeps only ids the event offers.
-- The host decides ("Use these dates"); picks never set the dates themselves.
--
-- SECURITY: no new policy. rsvp_submissions keeps its RLS and grants as they
-- are (019 revoked browser access); the backend's service path is the only
-- writer, and a guest can only overwrite her own row (her device's key).
--
-- PARITY: ships in the same slice as the RsvpSubmit `date_picks` field, the
-- insert / read-back / withdraw columns, `dateOptions` joining
-- PUBLIC_EVENT_FIELDS, and the invite's payload (InviteV2 + lib/api/rsvp.js).

alter table public.rsvp_submissions
  add column if not exists date_picks text[];

comment on column public.rsvp_submissions.date_picks is
  'Ids of the host''s dateOptions this guest said work — an opinion for the host, never the event date. Filtered server-side to the event''s own option ids.';
