# Figma ↔ code value diff — 2026-08-18

The value-level comparison the structural reconciliation could not do. Source:
136 local variables pulled from Figma `CYlmJqDCXEaacCuz9wW3bd` via the Plugin
API (`getLocalVariableCollectionsAsync` + resolved `valuesByMode`), diffed
against `demo/src/design/tokens.js`.

**Correction to the earlier audit.** The 2026-08-18 structural reconciliation
reported that the Figma dump carried "no variable values." That was wrong, and
so was a follow-on claim that the file held only a status map. The file has
**129 pages and 136 variables in 7 collections**. The earlier read queried a
single page (`00_FIGMA_SYSTEM_MAP`) and generalised from it.

---

## Headline

**Figma is a snapshot of the system as it stood before Sprints 49 and 60.**
Every colour drift is a deliberate code recalibration that Figma never
received — in two cases Figma still holds the exact value the code comment
names as the old one.

| Collection | Verdict |
|---|---|
| `steel` (9 values) | **Identical.** No drift. |
| `teal` (6 values) | **Identical.** No drift. |
| `matte` (8) | 7 of 8 drifted — Sprint 60.N realignment |
| `green` (4) | All drifted — Sprint 49 calibration |
| `red` (4) | All drifted — Sprint 60.U.3 correction |
| `amber` (3) | All drifted — Sprint 49 calibration |
| Spacing (10) | **Same values, every key shifted one position** |
| Radius (7) | Genuinely different values |
| Typography (12) | Different naming system entirely |

Primitives: **16 match, 18 drift.**

---

## 1. Colour — code is ahead, Figma holds the "was" values — **RESOLVED 2026-08-18**

> **Fixed.** 25 values written code → Figma: 18 primitives (`matte` 100-400,
> `green` 200-500, `red` 200-500, `amber` 300-500) and 7 semantic
> (`border/default`, `border/strong`, `text/primary`, `status/confirmed`,
> `status/risk`, `status/warning`, `status/risk-bright`).
>
> Re-read from Figma and re-diffed independently: **34 primitives match, 0
> drift** (was 16/18). Aliased semantic variables followed automatically.
>
> **Studio Matte mode only.** Light mode was left untouched — `tokens.js`
> omits light deliberately ("a deferred parity target … intentionally omitted
> to avoid faking it"), so code has no authoritative light values for this
> layer and writing them would have been invention.
>
> **Not changed, flagged instead:** `border/subtle` is an *alias* in Figma
> (→ `matte/250`) where code sets a direct value from `carbonNeutral`. Making
> those agree means restructuring Figma's aliasing, which is a different
> decision from a value update.
>
> Also unmapped: code's `red/bright` (`#ff3525`) has no primitive counterpart
> in Figma — the bright red lives only as the semantic `status/risk-bright`,
> which now carries that value.

The original finding, for the record:

`green` and `amber` are the clearest proof of direction. `tokens.js` documents
its own history, and the value it names as superseded is precisely what Figma
still stores:

```
green — code comment: "calmer forest — was #7dcca0/#3eab6c/#298c52/#1b7040"
        figma now:                        #7dcca0 #3eab6c  #298c52  #1b7040   ← the "was"
amber — code comment: "honey tungsten — was #f3a449/#ef962e/#df8116"
        figma now:                          #f3a449 #ef962e #df8116           ← the "was"
```

| Ramp | Figma | Code | Why code moved |
|---|---|---|---|
| matte/100 | `#0d0f12` | `#111519` | Sprint 60.N — realigned to the locked App.js DARK tiers (Mid Carbon). Fixed the visible drift when moving Home → an event. |
| matte/150 | `#121518` | `#1c2227` | " |
| matte/200 | `#171b1f` | `#242b31` | " |
| matte/250 | `#1c2026` | `#2e353d` | " |
| matte/300 | `#232830` | `#3a4250` | " |
| matte/350 | `#2b3039` | `#424b59` | " |
| matte/400 | `#343b45` | `#4e5867` | " |
| green/200–500 | `#7dcca0` … | `#8fbf9f` … | Sprint 49 — dropped to ~40–60% saturation to sit in the steel/matte register |
| red/200–500 | `#ef5757` … | `#f08274` … | Sprint 60.U.3 — pulled toward fire-red; old ramp read pink on cool carbon |
| amber/300–500 | `#f3a449` … | `#d99a59` … | Sprint 49, then `400` unified to `#ECA13F` on 2026-08-18 (D2) |

`matte/050` (`#070809`) matches — the only survivor of that ramp.

**Semantic layer**, spot-checked: `surface/canvas` `#141518`, `surface/card`
`#1e1f22`, `surface/elevated` `#25262a`, `text/secondary` `#849eb8` and
`text/inverse` all **match**. `text/primary` differs (`#eef0f4` Figma vs
`#e8edf2` code). Status colours inherit the primitive drift above.

**In Figma but not in code:** `trust/essentials|studio|agency`,
`atmosphere/*` (6), `accent/steel-*` (4), `border/accent`, `text/on-status`,
`text/accent`, `status/confirmed-bright`, `status/*-muted`.

**In code but not in Figma:** `status.inProgress` (`#B3A0CC` lavender,
promoted from hostv2 2026-08-18), `text.onTint` (`#8AA3B0`), and the
`dangerRed` / `dangerSolid` split that the WCAG pass introduced.

---

## 2. Spacing — the dangerous one — **RESOLVED 2026-08-18**

> **Fixed.** Figma's spacing keys were renamed to match the code scale, and the
> two values code had that Figma lacked (`0` and `2px`) were added. The scales
> are now identical key-for-key, verified 12/12 with 0 mismatches.
>
> **Direction chosen: Figma → code alignment.** Code had 418 call sites (396
> `space[N]` + 22 `pad={N}`); Figma needed 10 renames. Figma binds by variable
> ID, not name, so no design broke — the same IDs (`VariableID:7:2`…`7:11`)
> carry through the rename. That is verification by ID-preservation, not an
> exhaustive binding scan across all 129 pages.
>
> Renames ran in two phases through temporary names, because renaming
> `spacing/1`→`spacing/2` while `spacing/2` still existed would have collided.
>
> | Was | Now | px |
> |---|---|---|
> | — | `spacing/0` | 0 *(new)* |
> | — | `spacing/1` | 2 *(new)* |
> | `spacing/1` | `spacing/2` | 4 |
> | `spacing/2` | `spacing/3` | 8 |
> | `spacing/3` | `spacing/4` | 12 |
> | `spacing/4` | `spacing/5` | 16 |
> | `spacing/5` | `spacing/6` | 20 |
> | `spacing/6` | `spacing/7` | 24 |
> | `spacing/8` | `spacing/8` | 32 *(unchanged)* |
> | `spacing/10` | `spacing/9` | 40 |
> | `spacing/12` | `spacing/10` | 48 |
> | `spacing/16` | `spacing/12` | 64 |

The original finding, for the record:

Both scales contain **exactly the same ten values**. Every key is shifted by
one position:

| Figma | px | Code key |
|---|---|---|
| `spacing/1` | 4 | `space[2]` |
| `spacing/2` | 8 | `space[3]` |
| `spacing/3` | 12 | `space[4]` |
| `spacing/4` | 16 | `space[5]` |
| `spacing/5` | 20 | `space[6]` |
| `spacing/6` | 24 | `space[7]` |
| `spacing/8` | 32 | `space[8]` ← the only aligned key |
| `spacing/10` | 40 | `space[9]` |
| `spacing/12` | 48 | `space[10]` |
| `spacing/16` | 64 | `space[12]` |

Code additionally has `space[0]=0` and `space[1]=2`, which is what pushes
everything down one.

**Why this is worse than colour drift.** A colour mismatch is visible. This one
is silent and plausible: a spec says `spacing/4`, a developer writes `pad={4}`,
and the result is 12px instead of 16 — 25% off, no error, and it looks
deliberate. `Surface`'s `pad` prop takes exactly these keys.

**`spacing/8` is the trap inside the trap** — it is the one index where both
scales agree, so a spot-check that happens to land on it confirms a parity
that does not exist.

---

## 3. Radius — **RESOLVED 2026-08-18**

> **Fixed, in two parts.**
>
> **First, a real code defect.** `radius.md` and `radius.lg` were *both* 12px —
> two names for one tier, so every `radius.lg` silently rendered as `md`. The
> four call sites reaching for it (AlertBanner, three TimelineBuilder panels)
> are all large containers whose author wanted something bigger than a card.
> 12 was the accident; the intent was never honoured. `lg` is now **16**,
> giving a clean 8/12/16/20 progression. `full` moved 999 → 9999 to match
> Figma (both round fully; nothing moves).
>
> **Then pushed to Figma:** `radius/sm` 4→8, `md` 6→12, `lg` 8→16, `xl` 12→20.
> `none` (0) and `full` (9999) already agreed. `radius/xs` (2px) is Figma-only
> and was left alone — code has no counterpart and inventing one would be
> speculative.
>
> **This one ships a visible change:** those four surfaces now render at 16px
> instead of 12px. Deliberate — it is the tier the code asked for.

The original finding, for the record:

| Token | Figma | Code |
|---|---|---|
| `none` | 0 | 0 ✓ |
| `xs` | 2 | *(absent)* |
| `sm` | 4 | 8 |
| `md` | 6 | 12 |
| `lg` | 8 | 12 |
| `xl` | 12 | 20 |
| `full` | 9999 | 999 |

Not a key shift — different values. Note code has `md` and `lg` both at 12,
collapsing a tier Figma keeps distinct.

---

## 4. Typography — **DECIDED 2026-08-18: keep both, document the crosswalk**

> **No change to either side.** The two vocabularies serve different readers and
> cannot be confused, which is the key difference from the spacing hazard: there
> the *same name* meant different values (`spacing/4` ≠ `space[4]`). Here the
> names do not collide at all — nobody mistakes `size/h1` for `type.size['3xl']`.
> It is a tidiness question, not a correctness one.
>
> Usage is heavily bottom-weighted and explains why code's scale is finer at the
> small end: `caption`(12px) 266 uses, `sm`(11) 144, `base`(13) 103, `xs`(10) 77,
> `2xs`(9) 33 — **89% of ~700 uses sit between 9 and 13px**. That is a dense
> operational UI. Figma's semantic scale is built for composing layouts, and
> stops at 11px.
>
> **Crosswalk** — where the two agree on px:
>
> | px | Figma | Code |
> |---|---|---|
> | 11 | `size/caption` | `sm` |
> | 12 | `size/label` | `caption` |
> | 13 | `size/body-sm` | `base` |
> | 14 | `size/body` | `md` |
> | 15 | `size/body-lead` | `lg` |
> | 16 | `size/h3`, `size/data` | `xl` |
> | 22 | `size/h1` | `3xl` |
>
> **Figma-only:** 18 (`h2`), 24 (`data-lg`), 28 (`op-hero`).
> **Code-only:** 9 (`2xs`), 10 (`xs`), 17 (`section`), 20 (`2xl`), 26 (`4xl`), 30 (`5xl`).
>
> Note the collision-shaped trap in that table: `size/caption` is 11px while
> code's `caption` is 12px. Same word, different value — the one place these
> vocabularies *do* overlap in name. Do not translate by name; translate by px.
>
> **`4xl` (26px) has zero uses** in code and is a candidate for removal.

The original finding, for the record:

Figma is **semantic**: `size/h1` 22, `size/h2` 18, `size/h3` 16,
`size/body-lead` 15, `size/body` 14, `size/body-sm` 13, `size/label` 12,
`size/caption` 11, `size/op-hero` 28, `size/data-lg` 24, `size/data` 16.

Code is **t-shirt**: `2xs` 9 → `5xl` 30, thirteen steps, extended 2026-06-24
for CommandCenter's dense data UI.

The values overlap but the vocabularies do not map 1:1. There is no mechanical
translation between `size/h2` and `type.size.*`.

**`family/sans` = `"Inter"` in Figma.** Code dropped Inter on 2026-08-18 after
finding it was never loaded anywhere in the app — the repo fetches only
Playfair Display and Newsreader. Figma still specifies it, so any Figma render
uses a font the product does not serve.

---

## 5. What this means

The `tokens.js` header claim — *"mirrors the Figma NGW Color / Spacing /
Typography variables 1:1 (Sprints 5–8)"* — was **true when written**. The
collections exist with exactly those names. It has simply not survived Sprints
49, 60.N and 60.U.3, and the parenthetical is the tell: it scopes itself to
Sprints 5–8 and was never renewed.

Direction of authority is unambiguous and matches what `palette.js` already
states (*"NOT yet written back to Figma"*): **code is upstream.** Every drift
traces to a dated, reasoned code change; none traces to a Figma decision the
code missed.

## 6. Recommendations

1. ~~**Fix spacing first.**~~ **DONE 2026-08-18** — Figma renamed to match code,
   two missing values added, 12/12 verified. See §2.
2. ~~**Push colour code → Figma.**~~ **DONE 2026-08-18** — 25 values written,
   34/34 primitives verified matching. See §1.
3. **Decide the type vocabulary.** Semantic (Figma) and t-shirt (code) are both
   defensible; running both is not. This is a naming decision, not a drift fix.
4. **Update `family/sans` in Figma** to the real stack, or accept that Figma
   renders in a font the product never serves.
5. **Add the missing code tokens to Figma**: `status/in-progress`,
   `text/on-tint`, and the `dangerRed` / `dangerSolid` split.
