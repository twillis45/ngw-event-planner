# Cultural References — repository

A curated, **cited** repository of cultural meaning for the event types Event Boss serves. It feeds the engine's cultural overlays and the identity/design system (icons, colors, heart-moments, copy) — so the app honors *what an event means*, never caricatures it.

## Why this exists
Event Boss's moat is culturally-specific, insider-sourced knowledge (40 playbooks, family-led, never generic). This repo is the **source of truth for the symbolism behind that** — the meaning a design, an icon, a color, or a heart-moment is grounded in. Design and copy should cite an entry here rather than invent.

## Principles
- **Family-led, never caricature.** Reverent, specific, from the community.
- **Cited.** Each entry notes its sources/provenance; mark anything uncertain.
- **Symbol → meaning → how it shows up in the product** (icon / color / food / moment / copy).
- **Regional + diaspora nuance** where it matters (e.g. DMV: half-smokes, mumbo sauce, go-go).
- **Status-color discipline still holds:** cultural color (e.g. Juneteenth red) is IDENTITY, never a UI status hue.

## Entry schema (one file per culture/observance)
```
# <Name>
## What it is / the date(s) & history
## The symbols  — symbol · meaning · provenance
## Colors & flag — hex + what each color means (identity only)
## Food & drink  — dish/drink · symbolism
## Music & ritual — the gathering, the cues, who's honored
## Heart-moments  — the moments that must happen (feeds playbooks)
## Regional / diaspora notes
## In the product — icon · identity color · copy do/don't
## Sources
```

## Index
- [Juneteenth](juneteenth.md) — June 19, 1865 · freedom star · red foods/drinks · the cookout
- _(add: Kwanzaa · Quinceañera · Ethiopian coffee ceremony · Lunar New Year · Día de los Muertos · …)_

## Links
Feeds: the Event Intelligence Engine cultural overlays (`demo/docs/ecosystem/`), `lib/eventIdentity.js`, `glassIcons.js`, the playbook `heartMoments`.
