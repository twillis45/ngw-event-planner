# CTA Inventory & Redesign — Event Boss hostv2

> **Portable version.** Full content of the interactive artifact
> https://claude.ai/code/artifact/5efe3c4f-831f-4ebb-8781-bd1563c2cc21 rewritten as plain Markdown
> so it can be read outside claude.ai. The artifact renders live specimens using the real
> stylesheet; here those are ASCII plus their exact token values. Nothing is abridged.

Audit 2026-08-01 · verified by grep 2026-08-01 · measured from `hostv2/src/HostShellV2.jsx` and
`hostv2/src/styles.css`

| | |
|---|---|
| Buttons with a class | 424 |
| Distinct signatures | 68 |
| Real families | 7 |
| Phantom classes | 1 |
| Findings re-verified | 2 |

---

## 1 · What the audit found

### DEFECT — confirmed by grep · `cta stay` wears a class that does not exist

Three buttons ship `className="cta stay"`. **There is no `.stay` rule anywhere in the stylesheet.**
They render as a plain primary `.cta`, so whatever "stay" was meant to signal has never been
visible.

```
$ grep -n 'cta stay' HostShellV2.jsx
4343:  <button className="cta stay" onClick={() => {
4402:  <button className="cta stay" onClick={…dietaryNoted…}>That's everyone — noted
5983:  <button className="cta stay" style={{ flex:'0 0 auto', width:'auto', … }}

$ grep -rn '\.stay' --include="*.css" .
(no matches)
```

Note: `grep -c 'stay' styles.css` returns 42, but every hit is the substring `stays`/`stay` in
lodging classes and comments. No selector.

**Extra signal:** line 5983 already overrides its own class with five inline styles —
`width:auto`, `whiteSpace:nowrap`, `minHeight:0`, custom padding and font-size. A button fighting
its class that hard is a button whose class was never doing work.

**Precedent:** the same failure shipped in July when `cta big` was used for the three biggest
moments in the app with no matching rule. That one was caught and fixed. This one was not.

### CONFIRMED — and understated · `.confrow` is hero-only, **and so is its parent**

The original finding was that all nine `.confrow` rules are scoped under `.hero.elegant`. That
holds. What it missed: **`.conf-fixes`, the wrapper these buttons live in, is scoped the same way**
— so this is not one class that could go bare, it is a *matched component pair* that exists only
inside one hero.

```
$ grep -n 'conf-fixes\|confrow' styles.css
526: .hero.elegant .conf-fixes{ display:flex; flex-direction:column; … }
528: .hero.elegant .confrow{ display:flex; align-items:center; … }
529–534, 3116–3117, 3146 — all .hero.elegant-scoped

$ grep -cE '^\s*\.confrow' styles.css
0    ← no unscoped base rule exists
```

**Count correction:** the class is on **4 elements**, not 3 — three `<button>` (4229, 6256, 6265)
plus a `<div className="confrow confrow-open">` at 6267. A fifth hit at 4199 is a comment.

**Still open, needs a live drive:** whether those four currently render bare. The hero className is
composed at runtime from `elegantMode` (83 references), so static grep cannot answer it — and the
hero has multiple render branches, exactly the case where reading code instead of driving the
surface has been wrong before. *If any render unstyled today, this jumps ahead of the `stay` fix.*

### NOT A DEFECT — checked · `.frow`, `.line`, `.fstat`

All three first looked like compound-only classes with no base rule. They are not: `.frow` has 15
rules including a bare selector, `.line` 7, `.fstat` 2. Recorded because **the near-miss is the
point** — a regex that treats `.frow.dragging` as a base rule reports a clean sheet on a broken
one, and that shortcut is what would hide a real `.stay`.

---

## 2 · What to do about it

### 1 · Delete the `stay` token — do not define it
*Today · zero visual risk*

Both paths close the defect but differ in risk. **Defining** `.cta.stay` changes the appearance of
three live buttons and needs a design decision. **Deleting** the token changes nothing visually and
removes the phantom.

If "stay" meant *this button does not navigate*, that concept already exists in doctrine — and
`.cta` already carries no chevron, so the class was adding no signal. Re-introduce the tier
deliberately later if it earns one; do not ratify it by accident.

### 2 · Drive the four `.confrow` sites, then rename to declare the scope
*After a live check · order depends on what it shows*

Do not promote them to a global rule — the scoping looks intentional. Make the *name* tell the
truth: `.hero-confrow` / `.hero-conf-fixes`. Then the next person reaching for "a confirm row" gets
an obvious miss rather than a browser-default button.

### 3 · Gate it — this is the second occurrence, not the first
*The one that actually matters*

`cta big` shipped with no matching rule in July, was caught and fixed. `cta stay` shipped the same
way after. **Twice is systemic.** A hand audit found this one; a hand audit will miss the third.

The fix: extract every className token from the JSX, assert each has ≥1 matching selector in
`styles.css`, fail the build otherwise.

Two implementation notes from this pass:
- the checker must treat `.frow.dragging` as **not** a base rule for `.frow`, or it reports clean
  sheets on broken ones;
- it must resolve composed classNames, since `hero elegant` never appears as a literal string.

---

## 3 · The set we keep

Eight families survive. Nothing new is added — one phantom deleted, one class renamed to say where
it lives. **This is the whole vocabulary; if a new button does not fit a row below, that is a design
question, not a licence to invent a ninth.**

| Style | Uses | For |
|---|---:|---|
| `.cta.big` | 2 | The one irreversible moment on a screen |
| `.cta` | 42 | The primary act of a card or sheet. One per view |
| `.cta.soft` | 7 | A real alternative to the primary — present, not competing |
| `.cta.ghost` | 3 | Declining, deferring, backing out |
| `.mini` | 235 | Every in-row and in-list action. **The default** |
| `.chip` | 59 | A choice among options. Toggleable, never irreversible |
| `.pill` + 4 tiers | 14 | Readiness state you can tap into |
| `.later-row` `.fold-btn` `.navrow` `.path-row` | 49 | Full-width navigation. Chevron only when it routes |
| `.hero-confrow` *(renamed)* | 4 | A tappable fix inside the elegant hero — the row *is* the answer |

- **Deleted** · `.cta.stay` — 3 sites, 0 rules, 0 pixels of change
- **Renamed** · `.confrow` → `.hero-confrow` (and `.conf-fixes` → `.hero-conf-fixes`)
- **Unchanged** · 8 families

---

## 4 · Every style, once — full specs

```
.cta.big      17px / 700 · pad 14×26 · radius 14 · steel gradient          2 uses
.cta          15px / 700 · min-height 46 · radius 14 · steel gradient     42 uses
.cta.soft     steel tint fill · no hover lift · radius 14                  7 uses
.cta.ghost    transparent · 1px carbon line · 14px / 650                   3 uses
.mini         13.5px / 700 · pad 7×12 · radius 8 (only 8px in the set)   235 uses
              227 bare · 6 `mini rowlink` · 2 `mini runagain`
.chip         14px / 650 · radius 999 · card fill + 1px line              59 uses
              on: steel fill, ink text (via aria-pressed)
              ⚠ `chips` (18 uses) is a CONTAINER, not this
.pill         13px / 750 · radius 999 · semantic @ 16% alpha              14 uses
              tiers: .p-ok / .p-warn / .p-risk / .p-steel
              .p-steel = unknown/not set — never green for unknown,
              never red for no-data. It keeps the other three honest.
row family    row type, ink-soft · 1px line-soft top · ~44px full width   49 uses
              31 later-row · 8 fold-btn · 7 navrow · 3 path-row
.confrow      card fill, no border · radius --r-md · → only when it routes 4 uses
              HERO-ONLY. Zero unscoped rules for it or .conf-fixes.
.cta.stay     DELETING — 3 sites, 0 css rules, renders as plain .cta
```

### Note on the counts

Re-measured 2026-08-01 by literal `className` match. Several differ from the original pass —
`.mini` 202→**235**, `.later-row` 18→**31**, `.chip` 55→**59** — and the two methods have not been
reconciled. **Treat these as measured, not settled.**

Two traps found while counting, both worth keeping:
- a prefix match on `className="chip` also catches `chips`, an unrelated **container** class (18
  uses) — that is how 59 becomes a wrong 77;
- a single-line `<button…className>` regex undercounts this file badly, because most button tags
  span several lines — which is why **no total is asserted here.**

---

## 5 · Redesign — the brutal read

The set is not incoherent because it has nine styles. It is incoherent because **six weights, three
radii and two fills are doing no semantic work** — and because the primary button is the most dated
object in the app.

### The worst offender — the gradient

`linear-gradient(180deg,#4E6877 0%,#3F5B6A 100%)` on the primary action. **Not one leader read this
session uses a gradient on a primary CTA.** Airbnb's *Reserve* is flat. Booking.com's *Reserve* is
flat. HotelTonight's *CONTINUE* is flat. Luma, Partiful, Linear, Blink — flat, all of them.

A 180° light-to-dark fill is the clearest tell that a button was styled in 2013, and it directly
contradicts UX_01's own rule that surfaces are differentiated by *colour step, not decoration*.

### Inverted — the status chip is bolder than the primary action

`.pill` is **750**. `.cta` is **700**. A thing that *reports* outweighs the thing that *acts*.
Across the set there are six weights — 650, 700, 750 — for seven styles, and none of the
differences carries meaning.

### Backwards — the tap floor is on the rare button

`.cta` (42 uses) has `min-height:46px`. `.mini` — **235 uses, the button a host taps all day** —
has no minimum at all, at 13.5px with 7px padding. The floor is protecting the button that needed
it least.

### Collision — two pairs that look alike and mean opposites

- `.cta.soft` and `.mini` are **the same fill** (`steel-tint`) at different sizes — one is "the
  second path", the other is "a row action", and nothing distinguishes them.
- `.chip` and `.pill` are **both 999px** — one means *you choose*, the other means *the system
  reports*. Same shape, opposite direction of authority.

### Missing — every leader has it

No full-width committing primary, and no consequence in the label. Airbnb, Booking.com,
HotelTonight and Luma all pin a **full-width** primary to the bottom of the deciding screen.
HotelTonight goes further: `CONTINUE | $264`. Ours is an inline pill with a sentence on it
(*"Add a rain backup"*) where leaders use a short verb.

### The proposal

| Token | Now | Proposed | Why |
|---|---|---|---|
| primary fill | 180° gradient | **flat `--steel`** | No leader uses a gradient primary; contradicts UX_01 |
| action radius | 14 / 8 | **10 · one value** | Radius encoding "scale" is a rationalisation. Size encodes scale |
| value radius | 999 | 999 · unchanged | Round = "this is a value". Correct already |
| weights | 650 · 700 · 750 | **600 · 700** | 700 for the primary only; 600 everything else |
| tap floor | `.cta` 46, `.mini` none | **`.cta` 48, `.mini` 44** | Protect the button tapped 235 times, not 42 |
| `.cta.soft` | 7 uses | **deleted** | Duplicate of `.mini`'s fill with no distinct job |
| `.cta.big` | 2 uses | **deleted** | Replaced by the full-width primary with its consequence in the label |
| chip rest state | card fill + line | **outline only** | An unchosen option should look empty |

**Net: nine styles become six** — `.cta` · `.mini` · `.ghost` · `.chip` · `.pill` · row family,
plus `.hero-confrow` scoped to its hero.

### What this costs, honestly

`.cta` is 42 sites and `.mini` is 235. The radius and weight changes are a stylesheet edit, but
**going full-width changes layout at every one of those 42**, and several sit in rows that assume
an inline button. That is not a token change, it is a layout pass. **Do not ship this as one
commit.**

Sequence: flat fill + weights + radius first (pure CSS, no reflow) → then the `.mini` tap floor →
then full-width primary surface by surface.

**Deleting `.cta.big` and `.cta.soft` needs a host ruling** — they are only redundant if you accept
the full-width primary, and that is a taste call, not a measurement.

---

## 6 · Seven treatments for the primary

Each is a move a leader is actually shipping, rebuilt in our tokens. **Three are for the ordinary
primary and three-plus-one are for the commit moment** — the split is the point.

### Ordinary primary

**1 · Flat** — *Booking, Luma*
```
┌────────────────────────────────┐
│      Add a rain backup         │   flat #4E6877, radius 10, 48px, 16/700
└────────────────────────────────┘
```
The baseline. One colour, no decoration. Boring on purpose — the label does the work.

**2 · Sheen** — *on-system* ⭐
```
┌────────────────────────────────┐
│▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│   1px top light-catch
│      Add a rain backup         │
└────────────────────────────────┘
```
Replaces the gradient with the *same* physics already shipping on tiles and sheets via `--sheen`.
Current — and ours already.

**3 · Outlined peer** — *Partiful*
```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│         Do it for me           │   1.5px steel edge, transparent fill
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```
For when two paths are genuinely equal. Reads as a peer, not a demotion. Replaces `.cta.soft`.

### The commit moment

Reserved for the irreversible act. **Every one adds friction or information proportional to
consequence** — which is the actual pattern behind all of them.

**4 · Consequence inside** — *HotelTonight*
```
┌────────────────────────────────┐
│ Confirm the count    42 guests │   number right, 68% opacity
└────────────────────────────────┘
```
`CONTINUE | $264` is their move. The button states the act *and* the number it acts on, so nothing
has to be correlated across the screen.

**5 · Context bar** — *Airbnb*
```
┌────────────────────────────────┐
│ $1,394                         │
│ 3 nights · free cancellation   │  [ Commit ]
└────────────────────────────────┘
```
The button shrinks; the facts around it grow. Price, span and the escape hatch sit left, a short
verb sits right.

**6 · Slide to commit** — *Blink Drive*
```
╭──────────────────────────────────╮
│ (›)   Slide to send to 42 guests │
╰──────────────────────────────────╯
```
A gesture, not a tap. Blink uses it for clock-in; HotelTonight traces a logo to book. **Only for
the truly one-way** — sending, paying, publishing.

**7 · Declare, then commit** — *Blink Drive*
```
┌────────────────────────────────┐
│ ✓ Marked — 42 guests, Bayside  │   step 1: tinted, 44px
│   notified                     │
└────────────────────────────────┘
┌────────────────────────────────┐
│      Finish and send           │   step 2: full primary
└────────────────────────────────┘
```
`Mark As Complete` → optional note → `Finish Trip`. The first tap states what is about to happen,
the second commits it. The read-back between them is where the host catches a mistake — **and it is
free provenance**, because the declaration is already a record.

---

## 7 · Colour — five steels, all measured

Staying inside the accent family, because UX_02 gives steel one job and adding a second interactive
hue would cost that meaning. These are hue and depth nudges, not a new colour. **Contrast computed,
not estimated.**

| Hex | Name | vs white | Grade | vs carbon `#141518` |
|---|---|---:|---|---:|
| `#3A5261` | Graphite | **8.20**:1 | AAA | 2.23:1 |
| `#3F5B6A` | Deep | **7.20**:1 | AAA | 2.54:1 |
| `#456273` | Cool | 6.47:1 | AA | 2.82:1 |
| `#4E6877` | **Current** | 5.88:1 | AA | 3.10:1 |
| `#527186` | Lifted | 5.17:1 | AA | **3.53**:1 |

### Reading the numbers

All five clear AA for white text, so this is a taste call rather than an accessibility one — but
the trade runs in a direction worth naming.

**Darker steels score better on the button and worse against the page.** Graphite hits 8.20:1 for
its label while dropping to 2.23:1 against the carbon field behind it, so the button itself starts
to disappear. **Lifted** is the inverse — the most visible *object* on the page, and the weakest
label.

**Current steel sits almost exactly in the middle of both axes**, which is an argument for leaving
the hue alone and spending the change on **flat-versus-gradient** instead. That is where the dated
look actually lives — not in the hue.

**If you make one change:** kill the gradient, add the sheen, keep `#4E6877`. Pure stylesheet edit,
no reflow, no ruling needed.

---

## 8 · Choosing one

| If the button… | Use | Not |
|---|---|---|
| starts the whole thing, once | `.cta.big` | `.cta` |
| is the point of this card or sheet | `.cta` | `.mini` |
| is a real alternative to the primary | `.cta.soft` | a second `.cta` |
| declines, defers or backs out | `.cta.ghost` | `.mini` |
| acts on one row or list item | `.mini` | `.cta` |
| picks between options | `.chip` | `.mini` |
| reports state you can tap into | `.pill.p-*` | `.chip` |
| navigates to another surface | `.later-row` / `.navrow` | `.cta` |

## 9 · Intentional, or drift?

| Difference | Verdict | Why |
|---|---|---|
| `.mini` radius 8 vs `.cta` 14 | Intentional | Radius encodes scale — *but see the redesign; this is contested* |
| `.chip` / `.pill` radius 999 | Intentional | Fully round = "this is a value", not "this does something" |
| `.cta` min-height 46, `.mini` none | Intentional | *Contested — the redesign inverts this* |
| `.cta.soft` has no hover lift | Intentional | Only the primary is allowed to move on hover |
| One radius across the `.cta` family | Intentional | Result of the radius audit — was 11px, unified to `--r-row` |
| `.cta.stay` | **Drift — grep-confirmed** | No rule exists in any stylesheet. Delete the token |
| `.confrow` + `.conf-fixes` hero-scoped | **Confirmed, wider than filed** | Both hero-only, zero unscoped base rules. Rename to say so |
| 68 signatures for 7 families | **Watch → gate it** | Mostly legitimate state modifiers, but it is where the next phantom hides |

## 10 · Rules worth keeping

- One `.cta` per view. A second primary means neither is primary.
- Default to `.mini`. It is already the plurality of the app's buttons, and promoting is easier than
  demoting.
- Colour only on `.pill`, and only for real state. Semantic colour used for emphasis is how "green"
  stops meaning anything.
- A chevron means it routes. An in-place settle earns none.
- A variant class must have a rule. Add the CSS in the same change as the `className`, or the button
  silently becomes its base.
- If a class is scoped to one parent, put the parent in its name.

---

## Provenance

Measured 2026-08-01 from `hostv2/src/HostShellV2.jsx` (424 classed buttons) and
`hostv2/src/styles.css`. Token values read from the running shell at `localhost:5199`.

Verification pass 2026-08-01 — both defects re-checked by grep against `demo/hostv2/src/` at HEAD;
`.confrow` upgraded and its count corrected. **Whether the four `.confrow` sites render bare today
is not established and needs a live drive; nothing here asserts it either way.**

Leader comparisons draw on the Mobbin reads in
[`2026-08-01_LODGING_LISTING_UI_PATTERNS.md`](2026-08-01_LODGING_LISTING_UI_PATTERNS.md) and
[`2026-08-01_MULTI_OPTION_MOBILE_PATTERNS.md`](2026-08-01_MULTI_OPTION_MOBILE_PATTERNS.md) —
no hands-on with any competitor product.
