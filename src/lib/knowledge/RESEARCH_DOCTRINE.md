# Research & Grounding Doctrine

_The single standard for how the decision engine grounds a claim in research. Established 2026-07-16 ("make sure we have consistent good doctrine on research")._

The engine grounds decisions across ~14 axes (timing, cost, quantity, cultural, accessibility, legal/COI, venue, weather, human, dietary, budget, childcare, military ceremony, destination/travel). This doctrine says what "grounded" means, uniformly, so no two axes speak different languages.

## 1. The grounding ladder (what a tier MEANS)

Canonical vocabulary lives in [`groundingDoctrine.js`](./groundingDoctrine.js). Every tier — old, new, or domain-specific — normalizes onto exactly one rung:

| Rung | Grounded? | Meaning |
|---|---|---|
| `cited` | ✅ | A specific, dated, authoritative source is named — fully traceable. |
| `established-consensus` | ✅ | An authoritative standard/regulation or well-established professional consensus (ADA, FDA, NOAA, federal law, DoD/service regs, standard hotel/industry practice). |
| `researched` | ✅ | Grounded in dated researched sources. |
| `synthesized` | ❌ | Heuristic derived from grounded inputs but not yet verified to a source — flagged, never scored as grounded. |
| `reasoned` | ❌ | Editorial judgment, no external source — a call a seasoned planner also makes without citing (taste, sequence, choreography). Forcing a citation here is false precision. |

Domain-standard names map on automatically: `ada-standard` / `fda-standard` / `noaa-standard` / `legal-standard` / `planning-standard` / `childcare-standard` / `consensus` → `established-consensus`; `regional-heuristic` / `trade-heuristic` → `synthesized`. **Do not invent new tier names** — reuse a rung, and name the specific standard in the source `note`.

`isGroundedTier(tier)` is the one uniform test. `normalizeTier` / `tierInfo` / `groundingLadder` support display and audit.

## 2. The two authored source shapes (known, allowed)

- **Newer axes** (military, destination, timing, cost, quantity): source object carries `{ title, publisher, tier, note }` — tier on the source.
- **Older axes** (accessibility, cultural, dietary, weather, childcare, legal, venue): source object carries `{ org, url, fetched, claim }` and the **tier lives on the per-decision context object**.

Both are valid. The invariant that holds across both: **any tier that is authored must normalize onto the ladder** (enforced by `groundingDoctrine.test.js`). When adding a *new* axis, prefer the newer `{title, publisher, tier, note}` shape.

## 3. Provenance is mandatory (see [[hold-source-provenance]])

Every grounded claim carries `sources: [ids]`, each id resolving in that axis's `*_SOURCES` registry. No grounded claim without a resolving id. Provenance rides **through** transforms — never drop `sources` when deriving a context. All registries union into [`groundingSources.js`](./groundingSources.js) → auditable in the admin Intelligence Observatory (`?observatory=1`), now showing each source's **canonical** rung.

## 4. The research PROCESS (freshness, corroboration, retry)

Grounding is a snapshot; keeping it true over time is [`researchPolicies.js`](./researchPolicies.js): per-gap `freshnessDays`, `corroborationRequired` / `minCorroboration`, `retryAttempts`, `timeoutMs`, `scheduleInterval`, `failureMode`. A source past its freshness window is stale, not grounded. Corroboration-required claims need ≥`minCorroboration` independent sources before they count.

## 5. Honesty rules

- A `reasoned`/`synthesized` decision must **never** render as "grounded" or cite a fake source. Honest-ungrounded beats false-cited.
- Test fixtures may use off-ladder tiers (`made-up`, `wrong`) **only** to prove the predicates reject them. They never appear in a production registry.
- If you can't ground a claim, say so and gather the fact instead (e.g. destination `dest_travelmix` is fact-gathering, deliberately ungrounded) — do not manufacture a tier.
