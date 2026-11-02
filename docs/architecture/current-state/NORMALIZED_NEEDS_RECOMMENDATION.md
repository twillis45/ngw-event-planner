# Normalized needs & accessibility — recommendation

**Status: evidence complete. The answer is unambiguous and it is a gap.**

---

## 1. What exists today

Exhaustive search of `src/lib` for accessibility / mobility / dietary / allergy
/ sensory / needs modules returns **two files**:

| Module | Exports | Covers |
|---|---|---|
| `dietRows.js` | `DIET_TAGS` (:27), `dietRowsFor` (:56), `anyDietFlagged` (:79) | **Dietary only** |
| `rsvp.js` | `rsvpState` (:18), `rsvpIsSettled` (:27), `rsvpHasResponded` (:33) | **Response state only — captures no needs at all** |

Grep of `rsvp.js` for `access|mobilit|walker|wheelchair|diet|allerg`: **zero
hits.**

**There is no mobility, sensory, communication, transportation or lodging-need
model anywhere in the repository.**

## 2. What the parser produces, and where it lands

From the creation audit (runtime output):

- `"the altitude is hard on her"` → `healthNoted: { yes: true, quote: "…" }`
- `"she uses a walker"` → `unusedClauses: ["she uses a walker"]`

Note carefully: **even the captured one is not normalized.** `healthNoted` is a
boolean plus a verbatim quote. It is a *flag that something health-related was
said*, not an operational need. Nothing can route on it.

## 3. Therefore — the classification

| Item | Class |
|---|---|
| Walker statement dropped | **Downstream capability gap**, not a parser defect |
| Altitude captured as a quote | **Missing normalized schema** — captured, not actionable |
| Dietary | **Partially built** — `DIET_TAGS` exists |
| Mobility / sensory / communication / transport / lodging need | **Not built** |

Teaching the parser to extract "walker" today would produce a value with **no
schema to hold it and no consumer to read it**. Parser work must follow the
schema, not lead it.

## 4. Recommendation — one canonical need, tag-shaped

Model it on `dietRows.js`, which already works and which hosts already
understand. Do **not** invent a different shape for mobility than for diet.

A need should be **one record, written once, consumed where relevant**:

```
need = {
  kind:    'mobility' | 'dietary' | 'allergy' | 'sensory'
         | 'transport' | 'lodging' | 'communication',
  tag:     canonical token (e.g. 'step-free', 'walker', 'low-altitude-care'),
  whose:   guest id | 'honoree' | 'unspecified',
  source:  'said-at-intake' | 'rsvp' | 'host-entered',
  quote:   the host's own words, preserved verbatim,
}
```

Consumed by: **Place** (step-free access, seating proximity), **Lodging**
(ground floor, lift), **Ground** (vehicle type, drop-off), **Seating** (table
placement, path width), **The Day** (pace, rest points).

### Rules this must carry

1. **Never infer a diagnosis.** "Uses a walker" is a mobility need. It is not a
   medical condition, and the app must never name one. `healthNoted`'s existing
   quote-preserving shape is the right precedent — carry the host's words.
2. **`source` is mandatory**, matching the repo's existing provenance
   discipline (`typeBasis`, `destinationBasis`, `guestEstimateSource`,
   `PRICE_LAYERS`).
3. **Extend RSVP to collect needs** rather than building a second intake.
   `rsvp.js` is the natural writer for guest-level needs and currently captures
   none — this is the single highest-leverage addition, because it makes needs
   arrive at scale without the host transcribing them.
4. **Migrate `healthNoted` into it**, keeping the quote. Do not leave two
   mechanisms.
5. **A need with no consumer is worse than no need.** Ship a need kind only
   together with at least one surface that acts on it; otherwise it becomes
   another thing captured and ignored — the exact failure
   `unusedClauses` was built to expose.

## 5. GOLD-04 dependency

Santa Fe cannot pass without at least `kind: 'mobility'` reaching Place,
Lodging, Ground and Seating. **This is the blocking item for that acceptance
event** and it is schema work, not parser work.
