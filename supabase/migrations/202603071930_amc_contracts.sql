create table if not exists amc_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null check (plan_key in ('basic', 'standard', 'premium')),
  plan_name text not null,
  payment_cycle text not null check (payment_cycle in ('monthly', 'yearly')),
  price_monthly_aed numeric(10,2) not null,
  price_yearly_aed numeric(10,2) not null,
  contract_start_date date not null,
  contract_end_date date not null,
  contract_duration_months int not null default 12 check (contract_duration_months > 0),
  property_type text,
  bedrooms int,
  bathrooms int,
  ac_units int,
  property_size_sqft int,
  property_address text,
  contact_number text,
  contact_email text,
  contract_status text not null default 'active' check (contract_status in ('draft', 'active', 'cancelled', 'expired')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  terms_version text not null default 'v1',
  client_name text,
  client_signature text,
  accepted_at timestamptz,
  company_representative_name text not null default 'H.E.M Property Maintenance',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table amc_contracts add column if not exists client_id uuid;
alter table amc_contracts add column if not exists created_at timestamptz default now();
alter table amc_contracts add column if not exists contract_status text default 'active';
alter table amc_contracts add column if not exists payment_status text default 'paid';

create index if not exists idx_amc_contracts_client_created_at on amc_contracts(client_id, created_at desc);
create index if not exists idx_amc_contracts_status on amc_contracts(contract_status, payment_status);

create or replace function set_updated_at_amc_contracts()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_amc_contracts_updated_at on amc_contracts;
create trigger trg_amc_contracts_updated_at
before update on amc_contracts
for each row
execute function set_updated_at_amc_contracts();
