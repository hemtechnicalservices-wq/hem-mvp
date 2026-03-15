create extension if not exists pgcrypto;

create table if not exists amc_contracts (
  id uuid primary key default gen_random_uuid()
);

alter table amc_contracts add column if not exists client_id uuid;
alter table amc_contracts add column if not exists plan_key text;
alter table amc_contracts add column if not exists plan_name text;
alter table amc_contracts add column if not exists payment_cycle text;
alter table amc_contracts add column if not exists price_monthly_aed numeric(10,2);
alter table amc_contracts add column if not exists price_yearly_aed numeric(10,2);
alter table amc_contracts add column if not exists contract_start_date date;
alter table amc_contracts add column if not exists contract_end_date date;
alter table amc_contracts add column if not exists contract_duration_months int default 12;
alter table amc_contracts add column if not exists property_type text;
alter table amc_contracts add column if not exists bedrooms int;
alter table amc_contracts add column if not exists bathrooms int;
alter table amc_contracts add column if not exists ac_units int;
alter table amc_contracts add column if not exists property_size_sqft int;
alter table amc_contracts add column if not exists property_address text;
alter table amc_contracts add column if not exists contact_number text;
alter table amc_contracts add column if not exists contact_email text;
alter table amc_contracts add column if not exists contract_status text default 'active';
alter table amc_contracts add column if not exists payment_status text default 'paid';
alter table amc_contracts add column if not exists terms_version text default 'v1';
alter table amc_contracts add column if not exists client_name text;
alter table amc_contracts add column if not exists client_signature text;
alter table amc_contracts add column if not exists accepted_at timestamptz;
alter table amc_contracts add column if not exists company_representative_name text default 'H.E.M Property Maintenance';
alter table amc_contracts add column if not exists metadata jsonb default '{}'::jsonb;
alter table amc_contracts add column if not exists created_at timestamptz default now();
alter table amc_contracts add column if not exists updated_at timestamptz default now();

update amc_contracts
set
  contract_duration_months = coalesce(contract_duration_months, 12),
  contract_status = coalesce(contract_status, 'active'),
  payment_status = coalesce(payment_status, 'paid'),
  terms_version = coalesce(terms_version, 'v1'),
  company_representative_name = coalesce(company_representative_name, 'H.E.M Property Maintenance'),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_client_id_fkey'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_client_id_fkey
      foreign key (client_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_plan_key_check'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_plan_key_check check (plan_key in ('basic', 'standard', 'premium'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_payment_cycle_check'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_payment_cycle_check check (payment_cycle in ('monthly', 'yearly'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_contract_status_check'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_contract_status_check check (contract_status in ('draft', 'active', 'cancelled', 'expired'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_payment_status_check'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_payment_status_check check (payment_status in ('pending', 'paid', 'failed', 'refunded'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='amc_contracts' and constraint_name='amc_contracts_contract_duration_months_check'
  ) then
    alter table amc_contracts
      add constraint amc_contracts_contract_duration_months_check check (contract_duration_months > 0);
  end if;
end $$;

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
