-- ─── No Guesswork Events — event passes (the server-side entitlement) ────────
-- Canonical, integration-watched migration (see this folder's README). SHARED
-- table, written by the FastAPI service, so it lives here — never in
-- backend/migrations, which is frozen legacy.
--
-- ── WHY THIS TABLE EXISTS, AND WHAT DID NOT WORK WITHOUT IT ─────────────────
--
-- `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md` asked whether
-- the Stripe integration could sell the One-Event Pass and answered no: it is
-- "live, hardened and working — for a different job" (billing a host's CLIENT
-- for an event fee). The blocker it named is this table's absence, in the words
-- of the 2026-08-07 board ruling already sitting in `stripe_payments.py`:
--
--   "There is no server-side entitlement (feeSchedule is localStorage and the
--    webhook only logs), so an anonymous purchase produces a charge and
--    nothing the host can ever recover."
--
-- Concretely, before this table: clearing the browser lost the purchase,
-- editing localStorage granted it for free, and `src/lib/passGate.js` had no
-- server truth to consult even if billing were switched on. A charge could
-- succeed and nothing anywhere would record that anyone had bought anything.
--
-- ── ONE ROW PER EVENT, BECAUSE THAT IS THE RULING ───────────────────────────
-- The pass is one price, one SKU, three doors (brief-sharing beyond the first
-- vendor · a destination/multi-day event · any event after the first), and
-- `passGate.js:1-40` records the clause that decides this table's shape:
-- "Whichever door fired, one pass unlocks that whole event." So `event_id` is
-- the primary key — not (event, door) and not (user, event). Buying twice for
-- one event is not a thing that can be represented here, by design.
--
-- ── studio_id IS THE TENANT KEY, AND auth.uid() IS NOT ──────────────────────
-- `public.events.studio_id` decides access everywhere in this system;
-- `auth.uid()` is identity only. That distinction was not free — PR #86 closed
-- a hole where consulting per-user ownership first let a planner from another
-- studio claim an event by knowing its id (58 events in production had no
-- owner row on 2026-10-11). `purchased_by` below is therefore audit
-- attribution ONLY and must never appear in an access decision.
--
-- ── NO FOREIGN KEYS, DELIBERATELY: THIS ROW IS A RECEIPT ────────────────────
-- An FK to `events(id)` or `studios(id)` would have to choose a delete rule,
-- and every choice is wrong for a payment record. `on delete cascade` means
-- deleting an event or a studio silently destroys the evidence that somebody
-- paid us — the one row a refund conversation needs. A restricting FK instead
-- makes those deletions fail, breaking unrelated flows for the sake of this
-- table. So neither: the row outlives its event on purpose.
--
-- Integrity comes from the WRITE PATH, not from a constraint — the same
-- argument `013_vendor_brief_links.sql` makes. Only the service role writes
-- here, and it writes `studio_id` read out of `public.events` for the event
-- being purchased, after a membership check. A client never supplies it.
--
-- ── NO CLIENT ACCESS AT ALL ─────────────────────────────────────────────────
-- RLS is enabled with NO policy, so the anon/authenticated roles reach nothing
-- here; only the FastAPI service role (which bypasses RLS) reads and writes it,
-- exactly as with `vendor_brief_links` and `rsvp_submissions`. Reads go through
-- the gated API route.
--
-- The security property that matters: a client can obtain a pass only by
-- actually paying, because the only writer is a Stripe-signature-verified
-- webhook. There is no code path by which a browser can insert a row — which
-- is the whole of "editing localStorage grants it for free", closed.

create table if not exists public.event_passes (
  -- One pass unlocks the whole event (board ruling 2026-08-18/19).
  event_id          text        primary key,

  -- Tenant key. Read from public.events by the service role at purchase time.
  studio_id         uuid        not null,

  -- One price, one SKU. Stored so a later price or SKU change cannot rewrite
  -- history: what was sold is what is recorded.
  sku               text        not null,
  amount_cents      integer     not null,
  currency          text        not null default 'usd',

  -- IDEMPOTENCY. Stripe retries a webhook until it gets a 2xx, and the same
  -- checkout.session.completed can arrive several times. Unique on the session
  -- id makes a replay a no-op instead of a second grant or a crash.
  stripe_session_id text        not null unique,

  -- Audit attribution ONLY — never an access decision (see the tenant note).
  purchased_by      text,
  purchased_at      timestamptz not null default now()
);

-- The read path is "does this studio hold a pass for this event", so the
-- tenant key is the index worth having beyond the primary key.
create index if not exists event_passes_studio_idx
  on public.event_passes (studio_id);

alter table public.event_passes enable row level security;

-- Intentionally NO policies. See "NO CLIENT ACCESS AT ALL" above: enabling RLS
-- with no policy denies the anon and authenticated roles outright, leaving the
-- service role as the only reader and writer. Adding a client WRITE policy here
-- would re-open the exact hole this table was built to close.
