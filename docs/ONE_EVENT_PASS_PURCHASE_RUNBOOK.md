# One-Event Pass — end-to-end purchase runbook

**Purpose: prove a $39 One-Event Pass can be bought and recorded.** Nothing short
of this proves it. Every other check in the stack confirms a *component*; this is
the only procedure that confirms the *chain*.

Written 2026-10-13, the day the chain was wired
(`HANDOFF.md` entries 52–58). Companion to
`docs/DEMO_ACCOUNT_RUNBOOK.md`, and the closing step of D-2 precondition #5.

---

## What this settles that nothing else can

Four things were still unproven when the code shipped, and **one test-mode
purchase settles all four at once**:

| Unproven | Why only a real purchase proves it |
|---|---|
| The webhook's **payload style** is Snapshot, not thin | The handler reads `event.data.object.metadata` directly. A thin payload returns **200** and grants nothing — no error anywhere |
| `checkout.session.completed` is actually **subscribed** | Nothing else fires `_grant_pass`. An unsubscribed endpoint is simply silent |
| `STRIPE_WEBHOOK_SECRET` matches the key creating sessions | `/api/stripe/status` reads green for *any* secret. Stripe sandboxes are isolated; a mismatched pair rejects every delivery with a 400 |
| Migration `017` created `public.event_passes` | If the table is absent the insert raises, the webhook 500s, and Stripe retries into nothing |

> **The green probe is not the proof.**
> `{"can_honour_purchases":true}` means a secret *exists*. It cannot see whether
> that secret is the *right* one, which payload style the destination sends, or
> whether the table exists. Treating it as proof is the mistake this runbook is
> written to prevent.

---

## Before you start

Run this first. If it isn't green, stop — the rest will fail in ways that look
like something else:

```bash
curl https://ngw-events-api.onrender.com/api/stripe/status
# want: {"configured":true,"webhook_verified":true,"can_honour_purchases":true}
```

Then confirm all four, because each produces a different and misleading failure:

- [ ] **Stripe destination exists** at `https://ngw-events-api.onrender.com/api/stripe/webhook`
- [ ] **Payload style = Snapshot** (NOT thin) — see the table above
- [ ] **Events = `checkout.session.completed`** (it is the only one that matters)
- [ ] **`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on Render come from the
      SAME Stripe context.** Sandboxes are isolated. Compare the secret key's
      last 4 in Render against *Developers → API keys* in the context where you
      created the destination.

**Use test mode.** `sk_test_` / `whsec_` from a test context, test card only. A
live key here charges a real card and the refund is your problem.

---

## 1. Point the local shell at the deployed backend

The Stripe routes and the entitlement table live on Render; only the UI runs
locally. Create **`.env.development.local` in the repo root** — `.gitignore`
already covers it (line 17), so nothing leaks:

```
REACT_APP_API_BASE_URL=https://ngw-events-api.onrender.com
REACT_APP_BILLING_LIVE=1
```

**Why that file and not a shell export:** `hostv2/vite.config.js` calls
`loadEnv(mode, path.resolve(__dirname, '..'), 'REACT_APP_')` — it reads the
repo-root `.env*` files with CRA-equivalent precedence and bakes
`process.env.REACT_APP_*` into the bundle. Env files are the documented path.

`REACT_APP_BILLING_LIVE=1` is what wakes the paywall. Without it every gate
answers "allowed" (`passGate.isBillingLive()`), the sheet shows "free while in
preview", and there is no button to press.

> **Delete this file when you're done.** It is the only thing standing between
> your desk and a live paywall, and it is invisible once you forget about it.

## 2. Start hostv2

```bash
cd hostv2 && npm run dev     # → http://localhost:5199
```

**Port 5199 is deliberate and it matters.** The backend validates
`success_url`/`cancel_url` against its origin allowlist, and
`ALLOWED_ORIGIN_REGEX` defaults to localhost on any port — so `:5199` passes.
If you serve the UI from somewhere that isn't localhost or a private LAN
address, `create-pass-session` returns **400 "success_url must point at this
application"**.

## 3. Sign in

**Required, not optional.** `create-pass-session` and `GET /api/stripe/pass`
both call `require_planner`, and both resolve the tenant key from your
membership. Unauthenticated, you get a **401** before anything else happens.

Do **not** reach for `X-Planner-Token` / `ALLOW_DEV_TOKEN` — it is ignored in
deployment unless `ALLOW_DEV_TOKEN=true` is also set, and `render.yaml` carries
a capitalised instruction never to set it. Sign in properly.

## 4. Create an event that actually owes the pass

The paywall only fires on a **stamped** verdict (the grandfather rule — the
verdict is written once, at creation, and never recomputed). So the event has to
qualify *when you make it*.

**Easiest deterministic setup:** make this your **second** user-created event and
mark it a **destination** at intake.

- Door 3 (`additional-event`) fires because a prior `cust-*` event exists
- Door 2 (`destination`) fires because `isDestination` was true at creation

Both doors means two independent routes to the pass sheet, which is what you
want when the thing under test is whether the sheet works at all.

> Marking an existing free event as destination **will not work.** By ruling,
> an event that began free stays free. If the sheet won't gate, this is why.

**It must also have synced.** The route resolves your studio from a
`public.events` row, so a local-only event gets **409 "not synced"** — which is
the honest answer, not a bug. Stay signed in and give sync a moment.

## 5. Reach the pass sheet

Either route proves a different gate:

| Route | Gate |
|---|---|
| Share a vendor brief on a **second** vendor | `briefAllowed` — door 1 |
| Open **Lodging**, **Getting around** or **Getting here** | `destinationLocked` — door 2 |

Both land on the sheet with a **"Get the pass — $39"** button.

**If you see "free while in preview" instead**, `canCharge` is false. It needs
all three:

```js
isStripeApiConfigured()                      // REACT_APP_API_BASE_URL set
&& process.env.REACT_APP_BILLING_LIVE === '1'
&& stripeCanHonourPurchases() !== false      // from /api/capabilities
```

The third is the new one — if the backend reports it cannot honour purchases,
the button is deliberately withheld. Check the probe in *Before you start*.

**If you see "This event has the pass"**, it already holds one. Use a fresh
event; buying twice is refused server-side with a 409 anyway.

## 6. Buy it

Tap the button → Stripe's hosted page. **Confirm it says $39.00** — the amount
is set server-side (`PASS_AMOUNT_CENTS`) and the browser no longer sends it, so
a different number means something is wrong upstream.

```
Card    4242 4242 4242 4242
Expiry  any future date
CVC     any 3 digits
ZIP     any
```

You return to `?pass_paid=1&event_id=…&session_id=…`.

**Expect a brief wait, and expect it to resolve itself.** Stripe redirects your
browser and POSTs the webhook *independently*. If the redirect wins, the return
handler's first read finds no row — so it re-asks on a bounded backoff
(`CLAIM_RETRY_DELAYS_MS = [2000, 4000]`, three asks total) before believing a
"no". That is why the toast may take a few seconds.

**Success looks like:** *"The One-Event Pass is yours for this event — every
vendor brief and the destination toolkit are unlocked."*

**"we haven't seen it land on this event yet"** means the webhook did not deliver
in ~6 seconds. The money moved; the record didn't. Go to step 7 — the delivery
log will say why.

## 7. Verify the record, not the toast

The toast reflects what the shell read. These three confirm the chain
independently. **Do all three** — each catches a failure the others miss.

**a) Stripe → your destination → event deliveries.** Expect one
`checkout.session.completed` with HTTP **200**.

| Delivery log shows | Meaning |
|---|---|
| **200** | The grant ran. Continue to (b) |
| **400** | Signature rejected — the `whsec_` is from a different context than the key. **The headline failure this runbook exists to catch** |
| **500** | Handler raised — most likely `public.event_passes` does not exist (migration 017 never applied) |
| **no delivery at all** | `checkout.session.completed` is not subscribed, or the endpoint URL is wrong |
| 200 but no unlock in (b)/(c) | **Thin payload.** No `metadata`, so no `studio_id`, so `_grant_pass` bailed silently |

**b) Ask the server directly.** Needs your bearer token — copy it from a
DevTools → Network request's `Authorization` header:

```bash
curl -H "Authorization: Bearer <token>" \
  "https://ngw-events-api.onrender.com/api/stripe/pass?event_id=cust-XXXX"
# want: {"event_id":"cust-XXXX","held":true,"sku":"one-event-pass",
#        "amount_cents":3900,"currency":"usd","purchased_at":"..."}
```

This is the **real proof**: the row exists, written by a signature-verified
webhook, and `amount_cents` is 3900 rather than whatever a browser might have
asked for.

**c) Prove recovery, which is the whole point.** The row has to outlive the
browser:

1. Clear site data for `localhost:5199` (or open a private window) and sign in again
2. Open the same event
3. The pass sheet reads **"This event has the pass"**, and the lodging / brief
   gates are open

**If this step fails but (b) passed**, the server has the entitlement and the
shell isn't reading it — a `refreshEventPass` wiring fault, not a payment one.

## 8. Clean up

- [ ] **Delete `.env.development.local`** (step 1's warning)
- [ ] Leave `REACT_APP_BILLING_LIVE` unset everywhere else — billing stays
      dormant until D-2's five preconditions are met, and this runbook closes
      only #5
- [ ] Stripe → *Test data deletion* if you want the sandbox clean
- [ ] **Record the result in `HANDOFF.md`** — including the delivery-log status
      code, because "it worked" without that number is the kind of claim this
      repo keeps having to re-measure

---

## Failure modes, ranked by how long they waste

| Symptom | Cause | Fix |
|---|---|---|
| Delivery log **400** | `whsec_` and `sk_` from different Stripe contexts | Re-copy the signing secret from the context that owns the secret key |
| Delivery **200**, no unlock | **Thin payload** on the destination | Switch it to **Snapshot** |
| Delivery log **500** | `public.event_passes` missing | Confirm migration 017 applied in Supabase |
| **No delivery** | Event not subscribed, or wrong URL | Subscribe `checkout.session.completed`; check the URL exactly |
| Sheet says "free while in preview" | `canCharge` false | All three conditions in step 5 |
| Sheet won't gate at all | Event stamped free at creation | New event — grandfather rule, by ruling |
| **409** "already has a pass" | Correct refusal | Use a fresh event |
| **409** "not synced" | No `public.events` row | Stay signed in; let sync finish |
| **403** | Not a member of the event's studio | Sign in as the owner |
| **401** | Not signed in | Step 3 |
| **400** "must point at this application" | UI served from a non-allowlisted origin | Use `localhost:5199` |
| Toast says payment unconfirmed | Webhook slower than 3 asks | Reopen the event; the next refresh picks it up |

## What is still not proven after this

A passing run proves the **test-mode** chain. It does not prove:

- **Live mode.** Different keys, a different destination, its own `whsec_`.
  D-2 #4, untouched by this.
- **That anyone will pay $39.** D-2 #5's other half: three non-founder hosts
  asked for money.
