# Travel / lodging provider capability matrix

**Status: evidence complete on the shared shape; per-provider depth varies and
is marked.** The brief's instruction — "do not normalize providers into a
capability they do not actually share" — turns out to cut the opposite way
from what was expected.

---

## 1. The headline

**No lodging provider is an integration.** Every path is one of:

- a **deep link** the host follows (`googleTravelTs.js`),
- a **bookmarklet** where the host's own browser reads the listing and sends it
  back (`lodgingBookmarklet.js`),
- or **manual entry**.

The providers *are* uniform — just not in the way "normalize them" implies.
They are uniformly **link-out + host-mediated return**.

## 2. Why, in the repo's own words

`lodgingBookmarklet.js` header, answering the host's question "why does the host
have to pull a url?":

> "The answer was about WHO does the reading. When this was tested by hand, the
> reading was done by the host's own browser: their profile, their IP, a page
> already open in front of them. **The app's server doing the same thing is
> harvesting — the never-build line** — and it mostly fails anyway (**Vrbo
> refuses our single-page read from Render in production**, and that is the easy
> case)."

Two separate constraints, and only one is technical:

1. **Policy** — server-side listing reads are a declared never-build.
2. **Technical** — Vrbo blocks it from production anyway.

This is a **standing product ruling**, not a backlog item. A redesign that
shows provider results inline would violate it.

## 3. Per-provider

| Provider | Search | Results import | Listing detail | Price | All-in price | Availability | Booking URL | Photos | Amenities | Reliability | Fallback |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Google Hotels / Travel** | **deep link** — `googleTravelTs.js` builds a structured `ts` token, not free text | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (the link) | ✗ | ✗ | Link correctness tested; a prior free-text `q=` form was **driven live 2026-08-06 and found broken** (Google read the place but not the dates) | manual |
| **Airbnb** | deep link | **bookmarklet** (host-initiated) | via bookmarklet payload | via bookmarklet | ✗ | ✗ | ✓ | ✗ | ✗ | depends on host action | manual |
| **Vrbo** | deep link | **bookmarklet only** | via bookmarklet | via bookmarklet | ✗ | ✗ | ✓ | ✗ | ✗ | **server read explicitly refused in production** | manual |
| **Booking.com** | referenced in 22 lib files — **depth not individually traced**; no API client found | ✗ | ✗ | ✗ | ✗ | ✗ | likely link | ✗ | ✗ | unverified | manual |
| **Expedia** | 1 file reference only | ✗ | ✗ | ✗ | ✗ | ✗ | — | ✗ | ✗ | effectively **not integrated** | manual |
| **Direct hotel / manual** | n/a | **manual entry** | host-entered | host-entered | host-entered | host-asked | host-entered | ✗ | ✗ | host-dependent | — |

**Marked honestly:** Booking.com's 22 file references were not individually
opened. No API client or server fetch path for it was found, so it is recorded
as "likely link" rather than claimed either way.

## 4. What the host actually gets

- `destLodgingOptions.js:23 DEST_LODGING_OPTIONS` is a **four-item intent
  picker**, not a results list:
  *A room block, no commitment · A room block I guarantee fills · Guests book
  on their own · A host-arranged Airbnb*
- `lodgingFloor.js`, `knowledge/lodgingBasisLadder.js`, `lodgingIntel.js`
  provide **estimates with a basis ladder** — the honest substitute for live
  pricing.

## 5. Redesign constraints

1. **Do not design a results grid.** There are no results to put in it.
2. **Do not imply availability or all-in pricing.** Neither exists for any
   provider.
3. **The bookmarklet is a real, deliberate capability** — design *for* it as a
   first-class return path, not around it.
4. **Lodging numbers are estimates with a basis.** Showing a price without its
   basis is a truthfulness regression (same rule as `PRICE_LAYERS`).
5. **Vrbo's production block is load-bearing evidence**, not an incident to
   retry.
