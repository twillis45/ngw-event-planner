# Sprint 27A — Amber Palette Rebalance

Environmental color maturity correction. This is NOT a rebrand. NOT a color refresh. NOT a visual update. This is the removal of the last visible product-design ambition from the amber token — transforming it from premium accent gold into institutional ceremonial brass.

## What this is

The amber (#d9a94e) still carried the energy of a design decision. It behaved like an interface highlight — bright, featured, digitally precise. It announced "a designer chose this color for emphasis." That visibility is the problem.

This sprint transforms amber into something that feels like it was always there — like aged brass hardware on a backstage door, not a UI accent color selected from a palette tool.

## The shift

| Dimension | Before (#d9a94e) | After (#b8943f) |
|---|---|---|
| Character | Premium accent gold | Institutional ceremonial brass |
| Behavior | Interface highlight | Environmental warmth |
| Feeling | "Someone chose this for emphasis" | "This was always here" |
| Reference | Apple luxury gold, fintech premium | Aged brass fixtures, tungsten warmth |
| Saturation | Bright, digitally precise | Subdued, materially embedded |
| Temperature | Cool-warm (yellow-gold lean) | Warm (brass-brown lean) |

## Tokens changed

| Token | Before | After | Role |
|---|---|---|---|
| `amber` | `#d9a94e` | `#b8943f` | Primary accent — urgency borders, surge indicators, timing cues |
| `warm` | `#c4956a` | `#a8836a` | Secondary warmth — vendor history, soft environmental accents |

## Why #b8943f

The new value was not selected for visual preference. It was selected for environmental disappearance:

- **Lower saturation** — brass dulls over time, gold doesn't. The new value reads as material that has been in place, not material that was recently installed.
- **Brown shift** — moves away from yellow (digital, interface, accent) toward brown (architectural, material, environmental). Brass doorknobs. Tungsten stage lighting. Warm metal that belongs to the building, not the software.
- **Reduced contrast against dark canvas** — #b8943f against #070809 produces less visual pop than #d9a94e. The accent stops competing for attention. It becomes part of the surface instead of sitting on top of it.
- **Institutional register** — ceremonial brass belongs to venues, not products. Hotels, theaters, event spaces have this color in their hardware and fixtures. It reads as "this building's material" not "this app's brand."

## Emotional shift

| Context | Before (gold) | After (brass) |
|---|---|---|
| Urgency border | "Alert! Designer-chosen emphasis color" | "This edge has always been warm under pressure" |
| Hierarchy surge | "Feature highlight activating" | "Environmental warmth intensifying naturally" |
| Timing cue | "Interface accent marking importance" | "Institutional signal embedded in the rhythm" |
| Sequence node | "UI state indicator" | "Brass marker that's been on this wall for years" |
| Vendor history | "Design system warm accent" | "Backstage warmth from operational familiarity" |

## Hierarchy impact

The surge mechanic (Sprint 24) uses amber for the momentary attention spike. With #d9a94e, the surge felt like a UI feature activating — bright gold border appearing, announcing its presence. With #b8943f, the surge feels like environmental warmth building — brass warming under pressure, the way stage lighting shifts when something important happens. The surge still captures attention, but it stops feeling like a software interaction and starts feeling like a spatial condition.

Specific hierarchy surge changes:
- **Surge border**: 2px #b8943f instead of 2px #d9a94e — less visual pop, more environmental presence
- **Resting border**: #1e2530 unchanged — the contrast ratio between resting and surge decreases, making the surge feel like a temperature shift rather than a state change
- **Return to resting**: brass fading back to neutral feels like warmth dissipating, not a UI state resetting

## Environmental impact

The amber appears throughout the orchestration environment in roles that should feel embedded, not applied:

| Location | Before behavior | After behavior |
|---|---|---|
| Left-border accents | Bright line drawing attention | Warm edge that was always part of the surface |
| Timing lane indicators | Digital status color | Brass rail marking embedded in the corridor |
| Compression zone borders | UI emphasis under pressure | Environmental warmth intensifying with pressure |
| Sequence connectors | Interface line linking items | Institutional pathway that has carried this flow before |
| Mobile urgency chips | App notification color | Backstage signal warmth |
| Readiness indicators | Dashboard accent | Venue-embedded status that belongs to the space |

## Figma page created

| Page | Content |
|---|---|
| `66_Amber_Palette_Rebalance` | 6 comparison surfaces |

### Comparison surfaces (page 66)

| Surface | Dimensions | Content |
|---|---|---|
| `01_Palette_Comparison` | 1440×247 | Before/after amber swatches with characteristics, demo items with old gold vs new brass borders, full palette context showing both tokens in system |
| `02_Before_Orchestration_Desktop_1440` | 1440×900 | 3-zone orchestration surface using old amber (#d9a94e): coordination rail (180px) + sequence center (flex) + timeline (360px) |
| `03_After_Orchestration_Desktop_1440` | 1440×900 | Identical 3-zone orchestration surface using new brass (#b8943f): same layout, same content, different environmental character |
| `04_Mobile_Comparison` | 1500×900 | Side-by-side mobile views: old gold NOW/NEXT/sequence (390px) vs new brass (390px) + comparison notes panel (620px) |
| `05_Hierarchy_Surge_Comparison` | 1432×900 | Surge mechanic before (gold, 660px) vs after (brass, 660px): staggered items with surge state showing border/weight changes |
| `06_Token_Migration` | 1440×534 | Token migration table (amber, warm, makeS, tensionCue, seqNode, CSS vars) + files to update + drift prevention rules |

## Token migration map

| Token/Variable | File | Before | After |
|---|---|---|---|
| `amber` | `src/tokens.ts` | `#d9a94e` | `#b8943f` |
| `warm` | `src/tokens.ts` | `#c4956a` | `#a8836a` |
| `makeS().amber` | `src/tokens.ts` | Returns `#d9a94e` | Returns `#b8943f` |
| `tensionCue` | Component-level | `border: 2px #d9a94e` | `border: 2px #b8943f` |
| `seqNode` active | Component-level | `border-left: #d9a94e` | `border-left: #b8943f` |
| `--amber` | CSS custom properties | `#d9a94e` | `#b8943f` |
| `--warm` | CSS custom properties | `#c4956a` | `#a8836a` |

### Files requiring update

1. `src/tokens.ts` — Primary token definitions (amber, warm)
2. `src/theme/` — Any theme files referencing hex values directly
3. Component files using hardcoded amber values instead of tokens
4. Storybook stories if they reference specific hex values
5. Test fixtures with color assertions

## Drift prevention

| Risk | Level | Mitigation |
|---|---|---|
| Amber brightening back toward gold | HIGH | #b8943f is the ceiling. Any amber brighter than this has re-entered product-design territory. The test: if the amber looks like it could be an app's brand color, it's too bright. |
| Warm token drifting toward orange | MEDIUM | #a8836a stays in the brown-brass family. If warm starts looking like a sunset or a CTA button, it has drifted. |
| New accent colors introduced at gold-level brightness | HIGH | No new accent color should be brighter than #b8943f. If a new color enters the palette and it's brighter than brass, it will immediately become the most visible element and re-introduce the premium accent problem. |
| Amber used for decorative emphasis | MEDIUM | Amber is environmental warmth, not interface emphasis. If amber is being used to "highlight" something the way a text highlighter works, the usage has drifted from environmental to decorative. |
| Inconsistent migration (some gold, some brass) | HIGH | Mixed amber values (#d9a94e appearing alongside #b8943f) will look like a bug. Migration must be atomic — all instances change together. |

## What was intentionally refused

1. Gradient amber (warm-to-cool amber transitions)
2. Multiple amber tones (light amber, dark amber, amber hover state)
3. Amber as a "theme color" with dark/light variants
4. Amber glow or ambient effects
5. Amber opacity variations for hover/active/disabled states
6. Gold-to-brass animation or transition effects
7. Amber applied to backgrounds or large surfaces
8. Amber as a text color
9. Any amber brighter than #b8943f anywhere in the system

## What is NOT validated

- No real planner has seen the brass vs gold comparison. Whether #b8943f actually reads as "institutional" or just "muddy" is unknown.
- Whether the reduced contrast ratio between brass and the dark canvas (#070809) diminishes the urgency signal effectiveness is untested.
- Whether the hierarchy surge still captures attention at the lower saturation is a hypothesis.
- Whether the brass reads as "environmental warmth" or "desaturated / washed out" requires field sessions.
- The warm token shift (#c4956a → #a8836a) has not been evaluated in the context of vendor history displays.
- None of these changes have been implemented in code yet. They are Figma explorations with a migration plan.

## Honest read

This is the simplest sprint in the series — two hex values change — but it addresses something real. The amber was the last color that still looked like a design decision rather than an environmental condition. #d9a94e had the brightness and saturation of a product accent color. It said "we chose gold because it's premium." #b8943f says nothing. It's brass. It's warm. It was already there. The risk is genuine: lower saturation means less contrast, which means the urgency signals and hierarchy surges carry less visual force. Whether brass at 2px still captures attention the way gold at 2px does is the core question. The answer might be "no, bring back more saturation" — but that answer can only come from seeing both versions in operational context with real orchestration pressure. The migration itself is mechanical (two token values change, everything downstream follows), but the perceptual impact is not mechanical — it's the difference between an interface that uses color for emphasis and an environment where warmth is embedded in the architecture.

## Screenshots

| File | Content |
|---|---|
| `01_palette_comparison.png` | Before/after amber swatches + full palette context |
| `02_before_orchestration_desktop_1440.png` | Old amber (#d9a94e) in 3-zone orchestration context — desktop |
| `03_after_orchestration_desktop_1440.png` | New brass (#b8943f) in identical orchestration context — desktop |
| `04_mobile_comparison.png` | Side-by-side mobile views: gold vs brass + comparison notes |
| `05_hierarchy_surge_comparison.png` | Surge mechanic before (gold) vs after (brass) |
| `06_token_migration.png` | Token table + files to update + drift prevention rules |
