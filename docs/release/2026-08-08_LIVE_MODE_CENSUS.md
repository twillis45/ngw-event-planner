# Live Mode Readiness -- census against the code, 2026-08-08

Companion to `LIVE_MODE_READINESS.md` (created 2026-07-31). That document opens:

> **Nothing on this list is implemented, and this sprint deliberately did not begin any of it.**

**That sentence is no longer true, and it was not fully true when written.** This census
walks the same twelve sections and marks each item against the code as it stands today.
Written because working a stale list means rebuilding things that already exist -- the same
failure mode that put three drifted line numbers into `WHERE_WE_ARE.md`.

Method: `file:line` for every verdict. Nothing here was driven against a live Supabase
project (see "What I could not verify" at the end) -- these are claims about CODE, and where
an item can only be settled by driving a real project, it is marked as such rather than
guessed.

## Verdict key

- **BUILT** -- the code exists and is wired to a caller on the live surface.
- **PARTLY** -- exists, but with a named hole.
- **ABSENT** -- probed and not found. The probes are stated so the claim can be refuted.
- **NEEDS PROJECT** -- a code census cannot settle it; it needs a live project or the
  Supabase dashboard.
- **BAD ITEM** -- the checklist item cannot be satisfied as written.

---

## Headline findings

1. **Seven of twelve sections are substantially built.** Auth (S3), session (S4), event CRUD
   (S5), cloud-save honesty (S6), authorization (S9), rate limits (S10) and error monitoring
   (S11) all have real implementations. S6 in particular -- which the checklist singles out
   as *"the one most likely to be wrong today"* -- has a five-state machine
   (`src/lib/api/syncState.js:53`) with **31 tests** (`src/lib/api/__tests__/syncState.test.js`).

2. **S1's verification tool cannot do what S1 asks.** The item says "Production migrations
   applied and verified against the production project (`npm run check:migrations`)".
   `scripts/check-migrations.mjs` makes **no network call at all** -- it is a static guard
   that fails if a new file under `backend/migrations/` creates a table owned by
   `supabase/migrations/` (canonical list at `:14`). It passes today. It says nothing
   whatsoever about whether production migrations are applied. **BAD ITEM** -- it needs a
   different instrument, and one does not exist in this repo.

3. **The local-to-cloud migration is wired only into the FROZEN shell.** `migrateLocalToCloud`
   (`src/lib/api/events.js:204`) has exactly one caller: `src/App.js:45470` -- the CRA host
   shell that `CLAUDE.md` freezes as donor-only. **hostv2 never calls it.** So S7's first
   item ("a host who used the demo and then signs in does not lose their local events") is
   built for the shell nobody is supposed to use and absent from the one they do.

4. **hostv2 cannot delete an event at all.** Not an inference -- the file says so at
   `hostv2/src/HostShellV2.jsx:2200-2208`: *"every `setCustoms` call is an add or an update
   ... If a real 'delete this event' ..."*. `deleteEvent` exists (`events.js:139`) and is
   imported by `src/App.js:133`, never by hostv2 (`HostShellV2.jsx:153` imports only
   `loadEvents` and `saveEvent`). So S5's delete items and S8's account-deletion item have no
   surface on the live host app.

---

## Section by section

### 1. Database and migrations

| Item | Verdict | Evidence |
|---|---|---|
| Production migrations applied + verified via `check:migrations` | **BAD ITEM** | `scripts/check-migrations.mjs` is static, no network (`:23-33`). Passes today. Proves folder ownership only. |
| Migration state matches deployed code, no drift | **NEEDS PROJECT** | 16 files in `supabase/migrations/` (001-016) + 6 grandfathered in `backend/migrations/` (`check-migrations.mjs:17-20`). Drift is a live-project question. |
| Rollback path for the most recent migration | **ABSENT** | Five files DO contain `drop policy` (002, 004, 005, 006, 009) and my first pass nearly scored that as a rollback path. It is not: `002_rls_policies.sql:5` says so in its own words -- *"Idempotent (drop policy if exists) so it can be re-run safely"*. Those drops make a migration re-runnable FORWARD; none of the 16 files carries a down/reversal block. |
| Backups confirmed, restore tested | **NEEDS PROJECT** | Dashboard-side. Note the app has its OWN local backup ring -- `backupCustomEvents` / `MAX_BACKUPS = 10` (`src/lib/customEventStore.js:39,87`) -- which is device-local and NOT a substitute. |

### 2. Row Level Security

| Item | Verdict | Evidence |
|---|---|---|
| RLS enabled on every anon-reachable table | **PARTLY** | `enable row level security` appears in 8 of 16 migrations (001 x4, 002 x4, 004, 005, 006, 009, 013, 014). Whether that covers EVERY table is a live-project question. |
| Per-event ownership enforced in policy | **BUILT (code)** | `supabase/migrations/002_rls_policies.sql`; `owns_event()` helper per `SUPABASE_SETUP.md:34`. |
| A user cannot read another's events -- **verified by trying** | **NEEDS PROJECT** | The checklist is explicit that reading the policy does not count. Correct, and unmet. |
| Anon role scoped correctly | **NEEDS PROJECT** | `SUPABASE_SETUP.md:47` warns client read access is deliberately NOT enabled and needs an Edge Function. |

### 3. Authentication -- substantially BUILT

| Item | Verdict | Evidence |
|---|---|---|
| Magic link implemented | **BUILT** | `signInWithOtp` at `HostShellV2.jsx:1331`, with real error text surfaced (`:1338-1341`) rather than one blanket message. |
| `REACT_APP_AUTH_REDIRECT` -> hostv2 surface | **NEEDS PROJECT** | `authRedirectUrl()` imported `HostShellV2.jsx:151`. The VALUE is deployment config. |
| URL added in Supabase dashboard | **NEEDS PROJECT** | Dashboard-side. |
| Real-device round trip | **NEEDS PROJECT** | Cannot be done from a code census. |
| Google provider both-on-or-both-off | **NEEDS PROJECT** | `REACT_APP_ENABLE_GOOGLE_AUTH` handled in `scripts/validate-production-config.mjs`. |
| `AUTH_BYPASS`/`BYPASS_ROLE` absent from bundle | **BUILT** | Rejected by `validate-production-config.mjs:63`; the Pages workflow also scans the built artifact for server secrets (`pages-from-source.yml:225`). |
| `PLANNER_TOKEN` absent | **BUILT** | `validate-production-config.mjs:61`. |

### 4. Session persistence -- BUILT

`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
(`src/lib/supabaseClient.js:38-40`). Sign-out clears and tells the truth about it:
*"Signed out -- everything here stays on this device."* (`HostShellV2.jsx:13956`).
Expiry-degrades-to-prompt is **NEEDS PROJECT**.

### 5. Event CRUD -- PARTLY

`loadEvents:78`, `saveEvent:112`, `deleteEvent:139`, `flushPendingEvents:167` all exist in
`src/lib/api/events.js`.

- Create/read/update on the live surface: **BUILT** (`HostShellV2.jsx:153`).
- **Delete: ABSENT on hostv2.** See headline 4.
- Concurrent edits resolve without discarding: **PARTLY -- decided, but never declared.**
  I first scored this ABSENT on a too-narrow probe; that was wrong. There IS a strategy:
  `updated_at` is stored and read (`events.js:87,89`) and every write is
  `.upsert({...}, { onConflict: 'id' })` (`:128`, `:185`, `:213`). That is **last-write-wins
  on the whole event blob**, which is a real answer to "what happens", but it silently
  discards the losing side's concurrent edits and nothing surfaces that. `saveCustomEvents`
  is likewise a whole-array replace (`customEventStore.js:152`). So the checklist's actual
  words -- "resolve without silently discarding one" -- are **NOT** met, but the gap is a
  disclosure and merge-granularity problem, not a missing mechanism.
- Deletion behaviour (soft/hard, recoverable) decided: **ABSENT** -- undecided by definition,
  since there is no delete on the live surface.

### 6. Cloud-save truthfulness -- BUILT, and the checklist's worry is misplaced

Five states, not a boolean: `SYNC_STATUS` (`syncState.js:53`) = SYNCED / PENDING /
SYNC_FAILED / LOCAL_ONLY (+ labels `:62`). `recordSaveResult:187` distinguishes a real
failure from a queued write (`:198`, `reason === 'error'` -> SYNC_FAILED else PENDING).
Offline is queued and retried on reconnect (`installOnlineFlush:235`, wired
`HostShellV2.jsx:1323`), and the flush toast counts what actually flushed (`:1290-1294`).
31 tests. The checklist's note *"most likely to be wrong today -- the demo has no cloud path
to disagree with"* was a reasonable guess in July and is now out of date.

Remaining hole: **none of this has been exercised against a real project**, so it is proven
as logic, not as behaviour. **NEEDS PROJECT** to close honestly.

### 7. Local-to-cloud migration -- PARTLY, and wired to the wrong shell

- Migration function exists: `events.js:204`. **Only caller is `src/App.js:45470`** -- frozen.
- **hostv2 does the reverse only:** `hydrate()` pulls cloud -> local with id-dedup against
  both `APP_EVENTS` and a fresh read of `LS_CUSTOMS` (`HostShellV2.jsx:1295-1301`), filtering
  demo ids and non-`host_event` records. Idempotent in that direction.
- So a host who used the demo, then signs in, keeps local events only in the sense that
  nothing deletes them -- they are never uploaded. They sit at `LOCAL_ONLY` until edited.
- Conflict winner for same-id local vs cloud: **ABSENT.** `hydrate` takes cloud rows that are
  NOT already known; it never reconciles two versions of the same id.
- Host is told what happened: **PARTLY.** The sync toast counts flushed changes; there is no
  "we brought your events up" message on first sign-in.

### 8. Account and data handling -- mostly ABSENT

| Item | Verdict | Evidence |
|---|---|---|
| Account deletion path | **ABSENT** | Probed `HostShellV2.jsx`, `src/lib/api/*`, backend routers for `delete_account`/`deleteAccount`. Not found. |
| Data export to the host | **PARTLY** | `exportCustomEvents` (`customEventStore.js:210`) + `importCustomEvents:230` exist -- a local JSON round trip -- and there is CSV export (`HostShellV2.jsx:4194`). Neither is an account-level "export everything I hold". |
| Retention/deletion documented | **ABSENT** | Not found in `docs/release/`. |
| Guest PII covered | **ABSENT** | Rosters carry names and lodging status (`travelPlan.js:268-286`); no policy found. |
| Privacy statement matches reality | **ABSENT** | No privacy statement located. |

### 9. Authorization -- BUILT

`backend/app/auth.py` is unusually careful and worth reading before touching: it states in
its own header that `require_planner` **authenticates and does not authorize** -- any signed-in
Supabase user passes -- and that per-route `_assert_event_access` is the authorization half.
Token verified by introspection against GoTrue `/auth/v1/user`, so revocation and expiry are
respected without holding the JWT secret; 300s cache (`auth.py:40`).
`ALLOW_DEV_TOKEN` defaults to **false** and must be explicitly `"true"` (`config.py:59`).
Re-verification against production is **NEEDS PROJECT**.

### 10. Rate limits -- PARTLY, exactly as the checklist says

`AI_RATE_MAX` default 15 (`routers/ai.py:113`), sliding window, and the code itself admits
the limiter is **per-process** (`:135`), so the effective ceiling is `AI_RATE_MAX x workers`.
The checklist already knew this. Per-user cost ceiling and bounds on public unauthenticated
routes (e.g. `/api/lodging/unfurl`) were probed and not found -- **ABSENT**, though note the
SSRF guards from the 2026-07-30 security sprint are a different control on the same route.

### 11. Error monitoring -- PARTLY

`src/lib/sentry.js` exists and is wired at `src/index.js`, `src/App.js` and
`hostv2/src/main.jsx`. Whether `REACT_APP_SENTRY_DSN` is SET is deployment config
(**NEEDS PROJECT**). Backend error routing, auth-failure/5xx alerting, and
"verified by causing an error on purpose" are all **ABSENT/NEEDS PROJECT**.

### 12. Rollback -- PARTLY

The `demo` profile actively asserts the ABSENCE of the live values rather than assuming it
(`validate-production-config.mjs:142-146`), which is the strong version of this control and
means a release cannot acquire sign-in by accident. Tested rollback, time-to-rollback, and
"does rolling back strand data written while live" are **ABSENT** -- and the last of those is
the one that matters, because it is a data question, not a deploy question.

---

## What I could not verify, and what I did not do

- **No live Supabase project was contacted.** `.env.local` holds a URL with a value, so a dev
  project is configured on this machine; `.env.production.local` deliberately holds none,
  matching `LIVE_MODE_READINESS.md`. I did not read the key, call the project, or run
  anything against it.
- Every **NEEDS PROJECT** verdict above is a genuine limit of a code census, not a hedge.
- I did not test the RLS boundary, which the checklist rightly insists must be proven by
  trying it rather than by reading policy.

## Suggested order, given what is actually true

1. **S7 + S5-delete on hostv2** -- the two places where the live surface diverges from the
   frozen shell, and both are data-loss shaped. Pure code; no project needed.
2. **Fix the S1 item** so it names an instrument that can answer it, or drop it.
3. **S8** -- account deletion, export, retention. Currently the emptiest section and the one
   with legal weight.
4. Everything marked NEEDS PROJECT, once a staging project is available to drive.
