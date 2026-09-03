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

## What actually covers the behavior

`hostv2/e2e/` holds **50** Playwright specs, which do execute the shell. That
is the real instrument. The 35 text suites are best understood as **cheap
tripwires** that fail fast in a 12-second unit run rather than a 14-minute
matrix — valuable, but not evidence of rendered behavior.

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
