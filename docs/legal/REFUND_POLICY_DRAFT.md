# Refund Policy — the One-Event Pass

> **DRAFT 2026-11-02 — not yet reviewed, not yet in effect, not yet linked from
> the product.** The refund rule in section 3 was chosen by the owner on
> 11/12/2026. `[OWNER: …]` items are the owner's to fill.

**Effective:** `[OWNER: effective date]`
**Seller:** No Guesswork Systems LLC, `[OWNER: mailing address]`
**Questions and requests:** events@noguessworksystems.com ⟶ `src/lib/brand.js:145` (owner decision 11/11/2026) ⟵

---

## 1. What you are buying

The **One-Event Pass** is a single purchase of **$39 (USD)** that unlocks the
paid parts of planning for **one event**: sharing vendor briefs beyond the
first one, destination and multi-day planning, and the features the app names
as covered by the pass when it asks. ⟶ `src/lib/passGate.js:9, 164-170` ⟵

- It is **one event, one time.** It is not a subscription. Nothing renews,
  nothing is charged again, and you will never be billed without going through
  checkout yourself. ⟶ `routers/stripe_payments.py` (`mode="payment"`) ⟵
- The price is set by us at checkout and is not editable by the app or by you.
  ⟶ `stripe_payments.py` (`PASS_AMOUNT_CENTS` is server-set) ⟵
- Planning itself stays free. You can plan an event end to end, run the day,
  and send one vendor brief without buying anything. The pass is for the parts
  that go beyond that, and the app tells you which ones before it asks.
- **Vendors are never charged.** No fee is taken from any vendor, caterer, or
  venue, and none ever will be. ⟶ standing commitment: `src/lib/passGate.js:43`
  ("no vendor-side fees while the no-vendor-fees sentence ships"),
  `docs/audits/2026-08-19_MODEL_D_VS_LEADERS.md:70` ⟵

Payment is taken on Stripe's hosted checkout page. We do not see or store your
card details. Your receipt comes from Stripe.

## 2. When the pass takes effect

Immediately after a successful payment. If you return from checkout and the
event still shows as locked, wait a few seconds — the confirmation from Stripe
can arrive after you do — and reload. If it is still locked after a minute,
email us with your Stripe receipt and we will fix it the same day.
⟶ `refreshEventPass` retry ladder, `passEntitlement.js` ⟵

## 3. Refunds — the rule

**Refunds.** You may get a full refund within **14 days** of buying the pass,
with no questions asked, **as long as no new vendor brief has been sent from
that event since you bought it.** Once a new brief has been sent, the pass has
done its job and the purchase is final. If the pass did not work for you,
section 4 applies at any time.
⟶ Owner ruling 11/12/2026, on the review board's 4–2 recommendation of
11/11/2026 (dissent: two seats for 14 days unconditional; one asked for 30
days). Checkable on the server: a brief link created after the purchase
(`vendor_brief_links.created_at` against `event_passes.purchased_at`;
`docs/RUNBOOK.md` → "Refund check"). Destination/multi-day use is not recorded
on the server, so the rule does not depend on it. The line shown before
checkout is `src/lib/refundRule.js`. ⟵

These also apply:

- **Outside the window, the purchase is final.** We will still make it right
  if the pass did not work — section 4.
- **We refund to the original payment method**, through Stripe. Stripe
  typically posts a refund within 5–10 business days; the timing after that is
  your card issuer's.
- **A full refund revokes the pass.** The event returns to the free tier;
  nothing you planned is deleted. ⟶ `stripe_payments.py:583-591` (only once
  Stripe marks the charge fully refunded), `:674-710` (`pass_payment_blocks`,
  `supabase/migrations/020_pass_payment_revocations.sql`); the app re-checks
  the server record, `passEntitlement.js` ⟵
- **A partial refund keeps the pass.** If we refund part of the price, the
  event keeps everything the pass unlocked. ⟶ `stripe_payments.py:588-591`
  (owner ruling, November 5) ⟵
- **A refunded event cannot buy the pass again at checkout.** Checkout refuses
  any event with a recorded purchase and points you to us instead; write to
  events@noguessworksystems.com if you want the pass back on that event.
  ⟶ `stripe_payments.py:320-328` ⟵
- **One refund per pass.** A pass that has been refunded cannot be refunded a
  second time.
- **A refund turns the pass off for anything new. Vendor briefs you already
  sent keep working.** ⟶ the public brief page never checks the pass
  (`vendor_brief.py`), by design: a vendor mid-conversation is never cut off ⟵

> **COUNSEL — the chosen rule against the code** (owner ruling 11/12/2026):
> - **Partial refunds keep the pass,** and are not offered in this text. The
>   board recommended keeping them as a discretionary goodwill remedy for a
>   host who used the pass. Confirm leaving them out of the public policy.
> - **No repurchase after a full refund** on the same event
>   (`stripe_payments.py:320-328`); support handles "refund, then come back"
>   by hand. Confirm the wording above.
> - **A dispute switches the pass off before it is decided**, and a won
>   dispute does not restore it. Is that fair and adequately disclosed in §6?
> - **"One refund per pass"** is enforced by Stripe (a fully refunded charge
>   cannot be refunded again), not by our code — confirm the sentence needs no
>   more.
> - **Briefs sent through the old self-contained link** (before 11/11) are not
>   recorded, so the refund check cannot see them; support refunds when unsure.

## 4. When we refund regardless of the window

If the pass did not do what it says — it never unlocked, it unlocked the wrong
event, you were charged twice, or the feature it covers was broken for you —
tell us and we will refund or fix it, whichever you prefer, regardless of
timing. A broken product is not a change of mind.

## 5. How to ask

Email events@noguessworksystems.com from the address on your account with the
Stripe receipt (or the last four digits of the card and the date). We answer
within two business days and, if the request falls inside the rule above, we
issue the refund in the same reply. You do not need to give a reason, though
if the pass fell short we would like to know how.

## 6. Chargebacks

If you dispute the charge with your card issuer instead of writing to us, the
pass is switched off as soon as Stripe tells us about the dispute — before the
dispute is decided — and the event returns to the free tier; nothing you
planned is deleted. If the dispute is later decided in our favor, the pass does
not come back on its own; write to us. ⟶ `stripe_payments.py:570-574`,
`:661-665` ("Disputes suspend access until reviewed; a later won-dispute
notification does not silently restore it"). ⟵ We will provide Stripe with the
purchase record. We would much rather refund you
directly — it is faster for you and cheaper for us — so please write first.

## 7. Changes

If this policy changes, the new version applies to purchases made after its
effective date. The policy in force when you bought your pass is the one that
applies to it.
