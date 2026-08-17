# Review Board — coarse vs per-commodity geographic pricing

Date: August 16, 2026
Question: should the client-side per-commodity BLS table refine the existing
basket-mean price factor?

---

## The verified facts the board was given

1. **Geography is already applied in production.** `backend/app/routers/food_prices.py`
   returns a regional factor; `playbookFoodPlan` multiplies it into EVERY priced
   band (`playbooks/index.js:3774`). `REACT_APP_API_BASE_URL` is set for live
   releases. My earlier report that geo "isn't applied" was wrong.
2. It is a **basket mean**: seven staples, `statistics.fmean(ratios)`, then
   **clamped to [0.8, 1.3]** as a deliberate guard against a bad or partial fetch
   skewing budgets.
3. It is **live-fetched** from BLS at the latest common month.
4. The client-side `geoCostFactors` table is a **hardcoded May 2026 snapshot**
   with no runtime staleness guard and no clamp.
5. **The backend already computes per-item ratios and discards them.** Line 113
   builds `r / n` for each basket item; line 116 collapses the list with `fmean`.
   The per-commodity precision being proposed already exists, server-side, fresh
   — and is thrown away one line before use.

Fact 5 is the ruling.

---

## Design bench (first)

**Edward Tufte.** "You have the disaggregated data and you are averaging it away
before it reaches the reader. Beer and potatoes do not move together; the mean of
their ratios describes neither. Stop discarding the detail you already paid to
fetch."

**Don Norman — error prevention.** "The client table is frozen at May 2026 with
no runtime expiry. Precision that silently rots is worse than an honest average,
because nobody gets told when it stops being true. And two multipliers on one
band is a double-apply waiting for a tired afternoon."

**Julie Zhuo.** "The proposal as put — a second mechanism on the money path —
is the wrong shape regardless of the answer. One price pipeline."

## Event bench (second — override authority)

**Jessica Bishop (Budget Savvy Bride).** "Alcohol is where the regional spread
actually bites, and it is the line a host on a budget is most likely to cut. If
you can only get one commodity right, get the drinks right. So the precision is
worth having — but not at the cost of a number that quietly ages."

**Ramit Sethi.** "Money is emotional. A budget that moves because the software
got smarter is fine. A budget that moves because a hardcoded table finally got
noticed two years later is a trust event."

**"Grandmother."** "Say whether the price is for where I live. That is all I want
to know. I do not care which table it came from."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "The client table should not be wired
and should not be kept. Everything it does, the backend can do better and already
half does:

- It already fetches per-item series for both the region and the US.
- It already computes the per-item ratio.
- It already has the freshness, the failure handling, and the clamp.

Return the per-item ratios alongside the mean, have `playbookFoodPlan` apply the
specific factor for a mapped line and the mean for everything else, and there is
still exactly ONE multiplier per band and ONE source of truth. Wiring a frozen
client table beside a live server one is how you get two answers to the same
question and no way to tell which shipped.

The curated allowlist is the one piece worth keeping — the mapping from a dish
line to a commodity series is real judgment and belongs in the client, where the
corpus is. Its factors are not."

**The Liability & Trust Reviewer.** "A clamp exists because someone thought about
a bad fetch. A second path with no clamp reintroduces the risk the clamp was
added to close."

---

## RULING

**Do not wire the client-side factor table. Do not keep it.**

Ordered:

1. **Per-commodity precision belongs in the backend**, which already computes it.
   Extend `/food-prices` to return the per-item ratios it currently discards,
   keeping the mean as the fallback for unmapped lines.
2. **One multiplier per band, always.** A mapped line takes its commodity factor
   INSTEAD of the mean — never in addition. This is the single correctness
   condition and it is worth a test that fails loudly.
3. **Keep the allowlist, drop the factors.** `geoItemMap.js`'s dish→commodity
   mapping and its exclusion register are real work and stay. `geoCostFactors`'s
   hardcoded numbers must not become a second source of prices.
4. **Anything frozen carries an expiry.** If a hardcoded factor ever ships, it
   states its vintage at runtime and degrades to the mean when stale. Precision
   that cannot age out is a liability.
5. **Alcohol first** if the work is staged (Bishop's override): widest real
   spread, and the line a budget-conscious host cuts first.

**Dissent:** none on direction. Bishop pressed to ship the alcohol refinement
sooner than a backend change comfortably allows; the board recorded the
impatience but did not overturn the one-pipeline rule.

**Bar for done:** a test proving a mapped line receives exactly one factor, and a
test proving an unmapped line still receives the mean. Until the backend returns
per-item ratios, the correct state of this feature is the basket mean it already
has — which is honest, fresh, and clamped.

**Correction recorded:** the item was carried as "geo factors exist but are not
applied." Geography IS applied. The accurate statement is that it is applied
coarsely, and the fix is server-side, not client-side.
