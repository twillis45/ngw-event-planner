# Refund Policy — the One-Event Pass

> **DRAFT 2026-11-02 — not yet reviewed, not yet in effect, not yet linked from
> the product.** The refund rule itself is the owner's decision; section 3
> gives one recommendation and two alternatives, with the reasoning, and the
> rest of the document is written to fit whichever is chosen. `[OWNER: …]`
> items are the owner's to fill.

**Effective:** `[OWNER: effective date]`
**Seller:** No Guesswork Systems LLC, `[OWNER: mailing address]`
**Questions and requests:** `[OWNER: support email]`

---

## 1. What you are buying

The **One-Event Pass** is a single purchase of **$39 (USD)** that unlocks the
paid parts of planning for **one event**: sharing vendor briefs beyond the
first one, destination and multi-day planning, and the features the app names
as covered by the pass when it asks. ⟶ `src/lib/passGate.js:9, 164-170`

- It is **one event, one time.** It is not a subscription. Nothing renews,
  nothing is charged again, and you will never be billed without going through
  checkout yourself. ⟶ `routers/stripe_payments.py` (`mode="payment"`)
- The price is set by us at checkout and is not editable by the app or by you.
  ⟶ `stripe_payments.py` (`PASS_AMOUNT_CENTS` is server-set)
- Planning itself stays free. You can plan an event end to end, run the day,
  and send one vendor brief without buying anything. The pass is for the parts
  that go beyond that, and the app tells you which ones before it asks.
- **Vendors are never charged.** No fee is taken from any vendor, caterer, or
  venue, and none ever will be. ⟶ standing commitment: `src/lib/passGate.js:43`
  ("no vendor-side fees while the no-vendor-fees sentence ships"),
  `docs/audits/2026-08-19_MODEL_D_VS_LEADERS.md:70`

Payment is taken on Stripe's hosted checkout page. We do not see or store your
card details. Your receipt comes from Stripe.

## 2. When the pass takes effect

Immediately after a successful payment. If you return from checkout and the
event still shows as locked, wait a few seconds — the confirmation from Stripe
can arrive after you do — and reload. If it is still locked after a minute,
email us with your Stripe receipt and we will fix it the same day.
⟶ `refreshEventPass` retry ladder, `passEntitlement.js`

## 3. Refunds — the rule `[OWNER: refund rule — pick one]`

Three options, in the order we recommend them. The rest of this document reads
correctly under any of the three.

**Option A (recommended): 14 days, no questions, if the pass has not been used
to share a brief.** You may request a full refund within 14 days of purchase
as long as you have not shared a vendor brief beyond your first one or used
destination/multi-day planning on the event. If you have, the pass has done
the thing it was bought for and the purchase is final.
*Why:* it matches how the pass is sold (a tool for a specific job), it is
simple to administer (one look at the event's share count), and it does not
invite buying, using, and refunding. Stripe's dispute fee makes a contested
chargeback cost more than a $39 refund, so a clear no-quibble window inside
which we refund first and ask later is cheaper than a strict policy.

**Option B: 14 days, unconditional.** Full refund on request within 14 days,
used or not.
*Why you might:* the simplest promise to make and the easiest to explain in
one line on the pass sheet; the exposure is $39 per event and the pass cannot
be resold. *Why you might not:* a host can plan a whole event on the pass and
refund it on day 13.

**Option C: 30 days, unconditional, one per customer.** Full refund within 30
days, once; a second pass purchased later is final.
*Why you might:* events run on long timelines and 14 days may land before the
host has learned whether the pass earned its keep. *Why you might not:* the
one-per-customer rule needs tracking we do not have today.

Whichever rule is chosen, the following apply:

- **Outside the window, the purchase is final.** We will still make it right
  if the pass did not work — section 4.
- **We refund to the original payment method**, through Stripe. Stripe
  typically posts a refund within 5–10 business days; the timing after that is
  your card issuer's.
- **A refunded pass is revoked.** The event returns to the free tier; nothing
  you planned is deleted, and you can buy the pass again later.
  ⟶ `event_passes` server record; the app re-checks it, `passEntitlement.js`
- **One refund per pass.** A pass that has been refunded cannot be refunded a
  second time.

## 4. When we refund regardless of the window

If the pass did not do what it says — it never unlocked, it unlocked the wrong
event, you were charged twice, or the feature it covers was broken for you —
tell us and we will refund or fix it, whichever you prefer, regardless of
timing. A broken product is not a change of mind.

## 5. How to ask

Email `[OWNER: support email]` from the address on your account with the
Stripe receipt (or the last four digits of the card and the date). We answer
within two business days and, if the request falls inside the rule above, we
issue the refund in the same reply. You do not need to give a reason, though
if the pass fell short we would like to know how.

## 6. Chargebacks

If you dispute the charge with your card issuer instead of writing to us, we
will provide Stripe with the purchase record. We would much rather refund you
directly — it is faster for you and cheaper for us — so please write first.

## 7. Changes

If this policy changes, the new version applies to purchases made after its
effective date. The policy in force when you bought your pass is the one that
applies to it.
