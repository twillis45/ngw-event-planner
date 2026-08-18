# 02_STUDIO_MATTE_UI_STANDARD.md

You are designing and implementing UI for NGW Event Planner.

The visual standard is Studio Matte.

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
- fake gradients,
- random accent colors,
- over-saturated urgency.

### Gradients — the rule is the ANGLE, not the idea

*Amended 2026-08-18. Evidence: `docs/audits/2026-08-04_BUTTON_AND_CTA_LANGUAGE_MOBBIN_READ.md`,
a read of 27 leader screens. Supersedes the bare "fake gradients" line above,
which was too blunt to apply.*

**Banned — a vertical light-to-dark ramp on a fill.** `linear-gradient(180deg,
#4E6877, #3F5B6A)` is not color, it is a *simulated bevel*: light falling from
above onto a raised object. That is what dates a button, and no leader screen in
the read runs one.

**Allowed — a lateral sweep within one brand color.** Airbnb's `Confirm and pay`
is a gradient, and it reads as brand rather than plastic, because the sweep is
horizontal hue movement inside a single color rather than a fake light source.

**Also allowed, and unrelated:** the 1px top `--sheen` hairline. That is a
material response to the canvas glow, not a fill treatment — the same 1px the
card family already carries.

So: kill the 180°, keep the color, keep the sheen. A lateral steel sweep is a
legitimate option here, not a banned one.

**Process note.** This amendment previously existed only as a comment in
`hostv2/src/theme.js`. Doctrine is amended here, in the standard, citing its
evidence — never in a code comment, where it is invisible to everyone not
reading that file. The comment now points at this section instead of declaring
the rule itself.

Use:
- matte surfaces,
- steel-blue structure,
- controlled amber for warning,
- controlled red for critical,
- controlled green for safe/complete.

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
