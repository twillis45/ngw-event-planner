# Provider Governance - Audit + Data Model Recommendation

**Date:** 2026-08-01. ASCII-only.
**Scope:** data model recommendation ONLY. No UI, no new providers, no research started.

---

# 1. Why this exists before the backfill, not after

The 537-line backfill will multiply the number of external claims in NGW by roughly an
order of magnitude. Today there is nowhere to record **what a source is allowed to say**.
The consequence is already visible in the corpus: `cameronsseafood.com` was cited for a
per-size serving table it does not publish, and the citation looked identical to a real
one. Nothing structural prevented it, and nothing structural would prevent it 500 more
times.

A provider contract is the cheapest possible fix, and it must exist before volume, not
after.

---

# 2. Audit of what exists today (measured, not estimated)

`groundingSources.js` - `groundingSourceCatalog()`:

```
Axes                20
Sources            111
  with publisher    24  (22%)
  with a note       24  (22%)
  grounded          24  (22%)
  UNSPECIFIED tier  87  (78%)

Tier labels: unspecified 87 | Established consensus 18 | Researched 2 | Cited 4
```

Sources per axis:

```
Incident / guest safety 26 | Military ceremony 12 | Timing 10 | Fire & burn safety 10
Food safety 8 | Booking / vendor collapse 7 | Destination / travel 7
Cultural / religious 6 | Accessibility 3 | Legal / COI 3 | Group rental fit 3
COST 3 | QUANTITY 3 | Venue constraint 2 | Human / relational 2
Table & seating capacity 2 | Weather 1 | Dietary / allergy 1 | Budget authority 1 | Childcare 1
```

## 2.1 The finding

**The two axes the backfill actually needs are the two least equipped.** `Cost` and
`Quantity` have **3 sources each, 6 between them, and not one of them is in the grounded
24.** Every grounded source is a military-ceremony regulation or a safety/travel authority
(`title-4-usc-flag`, `ar-600-25`, `cdc-yellowbook`, `ada-clearance`, ...) - real
authorities, cited properly, on axes that are not what a host's shopping list is made of.

The commercial sources the food corpus actually leans on - Captain White's, Cameron's,
Don's, Blue Crab House, WebstaurantStore - **are not in this registry at all.** They live
as free-text strings inside individual `provenance.sources` arrays, so:

- nothing can ask "what else did Cameron's tell us?"
- nothing can expire them
- nothing can record that one of them was wrong
- the same vendor appears under several spellings

## 2.2 Fields that do not exist and are needed

Present today: `id`, `title`, `publisher`, `tier`, `canonTier`, `tierLabel`, `grounded`,
`note`.

Absent: **allowed claim types, disallowed claim types, freshness requirement, evidence
type, geographic scope, observed failures.** Those are precisely the fields that would
have caught the Cameron's error.

---

# 3. Recommended data model

One record per provider. Additive; it does not change `groundingSources.js` semantics.

```js
{
  id: 'webstaurant-protein-2026',
  name: 'WebstaurantStore',
  category: 'commercial',          // see 3.1

  // WHAT IT MAY GROUND. A claim whose type is not in this list cannot cite
  // this provider - the check that would have refused the Cameron's citation.
  supports: ['portion-guide', 'package-size', 'commercial-pricing'],
  refuses:  ['local-retail-pricing', 'regional-availability', 'cultural-practice'],

  scope: { geography: 'US-national', segment: 'foodservice' },

  evidenceType: 'published-page',  // see 3.2
  freshnessDays: 90,               // see 3.3
  capturedAt: '2026-07-14',
  url: 'https://...',

  // Observed failures, kept WITH the provider. A provider that has been wrong
  // once is not disqualified; a provider whose failures are invisible is.
  failures: [
    { date: '2026-07-14', claim: 'per-size serving counts',
      what: 'URL 301-redirects; the cited table is not published',
      action: 'claim withdrawn, row marked interpolated' },
  ],
}
```

## 3.1 Categories, and what each may ground

| Category | May ground | Must never ground |
|---|---|---|
| `regulatory` (CDC, ADA, USC, service regs) | safety, legal, accessibility, protocol | price, taste, custom |
| `trade-association` (AHLA, NRA) | industry norms, planning ratios | a specific vendor's price |
| `commercial-national` (WebstaurantStore, Costco guides) | package sizes, portion guides, national price bands | **local retail price** |
| `commercial-local` (Captain White's, Don's) | that vendor's own price, on the date captured | a regional average, another vendor's price |
| `editorial` (The Knot, Brides) | convention, expectation, etiquette | cost, quantity, safety |
| `culture-bearer` | practice, meaning, sequence | cost, safety |
| `internal-observation` | what NGW itself measured | anything external |

**The single most valuable rule in this table:** a national commercial source may not
ground a local retail price, and a local vendor may not ground a regional average. Both
errors are already in the corpus.

## 3.2 Evidence types, weakest to strongest

`recollection` (never publishable) < `secondary-citation` < `published-page` <
`dated-price-list` < `direct-quote-with-date` < `regulation`.

A claim inherits the weakest evidence type among its sources.

## 3.3 Freshness

| Claim type | Freshness | Why |
|---|---|---|
| local retail price | **30 days** | crab prices moved $72 -> $98 across four DMV dealers in one week |
| national price band | 90 days | |
| portion / serving guide | 365 days | changes with convention, not with markets |
| package size | 365 days | |
| safety / legal / regulatory | until superseded | dated by the issuer, not by us |
| cultural practice | no expiry | but re-verify with a culture-bearer, never a search |

**Stale is not wrong - stale is UNKNOWN.** A claim past freshness must degrade its
displayed confidence, not silently keep asserting.

## 3.4 The silent-provider record

Two DMV vendors publish nothing. That is a finding and must be storable:

```js
{ id: 'jessie-taylor', name: 'Jessie Taylor Seafood', category: 'commercial-local',
  supports: [], refuses: ['*'], evidenceType: 'none',
  silence: { checkedAt: '2026-07-14',
             note: 'No published prices, no per-person guidance. Only dated prices found are WTOP 2018.' } }
```

Without this, the same dead end is re-researched forever, and the absence of a number
looks like an oversight instead of the answer.

---

# 4. Enforcement - where it plugs in

The pattern is already proven by the ownership contract, and its lesson applies directly:
**declarations agreeing with each other prove nothing.** So enforcement belongs at the
gate, and verification belongs against behaviour.

| Point | Check |
|---|---|
| `publishKCR` | every `provenance.sources[]` id resolves to a known provider |
| `publishKCR` | the claim's type is in that provider's `supports` and not in `refuses` |
| `publishKCR` | no source is past `freshnessDays` for this claim type |
| composer | the source picker offers only providers that support the field being corrected |
| a `providerContract.test.js` | every id used anywhere in the corpus exists in the registry; no provider has empty `supports` unless it also has a `silence` record |

**Do not build the UI yet.** The registry plus the publish-gate checks are worth more than
any screen, and they are what makes volume safe.

---

# 5. Recommended sequence

1. Define the provider record and backfill it for the **24 already-grounded** sources -
   they have publishers and notes, so this is mechanical.
2. Register the ~12 commercial food sources that currently live as free-text strings.
   This is where the Cost/Quantity gap actually closes.
3. Add the publish-gate checks (source-known, claim-type-allowed, freshness).
4. Add `providerContract.test.js`.
5. **Only then** start Tier 1 of the backfill.

Steps 1-4 are a phase. Step 5 is the phase after.
