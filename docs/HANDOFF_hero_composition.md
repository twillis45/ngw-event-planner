# HANDOFF — Plan hero composition (board rulings A, B, C)

_Written 2026-07-30. Branch `grounded-decision-surface`, clean and pushed at `2a829b4b`.
Deployed and curl-proven: `HostShellV2-4b5ac5a6.js`. Suite 4145 green / 278 suites._

**All line numbers below are as of `2a829b4b` and WILL shift as you edit. Re-grep the
quoted code before trusting a number.**

---

## Read first (project standing order)

1. `docs/claude-skills/00_NGW_EVENT_PLANNER_MASTER_SKILL.md`
2. `docs/claude-skills/01_PRODUCT_ARCHITECTURE_GUARDRAILS.md`
3. `docs/claude-skills/09_CLAUDE_CODE_EXECUTION_DISCIPLINE.md`
4. For this work specifically: `02_STUDIO_MATTE_UI_STANDARD.md`, `ui-ux/UX_04_COMMAND_BOARD_HIERARCHY.md`, `ui-ux/UX_05_COMPONENT_PATTERNS.md`

## The law that governs this handoff

**A fix is done only when it has been DRIVEN LIVE in hostv2 in Chrome.** Not when it
compiles, not when the suite is green, not when a grep looks right. Two defects
shipped this session precisely because that step was skipped. If you cannot reach
the surface, say OPEN — do not claim it.

---

## C — DO THIS FIRST. It is a live defect with an exact root cause.

**Symptom:** the same hero component renders the ask ONCE on some events and TWICE on
others. Reunion (30d) shows H1 `Indoor or outdoor?` and no card title. Game Night
shows H1 `Who provides the food?` AND a card title `Who provides the food` under it.

**Root cause (verified in code, not inferred):** the card-title dedup compares against
`heroAskFor()`'s output, *not the H1 that is actually rendered*.

- rendered H1 for a decision: `hostv2/src/HostShellV2.jsx:5620` — `decRow.label + '?'`
- dedup: `:6158` computes `heroAsk0 = heroAskFor(a, event)` and passes THAT to
  `heroRecord` (`:370-380`), which suppresses the title only when the record adds a
  new word.
- `heroAskFor` has no decision branch. On Game Night it returns `"Decide the menu."`
  (`:321`, the `/serving|menu|food/` arm) while the H1 says `"Who provides the food?"`.
  Token set `{decide,the,menu}` vs record `who provides the food` → `adds === true` →
  title renders → **ask twice**.
- Reunion's record (`indoor or outdoor`) coincidentally overlaps its `heroAskFor`
  output → `adds === false` → suppressed → **ask once**.

Same component, opposite result, decided by a coincidence of vocabulary.

**Rule to implement:** the card title is deduped against **the ask that is actually on
screen**.

1. Hoist the `.ask` IIFE (`:5601-5624`) into one function/memo `heroAskText(queue[0])`
   returning the exact rendered string. Render `<h2 className="ask">{heroAskText}</h2>`.
2. `:6158` → `const rec = isHero ? heroRecord(a, heroAskText) : null;`
3. DELETE the `heroDecisionAsk` regex (`:6197`) and its use in the `<h3>` guard at
   `:6212`. It is title-prose sniffing — the same failure mode already documented for
   COI at `:6180` ("broke on the fifth title shape; classification rides the ACTION").
   With 1+2 the suppression becomes structural, not textual.
4. **Gate it:** extend the parity test to assert, for every seeded event's ask hero,
   that no `.hero-card h3` shares a >2-char token with the rendered `.ask`.

**Drive it on BOTH** Reunion (30d) and Game Night (2d) — the two events that currently
disagree. That disagreement disappearing IS the proof.

**Adjacent, do together:** fixing C makes the 26-char hero-ask cutoff *visible* rather
than fixed. See `:340-364` — it is self-documented, including the two things that
blocked me: `decisionShortLabel` (`src/lib/playbooks/index.js:~1990`) strips the `?`
deliberately for the short card form, and adding `ask: d.label` to `open.push`
(`~2602`) did NOT reach the queue item — it is built by another path. **Find that path
first.** Do not widen the cutoff blindly: a long declarative title genuinely does not
read as a hero; a question does.

---

## A — collapse to ONE disclosure on the first screen

**Correction to an earlier claim of mine: the two links are NOT the same offer.** They
are disjoint sets, and I was wrong to call them redundant:

- `:1632` discloses **other answer options for this decision** (in-place settle,
  `setDecDiscloseId`)
- `:6040` discloses **other decisions in the bundle** (`setBundleOpen`)

Both reading "3" is coincidence. `:6040` also counts the on-screen one, so it offers
"3" where only 2 are new.

**Implementation:**
- Delete the `later-row` sibling-decisions disclosure from the decision hero at
  `:6040`, and the same at `:6002` on the conflict hero. Those rows already live under
  the existing `.efold` "The rest of your plan" handle (`~6428`) — verify that before
  deleting, or you strip access.
- KEEP `:1632`, with two fixes:
  - **Strip the `›`.** That handler settles nothing and routes nowhere — it toggles
    `decDiscloseId` in place, so the glyph is false navigation under the standing glyph
    rule (render `→`/`›` ONLY when the handler routes).
  - Closed state becomes `Other ways ▸` (drop the count — the rows carry it), matching
    its own open state `Other ways ▾` at `:1628`.

Tufte dissented (wanted queue depth in place); overruled — depth is already published
in the hairline and the fold handle.

---

## B — keep the chip, cut the duplicated due line

**Correction to another claim of mine:** frame 13 is not "the no-proposal composition"
in conflict with grounding doctrine. Its content (*Ask about insurance → Message the
club*) is an **errand to a third party** — nothing to propose, the club holds the
answer. Frame 13 renders the ERRAND pole; the chip renders the DECISION pole. Same
skeleton, different action class. There was never a doctrine conflict.

**Implementation:**
- Keep the proposal chip. It IS the shipped grounded-action / propose-don't-ask
  pattern.
- Rams' dissent was sustained: `"Was due 30 days ago."` restates what the italic guide
  already says vaguely ("a few decisions are past their easy window"). At `:5570-5578`,
  when `queue[0]` is itself the overdue decision rendering in the hero, suppress the
  `slips` clause that names decisions. Keep the specific instance, cut the vague
  generalisation above it.
- Codify the act slot as **exactly one**, selected by ACTION CLASS, never by title
  regex:
  - `DECISION` (authored options) → `renderDecision`
  - `ERRAND` (outbound third-party, no proposable answer) → one named button (frame 13's shape)
  - `FIELD` → `editor-slot`
- Hero element budget: eyebrow · H1 · guide · one specificity line · ONE act · hairline.
  **Max one disclosure.**

---

## Frame 13 verdict

**PARTIALLY ADOPTED. Board scored the current state 8/10 — below the 10+ bar.**
Skeleton, element budget, void, one-loud-thing and centered ask are adopted and are now
the enforced spec. The single-button act slot is adopted ONLY for the errand class it
depicts. Its `"3 of 8 settled"` hairline is **superseded** — see `:6416`; that line
counts `lib/phaseProgress` PLAN PARTS (date, venue, headcount, food, budget), not
decisions, and now reads "plan parts handled". Do not read the frame as spec there.

The board re-sits after A, B and C.

---

## Also queued, unblocked, small first

1. **T-2d tail scroll — fix is IN and deployed but NOT DRIVEN.** Root cause was found:
   the tail row's own guard is `!queueOpen`, so `setQueueOpen` unmounts it, and a
   detached node's `closest('.app')` is null — three earlier attempts read the scroller
   inside the deferred callback, after the row was gone. Now captured before the state
   flip. `.app` is the real scroller (`styles.css ~114`). **Needs one drive on Game
   Night** (the tail only renders inside the day-before window).
2. **Q1b's CTA does not surface.** The seed works — `TEST_ROSTER_FINAL_COUNT`
   (`hostv2/src/eventPool.js`) reaches the right state live ("2 confirmed · 5 replies
   still out"), but the count decision is outranked by the decisions bundle so
   "Chase 5 maybes" never becomes the hero. **Ranking question, not a data question.**
3. **Frame 1's three observations** need a live look and a host ruling: the guide card,
   the inline snooze, the `THEN` prefix.
4. **Board Q5 — nav.** Ruled: both frames fail. Summoned sheet stays; add a resident
   **context/up rung** (event name → Portfolio); phases become a READOUT inside Plan,
   never a control.
5. **Board Q3 — portfolio state.** Spec debt, not a feature: `UX_04` already mandates a
   "Start Here" lane. Ship the switcher + summary line + **TRI-state** dot —
   needs you / all quiet / **not yet checked**. Norman's gate is hard: never
   green-by-default. Cheap deterministic predicate, memoized; full queue only on entry.
   The act goes on the elevated ROW, not a portfolio-level button (event pros
   overrode Rams on this).
6. **Frame 28 EVENT OVERVIEW** — fully specified, zero implementation.
7. **`destination` playbook blocks** — 4 of 39 files.
8. **Cost-share "Worth knowing" note** — CANNOT be derived like the airport/backup
   notes. A tier carries only label, amount, note — no group SIZE, so any sum against
   the stay total is wrong. Needs a "how many in this group" field first. Schema gap,
   not copy.
9. **Lodging surface** — host reported dense/hard to read; needs a Figma redesign +
   parity check. Two concrete defects in their paste: the first option shows NO price
   while others do, and every title prints twice. Separately, host asked for the
   **fees amount and total** in the shortlist rows — `fees` already exists on the model
   (`src/lib/lodgingIntel.js`) with the doctrine on it; rows just render "+ fees" with
   no amount and no total.
10. **Notion session update** — not run this session.

## Closed, do not redo

- Migration 016 — **applied**, verified against prod (`lodging_pick text` exists).
  Artifact 1 still calls it pending and deferrable; it is neither. Correct that artifact.
- The 26-frame Figma sweep is **complete**. Artifacts claiming "25 frames to audit" are
  stale. What remains is rulings, not audits.
- Artifacts 985889d7 / 69875315 are badly stale — B1–B4, item 8, invite pick, DIFM
  backup note and the whole day model A–F all shipped. Do not re-sequence from them.

---

## Verification recipe (do not shortcut)

```
cd demo/hostv2 && npx vite build && rsync -a --delete dist/ ../public/hostv2/
cd demo && CI=true npx react-scripts test --watchAll=false
cd demo && npm run build && npm run deploy && gh workflow run pages.yml
```

Then **curl-prove the chunk, not index.html**:

```
H=$(curl -s "https://twillis45.github.io/ngw-event-planner/hostv2/" | grep -o 'index-[a-f0-9]*\.js' | head -1)
curl -s "https://twillis45.github.io/ngw-event-planner/hostv2/assets/$H" | grep -o 'HostShellV2-[a-f0-9]*\.js' | head -1
```

Compare to `ls demo/public/hostv2/assets | grep HostShellV2`. A green Pages run can
ship a STALE hostv2. If the served hash looks old, retry with a cache-buster before
concluding the deploy failed — a CDN cache fooled me once this session.

## Traps that cost time this session

- **cwd drift.** `npm run build`/`deploy` must run from `demo/`, not `demo/hostv2/`.
  A failed build piped to `tail` still exits 0, so `&&` chains continue and a stale
  artifact deploys. Check build output, not just exit status.
- **Narrowed projections.** `money` in HostShellV2 (`~2250`) is a subset of `spend`.
  Reading a key it never carried gives `undefined` → `0` → silent no-render. Gated now
  by `narrowedProjectionProof.test.js`.
- **Vacuous tests.** `revealOneHeadcount` first passed because `foodPP: null` throws
  inside `playbookFoodPlan`, the builder's catch swallowed it, no food stage was built,
  and an `if (!food) return` skipped the assertion. **Always prove a new gate FAILS
  when you reintroduce the bug.**
- **JSX comments.** `{/* … */}` cannot be a sibling inside `{cond && ( … )}` — it is a
  second child. Put the comment above the guard or inside the function body. Cost two
  broken builds.
- **Chrome coordinate scale.** Screenshots are ~0.61× viewport and clicks use SCREENSHOT
  coords. Re-screenshot after any viewport change; my stale coords mis-clicked
  repeatedly and once set a rain backup on a demo seed that had to be undone.
