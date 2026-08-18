# UX_10 — Typographic Language

Status: drafted 2026-08-18 from an 8-seat review board (`convene-review-board`).
Not yet ratified — this is the proposal the board's findings produced, for
review before it becomes doctrine alongside UX_01–UX_09.

## Why this exists

The type *scale* (`demo/src/design/tokens.js` → `type.size`, 13 steps) has
existed for a while. A type *language* — which role to reach for, when, and
what happens at the edges — never has. The board's unanimous finding, reached
independently by three different lenses:

> 151 `<Text>` components exist against **4,846** raw `fontSize:`
> declarations, **806** of them hardcoded literals with no token at all. The
> 7-role ladder reaches only 5 of 13 scale steps. `4xl` has zero uses.
> `weight.medium` (500) is defined and used nowhere.

A scale nobody is routed through is documentation, not infrastructure. This
document is the routing.

## 1. The closed role set

Every role is a **locked quadruple** — size, weight, leading, tracking — plus
a stated job. A role with an undefined quadruple member is not yet specified.

| Role | Size | Weight | Leading | Tracking | Job |
|---|---|---|---|---|---|
| `title` | 22px | 600 | *pending §4* | 0 | Page/screen identity. One per screen. |
| `heading` | 16px | 600 | *pending §4* | 0 | Section identity within a screen. |
| `body` | 14px | 400 | *pending §4* | 0 | Primary reading content. |
| `bodyStrong` | 14px | 600 | *pending §4* | 0 | **Rule, not feel:** emphasis on a single fact within a body block — a number, a name, a decision. Never a whole paragraph. |
| `secondary` | 13px | 400 | *pending §4* | 0 | Supporting context the reader may skip on a first pass but needs on a second. |
| `caption` | *resolve §2* | 400 | *pending §4* | 0 | Metadata about content: timestamp, source, unit. |
| `label` | 11px | 600 | *pending §4* | 0.08em | Chrome only — field names, section eyebrows. **Never data-bearing** (§3). |

**`weight.medium` (500) is retired** unless a role is found for it. An unused
token in the API is an invitation for the next contributor to introduce a
weight tier nobody agreed to.

## 2. Resolve the caption collision — decision required

Three values currently answer to "caption":

| Source | Value |
|---|---|
| `Text variant="caption"` | 11px |
| `type.size.caption` (266 direct uses) | 12px |
| Figma `size/caption` | 11px |

Two fixes were proposed, and they are not the same fix:

- **Bringhurst (proportion):** pick one value. The 1px gap between 11 and 12
  on a scale already crowding six values into 11–14px isn't justified by
  anything — collapse it.
- **Curtis (systems):** picking a value doesn't stop the next drift. The
  underlying problem is Figma and code have no synced source of truth for
  role names, only for hex/px values (fixed 2026-08-18, see
  `docs/audits/2026-08-18_FIGMA_VALUE_DIFF.md`). Fix the sync mechanism, not
  just this instance.

**Recommendation: do both.** Collapse the value now (11px, matching the two
majority sources), *and* treat "role-name sync" as a follow-on to the
value-sync work already done — same mechanism, same discipline, applied to
names instead of just numbers.

## 3. Size and contrast are independent variables

**This is the single highest-leverage finding in the review**, reached
independently by three unrelated populations (first-timer, low-vision, on-site
planner). The current ladder recedes in size *and* color together — every step
down gets smaller **and** dimmer at once:

```
title/heading/body   → text.primary   (bright)
secondary/caption/label → text.secondary/tertiary (dim)
```

Consequence, stated by each lens in its own terms:
- **First-timer:** dimmed content reads as decorative chrome, not "read this
  second" — including labels and status text a first-timer must read to act.
- **Low-vision:** contrast headroom shrinks exactly where size is already
  smallest (`text.tertiary` ≈5.0:1, applied to 9–11px text).
- **On-site planner:** the operational fact needed in a one-second glance
  lives in the tier built to be skipped.

**Rule:** a role may be small without being low-contrast. **Operational or
actionable data may never live in a tier below `--ngw-text-secondary`
contrast**, regardless of size. Decorative/chrome content may be both small
and dim; data never gets both penalties at once.

## 4. Leading is a function of size and measure, not a role constant

Current: three leading values (1.2/1.4/1.55) assigned by role. Bringhurst's
finding: this gets the size relationship backwards. Large type needs
*proportionally less* leading; small type needs *proportionally more*, because
the reader is tracking short line-starts. 1.4 applied uniformly to both 22px
titles and 11px captions is two different amounts of whitespace doing the same
nominal job.

**Action required, not yet done:** measure actual rendered line length (the
character-count measure) per role at 390px, and set leading per size-and-measure
pairing rather than per role name. The `*pending §4*` cells in §1's table
resolve here. This needs rendered screens, not token arithmetic — do not fill
those cells from formula alone.

## 5. The size floor — the sentence a size must pass

`2xs` (9px) has 33 uses; `xs` (10px) has 77. Neither currently has a stated
justification. The board's proposed test:

> *"Smallest size, used for **X**, legible at **Y** distance under **Z**
> conditions."*

If a size cannot fill in X/Y/Z, its uses are a content problem, not a type
problem — the fix is removing content, not defending the size. Every use of
`2xs` and `xs` gets audited against this sentence before either is retained.

**This connects to an unresolved product decision, not a token question:**

> **Wroblewski's read:** the 9–13px band (89% of all usage) exists because
> nothing was hidden — progressive disclosure was never actually done on
> mobile. The fix is to cut and defer content until the small sizes aren't
> needed.
>
> **Density archetype's read:** density is not removable here. An on-site
> planner needs many values visible at once; hiding them behind taps is worse
> than small type when someone has forty seconds in a ballroom. The fix is a
> narrower, *defended* small end — not fewer sizes, but every remaining one
> passing the X/Y/Z sentence.

**This document does not resolve that disagreement — it is a scope decision
about whether NGW's on-site mobile surface is a reading interface or an
operating interface, and it needs to be made deliberately before §5's audit
can run.**

## 6. Platform is part of the specification, not an assumption

The font stack is `system-ui` (SF Pro on macOS, Segoe UI on Windows) — no
webfont ships, confirmed 2026-08-18 after finding `'Inter'` was declared for
months but never loaded. SF Pro applies optical size compensation below ~20px;
Segoe UI does not. In a scale where adjacent steps are 1px apart, cross-platform
metric variance can exceed the design's own hierarchy steps.

**Requirement:** the type language specifies targets that survive this, not
raw px against an assumed typeface. Concretely:
- Verify rendered x-height and measured contrast **on both SF Pro and Segoe
  UI**, as an automated screenshot check, not eyeballed on one machine.
- Any role whose distinction from its neighbor depends on sub-pixel rendering
  differences between platforms is not a real distinction.

## 7. Accessibility — what was actually checked, not assumed

Looked up rather than asserted from memory:

- **WCAG 1.4.4 (Resize Text)** sets **no minimum font size**. 9px is not a
  violation of 1.4.4 by itself — *if* the layout reflows cleanly at 200% zoom
  with no clipping, overlap, or forced horizontal scroll. **This has never
  been verified by rendering; it is currently unknown, not passing.**
- **WCAG 1.4.12 (Text Spacing)** requires content to survive a user's forced
  override: line-height ≥1.5×, paragraph spacing ≥2×, letter-spacing ≥0.12em,
  word-spacing ≥0.16em. Current leading (1.2/1.4) sits **below** the 1.5 floor
  that override must be able to impose without breaking layout. Not itself a
  violation — 1.4.12 is about surviving the override — but nothing in this
  system has been tested against it.
- **The honest read:** passing contrast *ratios* is not the same as passing
  *usability*. Platform HIG guidance (iOS: nothing under 11pt) treats sub-11px
  UI text as below where low-vision users can read without zooming — meaning
  they hit the 1.4.4 zoom requirement on every screen, for the 89% of text
  under 13px, as **baseline behavior, not an edge case.**

**Required before this document is ratified:** an actual render test — 200%
zoom, 1.4.12 spacing override applied, on both platform fonts — not a token
audit. No lens on this board could validate real-world severity without field
testing with actual low-vision users and actual on-site planners; that
limitation is real and is not closed by this document.

## 8. Enforcement — the part that makes this a language and not a table

Every prior finding traces back to one number: **806 hardcoded `fontSize`
literals with no token.** A role table with no enforcement is what produced
that number the first time. This document does not ship as doctrine without:

- A lint rule or CI check flagging raw `fontSize:` outside the token/role
  system.
- A migration plan for the 806 existing literals — codemod where mechanical,
  manual review where the "right" role is ambiguous (that ambiguity is itself
  a signal the role set is incomplete).
- Every one of the 13 scale steps either reachable through a named role, or
  formally retired from the published scale. `4xl` (26px, zero uses) is the
  first candidate for retirement.

## Open items before ratification

1. §2 — collapse the caption value (mechanical) + extend role-name sync to
   Figma (structural).
2. §4 — measure real leading/measure pairings from rendered screens; fill the
   `*pending §4*` cells.
3. §5 — **product decision**: is the mobile on-site surface reading or
   operating? Then run the X/Y/Z audit on `2xs`/`xs`.
4. §6 — automated dual-platform render verification.
5. §7 — actual 200%-zoom + text-spacing-override render test.
6. §8 — land the lint rule before migrating literals, so the 806 doesn't
   regrow while being fixed.
