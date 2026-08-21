# Path to Production audit — Event Boss host shell (hostv2)

2026-08-21, report-only (no fixes implemented, by direction). Surface under
audit: the hostv2 host shell, `facing: public`, `platform: web`
(mobile-flagship). Spine: `~/.claude/PATH-TO-PRODUCTION.md` (10 stages).
Evidence gathered live this session: full jest suite, repo gates, prod
bundle probes, and a dispatched Nielsen 10-heuristics subagent critique.

Baseline commit: `3ced7821` + PhotoStrip commit. CI green.

---

## Stage 0 — Adoption: N/A

Original project, not inbound. (The CRA→hostv2 port was an internal
re-platform, tracked in WHERE_WE_ARE, not an adoption.)

## Stage 1 — Idea → Problem statement: PASS

Named audience recorded: the DIY milestone-event host (retirement / 50th /
reunion), `docs/FLAGSHIP_DEMO_AND_PRICING_D2.md`. The wedge sentence exists
and has survived four board sittings.

**Fixes:** none in-product. Housekeeping: the Notion Path to Production
tracker entry should carry this gate as `passed` (see stage 7 finding on
tracker sync).

## Stage 2 — Scope & design: PASS with 2 findings

Reference scans predate design (Mobbin competitive read 2026-07-29, Blink
confirmation-pattern read 2026-08-01, both ported to the repo); design
originates in Figma (board file `3jKLC1z1Y0UGWNcenJGDQW`, locked rulings);
success criteria are machine-checkable throughout (423 test suites are the
criteria); public-gate activation doctrine (Ruthless Host Lens, grounded
action loop) is applied in the design, not bolted on.

**Fixes to report:**
1. **The `?admin=1` console and the new `?demo=1` bar are undeclared
   surfaces.** The spine's own text names the admin console as "a surface,
   not a feature." Neither carries a `facing`/`platform` declaration or a
   spine position. Fix: declare both (internal/web) in CLAUDE.md or the
   tracker so their gates (especially stage-5) attach somewhere.
2. **`facing`/`platform` are not declared in the repo for the main surface
   either** — they're implied everywhere, written nowhere. One table in
   CLAUDE.md closes it.

## Stage 3 — Build: PASS

Code exists and matches scope; suite 423/423 (6,011 tests); hostv2 builds
clean. CRA donor shell remains frozen per the A1 freeze with deletion
scheduled post-Sprint-2 — the freeze is a recorded decision, not drift.

**Fixes:** none. (CRA lint baseline 242 warnings is ratchet-governed and
descending.)

## Stage 4 — Verify: PASS with 7 findings, none blocking

Gate (all) — the project's own guards: jest 423/423 green; `gate:cra`
green (242 ≤ 245 baseline); `check:migrations` green; CI e2e matrix green
on `3ced7821`. One local red: `gate:hostv2` fails because the tracked
`public/hostv2` artifact is stale against source — **hygiene only**, since
`pages-from-source.yml` rebuilds hostv2 fresh at deploy (verified: prod
chunk `HostShellV2-5ad6695b.js` carries `ngw-demo-tools`,
`briefSharedVendorIds`, `one-event-pass-`).

Gate (public) — Nielsen 10-heuristics pass ran as its own subagent,
behavior-only. **Verdict: passes. Zero P0/P1.** Ledger (fixes to make,
none made):

| # | Heuristic | Sev | Finding |
|---|---|---|---|
| 1 | H1 status | P2 | Queued/failed cloud sync visible only inside the events sheet; no ambient "not yet synced" cue on the editing surface |
| 2 | H3 control | P2 | Host-edited draft text (`draftBody`) silently discarded on sheet close/reopen (HostShellV2 ~:4308, :4313) |
| 3 | H3/H4 | P2 | Single-slot `sheet` state: a draft opened from inside another sheet replaces it; close returns to the plan, not the parent flow |
| 4 | H3 | P2 | Run-it-again toast has no Undo; recovery is manual delete |
| 5 | H9 | P3 | ErrorBoundary promises "picks up where your data was last saved" unconditionally — contradicted when the crash coincides with a save failure |
| 6 | H4 | P3 | "Close" means back-one-level on top-level sheets, back-two on nested |
| 7 | guards | P3 | `gate:hostv2` red locally (stale tracked artifact) — run `npm run sync:hostv2` or retire the tracked copy now that Pages builds from source |

Critique highlight worth keeping: undo is built once at the single write
path (`patchEvent` snapshots + inline Undo), settling decisions is
undoable, deletes are tombstoned, pass unlock is verify-first — the
escape-hatch architecture is load-bearing, the inverse of the
screenshots-pretty/no-undo failure the gate exists to catch. The two
findings to fix first are #2 and #3: the only places a host's typed words
can vanish without warning.

## Stage 5 — Security & data review: OPEN — the incomplete public gate

Done: Security Sprint A+B (anonymous `/complete` charge-minting removed,
3 SSRF sites guarded), release-integrity CI gates C1–C3 green (backend +
CRA + hostv2-drift), Stripe unlock server-verified (this week), demo ids
outside the paying set, Supabase auth on every stripe/comm endpoint.

**Fixes to report (this stage formally blocks stage-6 sign-off):**
1. Security Sprint **C+D never started** (recorded 2026-07-30, still true).
2. **No pentest** (already on the D-2 external list).
3. **The full public-track checklist has never been written down** — the
   spine requires the consolidated checklist recorded, item by item, even
   where the answer is "no-op because X." Assemble it once; most rows are
   already done and just need citing.
4. Supabase **RLS posture is unverified in writing** — the cloud events
   table's row-level security has no audit note. Verify and record.

## Stage 6 — Deploy: PASS with 1 finding

Target recorded and reasoned (GitHub Pages from-source for the app,
Render for the backend); deploy checks pass; prod verified fresh at the
chunk level tonight. Stage-4 P0/P1 blockers: none. Formal rule "P0/P1
from stages 4 and 5 resolved first" — stage 4 contributes none; stage 5's
open items above are the only thing between the current deploy practice
and a clean stage-6 gate.

**Fix to report:** the tracked `public/hostv2` artifact + `gate:hostv2`
now disagree with the from-source deploy model — either keep the artifact
synced or retire it and its gate deliberately (one decision, currently
neither).

## Stage 7 — Observe & handoff: OPEN — instrumentation is wired but dark

HANDOFF discipline: WHERE_WE_ARE.md updated every session (law), current
as of tonight. Gate (all): pass.

**Fixes to report (public gate open):**
1. **Sentry is code-wired but has no DSN in the prod build** (probed the
   deployed bundle: no ingest host present; `REACT_APP_SENTRY_DSN` unset
   in Actions vars). Zero error visibility on a public surface.
2. **PostHog is absent from the hostv2 prod entry** — the analytics
   module (with its fallback key) isn't in the deployed hostv2 bundle, so
   host-shell usage is uninstrumented. Decide: import it in hostv2 or
   record analytics as CRA-only deliberately.
3. **Notion Path to Production tracker sync** — per the standing Notion
   law, the tracker entry should be updated to match this audit
   (stages 1–4 passed, 5 and 7 open, 9 pending).

## Stage 8 — Maintain: PASS

Daily sessions, ratcheted gates, dependency load stable, WHERE_WE_ARE
fresh. No drift signal.

## Stage 9 — Promotion: PENDING — this is the actual gate to "out to the public"

The app is de facto public (Pages URL) but pre-promotion in spine terms:
no money is asked and the pass is dormant. The promotion checklist is
exactly D-2's five preconditions plus the board:

1. Domain + privacy/refund policies (user-side)
2. Demo account created + seeded (tooling shipped 2026-08-19; account
   creation is the user's step — `docs/DEMO_ACCOUNT_RUNBOOK.md`)
3. Stranger-proof onboarding test (first-timer seat is decisive here)
4. Live-keys Stripe end-to-end purchase, then `REACT_APP_BILLING_LIVE=1`
5. Three non-founder hosts asked for money
6. Stage-9 board sitting (10–12 seats, first-timer + security mandatory)
   — not yet convened.

## Stage 10 — Sunset: N/A

---

## The shortlist, ranked (nothing implemented, by direction)

1. **Stage 5:** write the consolidated security checklist; verify RLS in
   writing; schedule Sprint C+D and the pentest.
2. **Stage 7:** set `REACT_APP_SENTRY_DSN` in Actions vars (one variable —
   prod error tracking lights up); decide the PostHog-in-hostv2 question.
3. **Stage 4:** Nielsen P2 cluster — draft-text preservation (#2) and the
   sheet back-stack (#3) first; then ambient sync cue (#1) and
   run-it-again undo (#4).
4. **Stage 2/6 hygiene:** declare the three surfaces; settle the tracked
   hostv2 artifact question.
5. **Stage 9:** the five D-2 preconditions + the promotion board sitting.
