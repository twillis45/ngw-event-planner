# Owner steps — production attestation pack

Six steps, about 1 hour 45 minutes in all, most of it waiting on the restore.
Each one ends with **Send back:**, and that is all a session needs to record
it. Where to record the result afterward is unchanged: see "Owner
attestations" in `docs/RUNBOOK.md` (security checklist row, gate artifact
checkbox, `HANDOFF.md`).

Dashboard clicks are as of November 2026. **VERIFY** marks a label I could not
confirm from here. If a menu has moved, find the page by its name; the SQL in
step 1 does not depend on any menu.

Nothing in these steps changes production, except step 6, which only adds
notifications. The one restore runs into a **new, throwaway** project.

---

## 1. Database checks: paste one script, send the CSV (5 minutes)

This settles RLS (§A), the definer and RSVP boundaries (019), proof that
017–021 are applied, and what `supabase_migrations.schema_migrations` records.

1. Open `docs/attestation/PRODUCTION_ATTESTATION.sql` in the repo and copy the
   whole file.
2. Supabase dashboard → the production project → **SQL Editor** (left
   sidebar) → **New query** (VERIFY: may read "+ New snippet").
3. Paste, then **Run** (or Cmd+Enter). It is a single `select`: it reads the
   catalogs and changes nothing. If the editor asks to confirm a destructive
   query, stop and send me a screenshot. It should not ask.
4. The result is one table of about 135 rows: `check`, `subject`,
   `expected`, `actual`, `verdict`. Row 2 is the summary, for example
   `0 FAIL, 133 PASS`.
5. Results pane → **Export** → **Download CSV** (VERIFY: may be "Copy as CSV").
   Send the whole file; do not filter to the FAILs.

**Send back:** the CSV file.

**Reading it yourself, if you want to:** any `FAIL` row names the table or
function in `subject`, and `expected` says what the migrations require.
`migrations_missing` listing `017,018,019,020,021` is expected until the
RUNBOOK's "Record the hand-applied migrations" snippet has been run. That is
the one FAIL you already know about. A FAIL on `policy_trusts_user_metadata`
means a policy authorizes on `user_metadata`, which any signed-in user can
set for themselves. Today that can only come from
`src/lib/knowledge/kaw1-migration.sql`, if it was ever applied.

---

## 2. Backups: read the page, then do one restore drill (about 1 hour, once)

### 2a. Read (5 minutes)

Supabase → production project → **Database** (left sidebar) → **Backups**
(VERIFY: under "Platform" in the newer sidebar). Record, as shown on the page:

- the plan or tier (Free has no scheduled backups; Pro has daily backups);
- whether **Point in Time Recovery** is on;
- the newest backup's date and time, **including the timezone shown**;
- how many backups are listed, and the retention the page states.

If the page says there are no backups, that is the finding. Send it and skip 2b.

### 2b. Restore drill into a NEW project (45–60 minutes, mostly waiting)

Never use **Restore** on the production project itself: that overwrites
production.

1. **Before restoring**, write down the backup you will use: its timestamp
   from 2a, called `T` below (for example `2026-11-12 03:00:00+00`).
2. Production **SQL Editor**, run this read-only query with `T` filled in:
   ```sql
   select id, studio_id, updated_at, md5(data::text) as data_md5
   from public.events
   where updated_at <= 'T'
   order by updated_at desc
   limit 1;
   ```
   This is the spot-check row: the newest event that has not changed since
   the backup. Every edit moves `updated_at` forward through the
   `events_updated_at` trigger, so this row must be in the backup byte for
   byte. Keep the four values.
3. **Database → Backups → Restore to a new project** (VERIFY: on some plans this
   is a tab on the Backups page, on others a button beside each backup). Choose
   the backup `T`, name the new project `ngw-restore-drill-<date>`, choose the
   same region, and confirm. **Note the time you clicked.**
   - If the option is absent (it depends on plan): **Download** the backup
     beside `T` instead, restore it with `psql` into a local Postgres, and run
     step 5 there. Say which route you used.
4. Wait until the new project's status reads healthy. **Note the time.** The
   gap between the two times is the measured restore time (RTO). Nothing else
   in the spine has this number.
5. In the **new** project's SQL Editor, run:
   ```sql
   select id, studio_id, updated_at, md5(data::text) as data_md5
   from public.events
   where id = '<the id from step 2>';

   select count(*) as events from public.events;
   ```
   Pass: the first query returns the same four values as step 2.
6. Delete the throwaway: new project → **Project Settings** → **General** →
   **Delete project**. It bills compute while it exists.

**Send back:** the 2a values; the restore route (new project or download);
the two clock times and the difference; the step 2 row and the step 5 row,
side by side; and the restored `events` count.

---

## 3. Auth rate limits: read, do not tune (5 minutes)

Supabase → production project → **Authentication** → **Rate Limits** (VERIFY:
under "Configuration" in the Authentication sidebar; older layouts put this
under Authentication → Settings).

Record every row exactly as shown, with its unit and window, for example
"Token verifications: 30 per 5 minutes per IP". Expect rows for emails sent,
SMS sent, token refreshes, token verifications (OTP and magic link),
anonymous sign-ins, and sign-ups and sign-ins. Copy whatever rows the page
shows, including any not on this list.

Then **Authentication → Emails → SMTP Settings** (VERIFY): record whether a
custom SMTP server is enabled. With Supabase's built-in sender the
emails-per-hour limit is very low, and magic link is this app's only way
to sign in.

**Send back:** the rows as shown, plus custom SMTP on or off. Change nothing.

---

## 4. Sentry: one event from production (10 minutes)

1. Sentry → the project used by the live site → **Issues**. Set the
   environment to `production` (the app reports `NODE_ENV`) and the time range
   to 24 hours. If an event from `twillis45.github.io` is already there,
   skip to **Send back**.
2. **The RUNBOOK's harmless event:** open
   `https://twillis45.github.io/ngw-event-planner/?rsvp=attestation-probe-0000`
   (an RSVP code that does not exist) and watch **Issues** for five minutes.
   **VERIFY:** in hostv2 the only Sentry capture near the RSVP path is the
   chunk-load failure (`hostv2/src/main.jsx`, `main.chunkLoad`), so an unknown
   code may be handled quietly and send nothing. If nothing shows up, use 3.
3. **Fallback that does send:** on the live site, open the browser
   DevTools → **Console** and run:
   ```js
   setTimeout(() => { throw new Error('NGW attestation probe 11/2026'); });
   ```
   Sentry wraps timers, so an uncaught error inside one is reported. It
   changes no data. Within a few minutes **Issues** should show
   `Error: NGW attestation probe 11/2026`.

**Send back:** the issue title, the event ID, its timestamp, and its URL or
`environment` tag. Also say which of 2 or 3 produced it: if 2 produced
nothing, the RUNBOOK's instruction needs correcting.

---

## 5. PostHog: one live event (5 minutes)

1. PostHog → the project → **Activity** (left nav) → the live events view
   (VERIFY: may be labeled "Live events" or "Explore"; older layouts put it
   under "Events").
2. Load `https://twillis45.github.io/ngw-event-planner/` once in another tab.
3. Within a minute or so a `$pageview` should appear. Open it and check that
   `$host` is `twillis45.github.io`.

**Send back:** the event name, its timestamp, and `$host`.

---

## 6. Alerting: one Render failure notification, one Sentry alert rule (15 minutes)

Today nothing pages anyone when the API fails or when production starts
throwing errors.

### 6a. Render: failure notification for `ngw-events-api`

1. Render dashboard → **Workspace Settings** → **Notifications** (VERIFY).
   Set the default to notify on **failures** (deploy failed, service
   unavailable or crashed), delivered by **email** to you. Add Slack if you
   use it.
2. Render → `ngw-events-api` → **Settings** → **Notifications** (VERIFY):
   make sure this service is not set to "None", and that it uses the
   workspace default or "All failures".

**Send back:** a screenshot of both settings.

### 6b. Sentry: alert rule on new production issues

1. Sentry → **Alerts** → **Create Alert** → **Issues** (VERIFY: may read
   "Issue alert") → choose the live-site project.
2. Environment `production`. **When:** "A new issue is created" (add "An
   issue changes state from resolved to unresolved" too). **Then:** send a
   notification by email to you, as a member or by address. Name it
   `NGW production — new issue`, then **Save**.
3. On the saved rule, use **Send Test Notification** (VERIFY) and confirm the
   email arrives. Step 4's probe error, if it was new, should also have
   triggered it.

**Send back:** the rule name, its conditions as shown, and whether the test
email arrived.
