-- ─── Guest lodging pick — the rental-house shortlist's reply channel ─────────
-- Canonical, integration-watched migration (see this folder's README).
--
-- WHY: the rental-house intelligence engine (host directive 2026-07-28) shares
-- a shortlist of rental options with the group; guests weigh in from the
-- invite. The pick is an OPINION riding the existing per-guest RSVP upsert —
-- one value per guest, idempotent on (rsvp_code, idempotency_key) — NOT a
-- capacity claim, so the claims-ledger architecture ruling (transactional
-- server ledger for capacity) does not gate it. The host decides; picks
-- inform, never auto-commit.
--
-- PARITY (standing order 2026-07-28, "playbook additions update the backend"):
-- this migration ships in the SAME slice as lib/lodgingIntel.js, the
-- RsvpSubmit `lodging_pick` field, the insert/read-back columns, and
-- `lodgingOptions` joining PUBLIC_EVENT_FIELDS.

alter table public.rsvp_submissions
  add column if not exists lodging_pick text;

comment on column public.rsvp_submissions.lodging_pick is
  'Guest''s preferred lodgingOptions id (or empty) — an opinion for the host, never a booking commitment. Clipped server-side.';
