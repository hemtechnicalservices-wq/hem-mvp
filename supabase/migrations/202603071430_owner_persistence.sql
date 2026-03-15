create extension if not exists pgcrypto;

create table if not exists owner_settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text,
  company_phone text,
  company_email text,
  business_hours text,
  service_areas text,
  inspection_fee numeric,
  minimum_job_charge numeric,
  emergency_surcharge numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists owner_services (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  service_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(owner_user_id, service_name)
);

create table if not exists owner_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_owner_services_owner_user_id on owner_services(owner_user_id);

create or replace function set_updated_at_owner_tables()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_owner_settings_updated_at on owner_settings;
create trigger trg_owner_settings_updated_at
before update on owner_settings
for each row
execute function set_updated_at_owner_tables();

drop trigger if exists trg_owner_profiles_updated_at on owner_profiles;
create trigger trg_owner_profiles_updated_at
before update on owner_profiles
for each row
execute function set_updated_at_owner_tables();
