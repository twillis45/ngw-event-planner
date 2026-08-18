# NGW Event Boss — Session Handoff

Read this first. It is written for a session that has none of the context.

**Last verified 2026-08-17 against `main` at `7bff2d43`.** Every number below was
measured on the day, not carried forward. Anything not re-measured says so.

`main` moved to `2512dbc0` while this was being written — a second session was
working the repo. The sha above is deliberately not updated: it is the commit
the measurements were actually taken against.

---

## Stop here first — CI is red

`Deploy Pages (from source)` and `Checks` have both failed on the last three
pushes. **Production is not receiving deploys.** One error, one line:

```
src/lib/playbooks/index.js:712
  Import in body of module; reorder to top   import/first
```

`export { DEST_LODGING_OPTIONS } from '../destLodgingOptions';` sits on line 711
and the matching `import` on 712. CRA treats it as a real compile error, not a
warning, so `gate:cra` fails and the build never produces a bundle. Move the
import above the module body and CI goes green.

Not fixed here on purpose: another session was editing this repo while this doc
was written, and a surprise commit would have collided with it.

Also: **`main` is 3 commits ahead of `origin`.** Pushed commits are failing;
unpushed ones have not been tested by CI at all.

## State, measured today

| | |
|---|---|
| Branch / HEAD | `main` @ `7bff2d43`, clean tree, **3 ahead of origin** |
| CRA test suite | **5,958 passing**, 1 skipped, 416 suites, 35s |
| Migration governance | ✓ passes |
| Backend | `https://ngw-events-api.onrender.com/health` → `{"ok":true}` |
| Prod frontend | `main.8eafea04.js` live at twillis45.github.io/ngw-event-planner/ |
| CI | ✗ red — see above |
| hostv2 e2e matrix | **not re-run** — port 5233 was in use by another session |

## Where the work happens

- `demo/src/App.js` — **FROZEN** (A1 freeze, 2026-07-16). 46,977 lines. Donor
  only. Security and data-loss fixes and shared `lib/` engine work only.
- `demo/hostv2/` — **this is where host features go.** `HostShellV2.jsx` is
  18,121 lines. Vite, port 5199 dev / 5233 built.
- Everything else: `src/lib/*` engine, `src/design/tokens.js`, `src/plan/*.jsx`.

Nav is four layers: **L1** Studio Home → **L2** Portfolio → **L3** Event Command
→ **L4** specialist tabs. Dark "Studio Matte" only.

## How to work here — non-negotiable

- **RENDER-FIRST.** Never judge UI from code. Capture with the puppeteer scripts
  in `scripts/` (`cap*.js`) against a running dev server, save PNGs to
  `demo/review-artifacts/<date>-<topic>/`, and read the images.
  - hostv2 needs a **real device profile**, not a resized window: Playwright +
    WebKit, iPhone 15 Pro. It leans on `100dvh` and safe-area insets that
    Chromium-at-390px does not reproduce. See `hostv2/scripts/device-preview.mjs`.
  - Playwright needs **node@20** (`/usr/local/opt/node@20/bin`). System node is 18.
- Design bar is **bless = 10+**, not 9. Score honestly, use the named review
  board, be brutal rather than agreeable.
- Doctrine: **The Attention System** (one hero, 3 contrast tiers, one accent,
  motion = change only) and **HONESTY** (never fake urgency, data, AI, or
  integrations). Grandmother test.
- **The Next-Step Spine**: one persistent next-action ribbon, **outline** CTA,
  advances on completion, suppressed in day-of mode.
- Operate autonomously. Act decisively.

## Deploy — this changed, the old instructions were wrong

The previous version of this file warned *"NEVER `npm run deploy`"* and gave a
manual `gh-pages` incantation. **Both are obsolete.** There is no `predeploy`
hook and `gh-pages` is no longer a dependency.

```bash
npm run deploy     # → gh workflow run "Deploy Pages (from source)" --ref main
```

The workflow (`.github/workflows/pages-from-source.yml`) owns the env strip
itself: `REACT_APP_PLANNER_TOKEN`, `_AUTH_BYPASS` and `_BYPASS_ROLE` are
deliberately never set, and it hard-fails if the CRA and hostv2 bundles
disagree about `REACT_APP_API_BASE_URL`. Do not hand-build for production.

Backend is a Render Blueprint (`render.yaml`, service `ngw-events-api`,
`autoDeploy: true`) — a push to `main` deploys it. Migrations are run by hand in
the Supabase SQL editor (project `ewoggzxarpcwesqxsdoz`).

## Naming

The day-of schedule is **"Event Day Schedule"** everywhere a user sees it. The
strings `'Run of Show'` and `ros` survive only as internal identifiers — the tab
route key, `event.ros`, `draftFullROS`, `EventDayBar`. Users never see "ROS."

## OPEN THREADS

Re-measured today. Three of the old thirteen were already resolved and have been
removed rather than carried forward.

1. **CI is red** — the one-line `import/first` fix above. Everything else waits.
2. **`main` is 3 ahead of origin** — push once CI can pass.
3. **AI rewire, partially done.** The old doc said "7 of 9 sections still call
   `askClaude`" and "`AI_FEATURES` has only 4." Measured today: **5** `askClaude`
   call sites remain, `isAiProxyConfigured` is used in 7 places, and
   `AI_FEATURES` has gained `budget` and `proposal` — so the "decision pending"
   on dedicated features was made. Finish the remaining 5.
4. **`ReadinessSparkline`** still present (2 references in App.js). Board's take
   stands: the insight is valuable, the tiny chart is illegible. Replace with a
   worded trend chip. Unapproved, unbuilt.
5. **`'Run of Show'` internal rename** — 9 references in App.js. Cosmetic, small
   routing-regression risk. Leave `event.ros` alone to avoid a persistence
   migration.
6. **Identity Invite / RSVP end-to-end smoke** — still never run with a real
   cross-browser guest: create an event, open its `?rsvp=<22-char token>` in
   incognito, submit, confirm the `rsvp_submissions` row in Supabase.
7. **AppSec fast-follows** (board-flagged, not blockers): backfill non-demo
   short rsvpCodes to 22-char tokens; confirm `pg_cron` schedules
   `purge_old_rsvp_submissions(90)`; move the rate-limiter to Redis before
   running >1 Render worker; add a TTL to the localStorage outbox, which holds
   allergy free-text.

## What was not verified today

- The hostv2 e2e matrix (port in use). Last recorded figure was 454/476 passing
  on 2026-08-16 — **carried forward, not measured, treat as unconfirmed.**
- Which commit produced the live `main.8eafea04.js` bundle.
- Anything in `engine-audit/` — newest file there is 2026-06-27 and the
  directory has not been touched since.

## Memory

`~/.claude/projects/-Users-toddwillis/memory/` — `MEMORY.md` is the index, read
it first. `.remember/now.md` in this repo carries the rolling session log and is
usually fresher than this document.
