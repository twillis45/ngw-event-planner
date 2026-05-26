# NGW Event Boss — Open TODOs

Queue of items to mirror into Notion once the connector recovers (it's been
returning `net::ERR_FAILED` from the MCP).

## Operational / deploy
- **Verify a real sending domain in Resend and fix `COMMUNICATION_EMAIL_FROM`.**
  Right now the Render env var points at an unverified address (Render's
  `onrender.com` host), so the comms backend's approval emails will fail at
  send-time. Action: in Resend → Domains → add and verify `noguessworksystems.com`
  (DNS records), then update Render env `COMMUNICATION_EMAIL_FROM` to e.g.
  `noreply@noguessworksystems.com` (or `events@…`). Same address can then be
  reused as the Supabase Auth Sender email so all outbound mail comes from one
  branded domain. *(Added 2026-05-26 — flagged while wiring Resend SMTP for
  Supabase Auth magic links.)*

## Validation still owed
- Authenticated cloud round-trip for events (signed-in create → row appears →
  delete → row removed). Blocked on email rate limit / sign-in.
- Multi-user isolation test (Test D / Test E) — same-studio sharing + different-
  studio denial. Needs ≥2 confirmed users.
- Motion-feel subjective pass (Sprint 11A item — needs a human).

## GTM
- Gumroad listing (packaging/pricing/copy).
