-- ── SERVER-SIDE ENTITLEMENT (2026-10-06) ───────────────────────────────────
--
-- The gap the 2026-10-03 Stripe audit named, in the words of the 2026-08-07
-- board ruling already in stripe_payments.py:
--
--   "There is no server-side entitlement (feeSchedule is localStorage and the
--   webhook only logs), so an anonymous purchase produces a charge and
--   nothing the host can ever recover."
--
-- Stripe has been configured in production the whole time. What was missing
-- was anywhere to WRITE the fact that somebody bought something. Without this
-- table a buyer could be charged and clearing their browser would erase the
-- purchase -- or editing localStorage would grant it for free.
--
-- THE PRIMARY KEY IS THE STRIPE SESSION ID, AND THAT IS THE DESIGN.
-- Stripe retries webhooks until it gets a 2xx, so the same
-- checkout.session.completed arrives more than once as a matter of course. An
-- id column plus a "have I seen this?" flag would make idempotency something
-- the code has to remember; making the receipt the key makes a replay a
-- no-op by construction. `on conflict do nothing` is the whole mechanism.
--
-- A REFUND IS A STATUS, NOT A DELETE. The money moved either way, and a row
-- that vanishes cannot answer "did this person ever pay?" -- which is the
-- question support will actually ask.
--
-- Writes go through the service-role backend only (passes.py); RLS grants no
-- client write, same discipline as kcr (0007) and kas_stores (0008).

create table if not exists passes (
  -- the Stripe Checkout Session id; the receipt IS the identity
  id            text primary key,
  user_id       text not null,          -- supabase user id (auth.require_planner)
  event_id      text,                   -- the One-Event Pass is scoped to one event
  status        text not null default 'paid',   -- paid | refunded
  amount_cents  integer,
  currency      text not null default 'usd',
  -- what Stripe called it, kept verbatim so support can match a receipt
  product_label text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The read path is "does THIS user hold a pass for THIS event?" on every
-- gated surface, so it gets the index rather than the scan.
create index if not exists passes_user_event_idx on passes (user_id, event_id);
create index if not exists passes_user_idx       on passes (user_id);

alter table passes enable row level security;

-- No client policy at all: the backend holds the service role and every read
-- goes through an authenticated endpoint that scopes to the caller. A client
-- that could read this table directly could read who else has paid.
