-- Keep purchase receipts; a signed refund/dispute must survive out-of-order
-- checkout delivery and must never be undone by replaying that checkout.
alter table public.event_passes add column if not exists stripe_payment_intent text;
create index if not exists event_passes_payment_intent_idx
  on public.event_passes (stripe_payment_intent);

create table if not exists public.pass_payment_blocks (
  stripe_payment_intent text primary key,
  reason text not null check (reason in ('refunded', 'disputed')),
  stripe_event_id text,
  blocked_at timestamptz not null default now()
);
alter table public.pass_payment_blocks enable row level security;
-- No client policies: payment evidence is server-only, like event_passes.
