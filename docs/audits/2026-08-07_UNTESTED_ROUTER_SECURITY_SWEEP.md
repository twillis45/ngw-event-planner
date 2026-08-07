# Untested backend routers — security sweep, 2026-08-07

**Why this sweep.** 8 of 16 routers under `backend/app/routers/` shipped with no
test file at all. Untested and unaudited turned out to correlate: the two most
security-sensitive of them each carried a live hole.

| Router | LOC | Test file before | Now |
|---|---|---|---|
| `communication` | 584 | none | still none |
| `kroger` | 231 | none | still none |
| `stripe_payments` | 181 | none | **`test_stripe_webhook_signature.py`** |
| `food_prices` | 130 | none | still none |
| `kcr` | 127 | none | still none |
| `kas` | 120 | none | still none |
| `weather` | 109 | none | still none |
| `instacart` | 93 | none | still none |
| `webhooks` | 83 | none | **`test_webhook_relay_ssrf.py`** |

---

## FIXED — `POST /api/webhooks/relay` was an unauthenticated SSRF

Took an arbitrary `url` from an **unauthenticated** body and POSTed to it from
inside the server, gated only by `url.startswith("http")`. Accepted
`http://169.254.169.254/latest/meta-data/...` (cloud credentials),
`http://localhost:5432`, and any private-range address. Mounted and live at
`main.py:217`.

The guard already existed — `app/safe_fetch.py`, written for this class in the
July sprint and applied at three other call sites. This router was never wired
to it. Now: `require_planner` + a new `validate_public_url` (https only, no
embedded credentials, every resolved address must be global unicast),
`follow_redirects=False`. Caller updated so the fix did not ship as a 401.

## FIXED — a missing header skipped Stripe signature verification

`if STRIPE_WEBHOOK_SECRET and stripe_signature:` — a caller who simply **omitted
the `stripe-signature` header** fell into the `else` branch, commented "Dev mode
— no signature verification", which `json.loads`'d the body and trusted it. That
happened even where the secret WAS configured. Now: secret configured =>
signature required; the unverified path survives only where no secret exists at
all, and logs a warning when taken.

---

## FOUND, NOT FIXED — both are product decisions, not bugs

### 1. `POST /api/stripe/create-checkout-session` is unauthenticated

Anyone who can reach the API can create real Stripe Checkout sessions on the
account, with an arbitrary `amount_cents` and `label`.

**Why I did not just add `require_planner`.** Despite the name it means
*signed-in* (`auth.py:84` says so explicitly). If any host uses the fee flow
without a Supabase session — alpha, demo, or a guest path — adding it silently
breaks payments. That is a product call about who may raise a charge, not a
defect with one right answer. The fix itself is mechanical once the call is
made: add the dependency and send `plannerAuthHeaders()` from
`src/lib/stripeApi.js`, exactly as `webhookService.js` now does.

### 2. `success_url` / `cancel_url` are accepted unvalidated

The frontend derives them from `window.location.origin`, but the server accepts
whatever it is sent. A caller can therefore produce a **genuine Stripe checkout
page on this account** that redirects to any site on completion — a credible
phishing asset, because the payment page really is Stripe's and really is yours.

Validating them needs an allowlist of app origins, and the origin legitimately
varies (Pages, localhost, any custom domain). An env-backed list would fail
closed and turn payments off wherever it was unset — the same trap that made a
host allowlist wrong for the webhook relay. Needs a deliberate decision about
the canonical origin list before anything is enforced.

### 3. `GET /api/stripe/verify-session` is unauthenticated

Returns `amount_total`, `currency` and `fee_id` for any `session_id`. Session
ids are long and unguessable, so this is low severity — recorded for
completeness rather than as a call to act.

---

## Still unswept

`communication` (584 LOC) is the largest untested router and was not read in
this pass. `kroger` / `kcr` / `kas` / `instacart` / `food_prices` / `weather` are
outbound API wrappers — the same class as the relay, so **each should be checked
for whether it fetches a caller-supplied URL**, which is the pattern that made
`webhooks` exploitable.
