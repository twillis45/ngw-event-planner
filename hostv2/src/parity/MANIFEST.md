# Parity manifest — host renders ↔ Figma boards

The living coverage map. Every ask/decision render family, its Figma board, and whether
it composes the parity kit (`./askKit.jsx`) or is still hand-styled. **A new Figma board →
add a row here → it reads "unwired" until a surface composes the kit.** "Did we cover
everything?" is a lookup on this table, not an investigation.

Figma file `3jKLC1z1Y0UGWNcenJGDQW`, page "▶ Multi-Option Display". Kit atoms:
`AskColumn · Eyebrow · BigValue · GuideLine · Grounding · CtaRow · TierRow` (+ `tone`
gate for the solemn state).

| Render family | Runtime location | Figma node | Kit? | Status |
|---|---|---|---|---|
| Budget — Proposed (B1) | `budgetEditorBlock` PROPOSED | `344:61` B1 | ✅ | done, live |
| Budget — Agreed (B2) | `budgetEditorBlock` AGREED | `344:61` B2 | ✅ | done, live |
| Budget — Change (B3) | `budgetEditorBlock` CHANGE | `344:61` B3 | ✅ | done, live |
| Day-of — propose times | Walk-it pencil banner | `331:61` (propose `337/339:61`) | ✅ | done, live (compact density) |
| Day-of — default/honest unset (state 1) | Walk-it (rebuilt ~6905+) | `331:61` state 1 | ✅ | REBUILT to Figma (2026-07-19): eyebrow "TODAY · YOU RUN IT" → "First thing" → big moment NAME (split from segment on `:`/`;`) → serif-italic guide → ONE honest line "• You run this · ~30h · Set a time ›" → "Done — next" → single condensed UP NEXT → quiet "N of M done". |
| Day-of — times set → clock (state 2) | Walk-it eyebrow | `331:61` state 2 | ✅ | REBUILT: time promotes to the eyebrow ("10:30 · NOW · you run this", amber) — the NAME stays the hero. Figma DEMOTES the giant clock (correcting my earlier "clock is a signature" error). |
| Day-of — **solemn tone (state 3)** | `isSolemnEvent` + `solemn` gates | `331:61` state 3 | ✅ | done, live — Repast/memorial: no count, verbs → "Continue when ready"/"You lead this", serif heading, no chime, gentle completion. Verified on a live Repast. |
| Day-of — print (state 4) | `.printsheet` (~12160) | `331:61` state 4 | n/a | done (print stylesheet, not screen atoms) |
| Decisions (menu/timing/count) | `renderDecision(nd)` + adapters | (unified surface) | own kit | done — see `project_unified_decision_surface` |
| Reveal — 3 directions | `revealStep` choreography | `319:60` | ⏸ | **TABLED** (2026-07-19). Board RULED **B** (build-ledger, name-last) — runtime already IS B. Refine to: ≤4 grounded rows (label/value + hairline), each number qualified by its basis; keep name-climax + one primary ask; A's one-line proof = sparse-data fallback; **solemn-aware** (repast drops celebratory framing). C rejected (honesty risk + solemn-harmful). NOT implemented — parked. |

## Fast-follows (leverage order)
1. ~~Solemn tone gate (state 3)~~ ✅ DONE (2026-07-19). ~~Follow-on: seed a real Repast SAMPLE~~ ✅ DONE — `src/data/repastSampleEvent.js` (`ev-x-repast`, "A Repast for Deacon Willie Hayes") registered in eventPool (ALL_SAMPLES + ROSTER_IDS). Live-verified: The Day renders the 76px clock (state 2) + serif heading + "Continue when ready" + "The rest, in their time" together.
2. ~~Day-of states 1-2 onto the kit~~ — my "REFUTED, already DRY" call was itself WRONG (user caught it 2026-07-19): I proved the day-of was code-DRY and conflated that with matching Figma. DRY ≠ matches-the-design. The runtime day-of was the OLD busy layout (moment card + input widgets + full list) with honest-time behavior bolted on — NOT the calm Figma `331:61`. **NOW REBUILT** to the one-moment layout (see the two rows above). Lesson: "already centralized in code" is not "already the redesign" — check the SCREEN against Figma, not just the code's DRY-ness.
   → Kit scope still holds (it converges INLINE-styled ask atoms); but a CSS-class surface can still be visually wrong vs Figma and need a real redesign — as the day-of did.
3. Reveal `319:60` onto the kit + its redesign directions.
4. Extend `solemn` beyond day-of: ✅ chimes DONE — `feedback('magic')` now gated on `!isSolemnEvent(event)` at the reveal choreography (2 spots) + the all-clear payoff. REMAINING: soften celebratory hero copy/verdicts + the green payoff-card language/animation for solemn.
5. Reveal `319:60` → kit + its redesign directions (older `revealStep` render). [was #3]
6. ~~Enforcement gate~~ ✅ DONE — `src/parity/check-parity.mjs` fails (exit 1) if a kit atom's locked value (`fontSize: 44` BigValue, `'13px 16px'` TierRow) is re-inlined outside askKit, or the kit isn't imported. Wired into `npm run build` (runs before `vite build`). **Deploy dance now uses `npm run build`, NOT `npx vite build`**, so the gate runs every deploy. Add a RULES entry here whenever a new atom is added. Verified: passes clean, correctly flags injected drift.
   → WIDENED 2026-07-19 (the audit found CSS drift evaded it): now also SELECTOR-SCOPED-scans styles.css — flags a raw hex / `13px 15px` inside `.hero.elegant .confrow{`/`.confrow:hover`/`.whytog:hover`/`.verdict`. NOT a global value ban (those hexes are legit elsewhere) — it tests only the matched selector's line.

## Command-hero parity audit (workflow, 2026-07-19) — 12 confirmed, adversarially verified
Ran the `command-hero-parity-audit` Workflow (8 surfaces × find→verify; verify killed 8 false positives incl. the whole below-fold-then surface + several "raw px is drift" claims the kit itself contradicts).
**5 P1 FIXED + DEPLOYED (HostShellV2-b796cf6a.js, run 29715001927):**
- guide voice `.hero.elegant .verdict` raw hex `#b9c2c9` → `var(--ink-soft)`.
- decision-hero `renderDecision` why (~1508): dropped `opacity:.82` on already-muted `.grounding` (WCAG doctrine — recession via pre-blended tokens, NEVER opacity), token margin.
- conflict-hero `.confrow` (styles.css ~430): raw hex `#20242a`/`#262b31`, `13px 15px`, `12px` → `var(--card)`/`var(--steel-tint)`/`13px 16px`/`var(--r-md)` (it was a by-eye TierRow parallel).
- date editor `.grounding` ×3 (~3825/31/33): dropped `opacity:.85` (same WCAG doctrine).
- guests input (~3658): axis-inverted `padding:'10px 6px'` → `var(--field-compact)`.
**7 P2 SWEPT + DEPLOYED (HostShellV2-c104a08e.js, run 29715305989):** decopt notes `#96a0a9` → `var(--muted)` (×3); budget CHANGE-drawer `padding:'10px 14px'` → `var(--field)` + `gap={12}` → `ASK_COMPACT.whyToCta`/`ctaToFoot`; payoff raw-px font-sizes → role tokens (`.ac-t`→`--t-note`, `.ac-l`→`--t-meta`, `.ac-meta`→`--t-tag`, `.ac-next`→`--t-body-s`); payoff green accent reduced to ONE (bar keeps `--ok`; `.ac-voice`→`--ink-soft`, `.ac-count`→`--muted`, lead time→`--steel-soft`); `.eprog-rule` `rgba(255,255,255,.09)` → `var(--line-soft)`; diet-count digit-shift fixed with `font-variant-numeric:tabular-nums` on `.of` (the counters all reuse it). PARTIAL: the `.of` stepper-value `fontWeight:700` re-inline (5 sites) — a shared numeric atom is deferred (the visible bug, digit-shift, is fixed).

## "Decide the menu" — GAP CLOSED (2026-07-20, deployed HostShellV2-2accd5c2.js)
The food editor (`renderEditor` kind==='food') now routes through the SAME `renderDecision(foodDecisionND())` the hero uses — retired the parallel inline-`.chips` render. Two enabling changes: (1) `renderDecision` gained a SETTLED branch — when `nd.selected` is set, it shows EVERY option as a full-width `.decopt` row with the chosen one highlighted (`.pick`) + a "chosen" badge, all tappable to switch (no disclosure/collapse); (2) `foodDecisionND` now carries `selected: event.foodChoices.sourcing`. LIVE-VERIFIED on :5129: "We'll cook it" highlighted + "chosen" badge + note, "A caterer handles it"/"Potluck" as matching rows w/ notes, "Open the spread (8 items)" as a subtle secondary — matches Figma **369:60**. Design boards: existing **7:38**, redesign **369:60** (both in file 3jKLC1z1Y0UGWNcenJGDQW).
FOLLOW-UPS #1-#3 — ALL RESOLVED (2026-07-20, deployed HostShellV2-fb613948.js, run 29736575787):
- #1 grounding copy ✅ — `heroDecisionAsk` guard (isHero && domain==='food' || /serving|decide the menu|the spread/) suppresses BOTH the generic "N of M already handled" consequence AND the redundant "What you're serving · N open" record on the food/menu ask (mirrors `heroBudgetAsk`). LIVE: "Decide the menu." → decopt rows directly, matching 369:60.
- #2 receipt+Undo ✅ ALREADY WIRED (Prove-the-Plan — I'd mis-listed it): `patchEvent` fires `setHeroReceipt({msg,fn:undoFn})` in askMode+plan+no-sheet; the MAIN ask hero renders `{isHero && heroReceipt && <div className="receipt">…<button>Undo</button>}`. LIVE-VERIFIED on the food decision: tapping an option switches the chosen row AND shows "• Food planned: … — the plan just recomputed. [Undo]".
- #3 editors-nonkit — mostly a Prove-the-Plan REFUTATION: the date/count/guests editors are FORMS (steppers/pickers/inputs), NOT display-ask surfaces, so they're out of the kit's scope (which converges eyebrow/big-value/grounding/cta display asks). P1 inline drifts already fixed (date opacity, guests padding). Closed the one real DRY item: a shared `.step-val` class (fontWeight:700 + ink-soft + tabular-nums) replacing the re-inlined stepper treatment at 4 sites (diet/seats/tables/kids).

DONE (spread redesign): "The spread & shopping" Figma board built (`378:60`) — the `flexWrap`→`layoutWrap='WRAP'` retry worked.

## "Decide the menu" — three more fixes (2026-07-20, deployed HostShellV2-a98b1e7b.js, run 29738065592)
- **Guide grounding restored** — #1's subhead-suppression left the food decision with NO grounding; added the guide voice back via the kit `<GuideLine>` in the food editor (`fnd.proposed?.why || fnd.why` — "At about 75 guests, most hosts hand the food to a caterer…"). Matches Figma 369:60.
- **CENTERING root-caused + fixed** — geometry inspection (not guessing): `.escreen.on` had `min-height:calc(100dvh-40px)` = the browser VIEWPORT (~1198px), but its scroll container `.app.app-elegant` is only ~852px in the device mock. So the first screen overshot the mock by ~350px, `ecenter` grew to fill it, and the centered cluster's lower void + foot fell below the fold → read top-heavy. FIX: `.app.app-elegant{ container-type:size }` + `.escreen.on{ min-height:calc(100cqh-40px…) }` — sizes the screen to its scroll container. On-device 100cqh==100dvh (unchanged); in the mock it now == 852px. VERIFIED: escreen 1198→812px, cluster center 426 ≈ escreen center 442, void 156/135, foot visible. Affects ALL elegant asks uniformly (budget/date/conflict).
- **`.decopt` row token drift** — the food decision ROWS themselves had the SAME drift as `.confrow` (raw hex `#20242a`/`#262b31`/`#282d33` + `padding:13px 15px`) → tokenized to `var(--card)`/`var(--steel-tint)`/`13px 16px`/`var(--r-md)`, and added `.app-elegant .decopt{` to the gate's CSS selector scan (now 5 hero selectors).

STILL OPEN: extend the Figma menu board `369:60` with its below-fold (per the new [[feedback_figma_redesign_full_screen]] rule — hero + below-fold together).

## "The spread & shopping" — RUNTIME ported to Figma 378:60 (2026-07-20, deployed HostShellV2-6a41ac12.js, run 29770262609)
The board was built in Figma (`378:60`) but the runtime food SHEET was still the old busy layout (user caught it: "parity has not happened for this"). Ported the top region to the calm comp, live-driven in Chrome (:5129, food sheet, 0 of 9):
- **Hero composes the kit** (378:64-71): the hand-styled `.eyebrow`+inline-44+`.mega-sub`+one-line grounding → `Eyebrow` → `BigValue` → **`GuideLine` (Newsreader italic — was plain sans)** → two `Grounding` lines + a muted `est. prices · <vintage>` line. This ALSO closed a real anti-drift violation (the food hero was hand-rolling atoms the kit owns).
- **Dietary needs / Your choices** (378:72-83): `.fstatus-row` side-by-side cards → `.fstat` full-width hairline rows (label-left · value+`›`-right, one divider between); value neutral steel until resolved (was amber-on-open → calmed to match comp).
- **Sourcing tiers** (378:94-110): borderless `.line` rows → `.srctier` bordered CARDS (active tinted `--steel-tint` + `--steel-soft` border + green "current"); footer note → serif `GuideLine`.
- Category rows (Food/Drinks/Supplies) already matched the comp's circular-badge rows (the `.fgroup` accordion badges) — left functional. All handlers (diet open, choices open, `patchEvent({sourcing})`, item checkoff) preserved — pure restyle.
- New CSS: `.fstat-list`/`.fstat`/`.fstat-chev` + `.srctier*` (tokens only — `--line`/`--steel-soft`/`--steel-tint`/`--ok`). Parity gate passed. Proof: live JS 200 + contains `srctier`/`fstat-list`/`fstat-chev`; live CSS contains `.srctier`.
- FOLLOW-UPS (deferred, noted to user): action-row labels/order ("Copy…/Dietary note" vs comp's "Copy…/Open the food plan/Dismiss"); a `.meal-picks` line renders above Dietary when RSVPs carry meals (honest extra data, absent from the comp's empty-state event). Consider adding `.srctier`/`.fstat` to the gate's CSS selector scan.

## (superseded) "Decide the menu" settled-food state — NOT parity (2026-07-19), editors-nonkit
The food EDITOR (`renderEditor` kind==='food', ~3849) renders the settled sourcing as a bespoke `.chips`/`.line` block — diverges from the kit-clean budget AGREED: was lowercase "change" (→ fixed to "Change"), no grounding line, and the generic hero subhead ("N of M already handled", `CommandCenter.jsx:2841`) competes above it (the same subhead suppressed on the budget ask, NOT suppressed here). CTAs are TRUTHFUL ("Change" reopens sourcing; "Open the spread (8 items)" opens the real 8-item menu) but inconsistent (`.chip` vs kit CTA, muddy primary/secondary). Full fix = the editors-nonkit → kit refactor (the food/date/count/guests family onto `AskColumn`/`Eyebrow`/`Grounding`/`CtaRow`, + suppress the generic consequence subhead on decision asks like `heroBudgetAsk`).

## Fold-behind-Change doctrine (2026-07-20) — the `SettledRow` atom
A **settled single-value choice** must not sit on screen as a row of preset chips that wraps — it folds to one hairline row (`label · value ›`) that opens the picker on tap. Codified as `SettledRow({label, value, onOpen, tone})` in `askKit.jsx` (composes the `.fstat` hairline treatment; the chevron IS the change affordance — no redundant "Change" word, matching the budget/vendors/food rows already live).

**Fold when ALL:** single settled value (one field, `aria-pressed`) · ≥3 options OR wrapping chips · the value reads on its own.
**Stays inline when ANY:** binary/2-option toggle (By list / By headcount, yes/no) · an active "decide it now" surface where the options ARE the content (the menu-sourcing decision hero / `renderDecision`) · multi-select (diet counts, meal tally).

Already folded (reference impls): budget change drawer, vendors market picker (`Which market ›`), food `How it's sourced` / `The list`, the food menu decision. Fold sweep targets: rain backup presets, invite style, gift wish (+ whatever the app-wide audit surfaces). Both runtime AND the Figma frames compose the same row so they can't drift. Anti-drift signal: a wrapping preset-chip cluster bound to a single settled field is a fold miss.

## Ground-in-code doctrine (2026-07-20) — no invented frames
Every Figma frame is grounded in the sheet's **real render code** — inventory its actual copy strings, fields, and states first (read the code / run an inventory agent), then design from those. **Never build a frame from a one-line description.** This applies to designs exactly as the no-fake-data rule applies to runtime. Sample values that stand in for a host's data (a guest name, a dollar figure) are fine as mock content; inventing *structure, fields, labels, or UI elements the sheet doesn't have* is not. The venue/help/ask/pass/qr utility frames were first built from vague descriptions and invented content (a hero venue had no, fields that don't exist, wrong example chips, a fake "grounded" tag, wrong perk copy) — caught and rebuilt against ground truth `443/444/446/447/449`. The grounded set (vendors/guests/travel/space/seating/risks/runners) came from detailed code specs and held up.

## Anti-drift rule
Editors/asks must compose the kit, never hand-style the atoms. If you find yourself typing
`fontSize: 44` / `marginTop: 20` / a full-width tier `<button>` inline in a render, stop —
use `BigValue` / `CtaRow` / `TierRow`. A raw hex/px in these families is the drift signal.
