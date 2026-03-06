-- ...existing code...
create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists service_issues (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories(id) on delete cascade,
  name text not null
);

create table if not exists client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  label text,
  address_line text not null,
  property_type text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references service_categories(id),
  issue_id uuid references service_issues(id),
  description text,
  address_id uuid references client_addresses(id),
  preferred_at timestamptz,
  status text not null default 'new',
  assigned_technician_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'aed',
  status text not null default 'sent',
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);