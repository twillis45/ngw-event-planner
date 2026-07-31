# Live Mode Readiness Checklist

**Created 2026-07-31.** Nothing on this list is implemented, and this sprint
deliberately did not begin any of it.

## Why this list exists

The public site ships as the **open, localStorage-only demo**. That is a product
decision, not a gap: `.env.production.local` omits the live values on purpose,
and the `demo` release profile now asserts their absence so a release cannot
acquire sign-in by accident.

Selecting the `live` profile changes what the product *is* for every visitor —
from a demo anyone can open and play with, to an authenticated system holding
real people's event data. The build gate proves the *configuration* is coherent
(anon key, matching project, https API). It proves nothing about whether the
product is ready to hold real data. That is what this list is for.

**Do not select `live` until every item below has an owner and an answer.**

---

## 1. Database and migrations

- [ ] Production migrations applied and verified against the production project (`npm run check:migrations`).
- [ ] Migration state matches the schema the deployed code expects — no drift.
- [ ] A rollback path exists for the most recent migration.
- [ ] Backups confirmed on, with a known restore procedure and a tested restore.

## 2. Row Level Security

- [ ] RLS **enabled** on every table reachable with the anon key.
- [ ] Per-event ownership enforced in policy, not only in application code.
- [ ] A signed-in user cannot read or write another user's events — verified by trying it, not by reading policy.
- [ ] Anonymous role can do exactly what it is meant to and nothing more.
- [ ] Verified with the anon key specifically, since that is what ships in the bundle.

## 3. Authentication

- [ ] `REACT_APP_AUTH_REDIRECT` set to `https://twillis45.github.io/ngw-event-planner/hostv2/` — the authoritative host surface, not the frozen CRA root. *(Host decision, 2026-07-31.)*
- [ ] That exact URL added to Supabase → Authentication → URL Configuration. Without it Supabase silently falls back to the project Site URL and the emailed link is unusable.
- [ ] Magic-link round trip tested on a real device, not just desktop.
- [ ] Google provider either enabled in Supabase **and** `REACT_APP_ENABLE_GOOGLE_AUTH=true`, or both off. A button that leads nowhere is worse than no button.
- [ ] `REACT_APP_AUTH_BYPASS` / `REACT_APP_BYPASS_ROLE` confirmed absent from the built bundle (the validator rejects them; verify anyway).
- [ ] `REACT_APP_PLANNER_TOKEN` confirmed absent — the legacy shared write-gate must not ship.

## 4. Session persistence

- [ ] Session survives reload, tab close, and returning the next day.
- [ ] Expiry and refresh behave predictably; an expired session degrades to a sign-in prompt, never to silent data loss.
- [ ] Signing out clears local state that belonged to the account.

## 5. Event CRUD

- [ ] Create, read, update, delete verified against the production project end to end.
- [ ] Concurrent edits from two sessions resolve without silently discarding one.
- [ ] Deletion behaviour defined: soft or hard, and recoverable or not — decided, not discovered.

## 6. Cloud-save truthfulness

- [ ] The save indicator reflects the **actual** persistence result.
- [ ] A failed cloud write never renders as "saved".
- [ ] Offline is shown as offline; queued writes are shown as queued.
- [ ] A silent fallback to localStorage is never presented as a successful sync. *(This is the one most likely to be wrong today — the demo has no cloud path to disagree with.)*

## 7. Local-to-cloud migration

- [ ] A host who used the demo and then signs in does not lose their local events.
- [ ] Migration is idempotent — signing in twice does not duplicate events.
- [ ] Conflicts between a local event and a cloud event of the same id have a defined winner.
- [ ] The host is told what happened, in host language.

## 8. Account and data handling

- [ ] Account deletion path exists and actually removes data.
- [ ] Data export available to the host.
- [ ] Retention and deletion documented.
- [ ] Guest PII (names, emails, phone numbers in rosters) covered by the same policy.
- [ ] Privacy statement matches what the system truly does.

## 9. Authorization

- [ ] Every backend route that mutates data requires a planner (already enforced — re-verify against production).
- [ ] The `ALLOW_DEV_TOKEN` bypass is **off** in the production backend environment.
- [ ] Role assumptions in the UI match what the backend enforces.

## 10. Rate limits and abuse

- [ ] The AI proxy limiter is sized for real traffic; it is currently **per-process**, so with multiple workers the effective limit is `AI_RATE_MAX × workers`.
- [ ] A per-user cost ceiling exists for provider-backed routes.
- [ ] Public unauthenticated routes (e.g. `/api/lodging/unfurl`) are bounded.

## 11. Error monitoring

- [ ] `REACT_APP_SENTRY_DSN` set, or a conscious decision recorded not to.
- [ ] Backend errors reach somewhere a human looks.
- [ ] An alert exists for auth failures and 5xx spikes.
- [ ] Monitoring verified by causing an error on purpose.

## 12. Rollback

- [ ] Rollback from live to demo tested — not assumed. Re-running the `demo` profile is the intended path.
- [ ] Time-to-rollback known and acceptable.
- [ ] Rolling back the frontend does not strand data written while live.
- [ ] Whoever is on call knows the procedure and can run it without this document.

---

## Order of operations when the time comes

1. Work this checklist to completion on a non-production project.
2. Set the repository **Variables** (never Secrets — they are public once built).
3. Dispatch `pages-from-source.yml` with `release_profile=live`.
4. Smoke-test sign-in, event CRUD, and cloud-save honesty against production.
5. Keep the `demo` profile dispatchable as the rollback.
