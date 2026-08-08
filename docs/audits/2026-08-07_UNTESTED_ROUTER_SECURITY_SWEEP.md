# Untested backend routers — security sweep, 2026-08-07

**Why this sweep.** 8 of 16 routers under `backend/app/routers/` shipped with no
test file at all. Untested and unaudited turned out to correlate: the two most
security-sensitive of them each carried a live hole.

| Router | LOC | Test file before | Now |
|---|---|---|---|
| `communication` | 584 | none | auth gated + **`test_communication_contract.py`** (12) |
| `kroger` | 231 | none | auth coverage only |
| `stripe_payments` | 181 | none | **`test_stripe_webhook_signature.py`** |
| `food_prices` | 130 | none | **`test_food_price_factor.py`** (14) |
| `kcr` | 127 | none | **`test_admin_kcr_kas_helpers.py`** (16, shared) |
| `kas` | 120 | none | **`test_admin_kcr_kas_helpers.py`** (16, shared) |
| `weather` | 109 | none | **`test_weather_daily.py`** (10) |
| `instacart` | 93 | none | auth coverage only |
| `webhooks` | 83 | none | **`test_webhook_relay_ssrf.py`** (20) |

Backend suite over this sweep: **238 -> 308 tests.**

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

## RULED AND FIXED — the board settled both Stripe questions

Convened 2026-08-07 (backend/security seat, a planner who invoices, Grandmother
override). Both rulings were unanimous, and one **corrected me**.

### 1. Minting a charge was anonymous — NOW SIGNED-IN ONLY

The argument I had not made: the anonymous path **cannot deliver the product**.
There is no server-side entitlement — `feeSchedule` is localStorage and the
webhook only logs, with a `# Future:` where the write would go — so an anonymous
purchase produces a Stripe charge and nothing the host can ever recover.

Nothing in production breaks, because nothing in production could reach it
through the product: the CRA sits behind `AuthGate`, and
`pages-from-source.yml` forces the demo profile to ship an empty
`REACT_APP_API_BASE_URL`. The exposure was curl. Auth is checked BEFORE the
`_configured()` 503, so an anonymous caller cannot learn whether this deployment
has Stripe wired. Added with it: a $100k per-charge ceiling (sized to clear a
real wedding balance, per the planner seat) and a bounded single-line `label`,
which renders as `product_data.name` on a Stripe page carrying this account's
business name.

**Still owed before billing goes live** (`REACT_APP_BILLING_LIVE=1`): the
Grandmother seat's sequencing ruling. hostv2's `buyPass` must ask for the email
INSIDE the purchase — "your email first, that's how the pass stays yours on
every device" — reusing the `sendMagicLink` / `authSent` state already in scope.
A 401 surfacing as "Checkout isn't available right now" must never be how a
signed-out host learns they need an account. Not done here: it is a UI flow
change in `HostShellV2.jsx` while a second session is active in that file, and
billing is gated off today.

### 2. The redirect targets — NOW VALIDATED. My stated blocker was wrong.

I had deferred this believing an env-backed allowlist would fail closed wherever
unset. **False for this variable.** `config.py` gives `ALLOWED_ORIGINS` a real
non-empty default (the production Pages origin plus localhost) and
`ALLOWED_ORIGIN_REGEX` a second covering localhost/127.0.0.1/RFC1918 on any
port. The canonical list I was waiting to decide on already existed and already
gates every browser caller — so the check cannot be wrong in a way CORS is not
already wrong.

`app/app_origins.py` (a module, because `webhooks.py` proved what happens when a
guard exists and one router is not wired to it). Exact origin equality, never
`startswith` — `https://twillis45.github.io.evil.com` defeats it. `re.fullmatch`,
never `match` — the LAN regex is unanchored at the end, so `match` accepts
`http://localhost.evil.com`. And `"*"` is not honoured: it is defensible for
CORS, where the boundary is the JWT, but as a redirect allowlist it would make
the validation a silent no-op that still looks installed.

---

## PREVIOUSLY FOUND, NOT FIXED — superseded above

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
ids are long and unguessable, so this stays low severity and the server-side
requirement was NOT added. The client now sends the headers anyway — one line,
and it means nobody has to revisit the decision.

### 4. NEW, from the board's sweep: a CTA that calls an endpoint that does not exist

`src/lib/stripeApi.js:63` POSTs to `/api/stripe/create-subscription-session`.
That route does not exist in `backend/` — verified. `src/App.js:19108` calls it
from the plan-upgrade flow, so on a `live` release that path 404s. The file is
frozen donor code, so this is recorded rather than fixed, but it is a
CTA-truthfulness defect (UX_07), not merely a dead route.

---

## FIXED — an anonymous write with no foreign key behind it

`POST /api/events/{event_id}/communication/channels/ensure` required nothing.
`_ensure_channels` inserts into `event_channels` for whatever `event_id` string
it is handed, and `migrations/0001_communication.sql` declares that column
`text not null` with **no foreign key to events** — so any caller could create
two rows per arbitrary string, without limit and without owning anything.

Safe to gate: its only caller is `commApi.ensureChannels`, and commApi's `req()`
already attaches auth headers to every request, which is how the eight
already-gated routes in the same file work. Now `require_planner` +
`_assert_event_access`.

The `GET /channels` beside it is deliberately left alone. `list_messages` in the
same module requires a planner ONLY for `INTERNAL_TEAM`, which shows the module
intends unauthenticated reads for the client portal — quietly gating a read
could break it. Recorded above, not changed.

## The outbound-wrapper follow-up: clean

The previous version of this document said each outbound wrapper should be
checked for the caller-supplied-URL pattern that made the relay exploitable.
Done. `kroger` (3 calls), `instacart` (1), `food_prices` (1) and `weather` (2)
all build their URL from an env-configured base constant — `KROGER_API_BASE`,
`INSTACART_API_BASE`, `_BLS_URL`, `GEO_URL`/`FORECAST_URL`. None accepts a
destination from the caller. `webhooks` was the only one.

## A false reading the sweep produced, worth knowing

The first auth scanner looked 30 lines ahead of each `@router` decorator for
`require_planner`. Routes therefore inherited the auth of the route BELOW them,
and `/channels/ensure` reported as gated when it was not. The AST version reads
each function's own signature and body and nothing else, and it is now committed
as `tests/test_route_auth_coverage.py` — an allowlist of intent, where every
public route must be named with a reason, so making one public is a deliberate
edit rather than an omission.

## Still unswept

Only `kroger` and `instacart` — two thin HTTP wrappers that shape a request
around an upstream API and whose URLs are already proven to come from env
constants. Lower value than anything covered above, but not zero.

Backend suite across the whole sweep: **238 -> 320 tests.**
