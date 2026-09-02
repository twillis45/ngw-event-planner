# Deferred at promotion — 2026-09-02

Surface: **hostv2 host shell** · facing: **public** · platform: **web**

**This is the retroactive case.** The surface has been public since 3 August, so
these gates are not owed at a future flip — they are owed *now*, and every line
below is a risk already being carried rather than one about to be taken.

**What actually ships publicly** is the `demo` release profile: localStorage
only, no accounts, no server-held user data. A push to main floors the profile
to `demo` by design; the `live` profile — authenticated, backed by Supabase —
ships only by manual `workflow_dispatch`. That distinction decides which gates
bind today and which bind the day `live` ships, and it is stated per item rather
than blurred.

---

## Gate 1 — Authorization is server-side and real

- [x] **Not binding on what ships today.** The public demo has no accounts and
      no server-held data; there is no privileged route to reach.
- [ ] **Per-route authorization sweep — done, and one condition remains.**
      A standing sweep enumerates eight routers and asserts an unauthorized
      caller is refused; it caught a live unauthenticated route on its first
      run. Finding #8, the portal authorization *design*, is unresolved and is
      a board question rather than an engineering one.
      **Risk accepted:** the routes it governs are unreachable from the demo
      profile. This blocks `live`, not today.

## Gate 2 — Secrets and error surface

- [x] **Measured 2026-09-02 across the whole public bundle** — entry plus all
      seven lazy chunks, 4,034,394 bytes. Zero hits for `service_role`, JWTs,
      `sk_live`/`sk_test`, AWS keys, OpenAI keys, or private-key blocks. No
      backend origin is baked in.
      The only two credential-shaped strings are public by design: the PostHog
      **write-only** ingestion key and the Sentry DSN.
      *Scan the whole corpus.* A first attempt covered the entry chunk alone and
      reported zero — the PostHog key it missed lives in the fifth lazy chunk.
- [ ] **Login rate limiting — unverified.** Supabase defaults have not been
      checked. **Risk accepted:** no login exists on the demo profile.
      Blocks `live`.
- [ ] **Session flags, expiry, logout invalidation — not re-verified here.**
      Same basis: no session on the demo profile. Blocks `live`.

## Gate 3 — The first-run path you have never seen

- [ ] **Stranger-proof first run — OWED, and it is the oldest debt here.**
      Nobody outside this project has used it. Ease of use is asserted, not
      observed. This is simultaneously marketing phase 2 (comprehension proof),
      counted once, and it is owner-only.
      **Risk accepted: none — this one is not defensible as a deferral.** It is
      simply outstanding on a surface that is already public.
- [x] Empty and first-run states are gated in code: `lib/welcomeGate` is pure
      and unit-tested, and the first-run path has e2e coverage.
- [x] A save failure produces a persistent `role="alert"` naming the cause,
      not a blank screen (`hostv2/src/HostShellV2.jsx:6832`).

## Gate 4 — Reversibility

- [ ] **Backups on, and one restore actually performed — OWED.** Owner-only,
      and one of the nine standing conditions. **Risk accepted:** no
      server-held user data exists on the demo profile, so today the exposure
      is bounded to `live`.
- [x] **A rollback to private — procedure now written, 2026-09-02.**
      It was undocumented, which is the same as not existing at 3am. Fastest
      first; the first two need no deploy and take seconds:

      ```bash
      # 1. FASTEST — stop serving entirely. Settings > Pages > Source: None.
      #    Takes effect in under a minute. Reversible from the same screen.
      gh api -X POST repos/twillis45/ngw-event-planner/pages/builds  # (re-publish after re-enabling)

      # 2. Make the repo private — Pages on a private repo is not served
      #    publicly on the free tier, so this takes the site down with it.
      gh repo edit twillis45/ngw-event-planner --visibility private

      # 3. Roll the CONTENT back without unpublishing: re-run the deploy at a
      #    known-good commit.
      gh workflow run "Deploy Pages (from source)" --ref <good-sha>
      ```

      **Not verified by execution** — taking the live site down to prove the
      command works is not a test worth running unprompted. The commands are
      documented; the owner should run #1 once, deliberately, to confirm the
      path and the timing. Until then this is a written procedure, not a
      rehearsed one, and that distinction is the whole point of this file.

---

## Audit logging — explicitly NOT deferrable here

promote-surface removes audit logging from the deferrable list for any surface
with an admin or ops console, because the console is what creates the failure:
a privileged action nobody can attribute afterwards.

- [x] **Server side it exists** — `admin_audit_log` is written inside the same
      transaction as the write (`backend/app/routers/kcr.py:119`), namespace
      enforced at `admin.py:100`.
- [ ] **Locally it does not.** The only trail in the shipping app is a 50-entry
      write log (`src/lib/customEventStore.js:126`) with **no reader anywhere**.
      A mutation and a *refused* mutation are equally invisible to the only
      person who could act on either. See `docs/ADMIN-CONSOLE.md`.

## The operator-visibility findings that gate Promotion

From `docs/ADMIN-CONSOLE.md`, all verified by hand:

- The admin console reads `localStorage['ngw-events']` — the frozen CRA's key —
  while hostv2 writes `ngw-hostv2-custom-events`. Its "This Browser" panels read
  **empty against the shipping app while labelled as showing it.**
- **No admin surface is reachable from the shipping app at all.**
- Four recovery functions — `restoreBackup`, `importCustomEvents`,
  `listBackups`, `readWriteLog` — are implemented, guarded, unit-tested and have
  **zero callers**.
- Durable storage is never requested on a localStorage-only profile.

---

*A deferral without a named risk is a decision nobody made — it is an omission
with better paperwork. Two items above decline the deferral outright and are
recorded as plainly outstanding instead.*
