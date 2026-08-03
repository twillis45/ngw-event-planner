# Event Boss - Design System Handoff

A brief for continuing design work in Claude Design (or any tool) so that what
comes out is on-system rather than merely nearby.

Repo name is NGW Event Planner. Product voice calls it Event Boss.

Every value in this document was read from the source of truth or measured from
the running shell. Nothing here is authored for the document. Where a value came
from a live measurement rather than a file, it says so.

---

## 0. How to use this

Read section 1 before designing anything. It is short and it constrains every
other section.

Then take values from sections 2-6 and component specs from section 7. Do not
invent a value that is not in here - if you need one that is missing, say it is
missing rather than filling the gap. A plausible-looking invented token is the
single most common way this system has been broken.

**The source chain.** Colour never lives in CSS.

    demo/src/theme/palette.js     the locked palette, per mode
      -> hostv2/src/theme.js      injects CSS custom properties at runtime
        -> hostv2/src/styles.css  consumes them; zero colour literals

This matters practically: grepping styles.css for a colour token returns
nothing, because it is set at runtime. Several tokens in this document
(--faint, --cta-grad, --carbon-text, --line-soft) exist ONLY after theme.js
runs. Reading files will tell you they do not exist. They do.

---

## 1. Doctrine - the rules that shape everything

These are not preferences. Breaking one produces something that reads as a
different product.

**Studio Matte.** A premium event operations command system. Not a generic SaaS
dashboard, not a CRM template, not a spreadsheet skin, not a task manager.

**One loud thing per screen.** Exactly one element earns emphasis. Everything
else recedes. If two things shout, neither is heard.

**About 45 percent void.** Empty space is the material. Density reads as cheap.

**The boss / guide typographic split.**
  - Sans (instruction, the "boss" voice) carries what to do.
  - Serif italic (reassurance, the "guide" voice) carries how it is going.
  This split is typographic, not colour. Do not merge the two voices.

**One accent, used once.** The steel blue is the identity. Spending it twice on
a screen halves it.

**Colour means state, never decoration.** One meaning per colour. Amber is risk.
Green is settled. Steel is identity and action. A colour used for flavour is a
defect.

**No white surfaces.** This is a dark-only app. A white card or CTA is a
regression, gated in CI. Confirmations read green on the single --ok token;
errors stay neutral rather than shouting red.

**Never invent data.** A surface shows what the engine derived. If the engine
does not know, the surface says so. Wider screens may reorganise and expose
existing truth - they may never invent richer state.

**CTAs name the act.** "Send payment to Hearthstone Catering Co", never "Do
this" or "Take me to it". Gated by ctaNamesTheAct.test.js.

**A glyph only when it navigates.** Render an arrow or chevron ONLY when the
handler actually routes somewhere. An in-place settle earns no glyph.

**No emoji in product copy. No hospitality jargon.** Plain host language.

---

## 2. Colour

Mode is dark. ACTIVE_MODE = 'dark' in palette.js. Light values exist in the
palette but the shell does not ship them.

### Ground and surface

| Token         | Value                    | Use |
|---------------|--------------------------|-----|
| `--bg`        | `#141518`                | app canvas |
| `--bg-band`   | `#25262A`                | body ground behind the stage |
| `--card`      | `#1E1F22`               | raised card / panel |
| `--line`      | `#313338`                | hairline border |
| `--line-soft` | `rgba(49,51,56,.55)`     | quieter divider, progress track |

### Text

| Token          | Value                     | Use |
|----------------|---------------------------|-----|
| `--ink`        | `#EEF0F4`                 | primary text |
| `--ink-soft`   | `#849EB8`                 | secondary, eyebrows, guide voice |
| `--muted`      | `#909296`                 | de-emphasised meta |
| `--faint`      | `rgba(144,146,150,.98)`   | quiet labels, chevrons, grab-handle caption |

`--muted` was deliberately de-blued to a true neutral (blue channel only +6 over
red). It had been the same blue-grey as `--ink-soft`, which made muted text read
as a dimmer copy of the brand hue instead of as de-emphasised. Do not re-blue it.

`--faint` is dim on purpose - it labels things you are meant to glance past. Do
not use it for copy a person actually reads.

### Identity and action

| Token          | Value                                            | Use |
|----------------|--------------------------------------------------|-----|
| `--steel`      | `#4E6877`                                        | identity accent |
| `--steel-dark` | `#3F5B6A`                                        | gradient bottom |
| `--steel-soft` | `#8AA3B0`                                        | text-legible steel on carbon |
| `--steel-tint` | `rgba(78,104,119,.16)`                           | soft CTA fill |
| `--cta-grad`   | `linear-gradient(180deg,#4E6877 0%,#3F5B6A 100%)`| primary CTA |
| `--sheen`      | `rgba(111,135,148,.10)`                          | 1px inner top highlight |

### Status

| Token       | Value      | Meaning |
|-------------|------------|---------|
| `--ok`      | `#4FAE7A`  | settled / handled |
| `--on-ok`   | `#0D2018`  | text on a solid ok fill |
| `--warn`    | `#ECA13F`  | risk, dated pressure |
| `--danger`  | `#F27A70`  | failure (lightened from #E84036 for contrast) |
| `--progress`| `#B3A0CC`  | progress accent |

Each status token also has a `-tint` at 10 percent (`--ok-tint`, `--warn-tint`,
`--danger-tint`) for backgrounds.

### The restraint rule for large areas

Solid `--steel` is reserved for SMALL controls. Nothing in the shipped app fills
a large area with it. Large surfaces use the tint, a low-alpha wash, or nothing.

Evidence in the product: the primary soft CTA is steel at 16 percent alpha; the
Event Types selected row is a 60 percent band; the PRIMARY badge is an 18
percent fill with a 55 percent border. Loudness here comes from saturation, and
upscale in a dark UI comes from tonal range inside one hue plus a single accent.

---

## 3. Type

The scale is the single source of truth and is named by ROLE, not value. New
type consumes a token. A raw px font-size is a review flag.

| Token             | Value                    | Role |
|-------------------|--------------------------|------|
| `--t-display-xl`  | `clamp(36px,11cqw,48px)` | serif display XL, welcome/after heroes |
| `--t-display-l`   | `clamp(30px,9.5cqw,40px)`| serif display L, reveal name |
| `--t-hero-star`   | `38px`                   | sheet headline figure |
| `--t-stat`        | `38px`                   | tile stat numbers |
| `--t-stat-sm`     | `24px`                   | compact stat |
| `--t-section`     | `22px`                   | section heads |
| `--t-card-title`  | `19px`                   | card titles |
| `--t-sheet-title` | `18px`                   | sheet header |
| `--t-sub`         | `17px`                   | deck lines, question labels |
| `--t-cta-big`     | `17px`                   | primary-moment CTA |
| `--t-input-lg`    | `17px`                   | standard field |
| `--t-row`         | `16px`                   | row primary text |
| `--t-input`       | `16px`                   | compact input, iOS no-zoom floor |
| `--t-body`        | `15.5px`                 | running prose |
| `--t-body-s`      | `15px`                   | compact body |
| `--t-cta`         | `15px`                   | standard CTA |
| `--t-toast`       | `14px`                   | toast copy |
| `--t-chip`        | `14px`                   | chips, lenses |
| `--t-meta`        | `14px`                   | supporting meta |
| `--t-btn`         | `13.5px`                 | small utility buttons |
| `--t-row-sub`     | `13.5px`                 | row sub-lines |
| `--t-pill`        | `13px`                   | status pills |
| `--t-note`        | `13px`                   | quiet inline notes |
| `--t-tag`         | `12px`                   | category tags |
| `--t-overline`    | `12px`                   | uppercase eyebrows, tile labels |
| `--t-caption`     | `11.5px`                 | captions |
| `--t-caption-min` | `11px`                   | smallest legal type, hard floor |
| `--lh-body`       | `1.5`                    | body line-height |

### Families

    --sans   -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI',
             Roboto, Helvetica, Arial, sans-serif
    --serif  'Playfair Display', Georgia, 'Times New Roman', serif

**Playfair is stationery-only.** It carries the guest-facing Reveal - the thing
people screenshot. Do not spread it into host-shell surfaces.

**The host guide voice uses Newsreader italic**, a separate reading serif. Not
Playfair. This is the reassurance/status sentence in the elegant hero.

For Figma or any tool without SF Pro: use **Inter** as the sans proxy,
**Newsreader italic** as the guide, **Playfair Bold** for the stationery name.
True SF Pro rendering only survives an HTML-to-PNG path.

### Uppercase labels

Overlines are `--t-overline` (12px), weight 700, uppercase, on a tracking token.
Tracking scale: `--tracking-1` .05em through `--tracking-8` .16em. Tile labels
use `--tracking-4` (.08em).

---

## 4. Spacing

4px rhythm. `--sp-N` equals N x 4px.

    --sp-1  4px      --sp-5  20px
    --sp-2  8px      --sp-6  24px
    --sp-3  12px     --sp-7  32px
    --sp-4  16px

Off-grid values (7, 9, 10, 11, 13, 15, 18, 22, 26px) stay raw on purpose. The
grid is never retrofitted onto them - that would shift layout.

### Semantic roles - prefer these over raw steps

    --break-section    28px                    gap between stacked major sections
    --break-major      44px                    the large break
    --gap-chip         7px                     one chip/cluster gap
    --pad-card         16px 20px               main card padding
    --pad-card-compact 12px 16px               dense list-group cards
    --field-y          10px                    field vertical padding
    --field            10px 12px               medium inline input
    --field-compact    6px 10px                small inline input
    --pad-empty        14px 2px                empty-state block

---

## 5. Radius

    --r-sm    8px
    --r-md    12px
    --r-row   14px     compact row/pill family - CTAs, focus rows, chips
    --r-lg    16px     card family
    --r-xl    20px     tiles
    --r-pill  999px    pills, the docked next-bar

A bottom-docked CTA is a **pill**, not a rounded rectangle. This is the single
most common shape error.

---

## 6. Motion

    --ease-out       cubic-bezier(0,0,.2,1)
    --ease-standard  cubic-bezier(.2,0,0,1)
    --ease-in-out    cubic-bezier(.45,0,.2,1)

    --ms-micro       100ms    fastest micro-feedback
    --ms-press       120ms    press
    --ms-fast        140ms    hover / tint
    --ms-base        200ms    standard row/state transition
    --ms-ambient     220ms
    --ms-escalation  230ms
    --ms-enter       240ms    panel / ask enter
    --ms-sheet       260ms    sheet rise
    --ms-reveal      420ms    moderate reveal / receipt

A competitive read found 61 percent of motion in this category is ceremonial.
Motion here should serve orientation, not decorate. Always honour
`prefers-reduced-motion`.

---

## 7. Components - measured specs

All geometry below was measured from the running shell at 393x852 unless noted.

### 7.1 Tile (the bento unit)

    border-radius   20px  (--r-xl)
    border          none
    padding         16px 20px  (--pad-card)
    min-height      100px
    layout          flex column, justify-content: space-between
    sheen           inset 0 1px 0 var(--sheen)   on tile-a and tile-c
                    inset 0 1px 0 rgba(255,255,255,.14)  on tile-d

    .t-label   12px / 700 / uppercase / tracking .08em / --muted
    .t-num     38px / 800 / tracking -.04em / line-height 1 / tabular-nums
               margin 8px 0 6px
    .t-sub     13.5px / 550 / --muted / line-height 1.45

**Bento grid.** `grid-template-areas: "a a" "b c"` - one full-width lead tile,
then pairs. That asymmetry IS the hierarchy. Do not flatten it to a uniform grid.

### 7.2 CTA family

    .cta            15px / 700, --carbon-text on --cta-grad,
                    radius 14px (--r-row), padding 10px 18px,
                    min-height 46px, inline-flex centred
    .cta.big        17px, padding 14px 26px
    .cta.soft       background --steel-tint, color --steel-soft, no hover filter
    .mini           13.5px / 700, --steel-soft on --steel-tint, radius 8px

The 46px min-height is a floor: the tallest tap target on a screen should be the
primary action.

### 7.3 Next bar - the persistent docked action

Measured live at 393x852:

    position    absolute, left 16 right 16, bottom 16 + safe-area-inset
    size        361 x 65
    radius      999px  (--r-pill)
    background  --cta-grad
    shadow      0 16px 44px -12px rgba(0,0,0,.55),
                inset 0 1px 0 rgba(255,255,255,.14)
    z-index     22

    .nb-label   12px / 700 / uppercase / tracking .08em / opacity .72
    .nb-title   13.5px / 700 / line-height 1.3 / clamped to 2 lines
    .nb-more    12px / 800 on rgba(255,255,255,.16), radius 999px, padding 2px 8px
    .nb-chev    22px / opacity .6

**It does not exist above the fold.** It renders on `!heroInView` - the moment
the host starts reading below the fold. A mockup showing it on the first screen
is wrong.

When it is present the nav dock raises to `bottom: 84px` to clear it.

Content must never sit under it: `.app.has-nextbar` reserves 84px AND applies a
bottom mask so content dissolves before reaching the bar rather than sliding
beneath it.

### 7.4 Progress - the segmented readiness summary (D4 exploration A)

This is the ONE progress visual. It has three parts, and all three are required.

    .eprog-rule        continuous fill, 353 x 3, radius 2
                       track --line-soft, fill --steel-soft
    segment row        5 segments, 68.2 x 2 each, gap 3, radius 1
                       handled  --ok      opacity .95
                       open     --steel-soft  opacity .75
    .eprog-labels      13px / 500 / --faint, space-between

Vertical offsets from the viewport floor: rule at VH-96, segments at VH-79,
labels at VH-64.

**Segments are categorical.** Each essential is handled or open - never a
percentage of itself, because the engine knows which of those is true and
nothing finer.

**Never colour-only.** The wrapper carries `role="img"` and an aria-label naming
every segment in words; each segment carries a title attribute.

**Copy is engine-picked, not free text:**

    left    "{done} of {total} plan parts handled"
    right   done >= total          -> "you're set"       (renders in --ok)
            lead critical/overdue  -> "this one first"
            otherwise              -> "the rest can wait"

When complete, the fill switches to `--ok` and gains
`box-shadow: 0 0 16px rgba(79,174,122,.55)`.

**"Settled" is a retired word here.** It collided with decision-settling, which
is a different ledger - live, settling a decision left this line unchanged.
Use the engine's own noun, "plan parts handled".

### 7.5 Fold handle

    .efold        button, cursor grab, flex column, align centre, gap 9px
    .efold-grab   40 x 5, radius 3, --steel-soft at opacity .55
                  hover/active -> opacity .85, width 52
    .efold-label  13px / 550 / --faint, "The rest of your plan"

Offsets: grab at VH-34, label ending at VH-4. The first screen reserves 64px at
its foot so the handle genuinely peeks into the first viewport.

### 7.6 Nav dock

    position     absolute, bottom 16 + safe-area, centred
    background   color-mix(in srgb, var(--card) 25%, transparent)
    backdrop     blur(34px) saturate(1.2)
    border       1px solid rgba(255,255,255,.1)
    shadow       0 12px 34px -10px rgba(0,0,0,.36),
                 inset 0 1px 0 rgba(255,255,255,.08)
    radius       999px
    button       13.5px / 700 / --ink-soft, radius 999px, padding 10px 16px
    active       background --steel, color --ink

A bottom scrim sits behind it so content fades beneath rather than being sliced.

### 7.7 Toast

    background --card, color --ink, border 1px --line-soft
    14px / 550, padding 12px 20px, radius 16px
    max-width min(88vw, 356px), centred, shadow 0 12px 40px rgba(0,0,0,.45)
    .toast.ok  -> the green confirmation pair (--ok / --on-ok)

Never an inverted white pill. That was the single largest no-white-surfaces
violation, at 84 of 86 call sites.

### 7.8 Reference lane rows (below the fold)

    section label   12px / 700 / uppercase / tracking .08em / --ink-soft
    row title       16px / 700 / --ink, wraps to 2 lines
    hairline        1px --line-soft between rows
    count pill      13px on a steel tint, radius 999px
    arrow           only on rows that actually route

The "Where you stand" lane is flattened to hairline rows rather than filled
tiles - label left, value right, sub-line beneath. This is the restraint rule
applied to an entire lane, and it is what keeps the below-fold calm.

---

## 8. Layout and viewports

### Breakpoint behaviour

    <= 430px    phone, full-bleed
    768px       tablet portrait - full-bleed at 100 percent usable
                (the 2026-07-22 tablet ruling retired the phone silhouette
                below 1280px)
    >= 1280px   the letterboxed-phone defect lives here, not below

Do not repeat the error of measuring one width and generalising. Tablet was
asserted broken on the basis of a 2048px measurement and was in fact already fixed.

### Ambient bloom

The app's one piece of atmosphere:

    radial-gradient(150% 500px at 50% -70px,
      rgba(86,116,140,.30) 0%,
      rgba(86,116,140,.09) 40%,
      rgba(0,0,0,0) 74%)

**In CSS these are radii, not diameters.** Halving them to "convert" kills the
glow roughly three times too early. Reproducing this in a design tool requires
the radial to extend to 150 percent of width and 500px of height as RADIUS.

### Hero composition - "float the hero"

Two `margin-top:auto` (one on the hero zone, one on the progress) split the free
space, so the ask/guide/action cluster floats MID-SCREEN and the progress pins to
the foot. Top-aligning the cluster with a void beneath was explicitly rejected.

### The stage scale

`--fit` is a height-only stage scale: `min(1, (innerHeight - 52) / 852)`. The
responsive command path opts OUT of it. It is never disabled globally.

---

## 9. Voice and copy

**Two voices, split typographically.**
  - Boss (sans): the instruction. "Send payment to Hearthstone Catering Co."
  - Guide (Newsreader italic): the reassurance. "It was due four days ago.
    Nothing else moves until this clears."

**Rules**
  - A CTA names the act and its destination. Never "Do this", "Handle this",
    "Take me to it".
  - Route to the exact row or field, never to the top of a tab.
  - Say what is true when it is not good news. "the rest can wait" is a lie when
    the lead item is overdue - the copy says "this one first" instead.
  - Propose, do not ask. A grounded best guess with its provenance and an
    accept/change, never a blank form.
  - No emoji. No hospitality jargon.

**Retired words** - do not reintroduce:
  - "settled" for plan progress (it means decision-settling, a different ledger)

---

## 10. Depth and glass

A competitive read (Revolut Business, Apple Weather, Breathwrk, Opal on Mobbin)
found the shared technique behind translucent surfaces that read as expensive:

**They do not tint the panel.** The panel is white at 4-7 percent alpha over
something uneven, and the colour you perceive is the background coming through.
The effect reads premium precisely because no colour was spent on it.

Applied here, over the steel bloom:

    tile fill     rgba(255,255,255,.048)   lead tile .068
    border        rgba(255,255,255,.075)
    backdrop      blur(28px)
    specular      inset 0 1px 0 rgba(255,255,255,.13)  lead .20

Hierarchy comes from position in the light, not from applied colour. The lead
element is not louder - it sits higher in the wash and comes up warmer on its own.

Glass needs something uneven to reveal. A perfectly smooth gradient behind a
blur looks identical to no blur at all.

---

## 11. Verification - how to know it is right

This is the part that has been got wrong most often, so it is stated plainly.

**Drive it, do not grep it.** A grep proves a string absent. It never proves a
capability absent. Colour tokens in this app are injected at runtime and are
invisible to every static probe - five separate file probes reported them
undefined and all five were wrong.

**Measure, do not author.** Nearly every "this does not look right" in this
system has traced to a value invented instead of extracted. Before drawing a
component, read its rule or measure it in the browser.

**A fix is done when it is driven live.** Not when it compiles.

**Check the render branch.** The hero has four; the absence of an element in one
screenshot does not prove it absent from the surface.

To measure the running shell:

    cd demo/hostv2
    E2E_BASE=1 npx vite preview --port 5233 --host 127.0.0.1
    npm run device -- "iPhone 15 Pro"      # WebKit, real safe-area insets
    npm run device -- "Galaxy S24"         # Chromium
    npm run device -- --list

---

## 12. What not to do

  - Do not fill a large area with solid `--steel`.
  - Do not put the docked CTA on the first screen.
  - Do not draw the docked CTA as a rounded rectangle - it is a pill.
  - Do not use a single continuous bar for progress - the segments carry the
    meaning.
  - Do not use "settled" for plan progress.
  - Do not spread Playfair into host-shell surfaces.
  - Do not use `--faint` for copy people read.
  - Do not add a data panel to a wide layout that production cannot derive.
  - Do not use colour as the only signal for a state.
  - Do not flatten the bento to a uniform grid.
  - Do not invent a token. If it is missing, say so.

---

## Appendix - open items

  - The 1280 desktop path is the phone composition stretched, not a designed
    desktop layout. Captured in Chrome: the hero does not float, rows run the
    full 1280, the docked bar becomes a ~755px pill, and roughly the lower half
    of the frame is empty. See `docs/design-reference/chrome-01-desktop-*.jpg`.
  - The slide-to-commit control for destructive/committing actions is agreed in
    principle and not built. It needs a slider role and arrow-key support, not
    drag alone.
  - NO MOBILE REFERENCE CAPTURE EXISTS YET. Chrome device mode must be switched
    on in the browser to produce a phone viewport; window resizing alone will not
    do it on this display. Until those frames exist the reference set is desktop
    only, and that is a real gap rather than a formality.

## Appendix - a note on sources

Everything in this document describes the SHIPPED app, captured in Chrome. It
deliberately contains no Figma-only material: design files carry explorations and
tokens that never reached production, and mixing them in makes the document
describe something that does not exist. If a pattern is not in the running app,
it does not belong here.

The same rule applies to rendering engines. Captures from a different engine were
removed rather than kept as stand-ins, because a frame labelled "Chrome" that
was not taken in Chrome is worse than no frame at all - it looks authoritative
and is quietly wrong.
