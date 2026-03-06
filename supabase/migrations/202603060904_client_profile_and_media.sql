create extension if not exists pgcrypto;

create table if not exists client_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  amc_plan_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_media_job_id on job_media(job_id);
create index if not exists idx_job_media_client_id on job_media(client_id);

create or replace function set_updated_at_client_profiles()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_client_profiles_updated_at on client_profiles;
create trigger trg_client_profiles_updated_at
before update on client_profiles
for each row
execute function set_updated_at_client_profiles();
