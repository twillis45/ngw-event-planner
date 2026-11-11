// ─── WHAT A GUEST IS TOLD WHEN SHE HANDS OVER HEALTH DETAILS ─────────────────
//
// Stage 9 board, work order #5 (11/11/2026). The public invite asks for
// allergies, diet rules, and access needs — health-adjacent data — and no
// privacy policy is published yet (BRAND.policies are all null). So the invite
// says, at those fields, the few things the code makes true.
//
// THIS COPY IS OWNER-APPROVED TEXT, AND COUNSEL SEES IT. Change the sentence
// only with the owner's sign-off. It is one constant so there is one thing to
// approve, and every place the invite shows it reads it from here.
//
// WHY EACH CLAIM IS TRUE (re-check these before changing a word):
//   · "Only your host and their planning team see" (owner-approved 11/11/2026;
//     "team" because every member of the host's studio can read the answers,
//     so "only your host" would overstate it) — the public endpoints never return another guest's
//     answers: GET /api/public/invite/{code} whitelists display fields and sends
//     a COUNT of confirmed guests, never names or details; the guest-detail
//     read-back GET /api/events/{id}/rsvps is planner-authenticated and scoped to
//     the event's studio (backend/app/routers/rsvp.py, list_rsvps +
//     _assert_event_studio_read): every member of the studio that owns the event.
//     InviteV2 shows other guests as a count or first-name initials only, and
//     only from the roster already on the host's own device.
//   · Where it lives — the answers are stored with the host's event in the app's
//     database (supabase/migrations/009_rsvp_submissions.sql,
//     015_rsvp_guest_details.sql: allergens / diets / access columns).
//   · "To have them deleted, email …" (owner-approved 11/11/2026) — BRAND.support (src/lib/brand.js), the one
//     inbox the app names for a person.
//   · Nothing is shown on a public page.
//
// WHAT IT DELIBERATELY DOES NOT SAY: how long anything is kept. A 90-day purge
// function exists (public.purge_old_rsvp_submissions, migration 009), but the
// migration schedules it only where pg_cron is already installed and otherwise
// skips with a notice; that it runs in production is not verified. A time claim
// would be unbacked. Say nothing about time until the code enforces one.
//
// PURE: no I/O.
import { BRAND } from './brand';

export const GUEST_DATA_NOTICE =
  `Only your host and their planning team see these answers. To have them deleted, email ${BRAND.support}.`;
