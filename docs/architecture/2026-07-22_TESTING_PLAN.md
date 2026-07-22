# The Testing Plan — catching what the host keeps catching

**Status: LIVE.** Every gate below runs today. This document is the map — what
each layer guards, how to run it, and the conventions for extending it so a new
surface, playbook, or editor is born covered.

Born from the 2026-07-22 live drive: eleven issues found by eye in one session,
then five more reported by the host *while the fixes were being built*. Each
was a member of a small set of recurring classes. The plan's premise: **every
class the host has ever reported gets a standing gate that fails CI before the
class reaches a hero again.**

## The classes, and who guards them

| Class (live incident) | Gate |
|---|---|
| **Inert decision** — settling changes nothing ("doesn't continue", W8: repast `food_source` wrote a key no engine read) | `decisionWireProof` |
| **Dead-end settle** — the tap fires a receipt but no next step rises (W14/W14b: count stepper, drift resolutions) | e2e `loop-advance` probe |
| **Machinery in copy** — internal ids, `undefined`/`NaN`, labels truncated through a parenthetical (W1 "(game night skews ligh…", W5 "vendor tdv-v2", "vendor v-…") | `hostStringLint` (engine strings) + e2e `display lint` (rendered copy) |
| **Silently dropped concern** — the compressed plan omits a family the canonical readers flag (W4: count missing while its buys showed) | `dayBeforeCoverageProof` |
| **Named concern with no way to act** (W14 class, the parking panel) | `dayBeforeCoverageProof` (route+CTA required) + e2e `loop-advance` |
| **Pinned-layer collisions & unreachable content** (W2/W3/W10: pill/bar/dock overlaps, rows occluded at scroll-end) | e2e `pinned geometry + scroll-end reachability` |
| **Invisible affordance** (W9: the pull handle outside the first viewport) | e2e `fold peek` |
| **Two readers, one truth** — private predicates disagreeing with canonical readers (bushels, committed-vendor, done-truth/W12) | `policyForkEnforcement` + `storedSchemaParity` (raw === open-set equality) |
| **In-place machinery bypassed** — an action with a real editor falls through to a generic route CTA (the COI report) | broadened detection + the seeded COI state in the e2e matrix |

## Layer 1 — engine proofs (jest, run with everything else)

`CI=true npx react-scripts test --watchAll=false` from `demo/`. ~3,700 tests.

1. **`src/__tests__/decisionWireProof.test.js`** — no decision may be inert.
   - Contract 1: every registered food-approach lever (exported
     `FOOD_APPROACH_DECISIONS`, 14 ids) with a caterer-ish option must flip
     `foodApproach()`. A *discovery clause* fails on any unregistered
     food-gating decision — classify it as a lever or `COMPONENT_LEVEL`.
   - Contract 2: on lever-less types, the generic `foodChoices.sourcing` answer
     must reach the engine.
   - Contract 3: declared `costFactors`/`affects` must move the food plan.
     `KNOWN_DEAD_EFFECTS` is a **ratchet** — currently EMPTY; a listed entry
     that starts passing fails as stale so the list only shrinks.
2. **`src/__tests__/hostStringLint.test.js`** — no engine string leaks
   machinery. Sweeps every string-emitting engine (eventPlan, dayAlerts,
   dayBefore, decision board, buy tasks) × 39 playbooks × 3 temporal states.
   Carries a **planted-incident canary**: real bad strings from live reports
   must be flagged — the canary has already caught two lint weaknesses.
3. **`src/__tests__/dayBeforeCoverageProof.test.js`** — every concern family a
   canonical reader flags (count / shopping / rain / vendors / tasks) must
   surface as an **open, routable, actionable** day-before section. Re-derives
   each concern from the same reader the plan should consult, so plan-vs-reader
   drift fails here.
4. **`src/plan/__tests__/policyForkEnforcement.test.js` + `storedSchemaParity`**
   — the one-overdue-policy suites. Since W12 closed, they assert
   `raw count === open-set count`: the done-truth lives inside
   `taskIsOverdue` itself; losing the clause splits the counts and fails.

## Layer 2 — the browser matrix (Playwright)

```
cd demo/hostv2
npm run build                                   # the matrix runs the BUILT bundle
PATH="$(brew --prefix node)/bin:$PATH" npm run test:e2e   # Node ≥ 18 required
```

`e2e/boardMatrix.spec.mjs` — real Chromium, own preview on :5233 (never the
dev server), fresh context per test (never the user's browser/profile).

**Seeded states** (the same roster the live drives used): Game Night T-2
(outdoor, deterministic stubbed forecast via route interception), Dinner T-1
(vendors **with a received-but-unverified COI** — the host's exact report
state), Repast T-3 (solemn), Graduation (past), Wanda (far-out).

**Probes per state:**
- **loop-advance** — tap the hero's first in-place settle (`.decopt`,
  `.cta.stay`); the board must move. *The dead-end class, mechanized.*
- **display lint** — rendered headings/buttons/labels against the same rules
  as Layer 1, on actual DOM.
- **pinned geometry + scroll-end reachability** — wheel to the scroller's TRUE
  end, then: visible pinned layers must not overlap, and the lowest genuinely
  visible content (clip-aware hit-testing) must clear the pinned stack.
- **fold peek** — the see-all pull handle intersects the first viewport on
  future-event ask screens.

**Harness lore (each cost a debugging round — don't relearn):** the splash gate
`Date.parse`s its seen-stamp — seed an ISO string, never epoch millis; vite
preview needs `E2E_BASE=1` (serve-mode base ≠ build base → blank mount with
asset 404s); bind `--host 127.0.0.1` (Node ≥ 17 resolves localhost IPv6-first
and the readiness probe never connects); `page.mouse.wheel` fires at the
un-moved pointer — `mouse.move` into the app first; a closed `.slidepanel`
keeps its children's rects — clip-check before hit-testing, and only a hit ON
a pinned layer counts as occlusion.

## Parity gate (runs inside every build)

`hostv2/src/parity/check-parity.mjs` — wired into `npm run build`. Fails when a
kit atom's locked value (`fontSize: 44`, TierRow padding) is re-inlined outside
`askKit.jsx`. Add a RULES entry per new atom.

## Conventions when adding things

- **New playbook** → the wire-proof enumerates it automatically; a misnamed
  food lever fails the discovery clause with instructions.
- **New engine that emits host copy** → add its strings to
  `hostStringLint.collectStrings` (one `push` line).
- **New ask surface / editor** → compose `askKit` atoms (the parity gate
  enforces the locked values); give every settle a way FORWARD (satisfied-roll
  or engine-clears) — the loop-advance probe will fail a dead-end.
- **New board state worth guarding** → add a row to the e2e `STATES` (an
  `id` + optional `patch` seeded via localStorage, like the COI state).
- **Found a new leak in the wild** → add the literal string to the lint
  CANARY first (prove the gate catches it), then fix at the canonical source.
- **A gate goes green on first try** → plant a defect and watch it fail
  before trusting it (the canary discipline; it has caught two lint bugs).

## Known boundaries & the roadmap

- The e2e display lint reads hostv2 only; the planner (App.js) is frozen and
  is guarded at the shared-engine layer only.
- The matrix runs one viewport (430×860). Adding a short-landscape pass
  (`viewport: 860×430`) is the cheapest next expansion.
- The matrix taps only the FIRST in-place settle per state. A full
  walk-the-queue pass (settle → assert roll → repeat until calm) is the
  natural deepening — the lifecycle proof does this engine-side already.
- CI wiring: jest runs everywhere; the e2e needs Node ≥ 18 on the runner and
  `npx playwright install chromium` — chain `npm run build && npm run test:e2e`.

*Tracker of everything these gates were born from:*
https://claude.ai/code/artifact/cc2fdaec-5d37-4ee6-8d6a-23cfe29163bf
