# Stripe consumer-checkout readiness - audit, 2026-10-03

**Question asked.** `FLAGSHIP_DEMO_AND_PRICING_D2.md` lists five preconditions
before the product can take money, and names the third as unverified: "a
checkout path (a Stripe router exists in the backend - its readiness for
consumer checkout is unverified and must be audited before any price page goes
live)." This audit answers that one question.

**Answer. No. The Stripe integration is live, hardened and working - for a
different job.** It bills a HOST'S CLIENT for an event fee. It cannot sell the
One-Event Pass, and the gap is not a missing wire.

---

## What is actually true, each item measured

| | |
|---|---|
| Stripe configured in production | **YES** - `GET /api/stripe/status` returned `{"configured":true}` on 2026-10-03 |
| Endpoints that exist | `/status`, `/create-checkout-session`, `/verify-session`, `/webhook` |
| Backend tests | four files - checkout auth, webhook signature, redirect origins, protected-route sweep |
| What it charges for | a **fee milestone**: body carries `fee_id`, `client_name`, `event_id`; the Stripe product name renders as `"{label} - {client_name}"` |
| Who sets the price | **the caller**, via `amount_cents`, bounded only by `> 0` and `MAX_AMOUNT_CENTS` |
| Frontend wiring | `src/App.js` only - the FROZEN CRA shell - described in its own UI as "Create payment links - clients pay on a secure hosted page" |
| hostv2 wiring | **NONE.** The actual product has no Stripe code |
| `passGate.js` | knows nothing about payment; dormant until `REACT_APP_BILLING_LIVE === '1'` |

## The blocker, stated by the code itself

From the 2026-08-07 board ruling comment in `stripe_payments.py`:

> "There is no server-side entitlement (feeSchedule is localStorage and the
> webhook only logs), so an anonymous purchase produces a charge and nothing
> the host can ever recover."

And at the webhook: *"Today the handler only logs."*

That is the whole finding. A buyer could be charged and **nothing would record
that they bought anything.** There is no server-side store of who owns what, so:

- clearing the browser loses the purchase
- editing localStorage grants it for free
- `passGate` has no server truth to consult even if it were switched on

## Five gaps between "Stripe configured" and "can sell the app"

1. **No entitlement store.** Nothing server-side records a purchase. This is
   the load-bearing gap; the other four are small beside it.
2. **The webhook only logs.** It verifies its signature correctly and then
   grants nothing.
3. **Price is caller-supplied.** Correct for invoicing, where the host sets the
   fee. Wrong for a fixed-price product - a buyer could post one cent.
4. **All wiring is in the frozen CRA shell.** `src/App.js` is donor-only under
   the A1 freeze; hostv2 has none.
5. **`passGate` is not connected to payment at all** - it gates on a pass it
   has no way to learn about.

## What is already right, and should not be rebuilt

The hardening is real and was argued, not assumed:

- `create-checkout-session` requires a planner token (it was anonymous until
  the 2026-08-07 ruling; anyone reachable could mint a session on this account)
- auth is checked BEFORE the configuration check, deliberately, so an anonymous
  caller cannot learn whether this deployment has Stripe wired
- webhook signatures are verified; an unsigned path survives only where no
  secret is set at all, and says so in the log
- redirect URLs are checked against an app allowlist, and the error names the
  field rather than the allowlist
- amount bounds, and newline stripping on the label because it renders on a
  Stripe-hosted page

## Recommendation

Treat consumer checkout as **unbuilt**, not as "a router that needs wiring."
The honest sequence is entitlement first: a server-side record of who bought
what, written by the webhook, read by `passGate`. Until that exists, flipping
`REACT_APP_BILLING_LIVE` would take money and deliver nothing recoverable -
which is the support incident the 2026-08-07 ruling already refused once.

Nothing in this audit changed any code.
