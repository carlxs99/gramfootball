create table public.pending_payouts (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  amount numeric not null check (amount > 0),
  reason text not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

grant all on public.pending_payouts to service_role;

alter table public.pending_payouts enable row level security;

create policy "No direct client access to pending_payouts"
  on public.pending_payouts for all using (false);

create index pending_payouts_unpaid_idx on public.pending_payouts (created_at) where paid_at is null;