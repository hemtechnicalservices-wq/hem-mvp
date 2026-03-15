-- Core RLS policies for H.E.M platform
-- Safe/idempotent: drops old named policies and recreates them.

create extension if not exists pgcrypto;

-- =========================
-- Helper role functions
-- =========================
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'owner'
  );
$$;

create or replace function public.is_dispatcher()
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('dispatcher', 'dispacher')
    )
    or exists (
      select 1
      from public.dispatchers d
      where d.user_id = auth.uid()
        and coalesce(d.active_status, true)
    );
$$;

create or replace function public.is_technician()
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'technician'
    )
    or exists (
      select 1
      from public.technicians t
      where t.user_id = auth.uid()
    );
$$;

create or replace function public.has_ops_access()
returns boolean
language sql
stable
as $$
  select public.is_owner() or public.is_dispatcher();
$$;

create or replace function public.job_user_can_access(job_uuid uuid)
returns boolean
language sql
stable
as $$
  select
    public.has_ops_access()
    or exists (
      select 1
      from public.jobs j
      where j.id = job_uuid
        and (
          j.client_id = auth.uid()
          or j.technician_id = auth.uid()
          or j.assigned_technician_id = auth.uid()
        )
    );
$$;

-- =========================
-- Enable RLS
-- =========================
alter table if exists public.profiles enable row level security;
alter table if exists public.clients enable row level security;
alter table if exists public.client_profiles enable row level security;
alter table if exists public.client_addresses enable row level security;
alter table if exists public.properties enable row level security;
alter table if exists public.jobs enable row level security;
alter table if exists public.quotes enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.technicians enable row level security;
alter table if exists public.dispatchers enable row level security;
alter table if exists public.conversations enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.call_logs enable row level security;
alter table if exists public.communication_permissions enable row level security;
alter table if exists public.amc_plans enable row level security;
alter table if exists public.amc_contracts enable row level security;

-- =========================
-- profiles
-- =========================
drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_insert_policy on public.profiles;

create policy profiles_select_policy
on public.profiles
for select
using (id = auth.uid() or public.has_ops_access());

create policy profiles_update_policy
on public.profiles
for update
using (id = auth.uid() or public.has_ops_access())
with check (id = auth.uid() or public.has_ops_access());

create policy profiles_insert_policy
on public.profiles
for insert
with check (id = auth.uid() or public.has_ops_access());

-- =========================
-- clients, client_profiles, addresses, properties
-- =========================
drop policy if exists clients_select_policy on public.clients;
drop policy if exists clients_write_policy on public.clients;

create policy clients_select_policy
on public.clients
for select
using (user_id = auth.uid() or public.has_ops_access());

create policy clients_write_policy
on public.clients
for all
using (user_id = auth.uid() or public.has_ops_access())
with check (user_id = auth.uid() or public.has_ops_access());

drop policy if exists client_profiles_select_policy on public.client_profiles;
drop policy if exists client_profiles_write_policy on public.client_profiles;

create policy client_profiles_select_policy
on public.client_profiles
for select
using (client_id = auth.uid() or public.has_ops_access());

create policy client_profiles_write_policy
on public.client_profiles
for all
using (client_id = auth.uid() or public.has_ops_access())
with check (client_id = auth.uid() or public.has_ops_access());

drop policy if exists client_addresses_select_policy on public.client_addresses;
drop policy if exists client_addresses_write_policy on public.client_addresses;

create policy client_addresses_select_policy
on public.client_addresses
for select
using (client_id = auth.uid() or public.has_ops_access() or public.is_technician());

create policy client_addresses_write_policy
on public.client_addresses
for all
using (client_id = auth.uid() or public.has_ops_access())
with check (client_id = auth.uid() or public.has_ops_access());

drop policy if exists properties_select_policy on public.properties;
drop policy if exists properties_write_policy on public.properties;

create policy properties_select_policy
on public.properties
for select
using (client_id = auth.uid() or public.has_ops_access() or public.is_technician());

create policy properties_write_policy
on public.properties
for all
using (client_id = auth.uid() or public.has_ops_access())
with check (client_id = auth.uid() or public.has_ops_access());

-- =========================
-- jobs
-- =========================
drop policy if exists jobs_select_policy on public.jobs;
drop policy if exists jobs_client_insert_policy on public.jobs;
drop policy if exists jobs_client_update_policy on public.jobs;
drop policy if exists jobs_ops_update_policy on public.jobs;
drop policy if exists jobs_tech_update_policy on public.jobs;

create policy jobs_select_policy
on public.jobs
for select
using (
  client_id = auth.uid()
  or technician_id = auth.uid()
  or assigned_technician_id = auth.uid()
  or public.has_ops_access()
);

create policy jobs_client_insert_policy
on public.jobs
for insert
with check (client_id = auth.uid() or public.has_ops_access());

create policy jobs_client_update_policy
on public.jobs
for update
using (client_id = auth.uid())
with check (client_id = auth.uid());

create policy jobs_ops_update_policy
on public.jobs
for update
using (public.has_ops_access())
with check (public.has_ops_access());

create policy jobs_tech_update_policy
on public.jobs
for update
using (technician_id = auth.uid() or assigned_technician_id = auth.uid())
with check (technician_id = auth.uid() or assigned_technician_id = auth.uid());

-- =========================
-- quotes
-- =========================
drop policy if exists quotes_select_policy on public.quotes;
drop policy if exists quotes_ops_write_policy on public.quotes;
drop policy if exists quotes_client_update_policy on public.quotes;

create policy quotes_select_policy
on public.quotes
for select
using (
  public.has_ops_access()
  or exists (
    select 1 from public.jobs j
    where j.id = quotes.job_id
      and j.client_id = auth.uid()
  )
  or exists (
    select 1 from public.jobs j
    where j.id = quotes.job_id
      and (j.technician_id = auth.uid() or j.assigned_technician_id = auth.uid())
  )
);

create policy quotes_ops_write_policy
on public.quotes
for all
using (public.has_ops_access())
with check (public.has_ops_access());

create policy quotes_client_update_policy
on public.quotes
for update
using (
  exists (
    select 1 from public.jobs j
    where j.id = quotes.job_id
      and j.client_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.jobs j
    where j.id = quotes.job_id
      and j.client_id = auth.uid()
  )
);

-- =========================
-- invoices
-- =========================
drop policy if exists invoices_select_policy on public.invoices;
drop policy if exists invoices_ops_write_policy on public.invoices;
drop policy if exists invoices_client_update_policy on public.invoices;

create policy invoices_select_policy
on public.invoices
for select
using (
  client_id = auth.uid()
  or public.has_ops_access()
  or exists (
    select 1 from public.jobs j
    where j.id = invoices.job_id
      and (j.technician_id = auth.uid() or j.assigned_technician_id = auth.uid())
  )
);

create policy invoices_ops_write_policy
on public.invoices
for all
using (public.has_ops_access())
with check (public.has_ops_access());

create policy invoices_client_update_policy
on public.invoices
for update
using (client_id = auth.uid())
with check (client_id = auth.uid());

-- =========================
-- notifications
-- =========================
drop policy if exists notifications_select_policy on public.notifications;
drop policy if exists notifications_write_policy on public.notifications;

create policy notifications_select_policy
on public.notifications
for select
using (user_id = auth.uid() or public.has_ops_access());

create policy notifications_write_policy
on public.notifications
for all
using (public.has_ops_access())
with check (public.has_ops_access() or user_id = auth.uid());

-- =========================
-- technicians / dispatchers
-- =========================
drop policy if exists technicians_select_policy on public.technicians;
drop policy if exists technicians_write_policy on public.technicians;

create policy technicians_select_policy
on public.technicians
for select
using (public.has_ops_access() or user_id = auth.uid());

create policy technicians_write_policy
on public.technicians
for all
using (public.has_ops_access() or user_id = auth.uid())
with check (public.has_ops_access() or user_id = auth.uid());

drop policy if exists dispatchers_select_policy on public.dispatchers;
drop policy if exists dispatchers_write_policy on public.dispatchers;

create policy dispatchers_select_policy
on public.dispatchers
for select
using (public.has_ops_access() or user_id = auth.uid());

create policy dispatchers_write_policy
on public.dispatchers
for all
using (public.is_owner())
with check (public.is_owner());

-- =========================
-- secure communication tables
-- =========================
drop policy if exists conversations_select_policy on public.conversations;
drop policy if exists conversations_write_policy on public.conversations;

create policy conversations_select_policy
on public.conversations
for select
using (
  public.has_ops_access()
  or client_id = auth.uid()
  or technician_id = auth.uid()
  or public.job_user_can_access(job_id)
);

create policy conversations_write_policy
on public.conversations
for all
using (
  public.has_ops_access()
  or client_id = auth.uid()
  or technician_id = auth.uid()
)
with check (
  public.has_ops_access()
  or client_id = auth.uid()
  or technician_id = auth.uid()
);

drop policy if exists messages_select_policy on public.messages;
drop policy if exists messages_write_policy on public.messages;

create policy messages_select_policy
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        public.has_ops_access()
        or c.client_id = auth.uid()
        or c.technician_id = auth.uid()
        or public.job_user_can_access(c.job_id)
      )
  )
);

create policy messages_write_policy
on public.messages
for all
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        public.has_ops_access()
        or c.client_id = auth.uid()
        or c.technician_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        public.has_ops_access()
        or c.client_id = auth.uid()
        or c.technician_id = auth.uid()
      )
  )
  and sender_user_id = auth.uid()
);

drop policy if exists call_logs_select_policy on public.call_logs;
drop policy if exists call_logs_write_policy on public.call_logs;

create policy call_logs_select_policy
on public.call_logs
for select
using (
  public.has_ops_access()
  or caller_user_id = auth.uid()
  or receiver_user_id = auth.uid()
  or public.job_user_can_access(job_id)
);

create policy call_logs_write_policy
on public.call_logs
for all
using (
  public.has_ops_access()
  or caller_user_id = auth.uid()
  or receiver_user_id = auth.uid()
)
with check (
  public.has_ops_access()
  or caller_user_id = auth.uid()
  or receiver_user_id = auth.uid()
);

drop policy if exists communication_permissions_select_policy on public.communication_permissions;
drop policy if exists communication_permissions_write_policy on public.communication_permissions;

create policy communication_permissions_select_policy
on public.communication_permissions
for select
using (public.job_user_can_access(job_id));

create policy communication_permissions_write_policy
on public.communication_permissions
for all
using (public.has_ops_access())
with check (public.has_ops_access());

-- =========================
-- AMC
-- =========================
drop policy if exists amc_plans_select_policy on public.amc_plans;
drop policy if exists amc_plans_write_policy on public.amc_plans;

create policy amc_plans_select_policy
on public.amc_plans
for select
using (true);

create policy amc_plans_write_policy
on public.amc_plans
for all
using (public.is_owner())
with check (public.is_owner());

drop policy if exists amc_contracts_select_policy on public.amc_contracts;
drop policy if exists amc_contracts_write_policy on public.amc_contracts;

create policy amc_contracts_select_policy
on public.amc_contracts
for select
using (client_id = auth.uid() or public.has_ops_access());

create policy amc_contracts_write_policy
on public.amc_contracts
for all
using (client_id = auth.uid() or public.has_ops_access())
with check (client_id = auth.uid() or public.has_ops_access());

