# Cohesion batch F: the board, navigation and viewport layout (renders for owner approval, never merges)

**Plan:** the built-in Wanda sample. **Clock:** fixed at Tue, Nov 24, 2026 10:00, so the party is 116 days out. **Theme:** light. **Scale:** dsf 2.
- **Widths:** 390 (phone), 834 (11" iPad), 1024 (13" iPad, tall board), 1194×834 (iPad landscape, for #17) and 1440×900 (desktop).
- **Captures:** each is the screen as it shows at that size.

**before** is the live build (`main` at `5fa9fe9`, `npm run e2e:build`).

**proposed** is the same page with the change applied to its DOM, using the app's own markup (`render.mjs`):
- iPad landscape gets the desktop's own `header.tt-head`.
- "Who's confirmed" on phone and desktop gets the tall iPad's own `.tt-who-g` rows.

Nothing in the app was changed.

## The proposal, item by item

| Audit row | Rule | Before | Proposed | Where to look |
|---|---|---|---|---|
| **#13** What's counted jumps | 2 | The caret sits at y=140 on the phone, and the panel opens at y=1,801 and scrolls there; the caret ends at y=−1,473. The measured pairs (caret → panel) at the other widths: 834: 194 → 628, the caret scrolls to −1,281; 1024: 195 → 868; 1194: 154 → 1,286; 1440: 61 → 1,186. On the rail widths nothing on screen changes but the caret's ▾. | The panel opens **in place, directly under the line that holds the caret**. The rail widths use the hero's own "4 of 7 plan parts handled" line, because the caret sits in the narrow Where you stand card there. A slim "What's counted · Close ▴" bar heads it, and "Close what's counted ▴" ends it. Nothing scrolls. | `*__whats-counted-open__*` |
| **#38** pills 35 px | 9 | The "Calls to make / People / Checklist" pills measure 28 px tall in this build (266×28, 260×28, 278×28). | 44 px tall. | `proposed__whats-counted-open__*` (pill heights in measure.json) |
| **#14** no lit action on the board | 1 | Lit = 0 at every width. The hero is a choice card: "Tap one to settle it". | **One lit button under our pick: "Go with drop-off catering".** The lead line becomes "Our pick is first. Tap another to choose it instead — nothing else changes." Lit = 1 at every width. | `proposed__board__*` |
| **#15** one decision, three names | 8, 11 | Hero "Make the food call." over "How is the food handled? · 1 open"; the part-by-part row and the desktop NEXT pill say "Decide what you're serving · 1 open"; Calls says "How is the food handled?". | **The call's own question everywhere** below the headline: the part-by-part row and the NEXT pill read "How is the food handled? · 1 open", and every door opens that one call. The headline stays the hero's verb ("Make the food call."). | `proposed__whats-counted-open__*`, `proposed__board-worth__Wanda-sample__1440.png` (NEXT pill) |
| **#16** desktop "Worth having a plan for" floats | layout | It sits in grid column 2 of the hero grid: x=676, 363 px wide, beside an empty band. | It spans hero columns 1–2, so it starts at the hero's x=273 and is 765 px wide. | `*__board-worth__Wanda-sample__1440.png` |
| **#17** iPad landscape loses the title | layout | At 1194×834 the event name is inside one uppercase eyebrow: "116 DAYS · WANDA'S 50TH & 30-YEAR ARMY RETIREMENT — BLACK & GOLD · …". | **The desktop's header**: "SAMPLE · SAT, MAR 20 · 116 DAYS", then the title with its ▾ switcher, then "Black & Gold · Retirement + Birthday". | `*__board__Wanda-sample__1194.png` |
| **#40** "Who's confirmed" as a run-on sentence | 2, 5 | Phone and desktop print "Still waiting: Semper Catering Co., Gold Standard …", 12 items in one paragraph. | **The tall iPad's list**, used at every width: Vendors · 6 not confirmed, and Helpers & tasks · 6 not confirmed. Each row routes (›). | `*__board-whos-confirmed__Wanda-sample__{390,1440}.png` |
| **#46** a third door to the list | 8 | Every sheet shows "‹ Sections" beside the rail (1024 and up), as well as ☰. On touch it measures 67×16, and "Close" measures 64×28. | Where the rail is up, **"‹ Sections" goes** (the rail is the list). Where there is no rail (390, 834) it stays, at 44 px tall. "Close" goes to 44 tall. | `*__sheet-header__*` |
| **#47** rail "Narrow" | 4 | "Narrow" (aria label "Narrow the menu"). | **"Icons only"**. | `proposed__board__Wanda-sample__{1024,1194,1440}.png` |
| **#48** rail status line | 4 | "Active planning · 4 of 7 handled — Your plan is moving. food and vendors, plus 1 more still need you." | **"4 of 7 handled. Food, vendors and 1 more still need you."** | `proposed__board__*` (Where you stand) |

### Folded in by the parent: code-level, no visible change, so not rendered

| Item | Today (read from code on `5fa9fe9`) | Proposed |
|---|---|---|
| **"Then, in order": the venue filter's word rules** | `HostShellV2.jsx:14466–14467` hides a row while the board shows the venue box when `a.blockerType === 'venue-selection'` **or** its title matches `/^(name the venue\|add the location\|pick the place)/i`. HANDOFF (11/23, "NOT DONE") lists this as one of the title tests left after cause 1. | Read only the declared kind: `blockerType === 'venue-selection'`, or the producer's `askKind` (`ASK_KINDS` in `lib/heroAsk`) naming the venue. Producers that ask for the venue without declaring it gain the declaration. The `everyStepDeclaresItsTarget` shell scan gains this site, so no title regex comes back. |
| **Step routing fallbacks** | `checklistRouteFor` (`lib/taskRoute.js:64`) returns null when a step declares no target. The checklist row then has **no route button**, and "Then, in order" **drops the row** (`!!resolveRoute(a.route)` in the filter at :14466). `stepRoute` (:79) already falls back to the step's own checklist row, but neither caller uses it. Wanda's six host-written steps (for example "Lock catering") have no route. | **Never drop, never dead-end.** A step with no declared target falls back to its own row on the checklist (`stepRoute`'s fallback, through `routeSheet({ kind: 'tasks', focus })`). "Then, in order" keeps the row, with › to the checklist. Batch D's "Up next" uses the same fallback for its lit button (decision D4). |

## Measured (`measure.json`)

| | Lit on the board | Text < 11 px | Sideways scroll | What's counted pills | Taps < 44 (touch) in the panel |
|---|---|---|---|---|---|
| before | 0 at every width | none | none | 28 px | 3 pills, at 390, 834, 1024 and 1194 |
| proposed | 1 at every width | none | none | 44 px | none |

## Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| F1 | The board's lit action: **"Go with drop-off catering"** under our pick (proposed), or keep the board at 0 lit, as `oneLitButtonOnTheBoard` allows today? | **Lit.** Rule 1 says one lit action per screen. Today the card's only cue is "Tap one to settle it", and the pick card looks like a description. |
| F2 | The food call's one name: the **question** ("How is the food handled?", proposed, `callQuestion`) below the headline, or the verb ("Decide the food") everywhere? | **The question.** It is already the single source (11/23 ruling 4a), and Calls uses it. |
| F3 | What's counted on the rail widths opens under the **hero's progress line** (proposed), or inside the narrow Where you stand card? | **Under the hero line.** The card is 309 px wide, and the panel holds a 7-row list. |
| F4 | "‹ Sections" on sheets: **remove it where the rail is up** (proposed), or keep it everywhere? | **Remove it where the rail is up.** The rail is already the list, and ☰ stays. |
| F5 | The rail's "Narrow": **"Icons only"** (proposed) or "Hide names"? | **"Icons only"**: it says what she will see. |
| F6 | "Who's confirmed" at every width uses the tall iPad's list (proposed). Should the phone cap each group at 3 rows with "+3 more"? | Cap at 3 on the phone. The 12-row list is long under the fold. Not rendered; say if you want it. |

## What the build needs

- **View-only:** #13 and #38 (move the slide panel; pill min-height), #14 (one `.cta` under `.decopt.pick`), #16 (grid-column 1 / 3 for `.ef-watch` at the rail widths), #17 (iPad landscape takes the `tt-head` branch), #40 (the `tt-who-g` branch at every width), #46, #47 and #48 (copy and one condition).
- **One reader:** #15 needs the part-by-part row and the NEXT pill to read `callQuestion` (`lib/playbooks`) for the food call, as the hero card and Calls already do.
- **Code-only:** the venue filter (declared kind) and the routing fallback (`stepRoute`). No new data.

## e2e specs it would touch

- **What's counted:** `openWhatsCounted` in `fixtures.mjs` is shared by many specs. It waits for the panel's height and does not care where the panel sits, but check it. Also `aFinishedGroupCollapses`, `thePlanPartsReadAsEnglish`, `lensCountsMatchRows`, `everyTapIsFortyFourSquare` (add the panel pills), `mobileTapFloor` and `nothingPressableIsUnderTheFloor`.
- **Board hero and lit button:** `oneLitButtonOnTheBoard` (allows 0 today; tighten to 1), `boardMatrix`, `noHeroDeadEnds`, `decisionIdentity`, `aChosenCallIsNotACatchUp`, `fiftyHostsHeroClears` and `rankedReorder`.
- **Layout:** `aTallIPadGetsItsOwnBoard`, `aTabletTurnsWithoutLosingItsPlace`, `anIPadTurnedMidSessionReLaysOut`, `tabletLandscapeSplit` and the `_boardCapture` capture.
- **Who's confirmed:** specs reading `[data-who-waiting]`. Grep before building.
- **Sheet header:** specs that click "‹ Sections" or `.sheet-back` at 1024 and up. `openSectionByName` uses the rail there, not the back link.
- **Then, in order and routing:** `everyStepDeclaresItsTarget` (jest), `aCallStepOpensItsCall`, `aStepTheChecklistHandledIsNotCaughtUp` and `checklistFollowsDecisions`.

## Files

| File | What it shows |
|---|---|
| {before,proposed}__board__Wanda-sample__{390,834,1024,1194,1440}.png | The board's first screen: lit pick, rail words, the iPad landscape title |
| {before,proposed}__board-worth__Wanda-sample__{390,834,1440}.png | The lower zone, scrolled to "Worth having a plan for" (#16 at 1440; the desktop NEXT pill, #15) |
| {before,proposed}__board-whos-confirmed__Wanda-sample__{390,834,1440}.png | "Who's confirmed": the run-on paragraph vs the list (#40) |
| {before,proposed}__whats-counted-open__Wanda-sample__{390,834,1024,1194,1440}.png | Right after tapping What's counted: before (scrolled away, or nothing visible) vs in place (#13, #38, #15) |
| {before,proposed}__sheet-header__Wanda-sample__{390,834,1024,1194,1440}.png | Your money's header: "‹ Sections" beside the rail, and its tap size (#46) |
| measure.json | Per capture: what was applied, lit count, x and width of the moved blocks, caret and panel y, pill heights, floors |
| render.mjs | The render script (uses `../_tools/lib.mjs`) |
