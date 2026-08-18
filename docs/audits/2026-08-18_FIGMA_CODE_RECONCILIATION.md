# Figma ↔ Code Reconciliation — NGW Design System

**Date:** August 18, 2026
**Source A:** Figma `get_metadata` dump of canvas `00_FIGMA_SYSTEM_MAP` → frame `00_SYSTEM_MAP` (id 228:3, 3200×8212), file `CYlmJqDCXEaacCuz9wW3bd`. Self-stamped **"Last updated: 2026-05-26 · Sprint System Map v1 · 45 pages classified."**
**Source B:** `demo/src/design/{tokens,motion,surfacePriority,index}.js`, `demo/src/design/primitives/*.jsx`, `demo/src/theme/palette.js`, plus `demo/hostv2/src/theme.js` (found during the sweep).

## Scope limit — read this before trusting any color comparison

The Figma dump is **structural metadata only**: node `id`, `name`, `x/y/width/height`. It contains
node *names* (which in this file happen to carry the map's table text) but **no fill values, no
variable definitions, and no variable-to-node bindings**. `get_variable_defs` was not run.

Therefore:

- **Comparable:** section/page inventory, category tags, runtime tags, locked-doctrine list, motion
  timings and containment widths (because the map spells those numbers out in prose), parity-map rows.
- **NOT comparable:** every actual Figma color hex, spacing step, radius, and type size. The claim
  "mirrors the NGW Color / Spacing / Typography variables 1:1" **cannot be verified from this dump**.
  Where this report calls out color drift, the drift is *code-vs-code* or *code-vs-its-own-comments*,
  which is verifiable, and is flagged as such.

---

## 1. Figma sections with no code implementation

The map classifies 95 pages (00–94) on two axes: CATEGORY (DOCTRINE / COMPONENT / FLOW / STUB / COVER)
and RUNTIME (PROVEN / HYBRID / FIGMA-ONLY / CONCEPT).

### Explicitly tagged FIGMA-ONLY (9 pages)

| # | Page | Category | Map note |
|---|---|---|---|
| 19 | `19_Risk_State_Visualization` | DOCTRINE | "Probability × Impact matrix. Not yet rendered in app." |
| 37 | `37_Live_Command_Center` | FLOW | "Desktop 1440 flow. Not yet in app; slice is the proxy." |
| 39 | `39_Mobile_Event_Day` | FLOW | "Field Command Nominal/Stress. Not in app yet." |
| 57 | `57_Visual_Orchestration_Surfaces` | FLOW | "Design system only, not implemented" |
| 59 | `59_Visual_Choreography_Surfaces` | FLOW | "Locked motion matrix applies." |
| 61 | `61_Contextual_Polish_Surfaces` | FLOW | Sprint 24 surface explorations |
| 63 | `63_Living_Orchestration_Surfaces` | FLOW | Sprint 25 surface explorations |
| 65 | `65_Evolutionary_Orchestration_Surfaces` | FLOW | Sprint 27 surface explorations |
| 72 | `72_Adaptive_Orchestration_Prototype` | FLOW | "Sprint 32 adaptive prototype. Figma-only exploration" |

(The 10th `FIGMA-ONLY` string hit is the legend at y=656 defining the term.)

### Also unimplemented — tagged CONCEPT (inferred, 43 pages)

CONCEPT is the map's "idea only" tier and is a superset of the no-code condition. Notable clusters:

- **Empty STUB placeholders, zero code:** 05, 08, 09, 10, 11, 15, 17, 20, 25, 26, 28, 45, 46, 47,
  48, 49, 51, 52, 53.
- **Whole doctrine arcs never built:** 54–56, 58, 60, 62, 64, 67–71, 73 (Planner-Native Vocabulary →
  Pre-Cognitive Orchestration → Behavioral Grammar → Infusion Strategy).
- **Sprint 41 slices A/B/C:** 74, 75, 76 — CONCEPT. Only D (77) and E (78) are PROVEN.
- **Sprint 46 PLAN layer:** 87–91, 94 tagged CONCEPT — **but this is now STALE.** `demo/src/plan/`
  ships `ChecklistGenerator.jsx`, `ClientIntakeFlow.jsx`, `TimelineBuilder.jsx`,
  `VendorPlanningWorkspace.jsx`, `CommunicationHub.jsx`, `DecisionApprovalCenter.jsx`, all importing
  `src/design`. **Six pages are mis-tagged CONCEPT when code exists.**
- **41 `41_Form_Systems`** — CONCEPT, "App.js forms are still localStorage-era." Still true in spirit;
  App.js is now frozen (A1 freeze 2026-07-16) so this page can never be satisfied there.

---

## 2. Code with no Figma counterpart section

| Code artifact | Figma coverage |
|---|---|
| **`demo/hostv2/` — the entire host shell v2** (`HostShellV2.jsx`, `InviteV2.jsx`, `LodgingCockpit.jsx`, `PhotoStrip.jsx`, `sectionIcons.jsx`, `theme.js`, `styles.css`) | **None.** No page in the 00–94 index mentions hostv2, a host shell, an invite surface, lodging, or a photo strip. The map predates the whole architecture. |
| `hostv2/src/theme.js` CSS-custom-property token layer (`--bg`, `--field`, `--progress`, `--sheen`, `--cta-grad`, `--danger-text`, `--steel-soft`, `--ms-*`) | **None.** This is a third token source with tokens that exist in neither `tokens.js` nor Figma — notably `--progress` `#B3A0CC` (a **lavender**), invented 2026-08 with no doctrine page. |
| `theme/palette.js` `carbonNeutral` de-blued ramp (deep/mid/soft/softer) | **None.** The file's own header says "NOT yet written back to Figma; see docs/token-debt.md (Figma Mid mode)." Acknowledged debt. |
| `theme/palette.js` `brandPresets` / `defaultBrandColor` (6 studio brand colors) | **None.** |
| `theme/palette.js` three-mode `TOKENS` structure (dark / mid / light) | Partial only — Figma has `42_S6_Color_Doctrine` and `66_Amber_Palette_Rebalance`; no page covers mode architecture. |
| `tokens.js` `elevation` scale (7 steps + `card`) and `edge` (metallic edge gradient) | **None.** No elevation/shadow doctrine page exists. `edge` has no Figma analog at all. |
| `tokens.js` `legacyBridge` | **None** (correctly — it's a migration shim). |
| `contexts/OrchestrationContext.jsx`, `orchestration/adaptiveHierarchy.js` | Only obliquely via 69/70/73, all CONCEPT. |
| `admin/AdminConsole.jsx`, `components/ImportWizard.jsx` | **None.** |

---

## 3. Is the "1:1 mirror" claim TRUE, PARTIALLY TRUE, or STALE?

`tokens.js:4-8` claims: *"This is the CANONICAL Studio Matte token source for new operational
primitives. It mirrors the Figma NGW Color / Spacing / Typography variables 1:1 (Sprints 5–8)."*

**Verdict: STALE — as a *claim*. Unverifiable as a *fact*.**

Two separate problems:

**(a) Unverifiable.** The dump carries no variable values, so no hex/step/size can be diffed. Nobody
can currently substantiate "1:1" in either direction. Run `get_variable_defs` before anyone repeats
the claim.

**(b) Demonstrably no longer 1:1, by the file's own later comments.** The claim is scoped to
"Sprints 5–8." The same file then records Sprints 49, 60.N, 60.U.3 and dated 2026-06-23/24 board
corrections that changed values **in code**, with no evidence of a Figma write-back:

- `tokens.js:17-29` (Sprint 60.N) rebases the entire `matte` ramp onto App.js DARK tiers.
- `tokens.js:54-59` rewires `color.surface.*` to import `carbonNeutral.mid` from `palette.js` —
  i.e. **surfaces no longer come from the Figma-mirrored primitives at all.** `canvas` = `#141518`
  (de-blued carbon), not the `#070809` Standard Carbon the Figma mode is documented as.
  `palette.js:19-21` states outright: *"Source: production code (Sprint 60.L Carbon Tier Lock) …
  NOT yet written back to Figma."*
- `tokens.js:38-48` recalibrates amber/green (Sprint 49) and rebuilds the red ramp (Sprint 60.U.3).
- `tokens.js:127-134` **extends the type scale** with `2xs`(9), `caption`(12), `section`(17),
  `4xl`(26), `5xl`(30) — five sizes added in code on 2026-06-24. A 1:1 mirror cannot gain members
  on one side.
- `tokens.js:118-122` collapses `radius.lg` to 12 to match `App.js s.card`, a code-side constraint.

Every one of these is a *code-led* change with a code-side justification. Direction of authority has
reversed since Sprint 8: **code is now upstream of Figma for color and surface.** The header comment
still asserts the opposite.

**Recommended edit:** replace the "1:1" sentence with the truth — *"Color/surface tokens are sourced
from `theme/palette.js` (production-led, Sprint 60.L). Figma color variables are downstream and lag;
see docs/token-debt.md. Spacing/type were Figma-derived at Sprints 5–8 and have since been extended
in code."*

---

## 4. LOCKED doctrine, and whether code respects it

Section 3 of the map ("LOCKED DOCTRINE", y=3830) lists **9 immutable systems**, each tagged `LOCKED`.
Plus the page header at y=52 tags the map itself `CANONICAL · LOCKED`.

| # | Locked system | Code respects? | Evidence |
|---|---|---|---|
| 1 | **Escalation = reduction** (density collapses as severity rises) | ✅ | `surfacePriority.js` `visibleCountFor`: `crisis → 0`, `compact → min(full,3)`. `surfaceFor` drops card elevation to `none` under crisis. |
| 2 | **Authority from structure** (not color/motion) | ✅ | `Button.jsx:6-13` states the rule verbatim; primacy via "raised surface + grounding shadow + steel keyline", never brighter color/glow/pulse. |
| 3 | **Studio Matte, physically grounded** (no gloss/glass/gradient) | ⚠️ **Mostly.** | `elevation` is restrained black-alpha only. **But** `hostv2/theme.js` shipped `--cta-grad` as `linear-gradient(180deg, #4E6877 → #3F5B6A)` on every `.cta` — a simulated bevel, i.e. the banned polish. Caught and reverted 2026-08-04 to the flat top stop; the comment now explicitly re-opens *lateral* sweeps as "a legitimate option." That is a doctrine amendment made in a code comment, not raised as a doctrine change — which §"PROCESS CHANGE — MANDATORY" (y=8056) forbids. |
| 4 | **Motion matrix (locked timings)** — ambient 310 inOut · escalation 230 out · emergency 200 sharp · recovery 360 out; no bounce/spring/overshoot | ✅ **exact** | `tokens.js:152-160` — `ambient:310, escalation:230, emergency:200, recovery:360`. `motion.js` `choreography` maps ambient→`inOut`, escalation→`out`, emergency→`sharp`, recovery→`out`. Zero bounce/elastic curves in the file. **This is the cleanest 1:1 in the system.** |
| 5 | **Spatial orchestration** (tablet ≠ stretched mobile) | ✅ in slice, ⚠️ unproven elsewhere | `DesktopDensitySlice.jsx:427-430` has three distinct grid templates per breakpoint. Map itself tags tablet portrait CONCEPT. |
| 6 | **Calm under pressure** | ✅ | `AlertBanner.jsx` — escalation adds `elevation.escalation` + border weight, never animation. |
| 7 | **Structural P1 promotion/demotion** (one P1) | ✅ | `Button.jsx` `EscalationContext`-driven single primary; documented as the Sprint 9 resolution. |
| 8 | **Studio/team tenancy — `auth.uid()` = identity only** | ✅ (not re-verified here) | Map §4 records studio_id RLS verified; consistent with MEMORY's `events.studio_id` ownership canon. Not re-tested in this audit. |
| 9 | **Contained widths on desktop** (escalation 240–320, emergency 320–420; heavier not wider) | ✅ | `DesktopDensitySlice.jsx:125` — `primaryWidth = isEmergency ? 360 : 280`. 280 ∈ [240,320]; 360 ∈ [320,420]. Rails 280/360, compressed 220/280, mobile 240. No full-bleed primary. |

**Net: 7 clean, 2 with caveats.** No hard violation found in `src/design`. The one real erosion is #3
in `hostv2`, which sits outside every Figma page.

---

## 5. Concrete drift list

Ordered by how much damage each can do.

**D1 — hostv2 declares five motion tokens that do not exist.**
`hostv2/src/theme.js:180-186` reads `durations.micro`, `.fast`, `.base`, `.enter`, `.reveal` from
`@app/design/motion`. `tokens.js` `motion.duration` defines only `ambient, escalation, emergency,
recovery, sheetRise, sheetDismiss, press`. All five resolve to `undefined` and fall through to the
inline literals `100/140/200/240/420ms`. The comment claims *"Same numbers, one source now"* — there
is **no source**; editing `tokens.js` cannot move them. Fix: add the five keys to
`tokens.js motion.duration`. (Same class of bug as the `--danger-solid` "undefined" incident the file
itself documents.)

**D2 — three different ambers, no doctrine reconciliation.**
`tokens.js` `amber['400'] = #d4904a` (Sprint 49 "honey tungsten") · `palette.js` `amber.dark/mid =
#ECA13F` (what `hostv2` `--warn` actually paints) · Figma page `66_Amber_Palette_Rebalance` specifies
`#b45309` for light theme — **`#b45309` appears nowhere in `demo/src`.** Page 66 is tagged PROVEN.
It is not.

**D3 — canonical red split, and the comment lies about it.**
`tokens.js:94-98` asserts *"unified to the single canonical fire red (#E84036 = palette.js dangerRed
= C.danger)"*. `palette.js:70-71` now has `dangerRed = #F27A70` (lightened for WCAG) and
`dangerSolid = #E84036`. So `tokens.js status.risk` is hardwired to the **solid/fill** red while
`hostv2 --danger` paints the **text** red. Two reds on screen again — the exact condition the comment
claims was fixed.

**D4 — stale value comments inside `tokens.js`.** `riskBright` is commented `// #c93f4a` but is
`primitive.red['bright'] = #FF3525`. `legacyBridge` comments cite `#0f0f11 -> #070809`, `#e63946 ->
#c03838`, `#f59e0b -> #ef962e` — none of those are the current resolved values. Anyone grepping
comments for hexes gets wrong answers.

**D5 — Figma map is ~12 weeks stale (2026-05-26 vs today).** It knows nothing of: hostv2/A1 App.js
freeze, the Event Identity system, the Editorial Cover system, the admin console, the activation
funnel work, or the `plan/` layer actually shipping. Its "Production-readiness estimate 68%" and
"Human validation 18%" are unreconciled with anything current.

**D6 — six PLAN pages mis-tagged.** 87/88/89/90/91/94 say CONCEPT; `demo/src/plan/` ships all six.

**D7 — page 01 `01_Foundations` is EMPTY in Figma** ("tokens canonical in code") yet tagged
DOCTRINE/PROVEN. The token doctrine page has no content — which is precisely why §3's "1:1 mirror"
claim can't be checked.

**D8 — page naming convention broken.** Page 44 is literally named `Sprint 11D — Desktop Containment
Rules`; the map's own note says *"RENAME to `44_Desktop_Containment_Rules` to fit numbered
convention."* Still unrenamed.

**D9 — three parallel token systems, no arbiter.**
`src/design/tokens.js` (JS objects, slices + plan/ + CommandCenter, 16 consumers) ·
`src/theme/palette.js` (mode-aware, App.js) · `hostv2/src/theme.js` + `styles.css` `--t-*`
(CSS custom props, host shell — and per its own header, **type is not in theme.js at all**, it lives
in `styles.css :root`). Figma models none of this layering.

**D10 — `--progress` `#B3A0CC` (lavender) shipped with no doctrine page.** Introduced in `hostv2` to
break steel's triple duty. Defensible reasoning, zero Figma representation, and it adds a hue to a
palette whose doctrine is restraint.

---

## 6. Claude Design sync — push vs hold

### PUSH (settled: LOCKED or PROVEN with runtime evidence)

- **Motion matrix** — `tokens.js motion` + `motion.js choreography`. Exact match to locked doctrine,
  computed-style verified in two slices. *Add the five missing `--ms-*` durations (D1) before pushing
  so the exported scale is complete.*
- **Surface depth roles** — `surfacePriority.js` 5-tier `canvas/card/active/escalation/interrupt` +
  density behavior. Figma 14 + 30, both DOCTRINE/PROVEN.
- **Elevation scale** — `elevation` + `edge`. Code-only today; push it *to* Figma, it has no page.
- **Spacing + radius** — `space` (0–12) and `radius`. Stable, no recorded contention.
- **Type scale** — `type.size/weight/leading/tracking`. Push as the **new** source; it has grown five
  members beyond whatever Figma holds.
- **Primitives: `Button`, `EscalationBadge`, `AlertBanner`, `BottomSheet`** — Figma 34/35/32/31, all
  COMPONENT/PROVEN, runtime-verified in slices.
- **`Surface`, `Text`** — proven via 14/23.
- **The 9 LOCKED doctrine entries** — push as immutable constraints/annotations, verbatim.
- **Contained-width rules** — 240–320 / 320–420, slice-verified at 280/360.

### HOLD (CONCEPT, STUB, or contested)

- **All color hexes.** Do not push until D2 (amber ×3) and D3 (red split) are resolved and
  `get_variable_defs` has established what Figma actually holds. Pushing now would propagate the drift.
- **Light mode.** `palette.js` has a `light` bundle; `tokens.js` deliberately omits it ("intentionally
  omitted to avoid faking it"); Figma page 66's `#b45309` is unimplemented. Map lists light-mode
  parity as DEFERRED. Hold.
- **`hostv2` tokens** — `--progress`, `--sheen`, `--cta-grad`, `--field`, `--steel-soft`,
  `--danger-text`. Real and shipping, but undoctrined and actively churning (the CTA gradient reversed
  within one month). Hold until they earn a doctrine page.
- **Vendor Card (33, HYBRID)** — composition not unified.
- **Form Systems (41, CONCEPT)** — no shipped implementation to push.
- **Everything 52–73** — the doctrine-arc pages. CONCEPT, mostly empty.
- **Live Command Center (37), Mobile Event Day (39), Risk State Visualization (19)** — FIGMA-ONLY.
  These flow *from* Figma to code, not the reverse; nothing to push.

### Do first, before any sync

1. Run `get_variable_defs` on `CYlmJqDCXEaacCuz9wW3bd` — without values this reconciliation is
   half-blind and the "1:1" question stays formally open.
2. Fix D1 (five phantom duration tokens) — a live bug, not a documentation issue.
3. Rewrite the `tokens.js` header claim (§3).
4. Re-tag the six PLAN pages and refresh the map's 2026-05-26 date stamp.
