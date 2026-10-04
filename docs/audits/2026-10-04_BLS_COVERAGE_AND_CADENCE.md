# What to expect from BLS food prices - measured 2026-10-04

Measured against the live BLS API, all 7 basket items x 5 areas, 2025-01
through 2026-08. 35 of 35 series returned. "20mo" means every month in the
window carried data.

| item | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| Eggs | 20mo 26-08 | **1mo 25-10** | 10mo 25-10 | 20mo 26-08 | **none** |
| Milk | 20mo 26-08 | **1mo 25-10** | **1mo 25-10** | 20mo 26-08 | 20mo 26-08 |
| Bread | 20mo 26-08 | 16mo **26-04** | 17mo **26-05** | 20mo 26-08 | 20mo 26-08 |
| Ground beef | 20mo 26-08 | **1mo 25-10** | **1mo 25-10** | 20mo 26-08 | **1mo 25-10** |
| Chicken | 20mo 26-08 | 20mo 26-08 | 20mo 26-08 | 20mo 26-08 | 20mo 26-08 |
| Potatoes | 20mo 26-08 | 18mo 26-08 | 20mo 26-08 | 20mo 26-08 | 9mo 26-08 |
| Bananas | 20mo 26-08 | 20mo 26-08 | 20mo 26-08 | 20mo 26-08 | 4mo 25-10 |

## The cadence, where it exists

**Monthly, about two months behind.** On 2026-10-04 the newest month
everywhere healthy was 2026-08. APU ships with the CPI release, mid-month. So
September data should appear around mid-October and the app will pick it up
within its 6h cache - no job runs, nothing needs scheduling.

## The finding: regional coverage is not stable, it is SHRINKING

Four distinct patterns, and only one of them is "working":

1. **Complete** - US and South carry all seven items, all 20 months. These are
   the only two geographies with full coverage.
2. **Stopped mid-window** - Northeast bread ends 2026-04; Midwest bread ends
   2026-05. Continuous up to that point, then nothing.
3. **Effectively retired** - eggs, milk and ground beef in the Northeast and
   Midwest return exactly ONE month, 2025-10, inside a 20-month window. West
   ground beef and West bananas show the same shape.
4. **Absent entirely** - West eggs: no series at all.

The 2025-10 cliff across several unrelated items in several regions is the
loudest signal here: it looks like a BLS coverage change, not an outage.

## What that means for the app

The regional factor is a mean of whatever ratios resolve, with a floor of
three. Today: South 7 of 7, West 4 of 7, Northeast 4 of 7, Midwest 4 of 7.
Three of four regions are already running on a little over half the basket,
and the trend across 2025-2026 is downward.

So the honest expectation is NOT "this refreshes monthly and stays correct".
It is: **the South and US stay current; the other three regions will keep
losing items, and their factor is computed from a shrinking, aging subset.**

## Open questions, not decided here

- At what coverage does a regional factor stop being worth computing? The
  floor is 3 of 7. Nobody has argued for that number since the basket shrank
  around it.
- Should a region below some threshold fall back to the US baseline and SAY
  so, rather than report a factor built from four items, one of them six
  months old?
- Are better-covered APU items available to replace the retired ones? Not
  investigated.

Nothing in this audit changed any code.
