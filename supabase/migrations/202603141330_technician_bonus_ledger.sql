create table if not exists public.technician_bonus_ledger (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid unique references public.invoices(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  technician_id uuid not null references auth.users(id) on delete cascade,
  invoice_amount numeric(10,2) not null,
  bonus_percent numeric(5,2) not null,
  bonus_amount numeric(10,2) not null,
  currency text not null default 'aed',
  bonus_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_bonus_ledger_technician_date
  on public.technician_bonus_ledger (technician_id, bonus_date desc);

alter table if exists public.technician_bonus_ledger enable row level security;

drop policy if exists technician_bonus_ledger_select_policy on public.technician_bonus_ledger;
drop policy if exists technician_bonus_ledger_write_policy on public.technician_bonus_ledger;

create policy technician_bonus_ledger_select_policy
on public.technician_bonus_ledger
for select
using (
  technician_id = auth.uid()
  or public.has_ops_access()
);

create policy technician_bonus_ledger_write_policy
on public.technician_bonus_ledger
for all
using (public.has_ops_access())
with check (public.has_ops_access());

