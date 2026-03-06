do $$
begin
  if to_regclass('public.jobs') is null then
    raise notice 'jobs table does not exist; skipping jobs schema backfill';
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='client_id'
  ) then
    execute 'alter table public.jobs add column client_id uuid';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='preferred_at'
  ) then
    execute 'alter table public.jobs add column preferred_at timestamptz';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='assigned_technician_id'
  ) then
    execute 'alter table public.jobs add column assigned_technician_id uuid';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='address_id'
  ) then
    execute 'alter table public.jobs add column address_id uuid';
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_address_id_fkey'
  ) then
    execute 'alter table public.jobs add constraint jobs_address_id_fkey foreign key (address_id) references public.client_addresses(id) on delete set null';
  end if;
end $$;
