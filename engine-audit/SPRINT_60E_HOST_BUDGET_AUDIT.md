# Sprint 60E — Host Budget Screen Audit (board)

**Date:** 2026-06-18
**Verdict:** **REWRITE.** The host Budget screen is the planner's financial-operations
cockpit wearing a host hat — a `DL-005` violation ("tuxedo on a contact form"). A DIY
host is shown an accounts-receivable ledger.

---

## Grounded findings (`Budget`, App.js:21469 — audited against source)
The component carries and renders pure planner finance, and **does not branch on
`recordKind`**, so the host gets all of it:
- **Stripe payment links per fee milestone** (`handleCreateStripeLink`) — collecting from a client.
- **Planner fee schedule + mark-fee-paid / unmark** confirm gates (`feeSchedule`, `pendingConfirm`).
- **Vendor cost rows · committed vs. uncontracted · vendor deposits / COI** — a DIY host has no vendors.
- **`client` / `setClient` / AR / SOT (source-of-truth) glossary** — a host has no client; they *are* the host.
- Props `onOpenVendor`, `onOpenConnections`, `promptDecision` — planner workflows.

The engine already knows better: `home_hosted` is `diy:true, vendors:false, deposit:false,
plannerFee:false`. The screen ignores its own truth.

## Board, by lens
- **Grandmother:** "Why a deposit, why 'Uncontracted'? I'm having a cookout — what will the food cost?" Fails on first glance.
- **Norman:** a host's mental model is *"how much will I spend,"* not *"what have I invoiced/collected/contracted."*
- **Rams / Tufte:** delete the ledger chrome — a host budget is a spending plan, not an AR system; the rows are trust-eroding noise.
- **Wroblewski:** mobile/casual — *"your party will run ~$X"* up top, host categories below, done.
- **Weiss / VenueOps:** fees/AR/vendor deposits/COI are the planner's back-office; a home gathering has no venue contract to deposit against.

---

## Rewrite spec — host **Spending Plan** (its own `recordKind`-gated shell)
1. **Hero — honest total estimate:** *"~$X–$Y for N guests."* The **Food line pulls the FoodPlan's
   regional-adjusted estimate** (the BLS factor, `playbookFoodPlan(event,{priceFactor})`) — labeled
   *"current {Region} prices · BLS {month}"* once surfaced.
2. **Host categories only:** Food · Drinks · Cake/dessert · Decor · Rentals & supplies · Extras.
   No vendor cost rows, no "uncontracted."
3. **"Am I on track?"** — planned vs. **what you've actually bought** (tie to FoodPlan shopping
   checkoffs / simple actuals). Not vendor-committed-vs-contracted.
4. **Optional — who's chipping in:** a simple potluck/split tally. Not client AR.

### Kill list for hosts
Planner fee + fee schedule + **Stripe collection links** · mark-fee-paid · vendor cost rows ·
committed/uncontracted · vendor deposits/COI · client/AR · SOT glossary · "getting paid."

### Keep (works for both personas)
Editable Total-Budget KPI (proportional rescale, exact-sum) · AI budget suggestion · the estimator ·
the category breakdown — these are persona-neutral spending tools.

---

## Doctrine
- **DL-005** — host needs its own shell, not the planner's relabeled. (This is fresh evidence.)
- **RA-4** — gate on `recordKind`: `event` → spending plan; `client` → full cockpit. One axis, surface reads it.
- **PP-3** — a self-host gets a checklist/spending-plan, never a sales/AR funnel.
- Composes with the progressive-disclosure rewrite and the BLS regional-pricing work (Food line = the estimate).

## Caveats / status
- **Render-first:** audited the code (strong, unambiguous); a capture of the rendered host Budget should
  confirm before a 10+ bless.
- **Implementation is `App.js`** — currently held by a parallel session; this is the **audit deliverable**,
  rewrite joins the queue behind a clean `App.js`.

**Bottom line:** the host Budget isn't "too much" by accident — it's the *wrong product* for the persona.
