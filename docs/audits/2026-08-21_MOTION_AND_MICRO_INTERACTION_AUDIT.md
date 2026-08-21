# Motion and micro-interaction audit -- hostv2 vs the category

_Measured 2026-08-21 against `demo/hostv2/src/styles.css` (5,492 lines) and
`demo/hostv2/src/theme.js`. Every count below was re-derived by parsing the
stylesheet, not by grep-counting lines. Doctrine of record: UX_01 "Animation and
Transition Rules" (`docs/claude-skills/ui-ux/UX_01_STUDIO_MATTE_VISUAL_LANGUAGE.md:151-157`)
and the motion token table in `docs/DESIGN_SYSTEM_HANDOFF.md:246-266`._

## Status -- updated 2026-08-21 after `76cc7a76`

Six of the eight shortlist items shipped in `76cc7a76` ("Motion: give sheets an
origin, fills a compositor, and the slow band a name"). Two did not: #5
(`max-height` -> `height:auto`) and #6 (first-mount gate on the `cardin`
stagger). Finding 2 (FLIP for list reorder) was never on the list and remains
the largest continuity gap.

Everything below this block was measured BEFORE that commit and is preserved as
the baseline it was. Where a section is now out of date, the shortlist entry
carries a dated **SHIPPED** note with what actually changed and where to read
it. Line numbers cited in the pre-commit text have drifted -- `styles.css` grew
by roughly 36 lines -- so re-grep before trusting any `:NNNN` in the body.

Verification for the shipped work: jest 6044 passed; Playwright desktop 117
passed / 7 skipped, mobile 84 passed, zero failures. New standing gate:
`hostv2/e2e/motionContinuity.spec.mjs`, three tests, each red-proofed by
reintroducing the fault it exists to catch.

## Verdict

**Competent-to-strong on state feedback and reduced motion; behind on continuity;
clean on discipline.** This app's micro-interaction layer is better than its own
docs assume. Press feedback, hover-capability guarding, focus parity and
reduced-motion coverage were all closed by earlier passes and are, on the
evidence, at or above what a mid-tier ops tool ships. The single axis where it is
genuinely behind is **continuity**: nothing in the app connects a before-state to
an after-state spatially. A sheet opened from row 7 rises from the same 24px
offset as a sheet opened from row 1 (`styles.css:1461,1463`); there is no shared
element, no FLIP, no directional origin, and no view-transition anywhere in the
codebase -- the grep for `view-transition|startViewTransition` returns zero hits.
The app's one continuity device is `.rowfocus` (`styles.css:2633`), a landing
ring on the exact row a CTA promised, and it is a good idea executed too
narrowly. Second axis, smaller: a whole speed band (300-900ms, used 20+ times on
disclosure and progress) exists in the CSS and is not named in the token ladder,
so it drifts. Third: 18 transitions animate layout properties, which is the thing
that stutters on the 390px flagship target.

The "61 percent of motion is ceremonial" figure recorded at
`docs/DESIGN_SYSTEM_HANDOFF.md:263` is a **category** observation, and it no
longer describes this app's working surfaces. Measured here: of 57 unique
`@keyframes`, 34 belong to two deliberately-designed one-shot ceremonies (13
splash `sp-*`, 21 reveal/ignition `rv-*`). Of the remaining 23 that run on
working surfaces, 12 are functional (confirm, attention, arrival of new
information, landing ring) and 11 are entrance or ambient. That is roughly
**52 percent functional on the working surfaces** -- better than the category read
this project already filed. The ceremonial mass is concentrated where the host
put it on purpose, and it should stay there.

Where this doc says "leaders", it means a general characterization of the
category unless it cites a repo document. The one grounded competitive datapoint
on motion in this repo is
`docs/audits/2026-08-07_TIER_READ_DENSITY_TYPE_COMMIT_MOTION.md:34-39`, which
found this app's token discipline *more* disciplined than the leaders' surfaces
imply, and confirmed that flat (non-animated) row selection is what the leaders
do. No "Motion Lab" document exists in this repo; the exploration referenced in
project notes lives outside it, so nothing here re-derives it.

## Measured baseline (re-derived)

| Metric | Prompt's figure | Measured | Note |
|---|---|---|---|
| `transition` declarations | 98 | **86** | 98 is the count of *lines* containing the string; 17 of those are `transition:none` overrides and several are comments |
| `animation:` declarations | 100 | **100** | confirmed |
| unique `@keyframes` | 60 | **57** | 60 counts two duplicate names twice and one comment |
| `prefers-reduced-motion` blocks | 28 | **28** | confirmed (27 `reduce` + 1 `no-preference` at `:982`) |
| transitions with a hardcoded duration | ~39 | **36 lines / 60 duration literals** | see below |
| transitions using `var(--ease-*)` | 62 | **62** | confirmed |

Token ladder, defined in `theme.js:171-186` (not in styles.css):
`--ms-micro 100 / --ms-press 120 / --ms-fast 140 / --ms-base 200 /
--ms-ambient 220 / --ms-escalation 230 / --ms-enter 240 / --ms-sheet 260 /
--ms-reveal 420`, on three easings `--ease-out`, `--ease-standard`,
`--ease-in-out`.

## 1. Token integrity -- spelling vs motion

Hardcoded duration literals inside `transition:` declarations, by value and
count: `100ms x4, 140ms x2, 150ms x6, 160ms x3, 220ms x2, 250ms x1, 260ms x4,
300ms x3, 380ms x1, 400ms x1, 500ms x14, 550ms x4, 600ms x6, 620ms x2, 700ms x11,
900ms x5, 1200ms x1, 1400ms x1, 2400ms x1`.

Split them the way the prompt asks:

**Inconsistent spelling only (on-ladder value, spelled literally) -- not a defect.**
`100ms`, `140ms`, `220ms`, `260ms`. These are the ladder's own rungs written out.
Zero perceptual difference. Fixing them is hygiene, not quality.

**Off-ladder but perceptually indistinguishable -- cosmetic.**
`150ms` at `styles.css:870` (x3, the `.decopt-why` tooltip) and `:2370` (x2, invite
option border), `160ms` at `:602` (`.eb-menu` bar tint) and `:683` (x2,
`.efold-grab`). 150 and 160 against a ladder rung of 140 is inside the noise
floor of human timing discrimination. Real defect: they are the only reason a
reader cannot trust that "no literal means no drift."

**Genuinely off-ladder motion -- a whole unnamed speed band.**
The ladder tops out at `--ms-reveal 420ms`. The stylesheet uses a
**300-900ms disclosure/progress band in at least 20 places** with no token at all:

- `:1088` `.bar i{transition:width .9s}` -- readiness bar fill
- `:1590`, `:1592` budget line fills, `.7s`
- `:2335` invite countdown condense, `.55s` (max-height + margin)
- `:2342` invite countdown type shrink, `.5s` (font-size + margin)
- `:2357` invite staged reveal, `.5s`
- `:2397` invite earned disclosure, `.6s`
- `:2421` `.38s/.4s/.3s`, `:2593` `.38s/.3s` -- fold disclosures
- reveal-stage internals `:1739 .62s`, `:1744 .9s`, `:1747 .55s`, `:1763 1.2s/1.4s`,
  `:1771 2.4s`, `:1867 .7s`, `:1921-1931 .5s-.7s`, `:2000/:2030 .5s`

The invite and reveal figures are inside sequences the host ruled on
deliberately, so the values are considered -- but they are considered *in
isolation*, and there is nothing preventing the next author from picking `.65s`.
This is inconsistent motion, not inconsistent spelling: an 900ms bar fill and a
700ms bar fill on adjacent surfaces read as two different products.

Easing is cleaner: 62 of 86 transitions use `var(--ease-*)`; the literal easings
are 4 bespoke cubic-beziers inside the reveal choreography (`:1771, :1867, :1927,
:1979`) plus two raw `ease` keywords at `:2370` and one `ease-in` at `:2003`.
The raw `ease` at `:2370` is the only easing literal on a working surface.

## 2. The four states

Better than expected, and largely settled. `styles.css:3494-3545` documents a
2026-07-30 pass that closed exactly this: 100 `:hover` rules, **43 `:active`**,
25 `:focus-visible`, 12 disabled rules.

- **Press on touch is present and deliberate.** `:1524` and `:1533-1534` give
  `transform:scale(.985)` / `scale(.97)` to chips, CTAs, tiles, rows, minis,
  toast-undo, sheet-x, grow rows, qidx rows, conflict bar, vc-pills. `:766` and
  `:3329` give the hero CTA a `translateY(2-3px)` press. `.req-row:active` dims
  to `.6` (`:3446`). This is press, not hover-collapsed-into-press.
- **Hover does not stick on touch.** `@media (hover:none)` at `:3502` neutralizes
  ~30 decorative hover rules by name, including child-emphasis hovers. This is
  the fix most competitors skip.
- **Focus parity exists.** `@media (hover:hover)` at `:3536` gives 13 surfaces a
  `:focus-visible` background matching their hover.
- **Disabled is thin but present.** `button:disabled, .cta:disabled,
  [aria-disabled="true"]` at `:1540-1543` -- one global treatment plus
  `pointer-events:none`. No atom overrides it. Acceptable; a single disabled
  language is correct under Studio Matte.

Gaps, all minor: `.mini` has an `:active` but no `:focus-visible` (`:1533`);
`.path-row` and `.navrow` have no `:focus-visible`; the section rail
(`.sec-row > .srail-i`, `:4304-4305`) has hover and active but no focus state,
so a keyboard user tabbing the rail gets only the global ring, not the glyph
step-up a mouse user gets.

## 3. Entrance vs attention

23 working-surface keyframes, classified:

**Functional (12)** -- `okring` (`:550`) and `cardexhale` (`:3355`) confirm a
receipt; `toastin` (`:3331`) carries arrival direction; `wxin` (`:2188`) marks
new weather information; `rowfade`/`.rowfocus` (`:2633`) points at the exact row
a CTA promised; `veilin`+`spotring` (`:2163,:2168`) and `spotlamp` (`:3411`)
direct attention to one card; `glowonce` (`:1749`); `foldbob` (`:3366`) and
`handlelight` (`:3418`) teach an affordance that is otherwise invisible;
`donehalo` (`:3350`).

**Entrance or ambient (11)** -- `askin` (`:524`), `rowin` (`:525`), `cardin`
(`:1523`), `sheetrise` (`:1463`), `panelrise` (`:3306`), `welcomein` (`:2056`),
`askrise` (`:3323`), `guidebreath` (`:3327`), `dayrise` (`:3363`), `breathe`
(`:570`), `strataFocus` (`:986`).

Two observations that matter more than the ratio:

- `donehalo` is **dead**. `styles.css:3339-3344` records that `.eprog.is-done` is
  no longer applied by the shell (board 2026-08-03). The rule and keyframe are
  kept for a screen that is not built. That is documented and fine; it just means
  the functional count is really 11.
- `cardin` is applied **inline from JSX with a per-index stagger** at
  `HostShellV2.jsx:10925, 10993, 11015` (`animation: cardin 280ms var(--ease-out)
  ${i*35}ms both`). 280ms is off-ladder and the stagger replays on **every**
  render of the list, not just first mount. That is the clearest ceremonial cost
  left on a working surface: a host who toggles a filter watches the same list
  re-enter from below with nothing having moved.

## 4. Continuity -- the real gap

Nothing in this app is spatially continuous. Concretely:

- **Sheets have no origin.** `.sheet` uses `animation:sheetrise` (`:1461`) =
  `translateY(24px) -> none` (`:1463`). A sheet opened by tapping a vendor row
  three-quarters down the screen rises identically to one opened from the app
  bar. The host loses the answer to "where did this come from," which is the
  question a modal is supposed to answer without words.
- **Lists never reorder visibly.** There is no FLIP, no
  `getBoundingClientRect`-driven transform, no `view-transition-name` anywhere.
  When ranking changes (and this product's whole thesis is that ranking changes),
  rows cut to their new positions.
- **Values cut.** The one exception is the bars -- `.bar i` and `.bline b`
  interpolate `width`, so a readiness or budget number moving *is* animated. But
  the number beside them is a plain text swap, so the bar glides while the digits
  jump.
- **The one thing that does work.** `.rowfocus` (`:2633`) applies a steel ring to
  the destination row and fades it over 3.2s. It is wired at 8 call sites in
  `HostShellV2.jsx` (10925, 10993, 11015, 11098, 12730, 12937, 13108, 13345,
  13441). This is the correct instinct and it is the thing to extend, not
  replace: it satisfies the "row-level CTAs" law by *showing* the landing rather
  than asserting it.

Where continuity would earn its cost, ranked: (a) sheet-from-row origin, because
it is the highest-frequency navigation in the app; (b) the readiness/budget
number matching its bar, because a jumping digit next to a gliding bar reads as
a bug; (c) list reorder, only on the surfaces where reorder is the *point*
(ranked decisions, the call sheet) and nowhere else.

## 5. Reduced motion

**Coverage is complete, and it is complete for a reason that makes the other 27
blocks nearly redundant:** `styles.css:1507-1509` is a global nuke -- 

    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{transition:none!important; animation:none!important}
    }

Every animated property in the file is covered by this. The 27 targeted blocks
exist to *restore* elements whose resting state is `opacity:0` and which depend
on an animation's `both` fill to become visible. I checked all 13 such rules
mechanically; 10 are correctly restored (`.rv-tile-compose :1871`,
`.rv-name .rv-L :2008`, `.rv-sparks i :2018`, `.rv-trail :2024`,
`.rv-cascade .rv-line :2037`, `.welcome section > * :2048`, `.sp-dot::after
:3028`, `.sp-line-1/2 :3117-3118`, `.rv-slowrows .rv-line :1844`). Findings:

- **`.rowfocus` ring never clears under reduced motion.** `:2633` sets the
  box-shadow in the base rule and relies on `animation:rowfade ... forwards` to
  remove it. With animations killed, the ring is permanent -- the host lands on a
  row and it stays ringed for the life of the sheet, and a second landing rings a
  second row with the first still lit. This is the one real reduced-motion
  defect: a *stuck state*, not a missing animation.
- **`.rv-lastland` (`:1819`, `:1849`) is not restored** by the reduced-motion
  block at `:1897`, which names `.rv-meyebrow,.rv-mname,.rv-slowrows .rv-line,...`
  but not `.rv-lastland`. It is however **dead code** -- the class appears nowhere
  in JSX (grep: only 4 hits, all in styles.css). So the risk is latent, not live.
- `.eprog.is-done::after` (`:3348`) stays `opacity:0` under reduced motion, which
  is correct -- it is a decorative halo, and the rule is parked anyway.

The blunt global also has a cost worth naming: it kills motion that reduced-motion
users would benefit from. The WCAG intent is to remove *vestibular* motion
(large translations, parallax, scale), not cross-fades. Killing all transitions
means a reduced-motion host gets hard color cuts on every hover and press, which
reads as an unfinished build rather than a considered accommodation. This is a
judgment call, not a bug; the safer refinement is to keep the global for
`animation` and scope `transition:none` to transform/filter only.

## 6. Performance

18 transitions animate layout-triggering properties. On a mid-range Android at
390px these are the frames that drop.

| Line | Property | Surface |
|---|---|---|
| `:542` | `height` | `.editor-slot` (mitigated: `interpolate-size` opt-in at `:541`) |
| `:562` | `height, margin-top, padding-top` | `.receipt` unfold |
| `:683` | `width` | `.efold-grab` handle |
| `:1088` | `width` | `.bar i` readiness fill |
| `:1590`, `:1592` | `width` | budget line fills |
| `:1921` | `width, height, margin` | reveal stage |
| `:2000`, `:2030` | `width, height` | reveal spine/trail |
| `:2153` | `max-height` | `.slidepanel` |
| `:2335` | `max-height, margin` | invite countdown |
| `:2342` | `font-size, margin` | invite countdown type |
| `:2397` | `max-height` | invite disclosure |
| `:2418` | `width` | invite bar |
| `:2421`, `:2593` | `max-height` | fold disclosures |
| `:2822` | `bottom` | `.wxpill` |
| `:3576` | `width` | `.mbar i` |

Two keyframes also animate layout: `@keyframes rvfront` (`:1806`, `top`) and
`@keyframes rvtrail` (`:2031`, `width`), both inside the reveal ceremony.

The `width` bar fills (`:1088, :1590, :1592, :2418, :3576`) are the cheapest wins
in the whole audit: a `transform: scaleX()` on a `transform-origin:left` inner
element is pixel-identical for a solid-color bar and moves the work off the main
thread entirely. `:2822 bottom` on `.wxpill` is the same trade with
`translateY`.

The `max-height` disclosures (`:2153, :2335, :2397, :2421, :2593`) are a
different problem: `max-height` clamping means the transition runs against a
guessed ceiling, so either the panel snaps early (ceiling too low) or the last
100-300ms of the animation is dead time (ceiling too high). `:root` already opts
into `interpolate-size: allow-keywords` (`:541`), and `.editor-slot` (`:542`) and
`.receipt` (`:562`) already use real `height:auto` interpolation -- so the
mechanism is in the file and five surfaces have not adopted it.

## Findings table

Status column added 2026-08-21 after `76cc7a76`; every entry marked SHIPPED was
read in the source at HEAD, not taken from the commit message.

| # | Finding | Sev | file:line | One-line fix | Status |
|---|---|---|---|---|---|
| 1 | No shared-element / directional origin anywhere; every sheet rises from the same 24px offset regardless of what opened it | P1 | `styles.css:1461,1463` | Pass the tapped row's viewport Y as a CSS var and make `sheetrise` start from it | **SHIPPED** -- `--from-y` at the pointer |
| 2 | No FLIP or view-transition; ranked lists cut to new positions | P1 | (absent; grep `view-transition` = 0 hits) | Add FLIP to the ranked-decision and call-sheet lists only | OPEN -- still zero `view-transition` hits |
| 3 | `.rowfocus` ring never clears under `prefers-reduced-motion` (base rule sets the shadow, `rowfade` removes it) | P1 | `styles.css:2633` | Move the ring into the keyframe, or add a reduced-motion rule setting `box-shadow:none` | **SHIPPED** -- static 2px core under reduce |
| 4 | 300-900ms disclosure/progress band used 20+ times with no ladder rung above `--ms-reveal 420` | P1 | `theme.js:186`; `styles.css:1088,1590,2335,2397,2421,2593` | Add `--ms-slow 550` / `--ms-fill 700` to `theme.js` and consume them | **SHIPPED** -- `--ms-slow/--ms-fill/--ms-land` |
| 5 | Five `width` transitions animate layout on progress bars | P2 | `styles.css:1088,1590,1592,2418,3576` | `transform:scaleX()` with `transform-origin:left` | PARTIAL -- `.bar i` only; four width fills left |
| 6 | Five `max-height` disclosures guess a ceiling while `interpolate-size` is already enabled | P2 | `styles.css:2153,2335,2397,2421,2593` | Switch to `height:auto` like `:542` already does | OPEN -- not started |
| 7 | `.wxpill` transitions `bottom` | P2 | `styles.css:2822` | `translateY` | OPEN -- `.wxpill` still transitions `bottom` |
| 8 | `cardin` replays a staggered list entrance on every render, inline, at an off-ladder 280ms | P2 | `HostShellV2.jsx:10925,10993,11015` | Gate on first mount; move 280ms to `--ms-sheet`/`--ms-enter` | PARTIAL -- duration tokenized, stagger still replays |
| 9 | `@keyframes toastin` defined twice with different curves; the second (with a `-4px` overshoot) silently wins | P2 | `styles.css:1335` and `:3331` | Delete `:1335`; note that the overshoot contradicts UX_01:154 "no bounce" and needs a host ruling either way | **SHIPPED** -- dup deleted, conflict ruled |
| 10 | Bars glide while the number beside them cuts | P2 | `styles.css:1088,1590` + call sites | Tween the digit with the bar, or stop tweening the bar | OPEN -- digit still cuts |
| 11 | Global reduced-motion nuke kills color/opacity transitions too, so reduced-motion users get hard cuts everywhere | P2 | `styles.css:1507-1509` | Scope `transition:none` to transform/filter; keep `animation:none` global | OPEN -- global nuke unchanged |
| 12 | Six off-ladder-by-spelling durations (150ms x5, 160ms x3) | P3 | `styles.css:602,683,870,2370` | Replace with `var(--ms-fast)` | OPEN |
| 13 | Raw `ease` keyword on a working surface | P3 | `styles.css:2370` | `var(--ease-out)` | OPEN |
| 14 | `@keyframes rvrackrow` defined twice, byte-identical | P3 | `styles.css:1822`, `:1896` | Delete one | OPEN -- `rvrackrow` still duplicated |
| 15 | `.rv-lastland` rules reference a class no JSX applies | P3 | `styles.css:1819,1821,1849` | Delete, or wire it | OPEN |
| 16 | Section rail glyph has hover + active but no `:focus-visible` step-up | P3 | `styles.css:4304-4305` | Add `.sec-row:focus-visible > .srail-i` | **SHIPPED** -- `.sec-row:focus-visible` |
| 17 | `.mini`, `.path-row`, `.navrow` have press but no focus-visible surface response | P3 | `styles.css:1533`, `:529` | Add to the `:3536` focus-parity list | OPEN -- the three atoms added were `.srail-row`, `.palette-row`, `.sec-row`; these three were not |

## Ranked shortlist -- 8 changes, best quality-per-risk first

1. **Bar fills to `scaleX`** (findings 5, 7) -- detailed below.
   **SHIPPED (`76cc7a76`), narrower than proposed.** `.bar i` is now
   `width:100%; transform-origin:left center; transform:scaleX(var(--fill,0));
   transition:transform var(--ms-fill)` (`styles.css:1104-1106`). The fill's own
   `border-radius:6px` was **deleted, not moved** -- `.bar` already carried
   `border-radius:6px` plus `overflow:hidden`, so the track was always doing the
   clipping and the radius on the fill had never been visible. Three JSX call
   sites converted from `width: pct + '%'` to `'--fill': pct/100`
   (`HostShellV2.jsx:8972, 14759, 15019`); the `--fill` default of 0 means a bar
   that renders before its value arrives shows an empty track rather than
   flashing full and snapping back.
   `.bline` was **deliberately not converted**, and the reason is recorded in the
   CSS at `:1621-1626`: `.bline b` is a child of `.bline i` sized as a percentage
   *of it*, so scaling the parent would multiply into the child and the inner
   segment would land at the wrong value. Two segments, one relative to the
   other, is a real chart -- it stays on `width` on purpose.
   **Still open from this item:** `.bline i` / `.bline b` (`:1627, :1629`), the
   invite bar (`:2455`), `.mbar i` (`:3636`) and `.wxpill{transition:bottom}`
   (`:2877`, finding 7) all still animate layout. One of five fills converted.
2. **Fix the stuck `.rowfocus` ring under reduced motion** (finding 3) -- detailed below.
   **SHIPPED (`76cc7a76`).** This was a live defect, not a polish item: the ring
   lived in the base rule with `rowfade` as its only remover, so under
   `prefers-reduced-motion: reduce` the global `animation:none !important` left
   the full transient treatment -- 2px core **plus the 8px halo**, sized to be
   seen for three seconds -- applied permanently for the life of the sheet, and a
   second landing lit a second row with the first still on.
   Of the two fixes this doc offered, the one taken is the **preferred** one:
   `styles.css:2686-2689` adds `@media(prefers-reduced-motion:reduce){
   .rowfocus{ box-shadow:0 0 0 2px var(--steel) } }` -- a static 2px core, no
   halo. The alternative (ring purely in the keyframe, so reduce yields no ring
   at all) was rejected because it loses the landing cue, and the row-level-CTA
   law requires the landing to be legible: the host who most needs telling where
   they landed is the one who turned motion off.
3. **Sheet rises from the row that opened it** (finding 1) -- detailed below.
   **SHIPPED (`76cc7a76`), implemented at the pointer rather than at each call
   site.** A capture-phase `pointerdown` listener records the last tap's
   `clientY` and timestamp into `lastTapRef` (`HostShellV2.jsx:3490, 3512-3516`).
   A `useLayoutEffect` keyed on the sheet's identity (`sheet.kind`, `sheet.focus`)
   measures the sheet rect, computes `--from-y` as `tap.y - rect.top` clamped to
   0-320px, writes it to the element, and restarts the animation with the
   `none` / forced-reflow / `''` idiom -- necessary because the element mounts
   with `animation:sheetrise` already applied, so the engine has resolved its
   from-frame before any effect runs (`:3529-3546`).
   `styles.css:1494` now reads
   `@keyframes sheetrise{from{transform:translateY(var(--from-y,24px)); opacity:.4} to{transform:none; opacity:1}}`.
   Two design decisions worth carrying forward. **Pointer, not call site:** the
   row-level-CTA law means sheets open from dozens of places, and threading a
   rect through each would be forty edits, forty chances to miss one, and a
   permanent tax on the forty-first. **A 1200ms staleness window:** the tap is
   only trusted for a moment, so keyboard, deep-link and route-restore paths fall
   back to the 24px default -- inheriting the Y of something touched minutes ago
   would be worse than no origin at all.
4. **Name the slow band in `theme.js`** (finding 4).
   **SHIPPED (`76cc7a76`), and the source-of-truth detail matters.** `slow: 550`,
   `fill: 700` and `land: 3200` were added to `src/design/tokens.js:245-255`;
   `--ms-slow`, `--ms-fill` and `--ms-land` are set in `hostv2/src/theme.js:198,
   199, 203`. The build's own `check-parity.mjs` gate **failed until the tokens
   existed at the source** -- `theme.js` alone was not enough, which is the gate
   working as designed and is the reason this could not be done as a stylesheet
   edit.
   Consumed at: the four disclosure sites (`styles.css:2372, 2379, 2434, 2630`,
   all `--ms-slow`), `.bar i` and both `.bline` fills (`:1106, 1627, 1629`, all
   `--ms-fill`), and `.rowfocus`/`rowfade` (`:2670`, `--ms-land`). `--ms-land` is
   named separately on purpose: a landing ring is a **dwell**, not an interaction
   speed, and folding 3.2s into the same ladder as a 260ms sheet would invite
   someone to "fix" it.
   Also in this item: `cardin`'s off-ladder literals moved to `var(--ms-enter)`
   at **14 sites** (12 x 280ms, 2 x 340ms). Three `cardin` literals survive and
   are not fixed -- 260ms at `HostShellV2.jsx:14418` and `:14456`, 300ms at
   `:17613`. The ladder is cleaner, not clean.
   Original prescription, kept for reference: add
   `set('--ms-slow', (durations.slow || 550) + 'ms')` and
   `set('--ms-fill', (durations.fill || 700) + 'ms')` after `theme.js:186`, then
   replace the `.55s/.5s/.6s` disclosure literals with `--ms-slow` and the
   `.7s/.9s` fill literals with `--ms-fill`. Value-preserving on 12 of the 20
   sites; the 8 that shift (900 -> 700, 380 -> 550) shift toward each other,
   which is the point. Zero risk of breakage, moderate gain: it stops the drift
   at the source.
5. **`max-height` disclosures to `height:auto`** (finding 6). `interpolate-size`
   is already on at `:541` and two surfaces already use it. Removes the guessed
   ceiling and its dead time. Low risk; verify each panel still clips during the
   transition (`overflow:clip`).
   **OPEN. Not started.** All five surfaces still clamp `max-height`
   (`styles.css:2190, 2372, 2434, 2630` plus the invite disclosure). `76cc7a76`
   changed their *durations* to `--ms-slow` and nothing else, so the guessed
   ceiling and its dead time are exactly as this audit measured them.
6. **First-mount gate on the `cardin` list stagger** (finding 8). A list that
   re-enters from below every time a filter toggles is the last ceremonial cost
   on a working surface. Low risk, immediately noticeable.
   **OPEN. The ceremonial-cost finding is unresolved.** Only the *duration* was
   tokenized in `76cc7a76`; no gate was added. The stagger still replays in full
   every time any of those fourteen lists remounts, so a host who toggles a
   filter still watches the list re-enter from below with nothing having moved.
   This is the last ceremonial cost on a working surface and it is still there.
   (A `rowEnter` helper gating on sheet arrival exists uncommitted in the working
   tree at the time of writing. It is not in `76cc7a76`, is not gated by a test,
   and is not credited here.)
7. **Delete the duplicate `toastin` and surface the bounce question** (finding 9).
   The live curve overshoots to `-4px`; UX_01:154 says "No spring physics. No
   bounce." The later comment at `:3330` calls it "one soft bounce" deliberately.
   Delete the dead first definition regardless; put the doctrine conflict to the
   host rather than silently picking a side.
   **SHIPPED (`76cc7a76`), and the conflict is resolved rather than deferred.**
   The first definition is gone; one `@keyframes toastin` remains, at
   `styles.css:3386`, and `:1353-1357` leaves a comment where the dead one stood
   saying why (a keyframe you can read but never see is worse than none).
   The surviving `-4px` overshoot was **KEPT**. Recorded reasoning: UX_01:154
   says "No spring physics. No bounce", but the host ruling of 2026-07-23 that
   shipped the Motion System specifies "toast lands with one soft bounce", and
   that ruling is both later and more specific than the doctrine line.
   **Consequence to act on: UX_01:154 is now the stale text.** Doctrine and the
   shipped surface disagree, and the resolution favors the surface -- so the
   doctrine line needs an exception noted or a re-ruling, not the toast.
8. **Focus parity for the rail and the remaining atoms** (findings 16, 17).
   Three selectors appended to the existing `:3536` block. Trivial risk.
   **SHIPPED for finding 16; finding 17 is untouched.** `.srail-row`,
   `.palette-row` and `.sec-row` were added to the existing `@media (hover:hover)`
   focus-visible block (`styles.css:3601-3603`), which closes the section rail --
   the important one, since the rail is the app's primary desktop navigation and
   desktop is where a keyboard user lives. But finding 17 named `.mini`,
   `.path-row` and `.navrow`, and those three still have no `:focus-visible`
   (grepped at HEAD: zero hits). Three atoms gained parity; they were not these
   three.

Explicitly **not** on this list: FLIP for list reorder (finding 2). It is the
right idea and the wrong next step -- it is the highest-risk change in the file,
it touches render paths rather than styles, and it should follow #3 so the
sheet-origin work establishes the geometry plumbing first.
**Still open after `76cc7a76`, and now correctly next.** The grep for
`view-transition|startViewTransition|getBoundingClientRect`-driven reorder still
returns nothing for lists. This remains **the largest continuity gap in the
app** -- ranking changing is this product's whole thesis, and rows still cut to
their new positions. Its sequencing argument is now satisfied rather than
pending: #3 shipped and established the geometry plumbing.

## The gate, and two measurement traps it cost to find

`hostv2/e2e/motionContinuity.spec.mjs` (new in `76cc7a76`) carries three tests
-- sheet origin, bar-fill equivalence, reduced-motion ring -- each red-proofed by
reintroducing the fault it exists to catch. Two traps are worth recording,
because both produced a green test over a broken feature:

- **A test can assert the input and never the output.** The first version of the
  origin assertion read `--from-y` off the sheet's inline style. It stayed green
  when the keyframe was reverted to the old constant `translateY(24px)` -- it was
  testing that JS wrote a custom property, not that anything consumed it. The
  test now pins the animation at `currentTime = 0` and reads the **painted
  matrix**, taking translateY from the matrix's 6th component. Assert the
  rendered result, not the value you handed the renderer.
- **An emulation can silently not take.** `test.use({ reducedMotion: 'reduce' })`
  did not reach the page -- `matchMedia('(prefers-reduced-motion: reduce)').matches`
  read `false` inside it, so the test was passing against a normal-motion page
  and would have passed against the original bug. It now calls
  `page.emulateMedia({ reducedMotion: 'reduce' })` and **asserts the emulation
  took** (`expect(on, 'reduced-motion emulation did not take').toBe(true)`)
  before asserting anything else. Any test whose premise is an environment flag
  should assert the flag first.

### 1. Bar fills to `transform: scaleX()`

Five declarations animate `width` on solid-color progress fills:
`styles.css:1088` (`.bar i`, `.9s`), `:1590` and `:1592` (`.bline b`, `.7s`),
`:2418` (invite bar, `--ms-ambient`), `:3576` (`.mbar i`, `--ms-reveal`). Each is
a full-height child of a rounded track, filled with a flat color or the steel
token -- no gradient that would distort under scale, no text inside, no child that
would squash. Also `:2822`, `.wxpill{transition:bottom}`.

For each: set the inner element to `width:100%; transform-origin:left center;
transform:scaleX(var(--fill,0)); transition:transform <token> var(--ease-standard)`
and set `--fill` where the code currently sets `style.width`. Grep the JSX for
each class (`.bar i`, `.bline b`, `.mbar i`) and change the inline `width:
'NN%'` to `'--fill': NN/100`. For `.wxpill`, replace `transition:bottom` with
`transition:transform var(--ms-sheet) var(--ease-standard)` and drive
`translateY` instead of the `bottom` offset.

Verification: pixel-identical is the bar. Assert it -- render at 0%, 43%, 100%,
measure `getBoundingClientRect().width` of the fill before and after the change
at each stop, and require equality within 0.5px. Then confirm the border-radius
on the fill: `scaleX` distorts corner radius, so if any of these five fills carry
their own radius (`:1088` has `border-radius:6px`, `:1592` has `5px`), either
move the radius to the track with `overflow:hidden` or keep `width` on that one
and say so. Check `:1088` and `:1592` specifically -- both do carry a radius, so
both need the radius moved to the parent track first.

### 2. Fix the stuck `.rowfocus` ring under reduced motion

`styles.css:2633-2634`:

    .rowfocus{box-shadow:0 0 0 2px var(--steel), 0 0 0 8px var(--steel-tint); animation:rowfade 3.2s var(--ease-standard) 1 forwards}
    @keyframes rowfade{0%,70%{box-shadow:...} 100%{box-shadow:0 0 0 0 transparent}}

The ring lives in the base rule. `rowfade` is the *only* thing that removes it.
The global kill at `:1507` sets `animation:none!important`, so under
`prefers-reduced-motion: reduce` the ring is applied and never removed. `.rowfocus`
is applied at 9 sites in `HostShellV2.jsx` (10925, 10993, 11015, 11098, 12730,
12937, 13108, 13345, 13441) and in several the class is driven by `sheet.focus`,
which persists for the life of the sheet -- so a reduced-motion host accumulates
rings.

Two acceptable fixes. Preferred: add, after `:2634`,

    @media(prefers-reduced-motion:reduce){ .rowfocus{ box-shadow:0 0 0 2px var(--steel) } }

which keeps the landing *legible* (the whole point of the row-level-CTA law) as a
static ring while the animation is off -- but only if the JS clears `sheet.focus`
on the next interaction. Grep `sheet.focus` in `HostShellV2.jsx` and confirm it
is reset; if it is not, use the alternative: keep the ring purely in the keyframe
(base rule carries no box-shadow) so `animation:none` yields no ring at all,
which is safe but loses the landing cue for reduced-motion users.

Red-proof it: set `prefers-reduced-motion: reduce` in the browser, drive two
different row-level CTAs in sequence, and assert via `getComputedStyle` that at
most one element in the document has a non-`none` `box-shadow` matching the
`--steel` ring. Reintroduce the bug (revert the fix) and confirm the assertion
goes red -- a gate on this that cannot fail is not a gate.

### 3. Sheet rises from the row that opened it

Today `styles.css:1461` applies `animation:sheetrise var(--ms-sheet)
var(--ease-standard)` and `:1463` defines it as `translateY(24px), opacity .4 ->
none, 1`. Constant, origin-free.

Change: at the point where a row handler opens a sheet, capture
`e.currentTarget.getBoundingClientRect()` and write two custom properties on the
sheet element -- `--from-y` (the row's center Y minus the sheet's eventual top,
clamped to something sane like 0-320px) and optionally `--from-scale` (row height
/ sheet height, clamped to 0.94-1). Then:

    @keyframes sheetrise{
      from{ transform:translateY(var(--from-y, 24px)) scale(var(--from-scale, 1)); opacity:.4 }
      to{ transform:none; opacity:1 }
    }

Both properties keep a default, so every existing call site that does not pass
them behaves exactly as it does today -- this is why the change is lower risk than
it sounds. Roll it out to the row-opened sheets first (the same call sites that
already set `sheet.focus`), leave app-bar and dock-opened sheets on the default.

Do not scale the sheet's *content* -- scale distorts type. If `--from-scale` reads
badly at 390px, drop it and ship translate-only; the directional cue is 80
percent of the value.

Constraints: `--ms-sheet` is 260ms and must not grow -- a longer travel at a fixed
duration is the correct trade, not a slower sheet. Honor reduced motion: the
global at `:1507` already kills the animation, and since the sheet's resting
state is `transform:none; opacity:1`, killing it is safe (verified -- `.sheet` has
no `opacity:0` base rule).

Verification: drive a sheet from the top row and from the bottom row of the same
list at 390px, capture `--from-y` from `getComputedStyle`, and assert the two
differ by more than 200px. That is the machine-checkable definition of "it has an
origin."

## Already good -- leave alone

These are settled, documented, and better than the category. Churning them would
make this audit worse than no audit.

- **The splash choreography** (`styles.css:2874-3230`, 13 `sp-*` keyframes,
  3600ms compressed from a 7200ms prototype). Host-ruled, with a full
  reduced-motion resolved state at `:3188-3205` and a `.splash-quick` fast path
  at `:3216-3223`. The one open question about it -- whether a brand film should
  run at all -- was already argued and deliberately left standing at
  `docs/audits/2026-07-12_DARK_CARBON_SPLASH_10PLUS_AUDIT.md:61`. Do not reopen it
  here.
- **The reveal / ignition sequence** (`:1680-2060`, 21 `rv-*` keyframes). Shipped
  2026-07-27, with per-stage reduced-motion resolutions at `:1853`, `:1875`,
  `:1897`, `:2045`. Its long durations are off-ladder on purpose; a ceremony is
  the one place a bespoke curve is correct.
- **Press feedback across touch surfaces** (`:1521-1534`, `:3446`,
  `:766`, `:3329`). Broad, consistent, `scale(.985)`/`.97`, and explicitly
  authored for the no-hover case.
- **The pointer-capability block** (`:3494-3560`): hover-trap fix, sticky-hover
  neutralization under `@media (hover:none)`, and focus parity under
  `@media (hover:hover)`. This is the strongest single piece of motion work in
  the file.
- **The 44px tap-target overlays with a `(hover:hover) and (pointer:fine)`
  opt-out** (`:4128-4160`). Correct on both axes.
- **Flat row selection.** `docs/audits/2026-08-07_TIER_READ_DENSITY_TYPE_COMMIT_MOTION.md:38-39`
  already established that the leaders render selection as a flat tint and this
  app matches. Do not animate selection.
- **No confetti on commit.** Same source, line 36-37: zero of 21 ops apps
  celebrate a commit. This is the category standard, not austerity.
- **The three-easing set.** `--ease-out`, `--ease-standard`, `--ease-in-out`, no
  spring, no bounce (modulo the `toastin` question in finding 9). Do not add a
  fourth.
- **`.rowfocus` as a concept.** It is the app's only continuity device and it is
  the right one. Fix its reduced-motion bug; extend it; do not replace it.
