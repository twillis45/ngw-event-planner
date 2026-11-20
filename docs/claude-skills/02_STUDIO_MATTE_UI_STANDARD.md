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
