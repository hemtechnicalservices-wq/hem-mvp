create extension if not exists pgcrypto;

-- Client master table (kept alongside existing client_profiles/client_addresses)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  property_type text check (property_type in ('apartment', 'villa', 'townhouse')),
  primary_address text,
  area text,
  city text,
  notes text,
  amc_status text not null default 'inactive' check (amc_status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  property_name text,
  property_type text,
  bedrooms int,
  bathrooms int,
  ac_units int,
  property_size_sqft int,
  address text,
  area text,
  parking_notes text,
  access_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists technicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  skill_type text,
  availability_status text not null default 'available' check (availability_status in ('available', 'on_job', 'offline')),
  service_areas text[],
  rating numeric(4,2),
  total_jobs_completed int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dispatchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  labor_cost numeric(10,2) not null default 0,
  materials_cost numeric(10,2) not null default 0,
  total_price numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists amc_plans (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null unique,
  monthly_price numeric(10,2) not null,
  yearly_price numeric(10,2) not null,
  visits_per_year text not null,
  emergency_callouts text not null,
  labor_discount_percent int not null,
  response_time_hours text not null,
  created_at timestamptz not null default now()
);

alter table amc_plans add column if not exists plan_name text;
alter table amc_plans add column if not exists name text;
alter table amc_plans add column if not exists monthly_price numeric(10,2);
alter table amc_plans add column if not exists yearly_price numeric(10,2);
alter table amc_plans add column if not exists duration_months int default 12;
alter table amc_plans add column if not exists visits_per_year text;
alter table amc_plans add column if not exists emergency_callouts text;
alter table amc_plans add column if not exists labor_discount_percent int;
alter table amc_plans add column if not exists response_time_hours text;
alter table amc_plans add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'amc_plans_plan_name_key'
  ) then
    alter table amc_plans add constraint amc_plans_plan_name_key unique (plan_name);
  end if;
end $$;

do $$
declare
  visits_type text;
  calls_type text;
begin
  select data_type into visits_type
  from information_schema.columns
  where table_schema='public' and table_name='amc_plans' and column_name='visits_per_year';

  select data_type into calls_type
  from information_schema.columns
  where table_schema='public' and table_name='amc_plans' and column_name='emergency_callouts';

  if visits_type = 'integer' or calls_type = 'integer' then
    insert into amc_plans (name, plan_name, monthly_price, yearly_price, duration_months, visits_per_year, emergency_callouts, labor_discount_percent, response_time_hours)
    values
      ('Basic', 'Basic', 299, 3200, 12, '4', '4', 20, '24'),
      ('Standard', 'Standard', 499, 5000, 12, '8', '8', 25, '12'),
      ('Premium', 'Premium', 799, 8500, 12, '9999', '9999', 30, '2-4')
    on conflict (plan_name) do update
    set
      name = excluded.name,
      monthly_price = excluded.monthly_price,
      yearly_price = excluded.yearly_price,
      duration_months = excluded.duration_months,
      visits_per_year = excluded.visits_per_year,
      emergency_callouts = excluded.emergency_callouts,
      labor_discount_percent = excluded.labor_discount_percent,
      response_time_hours = excluded.response_time_hours;
  else
    insert into amc_plans (name, plan_name, monthly_price, yearly_price, duration_months, visits_per_year, emergency_callouts, labor_discount_percent, response_time_hours)
    values
      ('Basic', 'Basic', 299, 3200, 12, '4', '4', 20, '24'),
      ('Standard', 'Standard', 499, 5000, 12, '8', '8', 25, '12'),
      ('Premium', 'Premium', 799, 8500, 12, 'Unlimited', 'Unlimited', 30, '2-4')
    on conflict (plan_name) do update
    set
      name = excluded.name,
      monthly_price = excluded.monthly_price,
      yearly_price = excluded.yearly_price,
      duration_months = excluded.duration_months,
      visits_per_year = excluded.visits_per_year,
      emergency_callouts = excluded.emergency_callouts,
      labor_discount_percent = excluded.labor_discount_percent,
      response_time_hours = excluded.response_time_hours;
  end if;
end $$;

-- Add missing spec fields into existing core tables without breaking existing code.
alter table jobs add column if not exists property_id uuid references properties(id) on delete set null;
alter table jobs add column if not exists service_type text;
alter table jobs add column if not exists issue_type text;
alter table jobs add column if not exists urgency text;
alter table jobs add column if not exists technician_id uuid references auth.users(id) on delete set null;
alter table jobs add column if not exists dispatcher_id uuid references auth.users(id) on delete set null;
alter table jobs add column if not exists start_time timestamptz;
alter table jobs add column if not exists completion_time timestamptz;
alter table jobs add column if not exists address text;

alter table invoices add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table invoices add column if not exists payment_method text;
alter table invoices add column if not exists issued_at timestamptz;
alter table invoices add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='jobs' and constraint_name='jobs_urgency_check'
  ) then
    alter table jobs add constraint jobs_urgency_check check (urgency is null or urgency in ('normal', 'urgent', 'emergency'));
  end if;
end $$;

create index if not exists idx_properties_client_id on properties(client_id);
create index if not exists idx_quotes_job_id on quotes(job_id);
create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);
create index if not exists idx_jobs_status_urgency on jobs(status, urgency);
