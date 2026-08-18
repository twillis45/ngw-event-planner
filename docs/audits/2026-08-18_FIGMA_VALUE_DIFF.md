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

## 1. Colour — code is ahead, Figma holds the "was" values

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

## 2. Spacing — the dangerous one

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

## 3. Radius — genuinely divergent

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

## 4. Typography — two different systems

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

1. **Fix spacing first.** It is the only drift that fails silently and the only
   one with a documented consumer (`Surface.pad`). Either renumber the code
   scale to match Figma, or rename Figma's to match code. Do not leave two
   scales sharing values under different keys.
2. **Push colour code → Figma.** 18 primitive values, all deliberate code
   decisions. `figma:figma-generate-library` can write variables; the direction
   is code → Figma, never the reverse, or Sprint 49 and 60 get undone.
3. **Decide the type vocabulary.** Semantic (Figma) and t-shirt (code) are both
   defensible; running both is not. This is a naming decision, not a drift fix.
4. **Update `family/sans` in Figma** to the real stack, or accept that Figma
   renders in a font the product never serves.
5. **Add the missing code tokens to Figma**: `status/in-progress`,
   `text/on-tint`, and the `dangerRed` / `dangerSolid` split.
