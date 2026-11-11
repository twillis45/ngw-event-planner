# Runbook — NGW Event Planner

**Owner:** Todd Willis · **Frequency:** every session that touches this repo
**Last Updated:** 2026-11-02 · **Stage:** 8 (Maintain)

### Purpose

The operational half of the handoff. `HANDOFF.md` answers *where is it, is it
green, what's next*; this answers *how do I run it, and what will lie to me*.

Every trap below cost real time in a session and is written with the command
that settles it. They are not hypothetical — each has a date.

---

## Prerequisites

- [ ] **Node 20**: `export PATH=/usr/local/opt/node@20/bin:$PATH` — the default
      node is 16 and playwright and the gates need 20.
- [ ] **The repo root is `demo/`.** The directory above it says "not a git
      repo" and it is lying to you. Every path here is relative to `demo/`.
- [ ] Ports **5233** and **5244** free (playwright's preview servers).
- [ ] `gh` authenticated, for CI reads.

---

## Procedure — before every push

#### Step 1: the whole verification set, one command
```
export PATH=/usr/local/opt/node@20/bin:$PATH
node scripts/verify-all.mjs --fast
```
**Expected:** `✓ all 9 passed`, exit 0. `--fast` skips the 20-minute browser
matrix; drop it to include everything.
**If it fails:** read the per-step table it prints. It COLLECTS rather than
chains, so one red step does not hide the others.

#### Step 2: the browser matrix, when UI changed
```
cd hostv2 && npm run build && nohup npx playwright test --reporter=line > /tmp/matrix.log 2>&1 &
```
**Expected:** ~20 minutes, then `N passed`. Baseline is **909 passed / 190
skipped / 0 failed**.
**If it fails:** see Troubleshooting. Run it DETACHED — a session restart kills
an attached run and the truncation looks exactly like a failure.

#### Step 3: push ONCE, and only when CI is idle
```
# GATE the push on the check. Do not print the count and then push anyway.
[ "$(gh run list --limit 3 --json status --jq '[.[]|select(.status!="completed")]|length')" = 0 ] \
  && git push origin main \
  || echo "CI in flight — waiting"
```
**Expected:** a clean push, or the wait message.
**If it fails:** pushing over a running workflow **cancels it**.

**Do NOT stamp-and-push as a second commit.** That pattern —
`push` → `handoff:stamp` → `commit` → `push` — **cancels its own first run,
every time**, and it did so on 2026-09-03 to a run carrying an allergen fix.
The freshness check tolerates **3 commits of drift** precisely so the stamp
does not need to chase every push. Stamp when it complains, not by habit:
```
npm run handoff:check   # only stamp when THIS goes red
```
**The general form, and it is the same error twice tonight:** a check printed
before an action is not a gate. Put it in the condition, or it is decoration.

---

## Verification

- [ ] `npm run handoff:check` → green. HANDOFF's SHA is a claim; this is what
      checks it.
- [ ] `git rev-list --count origin/main..HEAD` → **0**. Committing is not
      shipping.
- [ ] CI green on the pushed SHA — read the FAILURE line, not the tail.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| A suite reports "N passed" and you believe it, but something is broken | **`\| tail -2` cuts the "N failed" line directly above the summary.** Cost three wrong diagnoses on 2026-09-02 | `\| grep -E "^\s+[0-9]+ (failed\|passed\|skipped)"` — never `tail` |
| `grep -c` "fails" a script that is working | grep exits **1** when it finds zero matches. The failure signal means "no matches" | Read the exit status of the command you are reporting, not the pipeline's |
| Backend pytest passes by hand, fails to COLLECT under a script | Node 20 is at `/usr/local/opt` — the **Intel** Homebrew prefix — so on Apple Silicon it runs under Rosetta and every child inherits x86_64. `python3` then cannot load `pydantic_core`'s arm64 binary | `arch -arm64 python3 ...`. `verify:all` already guards it. Print `process.arch` before theorising |
| `gate:cra` red locally, green in CI on the same commit | Stale `node_modules/.cache` — babel-loader's lint cache holds a result from before a symbol acquired its use | `rm -rf node_modules/.cache`. **When a gate disagrees with CI, clear the cache before believing either** |
| An e2e change has no effect | The preview server serves the **existing** `hostv2/dist` and never builds | `cd hostv2 && npm run build` first. A red-proof without a rebuild proves nothing |
| A `for f in $VAR` loop silently does nothing | **zsh does not word-split unquoted variables** — the loop runs once with the whole string | `while read -r f; do … done <<< "$VAR"` |
| `npx jest` reports ~1369 failures | It scans `node_modules` | `CI=1 npx react-scripts test --watchAll=false` from `demo/` |
| A chained gate's later steps never run | `gate:hostv2` exits **1 unconditionally** — CI retired it 2026-08-01 and the npm script was never removed | Never chain after it. It is deliberately excluded from `verify:all` |
| A test passes while the thing is visibly broken | `toBeVisible()` does **not** check opacity — an `opacity:0` element passes | Assert `getComputedStyle(el).opacity`. Screenshot after the geometry check |
| A check "cannot fail" | It reads the SOURCE rather than the rendered page | A check that reads the code cannot see what the code renders. Drive the page |
| A dated test fixture behaves oddly | A hardcoded seed date drifts: a "T-3" state was 39 days PAST | `boardMatrix.spec.mjs` now guards every dated label. Patch dates relative to today |
| `cd` in a command "did not work" | The shell cwd resets to `demo/` between calls | Use absolute paths, or `cd` inside the same command |

---

## Rollback

**Rewritten 11/11/2026 for the `live` profile.** The 9/2 procedure assumed the
`demo` profile, where taking the site down was the whole story. Production is
now four layers: the front end (GitHub Pages), the API (Render
`ngw-events-api`), payments (Stripe) and the database (Supabase). Roll back
only the layer that broke, fastest first. **Written, never rehearsed:** run
layers 1 and 2 once, deliberately, and record the times here.

**1. Front end: roll the site back to a good commit** (about 5 minutes, no
downtime). `--ref` takes a branch, not a SHA, so point a branch at the good
commit first. **Pass `live` explicitly:** a manual run defaults to `demo`, and
`demo` builds with no sign-in, so every host would lose sight of their cloud
events.
```
git push origin <good-sha>:refs/heads/rollback-$(date +%Y%m%d)
gh workflow run "Deploy Pages (from source)" --ref rollback-$(date +%Y%m%d) -f release_profile=live
# then: curl -s https://twillis45.github.io/ngw-event-planner/RELEASE_SHA.txt  → must name <good-sha> and release_profile=live
```
The next merge to `main` deploys `main` again, so fix forward or revert on
`main` (`git revert <sha>`) before merging anything else.

**2. API: roll Render back to the previous deploy** (about 2 minutes). Render
dashboard → `ngw-events-api` → Events → the last good deploy → **Rollback**.
`render.yaml` sets `autoDeploy: true`, so the next push to `main` redeploys:
turn auto-deploy off in the service settings for the duration, and back on
after the fix merges.

**3. Payments: stop selling** (seconds, no deploy). Render → `ngw-events-api` →
Environment → remove `STRIPE_SECRET_KEY` and save (Render restarts the
service). Checkout then refuses with a 503, `/api/capabilities` reports Stripe
off, and the pass sheet stops offering the button. Passes already bought stay
held: entitlements live in `event_passes`, not in Stripe. To also pause
webhook delivery: Stripe Dashboard → Developers → Webhooks → the
`…/api/stripe/webhook` destination → Disable. Stripe retries a failed delivery
for up to 3 days, so after re-enabling, resend any failed events from the same
screen. The client's pass locks are set at build time
(`REACT_APP_BILLING_LIVE`) and stay until that variable is unset and the site
redeployed (layer 1).

**4. Database: there is no down migration.** Migrations are forward-only. A bad
schema change is fixed by a new migration, or by restoring a backup (§B below:
backups on, and one restore performed, are both still owed). Note that
`supabase_migrations.schema_migrations` ends at 016 while production carries
017–021 (applied by hand 11/7). Record them there before the next migration
push, or a push may try to re-run them; 021's `add constraint` is not safe to
re-run.

**Take the whole site down** (last resort): Settings → Pages → unpublish, or
`gh repo edit twillis45/ngw-event-planner --visibility private`. The API keeps
running; do layer 3 as well if money is involved.

**Undo a code change:** `git revert <sha>`. Restore a file from a red-proof with
a saved copy, **never `git checkout --`**, which reverts the guarded edit along
with the reintroduced fault.

---

## Owner attestations — the three dashboard checks that gate stage 9

Three of the six stage-5 OPENs are not engineering: they are facts about the
**live Supabase project** that only its dashboard can show, and a session
cannot sign for them. Each one below is written so it takes minutes, produces
a result you can paste, and names exactly where to write that result. Dashboard
labels are as of 2026-11; if a menu has moved, the SQL is the authority.

Where to write the result, every time: the matching row in
`docs/audits/2026-08-21_SECURITY_TRACK_CHECKLIST.md` (OPEN → DONE with the
date and what you saw), the matching checkbox on
[The First Recorded Gate](https://claude.ai/artifact/GhAvQW5ogLhg1pyzcoGQZ8)
(`s5-rls`, `s5-backup`, `s5-rate`), and one line in `HANDOFF.md`. Three
places, one fact, same edit — the gate artifact's own corrections record what
happens when the done line and the open line are updated separately.

### A — RLS is actually applied (two minutes, and it is a query, not an eyeball)

1. Supabase dashboard → your project → **SQL Editor** → new query. Paste:
   ```sql
   select c.relname                       as table_name,
          c.relrowsecurity                as rls_on,
          c.relforcerowsecurity           as rls_forced,
          (select count(*) from pg_policies p
             where p.schemaname = 'public' and p.tablename = c.relname) as policies
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
   order by rls_on, table_name;
   ```
2. **What a pass looks like:** every row `rls_on = true`. Tenant tables carry
   policies (`events` 4, `clients` 4, `preferred_vendors` 4, `studio_settings`
   3, `studio_invitations` 2, `studios` 1, `studio_members` 1, plus the
   rsvp / vendor-brief / event_passes policies). The six research tables
   (`research_*`, `provider_run_logs`) show `rls_on = true` with
   `policies = 0` — that is correct, they are server-only (migration 018).
3. **What a fail looks like, and what it means:**
   - Any `rls_on = false` → that table is readable and writable by anyone
     holding the publishable anon key, through `/rest/v1/<table>`, regardless
     of what the app does. If the six research tables are the ones showing
     false, migration `018_research_tables_rls.sql` has not reached the
     project yet (the integration applies `supabase/migrations` on push to
     `main`); merge it, re-run the query. Anything else showing false is new
     and goes straight into the security checklist as a finding.
   - A tenant table with `policies = 0` and `rls_on = true` means **nobody**
     can read it from the app (RLS on with no policy denies) — the app would be
     broken, not insecure; you would already know.
4. Record: the date, "all N rows rls_on = true", and the policy counts you
   saw. That sentence IS the attestation.

### B — Backups are on, and one restore has been performed (an hour, once)

1. Dashboard → **Database → Backups**. Read what it says, not what the tier
   page implies: the Free tier has **no** scheduled backups; Pro has daily
   backups with 7-day retention; PITR is a paid add-on. Record the tier, the
   most recent backup's timestamp, and the retention shown. If the page says
   no backups exist, that is the finding — record it and stop here; the drill
   below needs a backup to restore.
2. **The drill, without touching production.** Do not restore over the live
   project. Either:
   - **Branch / new project:** create a throwaway project (or a database
     branch, where the plan offers one), restore the latest backup into it,
     then in its SQL Editor run `select count(*) from public.events;` and
     `select id, updated_at from public.events order by updated_at desc limit 3;`
     and compare to the same queries on production. Matching counts and
     stamps = the backup is real and restorable. Delete the throwaway.
   - **Download path:** download the backup file, restore it with `psql`
     into a local Postgres, run the same two queries.
3. Record: tier, backup cadence and retention as shown, the restore method,
   the two query results side by side, and the wall-clock time the restore
   took — that number is the real RTO and nothing else on this spine has it.

### C — Login rate limiting (five minutes; read, do not tune)

1. Dashboard → **Authentication → Rate Limits** (older layouts: Authentication
   → Settings, scroll to rate limits). The page lists each limit with its
   current value: sign-ins / sign-ups per IP per window, token refreshes,
   OTP verifications, emails sent per hour, anonymous sign-ins.
2. Record every row **as shown** — the values, not "defaults." Supabase has
   changed these over time and the built-in SMTP sender in particular carries
   a very low email-per-hour ceiling that matters for magic-link sign-in, which
   is this app's only sign-in method.
3. Decide nothing yet. The attestation is "I read them, here they are." If the
   email ceiling is below what a launch day needs, that becomes a line in the
   checklist, not a change made from the dashboard in the same sitting.

### D — The two telemetry arrivals (not attestations, but yours alone)

- **Sentry:** open the project in Sentry, filter to the last 24h, and find one
  event from the production origin. Presence of the DSN in the bundle is
  already proven (2026-10-13); this is the other half. If there is none, open
  the live site, trigger a harmless error (e.g. a `?rsvp=` code that does not
  exist, then watch Issues for five minutes). One event seen = `s7-delivery`
  closes for Sentry.
- **PostHog:** Activity → Live events, filtered to the production host. Load
  the live site once; one `$pageview` from that host closes the PostHog half
  (the gated funnel events — `invite_shared` and the three beside it in
  `activationFunnel.spec.mjs` — need a real action to fire and are not the
  arrival check).

---

## Escalation

| Situation | Who | Why it cannot be delegated |
|---|---|---|
| Any gate ruling, any design call | The review board | Standing delegation, 2026-09-02, until withdrawn |
| Culturally-specific copy | An **insider** seat, not this board | The general panel correctly declined to rule without one |
| Telemetry proof (PostHog / Sentry consoles) | Todd | Needs his accounts. Presence in the bundle is not arrival |
| Stranger-proof first run | Todd | Needs people who have never seen it |
| Rollback rehearsal | Todd | Takes the live site down |
| Repast copy before it reaches strangers | 3 real community members | A panel of lenses is not consent |

---

## History

| Date | Run by | Notes |
|---|---|---|
| 2026-09-03 | Claude (stage 8) | First runbook. Every trap above was paid for in the 2026-09-02/03 session |
| 2026-11-02 | Claude (sixtieth entry) | Added **Owner attestations** — the three dashboard checks (RLS applied, backups + restore drill, login rate limits) and the two telemetry arrivals, each with the query or page, what a pass and a fail look like, and where to write the result. Writing check A surfaced six `public` tables created without RLS (migration 012); closed by 018 and gated by `everyPublicTableHasRls.test.js` |
