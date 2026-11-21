# 02_STUDIO_MATTE_UI_STANDARD.md

You are designing and implementing UI for NGW Event Planner.

The visual standard is Studio Matte.

## Decisions 11/20/2026 — one doctrine, two copies unified

The workspace copy of `docs/claude-skills/` is canonical; the app repo carries a
byte-identical synced copy. On November 20, 2026 the two copies, which had
drifted apart, were merged. Each disagreement was settled one of three ways:
**owner ruling** (the owner decided it), **resolved by code** (the rule that
matches what `hostv2/src/styles.css` ships today wins), or **union** (the rule
existed on one side only and conflicts with nothing, so it is kept).

1. **Fonts** — owner ruling, 11/20/2026, corrected the same day: the device's own system font for everything read or tapped (no web font loaded); two accent serifs, each with one job — Newsreader for the italic "why" lines, Playfair for display titles (UX_01 § Font Stack). The first draft named Inter and Playfair alone; measuring showed Inter is not loaded and the "why" lines are Newsreader, and the owner approved the correction.
2. **Gradients** — owner ruling, 11/20/2026: exactly three, each a named token (§ Gradients below): `--canvas-glow`, `--cta-grad`, `--carbon-panel-grad`. The owner chose the primary-button gradient after a rendered flat-vs-gradient comparison on the live site: the same steel lit from the top, with a top highlight and a small shadow. Supersedes the 2026-08-18 "rule is the angle" amendment and the bare "fake gradients" line.
3. **Tap targets** — owner ruling, 11/20/2026: 44×44, both axes; inline text links in a sentence are exempt when no other tappable target is within 24px (UX_03 rule 2). Supersedes "44px tall," and raises UX_05's 32–36px icon-button and 32px chip tap areas to 44×44.
4. **Type floor** — owner ruling, 11/20/2026: 11px minimum; 12px for anything carrying meaning (status, price, date); 11px only for uppercase labels and fine print (UX_01). Supersedes the app repo's 10px floor; UX_04, UX_05, and UX_09 sizes below 12px on meaning-bearing text were raised to match.
5. **Canvas glow** — owner ruling, 11/20/2026: new doctrine line, token `--canvas-glow` (§ Canvas glow below; UX_01 Canvas row).
6. **Stat size** — resolved by code, 11/20/2026: `--t-stat` ships 38px ("bumped 34→38"); UX_01 now says 38, and UX_04/UX_05 stat numbers point at the 24–38px tokens instead of 22–28px.
7. **Type scale** — resolved by code, 11/20/2026: the tokenized host scale (body 15.5–16px) matches the `:root` `--t-*` block; the app repo's older 13–14px body scale is retired.
8. **Page gutters** — resolved by code, 11/20/2026: phones ship 20px (`.content` inline padding `--sp-5`); UX_01 and UX_03 said 12–16px and now say 20px.
9. **Button radius** — resolved by code, 11/20/2026: buttons ship 12px (`--r-md`, `.mini`), 14px (`--r-row`, the `.cta` family), or pill (`--r-pill`); UX_01 and UX_05 said 6–8px.
10. **Tap token** — resolved by code, 11/20/2026: the doctrine floor stays 44 (ruling 3); `--tap-min` ships 46 as deliberate 2px headroom and is what new controls consume.
11. **Execution commands** — resolved by code, 11/20/2026: 09 lists the repo's real scripts (`verify:push` etc.); the workspace listed `npm run lint`, which `package.json` does not define.
12. **Input floor 16px** — union, 11/20/2026: kept from the workspace (UX_01).
13. **Consume the type tokens** — union, 11/20/2026: kept from the workspace (UX_01).
14. **`--lh-body` 1.5** — union, 11/20/2026: kept from the workspace (UX_01).
15. **Boot-splash contrast exception** — union, 11/20/2026: kept from the workspace (UX_02).
16. **Void budget** — union, 11/20/2026: kept from the app repo (UX_01).
17. **`isWide` from 1024, the height axis, `wide` ≥1536, `desktop-short`** — union, 11/20/2026: kept from the app repo (UX_03).
18. **One gate** — union, 11/20/2026: kept from the app repo (UX_03).
19. **QA matrix includes 1280×654 and 1024×768** — union, 11/20/2026: kept from the app repo, and 1280×654 added to the workspace's testing list (UX_03).
20. **Display-ask clause** — union, 11/20/2026: kept from the app repo (UX_04).
21. **Abandoned canvas, phone disclosure at a desk, no density floor** — union, 11/20/2026: kept from the app repo (UX_04 anti-patterns 7–8 and the ruling under them).
22. **UX_10 Typographic Language** — union, 11/20/2026: added from the app repo, still a draft; where it conflicts with rulings 1 and 4, the rulings win (noted at its top).
23. **REVIEW_BOARD_ROSTER.md and NGW_10PLUS_MASTER_PROMPT.md** — union, 11/20/2026: each existed in one repo only; both now live in both.
24. **The gradients that predate ruling 2** — owner ruling, 11/21/2026 ("Keep"): the 56 gradients in 37 rules that existed before the three-token rule (edge-fade masks, the dock glass, the creation reveal, the welcome and splash, the invitation paper, the done and spotlight effects, the People plate veil, the lodging photo scrim) stay as they are. `hostv2/test/gradientDoctrine.test.mjs` freezes each in its `KNOWN` table by rule and count, so none can grow and none can be added. Every NEW gradient is still one of the three tokens.
25. **Light theme: a warm canvas, sections on white panels, a one-line sign-in.** Owner ruling, 11/21/2026, made from rendered full-scroll phone comparisons ("W1 and s2").
    - **Light canvas.** The light canvas is warm, not steel. `--bg` is #F2F0EC; `--bg-band` and `--field` are #ECE9E4; `--line` is #D8D2CA; `--muted` is #5d5a56, which measures 6.0:1 on the page. The light canvas glow is a faint warm wash, still the one `--canvas-glow` token.
    - **Steel stays.** Every accent and structure color stays steel: buttons, links, the Next bar, "our pick".
    - **Panels.** Each distinct block of a screen or sheet sits on a white panel (`--card`, a `--line` edge, a soft shadow), so sections read as separate objects.
    - **Dark theme.** The dark canvas stays steel.
    - **Sign-in.** The sign-in prompt is ONE row in both themes, with the same dimensions in each: "**Not saved yet.** Sign in to keep it.", then a primary Sign in button, then a ✕ that does what "Not now" did. Every target is 44×44. This supersedes the two equal gray buttons, which gave no primary and whose copy measured 4.48–4.53:1 over the glow.
    - **Supersedes.** For light mode, this supersedes the "steel glow" wording in ruling 5 and § Canvas glow.
26. **The iPad board at 1024–1279: "Where you stand" beside the question (owner ruling, 11/21/2026, made from rendered Current / Narrow / Full comparisons: "Narrow").**
    - **What moves.** On boards 1024–1279 wide, only the "Where you stand" stat column (`.bento`: progress, guests, budget) moves beside the question, as it does at desktop. Every other board zone stays below the fold.
    - **Tall screens.** On screens 1000px or taller, the question sits at the top instead of centering.
    - **What this amends.** Three earlier rulings, for this range only:
      - The fold rule (`foldAtTheFoot`): the stat column is now allowed in the first screen; everything else still is not.
      - The 2026-08-07 single-column board.
      - The 2026-08-17 ruling that tall portrait screens center the question.
    - **The progress bar spans the board** (owner, 11/21/2026: "For narrow expand the progress bar"). In this range the seven-part progress bar ("5 of 7 · Food and Vendors open") runs the full width of the question column and the stat column together. It does not shrink to the question column's 433px. It sits at the top, under the event eyebrow, as at desktop (owner, 11/21/2026: "Lock in at the top"). It is not at the foot by the fold handle: on a 1366-tall screen that left it about 1,200px from a top-aligned question. Its cost is about 50px of the question's height, and the question still fits the first screen at 1024×768.
    - **Why not the full two-column board.** The owner considered it and declined. At 1024 its work columns are 179px wide and text breaks mid-word.
27. **Sheets from 1024 up: the full column, never taller than the screen (owner ruling, 11/21/2026, made from rendered sheet-size comparisons: "B").**
    - **The shape.** From 1024 wide, where the side rail appears, every sheet fills the content column: one shape across the 1280 boundary, with no 680px panel jumping to a full column. This keeps the 8/3 and 8/21 rulings that a section fills the column at desktop.
    - **Height.** A sheet's frame is capped to the screen height, so its title and Close are always visible. Test it at 1280×654, where the shopping sheet once opened with both off-screen. The page behind the sheet must not scroll while it is open: use `overflow: clip`, never `hidden`, because `hidden` can still be scrolled from code.
    - **What was declined.** The audit's single centered 680px panel. It dropped the desktop list-with-detail layout, and it only fit at 1280×654 because of where the page happened to be scrolled.
28. **On touch screens, the app frame is full-bleed with square corners** (owner ruling, 11/21/2026, after a report from the owner's iPad: "In tablet some of columns are rounded on different screens").
    - **What was measured.** Every viewport had the same `.stagewrap` 20px radius.
      - Below 1280, the frame fills the screen, so its rounded corners were clipped at the screen edge (an 11" iPad).
      - At 1280 and up, the frame is inset as a floating card (a 13" iPad in landscape, at 1366).
      - Two iPads showed two shapes.
    - **The rule.**
      - Every touch screen, `(pointer: coarse)`, at any width or orientation, gets an edge-to-edge frame with square corners and no desktop inset, like a native iPad app.
      - A desktop with a mouse at 1280 and up keeps the inset card with rounded corners.
      - Inner panels keep their own radii.
29. **Light theme: the board's ask is the steel primary, like the sheets** (owner ruling, 11/21/2026, made from a rendered comparison: "C: steel, like Your money").
    - **What changes, light only.** The board hero's primary button (`.hero.elegant .cta`, every render branch) wears the same steel primary as every sheet's `.cta`: `--cta-grad` ground, `--on-steel` label. The label measures 4.57:1 on the lightest stop, 5.16:1 on the middle stop, and 5.85:1 on the deepest.
    - **The keycap stays.** The button is still a raised key: a 3px bottom edge, 4px on hover, and pressed flat on tap. In light the edge is `--steel-dark` and the cast is the light `--panel-shadow`. The near-black `--key-edge` and its dark shadow read as a heavy slab on the warm canvas (ruling 25), so light does not use them.
    - **Dark theme.** Dark is unchanged: the 7/31 soft tier (`--sheen` ground, `--ink` label, `--key-edge` keycap).
    - **Secondaries.** Soft and ghost buttons inside the hero stay secondary. Only the primary ask turns steel.
    - **Supersedes.** For light mode, this supersedes the 7/31 host ruling that the board's ask wears the soft tier. The parity gate (`hostv2/src/parity/check-parity.mjs`) pins the soft tier in dark and the steel in light, and `theBoardAskIsSteelInLight.spec.mjs` measures both themes at 390 and 1024.
30. **Dark theme: secondary text clears 4.5:1 under the steel glow** (owner ruling, 11/21/2026, made from a rendered comparison of three options: "C: brighter secondary text").
    - **What changes, dark only.** In the host shell, `--muted` goes #909296 → #a0a2a6 (`--faint` follows it at 98%), `--ink-soft` #849eb8 → #98b2cc, and `--steel-soft` #8AA3B0 → #8BA4B1, all set in `hostv2/src/theme.js`. The shared palette (`src/theme/palette.js`, `src/design/tokens.js`) is not changed, because it also feeds the frozen CRA shell.
    - **Why.** Under the glow's top stop (`--canvas-glow`), muted read 3.80:1 on a sheet and 4.21:1 on the board. Now it reads 4.63 and 5.13, and every secondary tier clears 4.5 on its worst ground.
    - **The glow stays.** Softening it (option B) was rejected; the steel lift at the top of dark is kept.
    - **Tier step kept.** muted to ink-soft stays a real step (1.17, minimum 1.10, `lightModeClearsAA.test.js`).
    - **Gate.** The contrast specs now apply the every-gradient-stop rule in dark as well as light (`nothingReadsDarkOnDarkInLight`, `lightThemeContrast`).
31. **One lit button per board, the NEXT bar included** (owner ruling, 11/21/2026, from a rendered before/after: "Yes, unlit").
    - **What changes.** On the board, only the hero's ask may be lit. The cards below the fold (`.board > :not(.hero) .cta`) wear the `.cta.soft` values, and the pinned NEXT bar (`.next-bar`), which repeats the hero ask and scrolls back to it, sits on an opaque `--card` with `--ink` text, a `--line` hairline and a muted label. Its shape, position, behavior and the green "all set" state are unchanged.
    - **Why.** The bar shows once the hero is 95% out of view, so a lit bar and the lit ask could be on screen together (860×430). In dark, where the ask keeps the 7/31 soft tier (ruling 29), the bar was the only lit thing on the board. On an empty event the board lit three at once.
    - **Gate.** `oneLitButtonOnTheBoard.spec.mjs` scrolls every board to its end: nothing lit outside `.hero`, at most one lit in it, none in dark, and never two lit on screen at once.

## Studio Matte Means

- premium dark interface,
- matte black / charcoal surfaces,
- steel-blue accents,
- calibrated amber/red/green status colors,
- editorial hierarchy,
- operational density,
- high-end production-board feel,
- serious planner/studio utility.

## The UI Should Feel Like

- luxury planner command desk,
- event production control room,
- premium studio operations board,
- technical but warm,
- organized but not sterile.

## The UI Should Not Feel Like

- generic SaaS dashboard,
- CRM template,
- Trello clone,
- flat admin panel,
- startup gradient app,
- neon analytics toy,
- decorative Dribbble concept.

## Hierarchy Rules

Every major screen needs:

1. A dominant starting point.
2. One clear primary action.
3. Supporting context.
4. Secondary content visually subordinate.
5. Status language with consequence.

Do not make every card equal.

## Color Rules

Use color to communicate real state.

Do not use color as decoration.

Avoid:
- neon colors,
- rainbow status systems,
- any gradient that is not one of the three named gradient tokens (see Gradients),
- random accent colors,
- over-saturated urgency.

Use:
- matte surfaces,
- steel-blue structure,
- controlled amber for warning,
- controlled red for critical,
- controlled green for safe/complete.

### Gradients — exactly three, each a named token

*Owner ruling, 11/20/2026. Supersedes the 2026-08-18 amendment "Gradients — the
rule is the ANGLE, not the idea" (lateral sweeps allowed, vertical ramps banned),
which `hostv2/src/theme.js` still cites at `--cta-grad`. That amendment no longer
governs; this section does.*

The product has exactly three gradients, and each one is a named token:

1. **The canvas glow** — `--canvas-glow` (see Canvas glow below).
2. **The primary-button gradient** — `--cta-grad`: the steel lit from the top (lighter at the top, a touch darker at the bottom), with a 1px top highlight and a small shadow, on the primary `.cta` only. Soft and ghost buttons stay flat. Label contrast ≥4.5:1 at EVERY stop, the lightest included (`steelBlueCtaLight` #57707E, 4.57:1 — the rendered draft's #5F7B8B measured 3.92 and was darkened to pass); `lightThemeContrast.spec.mjs` checks the worst stop.
3. **The carbon (dark) panel** — `--carbon-panel-grad`
   (`linear-gradient(150deg, var(--carbon-panel) 0%, var(--carbon) 70%)`, today
   written inline on `.day-node`; the token replaces it when the CSS lands).

**No other gradients anywhere.** A gradient that is not one of these three
tokens is a defect, whatever its angle. Consuming a token is legal at any number
of sites; minting a fourth gradient is not.

The 1px top `--sheen` hairline is a flat color, not a gradient, and is unaffected.

### Canvas glow

*Owner ruling, 11/20/2026.*

The canvas carries one steel glow from the top of the screen, a single token
sized to the screen height. Sheets and pages let it read through; only dense
lists and tables sit on a flat panel for readability.

The token is `--canvas-glow`, and it scales with viewport height. This states
the rule; the exact CSS is a later batch.

## Command Surface Rule

For Home, Event Command, Vendors, and Detail views, use command-style panels:

- Start here
- Next best action
- What needs attention
- Why it matters
- Primary CTA

## Detail View Rule

Detail views should feel like operating cockpits, not generic profile cards.

Bad: Name, email, phone, status, notes.

Better: Readiness, missing items, why it matters, next action, linked work, phase sections.

## Responsive Rule

Design must work on:

- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1280 × 654 (`desktop-short`, see UX_03)
- 1440 × 900
- large desktop

Mobile is not an afterthought.

## UI QA

Before final response, check:

- no clipped cards,
- no horizontal overflow,
- primary action visible,
- type hierarchy clear,
- status labels readable,
- mobile layout usable,
- desktop layout not sparse or generic.
