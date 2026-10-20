# EXISTING NGW REDESIGN — RECOVERY AND CLASSIFICATION

**Measured 2026-10-20.** Addendum §1, executed before any People/Attendance
visual decision is made: *"inspect the repository for the redesign work already
created… Document what is actually present."*

Searched by behaviour and visual implementation, not by filename. Every row
below cites the file or audit it was read from. **No review-shot or reference
asset was modified** (addendum §1, final line) — `hostv2/review-shots/` is
untouched; it was read only.

> **THREE THINGS IN THE ADDENDUM'S §2 LOCKED LIST DO NOT MATCH WHAT IS IN THE
> REPOSITORY.** One of them — brass/gold — is a direct contradiction with a
> written ban and needs an owner decision. They are in §4 below. Everything
> else in §2 is confirmed, and most of it is already built.

---

## 1 · WHAT IS ACTUALLY PRESENT

### 1.1 Doctrine (prose)

| Artifact | Where | Size |
|---|---|---|
| Studio Matte UI standard | `ngw-event-planner-workspace/docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md` | skill file |
| Nine UX skill files | `…/docs/claude-skills/ui-ux/UX_01…UX_09` | visual language · colour · multi-viewport · command-board hierarchy · component patterns · language · CTA truthfulness · source-of-truth · QA scorecard |
| Design-system handoff brief | `docs/DESIGN_SYSTEM_HANDOFF.md` | 580 lines — "a brief for continuing design work in Claude Design… so that what comes out is on-system rather than merely nearby" |

### 1.2 Tokens (three layers, and that is a finding)

| Layer | File | What it owns |
|---|---|---|
| Locked palette | `src/theme/palette.js` (253 ln) | Three modes (dark / mid / light), the steel-blue identity, brand presets, **and a banned-values list** |
| Runtime CSS custom properties | `hostv2/src/theme.js` (334 ln) | What the shipping shell actually paints. Colour + motion only — *"TYPE is NOT set here"* |
| Type scale | `hostv2/src/styles.css` `:root` | `--t-*`, the single type source |
| Figma convergence layer | `src/design/tokens.js` | Claims a Figma 1:1 mirror — **already adjudicated STALE**, see §3 |

Colour never lives in CSS: `palette.js → theme.js → styles.css`. Grepping
`styles.css` for a colour token returns nothing because it is injected at
runtime.

### 1.3 Components

| Kit | Where | Status |
|---|---|---|
| **`askKit.jsx`** — the shipping kit | `hostv2/src/parity/askKit.jsx` | 12 exports: `AskColumn · Eyebrow · BigValue · BigValueInput · GuideLine · Grounding · CtaRow · SettledRow · SettledCard · OptionList · TierRow` + `ASK_RHYTHM`/`ASK_COMPACT` spacing constants |
| Enforcement | `hostv2/src/parity/check-parity.mjs` | Fails the build if a locked atom value is re-inlined outside the kit, **and** selector-scans `styles.css` for raw hex/px inside 5 named hero selectors |
| `design/primitives/` — the CRA kit | `src/design/primitives/` | `Surface · Text · Button · BottomSheet · AlertBanner · EscalationBadge`. **Consumed by `src/slices/*` and `EventDayMode.jsx` only — hostv2 does not import a single one** |

### 1.4 The pattern ledger — **it already exists**

`hostv2/src/parity/MANIFEST.md` is a living table of *render family → runtime
location → Figma node → composes the kit? → status*, plus fast-follows, a
ground-in-code doctrine, an anti-drift rule and a fold rule. **This is the
artifact addendum §9 asks to create at
`docs/architecture/redesign/REDESIGN_PATTERN_LEDGER.md`.** Recommendation in §6.

### 1.5 Figma — two files, and the older one predates the shipping shell

| File | What it is | Bearing on People |
|---|---|---|
| `CYlmJqDCXEaacCuz9wW3bd` — "NGW Events — Operational Design System" | 95 pages classified on CATEGORY (DOCTRINE/COMPONENT/FLOW/STUB/COVER) × RUNTIME (**PROVEN / HYBRID / FIGMA-ONLY / CONCEPT**) | **Low.** The 2026-08-18 reconciliation measured: *"`demo/hostv2/` — the entire host shell v2 … **None.** No page in the 00–94 index mentions hostv2, a host shell, an invite surface, lodging, or a photo strip. **The map predates the whole architecture.**"* |
| `3jKLC1z1Y0UGWNcenJGDQW` — sheet/board frames | The frames the shipping shell was actually built against, tracked row-by-row in `parity/MANIFEST.md` | **High.** Includes a **grounded `guests` frame and a grounded `space` (venue) frame.** |

The repo already runs the addendum's classification axis. Its own tiers
(PROVEN / HYBRID / FIGMA-ONLY / CONCEPT) are used below.

### 1.6 Review and reference assets — read-only, untouched

```
hostv2/review-shots/
  README.md                     click-through review guide (what to look for · how to reach it · commit)
  baseline-narrow-mobile.png    baseline-large-mobile.png   baseline-tablet-portrait.png
  baseline-laptop.png           baseline-desktop.png        baseline-large-monitor.png
  drift/      blink-desktop-1-hero … blink-mobile-4   ·   ngw-desktop-1-command, ngw-mobile-1-command,
              ngw-mobile-2-wherestand, ngw-mobile-3-food      (side-by-side competitive drift set)
  marketing/  390x844 · 430x932 · 1024x768 · 1440x900 · 1920x1080
```

Six viewport baselines is the visual-comparison set addendum §10 requires. It
exists and does not need to be built.

---

## 2 · CLASSIFICATION (the addendum's five buckets)

### APPROVED / ESTABLISHED DIRECTION

| Decision | Evidence |
|---|---|
| **Studio Matte** — premium event operations command system, explicitly *"not a generic SaaS dashboard, not a CRM template, not a spreadsheet skin, not a task manager"* | `DESIGN_SYSTEM_HANDOFF.md` §1; CLAUDE.md Product Standard |
| **One loud thing per screen** | handoff §1 — *"If two things shout, neither is heard"* |
| **≈45% void** — *"Empty space is the material. Density reads as cheap."* | handoff §1 |
| **The boss / guide typographic split** — sans carries instruction, serif italic carries reassurance; *"This split is typographic, not colour. Do not merge the two voices."* Newsreader italic, chosen over Fraunces for "Apple-register calm" | handoff §1; `HostShellV2.jsx:1096-1112` |
| **One accent, used once** — **the steel blue `#4c6675` is the identity**, locked across all three modes | `palette.js:57-66`; handoff §1 |
| **Colour means state, never decoration.** Amber = risk, green = settled, steel = identity/action | handoff §1 |
| **Elegant is the default hero direction** — host-approved 2026-07-21, v2→v3 cut; `?elegant=0` is the escape hatch | `HostShellV2.jsx:1108-1111` |
| **Nav B** — app bar hidden, floating dock **retired**, navigation is an eyebrow-summoned sheet with a phase segmented control | `styles.css:365-384` |
| **CTAs name the act**, gated by `ctaNamesTheAct.test.js`; a glyph only when it navigates; no emoji, no hospitality jargon | handoff §1 |
| **Never invent data** — *"Wider screens may reorganise and expose existing truth — they may never invent richer state."* | handoff §1 |
| **Ground-in-code doctrine** — every Figma frame is built from the sheet's real render code; *"Never build a frame from a one-line description. This applies to designs exactly as the no-fake-data rule applies to runtime."* | `parity/MANIFEST.md` |

### IMPLEMENTED AND REUSABLE (PROVEN — take these as-is)

- `askKit.jsx`'s 12 atoms and the two spacing rhythms, with a build-failing gate behind them.
- `hostv2/src/theme.js` — every colour token, both modes, each with a recorded WCAG measurement.
- `styles.css` `--t-*` type scale, `--sp-*` spacing, `--r-*` radii (`--sp-1..7`, `--r-sm..pill`, applied across CSS + 236 inline JSX values).
- **Light mode as one tokenized system** — `?theme=light`, persisted key, `replaceState` so the URL cannot re-assert itself; AA-measured in both modes (`theme.js:24-70`).
- The `SettledRow` fold rule, with explicit fold/stay-inline conditions.
- Sheet mechanics: Tab focus-trap, labelled close, `role="status" aria-live` toasts, landmarks, ≥44px hit areas via zero-layout `::after`.
- Generic undo on every toasting edit (`patchEvent`).
- The six review-shot baselines.

### EXPERIMENTAL (built, reachable, explicitly not yet approved)

| Surface | Status |
|---|---|
| `LodgingCockpit.jsx` (`?demo=lodging`) | *"the REIMAGINED where-everyone-stays cockpit, running beside the live sheet on the same real event… it gets driven and judged here before it replaces anything"* — `main.jsx:66-70` |
| `?voice=sans` | A/B escape hatch on the guide voice |
| `src/slices/*`, `OrchestrationContext`, `adaptiveHierarchy.js` | CRA-side explorations; Figma coverage only via pages tagged CONCEPT |

### STALE / SUPERSEDED

| Claim | Superseded by | Measured |
|---|---|---|
| *"This is a dark-only app. A white card or CTA is a regression, gated in CI."* and *"Light values exist in the palette but the shell does not ship them"* (`DESIGN_SYSTEM_HANDOFF.md` §1, §2) | `hostv2/src/theme.js` (2026-09-28) ships light | **STALE** |
| `palette.js:119-123` *"Until a user-level Theme toggle ships, the app shell runs the Dark Standard Carbon ramp"* / *"Light is dormant (ACTIVE_MODE is 'dark')"* | theme.js stopped consulting `ACTIVE_MODE` and selects the mode bundle directly | **STALE for hostv2** |
| `tokens.js` *"mirrors the Figma NGW Color / Spacing / Typography variables 1:1"* | 2026-08-18 reconciliation | **STALE as a claim, unverifiable as a fact** |
| Figma system map `CYlmJqDCXEaacCuz9wW3bd` as the design baseline | It predates hostv2; no page mentions the host shell | **Superseded for host-shell work** |
| Floating dock / app bar as the elegant-mode navigation | Nav B | **Retired in code** |
| Sprint 46 PLAN pages 87-91, 94 tagged CONCEPT | `src/plan/` ships six components | **Six pages mis-tagged** |

### UNCLEAR — not resolved in this pass, not guessed

1. Whether the `drift/` `blink-*` set is a competitor read or an abandoned internal direction. The filenames are not self-explanatory and I did not find a doc that names it.
2. Which Figma node IDs the grounded **`guests`** and **`space`** frames carry. `MANIFEST.md` names the grounded set in prose (*"vendors/guests/travel/space/seating/risks/runners"*) and gives node IDs only for the rebuilt utility frames (`443/444/446/447/449`). **Reading those two frames is the first input to the People work** and needs Figma access this session does not have.
3. Whether a desktop side rail (`.srail-*`, collapse persisted at `ngw-hostv2-rail-min`) is the approved desktop navigation or a partial build. It exists; I found no ruling.
4. Whether anything was ever designed for **Overview** as a named surface. The addendum names "Overview redesign work"; I found the command hero / plan board and a `command-hero-parity-audit`, but no artifact called Overview.

---

## 3 · THE DOCUMENT-VS-RUNTIME SPLIT, STATED PLAINLY

The single most load-bearing finding for the addendum: **`DESIGN_SYSTEM_HANDOFF.md`
is the document a designer would be handed, and it is wrong about light mode.**
It says dark-only and calls a white surface a CI-gated regression. `theme.js`
has shipped a full light mode since 2026-09-28, mode-selected and AA-measured
on both sides.

This is the repo's own recurring defect — the same shape as the CLAUDE.md
surfaces table that stated a false gate status for six weeks, and the same
shape as Sprint 0.5 Decision 4 condition 10. **Where the handoff brief and
`hostv2/src/theme.js` disagree, theme.js is right.** The brief needs that
correction before it is used to brief anyone, and that correction is cheap.

A matching lesson is already written in `parity/MANIFEST.md`, and it is the
right instruction for the People work:

> *"'already centralized in code' is not 'already the redesign' — check the
> SCREEN against Figma, not just the code's DRY-ness."*

---

## 4 · WHERE THE ADDENDUM'S §2 LOCKED LIST MEETS THE REPOSITORY

**Confirmed and already built (no action):** Studio Matte identity · premium
editorial composition over SaaS composition · editorial/display typography with
restrained utility type · near-black primary surfaces · thin warm boundaries ·
generous negative space · minimal chrome · sophisticated spacing · deliberate
hierarchy · one dominant action · cinematic restraint · consistent glyph
language · **light and dark as one tokenized system** · compact mobile header ·
mobile as a first-class composition.

**Corrected by measurement (the addendum's own hedge covers it):**

> *"mobile bottom navigation where established"* — **it is not established. It
> was retired.** `.dock.dock-retired{ display:none; }`, with the comment *"The
> floating dock is RETIRED in elegant mode — replaced by the eyebrow-summoned
> nav sheet."* The established mobile pattern is **Nav B**. People should
> inherit Nav B, not reintroduce a bottom bar.

> *"desktop top navigation"* — in elegant mode the app bar is **hidden**
> (`.appbar.appbar-elegant{ display:none; }`). What exists on wide screens is a
> collapsible side rail. Filed UNCLEAR above rather than asserted either way.

### 🔴 THE ONE GENUINE CONTRADICTION — brass/gold

Addendum §2 asks to preserve **"restrained brass/gold accents."**

`src/theme/palette.js:35-37`:

```js
// Banned values — never re-introduce:
//   #1a6fba  (SaaS blue)             #14b8a6  (neon teal)
//   #f0bc44  #e08c38  (decorative warm gold — confidence accents)
```

Warm gold is not absent from this system by oversight. It was **removed and
named in a never-re-introduce list**, in the file that is the locked source of
truth, alongside the SaaS blue the addendum also forbids. Two doctrine rules
sit behind that ban:

- *"One accent, used once. The steel blue is the identity. Spending it twice on a screen halves it."*
- *"Colour means state, never decoration. A colour used for flavour is a defect."* — and the banned gold is annotated *"decorative … confidence accents"*, i.e. exactly flavour.

**This cannot be resolved by inspection, because it is not a question of fact.**
Either the concepts the addendum is protecting are a later approved direction
that supersedes the ban — in which case the ban must be lifted *in
`palette.js`*, deliberately, with the steel-blue identity rule restated or
replaced — or the ban stands and "brass/gold" is a memory of a concept that was
tried and rejected. **Owner decision. I have not changed either one.**

Secondary, same family: **"warm ivory light surfaces."** The light mode that
exists is a cool inversion of the carbon ramp (`carbonPanel.light` is
`#ffffff`). Warm ivory would be a new hue direction, not an inheritance. It
rides on the same decision.

---

## 5 · WHAT PEOPLE INHERITS (if the §4 decision lands "ban stands")

1. **Shell, navigation, sheets, motion:** Nav B + the sheet mechanics, unchanged.
2. **Tokens:** `theme.js` colour, `styles.css` type/spacing/radius. No new token without the §5 reuse-or-evolve note.
3. **Components:** compose `askKit` atoms. A roster is a list, not an ask surface — `SettledRow`/`SettledCard`/`OptionList` are the closest existing vocabulary, and a roster row may be the one genuinely new pattern People introduces.
4. **Both themes from the first screen**, because the system is already tokenized for it — not a later pass.
5. **Hero (addendum §3):** the large-hero decision is real and recorded, and the manifest already shows the correct precedent for reinterpreting it per domain — the day-of board **demoted** its giant clock so the moment NAME stayed the hero. The equivalent question for People is whether the dominant first viewport is the **attendance band with its provenance** rather than a photograph. No decorative imagery.
6. **Provenance is visual, not just data.** Sprint 0.5 D1 made `attendanceBand` carry `countFromHost`. A number the app supplied and a number the host gave must not look identical in the hero — that is where the two streams actually converge.
7. **Ground-in-code before designing:** inventory the guests sheet's real copy, fields and states first. The manifest records that the frames built from vague descriptions had to be thrown away and rebuilt, and that the grounded set held.

---

## 6 · RECOMMENDATION ON ADDENDUM §9

**Do not create `docs/architecture/redesign/REDESIGN_PATTERN_LEDGER.md` as a new
file.** `hostv2/src/parity/MANIFEST.md` is already that ledger, it is adjacent
to the kit it describes, and `check-parity.mjs` enforces the rule it states. A
second ledger in another directory is the parallel system addendum §5 forbids
— and this repo has already paid for parallel sources three times (three token
layers, two Figma files, `LS_CUSTOMS` declared twice).

Proposal: **extend `parity/MANIFEST.md` with the People rows**, and have
`PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md` (§9's other file, to be created with the
main redesign prompt) link to it rather than restate it. The *Design
Inheritance* section §9 asks for belongs in the contract; the pattern rows
belong in the manifest.

---

## 7 · WHAT I DID NOT DO

- No visual decision, no component, no screen. The People UI remains unbuilt.
- No file in `hostv2/review-shots/` was written, moved or deleted.
- `palette.js` banned list, `theme.js`, `askKit.jsx`, `MANIFEST.md`: **read only.**
- The stale claims in §3 are **recorded, not yet corrected** — correcting the handoff brief is a one-paragraph change and should be its own small commit once the §4 decision is known, since the brief's colour section depends on it.
