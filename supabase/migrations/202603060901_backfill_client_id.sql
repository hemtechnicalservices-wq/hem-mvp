do $$
begin
  -- jobs
  if to_regclass('public.jobs') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='jobs' and column_name='client_id'
    ) then
      execute 'alter table public.jobs add column client_id uuid';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='jobs' and column_name='customer_id'
    ) then
      execute 'update public.jobs set client_id = customer_id where client_id is null';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='jobs' and column_name='user_id'
    ) then
      execute 'update public.jobs set client_id = user_id where client_id is null';
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'jobs_client_id_fkey'
    ) then
      execute 'alter table public.jobs add constraint jobs_client_id_fkey foreign key (client_id) references auth.users(id) on delete cascade';
    end if;
  end if;

  -- invoices
  if to_regclass('public.invoices') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='invoices' and column_name='client_id'
    ) then
      execute 'alter table public.invoices add column client_id uuid';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='invoices' and column_name='customer_id'
    ) then
      execute 'update public.invoices set client_id = customer_id where client_id is null';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='invoices' and column_name='user_id'
    ) then
      execute 'update public.invoices set client_id = user_id where client_id is null';
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'invoices_client_id_fkey'
    ) then
      execute 'alter table public.invoices add constraint invoices_client_id_fkey foreign key (client_id) references auth.users(id) on delete cascade';
    end if;
  end if;

  -- ratings
  if to_regclass('public.ratings') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ratings' and column_name='client_id'
    ) then
      execute 'alter table public.ratings add column client_id uuid';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ratings' and column_name='customer_id'
    ) then
      execute 'update public.ratings set client_id = customer_id where client_id is null';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ratings' and column_name='user_id'
    ) then
      execute 'update public.ratings set client_id = user_id where client_id is null';
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'ratings_client_id_fkey'
    ) then
      execute 'alter table public.ratings add constraint ratings_client_id_fkey foreign key (client_id) references auth.users(id) on delete cascade';
    end if;
  end if;

  -- client_addresses
  if to_regclass('public.client_addresses') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='client_addresses' and column_name='client_id'
    ) then
      execute 'alter table public.client_addresses add column client_id uuid';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='client_addresses' and column_name='user_id'
    ) then
      execute 'update public.client_addresses set client_id = user_id where client_id is null';
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'client_addresses_client_id_fkey'
    ) then
      execute 'alter table public.client_addresses add constraint client_addresses_client_id_fkey foreign key (client_id) references auth.users(id) on delete cascade';
    end if;
  end if;
end $$;