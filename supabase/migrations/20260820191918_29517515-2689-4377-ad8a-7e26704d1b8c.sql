alter table public.payments
  add column if not exists refunded_amount numeric not null default 0,
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;

create index if not exists idx_payment_events_created_at on public.payment_events (created_at desc);
create index if not exists idx_payment_events_provider_payment on public.payment_events (provider_payment_id);
create index if not exists idx_payment_events_unprocessed on public.payment_events (processed_at) where processed_at is null;