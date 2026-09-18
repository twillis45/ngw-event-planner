# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-09-18 (the pre-push routine
now runs what the deploy runs. Two deploys — 310 and 311 — died at "Build
release artifact" while jest and both gates were green, and both were reported
as verified; production sat two commits stale for two and a half hours. The
break was a statement between two imports, which react-scripts treats as a
build ERROR, so no suite could see it. `verify:all` step 9 is now `npm run
release`, and `npm run verify:push` is the ~40s routine that can be run every
time. Worth carrying forward: "jest is green" was TRUE and did not mean the
change shipped — name which checks ran rather than letting "verified" imply
the set. See the dated entry below.)
Before that, on 2026-09-17 (governance day: Watch
Party's authored knowledge became GOVERNED knowledge. The corpus went 16 -> 28
records after nine cost claims and three re-researched quantity claims were
published through the real KCR functions; four source-citation defects were
found and fixed across two playbooks; and the playbooks gained their first
cook-method decision, so the checklist finally knows whether the host is
grilling. Two things worth carrying forward more than the features: a research
pass reported as BLOCKED was not — WebFetch is bound by the environment's
network allowlist but the Exa MCP tools are not, and they reach pages WebFetch
cannot. And a high-effort code review of the day's six commits found ten
defects that 442 green suites had not, including a regression that made EVERY
Watch Party claim open flame. See the dated entry below.)
Before that, on 2026-09-13 (this same file's prior session,
continued once more: asked the KCR review board what the full major_event
body of work was still missing. The board measured a coverage matrix
directly off the engine (not memory) and found 2 real format-mate gaps —
World Series had zero heartMoment overrides despite a real purchase, and its
run-of-show was never reworded per-event like every sibling; Wimbledon was
missing one of the two heartMoment variants Masters already had. Fixed all
three. Also built hostv2/e2e/watchPartyMajorEvent.spec.mjs — the first real
e2e coverage for this whole differentiation system, driven through the
rendered screen rather than direct engine calls, guarding the three
host-visible bugs found earlier by reading engine output by hand (which had
no permanent regression test until now) plus a click-through wiring proof.
See the dated entry below.
Before that, in this same session: built the "NFL Playoffs" major_event option the audit
flagged as missing — real research first (Wild Card Weekend is genuinely 6
games/3 days, every round is single-elimination), joined the existing
Multi-day tournament format and reused its `tourney_span` decision rather
than inventing a new mechanism, no fabricated purchase (research found no
real distinguishing shopping tradition, so it's heartMoments-only, same
honest treatment NBA Finals/Stanley Cup got). See the dated entry below.
Before that, in this same session: audited the remaining 11 named events the same way,
found the same bug CLASS on 2 more events the top-5 sample missed (Daytona
500's run-of-show, The Masters' heartMoments) — both cases of one format
member getting a fix/variant and its sibling not. Also directly answered
"did we do non-Super-Bowl NFL games": no — playoffs/wild card/conference
championship route to the Watch Party TYPE correctly via free-text keywords
but have no major_event OPTION, so they fall into the generic fallback.
Flagged for a priority call, not built. See the dated entry below. Before
that, in this same session: "demo the top 5 sub-events and audit for logic issues"
against real engine output found and fixed 3 real host-visible bugs — risks
were never gated by major_event at all (r_derby_time/r_rivalry showed for
every event, a defect dating to pass one), a "Halftime hits..." heartMoment
promised a break to 3 formats that don't have one, and World Cup had zero
heartMoment differentiation. Also fixed Kentucky Derby's run-of-show, which
had stayed 100% football-worded through 3 prior passes. See the dated entry
below. Before that, in this same session: a host-specified 6-format taxonomy — single game / multi-day
tournament / combat-PPV / racing-spectacle / continuous coverage / broadcast
event — now genuinely reshapes Watch Party's run-of-show, not just its decor
and food, via two small precedented engine changes (choiceShown gained a
`{not:[...]}` form; the run-of-show reader now honors per-row whenChoice
gates). Also fixed a real pre-existing bug found while verifying it: every
Watch Party's default drinks purchase was silently missing from the shopping
list. See the dated entry below. Before that, in this same session: extended
Watch Party's major-event differentiation to World Series/Masters/World
Cup/NBA Finals/Stanley Cup/Olympics — this time by actually running the
codebase's KCR governance pipeline, per Todd's standing directive "Don't ever
add without pipeline." Also, earlier the same session, a live-hosting session built out real
per-sport differentiation inside the Watch Party playbook —
Super Bowl vs. College Football National Championship vs. Kentucky Derby
now genuinely differ in atmosphere and shopping list, not just in name; on
top of sporting-event recognition widened far beyond Super Bowl (NBA
Finals, World Cup, Kentucky Derby, UFC, Olympics, bowl games, and more —
all routing to Watch Party); Watch Party missing from the quick occasion
picker at creation; Super Bowl / sports-watching free text not resolving to
Watch Party; no way to start a second event mid-session; a Game Night/Watch
Party misclassification; an occasion-picker mis-tap risk; a dead "Something
else" pill; and, earlier the same session, a severe nav dead end on
Day/After. On top of the Cookout wings/game-day content, headcount parse
fix, and CI-red closure).
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `f64cee2d` |
| Jest | **6,930 passed**, 1 skipped, **0 failed**, **471 suites** (re-measured 2026-09-18, ninth entry). A latent time bomb was found and fixed this pass: `recordDedupStaysLive` pinned `AS_OF` while `eventPlan(ev)` (no as-of, reads the real clock) was not, so the two agreed only on the day it was written — green in CI 2026-09-14, red 2026-09-17 with no code change between, and failing every run thereafter. `AS_OF` now anchors to today |
| vitest (hostv2 seam) | **14 passed** — the only runner that EXECUTES the host shell (new 2026-09-03) |
| Backend pytest | **353 passed** — re-run this pass via `verify-all` |
| verify-all | **11 steps**, seam included; `--fast` skips the matrix. Step 9 is now **`npm run release`** — what the deploy actually runs — replacing the bare hostv2 build it contains (2026-09-18) |
| Pre-push routine | **`npm run verify:push`** = handoff + knowledge + jest + hostv2 seam + `npm run release`. The release step is ~40s and is the only local check that runs the deploy's toolchain |
| e2e (Playwright) | full matrix **983 passed / 207 skipped / 0 failed** (24.1m), confirmed on `checks.yml` run 34820036342 (commit `588e520`). Up from 909/190 — `watchPartyMajorEvent.spec.mjs` (6 tests × 7 projects = 42) is the delta. Real CI caught a failure this session's sandbox-only desktop check couldn't: 3 failures on `mobile`/`landscape`/`tablet` from a sheet not closing between two sheet-opens in the wiring-proof test — fixed (`c9c686b`), then reverified 983/207/0 clean |
| Activation funnel | `activationFunnel.spec.mjs` **49/49** across 7 viewports, 4 hooks each red-proofed |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |
| Path to Production | stage **1 recorded PASSED 2026-09-03** (who hits this today, sourced from the project's own competitive reads — not invented). Stage **8 (Maintain) recorded, passed-with-conditions, 2026-09-03** — first gate ever posted for this stage. Stage 6 PASSED WITH CONDITIONS (Todd, 2026-08-29). Stage 7 ruled `passed-with-conditions` by the review board 2026-09-02, under the owner's standing delegation. **Stage 5 (Security) also recorded 2026-09-03** — closing a tracking gap: the audit ran 2026-08-21 but the gate was never POSTed, so it read as historical/unanswered until this run. **Stage 9 entry: NO** |
| Standing conditions | **9**, gating stage 9 (Promotion) — 6 security, 3 marketing. No paid spend authorized. Unchanged by the stage 5/8 recordings — no new claims, only closing tracking gaps |
| Path artifact | Republished 2026-09-03 (twice). Stage 5 and 8 cards show real recorded state. Three stage-7 checkboxes corrected: they described fixed problems (admin console key, 3-of-4 recovery functions, day-of probe) that had never been ticked off when the fix landed — found by re-verifying every open item against the repo, not by trusting the page |

## FIXED 2026-09-18 (ninth entry, same day) — two more agent lanes, and three measurements that were asking the wrong question

Commits `a11cd23` `ce891e7` `10d7457` `615ef02` `8ef6df7` + the timing lane.
**471 suites / 6,930 tests.** `verify:push` green on jest, seam and release.

### The theme: three "gaps" that were mis-measured

| Claimed | Actually |
|---|---|
| `ask` at 61% | **now 100%** — 267/267 decisions, 594/594 rows |
| `timingProvenance` at 2/260 | **10.4% grounded** — it is a CENTRAL RESOLVER, not a per-decision field. The 2 are overrides |
| eight spec fields "empty" | **seven have no READER either** — not a gap, an unbuilt spec line |

The last one is the rule worth keeping: **a field with no reader is not a gap.**
Authoring it produces data nothing consumes. We have the precedent measured —
`blocks` is authored 250 times and contributes exactly zero.

### `615ef02` — every open decision asks its own question

61% → 100%. Only SEVEN authored `ask` fields existed; the other 355 rows got
theirs from a label that happened to end in a question mark. 114 authored.

**This closed a defect from earlier today, verified end to end rather than
assumed.** The wedding bundle read *"Settle your decisions."* at six stages. The
bundle-inherits-its-lead-child's-ask mechanism shipped this morning was INERT
because no child authored one. All six stages now read **"What's the number, and
who is paying it?"**

Register held: Repast was written against that file's own 2026-09-03 panel ruling
that "the community carries the meal" is a NORM, not a fact — *"Has anyone
offered to carry the meal, or should it be catered?"*, naming no church.

### `8ef6df7` — real 2026 research, one promotion, five divergences

Seven pages retrieved in full via **Exa** (WebFetch is allowlist-blocked; Exa is
not — a prior session reported research "BLOCKED" having never tried it).
0 → 1 of 17 grounded, 9 citing. And it is honest about the limit: the one
promotion is in NEITHER factor-key list, so **no figure a host sees became
grounded**, asserted by three tests rather than left to imply otherwise.

Every source is a commercial practitioner — no independent or government
measurement of US event pricing was found to exist.

Five divergences reported, **not applied**: Saturday ships +20% against a measured
1.2% on the matching unit (and ~16× the observed differential); peak season +15%
against 4.9%. **Bug found while probing:** `PER_HEAD_BY_TYPE[type]` was a
prototype-chain lookup, so a type named `__proto__` emitted `NaN` **while citing
the provenance table that supposedly produced it**. 39,312-case sweep hashed
before/after — byte-identical.

### The timing lane — a contradiction was being reported as an absence

`resolveTimingProvenance` returned null for two situations no caller could tell
apart: *no category matched* (honest, the majority) and *a category matched and
then the lead-window gate rejected it* — meaning a real dated source speaks to
this decision **and our deadline disagrees with it**.

Six decisions are the second case. **Four tell the host to act LATER than the
source supports:**

| | ours | source |
|---|---|---|
| Holiday Party · venue | T-35d | 2–3 months for a party space |
| Retirement Party · venue | T-35d | 2–3 months |
| Day Party · venue | T-28d | 2–3 months |
| Surprise Proposal · photographer | T-30d | photographers book far out |

December venues are the most contested booking of the year, and five weeks out is
where a host finds that out. **No authored deadline was changed** — every source
here is a commercial practitioner and "a wedding blog says 2–3 months" is not
grounds to move a backyard Day Party's date. The four shipped leads are pinned so
a future pass that does move them fails first and has to say so.

### `a11cd23` `ce891e7` `10d7457`

Intake **derives** the vendor vocabulary instead of mirroring it — `Booked` and
`Paid` were canonical and missing from the importer's list, and only listed
members get case-normalised, so `booked` from a CSV stored as `booked`, which
`isVendorBooked` answers false for. A vendor that read as never-contacted.

The schema spec stops lying — five fields it marked BLANK had shipped. **That
sweep found a live defect:** a locked decision was silently dropping its authored
question (`ask: authoredQuestion(label)` where the open branch reads `d.ask ||`).

`hostSpending` declares its price bases. Measured: food and supplies move with the
regional factor, capacity is flat at $1,453 — 18.2% of `committed`, national
baseline inside a regionally-priced total. **The obvious fix was wrong**: that
factor is a BLS *grocery* basket, and chairs are not groceries. The disclosure
shipped; the multiplication did not.

**Corrected in passing:** an agent reported a committed leftover probe running in
CI. Checked — never committed, not on disk. Nothing in CI.

## FIXED 2026-09-18 (eighth entry, same day) — five lanes in parallel: 466 suites / 6,857 tests

Four subagents on disjoint file sets plus my own shell lane. Ownership was
partitioned by FILE, which is what let five editors work one tree without a
single collision. Commits `90344a5`, `f759e18`, `406e99d`, `fa9f372`, `8038fc6`.

**Carry this forward before the findings: an agent report is evidence, not a
verdict.** Three times today a conclusion needed checking and three times the
check paid.

| Who checked whom | Outcome |
|---|---|
| Agent → me | I passed on a stale "this finding is latent". It measured: a **blank vendor category** falls through to the `OTHER` playbook, which *does* declare the promise. Host-reachable, not latent |
| Me → agent | Its follow-up recommendation (drop the shell's `!ha.overwhelm` fold gate) would have started folding in **9 of 21 states**, seasoned hosts included, bypassing its own small-pile control. Declined, reasoning pinned at the gate |
| Agent → its own test | A negative control caught a real error in the test itself — `getActionableNextStep` reads `sourceCategory`, not `category`. Eight assertions had been passing against a generic fallback |

### The lanes

**Vendor vocabulary (`90344a5`).** Ten private copies of "is this vendor booked"
retired across nine files. `'Paid'` was the hole every one shared. Closeout went
from *"All wrapped up"* to *"1 thing left"* over a $6,000 outstanding balance;
silent vendors 6 → 2. The closeout fix is **not** a word-list swap — a status
should not decide whether money is settled, so it now asks `vendorMoney` whether
a balance is outstanding, catching a deposit paid under a `Considering` status
that no word list could. The `'Partial'` phantom is written by nothing in the
repo, but reached a store through CSV intake and rendered an amber PARTIAL badge
while `isVendorBooked` answered false on the same screen. Intake now coerces with
a warning naming the planner's own word — the house pattern already used on the
guest side. **Reachability was traced, not assumed:** of ten sites exactly one
ships to a host today.

**Host engine (`f759e18`).** `blocks` was **deliberately not wired in**, and the
measurement is the deliverable: 46 of 471 entries name a real decision (vs 67 of
67 for `dependsOn`), it sits on 92% of rows, and giving it the obvious bump moved
8 rows of 249. It is a domain-tag vocabulary, not a dependency graph. The
first-timer fold now fires — 0/45 → 20/45 at T-45, still 0/45 for a host who said
nothing. Nine strings asserting the host is alone, fixed; the design rule worth
keeping is that **`helperCount` is `known` only when positive** — zero is silence,
not evidence of being alone, so the app can never derive "you're on your own"
from nothing.

**Parser (`406e99d`).** The town survives — bare ZIP and bare city both resolve —
**without inventing a state**. Admission is a curated whitelist, not a loosened
regex, and `state` is always null even for a name unique in the list: `Arlington`
appears once (TX) because Arlington VA is absent, and "unique in a 240-row list"
is not "unique in America". 30 junk strings must stay town-less, including `Vida`
— a real US place, still refused, which is why the 29,738-row list was rejected.

**Money (`fa9f372`).** 17 records, 116 numbers, **0 grounded** — and no citation
was invented to change that. The predicate checks the registry rather than the
adjective, so an unsourced constant cannot pass by editing its tier. Three
refusals are on the record, including that `SOURCING_TIERS` does not reproduce
from the table said to back it (mean costco 0.706 vs shipped 0.85). **98,280
evaluations captured before and after prove no dollar moved.**

**Shell (`8038fc6`).** An invented headcount no longer reaches a vendor; absence
is no longer recorded as an answer; the arrival roster stopped dropping
`Booked`/`Paid` vendors; national prices stopped presenting as unqualified; the
draft sheet's private bracket rule retired ({2,60} against the guest gate's
{2,80} — a 65-char blank was withheld from guests *and* drew no warning).

### The ratchet got paid down

`textGateRatchet` went **36 → 42 today**, five bumps, each logged as "the seam
needs widening". This session's seam fix is the first entry that did something
about it: the rule moved out of four `...( ? : {})` spreads inside hostv2 into
`lib/travelFieldsToPersist.js`, and got **16 behavioural tests and no bump**.
The fix for an untestable rule is to move the rule, not to assert on the source
that holds it.

**NOT runtime-verified:** the draft-sheet notice render and the rows-only budget
branch both need states I could not drive open. Said plainly rather than folded
into "QA performed".

**Next:** the per-head table is the highest-leverage target left — one dated
per-head survey registered in `MONEY_SOURCES` would promote the largest number a
host sees. Then `perHeadFallback`: delete it or turn it into a refusal.

## FIXED 2026-09-18 (seventh entry, same day) — HOST REPORT: "Nothing needs you today" over three past-due rows

Todd, verbatim: *"Nothing needs you today. Not matching todos, have items
overdue."* Reproduced against the running engine, then **driven in a real
browser at 390px** — which is the part that matters most below.

**The mechanism — two snooze stores, one fact.**

| | writes | reads |
|---|---|---|
| a card set aside | `event.snoozed[ACTION id]` (`HostShellV2 ~:8561`) | — |
| a step's lateness | — | `task.snoozedUntil` (`taskLead`) |

Tapping "not now" on the last few **cards** emptied `nextActions`; nothing ever
set down the **work**. `listIsCalm` is `queue.length === 0`, so the app read one
as the other and granted calm while the steps sheet below still printed *"9 days
past its window"* over three rows.

**The fix is NOT to silence the rows.** Writing `snoozedUntil` onto the task when
its card is snoozed would hide the contradiction by making the app stop calling
real late work late — a visible lie traded for an invisible one. The rows are
right; the calm claim is wrong. So this is the **mirror of `exhaleGate`'s own
invariant**: that rule says a CHECKLIST may not license calm while the ENGINE
still has something to say; this one says the ENGINE going quiet does not license
calm while a surface the host is LOOKING AT says something is late.

**Three authors of the same false sentence, not one.** Vetoing the calm pole left
the verdict line under it (*"All quiet — you're genuinely set for now"*) and the
empty-queue fallback each reading `listIsCalm` directly. The test's source sweep
found the second and third. The fallback also had to move from `listIsCalm` to
`mayBeCalm`: those gates were interchangeable only while calm could not be
vetoed — the moment it could, a vetoed state would have rendered **neither** the
pole nor the fallback, i.e. a blank hero.

### THE FIRST VERSION OF THIS FIX WAS INERT — carry this forward

It counted `upNext.filter(r => r.overdue)`. It did nothing, for two reasons:

1. `upNext` ends with `.filter(x => x.days >= 0).slice(0, 3)` — it is the
   "Coming up · dated, not urgent" list, so it **excludes past-due rows by
   construction** and its `overdue` flag can never be true.
2. That flag came from `taskIsOverdue`, the **blame** policy, which forgives a
   snoozed or unreachable row — while the sheet's label derives from the raw due
   number and forgives neither.

**Green in jest, nothing on the screen.** The jest test passed because it
computed the count itself; the source sweep passed because the wiring existed.
Neither proved the wiring carried a value. *Driving the real app is what caught
it.* `taskLead` gains `taskWindowClosed` — the DISPLAY fact — so "is the host
being told this is late" and "is the host to blame for it being late" stop being
the same question.

**Measured in the browser**, same event, everything snoozed:

| | hero |
|---|---|
| before | "Nothing needs you until Sep 23." |
| after | **"3 things are past due — in the list below."** |
| control | tick the rows off → "Nothing needs you until Sep 23." returns |

**Files:** `src/lib/exhaleGate.js` (`calmVetoFor`), `src/lib/taskLead.js`
(`taskWindowClosed`), `hostv2/src/HostShellV2.jsx` (three surfaces),
`src/lib/__tests__/calmNeverOverOverdue.test.js` (new, 15 tests).
**QA:** 458 suites / 6,535 passed; `verify:push` green; **driven at 390px with a
negative control**. Ratchet 41 → 42, reasoned.
**ALSO FOUND, NOT FIXED:** the steps sheet's due label bypasses the one overdue
policy entirely — a row with `snoozedUntil` set, or one the event was created too
late to ever reach, still reads "past its window" there. Reported, not folded in.

## FIXED 2026-09-18 (sixth entry, same day) — six readers disagreed on "is the budget set", and the shipped demo made them all speak at once

The seeded demo wedding carries budget **rows** totalling $18,900 and **no
`totalBudget` field**. On that event, on one screen, the app said all of this
simultaneously:

| Surface | What it said |
|---|---|
| money bar | "$3,113 of **$18,900** left" |
| budget editor (200 lines below it) | "A number to plan around… Use $X" — *asking for one* |
| hero cue | "**Set your budget**" |
| checklist | "Set the budget" — **DONE** |
| Reveal card | "**$0** allocated across 6 categories. Budget is set and live." |

Six readers, three different rules. The Reveal is the sharpest: its **gate** read
the rows sum, then it packed only `totalBudget` into its data and printed
`Number(undefined) || 0`. A wrong dollar figure and a false readiness claim in
one sentence, on the surface whose entire job is to earn trust.

**The readers were not all wrong.** They were answering TWO questions that had no
names, so each site picked one by accident:

1. **Is there a number to plan against?** — `hostSpending`, the Reveal, the
   checklist, the readiness ledger. A host who filled in six categories HAS a
   number, whatever field it lives in.
2. **Did the host give an OVERALL figure?** — the budget editor (that is the
   field the control writes) and `budgetSwap` (is the ceiling fixed, or does it
   move when a row is dropped).

`src/lib/budgetFor.js` names both, and names the **basis** so a surface can say
which fact it is standing on instead of implying one it does not have. The
planning rule is `hostSpending`'s — an explicit total wins, else the rows' sum —
unchanged and now shared. `total` is **null** when there is none, never 0: a
reader handed 0 cannot tell "no budget" from "a budget of $0", and that is
precisely how the $0 got printed.

**Behaviour changed, not just plumbing:**

- The Reveal prints **$18,900** and stops claiming "set and live" over a budget
  nobody set — it says the categories add up and offers the ceiling. A host who
  *did* set a total still gets the confident line.
- The readiness ledger stops asking for a budget it already has, and its
  over-budget arithmetic — **dead** for rows-only hosts, since `over` could not
  be non-zero without a `totalBudget` — now works for them.
- The hostv2 editor, reached with rows and no total, names them and offers the
  sum: *"Your categories already add up to $18,900 across 6 lines — use that if
  it is the ceiling you mean."* It previously asked from scratch on a sheet
  already counting against that figure.
- The money sheet's fold and the editor it folds now read one accessor; they had
  asked the same question 200 lines apart in different words.

A source sweep pins that no engine keeps a private copy, with a canary. Text-gate
ratchet **40 → 41**, reasoned in place — and this one is not the shell-write case
the other four were: 21 of the 22 tests are executed behaviour with negative
controls on both directions, and only the copy sweep reads source, whose claim
*is* about source.

**Files:** `src/lib/budgetFor.js` (new), `src/lib/__tests__/budgetIsSetOnce.test.js`
(new, 22 tests), and six readers rewired — `hostSpending`, `phaseProgress`,
`taskEngine`, `budgetSwap`, `assembleRevealEngines`, `hostv2/src/HostShellV2.jsx`.
**QA:** 457 suites / 6,520 passed. `verify:push` green on all five steps.
**NOT runtime-verified:** the hostv2 rows-only branch needs a legacy-shaped event
to reach (hostv2's own editor always writes `totalBudget`), so it is covered by
the release build and the source sweep, not by a drive. Said plainly rather than
folded into "QA performed".
**Next:** the closeout "All wrapped up" over a `Deposit Paid` vendor with an
outstanding balance (`phaseProgress.js:528`) — the other host-reachable money
lie, and one pill tap away in hostv2.

## FIXED 2026-09-18 (fifth entry, same day) — the board's whole ranking died at one boundary: a bundle scored exactly 0.000

`nextActions` groups a surface's raises into ONE bundle at three or more. The
bundle carried the tightest child's **dates** (`dueInDays`, `leadDays`) and
dropped every signal `actionConsequence` reads — `priorityScore`, `gateHolder`,
`unlocks`. So a bundle scored **exactly 0.000** while its own children scored
2.0–10.1.

Crab Feast, ONE HORIZON APART:

| | rows | shape | consequence |
|---|---|---|---|
| T-8 | 1 overdue | single | **2.025** |
| T-6 | 3 overdue | BUNDLE | **0.000** |

Three or more overdue decisions is the **ordinary** state of a real event from a
few months out. So on almost every live plan, the entire authoring effort behind
the 260-decision board — weight, reversibility, emotionalWeight, gate-holding,
dependent counts — arrived at the host's most important screen as zero.

What ranked instead was `latenessBoost`, which saturates at 4.9. On a wedding at
T-150 the top **two** actions tied at exactly 4.9000; `compareBandedActions`
returns 0 on a tie and the sort is stable, so the host's single most important
instruction was ordered by **producer push order** — the exact failure the
2026-08-17 ranking-floor ruling set out to stop ("age alone can never hold
position one"), surviving inside the one construction the ruling never reached.

**The fix.** The bundle inherits its children's strongest claim, per axis:
`priorityScore` MAX · `gateHolder` SOME · `unlocks` **MAX, not SUM** (each
child's `unlocks` is its OWN dependent count and two decisions routinely gate
the same downstream work — summing [food,vendors] beside [food,timeline] claims
4 against a true union of 3, a number nobody counted) · `ask` the lead child's
authored question, verbatim or null.

Measured after: Wedding T-150 top `c=10.140`; Crab Feast T-6 `3.060` (was
0.000); T-8 `3.055` — continuous across the boundary.

**The `ask` axis was found BY the fix, which is the part worth carrying
forward.** With a real consequence the decisions bundle reaches position one —
which is where `heroAskFor` reads the ask — and with none it fell to its prose
branch and said *"Settle your decisions."* over six consecutive wedding stages
that had been asking an authored question. A ranking change moved a **copy**
defect into view. On the wedding it is still empty, and that is a separate,
measured authoring gap: **362 of 594 board rows (60.9%) carry an authored
`ask`; 114 distinct decisions carry none** — including both of the wedding's two
most consequential overdue calls (`Venue + date`, `Total budget + who pays`).
The fix there is to author the missing questions, not to re-rank the board
around the ones that have one. Tracked, not absorbed.

**Four existing tests pinned an action by ARRAY INDEX** (`nextActions[0]`) and
moved with the reranking — `severityBand` F6/F7, `snoozeIntegrity`,
`reAuditFixes` F1, `heroAskNeverPlaceholder`. Each is amended in place with the
before/after measurement and re-anchored on the action's **identity**, so a
future reordering cannot silently drop the guard. Every doctrine still holds:
the wave-5 demotion to `attention`, the window-closed snooze cap, the authored
question reaching the host — and the cap is now **additionally** asserted on
whatever actually renders first, which it never was.

Worth carrying forward: *a test that pins a behaviour by list position is
pinning the ranking too, whether or not it means to.* Four of them did, and all
four passed for months over a boundary where the board's entire score was zero.

**Also measured this session, not yet fixed** (four parallel audits, all
verified against the running engine — full detail in the artifact tracker):
`blocks` is authored on 95% of decisions and contributes **zero** (its only
reader is gated on `weight == null` and all 260 author `weight`); board order
has been frozen for five months (aging saturates at 24 days); four engines give
four different "do this first"; 19/450 playbook×horizon combos have a completely
empty active board; the fold promised to first-timers never fires for them
(measured 0/45 at T-45); nine authored strings assert the host is alone after
they have said twice that they have help; post-event closeout reports "All
wrapped up" over a `Deposit Paid` vendor with an outstanding balance (one pill
tap in hostv2 — money, host-reachable); a vendor labelled "Locked in" is chipped
"Silent 25 days" on the same screen; the Reveal prints **$0** over $18,900 of
real budget rows and calls it "Budget is set and live"; six surfaces disagree on
"is the budget set"; and `guestEstimate` has no provenance, so a playbook's
typical headcount reaches a **vendor outreach email** as "about 40 guests" on an
event where the host never gave a count.

**Files:** `src/CommandCenter.jsx` (bundle construction),
`src/lib/__tests__/bundleCarriesConsequence.test.js` (new, 11 tests), and the
four amended test files.
**Runtime impact:** hostv2 imports `eventPlan` from `@app/CommandCenter`
(`HostShellV2.jsx:10`) — this is the production engine for the host shell, not
frozen CRA code. Every host with three or more raises on one surface gets a
differently-ordered board.
**QA:** 456 suites / 6,498 passed, 1 skipped, 0 failed. `npm run verify:push`
green on all five steps (handoff, knowledge, unit, seam, release).
**Risk:** the reranking is behavioural and broad — it changes position one on
most live plans. The amended tests pin the direction, not just the absence of a
crash. **Next:** the `ask` authoring gap (114 decisions), then the scoring
audit's `blocks`-is-inert finding.

## ADDED 2026-09-18 (fourth entry, same day) — a parser corpus, the venue verdict ratchet, and three audit fixes

Three parallel tracks, plus the fixes the audit turned up.

**PARSER — there is a corpus now.** `src/lib/__tests__/fixtures/parseCorpus.mjs`
holds **67 entries**, each with the text, its provenance, and only the fields
that sentence actually supports. `parseCorpusGolden.test.js` diffs the full
parse and names the sentence and field on failure. Meta tests keep the corpus
honest: `PARSER_FIELDS` must equal the parser's real output keys, and no entry
may expect a field that does not exist (a typo would otherwise pass forever
comparing `undefined`). A host sentence is never spent once again.

**It records EIGHT suspected parser defects** as `suspect` notes, asserting
today's behavior so the suite stays honest about what ships. Not fixed — the
owner's call, and several are load-bearing:

| | |
|---|---|
| `"4400 Massachusetts Avenue NW, Washington DC"` | → venueCity `"Massachusetts Avenue NW"`, venueState `"WA"` (Washington the STATE) |
| `"Saturday"` | routes the TYPE to Day Party — "day" inside "Saturday" |
| a bare weekday | never parses as a date at all |
| `"this winter"` | resolves to January 2026 — eight months past |
| a bare `"party"` | commits to Birthday |
| `"Birthday brunch"` | comes back Get-Together |
| DC quadrants (`SE`/`NW`) | stripped from the address — and current behavior is blessed by an existing test, so fixing it moves that too |
| the owner's own seed | parses `isDestination: true` on a 5-person watch party at a street address, blending the budget band |

**VENUE — the verdict ratchet, relocated and widened.** `venueSourceProof` gains
**PART D**: scans every file under `src/lib` and `hostv2/src` that calls
`venueFor(` (20 today) instead of a hand-listed set, resolves venue bindings per
file, strips block AND line comments, non-global regexes. Red-proofed twice.
**PART B2** adds the address-only fixtures PART B never had — precisely why the
earlier bug got through — across four readers including `phaseProgress`, which
carries the board's production layer.

**AUDIT FIXES — 1, 2 and 3 of eleven findings.** The other eight are reported
and untouched, pending a call.

1. **`surfaceRegistry` answered "does this event have a venue?" from
   `venueFor(event).name`** — an eighth copy. The Ryan Way event was told *"No
   venue booked yet — Book your venue"* and routed to Vendors, while the blocker
   engine correctly said nothing. Same event, same day, opposite answers.
   Fixed by **publishing** the verdict rather than patching the caller:
   `venueFor` now returns **`addressSettled`** (a name OR a street, never a bare
   town). Three places had each built that answer themselves; one was wrong.
   `LodgingCockpit`'s hand-built copy now has somewhere to read from.
2. **The "add the address" row never looked at the address** — it tested the
   venue NAME for a digit. Venue "Backyard", add "12 Elm St", save, and the row
   re-renders *"add the address for backyard"*. Answerable an unlimited number
   of times.
3. **Confirming the DATE stamped `startTimeSource: 'host'`** onto an hour the
   app derived and the host had never seen. That flag is the **outward gate** —
   `eventWhen` releases the hour to the guest invite on it, `vendorBrief` nulls
   every run-of-show clock without it. A tap about the *date* published our
   guessed hour (tier 3, "most events of this kind", `grounded:false`) to her
   guests and her caterer, as hers. The hour has its own confirmation one row
   below, under copy promising her in writing: *"We set this one, not you… your
   invite and your vendor briefs won't name an hour until you say it's right."*
   This broke that promise from a different button — and because the time block
   only renders once a date exists, the stamp fired on the very tap that
   revealed the time UI, so the disclosure and the "that's right" button never
   rendered at all. It did not skip her confirmation; it removed the chance to
   give one. Deleted.

**A number corrected:** the pre-change baseline was **6,302**, not the 6,295 I
had been repeating — that figure was measured before a concurrent change landed.

**Verified:** `verify:push` all 5 pass — jest **448 suites / 6,395 passed**;
`ryanWay.spec.mjs` 3/3 at mobile-390 after the change.

**Known gap, stated rather than papered over:** finding 3's regression guard is
a unit test plus a source assertion that the handler does not re-acquire the
write. jest cannot execute hostv2, so the host-visible claim — confirming a date
does not publish the hour to the invite — wants an e2e it does not yet have.

## FIXED 2026-09-18 (third entry, same day) — testing the venue fix found it incomplete: the verdict had SIX copies

Asked to test the Ryan Way seed against the venue fix. The test found the fix
incomplete, the only way it could be found — by driving the real screens.

**The reveal stopped asking. The plan did not:**

    | venueaddress
    | Where is it happening?
    | Everything hangs off the venue — invites, the rain backup, seats and space.

The first walk reported **11/11 PASS** over that output, because it grepped
`"Where is the event"` — the reveal engine's wording — and this card says
something else. A check that names one surface proves one surface.

**Six copies of "is the venue set?", not the two fixed in the second entry:**

| # | Where | Shape | |
|---|---|---|---|
| 1 | `venueFor.isSet` ignoring its own `address` | — | fixed, entry 2 |
| 2 | `assembleRevealEngines` | `!!vf.name` | fixed, entry 2 |
| 3 | `HostShellV2:10114` "Where is it happening?" card | `!vf.name` | **this entry** |
| 4 | `HostShellV2:9984` blocker-card `venueSet` | `!!vf.name` | **this entry** |
| 5 | `HostShellV2:14917` foundations "Add the location" | `!!vf.name` | **this entry** |
| 6 | `phaseProgress` | delegates via `eventLocationStatus` | already correct |

**#3 is the one worth carrying forward.** That card was only ever hidden
because `venueBlockerShown` was true. Standing the BLOCKER down un-suppressed
it — so the previous fix **moved** the ask rather than ending it, and a host
with "8100 Ryan Way" on file was still being told to "Add the location".

**Two guards, deliberately different shapes.**

*Source text* — a verdict ratchet in `creationAddressCarries.test.js`: no line
may re-derive the verdict by negating `vf.name`. It resolves which variables
actually hold a `venueFor` result per file (the first version matched
`event.vendors.filter(v => v && v.name)` — a VENDOR), strips block comments so
the repo's own explanatory comments do not trip the scanner that reads them,
and drops the `/g` flag, whose `lastIndex` made the first canary return
true/false/true/false down the assertion list. Negation only: `vf.name ?` and
`vf.name &&` are usually legitimate, and a ratchet that fires on correct code
gets deleted.

*Behavior* — `hostv2/e2e/ryanWay.spec.mjs`, where it can actually execute.
`textGateRatchet` caught the source-text guard growing the hostv2 text-gate
count and said exactly what to do; the baseline moves 36 -> 37 with the stated
reason, and the behavior claim went to e2e rather than being smuggled into a
text gate. **jest cannot run hostv2** — that is what that ratchet exists to
say, and it was right.

The e2e checks ALL SIX ask wordings and carries a **negative control**: an
event with no location at all must still be asked. Every other assertion is an
absence, and absences pass for the wrong reason all the time.

**Verified:** `npm run verify:push` all 5 pass — jest 446 suites / 6,295
passed; `ryanWay.spec.mjs` 3/3 at mobile-390.

## FIXED 2026-09-18 (second entry, same day) — one host sentence, two defects: "Big game" misrouted, and a street address the app stored and could not see

**The seed**, typed live by the host:

    Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.

Both defects were reproduced in the RENDERED app before any code changed, and
re-verified there after. Neither was visible to 446 green suites.

**1. "Big game" came back a Day Party.** The sports pattern required `the big
game`. A sentence that STARTS with "Big game" — which is how a sentence
naturally starts — fell through to the generic party catch. That is the exact
fall-through the block was written to close on 2026-09-13, missed by one
article. Now `\bbig\s+game\b(?!\s+hunt)`, with hunting excluded.

**2. The street was stored and still invisible.** `venueAddress: '8100 Ryan
Way'` was written correctly at creation, and the plan went on asking *"Where is
the event? Everything depends on venue."* Two causes, the same shape:

- `venueFor` computed `address` fifteen lines above `isSet` and never consulted
  it — `isHome ? (city || name) : name`. A host who gives a street and never
  names a venue (the normal case for a house party) had no venue at all.
- Fixing that was **not sufficient**. `assembleRevealEngines` kept a private
  `!!vf.name` copy of the rule, three lines below a comment claiming it had
  adopted the single reader, so the blocker survived the fix. It reads
  `vf.isSet` now — and `taskEngine.js:44` and `playbooks/index.js:2792`, which
  already read `isSet`, got the fix for free. That contrast is the argument
  against a private copy, visible in one file.

The 2026-08-14 board ruling (a town and an address answer DIFFERENT questions)
is intact: `address` is street-gated, so a bare city can never produce one, and
the new guards assert a city alone still raises the blocker at both the reader
and the surface.

**3. Silence read as dropped.** The creation review confirmed the venue NAME and
nothing confirmed the street, so the host saw only a town chip. The address had
been heard and stored — she just had no way to know. A dead address chip now
shows it back, under the same rules as the venue chip beside it.

**Verified in the running app** at 390px, driven through creation: routes to
Watch Party, review echoes "8100 Ryan Way", the record carries venueAddress and
startTime 1:00 PM (`startTimeSource: 'host'`), and "Where is the event?" is gone
from the reveal. `npm run verify:push` all 5 pass; jest 446 suites / 6,290
passed (16 new).

**Worth recording.** Mid-investigation I reported a startTime bug that did not
exist: my probe regexed the first match across ALL localStorage keys and picked
up another record's `15:00`. Reading the actual event showed `1:00 PM`. The
measurement was wrong, not the code — and I reported it before checking.

## FIXED 2026-09-18 — the pre-push routine did not run the thing that deploys, and two deploys died unnoticed

**What happened, measured.** Deploy runs 310 (`880c666`, the cook-lever
refactor) and 311 (`8928ef9`, the review-board fixes) both failed at "Build
release artifact". Run 312 (`e8bd9a1`) is the first green one. Production
served `ef787f2` from 00:34 to 03:05 UTC — two and a half hours, two commits
stale — and **both failing commits were reported to the owner as verified.**

**Why nothing caught it.** The break was `const` between two `import`
statements in `playbooks/index.js`. react-scripts treats `import/first` as a
build ERROR, not a lint warning, so the CRA build refuses to compile. jest,
`gate:hostv2` and `gate:knowledge` were all green on both commits — none of
them builds. The pre-push routine in use was exactly those three.

**The honest finding is narrower than "add a gate".** `verify:all` already
had `gate:cra`, and `gate:cra` *does* catch this — verified by reintroducing
the exact defect and running it: exit 1, "CRA production build FAILED to
compile. This is a real build error, not a lint warning." So the coverage
existed. **Nobody ran it**, because `verify:all` is ~20 minutes and there was
no shorter thing to run.

**So two changes, not one.**

1. `verify:all` step 9 is now **`npm run release`** with `CI: ''`, replacing
   the bare `hostv2 production build` step *which it contains*. `release` =
   `sync:hostv2` (hostv2's own build — parity check, then vite — then copy
   `dist/` into `public/hostv2/`) `&&` the CRA build. That middle copy is the
   one step nothing local had ever run, and it is the only thing standing
   between a green hostv2 build and a site with no hostv2 in it. `CI: ''`
   because the deploy sets exactly that, for exactly the same reason — a
   preflight that builds under different rules is not a preflight.

2. **`npm run verify:push`** — handoff + knowledge + jest + hostv2 seam +
   release. The fast routine that can actually be run every time. The
   release step measured **41.2s**.

`public/hostv2/` is gitignored (`.gitignore:62`), so the release step leaves
the tracked tree clean — checked with `git status`, not assumed.

`docs/claude-skills/09_CLAUDE_CODE_EXECUTION_DISCIPLINE.md` carried a generic
"Run or recommend: npm run build / npm run lint / npm run test" list, none of
which is a real command in this repo. It now names the real ones and says why
the release step is not optional.

**Worth carrying forward more than the fix.** "Verified: jest 445 suites /
6,274 passed" was a TRUE statement that did not mean the change shipped. The
word "verified" was allowed to imply a set of checks it did not cover. Name
which checks ran. And note the failure ORDER: the build step dies first, so
the demo-artifact safety scan never ran on either commit — a skipped safety
check and a passing one look identical in a log nobody read.

## FIXED 2026-09-17 (seventh entry, same day) — the readiness pills were dead controls on the phone: the panel holding them had no opener

**A Playwright click on the board's "Checklist" pill at 390x844 failed with
`<section role="main"> intercepts pointer events`, and that was not a harness
artifact.** Measured in Chromium against the built bundle, a real event seeded:

| Measurement | Before |
|---|---|
| `.slidepanel` computed height, phone | **0px** (`max-height:0`, `overflow:hidden`) |
| `.slidepanel-inner` content height, phone | **924px** |
| Checklist pill offset inside that panel | **758px** |
| `.tile-a` (the panel's only opener) at 390px | **`display:none`** |
| Visible openers for the panel at 390px | **0** |

Three defects, stacked, all of them shipping:

1. **No opener on the phone.** `handledOpen` has exactly two setters and both
   live inside `.tile-a`, which `styles.css:695` + `:954` set
   `display:none !important` in elegant mode — the DEFAULT hero since
   2026-07-21. So the panel carrying the four readiness pillars (Calls to make
   / People / Paperwork / Checklist) plus the engine's handled facts could
   never be opened by a thumb at all. The pills rendered, kept layout boxes,
   and painted nothing; the hit test at their coordinates returned the nearest
   painted ancestor, which is the `<section role="main">` Playwright named.
2. **Clipped in half even when open.** `.slidepanel.open{max-height:420px}`
   against 924px of content (762px at desktop) with no scroller — 504px of a
   panel the host DID open, including the Checklist and People pills, sat
   outside the window. Never phone-only.
3. **Hidden from the eye and from nothing else.** `overflow:hidden` leaves
   every control inside a closed panel in the tab order and the a11y tree:
   `.focus()` on the Checklist pill succeeded and scrolled the board to a
   blank spot.

**Fixed:** one `countedCaret()` helper renders the "what's counted" control in
two homes that are exact complements — `.tile-a`'s label at desktop-rail, the
elegant `.bento-head` everywhere else (`styles.css:5395` hides that header at
exactly the breakpoint `:5378` un-hides the tile), so every viewport has one
visible opener and never two. The panel animates `grid-template-rows` 0fr→1fr
to its true height instead of a 420px magic number, with padding on the open
state so the closed box is still exactly 0. It carries `inert` while closed.
The caret joins the ≤480px real-height tap floor (44px, transparent padding —
the type size does not change), because a pseudo-element expander is credited
only where a hit test can reach it and this control sits below the fold.

**Verified in the browser, not only in tests:** at 390x844, 768x1024 and
1440x900 — one visible opener each, panel opens to full height (924/762px,
nothing clipped), an ordinary un-forced click on the Checklist pill opens the
"Your checklist" sheet. e2e: `mobileTapFloor` + `tapTargets` + `a11yFloor`
15/15, then `boardMatrix` + `heroVoid` + `responsiveBaseline` + `foldAtTheFoot`
+ `watchPartyMajorEvent` 192 passed / 144 skipped / 0 failed.

**The trap worth carrying forward:** `boardMatrix.spec.mjs:396` already
described this exact symptom — "a closed `.slidepanel` keeps its children's
rects while `max-height:0` hides them" — and taught the harness to skip those
elements instead of asking why a panel nobody could open was rendering
controls. A workaround in a test is a defect report nobody filed.

## ADDED 2026-09-17 (sixth entry, same day) — Watch Party's knowledge became governed, and the review board found what green tests missed

**Corpus 16 -> 28 records, 15 -> 27 lineage heads, still exactly one superseded.**
Twelve Watch Party claims moved from code-authored to governed, so a price or a
portion can now be corrected without a code change. Nine cost claims published
first (`p_wings` `p_chips` `p_chili` `p_pizza_sliders` `p_dessert` `p_drinks`
`p_ice` `p_tableware` `p_cleanup`, all `.costProvenance`); three quantity claims
followed once they earned `cited`. Records are authored by `claude` and reviewed
and published by `admin` — two identities, deliberately, so the audit trail does
not collapse who wrote a record into who approved it.

**Six candidates were withheld, and the reasons are CORPUS invariants, not the
publish gates.** All fifteen passed ownership, type, evidence, grounding-honesty
and commercial-source. What stopped the rest lives in the test suite:
`p_ballparksnacks` and `p_pimms_strawberries` are `whenChoice`-gated on
`major_event`, so they are invisible in a baseline event, and `wave0HostProof`
asserts every governed line reaches a host; `p_serveware` is absent from baseline
food-plan output for the same reason; and three `.provenance` slots read
`researched` where the corpus requires `cited`. **The `knowledge.note` warning
about whenChoice-gated content, which an earlier pass in this session dismissed
as unverified, was correct.**

**THE RESEARCH PASS WAS NEVER BLOCKED.** It was reported blocked after `WebFetch`
returned EGRESS_BLOCKED for every research domain — including
`webstaurantstore.com`, a host already in this repo's own registry. That was a
premature call: `WebFetch` goes through the environment's network allowlist, but
**MCP connector traffic travels through Anthropic's servers and is not subject to
it**. The Exa tools fetched the exact blocked page on the first try. There is no
allowlist to maintain and no reason to widen the environment's network access for
research. Written into `RESEARCH_DOCTRINE.md` section 6 with both of the day's
source defects as worked examples.

**Four citation defects, all the same shape — a claim citing a source that backs
no figure in it.** `watchParty p_chips` cited `cheese-sliced-2026` (Kraft Singles,
block cheddar) with no cheese figure in the claim. Auditing that one source across
the seven other playbooks citing it found seven exact citations and one more
mismatch: `holidayParty p_veg_option` carried TWO sources backing nothing.
Removing them alone pushed the uncorroborated-claims ratchet UP, which is the
suite correctly refusing to accept a shorter list as a better one — so a publisher
that actually prices the item was researched and added instead.

**Three quantity claims were re-researched to `cited`, and two of them were
wrong.** `p_drinks` described a flat ~1 drink/guest/hour; the convention four
publishers actually state is 2 in the first hour then 1 an hour, so 4 covers a
THREE-hour game and a four-hour one is 5. `p_wings` turned out to depend entirely
on a conditional nobody had written down: 10-12 split pieces when wings are the
main food, 4-6 when they sit beside other mains — and this playbook serves chips,
chili, pizza and dessert, so 1 lb/guest is the generous reading, not the floor.
Values did not move; what changed is that each claim now carries the conditional
that makes its number mean anything.

**`cook_method`: the playbooks never asked how the protein gets cooked.** `menu`
asks what, `potluck` and `food_style` ask who, and across all 40 playbooks nothing
asked how — so `t_cook` fired one identical "Cook wings + hot food" whether the
host was grilling outside in February, holding chili since noon, or collecting a
pizza. New decision at T-5d with five answers, gated to the menus that actually
have a hot cook. Six method-specific tasks, a `copyByAnswer` branch on `t_cook`
and its run-of-show twin, and two grill risks this playbook never had because
grilling was never contemplated. It blocks `cook_schedule`, NOT `food`: the method
does not change the shopping list, and claiming it did would have demanded a cost
model with invented per-method multipliers.

**THE REVIEW BOARD FOUND TEN DEFECTS THAT 442 GREEN SUITES DID NOT.** The worst
was a regression shipped green: the new carbon-monoxide mitigation put the word
"charcoal" into `playbook.risks`, and `playbookInfraPrompts()` greps that whole
authored blob with no answer gate — so EVERY Watch Party began emitting grill and
child safety prompts and "...+ open flame + alcohol service + kids present in your
plan". Fixed at the reader: the haystack now filters through `choiceShown`, the
same gate risks, tasks, purchases and schedule rows already read. That reader was
simply missed when risks were gated four days earlier.

The other nine were contradictions and overclaims in the same day's work — a
run-of-show twin telling a slow-cooker host to start at T0-1:30 against a
checklist saying T0-5:00; `p_drinks.note` still using the framing its own new
provenance calls an understatement; `p_wings.note` saying 8-12 pieces beside a
claim saying 10-12; a provenance claiming "four INDEPENDENT publishers" when the
primary one sells bar service; `p_ice` claiming two publishers agree on 1.5 lb
when only one does; a source claim quoting a publisher its own `org` did not name,
breaking a rule added to the doctrine in the same commit range; and a
"corroborating" lasagna source whose $4.60/lb actually sits BELOW the band it was
added to support. All fixed, and the disagreement stated rather than smoothed.

**Two numbers I invented and then removed.** "Back the cook up by 30 minutes in
cold weather" had no source — replaced with margin and no figure. And the
slow-cooker start time was right but under-argued: USDA FSIS states a slow cooker
may take SEVERAL HOURS to reach a bacteria-killing temperature and that meat must
be thawed first, which makes a late start a safety problem rather than a timing
one. Registered as `fsis-slow-cooker`.

**The architectural gap, stated plainly.** Decisions, tasks and risks CANNOT enter
the governance transport. The backend tracks research gaps by `playbook_type` +
`field_path`, and only purchase paths (`.provenance`, `.costProvenance`,
`unitCostRange`) are recognised and consumed. A governed record on a task would
publish and never be read — the exact "authoritative and unread" defect that
withdrew `Crawfish Boil p_cups`. So the cook-method grounding went where the
architecture actually consumes it: the axis source registries. Extending
governance to tasks and risks is real work, unscoped, not started.

**Files:** `src/lib/knowledge/publishedKcrs.json`, `publishedKnowledge.json`,
`quantityProvenance.js`, `costProvenance.js`, `foodSafetyContext.js`,
`RESEARCH_DOCTRINE.md`, `src/lib/playbooks/index.js`,
`src/lib/playbooks/data/watchParty.js` (1.4.2 -> 1.6.2),
`data/holidayParty.js` (1.0.0 -> 1.0.2), plus five ratchet/invariant updates.
**Verified:** jest 442 suites / 6,242 passed; `gate:hostv2` no drift;
`gate:knowledge` up to date; CI green on `54f7420`, `c3471c8`, `a02fc59`.

## ADDED 2026-09-17 (fifth entry, same day) — every format now has a task the others never see

Closed the additive task pass across the three remaining formats. The research
pattern held everywhere, and it is the finding worth keeping: **the per-sport
differentiator is TIMING, never food.**

- **March Madness** — brackets **LOCK at the first tip** and cannot be changed
  (NCAA/ESPN), so "we'll do brackets at the party" has already failed if the
  party starts later; and the opening rounds run **up to eight games at once**,
  so one TV guarantees missing finishes. (Not generalised to World Cup/Olympics
  — their simultaneity wasn't researched.)
- **Continuous coverage** — the format *defined* by having no break. The
  playbook already gates `t_halftime` off for it, which is right, and also left
  those hosts with **no mid-event guidance at all**. Documented Wimbledon advice
  lands on the same point: stock enough glassware that nobody's at the sink
  mid-match. Plus whites on the invite (same invite-time shape as Derby hats).
- **Broadcast** — no ball to watch, so what MAKES it a party must be ready before
  the broadcast: board up before the first pick, ballots out before the first
  award. Both supply timing that existing purchases (`p_draftboard`, `p_ballot`)
  always implied but never stated.

**Measured end state**, against the matrix taken before any of this was written:

| | Before | After |
|---|---|---|
| Tasks varying across 17 events | **1** (`t_halftime`, by REMOVAL) | **11** |
| Of those, additive | **0** | **10** |
| Super Bowl / single-game events | 8 | **8 — unmoved** |

The default path never moved: differentiate the events that differ, leave the
common case exactly as it was. Still unpriced throughout, so KCR stays out of
scope — a hat-contest prize or printed sheets would not be, and were left out.

Commit `adfc65f`. Jest 442/442, 6241 passed, zero failures, no drift.

## ADDED 2026-09-17 (fourth entry, same day) — the catch-all learns which sport, and the list's own cause moves first

**"Which sport?" (`reg_sport`).** `Regular season game / other` is the catch-all
AND the likeliest answer a host picks, yet it carried no content — so the plan
fell back to the football default. Correct for an NFL Sunday, wrong for
everything else: an NBA Tuesday and an MLB Saturday both got "Kickoff" and a
halftime task for a sport with innings.

Asked only for the catch-all (named events already know their sport), defaulting
to Football (NFL) so the unanswered path is byte-identical — verified: the
unanswered catch-all and Super Bowl still read "Kickoff"/"Halftime refresh".

It drives **wording, never gating**. Every sport has a mid-event break; it just
isn't called halftime in all of them, so the honest fix is naming it rather than
hiding the task: MLB first pitch / seventh-inning stretch · NHL puck drop /
first intermission · NBA+CBB tip-off / halftime · Soccer kick-off / half-time.
Verified MLB emits "First pitch" + "Seventh-inning stretch" and **no** "Halftime
refresh"; NHL emits "Puck drop" + "First intermission". No food invented — a
sport-specific menu needs real research and KCR.

**"Your choices" moved to the head of the spread sheet's section list.** It sat
third, under Dietary needs, while the decisions inside it are what PRODUCE the
list and its totals: `major_event` is `when:'T-10d'` (earliest), `weight:'high'`,
`blocks:['food','program']`, and its own `priorityBasis` says *"answering it
first means everything else builds on the right assumption instead of a generic
default"*. The sheet was ordering its own cause as a detail.

Commit `f395e67`. Jest **442/442, 6241 passed** — up one, because a parameterised
wire-proof enumerated the new decision and it passed. No drift.

**NOT DONE, deliberately — open host call:** the money/totals block still sits
above the whole section list, so the host still sees "$85–195 · sized for 4–6"
before the choice that determines it. Host flagged this ("This needs to be pushed
to the top of choices"); the row reorder above addresses the section list, but
demoting the sheet's headline summary is a design ruling, not a reorder.

## ADDED 2026-09-17 (third entry, same day) — the checklist finally says something sport-specific

The host: *"These checklists feel baked. Should have even more sport event
related."* Measured before writing anything, and he was right in a way worth
recording: **7 of 8 tasks were identical across all 17 `major_event` options**,
and the only one that varied (`t_halftime`) varied by REMOVAL. Purchases carry
8+ event-specific items and heartMoments ~12 overrides; the checklist had never
had a single task ADDED for a sport.

**The research finding that shaped the fix: the real per-sport difference is
TIMING and INVITE CONTENT, not food.** A generic checklist structurally cannot
say "tell them the main card time" or "put hats on the invite" — and no amount
of menu differentiation reaches either.

Four tasks, all sourced, all gated:
- **Combat** — tell guests the **MAIN CARD** time, not the broadcast start (a
  UFC/boxing card runs early prelims / prelims / main card ~4h apart, so "come
  for the fight" lands people at the wrong end of the night); and sign in and
  actually **play** the stream ~30 min ahead, distinct from `t_stream`'s T-3d
  "does this channel work at all". (ufc.com, Paramount+ 2026 schedule)
- **Kentucky Derby** — gated to the EVENT, not the racing format, because these
  are Derby traditions and not Daytona's: put the **dress code on the invite**
  (hats are the documented expectation; a guest told on the day has already
  dressed — the timing is the point), and **set up the pool before post time**
  (the Derby is ~2 minutes at the end of a 14-race day). (kentuckyderby.com,
  USRacing, Covers)

Measured after: Derby **8 → 10**, UFC/Boxing **7 → 9**, Super Bowl default
**unchanged at 8**. Each gate verified to fire for exactly its event.

All four **unpriced on purpose** — task copy has never needed KCR and none
assert a cost. A hat-contest prize and printed betting sheets are real
traditions left out for exactly that reason: priced claims belong in KCR.

Commit `f136680`. Jest 442/442, zero failures, no drift.

**Trap for the next session:** `knowledge.note` is a single 40KB single-quoted
JS string. An append containing `'quoted phrases'` or a bare apostrophe
(`host's`) terminates it early and breaks the hostv2 build. Use double quotes
inside, escape apostrophes, and read the compiler error rather than guessing —
patching the assumed cause cost a cycle here.

**AUDITED THIS PASS — the governance transport is empty for Watch Party.**
Asked to confirm the playbooks and backend were updated properly:
- The **backend consumes neither** `publishedKcrs.json` nor
  `publishedKnowledge.json`. That transport is a FRONTEND build artifact
  (operator exports from the admin console → `bake-published-knowledge.mjs` →
  bundled). No backend update is owed by any playbook change, and no backend
  code was touched this session.
- **`publishedKcrs.json` contains ZERO Watch Party entries.** Its 16 records
  cover 12 other playbooks and are all dated **2026-08-01/02**. Watch Party has
  now shipped EIGHT content passes — including two claims that genuinely earned
  `tier:'researched'` with sources (Wimbledon Pimm's kit, World Series ballpark
  snacks) — and none has ever entered the corpus.
- **CI cannot catch this.** `gate:knowledge --check` verifies the snapshot
  matches its input file; it reports `[OK] snapshot is up to date` because the
  August records bake correctly. It has no opinion on whether a playbook's
  researched claims were ever SUBMITTED — which is why the gap survived eight
  passes of being "disclosed".
- Closing it requires a **human export from the admin console** — there is
  deliberately no credential in the build path. Host action, not an agent one.

## ADDED 2026-09-17 (second entry, same day) — a task may not name food the host removed

Same live event, later in the session. The host removed chili from the shopping
list; the checklist went on telling them to shop for it and make it.

`event.foodSkip` already works — it drops the item, its cost, and its per-item
buy-task. What it could not reach were four hand-written labels with the menu
baked into their text (`t_fresh_shop`, `t_nonperish_shop`, `t_prep`, and both
purchasing-schedule rows). Two surfaces disagreeing about one fact, with the one
the host actually edited losing — the UX_08 source-of-truth failure.

Fixed by deleting the duplication, not patching the strings: the shopping tasks
already deep-link to the list, so they now name the act and defer to it
("Shop the non-perishables on your list"). `t_prep` goes generic — less vivid,
always true. Commit `170b01c`, version → **1.4.2**, Jest 442/442.

**Disclosed, not fixed:** `t_cook` and its run-of-show twin still say "Cook wings
+ hot food" — same exposure, kept deliberately because the back-timed cook
schedule pivots on wings. A host decision, not a silent change.

**Measured this pass, NOT addressed — the biggest open content gap in this
playbook.** Checklist tasks are its least differentiated surface by a wide
margin: **7 of 8 tasks are identical across all 17 `major_event` options**, and
the only one that varies (`t_halftime`) varies by REMOVAL. Purchases carry 8+
event-specific items and heartMoments ~12 overrides; tasks have never had an
additive differentiation pass. That is precisely why the checklist reads the
same for a Derby party and a UFC card ("these checklists feel baked" — host).

Opening research says the real per-sport difference is **timing and invite
content, not food** — which a generic checklist structurally cannot express:
- **Combat:** a UFC card runs early prelims / prelims / main card ~4 hours
  apart, so the host must tell guests the MAIN CARD time, not the broadcast
  start. (UFC.com, Paramount+)
- **Racing:** the Derby is two minutes at the end of a **14-race** day (post
  time 6:57pm ET 2026); hats belong on the INVITATION, and the betting pool and
  hat contest need setup before post time. (KentuckyDerby.com, USRacing)

Not built. Two scope questions are open for the host: how wide to go (combat +
racing are researched and ready), and whether to stay strictly unpriced so the
KCR pipeline stays out of scope (task copy has not needed it in prior passes;
anything priced would).

## ADDED 2026-09-17 — driven live from a real event: the parser starts hearing, the app stops guessing

The host seeded a real watch party (Sunday 2026-09-20, 1:00 PM, 8100 Ryan Way,
Greenbelt MD, 5 guests, cooking everything) and worked the actual screens.
Every fix below started as something visibly wrong on them.

**The time bomb, fixed first — it made every other result unreadable.**
`recordDedupStaysLive.test.js` pinned `AS_OF` to 2026-08-07 while `eventPlan(ev)`
— which takes no as-of and reads the real clock — was not pinned at all. Fixture
dates are `AS_OF + horizon`, so the two clocks agreed on exactly ONE day: the day
the test was written. Forty-one days on, the `@60d` bridal shower was 19 real
days out to `eventPlan` and still 60 to `deriveEventPhaseProgress`; they raised
different action sets and the double-billing assertion tripped. **Green in CI
2026-09-14, red 2026-09-17, no code change in between** — and it would have
failed every run from then on, reddening `checks.yml` for any push regardless of
content. Proven pre-existing by stashing the working tree and re-running on clean
HEAD. `AS_OF` now anchors to today, so both clocks sit on the same day.

**Parser — it discarded the two things the host was most specific about.**
- Reads a spoken clock now ("Sunday at 1pm", "6:30pm", "morning at 10", "19:30"),
  with `startTimeBasis` ('said-exact' | 'said-with-bucket' | 'said-hour-only') —
  the same three-state honesty `overnightBasis`/`destinationBasis` already carry.
  This does NOT breach the bucket-only rule directly above it: that rule exists
  so the app never INVENTS an hour (the 15:00 bug that reached a caterer).
  `startTime.js`'s own tier 2 is THE HOST'S OWN WORD, and `startTimeSource:'host'`
  exists to mark exactly this. Counts, budgets and dates still yield no time.
- **A town behind a comma phrase was being lost entirely** — the loose "City, ST"
  scanner advanced `lastIndex` past a FAILED candidate's state half, so
  "…, 8100 Ryan Way, Greenbelt, MD" tried "Ryan Way, Greenbelt", failed the state
  gate correctly, then resumed at ", MD" with no city in front of it. Greenbelt
  vanished, taking weather, the venue check and the home comparison with it. Not
  an address bug — ANY comma phrase in front of the town did this.
- The street line now fills `venueAddress`, which already feeds the invite and
  the rain note and had never once been filled from what the host typed.
  `parseVenueLocation` untouched (refusing digits is right for a city resolver);
  the new extractor requires a real street suffix so a bare number can't pose as
  an address.

**Destination — stop claiming she said what she did not.** The chip said
"· heard" whenever the host hadn't overridden it, including when the flag was a
pure guess; `destinationBasis` had carried the three cases since it was written
and the shell read it **zero times** — the same defect, same chip row, that the
overnight chip was fixed for on 2026-08-06. And with no home city a bare resolved
city fired `isDestination` by default, so a local party typed as "in Greenbelt,
MD" arrived pre-committed to lodging, transport and a travel-led budget. That
guess is now unanswered (the third state the overnight chip established), and the
commit path omits the field rather than writing null — matching the "absent means
not told" rule on the very next line.

**Voice.** Web Speech input already existed and was well built; `onerror` fired
one generic toast for every code. A host who denied the mic was told "try again",
which re-prompts nothing. Branches now, and `'aborted'` (her own tap to stop) is
silent rather than reported as a failure.

**Controls that didn't move when the host did.** "Done" on Your choices and
"Close" on the spread sheet looked identical whether nothing or everything was
settled. Both now read signals already on screen. UX_02 sets the ceiling: green
means Complete, so it lands only when everything is settled AND bought; partial
progress gets steel, never a completion the host hasn't reached.

Files: `src/lib/__tests__/recordDedupStaysLive.test.js`,
`src/lib/smartParseEvent.js`, `hostv2/src/HostShellV2.jsx`. Full Jest **442/442
suites, 6240 passed, 1 pre-existing skip, ZERO failures** — the first fully green
run of the session. `sync:hostv2`/`gate:hostv2` clean. Commit `7a7e936`.

**Open, not built** (raised by the host, deliberately left for a decision):
`'Regular season game / other'` is the most common watch party and the one
`major_event` option that asks nothing — an NBA Tuesday still gets "Kickoff" and
"Halftime". The proposed shape is a gated "Which sport?" follow-on (the same
mechanism `tourney_span` uses), earning its keep on run-of-show vocabulary alone
— halftime vs quarters vs innings vs periods is plain fact, not researched
content. Sport-specific food/traditions would need the real KCR pipeline.
Also open: pushing "Your choices" above the totals on the spread sheet — the
playbook's own `priorityBasis` says `major_event` should be answered first
("everything else builds on the right assumption"), yet it renders below four
blocks of totals and price caveats.

## ADDED 2026-09-13 (eighth session update, same day) — review-board audit fixes + real e2e coverage

Host directive: "Ask review board what we are missing," then "Yes then the
fixes" — build real Playwright e2e coverage first, then the 3 content fixes
the board flagged.

**The audit, measured not assumed:** a temporary script (`playbooks/data/watchParty.js`'s
own module, called directly, then deleted) built a coverage matrix across
all 16 `major_event` options — `{opt, extraPurchases, heartOverrides,
rosReworded}` — the same category of format-mate-inconsistency bug found and
fixed repeatedly this session (Daytona/Derby, Masters/Wimbledon, World Cup).
It found:
- **World Series: 0/4 heartMoment overrides**, despite having a real
  purchase (ballpark snacks) — every other event with a purchase had at
  least one heartMoment variant tied to it.
- **World Series' run-of-show was never reworded** across its 4 timed
  program rows, unlike every sibling event that got the per-event
  copyByAnswer treatment.
- **Wimbledon: 2/4 heartMoment overrides vs. Masters' 3/4** — missing the
  "food ready before kickoff" variant every other food-purchasing event has.

**Fixes**, all in `src/lib/playbooks/data/watchParty.js`:
- World Series heartMoments: "The ballpark snacks are out and everyone's
  settled in well before the first pitch" (food-ready base) and a walk-off
  variant (big-play base).
- World Series run-of-show reworded at all 4 beats: first pitch, 7th-inning
  stretch, middle innings, final outs.
- Wimbledon's missing food-ready variant: "The strawberries and Pimm's are
  out and everyone's settled in well before the first serve."
- `version`/`governanceVersion` bumped `1.4.0` → `1.4.1`.

**New: `hostv2/e2e/watchPartyMajorEvent.spec.mjs`** — the first e2e coverage
for the entire major_event differentiation system, driven through the
rendered screen rather than direct engine calls. It guards the three real,
host-visible bugs found earlier this session purely by reading engine output
by hand (ungated risks leaking onto every event, an impossible "halftime"
heartMoment on no-halftime formats, a missing purchase from a decision
collision) — none of which had a permanent regression test before this — plus
a click-through wiring proof that a pick made on the decision board itself
(not seeded data) actually reaches the spread. Building it surfaced real
selector bugs of its own (fixed in the same commit, not the app): the spread
sheet's item names sit behind two layers of disclosure ("The list", then each
category's own `.fg-label` row), the checklist sometimes needs an explicit
"Draft my checklist from the playbook" tap before any task renders, and the
major_event decision card is a `[data-flip="major_event"]` row, not an
`<article>`.

**Sandbox note**: this environment's pre-installed Playwright browser
revision doesn't match what `playwright.config.mjs` expects, and this
sandbox's background-task runner kills a command instantly if any command
in the chain (e.g. a `pkill` with nothing to match) exits non-zero — a local,
uncommitted `hostv2/playwright.sandbox.config.mjs` works around the browser
mismatch (never touches the checked-in config); verified 6/6 passing on the
`desktop` project only, not the full 7-project matrix.

Files: `src/lib/playbooks/data/watchParty.js`,
`hostv2/e2e/watchPartyMajorEvent.spec.mjs`. Full Jest **442/442 suites,
6240/6241 tests** (1 pre-existing skip, no ratchet change). `sync:hostv2`/
`gate:hostv2` clean. Commit `80bb7bd`.

**Postscript, same day — real CI (`checks.yml`) caught what the sandbox
couldn't:** the sandbox-verified 6/6 above was `desktop`-project only. The
full 7-viewport matrix in real CI found the wiring-proof test genuinely
failing on `mobile`/`landscape`/`tablet` — those viewports open sections via
the eyebrow-menu-and-sheet path (not the rail), and the decisions sheet
wasn't actually closing between the two sheet-opens in that one test, so the
next section's click landed on the old sheet's scrim. Fixed by explicitly
clicking the sheet's own Close button instead of relying on the shared
fixture's Escape fallback; re-verified 18/18 directly against those three
viewports. Commit `c9c686b`.

Also fixed, on Todd's go-ahead: `checks.yml`'s `cra-build` job had been
failing on an unused `FORMAT_RACING` constant since before this session
touched anything (confirmed identical at `646fcdd`) — racing events
(Kentucky Derby, Daytona 500) differentiate individually via `copyByAnswer`
and never needed the group-level constant its four siblings use. Removed it.
Commit `588e520`.

`checks.yml` is now **fully green** — jest, hostv2-build, backend, e2e (full
matrix), and cra-build all passing on the same commit, for the first time in
at least the last 5 pushes.

## ADDED 2026-09-13 (seventh session update, same day) — built the NFL Playoffs major_event option

Host directive: "build the NFL playoffs option" — closing the exact gap
flagged in the prior audit pass.

**Real research first**, not assumed (see full findings folded into
`watchParty.js`'s own SIXTH PASS header comment):
- Wild Card Weekend is genuinely 6 games across 3 days; the Divisional Round
  is 4 games across 2 days.
- Every NFL playoff round — not just the Super Bowl — is single-elimination:
  "win or go home," a real, well-documented tonal difference from the
  Super Bowl's once-a-year exhibition-plus-spectacle framing.
- Cold-weather outdoor-tailgate culture around playoff games is real and
  well-documented (frostbite headlines, Bills Mafia winter tailgating) but
  was deliberately NOT built into a purchase — this playbook is an indoor
  living-room watch party by design; a tailgate need doesn't exist inside
  that scope, and pricing one would be inventing a need the app doesn't
  actually serve.
- No real, sourced food/shopping tradition distinguishes an NFL playoff
  game from the existing wings/chili/pizza defaults.

**What shipped, following exactly what the research supported:**
- Added `'NFL Playoffs'` to the `major_event` options list.
- Joined `FORMAT_MULTIDAY` (alongside March Madness/World Cup/Olympics) —
  the real multi-game/multi-day Wild Card and Divisional structure is
  exactly what the existing `tourney_span` decision already asks ("just
  this game" vs "a few key games" vs "the whole run"), so NFL Playoffs
  reuses that decision and its repeatable-shopping-list task rather than
  inventing a new mechanism. No new engine surface needed at all this pass.
- **No new purchase.** Same honest treatment NBA Finals and Stanley Cup
  Final already got when research found nothing to differentiate: real,
  sourced heartMoment copy only (the elimination-game stakes — "this isn't
  a regular-season loss, it's a season") on 2 of the 4 heartMoment bases.
- Run-of-show wording ("Kickoff"/"Halftime") was deliberately left
  untouched — unlike Kentucky Derby or Daytona 500, that language is
  factually correct for an actual NFL game, so rewording it would have
  been change for its own sake.

**Verified live**: default purchase list unchanged (no fabricated item);
`tourney_span: 'Following the whole run'` correctly triggers the
repeatable-shopping-list task, `'Just this game/match'` correctly doesn't;
real elimination-stakes heartMoments render; no leaked risks
(`r_derby_time`/`r_rivalry` absent, confirming the risk-gating fix from two
passes ago still holds on a brand-new event).

Files: `src/lib/playbooks/data/watchParty.js` only. Full Jest **442/442
suites, 6240/6241 tests** (1 pre-existing skip, no ratchet change).
`sync:hostv2`/`gate:hostv2` clean. Commit `ea23ed1`.

## ADDED 2026-09-13 (sixth session update, same day) — audited the remaining 11 sub-events; answered the NFL-playoffs question

Host directive: "do the same audit for the other formats and did we do
non-Super-Bowl NFL games." Two asks, both answered directly.

**Audit, extended to the remaining 11 named events** (Super Bowl default,
CFB Championship, NBA Finals, Stanley Cup Final, World Series, Regular
season/other, March Madness, Olympics, Daytona 500, The Masters, Awards
Show), same method as the top-5 pass — real engine calls, full output read.

**Confirmed clean**, no fixes needed: Super Bowl default, CFB Championship,
NBA Finals, Stanley Cup Final, World Series, Regular season/other. The risk
gate fix from the prior pass holds correctly on the default path (no
r_derby_time/r_rivalry leakage). Format 1's generic "Kickoff"/"Halftime"
wording is confirmed as the deliberate, untouched baseline for these — not
a defect being carried forward.

**Found 2 more real gaps — the SAME bug class as the prior pass, just on
events outside the top-5 sample:**
1. **Daytona 500's run-of-show (Halftime/Second-half beats) was never
   reworded** — even though Kentucky Derby, the other member of the SAME
   racing format, got exactly this fix one pass ago. Fixed with matching
   pit-stop-chatter / late-caution wording.
2. **The Masters had zero heartMoment differentiation** — including still
   showing the impossible "Halftime hits and nobody leaves the couch..."
   line verbatim, even though The Masters is a no-halftime format. This is
   the exact bug fixed for UFC/Boxing, NFL Draft, Awards Show and Wimbledon
   in the prior pass — Wimbledon (the other continuous-coverage format
   member) got 3 of 4 heartMoment bases covered; The Masters had 0. Added
   all 3.

**Pattern worth naming for future work**: every gap found across both audit
passes was a FORMAT-MATE inconsistency — one member of a format got a fix
or a variant, its sibling in the same format did not. Auditing format-by-
format after the fact catches these; checking every member of a format
together when adding the first one would prevent them.

**Direct answer: did we build non-Super-Bowl NFL games?** No.
`eventTaxonomy.mjs`'s free-text keyword recognizer already correctly routes
"wild card", "conference championship" and "playoffs" to the Watch Party
event TYPE (this predates the whole Watch Party major_event project). But
the `major_event` DECISION — the "what are we watching" picker inside a
Watch Party — only offers **"Super Bowl"** and the generic **"Regular
season game / other"** for football. There is no "NFL Playoffs" or
"Conference Championship" option. A host hosting one of the most common
non-Super-Bowl NFL watch parties (a playoff game, a conference
championship) has no accurate choice — they'd have to pick the wrong
named option or the under-specified fallback. **Not built in any of the
six passes today; flagged here as a real, disclosed gap for a
prioritization decision — not assumed to be low-priority**, since NFL
playoff games are arguably as common an occasion as several of the 16
options that DID get built (Wimbledon, Awards Show, NFL Draft).

Files: `src/lib/playbooks/data/watchParty.js` only (2 heartMoment/schedule
fixes + documentation, no new engine surface needed — reused the
`whenChoice`/`copyByAnswer` support built in prior passes). Full Jest
**442/442 suites, 6240/6241 tests** (1 pre-existing skip, no ratchet
change). `sync:hostv2`/`gate:hostv2` clean. Commit `99d5510`.

## ADDED 2026-09-13 (fifth session update, same day) — audited the top 5 sub-events, found and fixed 3 real bugs

Host directive: "Demo the workflows for the top 5 sub events and look for
logic issues and gaps." Picked one representative per non-default format
(UFC/Boxing, Kentucky Derby, Wimbledon, World Cup, NFL Draft — covering 5 of
the 6 formats) and ran the REAL engine functions
(`playbookFoodPlan`/`playbookRunOfShow`/`playbookChecklist`/
`playbookHeartMoments`/`playbookRisks`) against each, reading the full
output the way a host actually would — not just spot-checking the one field
each format's own pass added.

**Found 3 real, host-visible bugs, all fixed (not just noted):**

1. **Risks were never gated by `major_event` at all.** Unlike purchases,
   tasks, schedule rows and the multi-day agenda — all of which already read
   `choiceShown()` — `playbookRisks()` had no gate whatsoever. `r_derby_time`
   ("the race is over in about two minutes") and `r_rivalry` ("the two
   schools' fans") showed for EVERY major_event answer, confirmed live for
   UFC/Boxing, Wimbledon, World Cup and NFL Draft. This dates to pass one
   (2026-09-13 earlier the same day), not to the taxonomy work — it simply
   went unaudited until now. Fixed: `playbookRisks()` gained the same
   `whenChoice` + `copyByAnswer` support schedules already had (same
   precedented pattern, same "no existing playbook authors this yet" no-op
   proof). `r_derby_time` → Kentucky Derby only; `r_rivalry` → CFB
   Championship only. This changes the Super Bowl DEFAULT's risk list (drops
   2 irrelevant risks) — a bug fix, not a violation of "format 1 stays
   untouched" (that rule is about this project's own additions, not about
   preserving a pre-existing defect).
2. **The "Halftime hits and nobody leaves the couch..." heartMoment showed
   verbatim for UFC/Boxing, NFL Draft and Awards Show** — three formats with
   no halftime, promising a moment that literally cannot happen. Gave each a
   real copyByAnswer override instead.
3. **World Cup had zero heartMoment differentiation** despite being a
   Multi-day tournament format member — March Madness and Olympics both got
   some in the third pass, World Cup was simply missed. Added two.

**Also fixed while auditing** (not a "bug" exactly, but a real inconsistency
within the racing format): Kentucky Derby's run-of-show (Doors/Kickoff/
Halftime/Second-half/Finish beats) had stayed 100% football-worded through
all three prior passes, even though Derby is the racing format's own
flagship example and Daytona 500 got fully reworded beats when it was added
in the third pass. Now reads as a real build-up-to-a-2-minute-race day
(confirmed live: "Undercard races begin — post time is still hours away" →
"Post time — the race itself, over in about two minutes").

**Disclosed, not fixed** (lower severity, real cost): several purchase
`.note` fields still say "top up ice at halftime" / "swap trash bags at
halftime" / "a ~3.5h game" for no-halftime formats (`p_ice`, `p_cleanup`,
`p_drinks`). Purchase notes have never resolved `copyByAnswer` anywhere in
this codebase — fixing that would be a THIRD engine surface change in one
session for a shopping-list caption, not a schedule promise or a wrong risk
a host actually acts on. Proportionality call.

**Verified live** (same direct-engine method as prior passes — Playwright's
Chromium still isn't available in this sandbox): re-ran the demo after each
fix; confirmed `r_derby_time`/`r_rivalry` now appear ONLY for their own
events across the audited 5; confirmed UFC/Boxing and NFL Draft no longer
show the impossible halftime heartMoment; confirmed World Cup and Kentucky
Derby now read coherently.

Files: `src/lib/playbooks/index.js` (`playbookRisks` gains whenChoice/
copyByAnswer), `src/lib/playbooks/data/watchParty.js` (risk gating, 3
heartMoment additions, 5 reworded Derby schedule rows). Full Jest **442/442
suites, 6240/6241 tests** (1 pre-existing skip, no ratchet change this
pass). `sync:hostv2`/`gate:hostv2` clean. Commit `9c2512e`.

## ADDED 2026-09-13 (fourth session update, same day) — Watch Party gets a real 6-format taxonomy + a genuine run-of-show shape per format

Host directive, going beyond named-event differentiation: group `major_event`
answers by STRUCTURAL SHAPE, not just name, and gave the exact 6 groups —
single game/one break (default), multi-day tournament, combat sports/PPV,
racing/spectacle, continuous coverage, broadcast event — with the changes
each format needs vs. today. This closed the gap disclosed at the end of
passes one and two: `schedules.program` (the run-of-show) had never actually
been reshaped, only decor/food/heartMoments had.

**Two small, precedented ENGINE changes** (`src/lib/playbooks/index.js`),
both verified byte-identical for all 44 playbooks before any content was
built on them (full suite pass count unchanged before/after each):
- `choiceShown()` gained an optional `{not:[...]}` form — the same two-shape
  vocabulary `modeShown()` already uses for travel mode, extended rather than
  invented. Lets a row say "everyone except these formats" instead of
  enumerating every format that keeps it.
- `playbookRunOfShow()`'s and `playbookDuringCues()`'s main per-row loops now
  call `choiceShown(event, entry.whenChoice)` — previously ONLY
  `schedules.agenda` (the multi-day mechanism) honored a row-level gate, so a
  `whenChoice` on a `program`/`setup`/`cleanup` row silently did nothing. No
  existing playbook authored `whenChoice` on a timed row before this, so it
  is provably a no-op for the other 43 playbooks.

**The 6 formats, mapped onto major_event (12 existing + 4 new: Daytona 500,
Wimbledon, NFL Draft, Awards Show):**
1. Single game (Super Bowl, CFB Championship, NBA Finals, Stanley Cup Final,
   World Series, Regular season/other) — DEFAULT, untouched.
2. Multi-day tournament (March Madness, World Cup, Olympics) — a new
   `tourney_span` decision ("how much of the tournament are you hosting
   for?") plus a repeatable-shopping-list task once it's more than one
   sitting. Deliberately NOT a fake day-by-day itinerary — a 3-week Olympics
   has no fixed number of sittings for `schedules.agenda` (built for a dated
   wedding weekend) to honestly model.
3. Combat sports/PPV (UFC/Boxing) — real undercard-then-main-event program
   beats, no halftime.
4. Racing/spectacle (Kentucky Derby unchanged; Daytona 500 new) — a
   pre-race-ceremony beat (anthem/flyover/driver intros), real "Daytona Day"
   decor tradition.
5. Continuous coverage (The Masters, Wimbledon new) — no halftime; Wimbledon
   gets a real purchase (Pimm's Cup + strawberries and cream) that genuinely
   EARNED tier:'researched' through the real KCR functions — its sources
   price the actual home ingredients, unlike the Masters' pimento cheese.
6. Broadcast event (NFL Draft, Awards Show — both new) — not a game, no
   halftime, reworded beats; a draft board and printable prediction ballots
   respectively, the genuinely defining purchase for each per real research.

**Pipeline discipline held**: ran the real KCR functions
(createKCR→addEvidence→setProposal→review→publishKCR) for the Wimbledon
claim exactly as pass two did, verified every gate passed, then — same as
pass two — did NOT commit it to `publishedKcrs.json`/`publishedKnowledge.json`,
since that transport's tested invariant (cited + baseline-visible) still
can't accept `whenChoice`-gated content. Same disclosed, un-started
infrastructure gap. The draft-board and ballot items stayed at honest
`estimate` on purpose — their cost is trivial and not worth a corroborated-
sourcing pass, a proportionality call, not a shortcut.

**A real bug found and fixed, out of scope but too material to leave**:
verifying the Wimbledon purchase actually appeared in a shopping list
surfaced that it did NOT — and neither did the plain `p_drinks` line, for
ANY Watch Party, including the untouched Super Bowl default. Root cause: the
shared engine's BYOB detector picks the FIRST decision in the array whose
`blocks` names beverage, and `potluck`'s own default label is literally
"Host feeds, guests bring drinks" — it matched itself on the phrase "guests
bring" before `alcohol` (which exists specifically to answer this, with a
real BYOB option) was ever consulted. Every beverage item without the word
"ice" in its name (mint julep survived by accident; a beer+soda+water line
did not) silently vanished from every Watch Party ever generated. Fixed by
removing `'beverage_purchases'` from `potluck`'s `blocks` — `alcohol` already
owns that question correctly. This predates all three Watch Party passes;
not introduced this session, but found and fixed in it.

**Verified live** (temporary Jest scripts calling `playbookFoodPlan`/
`playbookRunOfShow`/`playbookChecklist`/`playbookHeartMoments` directly,
deleted after use — Playwright's Chromium channel still isn't available in
this sandbox): all 6 formats produce the right purchases, program beats, and
gated tasks; the Super Bowl default's program is unchanged; Kentucky Derby
is unaffected by the new racing-format Daytona content; the potluck fix
makes `p_drinks` and the new Wimbledon purchase both appear correctly.

**Discovered, out of scope, NOT fixed** (documented in `watchParty.js`'s own
`knowledge.note`): the `cleanup` schedule's `{when:'halftime'}` row has never
reached a host — `rosWhenOffset()` doesn't recognize the bare token
`'halftime'`, so it silently returns null and the row is dropped by every
schedule reader. Pre-existing, unrelated to this pass.

Files: `src/lib/playbooks/index.js` (2 engine changes), `src/lib/playbooks/
data/watchParty.js` (taxonomy, 4 new major_event options, `tourney_span`
decision, 4 new purchases, reworded/gated program beats, the potluck fix),
`src/lib/knowledge/costProvenance.js` (2 new Wimbledon sources),
`src/lib/knowledge/sourceResolverInvariant.test.js` (ratchet 408→410). Full
Jest **442/442 suites, 6240/6241 tests** (1 pre-existing skip).
`sync:hostv2`/`gate:hostv2` clean.

## STANDING RULE 2026-09-13 — Don't ever add playbook knowledge without the KCR pipeline

Host directive, absolute and retroactive: **"Don't ever add without
pipeline."** Triggered by an honest disclosure — asked "how extensively have
we researched... we have a process and system to fill that data repository,"
the true answer was that the "genuinely differentiates by major sporting
event" entry directly below (commit `62c2b16`) hand-typed tier/confidence/
citations straight into `watchParty.js`, never touching `createKCR` →
`addEvidence` → review → `publishKCR`. Todd's correction stands for every
future session, not just this one: **no new priced/quantified/provenance
claim in any playbook may be hand-authored with a citation-shaped note ever
again — it goes through the real KCR functions in
`src/lib/knowledge/knowledgeChange.js` first.** Structural content (a new
decision, a new purchase, new heartMoments prose) is still authored as plain
code — the pipeline has no mechanism to create new fields, only to correct
values on ones that already exist (see `governedFieldTypes.js`/
`governedOwnership.js` — confirmed by reading, not assumed). Todd also
delegated the KCR review board's sme/editorial/governance approval roles to
Claude ("You're directed to pull the review board for decisions.") — reuse
of the same "owner's standing delegation" concept already established for
the Path-to-Production review board.

**Real architectural finding from actually doing this once (see the entry
right below):** the codebase's only durable, git-tracked KCR transport
(`src/lib/knowledge/publishedKcrs.json` → `bake-published-knowledge.mjs` →
`publishedKnowledge.json` → `knowledgeOverride.js` at runtime) carries a
hard, tested invariant — `wave0HostProof.test.js` requires every entry to be
`verificationStatus:'cited'` AND visible in a baseline event with nothing
answered ("no invisible grounding"). That transport was built for
corrections to unconditionally-visible lines; it has **no path for
`whenChoice`-gated conditional content** or for an honestly-`estimate`
review outcome. Extending it to cover that case is real, disclosed,
un-started follow-up infrastructure work — not something to force through
by weakening the invariant. Until then, decision-gated new content's
governed values are authored directly (having still gone through the real
KCR functions to be produced), not piped through that shared transport.

## ADDED 2026-09-13 (second pass, same session) — 3 more major_event formats, this time through the real KCR pipeline

Direct continuation of the standing-rule correction above. Extended
`watchParty.js` to cover 3 of the remaining 7 `major_event` formats —
World Series, The Masters, World Cup — plus atmosphere-only heartMoments
for NBA Finals, Stanley Cup Final and Olympics, and an explicit decision to
add nothing for "Regular season game / other" (it's the fallback).

**What actually ran, not simulated:** wrote a one-time Jest generator
(`__generate_watchPartyFormats.test.js`, deleted after use) that called the
real `createKCR → addEvidence → setProposal → advanceKCR → recordReview
(sme/editorial/governance, Claude under the delegation above) →
advanceKCR('approved') → publishKCR` chain for all 6 new
provenance/costProvenance claims. Every gate in `publishKCR` (type safety,
field ownership, grounding-honesty, commercial-source policy) genuinely
executed and passed — proven by the test not throwing, not asserted.

**What the review board actually found, not uniformly upgraded:**
- **World Series ballpark snacks** (hot dogs/peanuts/Cracker Jack) earned
  real `tier:'researched'` — 4 dated 2026 retail sources (LatestCost,
  Chowhound-reported Costco pricing, Costco/Sam's Club listings) genuinely
  price a home-shopping list. Registered in `COST_SOURCES`
  (`hotdogs-retail-2026`, `hotdogs-costco-2026`, `peanuts-costco-2026`,
  `crackerjack-retail-2026`) with `sourceClass`/`limitations` disclosed per
  the commercial-source policy (Phase 5F.9).
- **The Masters** (pimento cheese tea sandwiches) and **World Cup**
  (national flags/jerseys/face paint) both have real, multi-sourced
  evidence for the *tradition* (Augusta's $1.50 concession-stand sandwich
  confirmed by NBC New York/Golf Monthly/NPR; World Cup fan flag culture
  confirmed by KPBS/usflags.com) — but neither evidence prices a host's
  *home shopping list*, so the review board correctly withheld
  `tier:'researched'` on cost rather than grounding the wrong transaction.
  Both stay honest `estimate`/`synthesized`. **Going through the pipeline
  does not mean every claim reaches "researched" — it means every claim is
  evidenced and reviewed before it ships, whatever tier the evidence
  actually earns.**

**Then the transport invariant was discovered (see the standing-rule entry
above) and the 6 published KCRs were deliberately NOT committed to
`publishedKcrs.json`/`publishedKnowledge.json`** — running the full suite
after baking them broke 3 suites / 6 tests (`sourceResolverInvariant`'s
faithful-index count, `publishedExport`'s lineage-head counts, and
`wave0HostProof`'s cited+baseline-visible invariant). Reverted both files;
the reviewed values are authored directly in `watchParty.js` instead
(honestly documented in the file's own header). The one LEGITIMATE ratchet
update from this pass: `sourceResolverInvariant.test.js`'s source-identity
count went 404 → 408 for the 4 newly-registered `COST_SOURCES` entries.

**Verified live** (temporary Jest script against `playbookFoodPlan`/
`playbookHeartMoments`, deleted after use — no Playwright this pass; the
sandboxed Chromium channel wasn't available, see Traps below):
- Super Bowl default path byte-identical (`p_wings`, `p_chips`, `p_chili`,
  `p_pizza_sliders`, `p_dessert`, `p_ice`, `p_tableware`, `p_cleanup`).
- World Series shows `p_ballparksnacks` with the researched costProvenance
  and correct $ math ($28-56 for 14 servings at 12 guests, matching the
  $2-4/serving band).
- The Masters shows `p_pimentocheese`; World Cup shows `p_worldcupcolors`.
- NBA Finals/Stanley Cup/Olympics heartMoments render their new copy.

**Remaining, disclosed, not done:** NBA Finals, Stanley Cup Final, Olympics
have atmosphere only (no purchases — real research found no food/decor
tradition as strong or as universal as wings/mint julep/pimento cheese/
ballpark snacks; forcing one would be inventing a tradition). The
decision-gated KCR transport gap above is unresolved infrastructure work.
`schedules.program` (the run-of-show) still assumes one continuous
football-shaped game for every `major_event` answer.

Files: `src/lib/playbooks/data/watchParty.js`, `src/lib/knowledge/
costProvenance.js` (4 new `COST_SOURCES`), `src/lib/knowledge/
sourceResolverInvariant.test.js` (ratchet 404→408). Full Jest **442/442
suites, 6239/6240 tests** (1 pre-existing skip). `sync:hostv2`/
`gate:hostv2` clean. Commit `0fb7202`.

## ADDED 2026-09-13 — Watch Party now genuinely differentiates by major sporting event

Host directive, one step further than the keyword-recognition work below:
"I want the major sports differentiated and identified. I want the Super
Bowl atmospherics and playbook info different than the college football
national championship." Then, before touching code: "start the work of
doing the research on the backend and admin console references that build
the playbook in this special way" — answered first (see the research
findings folded into this entry) so the system built here follows the
codebase's own established content-governance pattern rather than a new,
parallel one.

**Research findings, not assumed:** the backend (FastAPI) is irrelevant to
playbook content — it only ever treats "playbook type" as an opaque label
in a research/observation pipeline. The admin console (`?admin=1`) DOES
have a real content pipeline — the Studio tab's KCR workflow (acquisition
→ observation → evidence → finding → KCR → review → publish) plus a live
knowledge-inventory audit — but no "variant playbook" feature exists
anywhere; every one of the 44 playbooks is one static object. The reusable
primitive for conditional content already exists though: `whenChoice`/
`choiceShown` (gate a purchase/task/decision on another decision's
answer) and `copyByAnswer`/`resolveAnsweredCopy` (swap prose on an
answer), both used throughout the codebase already (destination wedding's
`dest_lodging` cascade is the deepest existing example) — this is the
first playbook to lean on them this widely, not a new engine concept.

**What shipped:** a `major_event` decision — "What are we watching?" — 12
named events, Super Bowl the untouched default. `weight:'high'` +
`blocks:['food','program']` (mirroring `dest_lodging` exactly) is the
attention-system fix requested alongside this: it ranks to the top of
"Calls to make" and gates food/schedule assembly until answered, instead
of quietly defaulting. Real per-event content, researched live
(WebSearch, dated 2026-09-13, not fabricated): Super Bowl keeps its
existing wings-and-halftime content (National Chicken Council's 2026
report: 1.48B wings); College Football National Championship gets its own
heartMoments (team colors, trophy presentation) and a team-colors/tailgate
-decor purchase, grounded in the CFP's own tailgate coverage; Kentucky
Derby gets mint-julep content and a new risk (the race itself is ~2
minutes inside a multi-hour build-up — r_derby_time); March Madness gets
its own heartMoment (a 2026 office-pool spending survey, $97 average
buy-in); UFC/Boxing gets a `ppv_cost` decision framed on the REAL 2026
fact that UFC dropped pay-per-view entirely (folded into Paramount+,
~$6-12/mo or $59.99/yr) while boxing majors are often still PPV
($75-90/card) — this would have been WRONG to author unchecked.

**Two real bugs caught and fixed before shipping, not glossed over:**
1. The first draft cited source ids (`cfp-tailgate-2026`, `derby-
   tradition-2026`) that don't resolve in `QTY_SOURCES`/`COST_SOURCES` —
   tripped `knowledgeInventory.test.js`'s 'ambiguous' state and
   `researchPolicyCompliance.test.js`'s corroboration/dating ratchets.
   Fixed by dropping the `sources` array and keeping the real citations as
   `note` prose only, at `estimate` tier — the same pattern this exact
   file's own `p_chips`/`p_chili` already use.
2. The new team-colors purchase never appeared in the shopping list at
   any category — traced to `playbookFoodPlan`'s Supplies loop
   (`playbooks/index.js` ~4218), which silently drops any non-food/
   beverage purchase unless it's `essential: true` (not just hidden by
   default — dropped entirely). Fixed: `category: 'logistics'` +
   `essential: true`, honest once `whenChoice` has already gated it to
   the one event it belongs to.

Live-verified end to end: heartMoments genuinely swap text per
`major_event` answer; the mint julep purchase's $30-55 and the team-colors
purchase's $15-40 each move the shopping total only when their event is
picked; the football/Super Bowl default path (heartMoments, item count, $
totals) is byte-identical to before this change when `major_event` is
left unanswered. `playbookContract.test.js`'s `costFactorGaps` baseline
raised 0 → 1 with an inline explanation (a whenChoice-gated decision has a
real cost effect the linter's multiplier-shaped heuristic doesn't
recognize — a second legitimate pattern, documented rather than
mislabeled). Root Jest 442/442. hostv2 build + parity gate +
hostv2-artifact drift gate all clean.

**Not done, disclosed rather than skipped:** the run-of-show
(`schedules.program`) stays football-shaped (kickoff/halftime beats) for
every `major_event` answer. A genuine per-event minute-by-minute timeline
(the Derby's race is ~2 minutes inside hours of build-up; UFC/boxing runs
undercard-then-main-event, not one continuous game) is real follow-up
work, not attempted blind under time pressure.

## ADDED 2026-09-13 — Sporting-event coverage widened far beyond Super Bowl

Host: "I want sporting event watch party types. Do we have playbooks?"
Only one exists — `watchParty.js` — and it's genuinely built for this (see
the FIXED entry below). Asked which of Super Bowl / March Madness / World
Series should get their OWN dedicated playbook; host's answer: "All and
then some. Cover more sporting events than these 3."

**Decision, stated plainly:** did not author a dozen near-duplicate
playbook files. Every one of these is the same hosting shape — a screen
everyone can see, food timed to a start whistle/tipoff/first pitch, drinks
in coolers, cleanup between rounds — and separate files would each carry
their own copy of the same cost citations, which is exactly what
`researchPolicyCompliance.test.js`'s ratchet exists to catch (a duplicate,
not a corroboration). Instead widened `eventTaxonomy.mjs`'s KEYWORDS to
route many more named events to the existing Watch Party playbook: NFL
Draft, NBA Finals/Draft, Stanley Cup, NHL playoffs, World Cup, Champions
League, the Masters, Ryder Cup, Kentucky Derby, Daytona/Indy 500,
Wimbledon, fight night/UFC/PPV/boxing/title fight, Olympics, bowl games
(rose/sugar/orange/cotton/fiesta/peach), national championship, CFP, wild
card, conference championship, tailgate, Elite Eight, draft day/night,
all-star game.

**Deliberately left alone:** "sweet sixteen" — already resolves to the
Sweet 16 birthday milestone (that rule runs first in KEYWORDS), and the
basketball tournament round of the same name isn't worth a real collision
over. Verified both "Sweet 16 party" and "Sweet sixteen birthday bash"
still resolve to Sweet 16 after this change, unaffected.

**Honest limitation, disclosed rather than papered over:** the Watch Party
playbook's actual CONTENT — not just its name — assumes a single
continuous ~3.5–4h game with one halftime: several schedule tokens and
risk ids are literally `kickoff`/`halftime` (`r_kickoff`, `t_halftime`,
`when: 'halftime'`). That's accurate for football/basketball/soccer, a
looser fit for a multi-fight UFC card, and a real mismatch for a horse
race (the Derby itself is ~2 minutes; the party is a build-up event, not a
game with a halftime), a golf major (hours of continuous coverage, no
discrete break), the NFL Draft (a broadcast announcement show, not a
game), or the Olympics (multi-week, many discrete events). Recognition
now routes all of these to Watch Party; the schedule/risk COPY they'll see
still talks about kickoff and halftime regardless of which one it is. Not
rewritten in this pass — a genuine per-format content differentiation
(or at minimum a copy-only de-footballing pass: "kickoff" → "the start,"
"halftime" → "the midpoint break") is real, scoped work, flagged for a
follow-up rather than done blind under time pressure.

Live-verified 13 phrasings (NBA Finals, Stanley Cup, World Cup, Kentucky
Derby, UFC fight night, the Masters, bowl game, national championship,
wild card weekend, NFL Draft, tailgate, Wimbledon, Olympics) resolve to
Watch Party; both Sweet 16 phrasings unaffected. Root Jest 442/442. hostv2
build + parity gate + hostv2-artifact drift gate all clean.

## FIXED 2026-09-13 — Watch Party missing from the quick occasion picker at creation

Host report: "Those events aren't in list at creation." Asked which list
specifically before touching anything (three real candidates existed) —
answer: the occasion TYPE list shown while creating an event, not an
events list after the fact.

**Ruled out first, with live evidence, not assumed:** the searchable event
palette (Cmd/Ctrl+K → type an event name) and the events-switcher sheet
("This event" → "Your events") both already show a newly created event
immediately and correctly — verified by creating two fresh events back to
back and confirming both listed in each surface with full data intact. My
first pass at checking this had truncated my own debug output and looked
like a miss; re-checked with the untruncated text before concluding
anything, and both were actually fine. Recorded here so the false lead
isn't re-investigated.

**The real gap:** `QUICK_TYPES` — the 6-chip default shown when picking
"Which occasion?" — is `['Birthday', 'Wedding', 'Anniversary',
'Graduation', 'Reunion', 'Get-Together']`. Watch Party existed only one tap
deeper, inside "See every occasion." That six-item set was a deliberate
host ruling (2026-08-05, "six common occasions plus search," a density
fix) — not touching that call in general, but a live host report today
asking for this specific type is a stronger, current signal than the old
default. Added `'Watch Party'` as a 7th quick chip. Game Night stays one
tap away — this report was about Watch Party specifically.

Live-verified: the quick chips now read Birthday, Wedding, Anniversary,
Graduation, Reunion, Get-Together, Watch (Party) — no extra tap. Root Jest
442/442. hostv2 build + parity gate + hostv2-artifact drift gate all clean.

## FIXED 2026-09-13 — Super Bowl / sports-watching free text didn't resolve to Watch Party

Host question: "Do we have event for watching sports? Super Bowl etc." The
honest answer at the time: **the playbook does, the parser mostly didn't.**
`watchParty.js` already exists and is explicitly authored for this — its
own file header says "Super Bowl / Sports Watch Party... TV-forward,
grazing food ready before kickoff, halftime refresh." But before this fix,
free-text recognition only caught the literal phrase "watch party" (fixed
earlier this session) or the exact alias strings `'Super Bowl Party'` /
`'Game Day Party'`, which real sentences rarely match verbatim. Tested and
confirmed broken:

  "Super Bowl for 10 people this weekend"        → no type recognized
  "Super Bowl Sunday at my place, 10 people"      → **Day Party** (wrong)
  "Hosting the big game this weekend, 10 people"  → no type recognized
  "Playoff game at my house, 8 people"            → no type recognized

The "Super Bowl Sunday" → Day Party result is a second bug on its own:
`smartParseEvent.js` falls back to `HOST_TYPES.find(ht => text.includes(ht
.replace(' party','')))` when `resolveCanonicalType` finds nothing — a
bare substring match against type names — and "Sunday" contains "day".

**Fix:** added an explicit `eventTaxonomy.mjs` KEYWORDS entry for `super
bowl`, `playoffs`, `the big game`, `march madness`, `world series`, `final
four`, `championship game`, ordered ahead of the generic fallbacks. Once
`resolveCanonicalType` returns 'Watch Party' directly for these phrasings,
the fragile substring fallback never runs for them either — one fix closes
both bugs for this class of input.

Live-verified all 4 broken cases plus 5 more ("Super Bowl party," "watching
the super bowl," "March Madness," "World Series") now resolve to Watch
Party. **One residual gap, not fixed:** "Sports watching party" with no
named event still falls through to the generic party/celebration catch →
Birthday — matching on bare "sports" without an anchor (a named
event/team, or "watch") risks false-positiving on unrelated party types,
so left as a known edge case rather than widened blind.

Root Jest 442/442. hostv2 build + parity gate + hostv2-artifact drift gate
all clean.

## FIXED 2026-09-13 — No way to start a second event while one was already loaded

Host report: "When in an event need to create new events on occasion."
Confirmed a real dead end, live, not a UI nit. Every apparent entry point
for starting a second event mid-session — the dock's Create tab, the nav
sheet's Create segment (the Menu button added earlier this session), the
command palette's "New event" result — all called bare `setStage('create')`.
That stage only renders the blank "What are we planning?" prompt while
`!revealed`; once the loaded event has cleared the reveal ceremony,
`'create'` shows THAT event's recap ("YOUR EVENT, UNDERSTOOD…") forever —
nothing anywhere reset `revealed` back to `false` except "Change an
answer," which deliberately re-edits the SAME event via `redoEventId`, not
a new one. Live-verified before touching anything: all three entry points
looped back to the current event's recap with no way past it.

**Fix:** added `startNewEvent()` (`hostv2/src/HostShellV2.jsx`, near
`dismissWelcome`) — when a finished event is loaded, clears the
create-flow scratch state (`smartText`, `fType`, `createEdit`,
`intakeOpen`, `typeOpen`) and un-reveals so the blank prompt renders; a
draft still in progress (`!revealed`) is left alone so returning to Create
doesn't wipe a half-typed one. `assemble()` already mints its own new
event id on every call unless `redoEventId.current` is set, and the
current event's data lives in the store under its own id regardless of
this scratch state, so nothing about the event in progress was ever at
risk. Wired into all three entry points.

**Live-verified end to end, not just read from code:** created a second
event ("Sunday Dinner…") from inside today's real Cookout event via
Day tab → Menu → Create, then confirmed via `localStorage` that both
events now persist independently under separate ids — the Cookout keeps
its real date, name and data untouched:
```
cust-mtzzrwkd-6byeqj  My The Cookout   The Cookout   2026-09-13
cust-mtzzs1om-g3n0ei  My Dinner        Dinner Party  (no date)
```
Root Jest 442/442. hostv2 build + parity gate + hostv2-artifact drift gate
all clean.

**Noted in passing, not fixed (separate from what was asked):** the
free-text type resolver read "Sunday Dinner for 8 next weekend" as generic
"Dinner Party," not the authored "Sunday Dinner" playbook — the same class
of gap as the Game Night fix above, in a different type. Flagging for a
follow-up keyword audit across `eventTaxonomy.mjs`'s `KEYWORDS` list rather
than patching one more entry blind.

## FIXED 2026-09-13 — Game Night/Watch Party misclassification, occasion-picker mis-tap risk, dead "Something else" pill

Three more reports from the same live-hosting session, root-caused and fixed:

**"Chose game night and it fed day party."** `eventTaxonomy.mjs`'s `KEYWORDS`
list still routed `game\s*night` and `watch\s*party` into the generic
Get-Together bucket. Both were later promoted to their own authored
playbooks (`gameNight.js`, `watchParty.js`, both in `ALL_PLAYBOOKS`) but the
keyword carve-out was never added — a half-finished promotion. Added
explicit entries for both ahead of the generic line (first match wins).
Live-verified: "Game night for 6 people this Saturday at 7pm" now resolves
to Game Night.

**The likely mechanism behind that report's exact wording:** the occasion
picker's "See every occasion" shelves (`.shelf`) were a horizontal
snap-scroll carousel with no fade/edge cue, overflowing the viewport —
several types, "Day Party" (shown as "Day") among them, sat fully
off-screen. Confirmed by screenshot: cut-off labels, no visible affordance
that more existed. Combined with `scroll-snap-type:x proximity`, a
flick-then-tap can land on whatever chip just snapped into place, not the
one tapped at. This class has exactly one consumer (this picker) and is a
selection list, not a browse carousel that earns horizontal scroll —
switched to wrap. No off-screen options left. `spacingLadder.test.js`'s
ratchet baseline lowered 272 → 271 as a side effect (the carousel's bleed
margin goes with it) — a legitimate ratchet turn, not a spacing pass.

**"Something else pill in creation doesn't extend type list."** Tapping it
in the quick-intake flow silently closed the panel — no focus, no hint,
nothing visibly happened, reading as a dead control. Now focuses the
free-text input, the hand-off the code's own comment already claimed it
was doing.

All three live-verified against the running app. Root Jest 442/442
(271-baseline spacing ratchet included). hostv2 build + parity gate +
hostv2-artifact drift gate all clean.

## Still open from this session — needs a product call, not a blind patch

**"Nowhere to advance when it's today screen. Can get back but not advance."**
Confirmed: the persistent "what needs you next" bar (`.next-bar`, the
primary CTA pinned to the frame bottom) is scoped to `stage === 'plan'`
only (`hostv2/src/HostShellV2.jsx` ~19779: `{stage === 'plan' && !heroInView && (...)`).
Day and After never render it — Day-of only has the safety checklist
(togglable, not sequenced), the Walk-it/Full-agenda toggle, and — only
before a start time is set — a "pencil in times" propose card. Once that's
accepted or dismissed, there is no forward-pointing CTA on Day at all; the
host has to leave the tab (now possible, see below) to see what's next.
Didn't patch this blind: the next-bar's logic (`queue`, `listIsCalm`,
`heroInView`) is built for the Plan-tab hero and its `days === 0` branch
already assumes it's being read FROM Plan, not reused ON Day — grafting it
on is a product decision (what does "next" mean once you're already on the
day-of screen?), not a wiring fix.

**"Should also be able to decline hiring anyone."** Confirmed: every
suggested vendor category (`unbookedSuggestions`, `hostv2/src/HostShellV2.jsx`
~18373) renders only an "Add" action — no decline/dismiss. The "People you
might hire" home-tile nudge (~10007) and this list will suggest the same
roles indefinitely even after a host has consciously decided to DIY
everything; `cat.altToDIY` shows the DIY alternative as text but there's no
way to record the decision. The established in-app pattern for exactly
this (a per-item "skip it" that's undoable) is `event.foodSkip` on the
shopping list — the natural fix is the same shape here
(`event.vendorDeclined`), but it also touches `src/lib/vendorPlan.js`'s
category list and the home-tile count, both shared/tested engine code, so
it's sized as its own piece of work rather than a same-turn patch.

## FIXED 2026-09-13 — Day tab and After tab were a hard navigation dead end

Host report while actually running today's real event through the app: "No
way to get back from day of." Reproduced live (Playwright), root-caused two
layers deep before touching anything:

1. `elegantMode = q.get('elegant') !== '0'` in `hostv2/src/HostShellV2.jsx`
   is inverted from its own documented intent — `styles.css:575-576` calls
   it a "Flag-gated test... `?elegant=1`," but the code makes it opt-OUT
   (`?elegant=0` required to disable). Every real host, with no query
   param at all, has been running in elegant mode.
2. `.dock.dock-retired{ display:none; }` hides the entire floating bottom
   nav (Create/Plan/The Day/After) whenever elegant mode is on — confirmed
   via `getComputedStyle`, not just the class name.
3. The documented replacement for the dock — an `.ev-eyebrow` "Menu"
   button that opens the phase-nav sheet, commented in its own code as
   "the ONE element every elegant screen keeps" — was only ever wired into
   one branch of the Plan tab's hero. The Day tab (both the live-clock
   branch and the pre-time-set preview branch a same-day event actually
   renders) and the After tab had **zero** navigation control on screen:
   no dock, no eyebrow, nothing. Confirmed by DOM inspection
   (`.ev-eyebrow` did not exist in the tree on Day), not just a screenshot.

**Fix:** added the same button — same class, same `setSheet({kind:'nav'})`
handler already used elsewhere — to the three screens that were missing
it. No new surface, no change to `elegantMode`'s default (it gates 61
call sites across this file's visual language; flipping it was out of
scope for a nav bug). Live-verified: Day (both branches) and After now
show Menu, open the nav sheet, and return to Plan correctly. hostv2 build,
the parity gate, and the hostv2-artifact drift gate (`npm run gate:hostv2`)
all clean; root Jest still 442/442 (hostv2 is a separate Vite app the root
suite doesn't import).

**Still open, reported same session, not yet fixed (see below for why):**
- Shopping-list "skip it" does not update the day-of run-of-show or the
  "How today starts" checklist text — those are static authored prose in
  each playbook's `schedules` block, not derived from `foodGot`/`foodSkip`
  state. Confirmed in `theCookout.js` and `playbooks/index.js`'s
  `effectiveRos`/`playbookRunOfShow`. This is a real architecture gap
  spanning every playbook (~40 files), not a one-line bug — scoping it as
  a project, not patching one file.
- `smartParseEvent.js` has no street-address extraction at all — only
  `venuePhrase` (named-place phrases like "my brother's house") and
  city/state (`parseVenueLocation`). A full address typed into the create
  sentence is silently dropped; the "Guests will ask where — add the
  address" prompt (gated on `!/\d/.test(vf.name)`) will therefore always
  fire for a home-hosted event, regardless of what was typed at creation.
  Address only ever lands via the separate manual "Add it" flow.
- Cookout's new `game_day` decision ("Is this cookout also a watch party?")
  is confirmed live on the decision board for today's real event — but
  it's the 6th of 6 open calls, collapsed behind "+1 more — show the rest,"
  and defaults to "No." Shipped and reachable, not surfaced prominently.

## ADDED 2026-09-13 — Cookout wings alternative + game-day decision (first day of NFL season)

Host directive: "Cookout should have chicken wing alternative. The [demo]
should also be built for game day. Today is first day of nfl season."
Two additions to `src/lib/playbooks/data/theCookout.js`, both verified
against the full 442-suite root Jest run (6,238 passed, 0 failed) before
commit — not just the touched-file scope.

**Wings:** added to `p_chicken`'s existing `alternatives` array as plain
text (pricing + the mambo/buffalo-sauce framing), the same pattern every
other protein alternative in this file already uses. **Two self-inflicted
regressions found and reverted on the way, worth recording so the pattern
isn't repeated:**
1. First attempt added wings as its own standalone `purchases` entry.
   That silently auto-summed into every Cookout plan's `foodHigh`/`foodLow`
   total (alternatives-as-text do not; a separate purchase line does),
   which collapsed a `reader.test.js` assertion (`foodHigh` delta between
   two fixture plans) to exact equality. Reverted to text-only.
2. Second attempt merged the wings citation into `p_chicken`'s existing
   `provenance`/`costProvenance`. That tripped `knowledgeInventory.test.js`
   ("ambiguous" claim, combined sourcing) and the `researchPolicyCompliance.test.js`
   ratchet (uncorroborated-claims count went down without a baseline
   update — that ratchet only permits a *tracked* decrease). Reverted
   `p_chicken`'s provenance to its original single-claim text; the wings
   price lives only in the alternatives string, which these corpus
   scanners don't parse.

**Game day:** new `game_day` decision (between `music` and `shade_seating`)
asking whether the cookout is also a watch party, defaulting to "No —
cookout only," framed as a logistics call (TV/sound), not a food one — it
does not resize the protein order by itself. First draft gave it an
`affects` array (`['p_wings']`, then `['p_chicken']`); both failed
`decisionWireProof.test.js`'s "declared effect is real" gate because none
of its 3 options actually move a quantity or cost. Removed `affects`
entirely, matching how `music`/`shade_seating` (also non-quantitative) are
authored in this same file. Added one `heartMoments` line ("a big play on
the screen and the whole yard erupts together") and updated `meta.summary`
to mention the game-day framing without pinning it to today's specific date.

Live-verify against the running app is the one item still open from this
change — code-level tests are green, UI behavior not yet clicked through.

## FIXED 2026-09-13 — "5 headcount" silently became 40 guests

Host report, reproduced exactly before touching anything: typing "5
headcount" into the create screen showed "~40 · typical" on the guest chip.
Same class of gap as the bachelor/bachelorette fix already in this file's
history — `COUNT_NOUNS` in `smartParseEvent.js` had no entry for
"headcount"/"head count", so the guest-count regex never matched, `guests`
stayed `null`, and `effGuests` fell through to `playbookTypicalGuests('The
Cookout')` — 40, the playbook's own default, standing in for the 5 the host
actually typed. Added both forms to `COUNT_NOUNS`. 2 new tests
(`smartParseEvent.test.js`), live-verified: the same input now shows "~5."

## FIXED 2026-09-13 — CI was red on `main` for 4 days, silently blocking every deploy

Host directive: "Has everything been pushed to prod?" The honest answer at
the time was **no** — `git push` had succeeded both times this session, but
that only means the commit reached GitHub. Checked the actual GitHub Actions
run for each push (`actions_list` / `get_job_logs`, not assumed from the git
result) and found the **Unit suite step failing on both**, which skips every
step after it — including the build and the Pages deploy. **The live site
has been serving commit `02f03cf` (2026-09-09) this entire session**; none
of today's fixes reached production until this was found and closed.

**Root cause, confirmed from the CI log, not guessed:** `lodgingOutlet.test.js`
hardcoded its fixture event's date as a literal — `{ date: '2026-09-11',
endDate: '2026-09-13' }`. `surfaceRegistry.js`'s lodging `raise()` opens with
`if (isPastEvent(event.date)) return [];` — once today's date passed the
fixture's, every row the test expects is silently `[]`. This ran green on
2026-09-09 (the fixture was still in the future) and started failing the
moment the calendar caught up to it — the exact drift class this file's own
HANDOFF already documents for the Repast fixture. Confirmed via `git stash`
that this predates every commit made this session; not something introduced
today, but something blocking today's (and the last 4 days') deploys
regardless of who pushed.

**Fix:** the fixture's dates are now computed relative to `Date.now()` (30
days out, 2-night span preserved) instead of a literal string, so this
class of failure cannot recur here. Verified: 16/16 tests in that file pass,
full root suite now genuinely 442/442 suites green — the first clean run
this session, not a suite with one excused failure.

**Still to confirm once this is pushed:** watch the next Pages deploy run
actually reach the `deploy` job (not just `build`) and go green — that is
the only real proof "pushed to prod" is true again.

## FIXED 2026-09-13 — the "Typical" budget ignored every playbook's own real cost data

Host directive: "find where the pricing budget is wrong — don't include
items not part of the plan for the spine." Traced to
`src/lib/budgetEstimator/totalEstimate.js`.

**The bug:** the "Your budget — Typical/Lean/All-out" number never reads
what the plan itself already knows. `PER_HEAD_BY_TYPE` has zero entries for
any of the ~20 home-hosted types (The Cookout, Fish Fry, Crab Feast, Sunday
Dinner, Housewarming...), so all of them fell to one flat **$30–120/head**
`home_hosted` family default — even though every one of those playbooks
already carries its own authored, type-specific `meta.perGuestCost`:

| Type | Playbook's own band | Estimator used instead |
|---|---|---|
| Fish Fry | $8–18/head | $30–120/head |
| Housewarming | $8–22/head | $30–120/head |
| The Cookout | $15–35/head | $30–120/head |
| Crab Feast | $25–60/head | $30–120/head |

Live-verified on the exact BBQ input from the previous session: a 15-guest
Cookout's "Typical" was **$1,400** before the fix (using the flat $30–120
band), **$500** after (using the playbook's own $15–35). Fish Fry could be
up to 6x its own playbook's number.

**The fix, deliberately narrow.** `estimateTotalRange` now checks
`getPlaybook(type)?.meta?.perGuestCost` ONLY when the type has no entry in
`PER_HEAD_BY_TYPE` — it fills the actual gap, nothing else. Every
already-curated type in that table (Wedding, Birthday, Reunion, Retirement
Party, Baby Shower, Bridal Shower, Sweet 16...) is untouched, even though —
this was the surprise mid-fix — **every one of them ALSO has its own
`perGuestCost` on its playbook, and it usually disagrees with the curated
table** (Birthday: playbook $15–60 vs. table $60–250; Reunion: playbook
$12–35 vs. table $60–200). Overriding those would be a much bigger, riskier
change than what was asked, and reconciling two independently-sourced price
datasets is a pricing-research call, not a missing-data bug. Left alone,
gated by a test that asserts the curated entry always wins.

**Still open, not fixed here — a separate, deeper mismatch.** "Typical" and
the plan's own real itemized total (the food/shopping list `hostSpending`
sums from `playbookFoodPlan`) are two independently-computed numbers that
were never unified, and can still disagree — now in the OTHER direction:
the same 15-guest Cookout shows "Typical $500" against a real itemized
total of "~$1,018 spoken for" once the food list is priced out. The
estimator's own copy claims "the plan sizes food, vendors and shopping from
here," which isn't true either way — the food plan sizes independently from
guest count, never from the Typical number. Making them agree means
picking which one is the source of truth; that's a design call for a board
sitting, not a code fix, and it's flagged here rather than silently implied
solved.

Files: `src/lib/budgetEstimator/totalEstimate.js`,
`src/lib/__tests__/playbookPerHeadBudget.test.js` (5 new tests). Full root
suite re-verified after the change: 6,236 passed / 1 skipped, same single
pre-existing `lodgingOutlet.test.js` failure (unrelated, predates this
session — confirmed via `git stash`).

## FIXED 2026-09-13 — "today" not parsed as a date, and a home venue misread as a destination trip

Driven from a real create-screen input: "Backyard BBQ at my brother's house in
Greenbelt, MD today at 3pm, about 15 guests." Two separate defects in
`src/lib/smartParseEvent.js`, both live-verified in `hostv2` (local dev
build) before and after.

**1. "today"/"tonight" had no relative-date handler.** "Tomorrow", "next
Saturday", "in 2 weeks" all resolved; the single most literal date a host can
say fell through to "no date yet." Added alongside the other relative forms.
Gated: `smartParseEvent.test.js` › `"today" / "tonight" resolve to the
current date`.

**2. The destination weak-signal fired on ANY resolved city with no signed-in
profile — including the host's own family's house.** `placeAway` used
`!homeCity || normCity(placeName) !== homeCity`; with no profile, `homeCity`
is `''`, so `!homeCity` was always true. A bare "in Savannah, Georgia" firing
this way is DELIBERATE, tested prior behaviour
(`destinationDetection.test.js`, `destinationBarePlace.test.js`) — the
file's own header says a miss here silently deletes the whole travel/lodging
stack, which is the costlier failure. That tradeoff was not touched.

The narrower, real bug: the text already says whose home it is
(`home`/`venuePhrase` — "my brother's house", "our place", "at home") and
those bare-city test cases never have that signal ("in Savannah, Georgia"
names no one's house). So the carve-out only fires for a NAMED PRIVATE HOME:
with no known home city to compare against, a named home stays local; with a
known home city, it's still compared normally (a relative's lake house in
another state still reads as travel). A bare city with no named home venue
keeps the old fire-by-default rule exactly as before.

**Why this matters beyond copy:** `isDestination` blends the budget estimate
toward the `travel_led` per-head band ($200–600 vs. `home_hosted`'s
$30–120) and is one of Model D's three paywall doors. Before the fix, a
signed-out host planning an ordinary local BBQ with a known city could get a
budget estimate ~5x too high (verified: $7,200 "Typical" for 15 guests vs.
the correct $1,400) and risked the destination paywall gate on a plan that
never left town.

**First attempt was too broad** (`!!homeCity && normCity(placeName) !==
homeCity`, no home-venue carve-out) and broke 2 test suites encoding the
deliberate tradeoff above (6 tests). Caught by running the full suite before
push, not assumed from the one file touched — re-run confirmed 6,231
passed / 1 skipped / 0 new failures against the narrower fix, only the
pre-existing `lodgingOutlet.test.js` failure remains (confirmed via `git
stash` to predate this session entirely).

Files: `src/lib/smartParseEvent.js`, `src/lib/__tests__/smartParseEvent.test.js`
(4 new tests, 2 existing tests corrected to pass a `homeCity` matching their
actual intent, which predated the HostShellV2.jsx call site's documented
contract for the absent-profile case).

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

**Corrected 2026-09-03 — this line said "the other half is not done" for all
four; three of four are.** `restoreBackup`, `importCustomEvents`, `listBackups`
are called from `HostShellV2.jsx` (settings → Your data), re-confirmed by grep
just now (:15435, :15399, :15359). Only `readWriteLog` still has zero callers.

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
