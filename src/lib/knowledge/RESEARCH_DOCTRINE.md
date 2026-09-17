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

## 6. How to actually fetch a source (2026-09-17)

**Read the page. Never register a source from a search-result snippet, and never assert what a source says from this registry's own summary.** A snippet drops the conditional that makes a number mean anything. Two defects in one day came from skipping this:

- `p_chips.costProvenance` cited `cheese-sliced-2026`, whose figures appear nowhere in the claim. Caught only by reading the registry entry against the claim it backed.
- `p_wings.provenance` was "corrected" with the assertion that `webstaurant-protein-2026` states no wing piece count. It states 6–8 wings per person as a main course and 3–5 as an appetizer. That assertion was read off this registry's summary `claim` field rather than the page, and shipped wrong.

**Use the Exa MCP tools (`web_search_exa`, `web_fetch_exa`), not `WebFetch`.** In a cloud session `WebFetch` goes through the environment's network allowlist, which blocks most research domains — including hosts already in this registry. MCP connector traffic travels through Anthropic's servers instead and is not subject to that allowlist, so it reaches pages `WebFetch` cannot. There is no allowlist to maintain, and no reason to widen the environment's network access for research.

**What a registration needs**: `org` naming every publisher read, `url` (plus `corroboratingUrl` where a second page carries the figure), `fetched` as the date you actually read it, `sourceClass` and `claimType`, `limitations: ['commercial_interest_disclosed']` when the publisher sells what it measures, and a `claim` that carries the source's own conditionals — the tier, the range, and what the figure excludes. A number without its conditional is not a grounded claim.
