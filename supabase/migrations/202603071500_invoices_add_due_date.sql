do $$
begin
  if to_regclass('public.invoices') is null then
    raise notice 'invoices table does not exist; skipping due_date backfill';
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='invoices' and column_name='due_date'
  ) then
    execute 'alter table public.invoices add column due_date timestamptz';
  end if;
end $$;
