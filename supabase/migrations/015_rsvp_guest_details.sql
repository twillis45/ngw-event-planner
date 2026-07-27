-- ─── Guest RSVP details the server was silently dropping (data-loss fix) ──────
-- Canonical, integration-watched migration (see this folder's README).
--
-- WHY: the invite's redesigned reply form collects structured dietary/access
-- answers (allergens/diets/access), optional guest contact (phone/email), a
-- mailing address (when the host collects them), and the crab-picker answer —
-- and the client has been SENDING them (InviteV2 submit + the offline outbox).
-- RsvpSubmit (backend/app/routers/rsvp.py) had no such fields, so pydantic
-- dropped them without error: a remote guest's ALLERGY answer never reached the
-- host's roster. Same-browser invites masked the loss via the localStorage queue.
-- Audited 2026-07-27 (invite rail audit, Destination + Multi-Day program).
--
-- Sensitivity: allergens/diets/access are health-adjacent — same handling class
-- as the existing `needs` column (already marked SENSITIVE above). phone/email/
-- mailing_address are guest-volunteered contact fields, host-read-back only
-- (never exposed on any public endpoint).

alter table public.rsvp_submissions
  add column if not exists allergens       text[],
  add column if not exists diets           text[],
  add column if not exists access          text[],
  add column if not exists picks_crabs     boolean,
  add column if not exists phone           text,
  add column if not exists email           text,
  add column if not exists mailing_address text;
