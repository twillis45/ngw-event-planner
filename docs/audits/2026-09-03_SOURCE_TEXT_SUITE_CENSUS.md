# Census: the suites that assert on source text

Date: 2026-09-03
Instrument: `grep -rln readFileSync src --include='*.test.js'`, then classified
by what each file reads.

## The number

A tech-debt pass reported "36 suites assert on source text". Measured: **58**
suites call `readFileSync`, and **35** of them read the `hostv2/` tree. The 35
is the finding's 36.

## It is not sloppiness. It is the jest root.

Zero tests `import` anything from `hostv2/`. All 35 read it as a **string**:

```
src/lib/__tests__/sendLedger.test.js:207
    require('path').join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8')
```

`react-scripts test` pins jest's `roots` to `<rootDir>/src` and does not expose
`roots` or `transform` for override without ejecting. `hostv2/` is a separate
Vite tree outside that root. So jest **cannot execute** the shipping host shell
— reading it as text is the only lever jest has on it.

This is already recorded in the codebase, in `src/lib/customEventStore.js`,
which explains why a guard for a hostv2 concern was written into `src/lib/`
instead:

> "jest does not compile the hostv2 tree. A guard nothing tests is not a guard
> — and this file was written the same day a syntax error in hostv2/src sailed
> through a fully green 5,451-test run."

## Why it matters — the failure mode is a FALSE GREEN

A source-text assertion proves a string is present in a file. It cannot prove
the host ever sees it. This session already hit that exact class twice:

- a panel shipped **invisible** (`opacity: 0`) past four green source tests,
  because `toBeVisible()` does not read opacity;
- the parked-decision shelf printed its own heading seven times while every
  source-level assertion about it passed — the defect existed only in the
  COMPOSITION of two files, which no single-file text assertion can see.

So the risk is not that these 35 are wrong. It is that a green run reads as
coverage of behavior it never touched.

## These are better than "assert on source text" makes them sound

Read before judging them. The idiom is not `src.includes('some copy')`. From
`heroComposition.test.js`:

```js
const raw = fs.readFileSync(SHELL, 'utf8');
// Code only: the comments deliberately quote the OLD strings ("See 3 other
// ways >") as the record of what was wrong, so the gate must read past them.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
...
expect(closed).toMatch(/>Other ways\s+\u25b8</);
expect(closed).not.toContain('\u203a');
expect(src).not.toMatch(/'See '\s*\+\s*alts\.length/);
```

That strips comments so a string quoted in a comment cannot false-pass, asserts
on JSX **structure** rather than prose, and carries **negative** assertions
against the specific broken construction. The authors already hit the obvious
false-pass and closed it.

So the weakness is not craft. It is reach: no amount of care in a static
assertion sees a runtime composition.

## MEASUREMENT NOT MADE — and two unsound attempts, recorded

I tried twice to measure how many of these claims are ALSO covered by an e2e,
and both probes were unsound:

- the first matched any quoted string of 12+ chars, which swept up **test
  names** ("the accept is BRIGHTER than the bookmark beside it"), code
  fragments (`, guestCount: 45, venueKind: `) and fixture data. It reported
  4%. Meaningless.
- the second looked for `<var>.includes('...')` where `<var>` held file
  content. It reported **0**, a false absence — the real idiom assigns through
  a comment-stripping `.replace()` chain the pattern never matched.

**No overlap figure is claimed here.** Both numbers are recorded only so the
next person does not rediscover the same two dead ends. The same over-loose
regex error occurred earlier the same day in a dependency gate, which is what
made it recognizable the second time.

## What actually covers the behavior

`hostv2/e2e/` holds **50** Playwright specs, which do execute the shell. That
is the real instrument. The 35 text suites are best understood as **cheap
tripwires** that fail fast in a 12-second unit run rather than a 14-minute
matrix — valuable, but not evidence of rendered behavior.

## BOARD RULING — 2026-09-03, under the standing delegation

Convened on the standing delegation of 2026-09-02 ("decisions are to be handled
by the review board"), which waives seat confirmation. Four archetype seats —
this is an internal toolchain call, so no named-person credentials are claimed
and none are needed; the lens was always the point.

| Seat | Catches what the others miss |
|---|---|
| **Legacy-code seam practitioner** — introduces test seams into trees that have none | That the question is WHERE THE SEAM GOES, not which runner wins |
| **Build engineer, CRA→Vite migrations** | The blast radius of a toolchain change, and what is leaving anyway |
| **Verification honesty** — "would this fail if the fault came back?" | A gate that cannot fail on the fault it names |
| **The maintainer who inherits it** | The option cheapest to write and dearest to keep |

### The framing in this document was wrong, and the board rejected both routes

Route 1 was written as "eject, or run a second vitest project." **Ejecting was
never required.** Measured this session: `hostv2/package.json` has
`vite`, `@vitejs/plugin-react`, `@playwright/test` — and **no vitest anywhere
in the repo**. Vitest added to hostv2 is *additive*: a second runner beside
jest, touching no CRA config, inheriting `vite.config.js` — including the
`@app` alias and the `dedupe` added earlier the same day.

So the real cost of "make the shell executable" is one devDependency and a
script, not an eject. The document had priced the expensive version.

### The ruling

**Sequence, don't choose.**

1. **Now — route 2, stated as a rule.** The 35 stay. They are careful static
   gates (comment-stripped, structural, negative assertions) and they fail in
   12 seconds instead of 14 minutes. But **a behavior claim needs an e2e**;
   a source-text gate is a tripwire and is never cited as behavior coverage.
2. **Next — add vitest to hostv2 as a second runner.** Additive, no eject, no
   CRA change. This is the seam, and it costs a devDependency.
3. **At CRA deletion — jest leaves with `react-scripts`.** The `src/lib` engine
   suites need a runner regardless, and by then vitest is already standing.
   Route 1 arrives at near-zero marginal cost *if step 2 happened first*.

**The seat that carried it** was the maintainer's: choosing route 1 today means
rewriting 35 working gates against a runner the repo does not yet have, to fix
a reach problem that 50 e2e specs already address. Choosing route 2 forever
means the shell is never unit-testable — the condition that let a syntax error
in `hostv2/src` pass a green 5,451-test run.

**Verification-honesty seat, dissenting in part, recorded:** step 1's rule is
unenforced prose. Nothing fails if someone cites a text gate as behavior
coverage tomorrow. It asked that step 2 not be deferred behind an unbounded
"next", on the ground that a rule with no instrument is a preference.
**Resolved the same session.** Step 2 was built rather than scheduled, and the
dissent is discharged. See below.

## STEP 2 BUILT — and the gap is now measured, not argued

`vitest` added to hostv2 as a second runner. No eject, no CRA change: it reuses
`vite.config.js`, so the `@app` alias, the jsx loader and the env `define` are
the same ones the app builds with. `test.include` is scoped to `test/**` —
mandatory, not tidiness, because the default glob swept up all 50 Playwright
specs and they failed on `test.skip()` outside a describe.

`hostv2/test/shellParses.test.mjs` **imports** the shell. Three tests: the
module evaluates and default-exports a function; the `@app` alias resolves from
inside the hostv2 tree; and the engine's parked reasons no longer equal the
shell's shelf heading — the composition defect fixed earlier today, checked in
the first place both files can be loaded at once.

### The red-proof, which is the whole argument in one table

The fault from `customEventStore.js` was reintroduced literally — a syntax
error in `hostv2/src/HostShellV2.jsx` — and both runners were pointed at it:

| Runner | On a shell that cannot parse |
|---|---|
| **vitest** (the new seam) | **FAILS** — `Transform failed with 1 error` |
| **jest** — `heroComposition` + `sendLedger`, which both read that exact file | **73 tests, all green** |

Seventy-three passing assertions about a file that does not compile. That is
not a criticism of those 73 — they are careful static gates and they check
things worth checking. It is the reach limit, measured instead of asserted.

Cost: one devDependency, one config block, one test file.

## Superseded — the original framing, kept visible

## Open — for the board, not for me

Two routes, and choosing between them is a decision:

1. **Make jest execute hostv2.** Move to a jest config that can (eject, or run
   a second vitest project over `hostv2/`). Upgrades all 35 from proxy to real
   — and costs a toolchain change on a tree scheduled to outlive the CRA.
2. **Keep them as tripwires, and require an e2e for every behavior claim.**
   Cheaper, but needs a rule that says which claims may live in a text test.

Route 2 is also the only one that survives the CRA deletion unchanged, since
`react-scripts` is what leaves.

**Not decided here.** Recorded so the choice is made deliberately rather than
by whichever is convenient in the moment.

## Correction

An earlier report in this session cited the count as 36 with no method beside
it. The method is at the top of this file; the number is 35 for the hostv2
subset and 58 for `readFileSync` overall. Both are reproducible from the
grep above.

## THE DISSENT IS DISCHARGED — and it was right within the hour

The verification-honesty seat objected that step 1 ("a behavior claim needs an
e2e") is prose with no instrument, and that a rule with no instrument is a
preference. It was right, and the proof arrived faster than the ruling:

**This document published "35 hostv2 text gates". By the end of the same
session the number was 36** — `seamRunsInCi.test.js` was added and nobody
noticed the count move. A rule that cannot survive one session is a preference.

`src/lib/__tests__/textGateRatchet.test.js` is now the instrument. It is a
**ratchet, not a ban**: adding a text gate stays legal, it just cannot happen
silently — bump `MAX_HOSTV2_TEXT_GATES` in the same commit and log why the
claim could not be an e2e. The choice becomes deliberate and reviewable.

Red-proofed by adding exactly what it exists to stop — a new text gate on
`HostShellV2.jsx` asserting a behavior claim. It fails and **names the file**.

It also caught **itself** on the first run (37 vs 36), because it reads files
and says "hostv2". Excluded by exact path, never by a name pattern, since a
pattern is a hole anyone can step through by naming a file well.

## Two numbers in this document were wrong. Corrected here, originals left above.

- **"35 hostv2 text gates" → 36.** Stale before the session ended, as above.
- **"50 e2e specs" → 50 total, 47 LIVE GATES.** Three `_*Capture` specs are
  dormant by design and say so in their opening lines. Five files match a grep
  for "not a gate", but two — `activationFunnel`, `crossDeviceSync` — only
  quote the phrase in comments *about* gate honesty and are live. Classifying
  from the grep alone would have retired two working gates on paper.

`npm run coverage:honesty` prints the decomposition on demand, so a claim about
coverage has the breakdown beside it instead of one headline number:

```
jest suites total                    438   execute demo/src — the shared engine
  ...of which only READ hostv2        36   TRIPWIRES. Cannot catch a parse error.
vitest files (execute hostv2)          1   the seam. imports the tree.
e2e specs total                       50   execute the built shell in a browser
  ...dormant by design (_*Capture)     3   render artifacts, never gate
e2e LIVE GATES                        47   the real behavior instrument
```

