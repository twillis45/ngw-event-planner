# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-09-03 (stage 8 recording).
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `d7f2f4b5` |
| Jest | **6,228 passed**, 1 skipped, **441 suites** — measured this pass |
| vitest (hostv2 seam) | **14 passed** — the only runner that EXECUTES the host shell (new 2026-09-03) |
| Backend pytest | **353 passed** — re-run this pass via `verify-all` |
| verify-all | **10 steps**, seam included; `--fast` skips the matrix |
| e2e (Playwright) | full matrix **909 passed / 190 skipped / 0 failed** (20.7m). Skips down 20 from the rotted-guard fix; the census classified all 36 guards |
| Activation funnel | `activationFunnel.spec.mjs` **49/49** across 7 viewports, 4 hooks each red-proofed |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |
| Path to Production | stage **1 recorded PASSED 2026-09-03** (who hits this today, sourced from the project's own competitive reads — not invented). Stage **8 (Maintain) recorded, passed-with-conditions, 2026-09-03** — first gate ever posted for this stage. Stage 6 PASSED WITH CONDITIONS (Todd, 2026-08-29). Stage 7 ruled `passed-with-conditions` by the review board 2026-09-02, under the owner's standing delegation. **Stage 5 (Security) also recorded 2026-09-03** — closing a tracking gap: the audit ran 2026-08-21 but the gate was never POSTed, so it read as historical/unanswered until this run. **Stage 9 entry: NO** |
| Standing conditions | **9**, gating stage 9 (Promotion) — 6 security, 3 marketing. No paid spend authorized. Unchanged by the stage 5/8 recordings — no new claims, only closing tracking gaps |
| Path artifact | Republished 2026-09-03 (twice). Stage 5 and 8 cards show real recorded state. Three stage-7 checkboxes corrected: they described fixed problems (admin console key, 3-of-4 recovery functions, day-of probe) that had never been ticked off when the fix landed — found by re-verifying every open item against the repo, not by trusting the page |

## STANDING DELEGATION — the board decides, 2026-09-02

Owner's instruction: **"decisions are to be handled by the review board."**
Recorded in `ptp-gates.json` with `ruledBy`, because the Stop hook reads that
field and because a delegation living only in a conversation is one the next
session cannot see. It persists across stages until withdrawn (Step 8b), and it
waives seat confirmation with it (Step 4c).

**What it does NOT delegate.** Acts that need Todd's own hands or accounts are
not decisions and no board can discharge them:

- reading the PostHog and Sentry consoles — proving events *arrive*, not merely ship
- the stranger-proof first run
- the rollback-to-private rehearsal

A board can rule on what those results *mean*. It cannot produce them. Anything
else — every gate ruling, every design call — goes to the board and does not
wait on Todd.

## The parked shelf said its own heading seven times — fixed 2026-09-03

`decisionRankReason()` opened with a constant, `'Comes up closer to the date.'`,
for any row with `horizon === 'later'`. The board partitions
`deferred = open.filter(r => r.horizon === 'later')` — the same predicate — and
HostShellV2 prints "Comes up closer to the date" as the shelf HEADING above
those rows, and again in the toggle above that.

Driven live on a 120-day Crab Feast: **seven copies of one sentence on one
shelf**, and nothing said about any of the five decisions parked there.

Now derived from `daysOut`, which was already on the row: "Comes up in about 4
months." The engine's underlying call is unchanged and still right — for a
parked row the headline is timing, which is why that branch deliberately
outranks an authored `priorityBasis.rationale`. It just stated the timing in
the one phrasing that carries none.

The five rows still read alike. They are 110–115 days out — the same distance —
and the first draft of the test demanded they differ, which would have meant
manufacturing precision the data does not carry. The probe caught it; the
assertion now compares a 60-day shelf against a 120-day one.

Gated by `parkedRowReasonIsSpecific.test.js`. `decisionBoardWave2b` had pinned
the old literal and now checks the property it meant.

**A FIFTH site, in frozen code — noted, deliberately not fixed.**
`src/App.js:43171` carries the same fallback,
`{r.rankReason || r.because || 'Comes up closer to the date.'}`, and the
comment above it at :43164 asserts the engine's rankReason *is* that string.
That comment is now false.

No action taken, on purpose. App.js is the FROZEN CRA donor (A1 freeze) and
this is neither a security nor a data-loss fix. And there is nothing to repair
behaviorally: App.js reads `rankReason` from the same shared engine, so its
decisions panel now shows "Comes up in about 4 months." too, and the literal
stays dead. **The stale comment is the trap** — whoever unfreezes App.js will
read it as a statement about current engine behavior. It is not.

Checked before worrying: **no e2e spec asserts on this copy**, so the string
change cannot redden the matrix.

**The trap worth keeping:** this defect had no source location. Each file was
individually reasonable; the duplication existed only in their composition. No
single-file assertion could see it, which is the argument for the live drive.

## TRAP: a green unit run does not cover the host shell at all

**35 jest suites read `hostv2/` as TEXT** because jest cannot execute it —
`react-scripts` pins `roots` to `<rootDir>/src`, and hostv2 is a separate Vite
tree outside it. Zero tests import from hostv2; every one of the 35 is a
`readFileSync` + regex.

They are tripwires, not behavior coverage. The 50 specs in `hostv2/e2e/` are
what actually executes the shell.

**RULED AND HALF-BUILT the same session.** The board rejected both routes the
census offered: "eject CRA" was never required. hostv2 had vite + playwright
and no vitest anywhere, so the seam costs a devDependency, not a toolchain
migration.

- **Built:** `hostv2/test/shellParses.test.mjs` + `npm run test:unit`. vitest
  reuses `vite.config.js`, so the `@app` alias, jsx loader and env `define` are
  the app's own. It **imports** the shell — the thing jest cannot do.
- **Wired:** runs in the CI e2e job *before* `playwright install`, so a shell
  that will not compile costs ~3s instead of 14 minutes.
- **Red-proofed, and this is the number to quote:** with a syntax error in
  `HostShellV2.jsx`, **vitest fails and jest's `heroComposition` +
  `sendLedger` stay green across 73 assertions** — both of which read that
  exact file. Not a criticism of the 73; it is the reach limit, measured.

**Dissent DISCHARGED the same session, and it was right within the hour.** The
seat said step 1 was prose with no instrument. Proof arrived faster than the
ruling: the census published "35 text gates" and the number was **36** by the
end of the session, because `seamRunsInCi.test.js` was added and nobody noticed.

`textGateRatchet.test.js` is the instrument — a **ratchet, not a ban**. A new
text gate on hostv2 fails the build and is named; the author either writes an
e2e or bumps `MAX_HOSTV2_TEXT_GATES` with a logged reason. Red-proofed against
exactly that violation. It caught itself first (37 vs 36) and is excluded by
exact path, never a name pattern.

`npm run coverage:honesty` prints what a green run reaches:

```
jest suites total                    441   execute demo/src
  ...of which only READ hostv2        36   TRIPWIRES. Cannot catch a parse error.
vitest files (execute hostv2)          1   the seam
e2e specs total                       50
  ...dormant by design (_*Capture)     3
e2e LIVE GATES                        47   the real behavior instrument
```

**Two numbers I published today were wrong** (corrected in the census, originals
left visible): 35→36 text gates, and 50 e2e specs → **47 live gates**. On the
second: five files match a grep for "not a gate", but two only quote the phrase
in comments *about* gate honesty. Classifying from the grep would have retired
two working gates on paper.

Census, ruling, dissent and the red-proof table:
`docs/audits/2026-09-03_SOURCE_TEXT_SUITE_CENSUS.md`.

**Two suspicions I had this session were WRONG, both caught by checking:**
e2e does run on push-to-main (I misread the workflow indentation and nearly
reported it dead), and my two attempts to measure e2e/text-gate overlap were
both unsound — no overlap figure is claimed anywhere.

## TRAP (dated, not urgent): hostv2's vite.config.js has two deprecations

Surfaced by reading the CI log for the run that first executed the seam
(`c0ac1557`, green). Neither breaks anything today; both are scheduled breaks:

```
(!) Your Vite config uses features that are unsupported by
    `configLoader: 'native'`, which is planned to become the default in a
    future major version of Vite:
  - `__dirname` (vite.config.js:15:45). Use `import.meta.dirname` instead
warning: `esbuild` option was specified by "vite:react-babel" plugin. This
    option is deprecated, please use `oxc` instead.
```

**CORRECTED an hour later — the causal story above is wrong.** I wrote that
these warn about the app's build Vite. They do not, and the real finding is
about a change *I* made.

Measured: `hostv2` builds with **vite@4.5.14**, which has no `configLoader` and
no `oxc` — it cannot emit either warning. The warnings came from **vitest**,
which declares `vite: ^6 || ^7 || ^8` and therefore installed its own
**vite@8.2.2** nested under `node_modules/vitest/`. Vite 8 parses the same
`vite.config.js` and warns about it.

**So adding vitest put TWO Vite majors in hostv2, four apart:**

| | Version | Role |
|---|---|---|
| `node_modules/vite` | **4.5.14** | builds the shipping bundle |
| `node_modules/vitest/node_modules/vite` | **8.2.2** | transforms the seam's tests |

Neither ships — both are dev-only — and the seam's red-proof still held: a
syntax error in `HostShellV2.jsx` failed vitest. But **"vitest executes the
tree the app builds" is now only approximately true.** The two run different
transform pipelines (Vite 4's esbuild path vs Vite 8's), so the residual risk
is a **false green**: syntax or syntax-adjacent code that Vite 8 accepts and
Vite 4 rejects would pass the seam and fail the build.

**That risk is COVERED, checked rather than assumed.** `checks.yml` runs
`hostv2-build` as its own job on every push and PR — `npm run build`, which is
`check-parity && vite build` on **Vite 4.5.14** — and the `e2e` job builds
again before the matrix. So anything Vite 8 accepts and Vite 4 rejects turns
`hostv2-build` red in the same run. The seam is a fast tripwire *in front of*
the real bundler, not a substitute for it, which is the same relationship the
35 text gates have to the e2e specs.

`__dirname` is still worth fixing — **five** uses (I wrote six; miscounted),
and **line 25 is the `@app` alias**, so when `configLoader: 'native'` becomes
default the config fails to load and takes the alias with it, surfacing as
"hostv2 cannot find @app/*" and naming nothing about `__dirname`. It is a
*vitest-side* pressure today, not a build-side one.

**FIXED 2026-09-03 — and the framing below was wrong, kept for the lesson.**
The choice was never "pin Node 20.11 or skip it". `import.meta.dirname` is
shorthand; the longhand needs no version floor:

```js
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

Builds on **node 16 (7.99s) AND node 20 (4.73s)**, and the warning is **gone** —
red-proofed by putting `__dirname` back (warning returns) and reapplying the
fix (0 occurrences), measured against vitest's Vite 8, which is the thing that
emits it. No `engines` field needed, no runbook line, no bundler dependency.

I had accepted a false either/or and written it into two documents before
testing the third option. The rejected reasoning follows.

---

**Why `import.meta.dirname` specifically was rejected — measured both ways.**
works under Vite 4 today (the config is real ESM, since hostv2 is
`"type": "module"`), so it does *not* need the Vite 8 upgrade. But it lands a
**Node floor of 20.11**:

```
node v20.20.2  + import.meta.dirname  ->  ✓ built in 4.52s
node v16.16.0  + import.meta.dirname  ->  TypeError [ERR_INVALID_ARG_TYPE]:
                                          The "path" argument must be of type
                                          string. Received undefined
node v16.16.0  + __dirname (today)    ->  ✓ built in 7.92s
```

**This machine's default node is 16.** CI pins 20, so CI would stay green while
a local `npm run build` broke for anyone who did not switch node first — the
worst shape of regression. Ship it with an `engines` field and a line in the
runbook, or not at all.

**Open, and it is a real fork:** accept two Vites and document the caveat, or
pin vitest to a Vite-4-compatible line (vitest 0.34/1.x — old, its own cost),
or move hostv2 to Vite 8 (large). **Not decided. Not urgent** — nothing is
broken today and nothing about this reaches a user.

## FIXED — the diet picker was flagging no allergens for two of its own options

Found by the stage-8 tech-debt dispatch, verified by hand before acting.

The shipping picker offers **"Egg allergy"** and **"Soy allergy"**. The matcher's
keys are **"Egg"** and **"Soy"**. So:

    host ticks "Egg allergy" on Deviled eggs   ->  []        nothing flagged
    guest types it as free text                ->  ["egg"]   flagged

`rosterDiets` normalizes prose to the canonical keys; the picker never did — so
the app screened allergens better when a host typed a sentence than when they
used the control built for it. Two Big-9 allergens, silent, on a menu the host
believed had been screened.

The map's own comment records someone fixing this exact class for the invite
path — *"before, Egg/Soy/Sesame/Fish matched nothing"* — and never reconciling
the picker's labels.

**Fixed by ALIAS, not rename**, so every guest record already storing "Egg
allergy" starts flagging immediately with no migration. Gated by
`dietVocabularyResolves.test.js`, which ENUMERATES every vocabulary in the tree
rather than naming files — there were five definitions and naming files is how
the fifth survives. Red-proofed three ways.

**Still open from that pass, ranked:** hostv2 ships five undeclared dependencies
resolved from the CRA package.json that is scheduled for deletion; rank-reason
copy is derived in three places and one already diverges; 36 test suites assert
on source text rather than behaviour; `xlsx@0.18.5` carries two unfixable
advisories and leaves with the CRA.

## OWNER-ONLY: the repast copy needs real people before it reaches strangers

An insider-lens panel ruled the repast cultural copy on 2026-09-03 and the
copy is now materially better — but **its own verdict says a panel of lenses is
not community consent**, and that outranks its approval.

**Before this copy is shown to a stranger in grief**, put the exact string in
front of **at least three real people** — ideally an active kitchen/repast
committee member, a pastor or church administrator who handles homegoings, and
a family member who hosted one recently — across more than one denomination and
more than one region. The five questions, from the panel:

1. Does *"In many churches the meal is carried by the community rather than the
   family"* read as true, or as a stranger explaining your own church to you?
2. Is *"Ask the repast committee to carry it"* the phrase you would actually
   use, or does your church call it something else?
3. Read it as though there is no committee and no church — does the catering
   line feel equal, or feel like a demotion?
4. **Should an app say any of this at all**, or should it just show the meal
   task and stay quiet?
5. What did we get wrong that we do not know we got wrong?

**If (4) comes back "stay quiet" from people inside, that outranks the entire
panel.** Its dignity seat dissented on shipping at all before that review; I
shipped the improved string anyway because holding it leaves the *worse* copy
live — the version that stated a norm as fact and told a mourner how to feel.
That is my call and it is reversible: `git revert` the copy commit.

**Unresolved and larger, flagged by the tradition seat:** one generic repast
template serves every denomination, region and immigrant congregation. No
wording fix addresses that.

Also open: the seeded event is a fabricated deacon ("A Repast for Deacon Willie
Hayes"). The panel asked whether that name was reviewed by anyone inside. It
was not.

## The board withdrew its own finding — and what survived

I briefed the board that the solemn path renders no ask. **False**: the repast
fixture had drifted 39 days into the past, and a past event correctly has
nothing to settle. A future repast renders a real hero — one unsettled option at
T-3, and at T-10 *"What you're serving · 2 open… 5 of 6 are already handled."*

Re-convened on its own ruling, the same panel **vacated Decision 1: do not build
the quiet-ask card.** Its reduction seat put it best — *a board that adds a
component on one measurement has failed its own principle.*

What survived, and is genuinely open:

- **The register standard has a real subject now.** *State the thing, do not
  offer choices* — and the T-3 repast ask renders one unsettled **option**,
  which is a choice handed to a grieving host. Nobody has evaluated that card
  against the standard.
- **A past event does not say loudly enough that it is over.** The first-timer
  read "BEHIND YOU — Deacon's day, done" and still took a finished event for a
  broken product. Small, and the only thing the false brief actually surfaced.
- **The sequencing gate was replaced, not dropped:** the acquisition unit must
  be shot from an event that passes the horizon guard, green in the same run.
  A fixture can be stale in a way that is invisible in a screenshot.

**On the failure itself**, the board's own accounting: the error was not
recoverable from the brief — it contained no date, no horizon, no state label.
But *"checked twice to rule out missing data"* describes two probes, and two
probes are a hypothesis, not an exhaustion. It should have conditioned the
verdict on the event's horizon instead of ruling flat. Shared and asymmetric.

## One product observation — resolved, corrected 2026-09-03

**This section previously said the solemn Repast state was "STILL OPEN, and
genuine" — that claim went stale on 2026-09-02 and this file was not updated
until asked.** Commit `26d3bd71` (22:31, the same day) withdrew the finding:
the repast's seeded date was hardcoded to Jul 25 and had drifted 39 days into
the *past*, so the screen correctly read "BEHIND YOU — Deacon's day, done." A
past event has nothing to settle; that is not a product defect. Its
`noSettle` declaration is gone from the spec and its loop-advance probe now
runs like every other state. Re-verified fresh this session: all 6
loop-advance states pass on `desktop`, including Repast T-3, with no
`noSettle` on it.

Inverting `boardMatrix`'s loop-advance guard turned three silent skips into
three real failures, all three of which turned out to be FIXTURE artifacts,
not product defects:

- Day-of and T-2 surfaced "Venue … Save" — a field, not a decision — only
  because the seeded event has no venue. Fixed by giving the fixture a venue.
- Repast T-3, above — a hardcoded date that had drifted into the past.

**The lesson worth keeping:** the first fix declared all three `noSettle` with
reasons that read as considered. A declaration that sounds measured is not the
same as one that was, and it would have excluded the product's highest-stakes
screen from the probe built for it. Ask whether the fixture is representative
before concluding the product is wrong.

## Board conditions discharged the same session — 4 of 5 stage-7 closure items

| Condition | State |
|---|---|
| Prove telemetry ARRIVES, not just ships | **OPEN — yours.** Needs the PostHog and Sentry consoles |
| Admin console reads the wrong storage key | **DONE.** Reads both books, additively, deduped |
| `gate:cra` local/CI divergence | **DONE.** It was a stale `node_modules/.cache` |
| Census the 210 skips | **DONE.** **4** tests cannot fail; 9 rotted guards retargeted |
| 8th `verify:all` suite | **DONE.** Now **8 of 8** — the set passes together for the first time |

Stage-9 items: durable storage **DONE**, recovery UI **DONE**. Remaining are the
stranger test, the rollback rehearsal, and the economics — all yours.

**The census finding this row used to name — `boardMatrix`'s loop-advance
probe skipping 4 of 6 states — is DONE, corrected 2026-09-03.** The guard is
already inverted (a zero-step walk without a reasoned `noSettle` throws, named
above); re-run fresh this session, all 6 states pass with real settles, zero
skips.

**A correction to the census, and to what this file said an hour ago.** It
reported 7 tests that can never fail and I repeated it. Three of those are the
`_*Capture` specs, and they are *supposed* to be dormant: each declares "not a
gate" in its first line, uses the `_` prefix convention, and writes to a
gitignored directory. They are capture tools for board sittings. **The true
number is 4**, and it is the one that matters — those four are real tests
everyone believes are running.

## The board ruled stage 7, 2026-09-02 — and refused stage 9

Two panels, ten seats, under your standing delegation. Both reached
**passed-with-conditions** on stage 7 and both refused stage 9 entry, for the
same reason: three of the gates stage 9 re-runs retroactively have **never been
run** rather than run and failed — the stranger test, the rollback rehearsal,
and the economics. **No offer may be described as ready and no money taken.**

Dissent kept per seat rather than averaged. Panel A's **first-timer** would have
blocked stage 7 too ("observe cannot pass when nothing has ever been observed
being *used*"), overruled 4–1. Panel B's **verification** seat entered the
strongest dissent: three greens cannot currently be trusted — 210 of 1,071
browser tests are skipped by guards nobody has examined, `gate:cra` emits a
provably false warning, and Sentry is presence-assumed-delivery. Panel B's
**paying host**: *"I would ask for a refund, and I would be right to — the
browser may quietly delete my entire plan, and the backups the app took for me
cannot be restored by any button I can reach."*

**Their ONE THING, named by six of ten seats, is half done.** Durable storage is
now requested — asked once on the first successful write, fire-and-forget so it
can never delay or fail a save, the answer recorded so a surface can report it
honestly, a refusal kept rather than re-prompted forever. 13 tests, three faults
red-proofed. **One escaped and is recorded as a finding:** removing the call
from the write path left all twelve green, because "a refused write does not
ask" is vacuously true when nothing ever asks. The missing positive assertion —
that a *successful* write asks at all — is now there.

The other half is not done: **wire the four zero-caller recovery functions to a
driven UI**, red-proofed by corrupt-then-restore.

## Stage 7 recording, 2026-09-02 — two obligations that had NEVER been met

Both live in the spine's own numbered steps rather than in `requiredSkills`,
and `requiredSkills[7]` is empty — so the gap table was vacuous while two real
obligations sat unmet, and nothing surfaced them.

**`verify:all` did not exist.** Nine verification scripts, no way to run them as
a set, so the full set had never once run together. It exists now and it
COLLECTS rather than chains, because two scripts cannot be chained:
`gate:hostv2` exits 1 unconditionally (CI retired it 2026-08-01; the npm script
was never removed) and in an `&&` chain silently deletes every step after it.
First full run: **7 of 8 pass**. Backend pytest — 353 tests — is reachable from
a local command for the first time.

**`docs/ADMIN-CONSOLE.md` did not exist**, required since stage 3. A console
does ship (`?admin=1`) and its presence read as coverage. Audited by subagent,
re-verified by hand. Four findings, all now in that file:

- `AdminConsole.jsx:1323` reads `localStorage['ngw-events']` — the FROZEN CRA's
  key — while hostv2 writes `ngw-hostv2-custom-events`. The "This Browser"
  panels read **empty against the shipping app while labelled as showing it.**
- **No admin surface is reachable from the shipping app at all.**
- `restoreBackup`, `importCustomEvents`, `listBackups`, `readWriteLog` are
  implemented, guarded, unit-tested and have **zero callers**. Finished work
  that never reached a surface — invisible to every instrument, because
  coverage looks healthy and the suite is green.
- Durable storage is never requested. No `navigator.storage.persist()` on a
  localStorage-only profile.

## Stage 7 — what got wired 2026-08-29

**The shipping app reported no activation funnel, and nothing said so.** 55
events defined, hostv2 fired 7 — all lodging and decision-reason — while every
activation event (`event_created`, `host_home_viewed`, `invite_shared`,
`invite_viewed`, `invite_rsvp_submitted`, `signed_up`, `first_value` …) fired
ONLY from the frozen CRA. Transport worked, both keys ship, and the funnel was
empty. Same shape as `untrackedIsNotPassing`: a check that never ran scored as
a check that passed.

Wired in `HostShellV2.jsx` (host home, event created, invite shared × 2
outcomes) and `InviteV2.jsx` (invite viewed, rsvp submitted). Four of the five
are gated by `hostv2/e2e/activationFunnel.spec.mjs`, **49/49 across all seven
viewports**, each hook red-proofed individually.

`event_created` is wired but NOT gated — hostv2 has no create door reachable
from a seeded boot. Declared, not silently omitted.

Verified in the deployed bundle, at feature level rather than by hash: the
PostHog key sits in `eventIdentityEngine`, the FIFTH of seven lazy chunks, and
the Sentry DSN is in the entry. Checking only the entry and `HostShellV2` would
have produced a confident false zero.

**Presence is not delivery.** Keys shipping proves the client is configured; it
does not prove an event arrived. That needs the dashboards — yours.

## Path artifact

| Artifact | URL | Source |
|---|---|---|
| The First Recorded Gate | https://claude.ai/code/artifact/7f14f1d1-209a-4686-8615-61564542f6db | `docs/artifact/the-first-recorded-gate.html` |

Republish that same file path to keep the URL stable. Its `Recorded` date must
equal the newest gate record's date, or it is stale by definition.

## What shipped 2026-08-29

**The Helpers panel became actionable.** It was the canonical ownership view
and was read-only: a host saw "not confirmed" beside a name and had nowhere to
act on it. The chip is now the control (`HostShellV2.jsx`, Helpers panel), with
a 44px tap target and an aria-label naming both the person and the act.
`handled` is deliberately NOT offered — the work is already finished, and
confirming a promise about something done is a control with nothing behind it.
Three e2e tests in `hostv2/e2e/helperConfirm.spec.mjs` (confirm, unconfirm,
survive reload); red-proofed by making the handler inert and watching all three
fail. Closes item 4 of the previous session's queue.

**The project's first Path to Production gate.** It had deployed publicly and
continuously since 3 August with *no gate ever recorded at any stage*. Stage 6
(Deploy) is now on record as `not-yet`, recommendation `passed-with-conditions`,
awaiting your ruling — only the owner rules a gate. Stages 0-5 are recorded as
"no gate," not as passed: work exists behind several of them, but a stage marked
done because work happened rather than because a gate passed is exactly the
failure the artifact exists to prevent.

## What shipped overnight 2026-08-22

**The corpus had no post-event phase, and nobody had noticed.** Measured:
91 pre-event tasks, 15 day-of, ZERO after, across all ten types. Now 37
post-event tasks in all ten (143 rows, up from 106; content-library depth
137 -> 225 steps). Mechanism: NEGATIVE `offsetDays`, which the engine
already supported (`dueDate = eventDate + (-offsetDays)`) and nothing had
ever used. They land on a new **"After the Event"** workstream assigned by
RULE -- any negative offset -- not by category, so a future one cannot be
filed wrong by forgetting to mark it. `content-mappings.mjs` +
`extract-content.mjs`. No workbook change needed: the Workstream column has
no data validation, so the value is written, not picked.

**Design's counting fault is closed and red-proofed.** `Everyone` carried a
count while the default lens folded settled vendors away. Fixed to the
leaders' shape (Linear/Plane/ClickUp/Asana put counts on GROUPS, never on
an all-lens). The settled-vendor seed the eighth and ninth re-scores both
named and neither ran is now done -- `isInformal` is what short-circuits
accountability to on_track; a confirmed status alone is not sufficient. The
same fault was found one screen over in the guest roster, which counted the
raw array while its rows were search-filtered, and nothing covered it.
Gate: `hostv2/e2e/lensCountsMatchRows.spec.mjs`.

**TRAP THAT COST TIME TWICE.** A Playwright red-proof runs against the
BUILT bundle. Editing source and re-running the spec proves nothing -- both
of my first two red-proofs passed against a stale build and looked like the
gate was broken. `npm run build` between the edit and the run, every time.

**Also:** `template-products/` is now under git (it was untracked -- the
whole product line, no undo). Four Notion niches built and verified by diff
against the generated CSVs. Four Etsy mockup squares. Four FALSE listing
claims fixed and the numbers now derived at build time from canonical.

## What shipped the previous session

1. **Path to Production audit** — all 10 stages, `docs/audits/2026-08-21_PATH_TO_PRODUCTION_AUDIT.md`.
   Stages 1–4/6/8 pass, 5 + 7 worked below, 9 pending (D-2 preconditions).
2. **Stage 5 hardened** — `backend/tests/test_protected_routes_sweep.py` is a
   standing per-route gate over 8 sensitive routers (source gate + reasoned
   PUBLIC allowlist + bare-401 sweep). It caught `verify-session`
   unauthenticated on its first run. DocuSign token moved out of the URL;
   all comm reads/writes gated. Checklist: `2026-08-21_SECURITY_TRACK_CHECKLIST.md`.
3. **Admin console** — 3-seat board, stage 2 + 4 passed after fixes
   (`2026-08-21_ADMIN_CONSOLE_INTERNAL_REVIEW.md`). Corpus actions now reach
   `admin_audit_log`; retirement ruled standalone-capable (zero App.js imports).
4. **Build queue** — "Your days" span-gated door; the **send ledger**
   (board 6-0, `2026-08-21_COMMS_OUTLET_RULING.md`): handed_off is
   host-attested, never "Sent"; vendor drafts log contact in the same
   gesture; email slice (b) records the SERVER's answer only.
5. **Vendors sheet** — 8-seat ruling (`2026-08-21_VENDORS_SHEET_RULING.md`):
   collapsed face is one band, one ranked chip, amber demoted from default.
6. **Desktop/widescreen parity** — one frame + one measure across all 13 rail
   sections; heroes added to the 3 that lacked them. The top "Jump to a
   section" menu was a duplicate of the rail and no longer renders when the
   rail is up; its three non-section doors moved into a rail group.
7. **Collapsible rail + splash corner** (`a259ecd7`) — the rail drops to a
   64px icons-only band, persisted per browser, every door still named and
   still clearing the 44px tap floor. The splash was painting the phone's
   48px bezel inside the 20px desktop frame; it takes the frame's corner now.
   Two new gates, both red-proofed: `railCollapse.spec.mjs`,
   `frameCorners.spec.mjs`.

8. **Motion shortlist worked** (`76cc7a76`) — sheets now rise from the point
   that opened them (the audit's one real gap: continuity); a live
   reduced-motion defect closed (`.rowfocus` ring was stuck on permanently);
   `.bar i` moved to `scaleX`; the 300-900ms band named at the token source;
   `cardin`'s list stagger gated to arrival instead of every redraw. Gate:
   `motionContinuity.spec.mjs`, all four red-proofed.
9. **The rail stopped drifting** (`ae2c99da`) — host reported the desktop menu
   "jumping, dizzying". `.stagewrap` had `overflow:hidden`, which still permits
   programmatic scrolling, so every row landing scrolled the frame and the rail
   walked off the top with no scrollbar to bring it back. `overflow:clip`.
10. **The checklist follows the decisions** (`46909fa8`) — the audit's #1 item,
    shipped. `src/lib/checklistReconcile.js` merges `playbookChecklist(event)`
    into `event.timeline` instead of freezing it at creation: derived rows
    append, stored rows keep `done`/`owner`/host edits, gated-out `pbt-` rows
    are marked `retired` (never deleted) and revive in place carrying `done`,
    host-written rows are never touched, and an empty derivation is treated as
    no-information so the 9 typeless types cannot wipe a list. Wired as a
    `useEffect` on the event and the gate inputs (`HostShellV2.jsx:5125-5152`);
    retired rows leave the "N of M" DENOMINATOR as well as the numerator
    (`:15387`). Gates: `checklistReconcile.test.js` (9, against the real
    generator) and `checklistFollowsDecisions.spec.mjs` (3, red-proofed by
    unwiring the call). **The catch-up pass is silent** — the first reconcile
    per event per session patches with no toast; announcing it put a banner
    over the controls 12 specs were reaching for.
11. **Sheet-origin motion, finished** — `@keyframes panelrise` is origin-aware
    too (`styles.css:3367`); wiring only `sheetrise` had left the centered-panel
    breakpoint on the old constant. And the shell now measures the sheet with
    its animation temporarily off (`HostShellV2.jsx:3560-3576`): measuring
    through the entrance transform put every origin exactly 24px short.

## The evening block (compressed — details in the audits + git log)

- **Ownership shipped at the board's scope** (`e006f52d`): row-level assign
  writing roster-resolved names to `timeline[].owner`; `<Name> — not told
  yet` copy (Norman's condition); the `helperConfirmed` writer hostv2 never
  had; retired rows carry no responsibility and reconcile names the person
  whose job left the list.
- **FLIP on "Then, in order"** (`547919e2`) — first wired to `.qidx`, which
  returns null in the shipping mode: ten green unit tests over a surface no
  host sees. Rewired to `.ef-list`, driven. Animation 8→9.
- **Vendors ruling clauses 2–4 closed**; day-of copy truth at T-0; multi-day
  span seeded (`TEST_MULTI_DAY` — in BOTH `ROSTER` and `ALL_SAMPLES`, the
  second registration being the fix's own near-miss); "280 days past its
  window" capped at the 60-day countability line.
- **Template line program**: `products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`
  (5 workstreams, seasonality-sequenced launch calendar) on the evidence of
  `docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md` (US-scoped,
  amended after the owner caught the missing Oct–Dec hosting arc).
- **Template line executed to the W2 gate** (evening): seasonal research
  (US-scoped, Halloween amendment) -> program spec
  (`products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`) -> W3 done (10
  types, FIVE niche workbooks, QA 75->132, whenChoice gates live in the
  sheet) -> engine delta audit done (7 stale claims, 5 ranked ports) ->
  Reunion enriched (`4d10920a`: decisions 5->9, tasks 24->44, all gated,
  byte-identical local-host invariance) -> template QA re-run 132/132.
  Two artifacts published (When Hosts Buy; The Template Line). Next in
  line: W3.5 engine round per the delta audit; PTA/booster playbook;
  `home_hosted` budget-share family (a home Thanksgiving currently shows
  Venue/Catering bands). W2 + brand/pricing/funnel/disclosure = Todd.
- **Three playbooks authored + grounded** (`4da9dfde`, `3c39884e`):
  Thanksgiving Hosting (24 tasks), Halloween Party (22), New Year's Eve (14,
  midnight-anchored ROS as its stated distinctness). Corpus now 44. Eleven
  new source ids (AFBF, FSIS thaw/temps, CDC/NHTSA Halloween pedestrian,
  NRF, champagne-pour standard…); gap counts dropped 7→6 / 8→7 / 6→4; the
  corroboration ratchet reverted four single-source upgrades — the reason
  is in their notes, the gate was not touched.

## Scores

`docs/audits/2026-08-21_NINE_DIMENSION_LEADER_RESCORE.md` — **77/90 (86%)**
vs 63.8% on 07-13, via 67→70→72→73→75→76→77. Decision engine 42/50
(unmoved; its next lever is the ownership ruling now BUILT — re-score it).

## The rulings that now govern this work

Three boards sat on 2026-08-21. Read the ruling before touching its area —
each one rejected something, and the rejections are the load-bearing part.

- **`2026-08-21_TASK_OWNERSHIP_RULING.md`** (6-2 ship, narrow). BUILT. Assign
  writes a roster name to `timeline[].owner`, notifies NOBODY, and says so:
  `<Name> — not told yet`. Rejected outright: importing `playbookMilestones`
  (the join is 123/408 and the owners are role words) — dead, not deferred.
- **`2026-08-21_GUEST_TRANSPORT_RULING.md`** (6-2 DEFER guest sending).
  Dissent from BOTH directions: one seat wanted a capped guest batch, another
  wanted the vendor path deleted entirely. Its measurements are the reason
  this session changed course — see below.
- **`2026-08-21_VENDORS_SHEET_RULING.md`** — all six clauses now shipped.

## The pattern that cost the most today

Not a bug — a class. Seven times something was **built, correct, and
unreachable**, and each was found by looking rather than by any gate:

- `playbookDayOfChecklist`, `playbookMilestones`, `playbookTasks` — finished
  engines with zero hostv2 imports.
- FLIP mounted on `.qidx`, which returns null in elegant mode (the shipping
  mode). Ten green unit tests over a surface no host sees.
- The span-gated "Your days" door, with no seeded event carrying a span.
- The seed that fixed it, registered in `ROSTER` but not `ALL_SAMPLES`.
- **The vendor send button, which renders on zero events** — one of 24
  `openDraft` sites passed a `vendorId` and `emailTarget` requires one. The
  transport this repo describes as working had never fired.

Its mirror: five times a **probe was wrong, not the product** — a source slice
scoped to one card, `settled()` between a click and a toast, an assertion on
`.app` for a toast that renders outside it, zero-WIDTH asserted on a
`max-height:0` panel, a `> 4` row count taken from a desktop run.

And once a test **ran, passed, and proved nothing**: the lens gate asserted
`chip === rows` on a chip reading 0, so `0 === 0` was the whole evidence while
the control was visibly broken. That one shipped the same arithmetic fault
three times.

**The question none of these were asking: is this check actually looking at
the thing it claims to check?** Red-proofing and independent verification
caught every one. Three claims of mine were falsified by a verify pass this
session — the vendor money that had no tabular-nums, and both lens faults.

## Stage 8's first gate, and a historical tracking gap closed alongside it — 2026-09-03

Running the path-to-production spine fresh (Step 1, not from memory) surfaced
`historical: 1` in the tracker's own flags — a stage below the current one with
no gate ever POSTed. That was **stage 5 (Security)**: a full audit ran
2026-08-21 (`docs/audits/2026-08-21_SECURITY_TRACK_CHECKLIST.md`), a per-route
sweep exists as a standing gate, and both were cited inside the stage-6 gate's
own `skillsUsed` — but the stage-5 gate itself had never been recorded via the
API, so the tracker read it as unanswered rather than done. Recorded now with
the identical six OPENs already carried by the stage-6 flag. No new security
work; the gap was in the tracker, not the project.

**Stage 8 (Maintain) recorded for the first time.** Zero gates had ever been
posted at this stage despite the project sitting there through this entire
session. Debt ranked by what it blocks (the six stage-5 opens and the repast
community-review gate block stage 9; Vite 8 adoption and the source-text
census block nothing, tracked); the runbook's location and what was wrong with
it; which earlier claims were re-checked fresh this session (CI, unpushed
count, both test runners, the CI seam) versus left standing on the owner's own
authority (the security opens, PostHog/Sentry arrival, repast review).

Per Step 2g (added to `ngw-os/commands/path-to-production.md` this session,
before this recording ran): stage 8 having no required skill is a deliberate,
dated ruling, not an oversight — and this session's shape (verify claims by
breaking them, red-proof every gate same-session, read the runner's log rather
than the workflow file, trace warnings to blast radius, gate pushes in the
condition, correct stale findings in place) is recorded there as evidence for
a future adoption decision, which is the board's to make, not this session's.

Artifact republished, `Recorded` date current, stage 5 and 8 cards now show
real state instead of "No gate" / "Locked". Both gate POSTs re-verified via
Step 5k (re-read the API, confirm the right flag actually changed) rather than
assumed.

## Next, in order

1. **The transport board's queue**, non-transport and none of it needs the
   webhook: per-recipient handoff recording on the guest rails; the roster
   told/not-told read (`Told 24 of 41 — 17 still to tell`).
2. **Day CRUD across a span** — Workflow's named gap, and newly TESTABLE
   because `TEST_MULTI_DAY` now exists. Was unbuildable before: no seeded
   event had a span.
3. Author the 16 `synthesized` purchases in clientDinner/fundraiserGala with
   real citations. Today ADDED to the grounding backlog rather than reducing
   it — honestly, but it is now owed.
4. ~~`helperConfirmed` has a writer but no surface shows the confirmed state~~
   — **DONE 2026-08-29**, see above.
5. ~~Rule the stage 6 gate~~ — **RULED 2026-08-29: passed with conditions.**
   Deploy is closed; stage 7 (Handoff) is now the open stage.
6. **Work the nine standing conditions.** They gate stage 9 and are in force
   NOW, not later, because the surface is already public. Six are security
   (external pentest; finding #8 portal authz, a board question; and four
   attestations only you can make — RLS applied-status, backups plus one real
   restore, login rate limiting, Sentry DSN reporting in prod). Three are
   marketing: the acquisition thesis is unwritten, the stranger test has not
   run, and economics are unproven — **so no paid spend is authorized.**
7. Stage 7's own items: instrumentation and tracker sync, and per-asset
   attribution. Both are re-run retroactively at stage 9, so doing them once,
   properly, now is the cheap path.

## What only you can do

These are not blocked on engineering and will not move without you:

- **Run the stranger-proof onboarding test.** Ease of use is asserted at 8,
  not observed. Nobody outside this project has used it.
- **Prove the Resend webhook live.** Until then `delivered` cannot honestly
  exist, and DIFM/Attention both sit against that.
- **Send one real vendor email end to end.** Now possible for the first time:
  put an address on a vendor, sign in, and the send path is reachable. That
  run is the precondition for everything above it.
- **Grounding** is authoring, not engineering — capped at 9 by the
  cultural-basis ruling.

## The artifact is gated now

`hostv2/e2e/pathArtifact.spec.mjs` — three tests over the "Hide completed"
toggle the path-artifact skill requires. The one that matters asserts every
NOT RUN item is still visible with the toggle on: the naive selector catches
`.mark`, which would bury exactly the findings the page exists to surface.
Red-proofed by widening the selector to `.mark` and watching it go red
(4 not-run items visible expected, 0 received), then restoring from a copy
rather than `git checkout --`.

## The conditions, verbatim

The server turned the ruling into a standing `conditional` flag that persists
past stage 6 — that is what a conditional pass is for. Read them off the
artifact or `~/Code/skill-index/cache/ptp-gates.json` (record 32); do not
re-derive them from memory.

A conditional pass is not a finished security track, and it is not permission
to spend money.

## Traps that cost time here

- **Node 20 here is the INTEL Homebrew prefix** (`/usr/local/opt/node@20`), so
  on Apple Silicon it runs under Rosetta as x86_64 and **every child process
  inherits that**. `python3` then cannot dlopen `pydantic_core`'s arm64 binary,
  so the backend suite fails to COLLECT under a spawn while the identical
  command in an interactive shell passes all 353. Same interpreter, same cwd,
  opposite result — and nothing prints the parent's architecture unless you ask.
  `verify:all` guards it with `arch -arm64`.
- **RESOLVED: `gate:cra` red locally / green in CI was a STALE `node_modules/.cache`.**
  The babel-loader ESLint cache held a result from before `COST_PROVENANCE_TYPE`
  acquired its use, so the gate reported the symbol unused while it is used at
  `governedFieldTypes.js:342`. CI runs `npm ci` into a clean tree and never saw
  it. `rm -rf node_modules/.cache` makes the gate print CI's exact line —
  "241 of 245 baselined" — and `verify:all` went 7 of 8 to **8 of 8**.
  **When a gate disagrees with CI on the same commit, clear the build cache
  before believing either.** A cached lint result is a measurement's corpse.
  Related: a subagent that ran the command inferred main was red. The command
  was reported honestly; the inference past it was not checked. Verify a board's
  findings before acting on them.
- **The e2e preview server serves the EXISTING `dist` and never builds.** A
  source edit changes nothing until `npm run build`, so my first red-proof
  disabled four hooks in source and watched all 7 tests pass — a completely
  vacuous green. Rebuild between red-proof steps. (CI is fine: `checks.yml`
  chains build before `test:e2e`.)
- **A `test.skip()` on the condition under test turns a broken gate green.**
  Disabling the instrumentation made the invite spec SKIP rather than fail —
  7 tests became 6 and the summary still said passed. Guard on a precondition
  (the surface rendering), never on the thing being asserted.
- **Track calls are awaited before they fire.** `shareInviteLink` and the RSVP
  submit both await the clipboard / the API before tracking, so reading the
  event log after `settled()` is a race — it failed on a different viewport
  each run, which reads like a layout bug and is timing. Use `expect.poll`.
- **Artifact stage items come from the spine, never from a summary.** Writing
  them out of conversation memory produced three different defects on one page:
  an invented task (stage 3 has no gate by design, and the page demanded one),
  four omitted gates (including stage 2's reference-scan ordering rule, the very
  failure the command exists to prevent), and one softened gate (stage 1's real
  gate is *name who hits this problem today*). Read
  `~/Code/ngw-os/docs/path-to-production.md` and count obligations against
  items. Now written into the path-artifact skill (`c78aff4`).
- **A geometry check is not a look.** The artifact passed 11-stages /
  zero-horizontal-scroll / no-JS-errors at six viewport-theme combinations
  while two stages rendered their numbers one word per line. Cause: switching
  the item rows to CSS grid promoted every inline `<span class="num">` to its
  own grid cell on its own row. Flex had the opposite failure (an anonymous
  text box floors at min-content and pushes the row past the viewport). A
  hanging indent has neither. **Screenshot after the measurement passes**, and
  count rendered lines per row as part of the check.

- **A deployed bundle's hash proves nothing against a LOCAL build.** Nearly
  reported a stale Pages deploy today: the live `HostShellV2-*.js` hash did not
  match the local build while the CSS hash matched exactly, which looks precisely
  like the recorded staleness trap firing. It was not — CI injects `REACT_APP_*`
  repo variables the local build lacks, so content and therefore hash differ
  legitimately. Probe the deployed bundle for a **feature marker** shipped in a
  known commit instead.
- **`minmax(0,1fr)` and anonymous flex items.** Three wrong diagnoses in a row
  chasing 17px of horizontal scroll on the artifact page. A `1fr` grid track and
  a flex item both floor at min-content; worse, an item made of a bare text node
  is an *anonymous* box with no element to set `min-width:0` on. Measure which
  leaf overflows, then hide top-level children one at a time to find the owner —
  do not reason about the cascade.
- The **browser pane** stops accepting clicks after a few interactions and
  never clicks at desktop widths. Drive with Playwright instead.
- **Four false-zero probes** in one session (grep missed a chunk; a class-name
  counter missed a quote style; `hit.contains(el)` counted ancestors; a raw
  token compared against computed `rgb()`). Red-proof every gate.
- **A door that moves with the viewport belongs in one helper.** Hiding the
  duplicate "Jump to a section" row at rail widths turned ten e2e specs red at
  `desktop` and `wide` while the app itself was fine; I fixed exactly one
  (`a11yFloor`) because it was the one my local desktop run happened to
  execute, and left nine carrying the old inline phone path. The door is now
  `openSectionByName(page, name)` in `hostv2/e2e/fixtures.mjs` — it uses the
  rail when present and the two-tap menu otherwise. Running one project
  locally is not running the suite.
- **A new toast is a new obstacle.** The reconcile's announcement broke 12
  specs on click timeouts by sitting over the controls they were reaching for.
  The specs were right: it was a banner nobody had asked for.
- **`addInitScript` re-runs on EVERY navigation.** An unconditional
  localStorage seed rewrites the pristine state over the host's own on
  `reload()` — indistinguishable from app data loss, and I filed it as such
  before the harness was ruled out. Guard the seed; assert SURVIVAL across a
  boot, never the write (the write lands even when the value is about to be
  destroyed). `docs/audits/2026-08-21_CUSTOM_EVENT_PERSISTENCE_DEFECT.md`.
- `git checkout --` after a red-proof reverts the guarded edit too. Fault
  and restore with a targeted string swap instead.
- **Reading the CSS is not measuring it.** A reviewer derived "the frame
  narrows when the rail collapses" from the width formula; measurement at
  1440 showed the opposite, because the formula clamps on the viewport
  there and only binds at 1920. Both are correct at their own width. Any
  claim about a `min()`/`clamp()` layout has to name the width it holds at.
- The unit suite is `CI=1 npx react-scripts test --watchAll=false` from
  `demo/`. Bare `npx jest` scans node_modules and reports ~1369 bogus
  suite failures — a false red that looks exactly like a real one.
- Node 20 lives at `/usr/local/opt/node@20/bin`. Playwright leaves its
  preview server bound; `lsof -ti:5244 | xargs kill -9` before a re-run.
